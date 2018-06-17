'use strict';

require('source-map-support/register');

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

const fs = require('fs');
const { join, resolve } = require('path');
const _mkdirp = require('mkdirp');
const _rimraf = require('rimraf');

const promisify = require('./util/promisify');
const parseJson = require('./util/parseJson');

const close = promisify(fs.close);
const mkdirp = promisify(_mkdirp);
const open = promisify(fs.open);
const read = promisify(fs.readFile);
const readdir = promisify(fs.readdir);
const readfd = promisify(fs.read);
const rename = promisify(fs.rename);
const rimraf = promisify(_rimraf);
const write = promisify(fs.writeFile);

const nextPow2 = n => {
  const exponent = Math.log(n) / Math.log(2);
  const nextExponent = Math.floor(exponent) + 1;
  return Math.pow(2, nextExponent);
};

const resizePow2 = (buffer, n) => {
  const tmpBuffer = Buffer.allocUnsafe(nextPow2(n));
  buffer.copy(tmpBuffer.slice(0, buffer.length));
  return tmpBuffer;
};

const MAX_CHUNK = 2 * 1024 * 1024;
const TMP_CHUNK = 0.5 * 1024 * 1024;
const MAX_CHUNK_PLUS = 2.5 * 1024 * 1024;
const LARGE_CONTENT = 64 * 1024;

let tmpBuffer = new Buffer(TMP_CHUNK);
let outBuffer = new Buffer(MAX_CHUNK_PLUS);

const _buffers = [];

const alloc = size => {
  const buffer = _buffers.pop();
  if (buffer && buffer.length >= size) {
    return buffer;
  }
  return Buffer.allocUnsafe(size);
};
const drop = buffer => _buffers.push(buffer);

class WriteOutput {
  constructor(length = 0, table = [], buffer = alloc(MAX_CHUNK_PLUS)) {
    this.length = length;
    this.table = table;
    this.buffer = buffer;
  }

  static clone(other) {
    return new WriteOutput(other.length, other.table, other.buffer);
  }

  take() {
    const output = WriteOutput.clone(this);

    this.length = 0;
    this.table = [];
    this.buffer = alloc(MAX_CHUNK_PLUS);

    return output;
  }

  add(key, content) {
    if (content !== null) {
      // Write content to a temporary buffer
      let length = tmpBuffer.utf8Write(content);
      while (length === tmpBuffer.length) {
        tmpBuffer = Buffer.allocUnsafe(tmpBuffer.length * 2);
        length = tmpBuffer.utf8Write(content);
      }

      const start = this.length;
      const end = start + length;

      // Ensure output buffer is long enough to add the new content
      if (end > this.buffer.length) {
        this.buffer = resizePow2(this.buffer, end);
      }

      // Copy temporary buffer to the end of the current output buffer
      tmpBuffer.copy(this.buffer.slice(start, end));

      this.table.push({
        name: key,
        start,
        end
      });
      this.length = end;
    } else {
      this.table.push({
        name: key,
        start: -1,
        end: -1
      });
    }
  }
}

class Semaphore {
  constructor(max) {
    this.max = max;
    this.count = 0;
    this.next = [];
  }

  guard() {
    var _this = this;

    return _asyncToGenerator(function* () {
      if (_this.count < _this.max) {
        _this.count++;
        return new SemaphoreGuard(_this);
      } else {
        return new Promise(function (resolve) {
          _this.next.push(resolve);
        }).then(function () {
          return new SemaphoreGuard(_this);
        });
      }
    })();
  }
}

class SemaphoreGuard {
  constructor(parent) {
    this.parent = parent;
  }

  done() {
    const next = this.parent.next.shift();
    if (next) {
      next();
    } else {
      this.parent.count--;
    }
  }
}

class Append2 {
  constructor({ cacheDirPath: path, autoParse }) {
    this.path = path;
    this.autoParse = autoParse;

    this.inBuffer = new Buffer(0);
    this._buffers = [];
    this.outBuffer = new Buffer(0);
  }

  _readFile(file) {
    return _asyncToGenerator(function* () {
      const fd = yield open(file, 'r+');

      let body = alloc(MAX_CHUNK_PLUS);

      yield readfd(fd, body, 0, 4, null);
      const fullLength = body.readUInt32LE(0);
      if (fullLength > body.length) {
        drop(body);
        body = alloc(nextPow2(fullLength));
      }
      yield readfd(fd, body, 0, fullLength, null);

      close(fd);

      const tableLength = body.readUInt32LE(0);
      const tableBody = body.utf8Slice(4, 4 + tableLength);
      const table = parseJson(tableBody);
      const content = body.slice(4 + tableLength);

      return [table, content, body];
    })();
  }

  read() {
    var _this2 = this;

    return _asyncToGenerator(function* () {
      const out = {};
      const size = { used: 0, total: 0 };
      const table = {};
      const order = {};

      yield mkdirp(_this2.path);

      const items = yield readdir(_this2.path);
      const logs = items.filter(function (item) {
        return (/^log\d+$/.test(item)
        );
      });
      logs.sort();
      const reverseLogs = logs.reverse();

      const sema = new Semaphore(8);

      return Promise.all(reverseLogs.map((() => {
        var _ref = _asyncToGenerator(function* (_file, index) {
          const file = join(_this2.path, _file);
          const guard = yield sema.guard();

          const [table, content, body] = yield _this2._readFile(file);

          const keys = Object.keys(table);
          if (keys.length > 0) {
            size.total += table[keys.length - 1].end;
          }

          for (const entry of table) {
            if (typeof order[entry.name] === 'undefined' || order[entry.name] > index) {
              if (typeof order[entry.name] !== 'undefined') {
                size.used -= table[entry.name];
              }

              table[entry.name] = entry.end - entry.start;
              size.used += entry.end - entry.start;

              order[entry.name] = index;

              // Negative start positions are not set on the output. They are
              // treated as if they were deleted in a prior write. A future
              // compact will remove all instances of any old entries.
              if (entry.start >= 0) {
                yield new Promise(process.nextTick);
                const data = content.utf8Slice(entry.start, entry.end);
                if (_this2.autoParse) {
                  out[entry.name] = parseJson(data);
                } else {
                  out[entry.name] = data;
                }
              } else {
                delete out[entry.name];
              }
            }
          }

          drop(body);
          guard.done();
        });

        return function (_x, _x2) {
          return _ref.apply(this, arguments);
        };
      })())).then(_asyncToGenerator(function* () {
        if (size.used / size.total < 0.6) {
          yield _this2.compact(out);
        }
      })).then(function () {
        return out;
      });
    })();
  }

  _markLog() {
    var _this3 = this;

    return _asyncToGenerator(function* () {
      const count = (yield readdir(_this3.path)).filter(function (item) {
        return (/log\d+$/.test(item)
        );
      }).length;
      const marker = Math.random().toString(16).substring(2).padStart(13, '0');
      const logName = `log${count.toString().padStart(4, '0')}`;
      const file = resolve(_this3.path, logName);
      yield write(file, marker);
      const writtenMarker = yield read(file, 'utf8');
      if (marker === writtenMarker) {
        return file;
      }
      return null;
    })();
  }

  _write(file, output) {
    return _asyncToGenerator(function* () {
      // 4 bytes - full length
      // 4 bytes - length of table
      // x bytes - table
      // y bytes - content

      // Write table into a temporary buffer at position 8
      const content = JSON.stringify(output.table);
      let length = tmpBuffer.utf8Write(content, 8);
      // Make the temporary buffer longer if the space used is the same as the
      // length
      while (8 + length === tmpBuffer.length) {
        tmpBuffer = Buffer.allocUnsafe(nextPow2(8 + length));
        // Write again to see if the length is more due to the last buffer being
        // too short.
        length = tmpBuffer.utf8Write(content, 8);
      }

      // Ensure the buffer is long enough to fit the table and content.
      const end = 8 + length + output.length;
      if (end > tmpBuffer.length) {
        tmpBuffer = resizePow2(tmpBuffer, end);
      }

      // Copy the output after the table.
      output.buffer.copy(tmpBuffer.slice(8 + length, end));

      // Full length after this uint.
      tmpBuffer.writeUInt32LE(end - 4, 0);
      // Length of table after this uint.
      tmpBuffer.writeUInt32LE(length, 4);

      if (end > output.buffer.length) {
        output.buffer = alloc(nextPow2(end));
      }
      tmpBuffer.copy(output.buffer.slice(0, end));

      yield write(file, output.buffer.slice(0, end));
      drop(output.buffer);
    })();
  }

  _markAndWrite(output) {
    var _this4 = this;

    return _asyncToGenerator(function* () {
      const file = yield _this4._markLog();
      if (file !== null) {
        yield _this4._write(file, output.take());
      }
    })();
  }

  // Write out a log chunk once the file reaches the maximum chunk size.
  _writeAtMax(output) {
    var _this5 = this;

    return _asyncToGenerator(function* () {
      while (output.length >= MAX_CHUNK) {
        yield _this5._markAndWrite(output);
      }
    })();
  }

  // Write out a log chunk if their is any entries in the table.
  _writeAtAny(output) {
    var _this6 = this;

    return _asyncToGenerator(function* () {
      while (output.table.length > 0) {
        yield _this6._markAndWrite(output);
      }
    })();
  }

  write(ops) {
    var _this7 = this;

    return _asyncToGenerator(function* () {
      let smallOutput = new WriteOutput();
      let largeOutput = new WriteOutput();

      const outputPromises = [];

      yield mkdirp(_this7.path);

      for (const op of ops) {
        if (op.value !== null) {
          let content = op.value;
          if (typeof content !== 'string') {
            content = JSON.stringify(content);
          }
          if (content.length < LARGE_CONTENT) {
            smallOutput.add(op.key, content);

            yield _this7._writeAtMax(smallOutput);
          } else {
            largeOutput.add(op.key, content);

            yield _this7._writeAtMax(largeOutput);
          }
        } else {
          smallOutput.add(op.key, null);

          yield _this7._writeAtMax(smallOutput);
        }
      }

      yield _this7._writeAtAny(smallOutput);
      yield _this7._writeAtAny(largeOutput);

      yield Promise.all(outputPromises);
    })();
  }

  sizes() {
    var _this8 = this;

    return _asyncToGenerator(function* () {
      const size = {
        used: 0,
        total: 0
      };
      const table = {};
      const order = {};

      yield mkdirp(_this8.path);

      const items = yield readdir(_this8.path);
      const logs = items.filter(function (item) {
        return (/^log\d+$/.test(item)
        );
      });
      logs.sort();
      const reverseLogs = logs.reverse();

      const sema = new Semaphore(8);

      return Promise.all(reverseLogs.map((() => {
        var _ref3 = _asyncToGenerator(function* (_file, index) {
          const file = join(_this8.path, _file);
          const guard = yield sema.guard();

          const [table, content, body] = yield _this8._readFile(file);

          size.total += content.length;

          for (const entry of table) {
            if (typeof order[entry.name] === 'undefined' || order[entry.name] > index) {
              if (typeof order[entry.name] !== 'undefined') {
                size.used -= table[entry.name];
              }
              table[entry.name] = entry.end - entry.start;
              size.used += entry.end - entry.start;

              order[entry.name] = index;
            }
          }

          drop(body);
          guard.done();
        });

        return function (_x3, _x4) {
          return _ref3.apply(this, arguments);
        };
      })())).then(function () {
        return size;
      });
    })();
  }

  compact(_obj = this.read()) {
    var _this9 = this;

    return _asyncToGenerator(function* () {
      const obj = yield _obj;
      const ops = [];
      for (const key in obj) {
        ops.push({
          key,
          value: obj[key]
        });
      }
      const truePath = _this9.path;
      _this9.path += '~';
      yield _this9.write(ops);
      _this9.path = truePath;
      yield rimraf(_this9.path);
      yield rename(`${_this9.path}~`, _this9.path);
    })();
  }
}

module.exports = Append2;
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImhhcmQtc291cmNlLXdlYnBhY2stcGx1Z2luL2xpYi9TZXJpYWxpemVyQXBwZW5kMi5qcyJdLCJuYW1lcyI6WyJmcyIsInJlcXVpcmUiLCJqb2luIiwicmVzb2x2ZSIsIl9ta2RpcnAiLCJfcmltcmFmIiwicHJvbWlzaWZ5IiwicGFyc2VKc29uIiwiY2xvc2UiLCJta2RpcnAiLCJvcGVuIiwicmVhZCIsInJlYWRGaWxlIiwicmVhZGRpciIsInJlYWRmZCIsInJlbmFtZSIsInJpbXJhZiIsIndyaXRlIiwid3JpdGVGaWxlIiwibmV4dFBvdzIiLCJuIiwiZXhwb25lbnQiLCJNYXRoIiwibG9nIiwibmV4dEV4cG9uZW50IiwiZmxvb3IiLCJwb3ciLCJyZXNpemVQb3cyIiwiYnVmZmVyIiwidG1wQnVmZmVyIiwiQnVmZmVyIiwiYWxsb2NVbnNhZmUiLCJjb3B5Iiwic2xpY2UiLCJsZW5ndGgiLCJNQVhfQ0hVTksiLCJUTVBfQ0hVTksiLCJNQVhfQ0hVTktfUExVUyIsIkxBUkdFX0NPTlRFTlQiLCJvdXRCdWZmZXIiLCJfYnVmZmVycyIsImFsbG9jIiwic2l6ZSIsInBvcCIsImRyb3AiLCJwdXNoIiwiV3JpdGVPdXRwdXQiLCJjb25zdHJ1Y3RvciIsInRhYmxlIiwiY2xvbmUiLCJvdGhlciIsInRha2UiLCJvdXRwdXQiLCJhZGQiLCJrZXkiLCJjb250ZW50IiwidXRmOFdyaXRlIiwic3RhcnQiLCJlbmQiLCJuYW1lIiwiU2VtYXBob3JlIiwibWF4IiwiY291bnQiLCJuZXh0IiwiZ3VhcmQiLCJTZW1hcGhvcmVHdWFyZCIsIlByb21pc2UiLCJ0aGVuIiwicGFyZW50IiwiZG9uZSIsInNoaWZ0IiwiQXBwZW5kMiIsImNhY2hlRGlyUGF0aCIsInBhdGgiLCJhdXRvUGFyc2UiLCJpbkJ1ZmZlciIsIl9yZWFkRmlsZSIsImZpbGUiLCJmZCIsImJvZHkiLCJmdWxsTGVuZ3RoIiwicmVhZFVJbnQzMkxFIiwidGFibGVMZW5ndGgiLCJ0YWJsZUJvZHkiLCJ1dGY4U2xpY2UiLCJvdXQiLCJ1c2VkIiwidG90YWwiLCJvcmRlciIsIml0ZW1zIiwibG9ncyIsImZpbHRlciIsInRlc3QiLCJpdGVtIiwic29ydCIsInJldmVyc2VMb2dzIiwicmV2ZXJzZSIsInNlbWEiLCJhbGwiLCJtYXAiLCJfZmlsZSIsImluZGV4Iiwia2V5cyIsIk9iamVjdCIsImVudHJ5IiwicHJvY2VzcyIsIm5leHRUaWNrIiwiZGF0YSIsImNvbXBhY3QiLCJfbWFya0xvZyIsIm1hcmtlciIsInJhbmRvbSIsInRvU3RyaW5nIiwic3Vic3RyaW5nIiwicGFkU3RhcnQiLCJsb2dOYW1lIiwid3JpdHRlbk1hcmtlciIsIl93cml0ZSIsIkpTT04iLCJzdHJpbmdpZnkiLCJ3cml0ZVVJbnQzMkxFIiwiX21hcmtBbmRXcml0ZSIsIl93cml0ZUF0TWF4IiwiX3dyaXRlQXRBbnkiLCJvcHMiLCJzbWFsbE91dHB1dCIsImxhcmdlT3V0cHV0Iiwib3V0cHV0UHJvbWlzZXMiLCJvcCIsInZhbHVlIiwic2l6ZXMiLCJfb2JqIiwib2JqIiwidHJ1ZVBhdGgiLCJtb2R1bGUiLCJleHBvcnRzIl0sIm1hcHBpbmdzIjoiOzs7Ozs7QUFBQSxNQUFNQSxLQUFLQyxRQUFRLElBQVIsQ0FBWDtBQUNBLE1BQU0sRUFBRUMsSUFBRixFQUFRQyxPQUFSLEtBQW9CRixRQUFRLE1BQVIsQ0FBMUI7QUFDQSxNQUFNRyxVQUFVSCxRQUFRLFFBQVIsQ0FBaEI7QUFDQSxNQUFNSSxVQUFVSixRQUFRLFFBQVIsQ0FBaEI7O0FBRUEsTUFBTUssWUFBWUwsUUFBUSxrQkFBUixDQUFsQjtBQUNBLE1BQU1NLFlBQVlOLFFBQVEsa0JBQVIsQ0FBbEI7O0FBRUEsTUFBTU8sUUFBUUYsVUFBVU4sR0FBR1EsS0FBYixDQUFkO0FBQ0EsTUFBTUMsU0FBU0gsVUFBVUYsT0FBVixDQUFmO0FBQ0EsTUFBTU0sT0FBT0osVUFBVU4sR0FBR1UsSUFBYixDQUFiO0FBQ0EsTUFBTUMsT0FBT0wsVUFBVU4sR0FBR1ksUUFBYixDQUFiO0FBQ0EsTUFBTUMsVUFBVVAsVUFBVU4sR0FBR2EsT0FBYixDQUFoQjtBQUNBLE1BQU1DLFNBQVNSLFVBQVVOLEdBQUdXLElBQWIsQ0FBZjtBQUNBLE1BQU1JLFNBQVNULFVBQVVOLEdBQUdlLE1BQWIsQ0FBZjtBQUNBLE1BQU1DLFNBQVNWLFVBQVVELE9BQVYsQ0FBZjtBQUNBLE1BQU1ZLFFBQVFYLFVBQVVOLEdBQUdrQixTQUFiLENBQWQ7O0FBRUEsTUFBTUMsV0FBV0MsS0FBSztBQUNwQixRQUFNQyxXQUFXQyxLQUFLQyxHQUFMLENBQVNILENBQVQsSUFBY0UsS0FBS0MsR0FBTCxDQUFTLENBQVQsQ0FBL0I7QUFDQSxRQUFNQyxlQUFlRixLQUFLRyxLQUFMLENBQVdKLFFBQVgsSUFBdUIsQ0FBNUM7QUFDQSxTQUFPQyxLQUFLSSxHQUFMLENBQVMsQ0FBVCxFQUFZRixZQUFaLENBQVA7QUFDRCxDQUpEOztBQU1BLE1BQU1HLGFBQWEsQ0FBQ0MsTUFBRCxFQUFTUixDQUFULEtBQWU7QUFDaEMsUUFBTVMsWUFBWUMsT0FBT0MsV0FBUCxDQUFtQlosU0FBU0MsQ0FBVCxDQUFuQixDQUFsQjtBQUNBUSxTQUFPSSxJQUFQLENBQVlILFVBQVVJLEtBQVYsQ0FBZ0IsQ0FBaEIsRUFBbUJMLE9BQU9NLE1BQTFCLENBQVo7QUFDQSxTQUFPTCxTQUFQO0FBQ0QsQ0FKRDs7QUFNQSxNQUFNTSxZQUFZLElBQUksSUFBSixHQUFXLElBQTdCO0FBQ0EsTUFBTUMsWUFBWSxNQUFNLElBQU4sR0FBYSxJQUEvQjtBQUNBLE1BQU1DLGlCQUFpQixNQUFNLElBQU4sR0FBYSxJQUFwQztBQUNBLE1BQU1DLGdCQUFnQixLQUFLLElBQTNCOztBQUVBLElBQUlULFlBQVksSUFBSUMsTUFBSixDQUFXTSxTQUFYLENBQWhCO0FBQ0EsSUFBSUcsWUFBWSxJQUFJVCxNQUFKLENBQVdPLGNBQVgsQ0FBaEI7O0FBRUEsTUFBTUcsV0FBVyxFQUFqQjs7QUFFQSxNQUFNQyxRQUFRQyxRQUFRO0FBQ3BCLFFBQU1kLFNBQVNZLFNBQVNHLEdBQVQsRUFBZjtBQUNBLE1BQUlmLFVBQVVBLE9BQU9NLE1BQVAsSUFBaUJRLElBQS9CLEVBQXFDO0FBQ25DLFdBQU9kLE1BQVA7QUFDRDtBQUNELFNBQU9FLE9BQU9DLFdBQVAsQ0FBbUJXLElBQW5CLENBQVA7QUFDRCxDQU5EO0FBT0EsTUFBTUUsT0FBT2hCLFVBQVVZLFNBQVNLLElBQVQsQ0FBY2pCLE1BQWQsQ0FBdkI7O0FBRUEsTUFBTWtCLFdBQU4sQ0FBa0I7QUFDaEJDLGNBQVliLFNBQVMsQ0FBckIsRUFBd0JjLFFBQVEsRUFBaEMsRUFBb0NwQixTQUFTYSxNQUFNSixjQUFOLENBQTdDLEVBQW9FO0FBQ2xFLFNBQUtILE1BQUwsR0FBY0EsTUFBZDtBQUNBLFNBQUtjLEtBQUwsR0FBYUEsS0FBYjtBQUNBLFNBQUtwQixNQUFMLEdBQWNBLE1BQWQ7QUFDRDs7QUFFRCxTQUFPcUIsS0FBUCxDQUFhQyxLQUFiLEVBQW9CO0FBQ2xCLFdBQU8sSUFBSUosV0FBSixDQUFnQkksTUFBTWhCLE1BQXRCLEVBQThCZ0IsTUFBTUYsS0FBcEMsRUFBMkNFLE1BQU10QixNQUFqRCxDQUFQO0FBQ0Q7O0FBRUR1QixTQUFPO0FBQ0wsVUFBTUMsU0FBU04sWUFBWUcsS0FBWixDQUFrQixJQUFsQixDQUFmOztBQUVBLFNBQUtmLE1BQUwsR0FBYyxDQUFkO0FBQ0EsU0FBS2MsS0FBTCxHQUFhLEVBQWI7QUFDQSxTQUFLcEIsTUFBTCxHQUFjYSxNQUFNSixjQUFOLENBQWQ7O0FBRUEsV0FBT2UsTUFBUDtBQUNEOztBQUVEQyxNQUFJQyxHQUFKLEVBQVNDLE9BQVQsRUFBa0I7QUFDaEIsUUFBSUEsWUFBWSxJQUFoQixFQUFzQjtBQUNwQjtBQUNBLFVBQUlyQixTQUFTTCxVQUFVMkIsU0FBVixDQUFvQkQsT0FBcEIsQ0FBYjtBQUNBLGFBQU9yQixXQUFXTCxVQUFVSyxNQUE1QixFQUFvQztBQUNsQ0wsb0JBQVlDLE9BQU9DLFdBQVAsQ0FBbUJGLFVBQVVLLE1BQVYsR0FBbUIsQ0FBdEMsQ0FBWjtBQUNBQSxpQkFBU0wsVUFBVTJCLFNBQVYsQ0FBb0JELE9BQXBCLENBQVQ7QUFDRDs7QUFFRCxZQUFNRSxRQUFRLEtBQUt2QixNQUFuQjtBQUNBLFlBQU13QixNQUFNRCxRQUFRdkIsTUFBcEI7O0FBRUE7QUFDQSxVQUFJd0IsTUFBTSxLQUFLOUIsTUFBTCxDQUFZTSxNQUF0QixFQUE4QjtBQUM1QixhQUFLTixNQUFMLEdBQWNELFdBQVcsS0FBS0MsTUFBaEIsRUFBd0I4QixHQUF4QixDQUFkO0FBQ0Q7O0FBRUQ7QUFDQTdCLGdCQUFVRyxJQUFWLENBQWUsS0FBS0osTUFBTCxDQUFZSyxLQUFaLENBQWtCd0IsS0FBbEIsRUFBeUJDLEdBQXpCLENBQWY7O0FBRUEsV0FBS1YsS0FBTCxDQUFXSCxJQUFYLENBQWdCO0FBQ2RjLGNBQU1MLEdBRFE7QUFFZEcsYUFGYztBQUdkQztBQUhjLE9BQWhCO0FBS0EsV0FBS3hCLE1BQUwsR0FBY3dCLEdBQWQ7QUFDRCxLQXpCRCxNQXlCTztBQUNMLFdBQUtWLEtBQUwsQ0FBV0gsSUFBWCxDQUFnQjtBQUNkYyxjQUFNTCxHQURRO0FBRWRHLGVBQU8sQ0FBQyxDQUZNO0FBR2RDLGFBQUssQ0FBQztBQUhRLE9BQWhCO0FBS0Q7QUFDRjtBQXREZTs7QUF5RGxCLE1BQU1FLFNBQU4sQ0FBZ0I7QUFDZGIsY0FBWWMsR0FBWixFQUFpQjtBQUNmLFNBQUtBLEdBQUwsR0FBV0EsR0FBWDtBQUNBLFNBQUtDLEtBQUwsR0FBYSxDQUFiO0FBQ0EsU0FBS0MsSUFBTCxHQUFZLEVBQVo7QUFDRDs7QUFFS0MsT0FBTixHQUFjO0FBQUE7O0FBQUE7QUFDWixVQUFJLE1BQUtGLEtBQUwsR0FBYSxNQUFLRCxHQUF0QixFQUEyQjtBQUN6QixjQUFLQyxLQUFMO0FBQ0EsZUFBTyxJQUFJRyxjQUFKLENBQW1CLEtBQW5CLENBQVA7QUFDRCxPQUhELE1BR087QUFDTCxlQUFPLElBQUlDLE9BQUosQ0FBWSxtQkFBVztBQUM1QixnQkFBS0gsSUFBTCxDQUFVbEIsSUFBVixDQUFlMUMsT0FBZjtBQUNELFNBRk0sRUFFSmdFLElBRkksQ0FFQztBQUFBLGlCQUFNLElBQUlGLGNBQUosQ0FBbUIsS0FBbkIsQ0FBTjtBQUFBLFNBRkQsQ0FBUDtBQUdEO0FBUlc7QUFTYjtBQWhCYTs7QUFtQmhCLE1BQU1BLGNBQU4sQ0FBcUI7QUFDbkJsQixjQUFZcUIsTUFBWixFQUFvQjtBQUNsQixTQUFLQSxNQUFMLEdBQWNBLE1BQWQ7QUFDRDs7QUFFREMsU0FBTztBQUNMLFVBQU1OLE9BQU8sS0FBS0ssTUFBTCxDQUFZTCxJQUFaLENBQWlCTyxLQUFqQixFQUFiO0FBQ0EsUUFBSVAsSUFBSixFQUFVO0FBQ1JBO0FBQ0QsS0FGRCxNQUVPO0FBQ0wsV0FBS0ssTUFBTCxDQUFZTixLQUFaO0FBQ0Q7QUFDRjtBQVprQjs7QUFlckIsTUFBTVMsT0FBTixDQUFjO0FBQ1p4QixjQUFZLEVBQUV5QixjQUFjQyxJQUFoQixFQUFzQkMsU0FBdEIsRUFBWixFQUErQztBQUM3QyxTQUFLRCxJQUFMLEdBQVlBLElBQVo7QUFDQSxTQUFLQyxTQUFMLEdBQWlCQSxTQUFqQjs7QUFFQSxTQUFLQyxRQUFMLEdBQWdCLElBQUk3QyxNQUFKLENBQVcsQ0FBWCxDQUFoQjtBQUNBLFNBQUtVLFFBQUwsR0FBZ0IsRUFBaEI7QUFDQSxTQUFLRCxTQUFMLEdBQWlCLElBQUlULE1BQUosQ0FBVyxDQUFYLENBQWpCO0FBQ0Q7O0FBRUs4QyxXQUFOLENBQWdCQyxJQUFoQixFQUFzQjtBQUFBO0FBQ3BCLFlBQU1DLEtBQUssTUFBTXBFLEtBQUttRSxJQUFMLEVBQVcsSUFBWCxDQUFqQjs7QUFFQSxVQUFJRSxPQUFPdEMsTUFBTUosY0FBTixDQUFYOztBQUVBLFlBQU12QixPQUFPZ0UsRUFBUCxFQUFXQyxJQUFYLEVBQWlCLENBQWpCLEVBQW9CLENBQXBCLEVBQXVCLElBQXZCLENBQU47QUFDQSxZQUFNQyxhQUFhRCxLQUFLRSxZQUFMLENBQWtCLENBQWxCLENBQW5CO0FBQ0EsVUFBSUQsYUFBYUQsS0FBSzdDLE1BQXRCLEVBQThCO0FBQzVCVSxhQUFLbUMsSUFBTDtBQUNBQSxlQUFPdEMsTUFBTXRCLFNBQVM2RCxVQUFULENBQU4sQ0FBUDtBQUNEO0FBQ0QsWUFBTWxFLE9BQU9nRSxFQUFQLEVBQVdDLElBQVgsRUFBaUIsQ0FBakIsRUFBb0JDLFVBQXBCLEVBQWdDLElBQWhDLENBQU47O0FBRUF4RSxZQUFNc0UsRUFBTjs7QUFFQSxZQUFNSSxjQUFjSCxLQUFLRSxZQUFMLENBQWtCLENBQWxCLENBQXBCO0FBQ0EsWUFBTUUsWUFBWUosS0FBS0ssU0FBTCxDQUFlLENBQWYsRUFBa0IsSUFBSUYsV0FBdEIsQ0FBbEI7QUFDQSxZQUFNbEMsUUFBUXpDLFVBQVU0RSxTQUFWLENBQWQ7QUFDQSxZQUFNNUIsVUFBVXdCLEtBQUs5QyxLQUFMLENBQVcsSUFBSWlELFdBQWYsQ0FBaEI7O0FBRUEsYUFBTyxDQUFDbEMsS0FBRCxFQUFRTyxPQUFSLEVBQWlCd0IsSUFBakIsQ0FBUDtBQXBCb0I7QUFxQnJCOztBQUVLcEUsTUFBTixHQUFhO0FBQUE7O0FBQUE7QUFDWCxZQUFNMEUsTUFBTSxFQUFaO0FBQ0EsWUFBTTNDLE9BQU8sRUFBRTRDLE1BQU0sQ0FBUixFQUFXQyxPQUFPLENBQWxCLEVBQWI7QUFDQSxZQUFNdkMsUUFBUSxFQUFkO0FBQ0EsWUFBTXdDLFFBQVEsRUFBZDs7QUFFQSxZQUFNL0UsT0FBTyxPQUFLZ0UsSUFBWixDQUFOOztBQUVBLFlBQU1nQixRQUFRLE1BQU01RSxRQUFRLE9BQUs0RCxJQUFiLENBQXBCO0FBQ0EsWUFBTWlCLE9BQU9ELE1BQU1FLE1BQU4sQ0FBYTtBQUFBLGVBQVEsWUFBV0MsSUFBWCxDQUFnQkMsSUFBaEI7QUFBUjtBQUFBLE9BQWIsQ0FBYjtBQUNBSCxXQUFLSSxJQUFMO0FBQ0EsWUFBTUMsY0FBY0wsS0FBS00sT0FBTCxFQUFwQjs7QUFFQSxZQUFNQyxPQUFPLElBQUlyQyxTQUFKLENBQWMsQ0FBZCxDQUFiOztBQUVBLGFBQU9NLFFBQVFnQyxHQUFSLENBQ0xILFlBQVlJLEdBQVo7QUFBQSxxQ0FBZ0IsV0FBT0MsS0FBUCxFQUFjQyxLQUFkLEVBQXdCO0FBQ3RDLGdCQUFNeEIsT0FBTzNFLEtBQUssT0FBS3VFLElBQVYsRUFBZ0IyQixLQUFoQixDQUFiO0FBQ0EsZ0JBQU1wQyxRQUFRLE1BQU1pQyxLQUFLakMsS0FBTCxFQUFwQjs7QUFFQSxnQkFBTSxDQUFDaEIsS0FBRCxFQUFRTyxPQUFSLEVBQWlCd0IsSUFBakIsSUFBeUIsTUFBTSxPQUFLSCxTQUFMLENBQWVDLElBQWYsQ0FBckM7O0FBRUEsZ0JBQU15QixPQUFPQyxPQUFPRCxJQUFQLENBQVl0RCxLQUFaLENBQWI7QUFDQSxjQUFJc0QsS0FBS3BFLE1BQUwsR0FBYyxDQUFsQixFQUFxQjtBQUNuQlEsaUJBQUs2QyxLQUFMLElBQWN2QyxNQUFNc0QsS0FBS3BFLE1BQUwsR0FBYyxDQUFwQixFQUF1QndCLEdBQXJDO0FBQ0Q7O0FBRUQsZUFBSyxNQUFNOEMsS0FBWCxJQUFvQnhELEtBQXBCLEVBQTJCO0FBQ3pCLGdCQUNFLE9BQU93QyxNQUFNZ0IsTUFBTTdDLElBQVosQ0FBUCxLQUE2QixXQUE3QixJQUNBNkIsTUFBTWdCLE1BQU03QyxJQUFaLElBQW9CMEMsS0FGdEIsRUFHRTtBQUNBLGtCQUFJLE9BQU9iLE1BQU1nQixNQUFNN0MsSUFBWixDQUFQLEtBQTZCLFdBQWpDLEVBQThDO0FBQzVDakIscUJBQUs0QyxJQUFMLElBQWF0QyxNQUFNd0QsTUFBTTdDLElBQVosQ0FBYjtBQUNEOztBQUVEWCxvQkFBTXdELE1BQU03QyxJQUFaLElBQW9CNkMsTUFBTTlDLEdBQU4sR0FBWThDLE1BQU0vQyxLQUF0QztBQUNBZixtQkFBSzRDLElBQUwsSUFBYWtCLE1BQU05QyxHQUFOLEdBQVk4QyxNQUFNL0MsS0FBL0I7O0FBRUErQixvQkFBTWdCLE1BQU03QyxJQUFaLElBQW9CMEMsS0FBcEI7O0FBRUE7QUFDQTtBQUNBO0FBQ0Esa0JBQUlHLE1BQU0vQyxLQUFOLElBQWUsQ0FBbkIsRUFBc0I7QUFDcEIsc0JBQU0sSUFBSVMsT0FBSixDQUFZdUMsUUFBUUMsUUFBcEIsQ0FBTjtBQUNBLHNCQUFNQyxPQUFPcEQsUUFBUTZCLFNBQVIsQ0FBa0JvQixNQUFNL0MsS0FBeEIsRUFBK0IrQyxNQUFNOUMsR0FBckMsQ0FBYjtBQUNBLG9CQUFJLE9BQUtnQixTQUFULEVBQW9CO0FBQ2xCVyxzQkFBSW1CLE1BQU03QyxJQUFWLElBQWtCcEQsVUFBVW9HLElBQVYsQ0FBbEI7QUFDRCxpQkFGRCxNQUVPO0FBQ0x0QixzQkFBSW1CLE1BQU03QyxJQUFWLElBQWtCZ0QsSUFBbEI7QUFDRDtBQUNGLGVBUkQsTUFRTztBQUNMLHVCQUFPdEIsSUFBSW1CLE1BQU03QyxJQUFWLENBQVA7QUFDRDtBQUNGO0FBQ0Y7O0FBRURmLGVBQUttQyxJQUFMO0FBQ0FmLGdCQUFNSyxJQUFOO0FBQ0QsU0E1Q0Q7O0FBQUE7QUFBQTtBQUFBO0FBQUEsV0FESyxFQStDSkYsSUEvQ0ksbUJBK0NDLGFBQVk7QUFDaEIsWUFBSXpCLEtBQUs0QyxJQUFMLEdBQVk1QyxLQUFLNkMsS0FBakIsR0FBeUIsR0FBN0IsRUFBa0M7QUFDaEMsZ0JBQU0sT0FBS3FCLE9BQUwsQ0FBYXZCLEdBQWIsQ0FBTjtBQUNEO0FBQ0YsT0FuREksR0FvREpsQixJQXBESSxDQW9EQztBQUFBLGVBQU1rQixHQUFOO0FBQUEsT0FwREQsQ0FBUDtBQWZXO0FBb0VaOztBQUVLd0IsVUFBTixHQUFpQjtBQUFBOztBQUFBO0FBQ2YsWUFBTS9DLFFBQVEsQ0FBQyxNQUFNakQsUUFBUSxPQUFLNEQsSUFBYixDQUFQLEVBQTJCa0IsTUFBM0IsQ0FBa0M7QUFBQSxlQUM5QyxXQUFVQyxJQUFWLENBQWVDLElBQWY7QUFEOEM7QUFBQSxPQUFsQyxFQUVaM0QsTUFGRjtBQUdBLFlBQU00RSxTQUFTeEYsS0FBS3lGLE1BQUwsR0FDWkMsUUFEWSxDQUNILEVBREcsRUFFWkMsU0FGWSxDQUVGLENBRkUsRUFHWkMsUUFIWSxDQUdILEVBSEcsRUFHQyxHQUhELENBQWY7QUFJQSxZQUFNQyxVQUFXLE1BQUtyRCxNQUFNa0QsUUFBTixHQUFpQkUsUUFBakIsQ0FBMEIsQ0FBMUIsRUFBNkIsR0FBN0IsQ0FBa0MsRUFBeEQ7QUFDQSxZQUFNckMsT0FBTzFFLFFBQVEsT0FBS3NFLElBQWIsRUFBbUIwQyxPQUFuQixDQUFiO0FBQ0EsWUFBTWxHLE1BQU00RCxJQUFOLEVBQVlpQyxNQUFaLENBQU47QUFDQSxZQUFNTSxnQkFBZ0IsTUFBTXpHLEtBQUtrRSxJQUFMLEVBQVcsTUFBWCxDQUE1QjtBQUNBLFVBQUlpQyxXQUFXTSxhQUFmLEVBQThCO0FBQzVCLGVBQU92QyxJQUFQO0FBQ0Q7QUFDRCxhQUFPLElBQVA7QUFmZTtBQWdCaEI7O0FBRUt3QyxRQUFOLENBQWF4QyxJQUFiLEVBQW1CekIsTUFBbkIsRUFBMkI7QUFBQTtBQUN6QjtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBLFlBQU1HLFVBQVUrRCxLQUFLQyxTQUFMLENBQWVuRSxPQUFPSixLQUF0QixDQUFoQjtBQUNBLFVBQUlkLFNBQVNMLFVBQVUyQixTQUFWLENBQW9CRCxPQUFwQixFQUE2QixDQUE3QixDQUFiO0FBQ0E7QUFDQTtBQUNBLGFBQU8sSUFBSXJCLE1BQUosS0FBZUwsVUFBVUssTUFBaEMsRUFBd0M7QUFDdENMLG9CQUFZQyxPQUFPQyxXQUFQLENBQW1CWixTQUFTLElBQUllLE1BQWIsQ0FBbkIsQ0FBWjtBQUNBO0FBQ0E7QUFDQUEsaUJBQVNMLFVBQVUyQixTQUFWLENBQW9CRCxPQUFwQixFQUE2QixDQUE3QixDQUFUO0FBQ0Q7O0FBRUQ7QUFDQSxZQUFNRyxNQUFNLElBQUl4QixNQUFKLEdBQWFrQixPQUFPbEIsTUFBaEM7QUFDQSxVQUFJd0IsTUFBTTdCLFVBQVVLLE1BQXBCLEVBQTRCO0FBQzFCTCxvQkFBWUYsV0FBV0UsU0FBWCxFQUFzQjZCLEdBQXRCLENBQVo7QUFDRDs7QUFFRDtBQUNBTixhQUFPeEIsTUFBUCxDQUFjSSxJQUFkLENBQW1CSCxVQUFVSSxLQUFWLENBQWdCLElBQUlDLE1BQXBCLEVBQTRCd0IsR0FBNUIsQ0FBbkI7O0FBRUE7QUFDQTdCLGdCQUFVMkYsYUFBVixDQUF3QjlELE1BQU0sQ0FBOUIsRUFBaUMsQ0FBakM7QUFDQTtBQUNBN0IsZ0JBQVUyRixhQUFWLENBQXdCdEYsTUFBeEIsRUFBZ0MsQ0FBaEM7O0FBRUEsVUFBSXdCLE1BQU1OLE9BQU94QixNQUFQLENBQWNNLE1BQXhCLEVBQWdDO0FBQzlCa0IsZUFBT3hCLE1BQVAsR0FBZ0JhLE1BQU10QixTQUFTdUMsR0FBVCxDQUFOLENBQWhCO0FBQ0Q7QUFDRDdCLGdCQUFVRyxJQUFWLENBQWVvQixPQUFPeEIsTUFBUCxDQUFjSyxLQUFkLENBQW9CLENBQXBCLEVBQXVCeUIsR0FBdkIsQ0FBZjs7QUFFQSxZQUFNekMsTUFBTTRELElBQU4sRUFBWXpCLE9BQU94QixNQUFQLENBQWNLLEtBQWQsQ0FBb0IsQ0FBcEIsRUFBdUJ5QixHQUF2QixDQUFaLENBQU47QUFDQWQsV0FBS1EsT0FBT3hCLE1BQVo7QUF0Q3lCO0FBdUMxQjs7QUFFSzZGLGVBQU4sQ0FBb0JyRSxNQUFwQixFQUE0QjtBQUFBOztBQUFBO0FBQzFCLFlBQU15QixPQUFPLE1BQU0sT0FBS2dDLFFBQUwsRUFBbkI7QUFDQSxVQUFJaEMsU0FBUyxJQUFiLEVBQW1CO0FBQ2pCLGNBQU0sT0FBS3dDLE1BQUwsQ0FBWXhDLElBQVosRUFBa0J6QixPQUFPRCxJQUFQLEVBQWxCLENBQU47QUFDRDtBQUp5QjtBQUszQjs7QUFFRDtBQUNNdUUsYUFBTixDQUFrQnRFLE1BQWxCLEVBQTBCO0FBQUE7O0FBQUE7QUFDeEIsYUFBT0EsT0FBT2xCLE1BQVAsSUFBaUJDLFNBQXhCLEVBQW1DO0FBQ2pDLGNBQU0sT0FBS3NGLGFBQUwsQ0FBbUJyRSxNQUFuQixDQUFOO0FBQ0Q7QUFIdUI7QUFJekI7O0FBRUQ7QUFDTXVFLGFBQU4sQ0FBa0J2RSxNQUFsQixFQUEwQjtBQUFBOztBQUFBO0FBQ3hCLGFBQU9BLE9BQU9KLEtBQVAsQ0FBYWQsTUFBYixHQUFzQixDQUE3QixFQUFnQztBQUM5QixjQUFNLE9BQUt1RixhQUFMLENBQW1CckUsTUFBbkIsQ0FBTjtBQUNEO0FBSHVCO0FBSXpCOztBQUVLbkMsT0FBTixDQUFZMkcsR0FBWixFQUFpQjtBQUFBOztBQUFBO0FBQ2YsVUFBSUMsY0FBYyxJQUFJL0UsV0FBSixFQUFsQjtBQUNBLFVBQUlnRixjQUFjLElBQUloRixXQUFKLEVBQWxCOztBQUVBLFlBQU1pRixpQkFBaUIsRUFBdkI7O0FBRUEsWUFBTXRILE9BQU8sT0FBS2dFLElBQVosQ0FBTjs7QUFFQSxXQUFLLE1BQU11RCxFQUFYLElBQWlCSixHQUFqQixFQUFzQjtBQUNwQixZQUFJSSxHQUFHQyxLQUFILEtBQWEsSUFBakIsRUFBdUI7QUFDckIsY0FBSTFFLFVBQVV5RSxHQUFHQyxLQUFqQjtBQUNBLGNBQUksT0FBTzFFLE9BQVAsS0FBbUIsUUFBdkIsRUFBaUM7QUFDL0JBLHNCQUFVK0QsS0FBS0MsU0FBTCxDQUFlaEUsT0FBZixDQUFWO0FBQ0Q7QUFDRCxjQUFJQSxRQUFRckIsTUFBUixHQUFpQkksYUFBckIsRUFBb0M7QUFDbEN1Rix3QkFBWXhFLEdBQVosQ0FBZ0IyRSxHQUFHMUUsR0FBbkIsRUFBd0JDLE9BQXhCOztBQUVBLGtCQUFNLE9BQUttRSxXQUFMLENBQWlCRyxXQUFqQixDQUFOO0FBQ0QsV0FKRCxNQUlPO0FBQ0xDLHdCQUFZekUsR0FBWixDQUFnQjJFLEdBQUcxRSxHQUFuQixFQUF3QkMsT0FBeEI7O0FBRUEsa0JBQU0sT0FBS21FLFdBQUwsQ0FBaUJJLFdBQWpCLENBQU47QUFDRDtBQUNGLFNBZEQsTUFjTztBQUNMRCxzQkFBWXhFLEdBQVosQ0FBZ0IyRSxHQUFHMUUsR0FBbkIsRUFBd0IsSUFBeEI7O0FBRUEsZ0JBQU0sT0FBS29FLFdBQUwsQ0FBaUJHLFdBQWpCLENBQU47QUFDRDtBQUNGOztBQUVELFlBQU0sT0FBS0YsV0FBTCxDQUFpQkUsV0FBakIsQ0FBTjtBQUNBLFlBQU0sT0FBS0YsV0FBTCxDQUFpQkcsV0FBakIsQ0FBTjs7QUFFQSxZQUFNNUQsUUFBUWdDLEdBQVIsQ0FBWTZCLGNBQVosQ0FBTjtBQWpDZTtBQWtDaEI7O0FBRUtHLE9BQU4sR0FBYztBQUFBOztBQUFBO0FBQ1osWUFBTXhGLE9BQU87QUFDWDRDLGNBQU0sQ0FESztBQUVYQyxlQUFPO0FBRkksT0FBYjtBQUlBLFlBQU12QyxRQUFRLEVBQWQ7QUFDQSxZQUFNd0MsUUFBUSxFQUFkOztBQUVBLFlBQU0vRSxPQUFPLE9BQUtnRSxJQUFaLENBQU47O0FBRUEsWUFBTWdCLFFBQVEsTUFBTTVFLFFBQVEsT0FBSzRELElBQWIsQ0FBcEI7QUFDQSxZQUFNaUIsT0FBT0QsTUFBTUUsTUFBTixDQUFhO0FBQUEsZUFBUSxZQUFXQyxJQUFYLENBQWdCQyxJQUFoQjtBQUFSO0FBQUEsT0FBYixDQUFiO0FBQ0FILFdBQUtJLElBQUw7QUFDQSxZQUFNQyxjQUFjTCxLQUFLTSxPQUFMLEVBQXBCOztBQUVBLFlBQU1DLE9BQU8sSUFBSXJDLFNBQUosQ0FBYyxDQUFkLENBQWI7O0FBRUEsYUFBT00sUUFBUWdDLEdBQVIsQ0FDTEgsWUFBWUksR0FBWjtBQUFBLHNDQUFnQixXQUFPQyxLQUFQLEVBQWNDLEtBQWQsRUFBd0I7QUFDdEMsZ0JBQU14QixPQUFPM0UsS0FBSyxPQUFLdUUsSUFBVixFQUFnQjJCLEtBQWhCLENBQWI7QUFDQSxnQkFBTXBDLFFBQVEsTUFBTWlDLEtBQUtqQyxLQUFMLEVBQXBCOztBQUVBLGdCQUFNLENBQUNoQixLQUFELEVBQVFPLE9BQVIsRUFBaUJ3QixJQUFqQixJQUF5QixNQUFNLE9BQUtILFNBQUwsQ0FBZUMsSUFBZixDQUFyQzs7QUFFQW5DLGVBQUs2QyxLQUFMLElBQWNoQyxRQUFRckIsTUFBdEI7O0FBRUEsZUFBSyxNQUFNc0UsS0FBWCxJQUFvQnhELEtBQXBCLEVBQTJCO0FBQ3pCLGdCQUNFLE9BQU93QyxNQUFNZ0IsTUFBTTdDLElBQVosQ0FBUCxLQUE2QixXQUE3QixJQUNBNkIsTUFBTWdCLE1BQU03QyxJQUFaLElBQW9CMEMsS0FGdEIsRUFHRTtBQUNBLGtCQUFJLE9BQU9iLE1BQU1nQixNQUFNN0MsSUFBWixDQUFQLEtBQTZCLFdBQWpDLEVBQThDO0FBQzVDakIscUJBQUs0QyxJQUFMLElBQWF0QyxNQUFNd0QsTUFBTTdDLElBQVosQ0FBYjtBQUNEO0FBQ0RYLG9CQUFNd0QsTUFBTTdDLElBQVosSUFBb0I2QyxNQUFNOUMsR0FBTixHQUFZOEMsTUFBTS9DLEtBQXRDO0FBQ0FmLG1CQUFLNEMsSUFBTCxJQUFha0IsTUFBTTlDLEdBQU4sR0FBWThDLE1BQU0vQyxLQUEvQjs7QUFFQStCLG9CQUFNZ0IsTUFBTTdDLElBQVosSUFBb0IwQyxLQUFwQjtBQUNEO0FBQ0Y7O0FBRUR6RCxlQUFLbUMsSUFBTDtBQUNBZixnQkFBTUssSUFBTjtBQUNELFNBekJEOztBQUFBO0FBQUE7QUFBQTtBQUFBLFdBREssRUEyQkxGLElBM0JLLENBMkJBO0FBQUEsZUFBTXpCLElBQU47QUFBQSxPQTNCQSxDQUFQO0FBakJZO0FBNkNiOztBQUVLa0UsU0FBTixDQUFjdUIsT0FBTyxLQUFLeEgsSUFBTCxFQUFyQixFQUFrQztBQUFBOztBQUFBO0FBQ2hDLFlBQU15SCxNQUFNLE1BQU1ELElBQWxCO0FBQ0EsWUFBTVAsTUFBTSxFQUFaO0FBQ0EsV0FBSyxNQUFNdEUsR0FBWCxJQUFrQjhFLEdBQWxCLEVBQXVCO0FBQ3JCUixZQUFJL0UsSUFBSixDQUFTO0FBQ1BTLGFBRE87QUFFUDJFLGlCQUFPRyxJQUFJOUUsR0FBSjtBQUZBLFNBQVQ7QUFJRDtBQUNELFlBQU0rRSxXQUFXLE9BQUs1RCxJQUF0QjtBQUNBLGFBQUtBLElBQUwsSUFBYSxHQUFiO0FBQ0EsWUFBTSxPQUFLeEQsS0FBTCxDQUFXMkcsR0FBWCxDQUFOO0FBQ0EsYUFBS25ELElBQUwsR0FBWTRELFFBQVo7QUFDQSxZQUFNckgsT0FBTyxPQUFLeUQsSUFBWixDQUFOO0FBQ0EsWUFBTTFELE9BQVEsR0FBRSxPQUFLMEQsSUFBSyxHQUFwQixFQUF3QixPQUFLQSxJQUE3QixDQUFOO0FBZGdDO0FBZWpDO0FBelJXOztBQTRSZDZELE9BQU9DLE9BQVAsR0FBaUJoRSxPQUFqQiIsImZpbGUiOiJoYXJkLXNvdXJjZS13ZWJwYWNrLXBsdWdpbi9saWIvU2VyaWFsaXplckFwcGVuZDIuanMiLCJzb3VyY2VzQ29udGVudCI6WyJjb25zdCBmcyA9IHJlcXVpcmUoJ2ZzJyk7XG5jb25zdCB7IGpvaW4sIHJlc29sdmUgfSA9IHJlcXVpcmUoJ3BhdGgnKTtcbmNvbnN0IF9ta2RpcnAgPSByZXF1aXJlKCdta2RpcnAnKTtcbmNvbnN0IF9yaW1yYWYgPSByZXF1aXJlKCdyaW1yYWYnKTtcblxuY29uc3QgcHJvbWlzaWZ5ID0gcmVxdWlyZSgnLi91dGlsL3Byb21pc2lmeScpO1xuY29uc3QgcGFyc2VKc29uID0gcmVxdWlyZSgnLi91dGlsL3BhcnNlSnNvbicpO1xuXG5jb25zdCBjbG9zZSA9IHByb21pc2lmeShmcy5jbG9zZSk7XG5jb25zdCBta2RpcnAgPSBwcm9taXNpZnkoX21rZGlycCk7XG5jb25zdCBvcGVuID0gcHJvbWlzaWZ5KGZzLm9wZW4pO1xuY29uc3QgcmVhZCA9IHByb21pc2lmeShmcy5yZWFkRmlsZSk7XG5jb25zdCByZWFkZGlyID0gcHJvbWlzaWZ5KGZzLnJlYWRkaXIpO1xuY29uc3QgcmVhZGZkID0gcHJvbWlzaWZ5KGZzLnJlYWQpO1xuY29uc3QgcmVuYW1lID0gcHJvbWlzaWZ5KGZzLnJlbmFtZSk7XG5jb25zdCByaW1yYWYgPSBwcm9taXNpZnkoX3JpbXJhZik7XG5jb25zdCB3cml0ZSA9IHByb21pc2lmeShmcy53cml0ZUZpbGUpO1xuXG5jb25zdCBuZXh0UG93MiA9IG4gPT4ge1xuICBjb25zdCBleHBvbmVudCA9IE1hdGgubG9nKG4pIC8gTWF0aC5sb2coMik7XG4gIGNvbnN0IG5leHRFeHBvbmVudCA9IE1hdGguZmxvb3IoZXhwb25lbnQpICsgMTtcbiAgcmV0dXJuIE1hdGgucG93KDIsIG5leHRFeHBvbmVudCk7XG59O1xuXG5jb25zdCByZXNpemVQb3cyID0gKGJ1ZmZlciwgbikgPT4ge1xuICBjb25zdCB0bXBCdWZmZXIgPSBCdWZmZXIuYWxsb2NVbnNhZmUobmV4dFBvdzIobikpO1xuICBidWZmZXIuY29weSh0bXBCdWZmZXIuc2xpY2UoMCwgYnVmZmVyLmxlbmd0aCkpO1xuICByZXR1cm4gdG1wQnVmZmVyO1xufTtcblxuY29uc3QgTUFYX0NIVU5LID0gMiAqIDEwMjQgKiAxMDI0O1xuY29uc3QgVE1QX0NIVU5LID0gMC41ICogMTAyNCAqIDEwMjQ7XG5jb25zdCBNQVhfQ0hVTktfUExVUyA9IDIuNSAqIDEwMjQgKiAxMDI0O1xuY29uc3QgTEFSR0VfQ09OVEVOVCA9IDY0ICogMTAyNDtcblxubGV0IHRtcEJ1ZmZlciA9IG5ldyBCdWZmZXIoVE1QX0NIVU5LKTtcbmxldCBvdXRCdWZmZXIgPSBuZXcgQnVmZmVyKE1BWF9DSFVOS19QTFVTKTtcblxuY29uc3QgX2J1ZmZlcnMgPSBbXTtcblxuY29uc3QgYWxsb2MgPSBzaXplID0+IHtcbiAgY29uc3QgYnVmZmVyID0gX2J1ZmZlcnMucG9wKCk7XG4gIGlmIChidWZmZXIgJiYgYnVmZmVyLmxlbmd0aCA+PSBzaXplKSB7XG4gICAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuICByZXR1cm4gQnVmZmVyLmFsbG9jVW5zYWZlKHNpemUpO1xufTtcbmNvbnN0IGRyb3AgPSBidWZmZXIgPT4gX2J1ZmZlcnMucHVzaChidWZmZXIpO1xuXG5jbGFzcyBXcml0ZU91dHB1dCB7XG4gIGNvbnN0cnVjdG9yKGxlbmd0aCA9IDAsIHRhYmxlID0gW10sIGJ1ZmZlciA9IGFsbG9jKE1BWF9DSFVOS19QTFVTKSkge1xuICAgIHRoaXMubGVuZ3RoID0gbGVuZ3RoO1xuICAgIHRoaXMudGFibGUgPSB0YWJsZTtcbiAgICB0aGlzLmJ1ZmZlciA9IGJ1ZmZlcjtcbiAgfVxuXG4gIHN0YXRpYyBjbG9uZShvdGhlcikge1xuICAgIHJldHVybiBuZXcgV3JpdGVPdXRwdXQob3RoZXIubGVuZ3RoLCBvdGhlci50YWJsZSwgb3RoZXIuYnVmZmVyKTtcbiAgfVxuXG4gIHRha2UoKSB7XG4gICAgY29uc3Qgb3V0cHV0ID0gV3JpdGVPdXRwdXQuY2xvbmUodGhpcyk7XG5cbiAgICB0aGlzLmxlbmd0aCA9IDA7XG4gICAgdGhpcy50YWJsZSA9IFtdO1xuICAgIHRoaXMuYnVmZmVyID0gYWxsb2MoTUFYX0NIVU5LX1BMVVMpO1xuXG4gICAgcmV0dXJuIG91dHB1dDtcbiAgfVxuXG4gIGFkZChrZXksIGNvbnRlbnQpIHtcbiAgICBpZiAoY29udGVudCAhPT0gbnVsbCkge1xuICAgICAgLy8gV3JpdGUgY29udGVudCB0byBhIHRlbXBvcmFyeSBidWZmZXJcbiAgICAgIGxldCBsZW5ndGggPSB0bXBCdWZmZXIudXRmOFdyaXRlKGNvbnRlbnQpO1xuICAgICAgd2hpbGUgKGxlbmd0aCA9PT0gdG1wQnVmZmVyLmxlbmd0aCkge1xuICAgICAgICB0bXBCdWZmZXIgPSBCdWZmZXIuYWxsb2NVbnNhZmUodG1wQnVmZmVyLmxlbmd0aCAqIDIpO1xuICAgICAgICBsZW5ndGggPSB0bXBCdWZmZXIudXRmOFdyaXRlKGNvbnRlbnQpO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBzdGFydCA9IHRoaXMubGVuZ3RoO1xuICAgICAgY29uc3QgZW5kID0gc3RhcnQgKyBsZW5ndGg7XG5cbiAgICAgIC8vIEVuc3VyZSBvdXRwdXQgYnVmZmVyIGlzIGxvbmcgZW5vdWdoIHRvIGFkZCB0aGUgbmV3IGNvbnRlbnRcbiAgICAgIGlmIChlbmQgPiB0aGlzLmJ1ZmZlci5sZW5ndGgpIHtcbiAgICAgICAgdGhpcy5idWZmZXIgPSByZXNpemVQb3cyKHRoaXMuYnVmZmVyLCBlbmQpO1xuICAgICAgfVxuXG4gICAgICAvLyBDb3B5IHRlbXBvcmFyeSBidWZmZXIgdG8gdGhlIGVuZCBvZiB0aGUgY3VycmVudCBvdXRwdXQgYnVmZmVyXG4gICAgICB0bXBCdWZmZXIuY29weSh0aGlzLmJ1ZmZlci5zbGljZShzdGFydCwgZW5kKSk7XG5cbiAgICAgIHRoaXMudGFibGUucHVzaCh7XG4gICAgICAgIG5hbWU6IGtleSxcbiAgICAgICAgc3RhcnQsXG4gICAgICAgIGVuZCxcbiAgICAgIH0pO1xuICAgICAgdGhpcy5sZW5ndGggPSBlbmQ7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMudGFibGUucHVzaCh7XG4gICAgICAgIG5hbWU6IGtleSxcbiAgICAgICAgc3RhcnQ6IC0xLFxuICAgICAgICBlbmQ6IC0xLFxuICAgICAgfSk7XG4gICAgfVxuICB9XG59XG5cbmNsYXNzIFNlbWFwaG9yZSB7XG4gIGNvbnN0cnVjdG9yKG1heCkge1xuICAgIHRoaXMubWF4ID0gbWF4O1xuICAgIHRoaXMuY291bnQgPSAwO1xuICAgIHRoaXMubmV4dCA9IFtdO1xuICB9XG5cbiAgYXN5bmMgZ3VhcmQoKSB7XG4gICAgaWYgKHRoaXMuY291bnQgPCB0aGlzLm1heCkge1xuICAgICAgdGhpcy5jb3VudCsrO1xuICAgICAgcmV0dXJuIG5ldyBTZW1hcGhvcmVHdWFyZCh0aGlzKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKHJlc29sdmUgPT4ge1xuICAgICAgICB0aGlzLm5leHQucHVzaChyZXNvbHZlKTtcbiAgICAgIH0pLnRoZW4oKCkgPT4gbmV3IFNlbWFwaG9yZUd1YXJkKHRoaXMpKTtcbiAgICB9XG4gIH1cbn1cblxuY2xhc3MgU2VtYXBob3JlR3VhcmQge1xuICBjb25zdHJ1Y3RvcihwYXJlbnQpIHtcbiAgICB0aGlzLnBhcmVudCA9IHBhcmVudDtcbiAgfVxuXG4gIGRvbmUoKSB7XG4gICAgY29uc3QgbmV4dCA9IHRoaXMucGFyZW50Lm5leHQuc2hpZnQoKTtcbiAgICBpZiAobmV4dCkge1xuICAgICAgbmV4dCgpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLnBhcmVudC5jb3VudC0tO1xuICAgIH1cbiAgfVxufVxuXG5jbGFzcyBBcHBlbmQyIHtcbiAgY29uc3RydWN0b3IoeyBjYWNoZURpclBhdGg6IHBhdGgsIGF1dG9QYXJzZSB9KSB7XG4gICAgdGhpcy5wYXRoID0gcGF0aDtcbiAgICB0aGlzLmF1dG9QYXJzZSA9IGF1dG9QYXJzZTtcblxuICAgIHRoaXMuaW5CdWZmZXIgPSBuZXcgQnVmZmVyKDApO1xuICAgIHRoaXMuX2J1ZmZlcnMgPSBbXTtcbiAgICB0aGlzLm91dEJ1ZmZlciA9IG5ldyBCdWZmZXIoMCk7XG4gIH1cblxuICBhc3luYyBfcmVhZEZpbGUoZmlsZSkge1xuICAgIGNvbnN0IGZkID0gYXdhaXQgb3BlbihmaWxlLCAncisnKTtcblxuICAgIGxldCBib2R5ID0gYWxsb2MoTUFYX0NIVU5LX1BMVVMpO1xuXG4gICAgYXdhaXQgcmVhZGZkKGZkLCBib2R5LCAwLCA0LCBudWxsKTtcbiAgICBjb25zdCBmdWxsTGVuZ3RoID0gYm9keS5yZWFkVUludDMyTEUoMCk7XG4gICAgaWYgKGZ1bGxMZW5ndGggPiBib2R5Lmxlbmd0aCkge1xuICAgICAgZHJvcChib2R5KTtcbiAgICAgIGJvZHkgPSBhbGxvYyhuZXh0UG93MihmdWxsTGVuZ3RoKSk7XG4gICAgfVxuICAgIGF3YWl0IHJlYWRmZChmZCwgYm9keSwgMCwgZnVsbExlbmd0aCwgbnVsbCk7XG5cbiAgICBjbG9zZShmZCk7XG5cbiAgICBjb25zdCB0YWJsZUxlbmd0aCA9IGJvZHkucmVhZFVJbnQzMkxFKDApO1xuICAgIGNvbnN0IHRhYmxlQm9keSA9IGJvZHkudXRmOFNsaWNlKDQsIDQgKyB0YWJsZUxlbmd0aCk7XG4gICAgY29uc3QgdGFibGUgPSBwYXJzZUpzb24odGFibGVCb2R5KTtcbiAgICBjb25zdCBjb250ZW50ID0gYm9keS5zbGljZSg0ICsgdGFibGVMZW5ndGgpO1xuXG4gICAgcmV0dXJuIFt0YWJsZSwgY29udGVudCwgYm9keV07XG4gIH1cblxuICBhc3luYyByZWFkKCkge1xuICAgIGNvbnN0IG91dCA9IHt9O1xuICAgIGNvbnN0IHNpemUgPSB7IHVzZWQ6IDAsIHRvdGFsOiAwIH07XG4gICAgY29uc3QgdGFibGUgPSB7fTtcbiAgICBjb25zdCBvcmRlciA9IHt9O1xuXG4gICAgYXdhaXQgbWtkaXJwKHRoaXMucGF0aCk7XG5cbiAgICBjb25zdCBpdGVtcyA9IGF3YWl0IHJlYWRkaXIodGhpcy5wYXRoKTtcbiAgICBjb25zdCBsb2dzID0gaXRlbXMuZmlsdGVyKGl0ZW0gPT4gL15sb2dcXGQrJC8udGVzdChpdGVtKSk7XG4gICAgbG9ncy5zb3J0KCk7XG4gICAgY29uc3QgcmV2ZXJzZUxvZ3MgPSBsb2dzLnJldmVyc2UoKTtcblxuICAgIGNvbnN0IHNlbWEgPSBuZXcgU2VtYXBob3JlKDgpO1xuXG4gICAgcmV0dXJuIFByb21pc2UuYWxsKFxuICAgICAgcmV2ZXJzZUxvZ3MubWFwKGFzeW5jIChfZmlsZSwgaW5kZXgpID0+IHtcbiAgICAgICAgY29uc3QgZmlsZSA9IGpvaW4odGhpcy5wYXRoLCBfZmlsZSk7XG4gICAgICAgIGNvbnN0IGd1YXJkID0gYXdhaXQgc2VtYS5ndWFyZCgpO1xuXG4gICAgICAgIGNvbnN0IFt0YWJsZSwgY29udGVudCwgYm9keV0gPSBhd2FpdCB0aGlzLl9yZWFkRmlsZShmaWxlKTtcblxuICAgICAgICBjb25zdCBrZXlzID0gT2JqZWN0LmtleXModGFibGUpO1xuICAgICAgICBpZiAoa2V5cy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgc2l6ZS50b3RhbCArPSB0YWJsZVtrZXlzLmxlbmd0aCAtIDFdLmVuZDtcbiAgICAgICAgfVxuXG4gICAgICAgIGZvciAoY29uc3QgZW50cnkgb2YgdGFibGUpIHtcbiAgICAgICAgICBpZiAoXG4gICAgICAgICAgICB0eXBlb2Ygb3JkZXJbZW50cnkubmFtZV0gPT09ICd1bmRlZmluZWQnIHx8XG4gICAgICAgICAgICBvcmRlcltlbnRyeS5uYW1lXSA+IGluZGV4XG4gICAgICAgICAgKSB7XG4gICAgICAgICAgICBpZiAodHlwZW9mIG9yZGVyW2VudHJ5Lm5hbWVdICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICBzaXplLnVzZWQgLT0gdGFibGVbZW50cnkubmFtZV07XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHRhYmxlW2VudHJ5Lm5hbWVdID0gZW50cnkuZW5kIC0gZW50cnkuc3RhcnQ7XG4gICAgICAgICAgICBzaXplLnVzZWQgKz0gZW50cnkuZW5kIC0gZW50cnkuc3RhcnQ7XG5cbiAgICAgICAgICAgIG9yZGVyW2VudHJ5Lm5hbWVdID0gaW5kZXg7XG5cbiAgICAgICAgICAgIC8vIE5lZ2F0aXZlIHN0YXJ0IHBvc2l0aW9ucyBhcmUgbm90IHNldCBvbiB0aGUgb3V0cHV0LiBUaGV5IGFyZVxuICAgICAgICAgICAgLy8gdHJlYXRlZCBhcyBpZiB0aGV5IHdlcmUgZGVsZXRlZCBpbiBhIHByaW9yIHdyaXRlLiBBIGZ1dHVyZVxuICAgICAgICAgICAgLy8gY29tcGFjdCB3aWxsIHJlbW92ZSBhbGwgaW5zdGFuY2VzIG9mIGFueSBvbGQgZW50cmllcy5cbiAgICAgICAgICAgIGlmIChlbnRyeS5zdGFydCA+PSAwKSB7XG4gICAgICAgICAgICAgIGF3YWl0IG5ldyBQcm9taXNlKHByb2Nlc3MubmV4dFRpY2spO1xuICAgICAgICAgICAgICBjb25zdCBkYXRhID0gY29udGVudC51dGY4U2xpY2UoZW50cnkuc3RhcnQsIGVudHJ5LmVuZCk7XG4gICAgICAgICAgICAgIGlmICh0aGlzLmF1dG9QYXJzZSkge1xuICAgICAgICAgICAgICAgIG91dFtlbnRyeS5uYW1lXSA9IHBhcnNlSnNvbihkYXRhKTtcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBvdXRbZW50cnkubmFtZV0gPSBkYXRhO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBkZWxldGUgb3V0W2VudHJ5Lm5hbWVdO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGRyb3AoYm9keSk7XG4gICAgICAgIGd1YXJkLmRvbmUoKTtcbiAgICAgIH0pLFxuICAgIClcbiAgICAgIC50aGVuKGFzeW5jICgpID0+IHtcbiAgICAgICAgaWYgKHNpemUudXNlZCAvIHNpemUudG90YWwgPCAwLjYpIHtcbiAgICAgICAgICBhd2FpdCB0aGlzLmNvbXBhY3Qob3V0KTtcbiAgICAgICAgfVxuICAgICAgfSlcbiAgICAgIC50aGVuKCgpID0+IG91dCk7XG4gIH1cblxuICBhc3luYyBfbWFya0xvZygpIHtcbiAgICBjb25zdCBjb3VudCA9IChhd2FpdCByZWFkZGlyKHRoaXMucGF0aCkpLmZpbHRlcihpdGVtID0+XG4gICAgICAvbG9nXFxkKyQvLnRlc3QoaXRlbSksXG4gICAgKS5sZW5ndGg7XG4gICAgY29uc3QgbWFya2VyID0gTWF0aC5yYW5kb20oKVxuICAgICAgLnRvU3RyaW5nKDE2KVxuICAgICAgLnN1YnN0cmluZygyKVxuICAgICAgLnBhZFN0YXJ0KDEzLCAnMCcpO1xuICAgIGNvbnN0IGxvZ05hbWUgPSBgbG9nJHtjb3VudC50b1N0cmluZygpLnBhZFN0YXJ0KDQsICcwJyl9YDtcbiAgICBjb25zdCBmaWxlID0gcmVzb2x2ZSh0aGlzLnBhdGgsIGxvZ05hbWUpO1xuICAgIGF3YWl0IHdyaXRlKGZpbGUsIG1hcmtlcik7XG4gICAgY29uc3Qgd3JpdHRlbk1hcmtlciA9IGF3YWl0IHJlYWQoZmlsZSwgJ3V0ZjgnKTtcbiAgICBpZiAobWFya2VyID09PSB3cml0dGVuTWFya2VyKSB7XG4gICAgICByZXR1cm4gZmlsZTtcbiAgICB9XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICBhc3luYyBfd3JpdGUoZmlsZSwgb3V0cHV0KSB7XG4gICAgLy8gNCBieXRlcyAtIGZ1bGwgbGVuZ3RoXG4gICAgLy8gNCBieXRlcyAtIGxlbmd0aCBvZiB0YWJsZVxuICAgIC8vIHggYnl0ZXMgLSB0YWJsZVxuICAgIC8vIHkgYnl0ZXMgLSBjb250ZW50XG5cbiAgICAvLyBXcml0ZSB0YWJsZSBpbnRvIGEgdGVtcG9yYXJ5IGJ1ZmZlciBhdCBwb3NpdGlvbiA4XG4gICAgY29uc3QgY29udGVudCA9IEpTT04uc3RyaW5naWZ5KG91dHB1dC50YWJsZSk7XG4gICAgbGV0IGxlbmd0aCA9IHRtcEJ1ZmZlci51dGY4V3JpdGUoY29udGVudCwgOCk7XG4gICAgLy8gTWFrZSB0aGUgdGVtcG9yYXJ5IGJ1ZmZlciBsb25nZXIgaWYgdGhlIHNwYWNlIHVzZWQgaXMgdGhlIHNhbWUgYXMgdGhlXG4gICAgLy8gbGVuZ3RoXG4gICAgd2hpbGUgKDggKyBsZW5ndGggPT09IHRtcEJ1ZmZlci5sZW5ndGgpIHtcbiAgICAgIHRtcEJ1ZmZlciA9IEJ1ZmZlci5hbGxvY1Vuc2FmZShuZXh0UG93Mig4ICsgbGVuZ3RoKSk7XG4gICAgICAvLyBXcml0ZSBhZ2FpbiB0byBzZWUgaWYgdGhlIGxlbmd0aCBpcyBtb3JlIGR1ZSB0byB0aGUgbGFzdCBidWZmZXIgYmVpbmdcbiAgICAgIC8vIHRvbyBzaG9ydC5cbiAgICAgIGxlbmd0aCA9IHRtcEJ1ZmZlci51dGY4V3JpdGUoY29udGVudCwgOCk7XG4gICAgfVxuXG4gICAgLy8gRW5zdXJlIHRoZSBidWZmZXIgaXMgbG9uZyBlbm91Z2ggdG8gZml0IHRoZSB0YWJsZSBhbmQgY29udGVudC5cbiAgICBjb25zdCBlbmQgPSA4ICsgbGVuZ3RoICsgb3V0cHV0Lmxlbmd0aDtcbiAgICBpZiAoZW5kID4gdG1wQnVmZmVyLmxlbmd0aCkge1xuICAgICAgdG1wQnVmZmVyID0gcmVzaXplUG93Mih0bXBCdWZmZXIsIGVuZCk7XG4gICAgfVxuXG4gICAgLy8gQ29weSB0aGUgb3V0cHV0IGFmdGVyIHRoZSB0YWJsZS5cbiAgICBvdXRwdXQuYnVmZmVyLmNvcHkodG1wQnVmZmVyLnNsaWNlKDggKyBsZW5ndGgsIGVuZCkpO1xuXG4gICAgLy8gRnVsbCBsZW5ndGggYWZ0ZXIgdGhpcyB1aW50LlxuICAgIHRtcEJ1ZmZlci53cml0ZVVJbnQzMkxFKGVuZCAtIDQsIDApO1xuICAgIC8vIExlbmd0aCBvZiB0YWJsZSBhZnRlciB0aGlzIHVpbnQuXG4gICAgdG1wQnVmZmVyLndyaXRlVUludDMyTEUobGVuZ3RoLCA0KTtcblxuICAgIGlmIChlbmQgPiBvdXRwdXQuYnVmZmVyLmxlbmd0aCkge1xuICAgICAgb3V0cHV0LmJ1ZmZlciA9IGFsbG9jKG5leHRQb3cyKGVuZCkpO1xuICAgIH1cbiAgICB0bXBCdWZmZXIuY29weShvdXRwdXQuYnVmZmVyLnNsaWNlKDAsIGVuZCkpO1xuXG4gICAgYXdhaXQgd3JpdGUoZmlsZSwgb3V0cHV0LmJ1ZmZlci5zbGljZSgwLCBlbmQpKTtcbiAgICBkcm9wKG91dHB1dC5idWZmZXIpO1xuICB9XG5cbiAgYXN5bmMgX21hcmtBbmRXcml0ZShvdXRwdXQpIHtcbiAgICBjb25zdCBmaWxlID0gYXdhaXQgdGhpcy5fbWFya0xvZygpO1xuICAgIGlmIChmaWxlICE9PSBudWxsKSB7XG4gICAgICBhd2FpdCB0aGlzLl93cml0ZShmaWxlLCBvdXRwdXQudGFrZSgpKTtcbiAgICB9XG4gIH1cblxuICAvLyBXcml0ZSBvdXQgYSBsb2cgY2h1bmsgb25jZSB0aGUgZmlsZSByZWFjaGVzIHRoZSBtYXhpbXVtIGNodW5rIHNpemUuXG4gIGFzeW5jIF93cml0ZUF0TWF4KG91dHB1dCkge1xuICAgIHdoaWxlIChvdXRwdXQubGVuZ3RoID49IE1BWF9DSFVOSykge1xuICAgICAgYXdhaXQgdGhpcy5fbWFya0FuZFdyaXRlKG91dHB1dCk7XG4gICAgfVxuICB9XG5cbiAgLy8gV3JpdGUgb3V0IGEgbG9nIGNodW5rIGlmIHRoZWlyIGlzIGFueSBlbnRyaWVzIGluIHRoZSB0YWJsZS5cbiAgYXN5bmMgX3dyaXRlQXRBbnkob3V0cHV0KSB7XG4gICAgd2hpbGUgKG91dHB1dC50YWJsZS5sZW5ndGggPiAwKSB7XG4gICAgICBhd2FpdCB0aGlzLl9tYXJrQW5kV3JpdGUob3V0cHV0KTtcbiAgICB9XG4gIH1cblxuICBhc3luYyB3cml0ZShvcHMpIHtcbiAgICBsZXQgc21hbGxPdXRwdXQgPSBuZXcgV3JpdGVPdXRwdXQoKTtcbiAgICBsZXQgbGFyZ2VPdXRwdXQgPSBuZXcgV3JpdGVPdXRwdXQoKTtcblxuICAgIGNvbnN0IG91dHB1dFByb21pc2VzID0gW107XG5cbiAgICBhd2FpdCBta2RpcnAodGhpcy5wYXRoKTtcblxuICAgIGZvciAoY29uc3Qgb3Agb2Ygb3BzKSB7XG4gICAgICBpZiAob3AudmFsdWUgIT09IG51bGwpIHtcbiAgICAgICAgbGV0IGNvbnRlbnQgPSBvcC52YWx1ZTtcbiAgICAgICAgaWYgKHR5cGVvZiBjb250ZW50ICE9PSAnc3RyaW5nJykge1xuICAgICAgICAgIGNvbnRlbnQgPSBKU09OLnN0cmluZ2lmeShjb250ZW50KTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoY29udGVudC5sZW5ndGggPCBMQVJHRV9DT05URU5UKSB7XG4gICAgICAgICAgc21hbGxPdXRwdXQuYWRkKG9wLmtleSwgY29udGVudCk7XG5cbiAgICAgICAgICBhd2FpdCB0aGlzLl93cml0ZUF0TWF4KHNtYWxsT3V0cHV0KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBsYXJnZU91dHB1dC5hZGQob3Aua2V5LCBjb250ZW50KTtcblxuICAgICAgICAgIGF3YWl0IHRoaXMuX3dyaXRlQXRNYXgobGFyZ2VPdXRwdXQpO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzbWFsbE91dHB1dC5hZGQob3Aua2V5LCBudWxsKTtcblxuICAgICAgICBhd2FpdCB0aGlzLl93cml0ZUF0TWF4KHNtYWxsT3V0cHV0KTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBhd2FpdCB0aGlzLl93cml0ZUF0QW55KHNtYWxsT3V0cHV0KTtcbiAgICBhd2FpdCB0aGlzLl93cml0ZUF0QW55KGxhcmdlT3V0cHV0KTtcblxuICAgIGF3YWl0IFByb21pc2UuYWxsKG91dHB1dFByb21pc2VzKTtcbiAgfVxuXG4gIGFzeW5jIHNpemVzKCkge1xuICAgIGNvbnN0IHNpemUgPSB7XG4gICAgICB1c2VkOiAwLFxuICAgICAgdG90YWw6IDAsXG4gICAgfTtcbiAgICBjb25zdCB0YWJsZSA9IHt9O1xuICAgIGNvbnN0IG9yZGVyID0ge307XG5cbiAgICBhd2FpdCBta2RpcnAodGhpcy5wYXRoKTtcblxuICAgIGNvbnN0IGl0ZW1zID0gYXdhaXQgcmVhZGRpcih0aGlzLnBhdGgpO1xuICAgIGNvbnN0IGxvZ3MgPSBpdGVtcy5maWx0ZXIoaXRlbSA9PiAvXmxvZ1xcZCskLy50ZXN0KGl0ZW0pKTtcbiAgICBsb2dzLnNvcnQoKTtcbiAgICBjb25zdCByZXZlcnNlTG9ncyA9IGxvZ3MucmV2ZXJzZSgpO1xuXG4gICAgY29uc3Qgc2VtYSA9IG5ldyBTZW1hcGhvcmUoOCk7XG5cbiAgICByZXR1cm4gUHJvbWlzZS5hbGwoXG4gICAgICByZXZlcnNlTG9ncy5tYXAoYXN5bmMgKF9maWxlLCBpbmRleCkgPT4ge1xuICAgICAgICBjb25zdCBmaWxlID0gam9pbih0aGlzLnBhdGgsIF9maWxlKTtcbiAgICAgICAgY29uc3QgZ3VhcmQgPSBhd2FpdCBzZW1hLmd1YXJkKCk7XG5cbiAgICAgICAgY29uc3QgW3RhYmxlLCBjb250ZW50LCBib2R5XSA9IGF3YWl0IHRoaXMuX3JlYWRGaWxlKGZpbGUpO1xuXG4gICAgICAgIHNpemUudG90YWwgKz0gY29udGVudC5sZW5ndGg7XG5cbiAgICAgICAgZm9yIChjb25zdCBlbnRyeSBvZiB0YWJsZSkge1xuICAgICAgICAgIGlmIChcbiAgICAgICAgICAgIHR5cGVvZiBvcmRlcltlbnRyeS5uYW1lXSA9PT0gJ3VuZGVmaW5lZCcgfHxcbiAgICAgICAgICAgIG9yZGVyW2VudHJ5Lm5hbWVdID4gaW5kZXhcbiAgICAgICAgICApIHtcbiAgICAgICAgICAgIGlmICh0eXBlb2Ygb3JkZXJbZW50cnkubmFtZV0gIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgIHNpemUudXNlZCAtPSB0YWJsZVtlbnRyeS5uYW1lXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRhYmxlW2VudHJ5Lm5hbWVdID0gZW50cnkuZW5kIC0gZW50cnkuc3RhcnQ7XG4gICAgICAgICAgICBzaXplLnVzZWQgKz0gZW50cnkuZW5kIC0gZW50cnkuc3RhcnQ7XG5cbiAgICAgICAgICAgIG9yZGVyW2VudHJ5Lm5hbWVdID0gaW5kZXg7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgZHJvcChib2R5KTtcbiAgICAgICAgZ3VhcmQuZG9uZSgpO1xuICAgICAgfSksXG4gICAgKS50aGVuKCgpID0+IHNpemUpO1xuICB9XG5cbiAgYXN5bmMgY29tcGFjdChfb2JqID0gdGhpcy5yZWFkKCkpIHtcbiAgICBjb25zdCBvYmogPSBhd2FpdCBfb2JqO1xuICAgIGNvbnN0IG9wcyA9IFtdO1xuICAgIGZvciAoY29uc3Qga2V5IGluIG9iaikge1xuICAgICAgb3BzLnB1c2goe1xuICAgICAgICBrZXksXG4gICAgICAgIHZhbHVlOiBvYmpba2V5XSxcbiAgICAgIH0pO1xuICAgIH1cbiAgICBjb25zdCB0cnVlUGF0aCA9IHRoaXMucGF0aDtcbiAgICB0aGlzLnBhdGggKz0gJ34nO1xuICAgIGF3YWl0IHRoaXMud3JpdGUob3BzKTtcbiAgICB0aGlzLnBhdGggPSB0cnVlUGF0aDtcbiAgICBhd2FpdCByaW1yYWYodGhpcy5wYXRoKTtcbiAgICBhd2FpdCByZW5hbWUoYCR7dGhpcy5wYXRofX5gLCB0aGlzLnBhdGgpO1xuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gQXBwZW5kMjtcbiJdLCJzb3VyY2VSb290IjoiL1VzZXJzL3R5bGVyYXJidXMvZGV2L3Byb3ZpZGVyL3NyYyJ9

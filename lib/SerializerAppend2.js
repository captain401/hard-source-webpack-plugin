'use strict';

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

let tmpBuffer = Buffer.allocUnsafe(TMP_CHUNK);
let outBuffer = Buffer.allocUnsafe(MAX_CHUNK_PLUS);

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

    this.inBuffer = Buffer.alloc(0);
    this._buffers = [];
    this.outBuffer = Buffer.alloc(0);
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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImhhcmQtc291cmNlLXdlYnBhY2stcGx1Z2luL2xpYi9TZXJpYWxpemVyQXBwZW5kMi5qcyJdLCJuYW1lcyI6WyJmcyIsInJlcXVpcmUiLCJqb2luIiwicmVzb2x2ZSIsIl9ta2RpcnAiLCJfcmltcmFmIiwicHJvbWlzaWZ5IiwicGFyc2VKc29uIiwiY2xvc2UiLCJta2RpcnAiLCJvcGVuIiwicmVhZCIsInJlYWRGaWxlIiwicmVhZGRpciIsInJlYWRmZCIsInJlbmFtZSIsInJpbXJhZiIsIndyaXRlIiwid3JpdGVGaWxlIiwibmV4dFBvdzIiLCJuIiwiZXhwb25lbnQiLCJNYXRoIiwibG9nIiwibmV4dEV4cG9uZW50IiwiZmxvb3IiLCJwb3ciLCJyZXNpemVQb3cyIiwiYnVmZmVyIiwidG1wQnVmZmVyIiwiQnVmZmVyIiwiYWxsb2NVbnNhZmUiLCJjb3B5Iiwic2xpY2UiLCJsZW5ndGgiLCJNQVhfQ0hVTksiLCJUTVBfQ0hVTksiLCJNQVhfQ0hVTktfUExVUyIsIkxBUkdFX0NPTlRFTlQiLCJvdXRCdWZmZXIiLCJfYnVmZmVycyIsImFsbG9jIiwic2l6ZSIsInBvcCIsImRyb3AiLCJwdXNoIiwiV3JpdGVPdXRwdXQiLCJjb25zdHJ1Y3RvciIsInRhYmxlIiwiY2xvbmUiLCJvdGhlciIsInRha2UiLCJvdXRwdXQiLCJhZGQiLCJrZXkiLCJjb250ZW50IiwidXRmOFdyaXRlIiwic3RhcnQiLCJlbmQiLCJuYW1lIiwiU2VtYXBob3JlIiwibWF4IiwiY291bnQiLCJuZXh0IiwiZ3VhcmQiLCJTZW1hcGhvcmVHdWFyZCIsIlByb21pc2UiLCJ0aGVuIiwicGFyZW50IiwiZG9uZSIsInNoaWZ0IiwiQXBwZW5kMiIsImNhY2hlRGlyUGF0aCIsInBhdGgiLCJhdXRvUGFyc2UiLCJpbkJ1ZmZlciIsIl9yZWFkRmlsZSIsImZpbGUiLCJmZCIsImJvZHkiLCJmdWxsTGVuZ3RoIiwicmVhZFVJbnQzMkxFIiwidGFibGVMZW5ndGgiLCJ0YWJsZUJvZHkiLCJ1dGY4U2xpY2UiLCJvdXQiLCJ1c2VkIiwidG90YWwiLCJvcmRlciIsIml0ZW1zIiwibG9ncyIsImZpbHRlciIsInRlc3QiLCJpdGVtIiwic29ydCIsInJldmVyc2VMb2dzIiwicmV2ZXJzZSIsInNlbWEiLCJhbGwiLCJtYXAiLCJfZmlsZSIsImluZGV4Iiwia2V5cyIsIk9iamVjdCIsImVudHJ5IiwicHJvY2VzcyIsIm5leHRUaWNrIiwiZGF0YSIsImNvbXBhY3QiLCJfbWFya0xvZyIsIm1hcmtlciIsInJhbmRvbSIsInRvU3RyaW5nIiwic3Vic3RyaW5nIiwicGFkU3RhcnQiLCJsb2dOYW1lIiwid3JpdHRlbk1hcmtlciIsIl93cml0ZSIsIkpTT04iLCJzdHJpbmdpZnkiLCJ3cml0ZVVJbnQzMkxFIiwiX21hcmtBbmRXcml0ZSIsIl93cml0ZUF0TWF4IiwiX3dyaXRlQXRBbnkiLCJvcHMiLCJzbWFsbE91dHB1dCIsImxhcmdlT3V0cHV0Iiwib3V0cHV0UHJvbWlzZXMiLCJvcCIsInZhbHVlIiwic2l6ZXMiLCJfb2JqIiwib2JqIiwidHJ1ZVBhdGgiLCJtb2R1bGUiLCJleHBvcnRzIl0sIm1hcHBpbmdzIjoiOzs7O0FBQUEsTUFBTUEsS0FBS0MsUUFBUSxJQUFSLENBQVg7QUFDQSxNQUFNLEVBQUVDLElBQUYsRUFBUUMsT0FBUixLQUFvQkYsUUFBUSxNQUFSLENBQTFCO0FBQ0EsTUFBTUcsVUFBVUgsUUFBUSxRQUFSLENBQWhCO0FBQ0EsTUFBTUksVUFBVUosUUFBUSxRQUFSLENBQWhCOztBQUVBLE1BQU1LLFlBQVlMLDJCQUFsQjtBQUNBLE1BQU1NLFlBQVlOLDJCQUFsQjs7QUFFQSxNQUFNTyxRQUFRRixVQUFVTixHQUFHUSxLQUFiLENBQWQ7QUFDQSxNQUFNQyxTQUFTSCxVQUFVRixPQUFWLENBQWY7QUFDQSxNQUFNTSxPQUFPSixVQUFVTixHQUFHVSxJQUFiLENBQWI7QUFDQSxNQUFNQyxPQUFPTCxVQUFVTixHQUFHWSxRQUFiLENBQWI7QUFDQSxNQUFNQyxVQUFVUCxVQUFVTixHQUFHYSxPQUFiLENBQWhCO0FB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QU03QyxJQUFaLElBQW9CNkMsTUFBTTlDLEdBQU4sR0FBWThDLE1BQU0vQyxLQUF0QztBQUNBZixtQkFBSzRDLElBQUwsSUFBYWtCLE1BQU05QyxHQUFOLEdBQVk4QyxNQUFNL0MsS0FBL0I7O0FBRUErQixvQkFBTWdCLE1BQU03QyxJQUFaLElBQW9CMEMsS0FBcEI7QUFDRDtBQUNGOztBQUVEekQsZUFBS21DLElBQUw7QUFDQWYsZ0JBQU1LLElBQU47QUFDRCxTQXpCRDs7QUFBQTtBQUFBO0FBQUE7QUFBQSxXQURLLEVBMkJMRixJQTNCSyxDQTJCQTtBQUFBLGVBQU16QixJQUFOO0FBQUEsT0EzQkEsQ0FBUDtBQWpCWTtBQTZDYjs7QUFFS2tFLFNBQU4sQ0FBY3VCLE9BQU8sS0FBS3hILElBQUwsRUFBckIsRUFBa0M7QUFBQTs7QUFBQTtBQUNoQyxZQUFNeUgsTUFBTSxNQUFNRCxJQUFsQjtBQUNBLFlBQU1QLE1BQU0sRUFBWjtBQUNBLFdBQUssTUFBTXRFLEdBQVgsSUFBa0I4RSxHQUFsQixFQUF1QjtBQUNyQlIsWUFBSS9FLElBQUosQ0FBUztBQUNQUyxhQURPO0FBRVAyRSxpQkFBT0csSUFBSTlFLEdBQUo7QUFGQSxTQUFUO0FBSUQ7QUFDRCxZQUFNK0UsV0FBVyxPQUFLNUQsSUFBdEI7QUFDQSxhQUFLQSxJQUFMLElBQWEsR0FBYjtBQUNBLFlBQU0sT0FBS3hELEtBQUwsQ0FBVzJHLEdBQVgsQ0FBTjtBQUNBLGFBQUtuRCxJQUFMLEdBQVk0RCxRQUFaO0FBQ0EsWUFBTXJILE9BQU8sT0FBS3lELElBQVosQ0FBTjtBQUNBLFlBQU0xRCxPQUFRLEdBQUUsT0FBSzBELElBQUssR0FBcEIsRUFBd0IsT0FBS0EsSUFBN0IsQ0FBTjtBQWRnQztBQWVqQztBQXpSVzs7QUE0UmQ2RCxPQUFPQyxPQUFQLEdBQWlCaEUsT0FBakIiLCJmaWxlIjoiaGFyZC1zb3VyY2Utd2VicGFjay1wbHVnaW4vbGliL1NlcmlhbGl6ZXJBcHBlbmQyLmpzIiwic291cmNlc0NvbnRlbnQiOlsiY29uc3QgZnMgPSByZXF1aXJlKCdmcycpO1xuY29uc3QgeyBqb2luLCByZXNvbHZlIH0gPSByZXF1aXJlKCdwYXRoJyk7XG5jb25zdCBfbWtkaXJwID0gcmVxdWlyZSgnbWtkaXJwJyk7XG5jb25zdCBfcmltcmFmID0gcmVxdWlyZSgncmltcmFmJyk7XG5cbmNvbnN0IHByb21pc2lmeSA9IHJlcXVpcmUoJy4vdXRpbC9wcm9taXNpZnknKTtcbmNvbnN0IHBhcnNlSnNvbiA9IHJlcXVpcmUoJy4vdXRpbC9wYXJzZUpzb24nKTtcblxuY29uc3QgY2xvc2UgPSBwcm9taXNpZnkoZnMuY2xvc2UpO1xuY29uc3QgbWtkaXJwID0gcHJvbWlzaWZ5KF9ta2RpcnApO1xuY29uc3Qgb3BlbiA9IHByb21pc2lmeShmcy5vcGVuKTtcbmNvbnN0IHJlYWQgPSBwcm9taXNpZnkoZnMucmVhZEZpbGUpO1xuY29uc3QgcmVhZGRpciA9IHByb21pc2lmeShmcy5yZWFkZGlyKTtcbmNvbnN0IHJlYWRmZCA9IHByb21pc2lmeShmcy5yZWFkKTtcbmNvbnN0IHJlbmFtZSA9IHByb21pc2lmeShmcy5yZW5hbWUpO1xuY29uc3QgcmltcmFmID0gcHJvbWlzaWZ5KF9yaW1yYWYpO1xuY29uc3Qgd3JpdGUgPSBwcm9taXNpZnkoZnMud3JpdGVGaWxlKTtcblxuY29uc3QgbmV4dFBvdzIgPSBuID0+IHtcbiAgY29uc3QgZXhwb25lbnQgPSBNYXRoLmxvZyhuKSAvIE1hdGgubG9nKDIpO1xuICBjb25zdCBuZXh0RXhwb25lbnQgPSBNYXRoLmZsb29yKGV4cG9uZW50KSArIDE7XG4gIHJldHVybiBNYXRoLnBvdygyLCBuZXh0RXhwb25lbnQpO1xufTtcblxuY29uc3QgcmVzaXplUG93MiA9IChidWZmZXIsIG4pID0+IHtcbiAgY29uc3QgdG1wQnVmZmVyID0gQnVmZmVyLmFsbG9jVW5zYWZlKG5leHRQb3cyKG4pKTtcbiAgYnVmZmVyLmNvcHkodG1wQnVmZmVyLnNsaWNlKDAsIGJ1ZmZlci5sZW5ndGgpKTtcbiAgcmV0dXJuIHRtcEJ1ZmZlcjtcbn07XG5cbmNvbnN0IE1BWF9DSFVOSyA9IDIgKiAxMDI0ICogMTAyNDtcbmNvbnN0IFRNUF9DSFVOSyA9IDAuNSAqIDEwMjQgKiAxMDI0O1xuY29uc3QgTUFYX0NIVU5LX1BMVVMgPSAyLjUgKiAxMDI0ICogMTAyNDtcbmNvbnN0IExBUkdFX0NPTlRFTlQgPSA2NCAqIDEwMjQ7XG5cbmxldCB0bXBCdWZmZXIgPSBCdWZmZXIuYWxsb2NVbnNhZmUoVE1QX0NIVU5LKTtcbmxldCBvdXRCdWZmZXIgPSBCdWZmZXIuYWxsb2NVbnNhZmUoTUFYX0NIVU5LX1BMVVMpO1xuXG5jb25zdCBfYnVmZmVycyA9IFtdO1xuXG5jb25zdCBhbGxvYyA9IHNpemUgPT4ge1xuICBjb25zdCBidWZmZXIgPSBfYnVmZmVycy5wb3AoKTtcbiAgaWYgKGJ1ZmZlciAmJiBidWZmZXIubGVuZ3RoID49IHNpemUpIHtcbiAgICByZXR1cm4gYnVmZmVyO1xuICB9XG4gIHJldHVybiBCdWZmZXIuYWxsb2NVbnNhZmUoc2l6ZSk7XG59O1xuY29uc3QgZHJvcCA9IGJ1ZmZlciA9PiBfYnVmZmVycy5wdXNoKGJ1ZmZlcik7XG5cbmNsYXNzIFdyaXRlT3V0cHV0IHtcbiAgY29uc3RydWN0b3IobGVuZ3RoID0gMCwgdGFibGUgPSBbXSwgYnVmZmVyID0gYWxsb2MoTUFYX0NIVU5LX1BMVVMpKSB7XG4gICAgdGhpcy5sZW5ndGggPSBsZW5ndGg7XG4gICAgdGhpcy50YWJsZSA9IHRhYmxlO1xuICAgIHRoaXMuYnVmZmVyID0gYnVmZmVyO1xuICB9XG5cbiAgc3RhdGljIGNsb25lKG90aGVyKSB7XG4gICAgcmV0dXJuIG5ldyBXcml0ZU91dHB1dChvdGhlci5sZW5ndGgsIG90aGVyLnRhYmxlLCBvdGhlci5idWZmZXIpO1xuICB9XG5cbiAgdGFrZSgpIHtcbiAgICBjb25zdCBvdXRwdXQgPSBXcml0ZU91dHB1dC5jbG9uZSh0aGlzKTtcblxuICAgIHRoaXMubGVuZ3RoID0gMDtcbiAgICB0aGlzLnRhYmxlID0gW107XG4gICAgdGhpcy5idWZmZXIgPSBhbGxvYyhNQVhfQ0hVTktfUExVUyk7XG5cbiAgICByZXR1cm4gb3V0cHV0O1xuICB9XG5cbiAgYWRkKGtleSwgY29udGVudCkge1xuICAgIGlmIChjb250ZW50ICE9PSBudWxsKSB7XG4gICAgICAvLyBXcml0ZSBjb250ZW50IHRvIGEgdGVtcG9yYXJ5IGJ1ZmZlclxuICAgICAgbGV0IGxlbmd0aCA9IHRtcEJ1ZmZlci51dGY4V3JpdGUoY29udGVudCk7XG4gICAgICB3aGlsZSAobGVuZ3RoID09PSB0bXBCdWZmZXIubGVuZ3RoKSB7XG4gICAgICAgIHRtcEJ1ZmZlciA9IEJ1ZmZlci5hbGxvY1Vuc2FmZSh0bXBCdWZmZXIubGVuZ3RoICogMik7XG4gICAgICAgIGxlbmd0aCA9IHRtcEJ1ZmZlci51dGY4V3JpdGUoY29udGVudCk7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IHN0YXJ0ID0gdGhpcy5sZW5ndGg7XG4gICAgICBjb25zdCBlbmQgPSBzdGFydCArIGxlbmd0aDtcblxuICAgICAgLy8gRW5zdXJlIG91dHB1dCBidWZmZXIgaXMgbG9uZyBlbm91Z2ggdG8gYWRkIHRoZSBuZXcgY29udGVudFxuICAgICAgaWYgKGVuZCA+IHRoaXMuYnVmZmVyLmxlbmd0aCkge1xuICAgICAgICB0aGlzLmJ1ZmZlciA9IHJlc2l6ZVBvdzIodGhpcy5idWZmZXIsIGVuZCk7XG4gICAgICB9XG5cbiAgICAgIC8vIENvcHkgdGVtcG9yYXJ5IGJ1ZmZlciB0byB0aGUgZW5kIG9mIHRoZSBjdXJyZW50IG91dHB1dCBidWZmZXJcbiAgICAgIHRtcEJ1ZmZlci5jb3B5KHRoaXMuYnVmZmVyLnNsaWNlKHN0YXJ0LCBlbmQpKTtcblxuICAgICAgdGhpcy50YWJsZS5wdXNoKHtcbiAgICAgICAgbmFtZToga2V5LFxuICAgICAgICBzdGFydCxcbiAgICAgICAgZW5kLFxuICAgICAgfSk7XG4gICAgICB0aGlzLmxlbmd0aCA9IGVuZDtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy50YWJsZS5wdXNoKHtcbiAgICAgICAgbmFtZToga2V5LFxuICAgICAgICBzdGFydDogLTEsXG4gICAgICAgIGVuZDogLTEsXG4gICAgICB9KTtcbiAgICB9XG4gIH1cbn1cblxuY2xhc3MgU2VtYXBob3JlIHtcbiAgY29uc3RydWN0b3IobWF4KSB7XG4gICAgdGhpcy5tYXggPSBtYXg7XG4gICAgdGhpcy5jb3VudCA9IDA7XG4gICAgdGhpcy5uZXh0ID0gW107XG4gIH1cblxuICBhc3luYyBndWFyZCgpIHtcbiAgICBpZiAodGhpcy5jb3VudCA8IHRoaXMubWF4KSB7XG4gICAgICB0aGlzLmNvdW50Kys7XG4gICAgICByZXR1cm4gbmV3IFNlbWFwaG9yZUd1YXJkKHRoaXMpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gbmV3IFByb21pc2UocmVzb2x2ZSA9PiB7XG4gICAgICAgIHRoaXMubmV4dC5wdXNoKHJlc29sdmUpO1xuICAgICAgfSkudGhlbigoKSA9PiBuZXcgU2VtYXBob3JlR3VhcmQodGhpcykpO1xuICAgIH1cbiAgfVxufVxuXG5jbGFzcyBTZW1hcGhvcmVHdWFyZCB7XG4gIGNvbnN0cnVjdG9yKHBhcmVudCkge1xuICAgIHRoaXMucGFyZW50ID0gcGFyZW50O1xuICB9XG5cbiAgZG9uZSgpIHtcbiAgICBjb25zdCBuZXh0ID0gdGhpcy5wYXJlbnQubmV4dC5zaGlmdCgpO1xuICAgIGlmIChuZXh0KSB7XG4gICAgICBuZXh0KCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMucGFyZW50LmNvdW50LS07XG4gICAgfVxuICB9XG59XG5cbmNsYXNzIEFwcGVuZDIge1xuICBjb25zdHJ1Y3Rvcih7IGNhY2hlRGlyUGF0aDogcGF0aCwgYXV0b1BhcnNlIH0pIHtcbiAgICB0aGlzLnBhdGggPSBwYXRoO1xuICAgIHRoaXMuYXV0b1BhcnNlID0gYXV0b1BhcnNlO1xuXG4gICAgdGhpcy5pbkJ1ZmZlciA9IEJ1ZmZlci5hbGxvYygwKTtcbiAgICB0aGlzLl9idWZmZXJzID0gW107XG4gICAgdGhpcy5vdXRCdWZmZXIgPSBCdWZmZXIuYWxsb2MoMCk7XG4gIH1cblxuICBhc3luYyBfcmVhZEZpbGUoZmlsZSkge1xuICAgIGNvbnN0IGZkID0gYXdhaXQgb3BlbihmaWxlLCAncisnKTtcblxuICAgIGxldCBib2R5ID0gYWxsb2MoTUFYX0NIVU5LX1BMVVMpO1xuXG4gICAgYXdhaXQgcmVhZGZkKGZkLCBib2R5LCAwLCA0LCBudWxsKTtcbiAgICBjb25zdCBmdWxsTGVuZ3RoID0gYm9keS5yZWFkVUludDMyTEUoMCk7XG4gICAgaWYgKGZ1bGxMZW5ndGggPiBib2R5Lmxlbmd0aCkge1xuICAgICAgZHJvcChib2R5KTtcbiAgICAgIGJvZHkgPSBhbGxvYyhuZXh0UG93MihmdWxsTGVuZ3RoKSk7XG4gICAgfVxuICAgIGF3YWl0IHJlYWRmZChmZCwgYm9keSwgMCwgZnVsbExlbmd0aCwgbnVsbCk7XG5cbiAgICBjbG9zZShmZCk7XG5cbiAgICBjb25zdCB0YWJsZUxlbmd0aCA9IGJvZHkucmVhZFVJbnQzMkxFKDApO1xuICAgIGNvbnN0IHRhYmxlQm9keSA9IGJvZHkudXRmOFNsaWNlKDQsIDQgKyB0YWJsZUxlbmd0aCk7XG4gICAgY29uc3QgdGFibGUgPSBwYXJzZUpzb24odGFibGVCb2R5KTtcbiAgICBjb25zdCBjb250ZW50ID0gYm9keS5zbGljZSg0ICsgdGFibGVMZW5ndGgpO1xuXG4gICAgcmV0dXJuIFt0YWJsZSwgY29udGVudCwgYm9keV07XG4gIH1cblxuICBhc3luYyByZWFkKCkge1xuICAgIGNvbnN0IG91dCA9IHt9O1xuICAgIGNvbnN0IHNpemUgPSB7IHVzZWQ6IDAsIHRvdGFsOiAwIH07XG4gICAgY29uc3QgdGFibGUgPSB7fTtcbiAgICBjb25zdCBvcmRlciA9IHt9O1xuXG4gICAgYXdhaXQgbWtkaXJwKHRoaXMucGF0aCk7XG5cbiAgICBjb25zdCBpdGVtcyA9IGF3YWl0IHJlYWRkaXIodGhpcy5wYXRoKTtcbiAgICBjb25zdCBsb2dzID0gaXRlbXMuZmlsdGVyKGl0ZW0gPT4gL15sb2dcXGQrJC8udGVzdChpdGVtKSk7XG4gICAgbG9ncy5zb3J0KCk7XG4gICAgY29uc3QgcmV2ZXJzZUxvZ3MgPSBsb2dzLnJldmVyc2UoKTtcblxuICAgIGNvbnN0IHNlbWEgPSBuZXcgU2VtYXBob3JlKDgpO1xuXG4gICAgcmV0dXJuIFByb21pc2UuYWxsKFxuICAgICAgcmV2ZXJzZUxvZ3MubWFwKGFzeW5jIChfZmlsZSwgaW5kZXgpID0+IHtcbiAgICAgICAgY29uc3QgZmlsZSA9IGpvaW4odGhpcy5wYXRoLCBfZmlsZSk7XG4gICAgICAgIGNvbnN0IGd1YXJkID0gYXdhaXQgc2VtYS5ndWFyZCgpO1xuXG4gICAgICAgIGNvbnN0IFt0YWJsZSwgY29udGVudCwgYm9keV0gPSBhd2FpdCB0aGlzLl9yZWFkRmlsZShmaWxlKTtcblxuICAgICAgICBjb25zdCBrZXlzID0gT2JqZWN0LmtleXModGFibGUpO1xuICAgICAgICBpZiAoa2V5cy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgc2l6ZS50b3RhbCArPSB0YWJsZVtrZXlzLmxlbmd0aCAtIDFdLmVuZDtcbiAgICAgICAgfVxuXG4gICAgICAgIGZvciAoY29uc3QgZW50cnkgb2YgdGFibGUpIHtcbiAgICAgICAgICBpZiAoXG4gICAgICAgICAgICB0eXBlb2Ygb3JkZXJbZW50cnkubmFtZV0gPT09ICd1bmRlZmluZWQnIHx8XG4gICAgICAgICAgICBvcmRlcltlbnRyeS5uYW1lXSA+IGluZGV4XG4gICAgICAgICAgKSB7XG4gICAgICAgICAgICBpZiAodHlwZW9mIG9yZGVyW2VudHJ5Lm5hbWVdICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICBzaXplLnVzZWQgLT0gdGFibGVbZW50cnkubmFtZV07XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHRhYmxlW2VudHJ5Lm5hbWVdID0gZW50cnkuZW5kIC0gZW50cnkuc3RhcnQ7XG4gICAgICAgICAgICBzaXplLnVzZWQgKz0gZW50cnkuZW5kIC0gZW50cnkuc3RhcnQ7XG5cbiAgICAgICAgICAgIG9yZGVyW2VudHJ5Lm5hbWVdID0gaW5kZXg7XG5cbiAgICAgICAgICAgIC8vIE5lZ2F0aXZlIHN0YXJ0IHBvc2l0aW9ucyBhcmUgbm90IHNldCBvbiB0aGUgb3V0cHV0LiBUaGV5IGFyZVxuICAgICAgICAgICAgLy8gdHJlYXRlZCBhcyBpZiB0aGV5IHdlcmUgZGVsZXRlZCBpbiBhIHByaW9yIHdyaXRlLiBBIGZ1dHVyZVxuICAgICAgICAgICAgLy8gY29tcGFjdCB3aWxsIHJlbW92ZSBhbGwgaW5zdGFuY2VzIG9mIGFueSBvbGQgZW50cmllcy5cbiAgICAgICAgICAgIGlmIChlbnRyeS5zdGFydCA+PSAwKSB7XG4gICAgICAgICAgICAgIGF3YWl0IG5ldyBQcm9taXNlKHByb2Nlc3MubmV4dFRpY2spO1xuICAgICAgICAgICAgICBjb25zdCBkYXRhID0gY29udGVudC51dGY4U2xpY2UoZW50cnkuc3RhcnQsIGVudHJ5LmVuZCk7XG4gICAgICAgICAgICAgIGlmICh0aGlzLmF1dG9QYXJzZSkge1xuICAgICAgICAgICAgICAgIG91dFtlbnRyeS5uYW1lXSA9IHBhcnNlSnNvbihkYXRhKTtcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBvdXRbZW50cnkubmFtZV0gPSBkYXRhO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBkZWxldGUgb3V0W2VudHJ5Lm5hbWVdO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGRyb3AoYm9keSk7XG4gICAgICAgIGd1YXJkLmRvbmUoKTtcbiAgICAgIH0pLFxuICAgIClcbiAgICAgIC50aGVuKGFzeW5jICgpID0+IHtcbiAgICAgICAgaWYgKHNpemUudXNlZCAvIHNpemUudG90YWwgPCAwLjYpIHtcbiAgICAgICAgICBhd2FpdCB0aGlzLmNvbXBhY3Qob3V0KTtcbiAgICAgICAgfVxuICAgICAgfSlcbiAgICAgIC50aGVuKCgpID0+IG91dCk7XG4gIH1cblxuICBhc3luYyBfbWFya0xvZygpIHtcbiAgICBjb25zdCBjb3VudCA9IChhd2FpdCByZWFkZGlyKHRoaXMucGF0aCkpLmZpbHRlcihpdGVtID0+XG4gICAgICAvbG9nXFxkKyQvLnRlc3QoaXRlbSksXG4gICAgKS5sZW5ndGg7XG4gICAgY29uc3QgbWFya2VyID0gTWF0aC5yYW5kb20oKVxuICAgICAgLnRvU3RyaW5nKDE2KVxuICAgICAgLnN1YnN0cmluZygyKVxuICAgICAgLnBhZFN0YXJ0KDEzLCAnMCcpO1xuICAgIGNvbnN0IGxvZ05hbWUgPSBgbG9nJHtjb3VudC50b1N0cmluZygpLnBhZFN0YXJ0KDQsICcwJyl9YDtcbiAgICBjb25zdCBmaWxlID0gcmVzb2x2ZSh0aGlzLnBhdGgsIGxvZ05hbWUpO1xuICAgIGF3YWl0IHdyaXRlKGZpbGUsIG1hcmtlcik7XG4gICAgY29uc3Qgd3JpdHRlbk1hcmtlciA9IGF3YWl0IHJlYWQoZmlsZSwgJ3V0ZjgnKTtcbiAgICBpZiAobWFya2VyID09PSB3cml0dGVuTWFya2VyKSB7XG4gICAgICByZXR1cm4gZmlsZTtcbiAgICB9XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICBhc3luYyBfd3JpdGUoZmlsZSwgb3V0cHV0KSB7XG4gICAgLy8gNCBieXRlcyAtIGZ1bGwgbGVuZ3RoXG4gICAgLy8gNCBieXRlcyAtIGxlbmd0aCBvZiB0YWJsZVxuICAgIC8vIHggYnl0ZXMgLSB0YWJsZVxuICAgIC8vIHkgYnl0ZXMgLSBjb250ZW50XG5cbiAgICAvLyBXcml0ZSB0YWJsZSBpbnRvIGEgdGVtcG9yYXJ5IGJ1ZmZlciBhdCBwb3NpdGlvbiA4XG4gICAgY29uc3QgY29udGVudCA9IEpTT04uc3RyaW5naWZ5KG91dHB1dC50YWJsZSk7XG4gICAgbGV0IGxlbmd0aCA9IHRtcEJ1ZmZlci51dGY4V3JpdGUoY29udGVudCwgOCk7XG4gICAgLy8gTWFrZSB0aGUgdGVtcG9yYXJ5IGJ1ZmZlciBsb25nZXIgaWYgdGhlIHNwYWNlIHVzZWQgaXMgdGhlIHNhbWUgYXMgdGhlXG4gICAgLy8gbGVuZ3RoXG4gICAgd2hpbGUgKDggKyBsZW5ndGggPT09IHRtcEJ1ZmZlci5sZW5ndGgpIHtcbiAgICAgIHRtcEJ1ZmZlciA9IEJ1ZmZlci5hbGxvY1Vuc2FmZShuZXh0UG93Mig4ICsgbGVuZ3RoKSk7XG4gICAgICAvLyBXcml0ZSBhZ2FpbiB0byBzZWUgaWYgdGhlIGxlbmd0aCBpcyBtb3JlIGR1ZSB0byB0aGUgbGFzdCBidWZmZXIgYmVpbmdcbiAgICAgIC8vIHRvbyBzaG9ydC5cbiAgICAgIGxlbmd0aCA9IHRtcEJ1ZmZlci51dGY4V3JpdGUoY29udGVudCwgOCk7XG4gICAgfVxuXG4gICAgLy8gRW5zdXJlIHRoZSBidWZmZXIgaXMgbG9uZyBlbm91Z2ggdG8gZml0IHRoZSB0YWJsZSBhbmQgY29udGVudC5cbiAgICBjb25zdCBlbmQgPSA4ICsgbGVuZ3RoICsgb3V0cHV0Lmxlbmd0aDtcbiAgICBpZiAoZW5kID4gdG1wQnVmZmVyLmxlbmd0aCkge1xuICAgICAgdG1wQnVmZmVyID0gcmVzaXplUG93Mih0bXBCdWZmZXIsIGVuZCk7XG4gICAgfVxuXG4gICAgLy8gQ29weSB0aGUgb3V0cHV0IGFmdGVyIHRoZSB0YWJsZS5cbiAgICBvdXRwdXQuYnVmZmVyLmNvcHkodG1wQnVmZmVyLnNsaWNlKDggKyBsZW5ndGgsIGVuZCkpO1xuXG4gICAgLy8gRnVsbCBsZW5ndGggYWZ0ZXIgdGhpcyB1aW50LlxuICAgIHRtcEJ1ZmZlci53cml0ZVVJbnQzMkxFKGVuZCAtIDQsIDApO1xuICAgIC8vIExlbmd0aCBvZiB0YWJsZSBhZnRlciB0aGlzIHVpbnQuXG4gICAgdG1wQnVmZmVyLndyaXRlVUludDMyTEUobGVuZ3RoLCA0KTtcblxuICAgIGlmIChlbmQgPiBvdXRwdXQuYnVmZmVyLmxlbmd0aCkge1xuICAgICAgb3V0cHV0LmJ1ZmZlciA9IGFsbG9jKG5leHRQb3cyKGVuZCkpO1xuICAgIH1cbiAgICB0bXBCdWZmZXIuY29weShvdXRwdXQuYnVmZmVyLnNsaWNlKDAsIGVuZCkpO1xuXG4gICAgYXdhaXQgd3JpdGUoZmlsZSwgb3V0cHV0LmJ1ZmZlci5zbGljZSgwLCBlbmQpKTtcbiAgICBkcm9wKG91dHB1dC5idWZmZXIpO1xuICB9XG5cbiAgYXN5bmMgX21hcmtBbmRXcml0ZShvdXRwdXQpIHtcbiAgICBjb25zdCBmaWxlID0gYXdhaXQgdGhpcy5fbWFya0xvZygpO1xuICAgIGlmIChmaWxlICE9PSBudWxsKSB7XG4gICAgICBhd2FpdCB0aGlzLl93cml0ZShmaWxlLCBvdXRwdXQudGFrZSgpKTtcbiAgICB9XG4gIH1cblxuICAvLyBXcml0ZSBvdXQgYSBsb2cgY2h1bmsgb25jZSB0aGUgZmlsZSByZWFjaGVzIHRoZSBtYXhpbXVtIGNodW5rIHNpemUuXG4gIGFzeW5jIF93cml0ZUF0TWF4KG91dHB1dCkge1xuICAgIHdoaWxlIChvdXRwdXQubGVuZ3RoID49IE1BWF9DSFVOSykge1xuICAgICAgYXdhaXQgdGhpcy5fbWFya0FuZFdyaXRlKG91dHB1dCk7XG4gICAgfVxuICB9XG5cbiAgLy8gV3JpdGUgb3V0IGEgbG9nIGNodW5rIGlmIHRoZWlyIGlzIGFueSBlbnRyaWVzIGluIHRoZSB0YWJsZS5cbiAgYXN5bmMgX3dyaXRlQXRBbnkob3V0cHV0KSB7XG4gICAgd2hpbGUgKG91dHB1dC50YWJsZS5sZW5ndGggPiAwKSB7XG4gICAgICBhd2FpdCB0aGlzLl9tYXJrQW5kV3JpdGUob3V0cHV0KTtcbiAgICB9XG4gIH1cblxuICBhc3luYyB3cml0ZShvcHMpIHtcbiAgICBsZXQgc21hbGxPdXRwdXQgPSBuZXcgV3JpdGVPdXRwdXQoKTtcbiAgICBsZXQgbGFyZ2VPdXRwdXQgPSBuZXcgV3JpdGVPdXRwdXQoKTtcblxuICAgIGNvbnN0IG91dHB1dFByb21pc2VzID0gW107XG5cbiAgICBhd2FpdCBta2RpcnAodGhpcy5wYXRoKTtcblxuICAgIGZvciAoY29uc3Qgb3Agb2Ygb3BzKSB7XG4gICAgICBpZiAob3AudmFsdWUgIT09IG51bGwpIHtcbiAgICAgICAgbGV0IGNvbnRlbnQgPSBvcC52YWx1ZTtcbiAgICAgICAgaWYgKHR5cGVvZiBjb250ZW50ICE9PSAnc3RyaW5nJykge1xuICAgICAgICAgIGNvbnRlbnQgPSBKU09OLnN0cmluZ2lmeShjb250ZW50KTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoY29udGVudC5sZW5ndGggPCBMQVJHRV9DT05URU5UKSB7XG4gICAgICAgICAgc21hbGxPdXRwdXQuYWRkKG9wLmtleSwgY29udGVudCk7XG5cbiAgICAgICAgICBhd2FpdCB0aGlzLl93cml0ZUF0TWF4KHNtYWxsT3V0cHV0KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBsYXJnZU91dHB1dC5hZGQob3Aua2V5LCBjb250ZW50KTtcblxuICAgICAgICAgIGF3YWl0IHRoaXMuX3dyaXRlQXRNYXgobGFyZ2VPdXRwdXQpO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzbWFsbE91dHB1dC5hZGQob3Aua2V5LCBudWxsKTtcblxuICAgICAgICBhd2FpdCB0aGlzLl93cml0ZUF0TWF4KHNtYWxsT3V0cHV0KTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBhd2FpdCB0aGlzLl93cml0ZUF0QW55KHNtYWxsT3V0cHV0KTtcbiAgICBhd2FpdCB0aGlzLl93cml0ZUF0QW55KGxhcmdlT3V0cHV0KTtcblxuICAgIGF3YWl0IFByb21pc2UuYWxsKG91dHB1dFByb21pc2VzKTtcbiAgfVxuXG4gIGFzeW5jIHNpemVzKCkge1xuICAgIGNvbnN0IHNpemUgPSB7XG4gICAgICB1c2VkOiAwLFxuICAgICAgdG90YWw6IDAsXG4gICAgfTtcbiAgICBjb25zdCB0YWJsZSA9IHt9O1xuICAgIGNvbnN0IG9yZGVyID0ge307XG5cbiAgICBhd2FpdCBta2RpcnAodGhpcy5wYXRoKTtcblxuICAgIGNvbnN0IGl0ZW1zID0gYXdhaXQgcmVhZGRpcih0aGlzLnBhdGgpO1xuICAgIGNvbnN0IGxvZ3MgPSBpdGVtcy5maWx0ZXIoaXRlbSA9PiAvXmxvZ1xcZCskLy50ZXN0KGl0ZW0pKTtcbiAgICBsb2dzLnNvcnQoKTtcbiAgICBjb25zdCByZXZlcnNlTG9ncyA9IGxvZ3MucmV2ZXJzZSgpO1xuXG4gICAgY29uc3Qgc2VtYSA9IG5ldyBTZW1hcGhvcmUoOCk7XG5cbiAgICByZXR1cm4gUHJvbWlzZS5hbGwoXG4gICAgICByZXZlcnNlTG9ncy5tYXAoYXN5bmMgKF9maWxlLCBpbmRleCkgPT4ge1xuICAgICAgICBjb25zdCBmaWxlID0gam9pbih0aGlzLnBhdGgsIF9maWxlKTtcbiAgICAgICAgY29uc3QgZ3VhcmQgPSBhd2FpdCBzZW1hLmd1YXJkKCk7XG5cbiAgICAgICAgY29uc3QgW3RhYmxlLCBjb250ZW50LCBib2R5XSA9IGF3YWl0IHRoaXMuX3JlYWRGaWxlKGZpbGUpO1xuXG4gICAgICAgIHNpemUudG90YWwgKz0gY29udGVudC5sZW5ndGg7XG5cbiAgICAgICAgZm9yIChjb25zdCBlbnRyeSBvZiB0YWJsZSkge1xuICAgICAgICAgIGlmIChcbiAgICAgICAgICAgIHR5cGVvZiBvcmRlcltlbnRyeS5uYW1lXSA9PT0gJ3VuZGVmaW5lZCcgfHxcbiAgICAgICAgICAgIG9yZGVyW2VudHJ5Lm5hbWVdID4gaW5kZXhcbiAgICAgICAgICApIHtcbiAgICAgICAgICAgIGlmICh0eXBlb2Ygb3JkZXJbZW50cnkubmFtZV0gIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgIHNpemUudXNlZCAtPSB0YWJsZVtlbnRyeS5uYW1lXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRhYmxlW2VudHJ5Lm5hbWVdID0gZW50cnkuZW5kIC0gZW50cnkuc3RhcnQ7XG4gICAgICAgICAgICBzaXplLnVzZWQgKz0gZW50cnkuZW5kIC0gZW50cnkuc3RhcnQ7XG5cbiAgICAgICAgICAgIG9yZGVyW2VudHJ5Lm5hbWVdID0gaW5kZXg7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgZHJvcChib2R5KTtcbiAgICAgICAgZ3VhcmQuZG9uZSgpO1xuICAgICAgfSksXG4gICAgKS50aGVuKCgpID0+IHNpemUpO1xuICB9XG5cbiAgYXN5bmMgY29tcGFjdChfb2JqID0gdGhpcy5yZWFkKCkpIHtcbiAgICBjb25zdCBvYmogPSBhd2FpdCBfb2JqO1xuICAgIGNvbnN0IG9wcyA9IFtdO1xuICAgIGZvciAoY29uc3Qga2V5IGluIG9iaikge1xuICAgICAgb3BzLnB1c2goe1xuICAgICAgICBrZXksXG4gICAgICAgIHZhbHVlOiBvYmpba2V5XSxcbiAgICAgIH0pO1xuICAgIH1cbiAgICBjb25zdCB0cnVlUGF0aCA9IHRoaXMucGF0aDtcbiAgICB0aGlzLnBhdGggKz0gJ34nO1xuICAgIGF3YWl0IHRoaXMud3JpdGUob3BzKTtcbiAgICB0aGlzLnBhdGggPSB0cnVlUGF0aDtcbiAgICBhd2FpdCByaW1yYWYodGhpcy5wYXRoKTtcbiAgICBhd2FpdCByZW5hbWUoYCR7dGhpcy5wYXRofX5gLCB0aGlzLnBhdGgpO1xuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gQXBwZW5kMjtcbiJdLCJzb3VyY2VSb290IjoiL1VzZXJzL3R5bGVyYXJidXMvZGV2L3Byb3ZpZGVyL3NyYyJ9

'use strict';

require('source-map-support/register');

const fs = require('fs');
const join = require('path').join;
const Readable = require('stream').Readable;

const _mkdirp = require('mkdirp');
const _rimraf = require('rimraf');
const writeJsonFile = require('write-json-file');

const entries = require('./util/Object.entries');
const values = require('./util/Object.values');
const promisify = require('./util/promisify');

const rimraf = promisify(_rimraf);
const open = promisify(fs.open);
const close = promisify(fs.close);
const read = promisify(fs.read);
const readFile = promisify(fs.readFile);
const write = promisify(fs.write);
const rename = promisify(fs.rename);
const unlink = promisify(fs.unlink);
const stat = promisify(fs.stat);
const mkdirp = promisify(_mkdirp);

const APPEND_VERSION = 1;

const _blockSize = 4 * 1024;
const _logSize = 2 * 1024 * 1024;
const _minCompactSize = 512 * 1024;
const _compactMultiplierThreshold = 1.5;

const value = (key, size, start) => ({
  key,
  size: size || 0,
  start: start || 0
});

const objFrom = map => {
  if (map instanceof Map) {
    const obj = {};
    map.forEach((value, key) => {
      obj[key] = value;
    });
    return obj;
  }
  return map;
};

const table = ({ nextByte, blockSize, logSize, map }) => ({
  version: APPEND_VERSION,
  nextByte: nextByte,
  blockSize: blockSize,
  logSize: logSize,
  map: objFrom(map)
});

const modTable = ({ nextByte, blockSize, logSize, map }) => ({
  version: APPEND_VERSION,
  nextByte: nextByte,
  blockSize: blockSize,
  logSize: logSize,
  map: new Map(entries(map))
});

function putKey(_table, key, size) {
  // _table.map[key] = value(key, size, _table.nextByte, Math.ceil(size / _table.blockSize));
  _table.map.set(key, value(key, size, _table.nextByte));
  _table.nextByte = _table.nextByte + size;
  return _table;
}

function delKey(_table, key) {
  // if (_table.map[key]) {
  //   delete _table.map[key];
  if (_table.map.get(key)) {
    _table.map.delete(key);
  }
  return _table;
}

const _tablepath = ({ path }) => join(path, 'table.json');

const _defaultTable = ({ blockSize, logSize }) => table({
  nextByte: 0,
  blockSize: blockSize || _blockSize,
  logSize: logSize || _logSize,
  map: {}
});

const timeout100 = () => new Promise(resolve => setTimeout(resolve, 100));

const _retry = (fn, n) => {
  n = n || 5;
  const _retryFn = value => {
    if (n) {
      n--;
      return fn(value).catch(_retryFn);
    }
    return fn(value);
  };
  return _retryFn;
};

const _readTable = _this => readFile(_tablepath(_this), 'utf8').catch(e => JSON.stringify(_defaultTable(_this))).then(JSON.parse).then(_table => {
  if (_table.version !== APPEND_VERSION) {
    return _defaultTable(_this);
  }
  return _table;
});

const _writeTable = (_this, _table) => writeJsonFile(_tablepath(_this), _table);

const _logFilepath = ({ path }, { logSize }, index) => {
  let logId = (index / logSize | 0).toString();
  while (logId.length < 4) {
    logId = `0${logId}`;
  }
  return join(path, `log${logId}`);
};

const _openLog = (_this, mode, _table, index) => {
  if (_this._fd !== null) {
    return Promise.resolve();
  } else {
    // If mode is 'a', stat the log to write to, if it should be empty and
    // isn't, unlink before opening.
    return Promise.resolve().then(() => {
      if (mode === 'a' && index % _table.logSize === 0) {
        return stat(_logFilepath(_this, _table, index)).then(({ size }) => {
          if (size > 0) {
            return unlink(_logFilepath(_this, _table, index)).then(timeout100);
          }
        }).catch(() => {});
      }
    }).then(() => open(_logFilepath(_this, _table, index), mode)).then(fd => {
      _this._fd = fd;
      if (mode === 'a') {
        _this._writeBuffer = new Buffer(_table.logSize);
        _this._writeOffset = 0;
      }
    }).catch(e => {
      throw e;
    });
  }
};

const _closeLog = _this => {
  if (_this._fd === null) {
    return Promise.resolve();
  } else {
    return Promise.resolve().then(() => {
      if (_this._writeBuffer) {
        return write(_this._fd, _this._writeBuffer, 0, _this._writeOffset);
      }
    }).then(() => close(_this._fd)).then(() => {
      _this._fd = null;
      _this._writeBuffer = null;
      _this._writeOffset = 0;
    });
  }
};

const _readBufferSize = (_this, { blockSize, logSize }) => Math.min(32 * blockSize, logSize);

const _readLog = (_this, _table) => {
  let index = 0;
  const out = new Readable({
    read() {}
  });

  const rbSize = _table.logSize;
  const _readBuffer = new Buffer(rbSize);

  function _log() {
    if (index >= _table.nextByte) {
      out.push(null);
      return _closeLog(_this);
    }

    const offset = 0;
    function step() {
      if (!_this._fd) {
        index = _table.nextByte;
        return _log();
      }

      return read(_this._fd, _readBuffer, 0, rbSize, 0).then(read => {
        index += _table.logSize;
        out.push(_readBuffer);
        return _log();
      });
    }

    return _closeLog(_this).then(() => _openLog(_this, 'r', _table, index)).then(step);
  }
  Promise.resolve().then(_log);

  return out;
};

const _appendBlock = (_this, _table, blockContent, index, next) => {
  let prep;
  if (_this._fd !== null && index % _table.logSize === 0) {
    prep = _closeLog(_this).then(() => _openLog(_this, 'a', _table, index));
  } else if (_this._fd === null) {
    prep = _openLog(_this, 'a', _table, index);
  }
  function work() {
    if (!_this._fd) {
      return next(new Error());
    }
    if (blockContent.length > _table.logSize) {
      return next(new Error('block longer than max size'));
    }
    const writeSlice = _this._writeBuffer.slice(_this._writeOffset, _this._writeOffset + blockContent.length);
    // if (blockContent.length < _table.blockSize) {
    //   writeSlice.fill(0);
    // }
    blockContent.copy(writeSlice);
    _this._writeOffset += blockContent.length;
    if (_this._writeOffset > _this._writeBuffer.length) {
      return next(new Error(`writeOffset ${_this._writeOffset} past writeBuffer length ${_this._writeBuffer.length}`));
    }
    if (_this._writeOffset > _table.logSize) {
      return next(new Error(`writeOffset ${_this._writeOffset} past logSize ${_table.logSize}`));
    }
    next();
    // return fs.write(_this._fd, blockContent, 0, _table.blockSize, next);
  }
  if (prep) {
    prep.then(work);
  } else {
    work();
  }

  // return Promise.resolve()
  // .then(function() {
  //   if (index % (_table.logSize / _table.blockSize) === 0) {
  //     return _closeLog(_this);
  //   }
  // })
  // .then(function() {
  //   return _openLog(_this, 'a', _table, index);
  // })
  // .then(function() {
  //   if (!_this._fd) {
  //     throw new Error();
  //   }
  //   if (blockContent.length > _table.blockSize) {
  //     throw new Error('block longer than max size');
  //   }
  //   if (blockContent.length < _table.blockSize) {
  //     var _blockContent = new Buffer(_table.blockSize);
  //     blockContent.copy(_blockContent);
  //     blockContent = _blockContent;
  //   }
  //   return write(_this._fd, blockContent, 0, _table.blockSize);
  // });
};

const _sizeNeeded = (_this, { map }) => values(map).reduce((carry, { size }) => carry + size, 0);

const _sizeUsed = (_this, { nextByte }) => nextByte;

const _compactSize = (_this, _table) => Math.max(_this.compactSizeThreshold, _sizeNeeded(_this, _table) * _this.compactMultiplierThreshold);

const _lock = (_this, mustLock, promiseFn) => {
  if (mustLock !== false) {
    return _this.lock = promiseFn(_this.lock);
  }
  return promiseFn(Promise.resolve());
};

const serialFsTask = (array, each) => new Promise((resolve, reject) => {
  let queue = 0;
  let index = 0;
  let inNext = false;
  function next(err) {
    if (err) {
      return reject(err);
    }
    if (index === array.length) {
      return resolve();
    }
    queue++;
    if (inNext) {
      return;
    }
    inNext = true;
    while (queue > index && index < array.length) {
      try {
        each(array[index++], next);
      } catch (e) {
        return next(e);
      }
    }
    inNext = false;
  }
  next();
});

class AppendSerializer {
  constructor(options) {
    this.path = options.cacheDirPath;
    this.autoParse = options.autoParse;
    this.blockSize = options.blockSize || _blockSize;
    this.logSize = options.logSize || _logSize;
    this.compactSizeThreshold = options.compactSizeThreshold || _minCompactSize;
    this.compactMultiplierThreshold = options.compactMultiplierThreshold || _compactMultiplierThreshold;

    this.lock = Promise.resolve();
    this._fd = null;
  }

  read(mustLock) {
    const start = Date.now();
    const _this = this;

    function _read() {
      let activeTable;
      return Promise.resolve().then(_retry(() => _readTable(_this))).then(_table => {
        activeTable = _table;
      }).then(() => {
        const map = new Map();

        const valueStarts = [];
        values(activeTable.map).forEach(value => {
          valueStarts.push({
            start: value.start,
            end: value.start + value.size,
            value
          });
        });
        valueStarts.sort((a, b) => a.start - b.start);

        return new Promise((resolve, reject) => {
          let valueIndex = 0;
          let destBuffer = new Buffer(2 * 1024 * 1024);
          let offset = 0;
          let logOffset = 0;
          const log = _readLog(_this, activeTable);
          log.on('data', data => {
            if (valueIndex >= valueStarts.length) {
              return;
            }
            for (let bufferIndex = 0; bufferIndex < data.length;) {
              if (bufferIndex + logOffset >= valueStarts[valueIndex].end) {
                valueIndex++;
              }
              if (valueIndex >= valueStarts.length) {
                return;
              }
              const value = valueStarts[valueIndex].value;
              if (bufferIndex + logOffset >= value.start) {
                if (value.size > destBuffer.length) {
                  const newLength = Math.pow(2, Math.ceil(Math.log(value.size) / Math.log(2)));
                  destBuffer = new Buffer(newLength);
                }

                const readAmount = Math.min(value.start + value.size - logOffset - bufferIndex, activeTable.logSize - bufferIndex);
                data.slice(bufferIndex, bufferIndex + readAmount).copy(destBuffer.slice(offset, offset + readAmount));
                bufferIndex += readAmount;
                offset += readAmount;

                if (offset >= value.size) {
                  offset = 0;
                  if (_this.autoParse) {
                    // console.log(value.size, destBuffer.utf8Slice(0, value.size))
                    map.set(value.key, JSON.parse(destBuffer.utf8Slice(0, value.size)));
                  } else {
                    map.set(value.key, destBuffer.utf8Slice(0, value.size));
                  }
                }
              } else if (bufferIndex + logOffset < value.start) {
                bufferIndex += value.start - (bufferIndex + logOffset);
              }
            }
            logOffset += activeTable.logSize;
          });
          log.on('end', resolve);
          log.on('error', reject);
        }).then(() => objFrom(map));
      });
    }

    return _lock(_this, mustLock, promise => promise.then(() => _read()).catch(e => _closeLog(_this).then(() => {
      throw e;
    })));
  }

  write(ops, mustLock) {
    if (ops.length === 0) {
      return Promise.resolve();
    }

    const steps = 0;
    const _this = this;

    let activeTable;
    let contentBuffer;
    let contentLength;
    function _write() {
      return Promise.resolve().then(_retry(() => mkdirp(_this.path))).then(_retry(() => _readTable(_this))).then(_table => {
        activeTable = modTable(_table);
        const _ops = ops.slice();
        function step(op, next) {
          // steps++;
          // var op = _ops.shift();
          // if (!op) {
          //   return;
          // }

          let content = op.value;
          if (content !== null) {
            if (typeof content !== 'string') {
              content = JSON.stringify(content);
            }

            if (Buffer.byteLength && contentBuffer && Buffer.byteLength(content) <= contentBuffer.length) {
              contentLength = contentBuffer.utf8Write(content);
            } else {
              contentBuffer = new Buffer(content);
              contentLength = contentBuffer.length;
            }

            const blockCount = Math.ceil((activeTable.nextByte % activeTable.logSize + contentLength) / activeTable.logSize);
            let nextByte = activeTable.nextByte;
            activeTable = putKey(activeTable, op.key, contentLength);
            let bufferIndex = 0;

            const bulk = Array.from(new Array(blockCount)).map((_, i) => i);
            return serialFsTask(bulk, (_, next) => {
              const blockSlice = contentBuffer.slice(bufferIndex, Math.min(bufferIndex + (activeTable.logSize - nextByte % activeTable.logSize), contentLength));
              _appendBlock(_this, activeTable, blockSlice, nextByte, next);
              bufferIndex += blockSlice.length;
              nextByte += blockSlice.length;
            }).then(next);

            // function append() {
            //   if (bufferIndex < contentBuffer.length) {
            //     var blockSlice = contentBuffer.slice(bufferIndex, bufferIndex + activeTable.blockSize);
            //     bufferIndex += activeTable.blockSize;
            //     return _appendBlock(_this, activeTable, blockSlice, nextByte++)
            //     .then(append);
            //   }
            // }
            // return append()
            // .then(step);
          } else {
            activeTable = delKey(activeTable, op.key);
            next();
          }
        }

        return serialFsTask(_ops, step);

        // return step();
      }).then(() => _closeLog(_this)).then(_retry(() => {
        activeTable = table(activeTable);
        return _writeTable(_this, activeTable);
      }));
    }

    return _lock(_this, mustLock, promise => promise.then(() => _write()).catch(e => _closeLog(_this).then(() => {
      throw e;
    })).then(() => {
      if (_sizeUsed(_this, activeTable) > _compactSize(_this, activeTable)) {
        return _this.compact(false);
      }
    }));
  }

  compact(mustLock) {
    const _this = this;

    return _this.read(mustLock).then(map => {
      const ops = [];
      Object.keys(map).forEach(key => {
        ops.push({
          key,
          value: map[key]
        });
      });
      return ops;
    }).then(ops => rimraf(`${_this.path}~`).then(timeout100).then(() => ops)).then(ops => {
      const copy = new AppendSerializer({
        cacheDirPath: `${_this.path}~`,

        blockSize: _this.blockSize,
        logSize: _this.logSize,
        compactSizeThreshold: _this.compactSizeThreshold,
        compactMultiplierThreshold: _this.compactMultiplierThreshold
      });

      return _lock(_this, mustLock, promise => promise.then(() => copy.write(ops)).then(() => rimraf(_this.path)).then(timeout100).then(_retry(() => rename(copy.path, _this.path), 10)));
    });
  }
}

module.exports = AppendSerializer;
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImhhcmQtc291cmNlLXdlYnBhY2stcGx1Z2luL2xpYi9TZXJpYWxpemVyQXBwZW5kLmpzIl0sIm5hbWVzIjpbImZzIiwicmVxdWlyZSIsImpvaW4iLCJSZWFkYWJsZSIsIl9ta2RpcnAiLCJfcmltcmFmIiwid3JpdGVKc29uRmlsZSIsImVudHJpZXMiLCJ2YWx1ZXMiLCJwcm9taXNpZnkiLCJyaW1yYWYiLCJvcGVuIiwiY2xvc2UiLCJyZWFkIiwicmVhZEZpbGUiLCJ3cml0ZSIsInJlbmFtZSIsInVubGluayIsInN0YXQiLCJta2RpcnAiLCJBUFBFTkRfVkVSU0lPTiIsIl9ibG9ja1NpemUiLCJfbG9nU2l6ZSIsIl9taW5Db21wYWN0U2l6ZSIsIl9jb21wYWN0TXVsdGlwbGllclRocmVzaG9sZCIsInZhbHVlIiwia2V5Iiwic2l6ZSIsInN0YXJ0Iiwib2JqRnJvbSIsIm1hcCIsIk1hcCIsIm9iaiIsImZvckVhY2giLCJ0YWJsZSIsIm5leHRCeXRlIiwiYmxvY2tTaXplIiwibG9nU2l6ZSIsInZlcnNpb24iLCJtb2RUYWJsZSIsInB1dEtleSIsIl90YWJsZSIsInNldCIsImRlbEtleSIsImdldCIsImRlbGV0ZSIsIl90YWJsZXBhdGgiLCJwYXRoIiwiX2RlZmF1bHRUYWJsZSIsInRpbWVvdXQxMDAiLCJQcm9taXNlIiwicmVzb2x2ZSIsInNldFRpbWVvdXQiLCJfcmV0cnkiLCJmbiIsIm4iLCJfcmV0cnlGbiIsImNhdGNoIiwiX3JlYWRUYWJsZSIsIl90aGlzIiwiZSIsIkpTT04iLCJzdHJpbmdpZnkiLCJ0aGVuIiwicGFyc2UiLCJfd3JpdGVUYWJsZSIsIl9sb2dGaWxlcGF0aCIsImluZGV4IiwibG9nSWQiLCJ0b1N0cmluZyIsImxlbmd0aCIsIl9vcGVuTG9nIiwibW9kZSIsIl9mZCIsImZkIiwiX3dyaXRlQnVmZmVyIiwiQnVmZmVyIiwiX3dyaXRlT2Zmc2V0IiwiX2Nsb3NlTG9nIiwiX3JlYWRCdWZmZXJTaXplIiwiTWF0aCIsIm1pbiIsIl9yZWFkTG9nIiwib3V0IiwicmJTaXplIiwiX3JlYWRCdWZmZXIiLCJfbG9nIiwicHVzaCIsIm9mZnNldCIsInN0ZXAiLCJfYXBwZW5kQmxvY2siLCJibG9ja0NvbnRlbnQiLCJuZXh0IiwicHJlcCIsIndvcmsiLCJFcnJvciIsIndyaXRlU2xpY2UiLCJzbGljZSIsImNvcHkiLCJfc2l6ZU5lZWRlZCIsInJlZHVjZSIsImNhcnJ5IiwiX3NpemVVc2VkIiwiX2NvbXBhY3RTaXplIiwibWF4IiwiY29tcGFjdFNpemVUaHJlc2hvbGQiLCJjb21wYWN0TXVsdGlwbGllclRocmVzaG9sZCIsIl9sb2NrIiwibXVzdExvY2siLCJwcm9taXNlRm4iLCJsb2NrIiwic2VyaWFsRnNUYXNrIiwiYXJyYXkiLCJlYWNoIiwicmVqZWN0IiwicXVldWUiLCJpbk5leHQiLCJlcnIiLCJBcHBlbmRTZXJpYWxpemVyIiwiY29uc3RydWN0b3IiLCJvcHRpb25zIiwiY2FjaGVEaXJQYXRoIiwiYXV0b1BhcnNlIiwiRGF0ZSIsIm5vdyIsIl9yZWFkIiwiYWN0aXZlVGFibGUiLCJ2YWx1ZVN0YXJ0cyIsImVuZCIsInNvcnQiLCJhIiwiYiIsInZhbHVlSW5kZXgiLCJkZXN0QnVmZmVyIiwibG9nT2Zmc2V0IiwibG9nIiwib24iLCJkYXRhIiwiYnVmZmVySW5kZXgiLCJuZXdMZW5ndGgiLCJwb3ciLCJjZWlsIiwicmVhZEFtb3VudCIsInV0ZjhTbGljZSIsInByb21pc2UiLCJvcHMiLCJzdGVwcyIsImNvbnRlbnRCdWZmZXIiLCJjb250ZW50TGVuZ3RoIiwiX3dyaXRlIiwiX29wcyIsIm9wIiwiY29udGVudCIsImJ5dGVMZW5ndGgiLCJ1dGY4V3JpdGUiLCJibG9ja0NvdW50IiwiYnVsayIsIkFycmF5IiwiZnJvbSIsIl8iLCJpIiwiYmxvY2tTbGljZSIsImNvbXBhY3QiLCJPYmplY3QiLCJrZXlzIiwibW9kdWxlIiwiZXhwb3J0cyJdLCJtYXBwaW5ncyI6Ijs7OztBQUFBLE1BQU1BLEtBQUtDLFFBQVEsSUFBUixDQUFYO0FBQ0EsTUFBTUMsT0FB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bGliL1NlcmlhbGl6ZXJBcHBlbmQuanMiLCJzb3VyY2VzQ29udGVudCI6WyJjb25zdCBmcyA9IHJlcXVpcmUoJ2ZzJyk7XG5jb25zdCBqb2luID0gcmVxdWlyZSgncGF0aCcpLmpvaW47XG5jb25zdCBSZWFkYWJsZSA9IHJlcXVpcmUoJ3N0cmVhbScpLlJlYWRhYmxlO1xuXG5jb25zdCBfbWtkaXJwID0gcmVxdWlyZSgnbWtkaXJwJyk7XG5jb25zdCBfcmltcmFmID0gcmVxdWlyZSgncmltcmFmJyk7XG5jb25zdCB3cml0ZUpzb25GaWxlID0gcmVxdWlyZSgnd3JpdGUtanNvbi1maWxlJyk7XG5cbmNvbnN0IGVudHJpZXMgPSByZXF1aXJlKCcuL3V0aWwvT2JqZWN0LmVudHJpZXMnKTtcbmNvbnN0IHZhbHVlcyA9IHJlcXVpcmUoJy4vdXRpbC9PYmplY3QudmFsdWVzJyk7XG5jb25zdCBwcm9taXNpZnkgPSByZXF1aXJlKCcuL3V0aWwvcHJvbWlzaWZ5Jyk7XG5cbmNvbnN0IHJpbXJhZiA9IHByb21pc2lmeShfcmltcmFmKTtcbmNvbnN0IG9wZW4gPSBwcm9taXNpZnkoZnMub3Blbik7XG5jb25zdCBjbG9zZSA9IHByb21pc2lmeShmcy5jbG9zZSk7XG5jb25zdCByZWFkID0gcHJvbWlzaWZ5KGZzLnJlYWQpO1xuY29uc3QgcmVhZEZpbGUgPSBwcm9taXNpZnkoZnMucmVhZEZpbGUpO1xuY29uc3Qgd3JpdGUgPSBwcm9taXNpZnkoZnMud3JpdGUpO1xuY29uc3QgcmVuYW1lID0gcHJvbWlzaWZ5KGZzLnJlbmFtZSk7XG5jb25zdCB1bmxpbmsgPSBwcm9taXNpZnkoZnMudW5saW5rKTtcbmNvbnN0IHN0YXQgPSBwcm9taXNpZnkoZnMuc3RhdCk7XG5jb25zdCBta2RpcnAgPSBwcm9taXNpZnkoX21rZGlycCk7XG5cbmNvbnN0IEFQUEVORF9WRVJTSU9OID0gMTtcblxuY29uc3QgX2Jsb2NrU2l6ZSA9IDQgKiAxMDI0O1xuY29uc3QgX2xvZ1NpemUgPSAyICogMTAyNCAqIDEwMjQ7XG5jb25zdCBfbWluQ29tcGFjdFNpemUgPSA1MTIgKiAxMDI0O1xuY29uc3QgX2NvbXBhY3RNdWx0aXBsaWVyVGhyZXNob2xkID0gMS41O1xuXG5jb25zdCB2YWx1ZSA9IChrZXksIHNpemUsIHN0YXJ0KSA9PiAoe1xuICBrZXksXG4gIHNpemU6IHNpemUgfHwgMCxcbiAgc3RhcnQ6IHN0YXJ0IHx8IDAsXG59KTtcblxuY29uc3Qgb2JqRnJvbSA9IG1hcCA9PiB7XG4gIGlmIChtYXAgaW5zdGFuY2VvZiBNYXApIHtcbiAgICBjb25zdCBvYmogPSB7fTtcbiAgICBtYXAuZm9yRWFjaCgodmFsdWUsIGtleSkgPT4ge1xuICAgICAgb2JqW2tleV0gPSB2YWx1ZTtcbiAgICB9KTtcbiAgICByZXR1cm4gb2JqO1xuICB9XG4gIHJldHVybiBtYXA7XG59O1xuXG5jb25zdCB0YWJsZSA9ICh7IG5leHRCeXRlLCBibG9ja1NpemUsIGxvZ1NpemUsIG1hcCB9KSA9PiAoe1xuICB2ZXJzaW9uOiBBUFBFTkRfVkVSU0lPTixcbiAgbmV4dEJ5dGU6IG5leHRCeXRlLFxuICBibG9ja1NpemU6IGJsb2NrU2l6ZSxcbiAgbG9nU2l6ZTogbG9nU2l6ZSxcbiAgbWFwOiBvYmpGcm9tKG1hcCksXG59KTtcblxuY29uc3QgbW9kVGFibGUgPSAoeyBuZXh0Qnl0ZSwgYmxvY2tTaXplLCBsb2dTaXplLCBtYXAgfSkgPT4gKHtcbiAgdmVyc2lvbjogQVBQRU5EX1ZFUlNJT04sXG4gIG5leHRCeXRlOiBuZXh0Qnl0ZSxcbiAgYmxvY2tTaXplOiBibG9ja1NpemUsXG4gIGxvZ1NpemU6IGxvZ1NpemUsXG4gIG1hcDogbmV3IE1hcChlbnRyaWVzKG1hcCkpLFxufSk7XG5cbmZ1bmN0aW9uIHB1dEtleShfdGFibGUsIGtleSwgc2l6ZSkge1xuICAvLyBfdGFibGUubWFwW2tleV0gPSB2YWx1ZShrZXksIHNpemUsIF90YWJsZS5uZXh0Qnl0ZSwgTWF0aC5jZWlsKHNpemUgLyBfdGFibGUuYmxvY2tTaXplKSk7XG4gIF90YWJsZS5tYXAuc2V0KGtleSwgdmFsdWUoa2V5LCBzaXplLCBfdGFibGUubmV4dEJ5dGUpKTtcbiAgX3RhYmxlLm5leHRCeXRlID0gX3RhYmxlLm5leHRCeXRlICsgc2l6ZTtcbiAgcmV0dXJuIF90YWJsZTtcbn1cblxuZnVuY3Rpb24gZGVsS2V5KF90YWJsZSwga2V5KSB7XG4gIC8vIGlmIChfdGFibGUubWFwW2tleV0pIHtcbiAgLy8gICBkZWxldGUgX3RhYmxlLm1hcFtrZXldO1xuICBpZiAoX3RhYmxlLm1hcC5nZXQoa2V5KSkge1xuICAgIF90YWJsZS5tYXAuZGVsZXRlKGtleSk7XG4gIH1cbiAgcmV0dXJuIF90YWJsZTtcbn1cblxuY29uc3QgX3RhYmxlcGF0aCA9ICh7IHBhdGggfSkgPT4gam9pbihwYXRoLCAndGFibGUuanNvbicpO1xuXG5jb25zdCBfZGVmYXVsdFRhYmxlID0gKHsgYmxvY2tTaXplLCBsb2dTaXplIH0pID0+XG4gIHRhYmxlKHtcbiAgICBuZXh0Qnl0ZTogMCxcbiAgICBibG9ja1NpemU6IGJsb2NrU2l6ZSB8fCBfYmxvY2tTaXplLFxuICAgIGxvZ1NpemU6IGxvZ1NpemUgfHwgX2xvZ1NpemUsXG4gICAgbWFwOiB7fSxcbiAgfSk7XG5cbmNvbnN0IHRpbWVvdXQxMDAgPSAoKSA9PiBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHNldFRpbWVvdXQocmVzb2x2ZSwgMTAwKSk7XG5cbmNvbnN0IF9yZXRyeSA9IChmbiwgbikgPT4ge1xuICBuID0gbiB8fCA1O1xuICBjb25zdCBfcmV0cnlGbiA9IHZhbHVlID0+IHtcbiAgICBpZiAobikge1xuICAgICAgbi0tO1xuICAgICAgcmV0dXJuIGZuKHZhbHVlKS5jYXRjaChfcmV0cnlGbik7XG4gICAgfVxuICAgIHJldHVybiBmbih2YWx1ZSk7XG4gIH07XG4gIHJldHVybiBfcmV0cnlGbjtcbn07XG5cbmNvbnN0IF9yZWFkVGFibGUgPSBfdGhpcyA9PlxuICByZWFkRmlsZShfdGFibGVwYXRoKF90aGlzKSwgJ3V0ZjgnKVxuICAgIC5jYXRjaChlID0+IEpTT04uc3RyaW5naWZ5KF9kZWZhdWx0VGFibGUoX3RoaXMpKSlcbiAgICAudGhlbihKU09OLnBhcnNlKVxuICAgIC50aGVuKF90YWJsZSA9PiB7XG4gICAgICBpZiAoX3RhYmxlLnZlcnNpb24gIT09IEFQUEVORF9WRVJTSU9OKSB7XG4gICAgICAgIHJldHVybiBfZGVmYXVsdFRhYmxlKF90aGlzKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBfdGFibGU7XG4gICAgfSk7XG5cbmNvbnN0IF93cml0ZVRhYmxlID0gKF90aGlzLCBfdGFibGUpID0+IHdyaXRlSnNvbkZpbGUoX3RhYmxlcGF0aChfdGhpcyksIF90YWJsZSk7XG5cbmNvbnN0IF9sb2dGaWxlcGF0aCA9ICh7IHBhdGggfSwgeyBsb2dTaXplIH0sIGluZGV4KSA9PiB7XG4gIGxldCBsb2dJZCA9ICgoaW5kZXggLyBsb2dTaXplKSB8IDApLnRvU3RyaW5nKCk7XG4gIHdoaWxlIChsb2dJZC5sZW5ndGggPCA0KSB7XG4gICAgbG9nSWQgPSBgMCR7bG9nSWR9YDtcbiAgfVxuICByZXR1cm4gam9pbihwYXRoLCBgbG9nJHtsb2dJZH1gKTtcbn07XG5cbmNvbnN0IF9vcGVuTG9nID0gKF90aGlzLCBtb2RlLCBfdGFibGUsIGluZGV4KSA9PiB7XG4gIGlmIChfdGhpcy5fZmQgIT09IG51bGwpIHtcbiAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCk7XG4gIH0gZWxzZSB7XG4gICAgLy8gSWYgbW9kZSBpcyAnYScsIHN0YXQgdGhlIGxvZyB0byB3cml0ZSB0bywgaWYgaXQgc2hvdWxkIGJlIGVtcHR5IGFuZFxuICAgIC8vIGlzbid0LCB1bmxpbmsgYmVmb3JlIG9wZW5pbmcuXG4gICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpXG4gICAgICAudGhlbigoKSA9PiB7XG4gICAgICAgIGlmIChtb2RlID09PSAnYScgJiYgaW5kZXggJSBfdGFibGUubG9nU2l6ZSA9PT0gMCkge1xuICAgICAgICAgIHJldHVybiBzdGF0KF9sb2dGaWxlcGF0aChfdGhpcywgX3RhYmxlLCBpbmRleCkpXG4gICAgICAgICAgICAudGhlbigoeyBzaXplIH0pID0+IHtcbiAgICAgICAgICAgICAgaWYgKHNpemUgPiAwKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHVubGluayhfbG9nRmlsZXBhdGgoX3RoaXMsIF90YWJsZSwgaW5kZXgpKS50aGVuKFxuICAgICAgICAgICAgICAgICAgdGltZW91dDEwMCxcbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgLmNhdGNoKCgpID0+IHt9KTtcbiAgICAgICAgfVxuICAgICAgfSlcbiAgICAgIC50aGVuKCgpID0+IG9wZW4oX2xvZ0ZpbGVwYXRoKF90aGlzLCBfdGFibGUsIGluZGV4KSwgbW9kZSkpXG4gICAgICAudGhlbihmZCA9PiB7XG4gICAgICAgIF90aGlzLl9mZCA9IGZkO1xuICAgICAgICBpZiAobW9kZSA9PT0gJ2EnKSB7XG4gICAgICAgICAgX3RoaXMuX3dyaXRlQnVmZmVyID0gbmV3IEJ1ZmZlcihfdGFibGUubG9nU2l6ZSk7XG4gICAgICAgICAgX3RoaXMuX3dyaXRlT2Zmc2V0ID0gMDtcbiAgICAgICAgfVxuICAgICAgfSlcbiAgICAgIC5jYXRjaChlID0+IHtcbiAgICAgICAgdGhyb3cgZTtcbiAgICAgIH0pO1xuICB9XG59O1xuXG5jb25zdCBfY2xvc2VMb2cgPSBfdGhpcyA9PiB7XG4gIGlmIChfdGhpcy5fZmQgPT09IG51bGwpIHtcbiAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCk7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpXG4gICAgICAudGhlbigoKSA9PiB7XG4gICAgICAgIGlmIChfdGhpcy5fd3JpdGVCdWZmZXIpIHtcbiAgICAgICAgICByZXR1cm4gd3JpdGUoX3RoaXMuX2ZkLCBfdGhpcy5fd3JpdGVCdWZmZXIsIDAsIF90aGlzLl93cml0ZU9mZnNldCk7XG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgICAudGhlbigoKSA9PiBjbG9zZShfdGhpcy5fZmQpKVxuICAgICAgLnRoZW4oKCkgPT4ge1xuICAgICAgICBfdGhpcy5fZmQgPSBudWxsO1xuICAgICAgICBfdGhpcy5fd3JpdGVCdWZmZXIgPSBudWxsO1xuICAgICAgICBfdGhpcy5fd3JpdGVPZmZzZXQgPSAwO1xuICAgICAgfSk7XG4gIH1cbn07XG5cbmNvbnN0IF9yZWFkQnVmZmVyU2l6ZSA9IChfdGhpcywgeyBibG9ja1NpemUsIGxvZ1NpemUgfSkgPT5cbiAgTWF0aC5taW4oMzIgKiBibG9ja1NpemUsIGxvZ1NpemUpO1xuXG5jb25zdCBfcmVhZExvZyA9IChfdGhpcywgX3RhYmxlKSA9PiB7XG4gIGxldCBpbmRleCA9IDA7XG4gIGNvbnN0IG91dCA9IG5ldyBSZWFkYWJsZSh7XG4gICAgcmVhZCgpIHt9LFxuICB9KTtcblxuICBjb25zdCByYlNpemUgPSBfdGFibGUubG9nU2l6ZTtcbiAgY29uc3QgX3JlYWRCdWZmZXIgPSBuZXcgQnVmZmVyKHJiU2l6ZSk7XG5cbiAgZnVuY3Rpb24gX2xvZygpIHtcbiAgICBpZiAoaW5kZXggPj0gX3RhYmxlLm5leHRCeXRlKSB7XG4gICAgICBvdXQucHVzaChudWxsKTtcbiAgICAgIHJldHVybiBfY2xvc2VMb2coX3RoaXMpO1xuICAgIH1cblxuICAgIGNvbnN0IG9mZnNldCA9IDA7XG4gICAgZnVuY3Rpb24gc3RlcCgpIHtcbiAgICAgIGlmICghX3RoaXMuX2ZkKSB7XG4gICAgICAgIGluZGV4ID0gX3RhYmxlLm5leHRCeXRlO1xuICAgICAgICByZXR1cm4gX2xvZygpO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gcmVhZChfdGhpcy5fZmQsIF9yZWFkQnVmZmVyLCAwLCByYlNpemUsIDApLnRoZW4ocmVhZCA9PiB7XG4gICAgICAgIGluZGV4ICs9IF90YWJsZS5sb2dTaXplO1xuICAgICAgICBvdXQucHVzaChfcmVhZEJ1ZmZlcik7XG4gICAgICAgIHJldHVybiBfbG9nKCk7XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICByZXR1cm4gX2Nsb3NlTG9nKF90aGlzKVxuICAgICAgLnRoZW4oKCkgPT4gX29wZW5Mb2coX3RoaXMsICdyJywgX3RhYmxlLCBpbmRleCkpXG4gICAgICAudGhlbihzdGVwKTtcbiAgfVxuICBQcm9taXNlLnJlc29sdmUoKS50aGVuKF9sb2cpO1xuXG4gIHJldHVybiBvdXQ7XG59O1xuXG5jb25zdCBfYXBwZW5kQmxvY2sgPSAoX3RoaXMsIF90YWJsZSwgYmxvY2tDb250ZW50LCBpbmRleCwgbmV4dCkgPT4ge1xuICBsZXQgcHJlcDtcbiAgaWYgKF90aGlzLl9mZCAhPT0gbnVsbCAmJiBpbmRleCAlIF90YWJsZS5sb2dTaXplID09PSAwKSB7XG4gICAgcHJlcCA9IF9jbG9zZUxvZyhfdGhpcykudGhlbigoKSA9PiBfb3BlbkxvZyhfdGhpcywgJ2EnLCBfdGFibGUsIGluZGV4KSk7XG4gIH0gZWxzZSBpZiAoX3RoaXMuX2ZkID09PSBudWxsKSB7XG4gICAgcHJlcCA9IF9vcGVuTG9nKF90aGlzLCAnYScsIF90YWJsZSwgaW5kZXgpO1xuICB9XG4gIGZ1bmN0aW9uIHdvcmsoKSB7XG4gICAgaWYgKCFfdGhpcy5fZmQpIHtcbiAgICAgIHJldHVybiBuZXh0KG5ldyBFcnJvcigpKTtcbiAgICB9XG4gICAgaWYgKGJsb2NrQ29udGVudC5sZW5ndGggPiBfdGFibGUubG9nU2l6ZSkge1xuICAgICAgcmV0dXJuIG5leHQobmV3IEVycm9yKCdibG9jayBsb25nZXIgdGhhbiBtYXggc2l6ZScpKTtcbiAgICB9XG4gICAgY29uc3Qgd3JpdGVTbGljZSA9IF90aGlzLl93cml0ZUJ1ZmZlci5zbGljZShcbiAgICAgIF90aGlzLl93cml0ZU9mZnNldCxcbiAgICAgIF90aGlzLl93cml0ZU9mZnNldCArIGJsb2NrQ29udGVudC5sZW5ndGgsXG4gICAgKTtcbiAgICAvLyBpZiAoYmxvY2tDb250ZW50Lmxlbmd0aCA8IF90YWJsZS5ibG9ja1NpemUpIHtcbiAgICAvLyAgIHdyaXRlU2xpY2UuZmlsbCgwKTtcbiAgICAvLyB9XG4gICAgYmxvY2tDb250ZW50LmNvcHkod3JpdGVTbGljZSk7XG4gICAgX3RoaXMuX3dyaXRlT2Zmc2V0ICs9IGJsb2NrQ29udGVudC5sZW5ndGg7XG4gICAgaWYgKF90aGlzLl93cml0ZU9mZnNldCA+IF90aGlzLl93cml0ZUJ1ZmZlci5sZW5ndGgpIHtcbiAgICAgIHJldHVybiBuZXh0KFxuICAgICAgICBuZXcgRXJyb3IoXG4gICAgICAgICAgYHdyaXRlT2Zmc2V0ICR7X3RoaXMuX3dyaXRlT2Zmc2V0fSBwYXN0IHdyaXRlQnVmZmVyIGxlbmd0aCAke1xuICAgICAgICAgICAgX3RoaXMuX3dyaXRlQnVmZmVyLmxlbmd0aFxuICAgICAgICAgIH1gLFxuICAgICAgICApLFxuICAgICAgKTtcbiAgICB9XG4gICAgaWYgKF90aGlzLl93cml0ZU9mZnNldCA+IF90YWJsZS5sb2dTaXplKSB7XG4gICAgICByZXR1cm4gbmV4dChcbiAgICAgICAgbmV3IEVycm9yKFxuICAgICAgICAgIGB3cml0ZU9mZnNldCAke190aGlzLl93cml0ZU9mZnNldH0gcGFzdCBsb2dTaXplICR7X3RhYmxlLmxvZ1NpemV9YCxcbiAgICAgICAgKSxcbiAgICAgICk7XG4gICAgfVxuICAgIG5leHQoKTtcbiAgICAvLyByZXR1cm4gZnMud3JpdGUoX3RoaXMuX2ZkLCBibG9ja0NvbnRlbnQsIDAsIF90YWJsZS5ibG9ja1NpemUsIG5leHQpO1xuICB9XG4gIGlmIChwcmVwKSB7XG4gICAgcHJlcC50aGVuKHdvcmspO1xuICB9IGVsc2Uge1xuICAgIHdvcmsoKTtcbiAgfVxuXG4gIC8vIHJldHVybiBQcm9taXNlLnJlc29sdmUoKVxuICAvLyAudGhlbihmdW5jdGlvbigpIHtcbiAgLy8gICBpZiAoaW5kZXggJSAoX3RhYmxlLmxvZ1NpemUgLyBfdGFibGUuYmxvY2tTaXplKSA9PT0gMCkge1xuICAvLyAgICAgcmV0dXJuIF9jbG9zZUxvZyhfdGhpcyk7XG4gIC8vICAgfVxuICAvLyB9KVxuICAvLyAudGhlbihmdW5jdGlvbigpIHtcbiAgLy8gICByZXR1cm4gX29wZW5Mb2coX3RoaXMsICdhJywgX3RhYmxlLCBpbmRleCk7XG4gIC8vIH0pXG4gIC8vIC50aGVuKGZ1bmN0aW9uKCkge1xuICAvLyAgIGlmICghX3RoaXMuX2ZkKSB7XG4gIC8vICAgICB0aHJvdyBuZXcgRXJyb3IoKTtcbiAgLy8gICB9XG4gIC8vICAgaWYgKGJsb2NrQ29udGVudC5sZW5ndGggPiBfdGFibGUuYmxvY2tTaXplKSB7XG4gIC8vICAgICB0aHJvdyBuZXcgRXJyb3IoJ2Jsb2NrIGxvbmdlciB0aGFuIG1heCBzaXplJyk7XG4gIC8vICAgfVxuICAvLyAgIGlmIChibG9ja0NvbnRlbnQubGVuZ3RoIDwgX3RhYmxlLmJsb2NrU2l6ZSkge1xuICAvLyAgICAgdmFyIF9ibG9ja0NvbnRlbnQgPSBuZXcgQnVmZmVyKF90YWJsZS5ibG9ja1NpemUpO1xuICAvLyAgICAgYmxvY2tDb250ZW50LmNvcHkoX2Jsb2NrQ29udGVudCk7XG4gIC8vICAgICBibG9ja0NvbnRlbnQgPSBfYmxvY2tDb250ZW50O1xuICAvLyAgIH1cbiAgLy8gICByZXR1cm4gd3JpdGUoX3RoaXMuX2ZkLCBibG9ja0NvbnRlbnQsIDAsIF90YWJsZS5ibG9ja1NpemUpO1xuICAvLyB9KTtcbn07XG5cbmNvbnN0IF9zaXplTmVlZGVkID0gKF90aGlzLCB7IG1hcCB9KSA9PlxuICB2YWx1ZXMobWFwKS5yZWR1Y2UoKGNhcnJ5LCB7IHNpemUgfSkgPT4gY2FycnkgKyBzaXplLCAwKTtcblxuY29uc3QgX3NpemVVc2VkID0gKF90aGlzLCB7IG5leHRCeXRlIH0pID0+IG5leHRCeXRlO1xuXG5jb25zdCBfY29tcGFjdFNpemUgPSAoX3RoaXMsIF90YWJsZSkgPT5cbiAgTWF0aC5tYXgoXG4gICAgX3RoaXMuY29tcGFjdFNpemVUaHJlc2hvbGQsXG4gICAgX3NpemVOZWVkZWQoX3RoaXMsIF90YWJsZSkgKiBfdGhpcy5jb21wYWN0TXVsdGlwbGllclRocmVzaG9sZCxcbiAgKTtcblxuY29uc3QgX2xvY2sgPSAoX3RoaXMsIG11c3RMb2NrLCBwcm9taXNlRm4pID0+IHtcbiAgaWYgKG11c3RMb2NrICE9PSBmYWxzZSkge1xuICAgIHJldHVybiAoX3RoaXMubG9jayA9IHByb21pc2VGbihfdGhpcy5sb2NrKSk7XG4gIH1cbiAgcmV0dXJuIHByb21pc2VGbihQcm9taXNlLnJlc29sdmUoKSk7XG59O1xuXG5jb25zdCBzZXJpYWxGc1Rhc2sgPSAoYXJyYXksIGVhY2gpID0+XG4gIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICBsZXQgcXVldWUgPSAwO1xuICAgIGxldCBpbmRleCA9IDA7XG4gICAgbGV0IGluTmV4dCA9IGZhbHNlO1xuICAgIGZ1bmN0aW9uIG5leHQoZXJyKSB7XG4gICAgICBpZiAoZXJyKSB7XG4gICAgICAgIHJldHVybiByZWplY3QoZXJyKTtcbiAgICAgIH1cbiAgICAgIGlmIChpbmRleCA9PT0gYXJyYXkubGVuZ3RoKSB7XG4gICAgICAgIHJldHVybiByZXNvbHZlKCk7XG4gICAgICB9XG4gICAgICBxdWV1ZSsrO1xuICAgICAgaWYgKGluTmV4dCkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBpbk5leHQgPSB0cnVlO1xuICAgICAgd2hpbGUgKHF1ZXVlID4gaW5kZXggJiYgaW5kZXggPCBhcnJheS5sZW5ndGgpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBlYWNoKGFycmF5W2luZGV4KytdLCBuZXh0KTtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgIHJldHVybiBuZXh0KGUpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBpbk5leHQgPSBmYWxzZTtcbiAgICB9XG4gICAgbmV4dCgpO1xuICB9KTtcblxuY2xhc3MgQXBwZW5kU2VyaWFsaXplciB7XG4gIGNvbnN0cnVjdG9yKG9wdGlvbnMpIHtcbiAgICB0aGlzLnBhdGggPSBvcHRpb25zLmNhY2hlRGlyUGF0aDtcbiAgICB0aGlzLmF1dG9QYXJzZSA9IG9wdGlvbnMuYXV0b1BhcnNlO1xuICAgIHRoaXMuYmxvY2tTaXplID0gb3B0aW9ucy5ibG9ja1NpemUgfHwgX2Jsb2NrU2l6ZTtcbiAgICB0aGlzLmxvZ1NpemUgPSBvcHRpb25zLmxvZ1NpemUgfHwgX2xvZ1NpemU7XG4gICAgdGhpcy5jb21wYWN0U2l6ZVRocmVzaG9sZCA9IG9wdGlvbnMuY29tcGFjdFNpemVUaHJlc2hvbGQgfHwgX21pbkNvbXBhY3RTaXplO1xuICAgIHRoaXMuY29tcGFjdE11bHRpcGxpZXJUaHJlc2hvbGQgPVxuICAgICAgb3B0aW9ucy5jb21wYWN0TXVsdGlwbGllclRocmVzaG9sZCB8fCBfY29tcGFjdE11bHRpcGxpZXJUaHJlc2hvbGQ7XG5cbiAgICB0aGlzLmxvY2sgPSBQcm9taXNlLnJlc29sdmUoKTtcbiAgICB0aGlzLl9mZCA9IG51bGw7XG4gIH1cblxuICByZWFkKG11c3RMb2NrKSB7XG4gICAgY29uc3Qgc3RhcnQgPSBEYXRlLm5vdygpO1xuICAgIGNvbnN0IF90aGlzID0gdGhpcztcblxuICAgIGZ1bmN0aW9uIF9yZWFkKCkge1xuICAgICAgbGV0IGFjdGl2ZVRhYmxlO1xuICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpXG4gICAgICAgIC50aGVuKF9yZXRyeSgoKSA9PiBfcmVhZFRhYmxlKF90aGlzKSkpXG4gICAgICAgIC50aGVuKF90YWJsZSA9PiB7XG4gICAgICAgICAgYWN0aXZlVGFibGUgPSBfdGFibGU7XG4gICAgICAgIH0pXG4gICAgICAgIC50aGVuKCgpID0+IHtcbiAgICAgICAgICBjb25zdCBtYXAgPSBuZXcgTWFwKCk7XG5cbiAgICAgICAgICBjb25zdCB2YWx1ZVN0YXJ0cyA9IFtdO1xuICAgICAgICAgIHZhbHVlcyhhY3RpdmVUYWJsZS5tYXApLmZvckVhY2godmFsdWUgPT4ge1xuICAgICAgICAgICAgdmFsdWVTdGFydHMucHVzaCh7XG4gICAgICAgICAgICAgIHN0YXJ0OiB2YWx1ZS5zdGFydCxcbiAgICAgICAgICAgICAgZW5kOiB2YWx1ZS5zdGFydCArIHZhbHVlLnNpemUsXG4gICAgICAgICAgICAgIHZhbHVlLFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfSk7XG4gICAgICAgICAgdmFsdWVTdGFydHMuc29ydCgoYSwgYikgPT4gYS5zdGFydCAtIGIuc3RhcnQpO1xuXG4gICAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgICAgIGxldCB2YWx1ZUluZGV4ID0gMDtcbiAgICAgICAgICAgIGxldCBkZXN0QnVmZmVyID0gbmV3IEJ1ZmZlcigyICogMTAyNCAqIDEwMjQpO1xuICAgICAgICAgICAgbGV0IG9mZnNldCA9IDA7XG4gICAgICAgICAgICBsZXQgbG9nT2Zmc2V0ID0gMDtcbiAgICAgICAgICAgIGNvbnN0IGxvZyA9IF9yZWFkTG9nKF90aGlzLCBhY3RpdmVUYWJsZSk7XG4gICAgICAgICAgICBsb2cub24oJ2RhdGEnLCBkYXRhID0+IHtcbiAgICAgICAgICAgICAgaWYgKHZhbHVlSW5kZXggPj0gdmFsdWVTdGFydHMubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGZvciAobGV0IGJ1ZmZlckluZGV4ID0gMDsgYnVmZmVySW5kZXggPCBkYXRhLmxlbmd0aDsgKSB7XG4gICAgICAgICAgICAgICAgaWYgKGJ1ZmZlckluZGV4ICsgbG9nT2Zmc2V0ID49IHZhbHVlU3RhcnRzW3ZhbHVlSW5kZXhdLmVuZCkge1xuICAgICAgICAgICAgICAgICAgdmFsdWVJbmRleCsrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAodmFsdWVJbmRleCA+PSB2YWx1ZVN0YXJ0cy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY29uc3QgdmFsdWUgPSB2YWx1ZVN0YXJ0c1t2YWx1ZUluZGV4XS52YWx1ZTtcbiAgICAgICAgICAgICAgICBpZiAoYnVmZmVySW5kZXggKyBsb2dPZmZzZXQgPj0gdmFsdWUuc3RhcnQpIHtcbiAgICAgICAgICAgICAgICAgIGlmICh2YWx1ZS5zaXplID4gZGVzdEJ1ZmZlci5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbmV3TGVuZ3RoID0gTWF0aC5wb3coXG4gICAgICAgICAgICAgICAgICAgICAgMixcbiAgICAgICAgICAgICAgICAgICAgICBNYXRoLmNlaWwoTWF0aC5sb2codmFsdWUuc2l6ZSkgLyBNYXRoLmxvZygyKSksXG4gICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgICAgIGRlc3RCdWZmZXIgPSBuZXcgQnVmZmVyKG5ld0xlbmd0aCk7XG4gICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgIGNvbnN0IHJlYWRBbW91bnQgPSBNYXRoLm1pbihcbiAgICAgICAgICAgICAgICAgICAgdmFsdWUuc3RhcnQgKyB2YWx1ZS5zaXplIC0gbG9nT2Zmc2V0IC0gYnVmZmVySW5kZXgsXG4gICAgICAgICAgICAgICAgICAgIGFjdGl2ZVRhYmxlLmxvZ1NpemUgLSBidWZmZXJJbmRleCxcbiAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgICBkYXRhXG4gICAgICAgICAgICAgICAgICAgIC5zbGljZShidWZmZXJJbmRleCwgYnVmZmVySW5kZXggKyByZWFkQW1vdW50KVxuICAgICAgICAgICAgICAgICAgICAuY29weShkZXN0QnVmZmVyLnNsaWNlKG9mZnNldCwgb2Zmc2V0ICsgcmVhZEFtb3VudCkpO1xuICAgICAgICAgICAgICAgICAgYnVmZmVySW5kZXggKz0gcmVhZEFtb3VudDtcbiAgICAgICAgICAgICAgICAgIG9mZnNldCArPSByZWFkQW1vdW50O1xuXG4gICAgICAgICAgICAgICAgICBpZiAob2Zmc2V0ID49IHZhbHVlLnNpemUpIHtcbiAgICAgICAgICAgICAgICAgICAgb2Zmc2V0ID0gMDtcbiAgICAgICAgICAgICAgICAgICAgaWYgKF90aGlzLmF1dG9QYXJzZSkge1xuICAgICAgICAgICAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKHZhbHVlLnNpemUsIGRlc3RCdWZmZXIudXRmOFNsaWNlKDAsIHZhbHVlLnNpemUpKVxuICAgICAgICAgICAgICAgICAgICAgIG1hcC5zZXQoXG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZS5rZXksXG4gICAgICAgICAgICAgICAgICAgICAgICBKU09OLnBhcnNlKGRlc3RCdWZmZXIudXRmOFNsaWNlKDAsIHZhbHVlLnNpemUpKSxcbiAgICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgIG1hcC5zZXQodmFsdWUua2V5LCBkZXN0QnVmZmVyLnV0ZjhTbGljZSgwLCB2YWx1ZS5zaXplKSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGJ1ZmZlckluZGV4ICsgbG9nT2Zmc2V0IDwgdmFsdWUuc3RhcnQpIHtcbiAgICAgICAgICAgICAgICAgIGJ1ZmZlckluZGV4ICs9IHZhbHVlLnN0YXJ0IC0gKGJ1ZmZlckluZGV4ICsgbG9nT2Zmc2V0KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgbG9nT2Zmc2V0ICs9IGFjdGl2ZVRhYmxlLmxvZ1NpemU7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGxvZy5vbignZW5kJywgcmVzb2x2ZSk7XG4gICAgICAgICAgICBsb2cub24oJ2Vycm9yJywgcmVqZWN0KTtcbiAgICAgICAgICB9KS50aGVuKCgpID0+IG9iakZyb20obWFwKSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHJldHVybiBfbG9jayhfdGhpcywgbXVzdExvY2ssIHByb21pc2UgPT5cbiAgICAgIHByb21pc2UudGhlbigoKSA9PiBfcmVhZCgpKS5jYXRjaChlID0+XG4gICAgICAgIF9jbG9zZUxvZyhfdGhpcykudGhlbigoKSA9PiB7XG4gICAgICAgICAgdGhyb3cgZTtcbiAgICAgICAgfSksXG4gICAgICApLFxuICAgICk7XG4gIH1cblxuICB3cml0ZShvcHMsIG11c3RMb2NrKSB7XG4gICAgaWYgKG9wcy5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoKTtcbiAgICB9XG5cbiAgICBjb25zdCBzdGVwcyA9IDA7XG4gICAgY29uc3QgX3RoaXMgPSB0aGlzO1xuXG4gICAgbGV0IGFjdGl2ZVRhYmxlO1xuICAgIGxldCBjb250ZW50QnVmZmVyO1xuICAgIGxldCBjb250ZW50TGVuZ3RoO1xuICAgIGZ1bmN0aW9uIF93cml0ZSgpIHtcbiAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoKVxuICAgICAgICAudGhlbihfcmV0cnkoKCkgPT4gbWtkaXJwKF90aGlzLnBhdGgpKSlcbiAgICAgICAgLnRoZW4oX3JldHJ5KCgpID0+IF9yZWFkVGFibGUoX3RoaXMpKSlcbiAgICAgICAgLnRoZW4oX3RhYmxlID0+IHtcbiAgICAgICAgICBhY3RpdmVUYWJsZSA9IG1vZFRhYmxlKF90YWJsZSk7XG4gICAgICAgICAgY29uc3QgX29wcyA9IG9wcy5zbGljZSgpO1xuICAgICAgICAgIGZ1bmN0aW9uIHN0ZXAob3AsIG5leHQpIHtcbiAgICAgICAgICAgIC8vIHN0ZXBzKys7XG4gICAgICAgICAgICAvLyB2YXIgb3AgPSBfb3BzLnNoaWZ0KCk7XG4gICAgICAgICAgICAvLyBpZiAoIW9wKSB7XG4gICAgICAgICAgICAvLyAgIHJldHVybjtcbiAgICAgICAgICAgIC8vIH1cblxuICAgICAgICAgICAgbGV0IGNvbnRlbnQgPSBvcC52YWx1ZTtcbiAgICAgICAgICAgIGlmIChjb250ZW50ICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgIGlmICh0eXBlb2YgY29udGVudCAhPT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgICAgICBjb250ZW50ID0gSlNPTi5zdHJpbmdpZnkoY29udGVudCk7XG4gICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICBpZiAoXG4gICAgICAgICAgICAgICAgQnVmZmVyLmJ5dGVMZW5ndGggJiZcbiAgICAgICAgICAgICAgICBjb250ZW50QnVmZmVyICYmXG4gICAgICAgICAgICAgICAgQnVmZmVyLmJ5dGVMZW5ndGgoY29udGVudCkgPD0gY29udGVudEJ1ZmZlci5sZW5ndGhcbiAgICAgICAgICAgICAgKSB7XG4gICAgICAgICAgICAgICAgY29udGVudExlbmd0aCA9IGNvbnRlbnRCdWZmZXIudXRmOFdyaXRlKGNvbnRlbnQpO1xuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNvbnRlbnRCdWZmZXIgPSBuZXcgQnVmZmVyKGNvbnRlbnQpO1xuICAgICAgICAgICAgICAgIGNvbnRlbnRMZW5ndGggPSBjb250ZW50QnVmZmVyLmxlbmd0aDtcbiAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgIGNvbnN0IGJsb2NrQ291bnQgPSBNYXRoLmNlaWwoXG4gICAgICAgICAgICAgICAgKChhY3RpdmVUYWJsZS5uZXh0Qnl0ZSAlIGFjdGl2ZVRhYmxlLmxvZ1NpemUpICsgY29udGVudExlbmd0aCkgL1xuICAgICAgICAgICAgICAgICAgYWN0aXZlVGFibGUubG9nU2l6ZSxcbiAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgbGV0IG5leHRCeXRlID0gYWN0aXZlVGFibGUubmV4dEJ5dGU7XG4gICAgICAgICAgICAgIGFjdGl2ZVRhYmxlID0gcHV0S2V5KGFjdGl2ZVRhYmxlLCBvcC5rZXksIGNvbnRlbnRMZW5ndGgpO1xuICAgICAgICAgICAgICBsZXQgYnVmZmVySW5kZXggPSAwO1xuXG4gICAgICAgICAgICAgIGNvbnN0IGJ1bGsgPSBBcnJheS5mcm9tKG5ldyBBcnJheShibG9ja0NvdW50KSkubWFwKChfLCBpKSA9PiBpKTtcbiAgICAgICAgICAgICAgcmV0dXJuIHNlcmlhbEZzVGFzayhidWxrLCAoXywgbmV4dCkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IGJsb2NrU2xpY2UgPSBjb250ZW50QnVmZmVyLnNsaWNlKFxuICAgICAgICAgICAgICAgICAgYnVmZmVySW5kZXgsXG4gICAgICAgICAgICAgICAgICBNYXRoLm1pbihcbiAgICAgICAgICAgICAgICAgICAgYnVmZmVySW5kZXggK1xuICAgICAgICAgICAgICAgICAgICAgIChhY3RpdmVUYWJsZS5sb2dTaXplIC0gKG5leHRCeXRlICUgYWN0aXZlVGFibGUubG9nU2l6ZSkpLFxuICAgICAgICAgICAgICAgICAgICBjb250ZW50TGVuZ3RoLFxuICAgICAgICAgICAgICAgICAgKSxcbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgIF9hcHBlbmRCbG9jayhfdGhpcywgYWN0aXZlVGFibGUsIGJsb2NrU2xpY2UsIG5leHRCeXRlLCBuZXh0KTtcbiAgICAgICAgICAgICAgICBidWZmZXJJbmRleCArPSBibG9ja1NsaWNlLmxlbmd0aDtcbiAgICAgICAgICAgICAgICBuZXh0Qnl0ZSArPSBibG9ja1NsaWNlLmxlbmd0aDtcbiAgICAgICAgICAgICAgfSkudGhlbihuZXh0KTtcblxuICAgICAgICAgICAgICAvLyBmdW5jdGlvbiBhcHBlbmQoKSB7XG4gICAgICAgICAgICAgIC8vICAgaWYgKGJ1ZmZlckluZGV4IDwgY29udGVudEJ1ZmZlci5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgLy8gICAgIHZhciBibG9ja1NsaWNlID0gY29udGVudEJ1ZmZlci5zbGljZShidWZmZXJJbmRleCwgYnVmZmVySW5kZXggKyBhY3RpdmVUYWJsZS5ibG9ja1NpemUpO1xuICAgICAgICAgICAgICAvLyAgICAgYnVmZmVySW5kZXggKz0gYWN0aXZlVGFibGUuYmxvY2tTaXplO1xuICAgICAgICAgICAgICAvLyAgICAgcmV0dXJuIF9hcHBlbmRCbG9jayhfdGhpcywgYWN0aXZlVGFibGUsIGJsb2NrU2xpY2UsIG5leHRCeXRlKyspXG4gICAgICAgICAgICAgIC8vICAgICAudGhlbihhcHBlbmQpO1xuICAgICAgICAgICAgICAvLyAgIH1cbiAgICAgICAgICAgICAgLy8gfVxuICAgICAgICAgICAgICAvLyByZXR1cm4gYXBwZW5kKClcbiAgICAgICAgICAgICAgLy8gLnRoZW4oc3RlcCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBhY3RpdmVUYWJsZSA9IGRlbEtleShhY3RpdmVUYWJsZSwgb3Aua2V5KTtcbiAgICAgICAgICAgICAgbmV4dCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cblxuICAgICAgICAgIHJldHVybiBzZXJpYWxGc1Rhc2soX29wcywgc3RlcCk7XG5cbiAgICAgICAgICAvLyByZXR1cm4gc3RlcCgpO1xuICAgICAgICB9KVxuICAgICAgICAudGhlbigoKSA9PiBfY2xvc2VMb2coX3RoaXMpKVxuICAgICAgICAudGhlbihcbiAgICAgICAgICBfcmV0cnkoKCkgPT4ge1xuICAgICAgICAgICAgYWN0aXZlVGFibGUgPSB0YWJsZShhY3RpdmVUYWJsZSk7XG4gICAgICAgICAgICByZXR1cm4gX3dyaXRlVGFibGUoX3RoaXMsIGFjdGl2ZVRhYmxlKTtcbiAgICAgICAgICB9KSxcbiAgICAgICAgKTtcbiAgICB9XG5cbiAgICByZXR1cm4gX2xvY2soX3RoaXMsIG11c3RMb2NrLCBwcm9taXNlID0+XG4gICAgICBwcm9taXNlXG4gICAgICAgIC50aGVuKCgpID0+IF93cml0ZSgpKVxuICAgICAgICAuY2F0Y2goZSA9PlxuICAgICAgICAgIF9jbG9zZUxvZyhfdGhpcykudGhlbigoKSA9PiB7XG4gICAgICAgICAgICB0aHJvdyBlO1xuICAgICAgICAgIH0pLFxuICAgICAgICApXG4gICAgICAgIC50aGVuKCgpID0+IHtcbiAgICAgICAgICBpZiAoXG4gICAgICAgICAgICBfc2l6ZVVzZWQoX3RoaXMsIGFjdGl2ZVRhYmxlKSA+IF9jb21wYWN0U2l6ZShfdGhpcywgYWN0aXZlVGFibGUpXG4gICAgICAgICAgKSB7XG4gICAgICAgICAgICByZXR1cm4gX3RoaXMuY29tcGFjdChmYWxzZSk7XG4gICAgICAgICAgfVxuICAgICAgICB9KSxcbiAgICApO1xuICB9XG5cbiAgY29tcGFjdChtdXN0TG9jaykge1xuICAgIGNvbnN0IF90aGlzID0gdGhpcztcblxuICAgIHJldHVybiBfdGhpc1xuICAgICAgLnJlYWQobXVzdExvY2spXG4gICAgICAudGhlbihtYXAgPT4ge1xuICAgICAgICBjb25zdCBvcHMgPSBbXTtcbiAgICAgICAgT2JqZWN0LmtleXMobWFwKS5mb3JFYWNoKGtleSA9PiB7XG4gICAgICAgICAgb3BzLnB1c2goe1xuICAgICAgICAgICAga2V5LFxuICAgICAgICAgICAgdmFsdWU6IG1hcFtrZXldLFxuICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIG9wcztcbiAgICAgIH0pXG4gICAgICAudGhlbihvcHMgPT5cbiAgICAgICAgcmltcmFmKGAke190aGlzLnBhdGh9fmApXG4gICAgICAgICAgLnRoZW4odGltZW91dDEwMClcbiAgICAgICAgICAudGhlbigoKSA9PiBvcHMpLFxuICAgICAgKVxuICAgICAgLnRoZW4ob3BzID0+IHtcbiAgICAgICAgY29uc3QgY29weSA9IG5ldyBBcHBlbmRTZXJpYWxpemVyKHtcbiAgICAgICAgICBjYWNoZURpclBhdGg6IGAke190aGlzLnBhdGh9fmAsXG5cbiAgICAgICAgICBibG9ja1NpemU6IF90aGlzLmJsb2NrU2l6ZSxcbiAgICAgICAgICBsb2dTaXplOiBfdGhpcy5sb2dTaXplLFxuICAgICAgICAgIGNvbXBhY3RTaXplVGhyZXNob2xkOiBfdGhpcy5jb21wYWN0U2l6ZVRocmVzaG9sZCxcbiAgICAgICAgICBjb21wYWN0TXVsdGlwbGllclRocmVzaG9sZDogX3RoaXMuY29tcGFjdE11bHRpcGxpZXJUaHJlc2hvbGQsXG4gICAgICAgIH0pO1xuXG4gICAgICAgIHJldHVybiBfbG9jayhfdGhpcywgbXVzdExvY2ssIHByb21pc2UgPT5cbiAgICAgICAgICBwcm9taXNlXG4gICAgICAgICAgICAudGhlbigoKSA9PiBjb3B5LndyaXRlKG9wcykpXG4gICAgICAgICAgICAudGhlbigoKSA9PiByaW1yYWYoX3RoaXMucGF0aCkpXG4gICAgICAgICAgICAudGhlbih0aW1lb3V0MTAwKVxuICAgICAgICAgICAgLnRoZW4oX3JldHJ5KCgpID0+IHJlbmFtZShjb3B5LnBhdGgsIF90aGlzLnBhdGgpLCAxMCkpLFxuICAgICAgICApO1xuICAgICAgfSk7XG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBBcHBlbmRTZXJpYWxpemVyO1xuIl0sInNvdXJjZVJvb3QiOiIvVXNlcnMvdHlsZXJhcmJ1cy9kZXYvcHJvdmlkZXIvc3JjIn0=

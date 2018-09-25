'use strict';

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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImhhcmQtc291cmNlLXdlYnBhY2stcGx1Z2luL2xpYi9TZXJpYWxpemVyQXBwZW5kLmpzIl0sIm5hbWVzIjpbImZzIiwicmVxdWlyZSIsImpvaW4iLCJSZWFkYWJsZSIsIl9ta2RpcnAiLCJfcmltcmFmIiwid3JpdGVKc29uRmlsZSIsImVudHJpZXMiLCJ2YWx1ZXMiLCJwcm9taXNpZnkiLCJyaW1yYWYiLCJvcGVuIiwiY2xvc2UiLCJyZWFkIiwicmVhZEZpbGUiLCJ3cml0ZSIsInJlbmFtZSIsInVubGluayIsInN0YXQiLCJta2RpcnAiLCJBUFBFTkRfVkVSU0lPTiIsIl9ibG9ja1NpemUiLCJfbG9nU2l6ZSIsIl9taW5Db21wYWN0U2l6ZSIsIl9jb21wYWN0TXVsdGlwbGllclRocmVzaG9sZCIsInZhbHVlIiwia2V5Iiwic2l6ZSIsInN0YXJ0Iiwib2JqRnJvbSIsIm1hcCIsIk1hcCIsIm9iaiIsImZvckVhY2giLCJ0YWJsZSIsIm5leHRCeXRlIiwiYmxvY2tTaXplIiwibG9nU2l6ZSIsInZlcnNpb24iLCJtb2RUYWJsZSIsInB1dEtleSIsIl90YWJsZSIsInNldCIsImRlbEtleSIsImdldCIsImRlbGV0ZSIsIl90YWJsZXBhdGgiLCJwYXRoIiwiX2RlZmF1bHRUYWJsZSIsInRpbWVvdXQxMDAiLCJQcm9taXNlIiwicmVzb2x2ZSIsInNldFRpbWVvdXQiLCJfcmV0cnkiLCJmbiIsIm4iLCJfcmV0cnlGbiIsImNhdGNoIiwiX3JlYWRUYWJsZSIsIl90aGlzIiwiZSIsIkpTT04iLCJzdHJpbmdpZnkiLCJ0aGVuIiwicGFyc2UiLCJfd3JpdGVUYWJsZSIsIl9sb2dGaWxlcGF0aCIsImluZGV4IiwibG9nSWQiLCJ0b1N0cmluZyIsImxlbmd0aCIsIl9vcGVuTG9nIiwibW9kZSIsIl9mZCIsImZkIiwiX3dyaXRlQnVmZmVyIiwiQnVmZmVyIiwiX3dyaXRlT2Zmc2V0IiwiX2Nsb3NlTG9nIiwiX3JlYWRCdWZmZXJTaXplIiwiTWF0aCIsIm1pbiIsIl9yZWFkTG9nIiwib3V0IiwicmJTaXplIiwiX3JlYWRCdWZmZXIiLCJfbG9nIiwicHVzaCIsIm9mZnNldCIsInN0ZXAiLCJfYXBwZW5kQmxvY2siLCJibG9ja0NvbnRlbnQiLCJuZXh0IiwicHJlcCIsIndvcmsiLCJFcnJvciIsIndyaXRlU2xpY2UiLCJzbGljZSIsImNvcHkiLCJfc2l6ZU5lZWRlZCIsInJlZHVjZSIsImNhcnJ5IiwiX3NpemVVc2VkIiwiX2NvbXBhY3RTaXplIiwibWF4IiwiY29tcGFjdFNpemVUaHJlc2hvbGQiLCJjb21wYWN0TXVsdGlwbGllclRocmVzaG9sZCIsIl9sb2NrIiwibXVzdExvY2siLCJwcm9taXNlRm4iLCJsb2NrIiwic2VyaWFsRnNUYXNrIiwiYXJyYXkiLCJlYWNoIiwicmVqZWN0IiwicXVldWUiLCJpbk5leHQiLCJlcnIiLCJBcHBlbmRTZXJpYWxpemVyIiwiY29uc3RydWN0b3IiLCJvcHRpb25zIiwiY2FjaGVEaXJQYXRoIiwiYXV0b1BhcnNlIiwiRGF0ZSIsIm5vdyIsIl9yZWFkIiwiYWN0aXZlVGFibGUiLCJ2YWx1ZVN0YXJ0cyIsImVuZCIsInNvcnQiLCJhIiwiYiIsInZhbHVlSW5kZXgiLCJkZXN0QnVmZmVyIiwibG9nT2Zmc2V0IiwibG9nIiwib24iLCJkYXRhIiwiYnVmZmVySW5kZXgiLCJuZXdMZW5ndGgiLCJwb3ciLCJjZWlsIiwicmVhZEFtb3VudCIsInV0ZjhTbGljZSIsInByb21pc2UiLCJvcHMiLCJzdGVwcyIsImNvbnRlbnRCdWZmZXIiLCJjb250ZW50TGVuZ3RoIiwiX3dyaXRlIiwiX29wcyIsIm9wIiwiY29udGVudCIsImJ5dGVMZW5ndGgiLCJ1dGY4V3JpdGUiLCJibG9ja0NvdW50IiwiYnVsayIsIkFycmF5IiwiZnJvbSIsIl8iLCJpIiwiYmxvY2tTbGljZSIsImNvbXBhY3QiLCJPYmplY3QiLCJrZXlzIiwibW9kdWxlIiwiZXhwb3J0cyJdLCJtYXBwaW5ncyI6Ijs7QUFBQSxNQUFNQSxLQUFLQyxRQUFRLElBQVIsQ0FBWDtBQUNBLE1BQU1DLE9BQU9E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c0NvbnRlbnQiOlsiY29uc3QgZnMgPSByZXF1aXJlKCdmcycpO1xuY29uc3Qgam9pbiA9IHJlcXVpcmUoJ3BhdGgnKS5qb2luO1xuY29uc3QgUmVhZGFibGUgPSByZXF1aXJlKCdzdHJlYW0nKS5SZWFkYWJsZTtcblxuY29uc3QgX21rZGlycCA9IHJlcXVpcmUoJ21rZGlycCcpO1xuY29uc3QgX3JpbXJhZiA9IHJlcXVpcmUoJ3JpbXJhZicpO1xuY29uc3Qgd3JpdGVKc29uRmlsZSA9IHJlcXVpcmUoJ3dyaXRlLWpzb24tZmlsZScpO1xuXG5jb25zdCBlbnRyaWVzID0gcmVxdWlyZSgnLi91dGlsL09iamVjdC5lbnRyaWVzJyk7XG5jb25zdCB2YWx1ZXMgPSByZXF1aXJlKCcuL3V0aWwvT2JqZWN0LnZhbHVlcycpO1xuY29uc3QgcHJvbWlzaWZ5ID0gcmVxdWlyZSgnLi91dGlsL3Byb21pc2lmeScpO1xuXG5jb25zdCByaW1yYWYgPSBwcm9taXNpZnkoX3JpbXJhZik7XG5jb25zdCBvcGVuID0gcHJvbWlzaWZ5KGZzLm9wZW4pO1xuY29uc3QgY2xvc2UgPSBwcm9taXNpZnkoZnMuY2xvc2UpO1xuY29uc3QgcmVhZCA9IHByb21pc2lmeShmcy5yZWFkKTtcbmNvbnN0IHJlYWRGaWxlID0gcHJvbWlzaWZ5KGZzLnJlYWRGaWxlKTtcbmNvbnN0IHdyaXRlID0gcHJvbWlzaWZ5KGZzLndyaXRlKTtcbmNvbnN0IHJlbmFtZSA9IHByb21pc2lmeShmcy5yZW5hbWUpO1xuY29uc3QgdW5saW5rID0gcHJvbWlzaWZ5KGZzLnVubGluayk7XG5jb25zdCBzdGF0ID0gcHJvbWlzaWZ5KGZzLnN0YXQpO1xuY29uc3QgbWtkaXJwID0gcHJvbWlzaWZ5KF9ta2RpcnApO1xuXG5jb25zdCBBUFBFTkRfVkVSU0lPTiA9IDE7XG5cbmNvbnN0IF9ibG9ja1NpemUgPSA0ICogMTAyNDtcbmNvbnN0IF9sb2dTaXplID0gMiAqIDEwMjQgKiAxMDI0O1xuY29uc3QgX21pbkNvbXBhY3RTaXplID0gNTEyICogMTAyNDtcbmNvbnN0IF9jb21wYWN0TXVsdGlwbGllclRocmVzaG9sZCA9IDEuNTtcblxuY29uc3QgdmFsdWUgPSAoa2V5LCBzaXplLCBzdGFydCkgPT4gKHtcbiAga2V5LFxuICBzaXplOiBzaXplIHx8IDAsXG4gIHN0YXJ0OiBzdGFydCB8fCAwLFxufSk7XG5cbmNvbnN0IG9iakZyb20gPSBtYXAgPT4ge1xuICBpZiAobWFwIGluc3RhbmNlb2YgTWFwKSB7XG4gICAgY29uc3Qgb2JqID0ge307XG4gICAgbWFwLmZvckVhY2goKHZhbHVlLCBrZXkpID0+IHtcbiAgICAgIG9ialtrZXldID0gdmFsdWU7XG4gICAgfSk7XG4gICAgcmV0dXJuIG9iajtcbiAgfVxuICByZXR1cm4gbWFwO1xufTtcblxuY29uc3QgdGFibGUgPSAoeyBuZXh0Qnl0ZSwgYmxvY2tTaXplLCBsb2dTaXplLCBtYXAgfSkgPT4gKHtcbiAgdmVyc2lvbjogQVBQRU5EX1ZFUlNJT04sXG4gIG5leHRCeXRlOiBuZXh0Qnl0ZSxcbiAgYmxvY2tTaXplOiBibG9ja1NpemUsXG4gIGxvZ1NpemU6IGxvZ1NpemUsXG4gIG1hcDogb2JqRnJvbShtYXApLFxufSk7XG5cbmNvbnN0IG1vZFRhYmxlID0gKHsgbmV4dEJ5dGUsIGJsb2NrU2l6ZSwgbG9nU2l6ZSwgbWFwIH0pID0+ICh7XG4gIHZlcnNpb246IEFQUEVORF9WRVJTSU9OLFxuICBuZXh0Qnl0ZTogbmV4dEJ5dGUsXG4gIGJsb2NrU2l6ZTogYmxvY2tTaXplLFxuICBsb2dTaXplOiBsb2dTaXplLFxuICBtYXA6IG5ldyBNYXAoZW50cmllcyhtYXApKSxcbn0pO1xuXG5mdW5jdGlvbiBwdXRLZXkoX3RhYmxlLCBrZXksIHNpemUpIHtcbiAgLy8gX3RhYmxlLm1hcFtrZXldID0gdmFsdWUoa2V5LCBzaXplLCBfdGFibGUubmV4dEJ5dGUsIE1hdGguY2VpbChzaXplIC8gX3RhYmxlLmJsb2NrU2l6ZSkpO1xuICBfdGFibGUubWFwLnNldChrZXksIHZhbHVlKGtleSwgc2l6ZSwgX3RhYmxlLm5leHRCeXRlKSk7XG4gIF90YWJsZS5uZXh0Qnl0ZSA9IF90YWJsZS5uZXh0Qnl0ZSArIHNpemU7XG4gIHJldHVybiBfdGFibGU7XG59XG5cbmZ1bmN0aW9uIGRlbEtleShfdGFibGUsIGtleSkge1xuICAvLyBpZiAoX3RhYmxlLm1hcFtrZXldKSB7XG4gIC8vICAgZGVsZXRlIF90YWJsZS5tYXBba2V5XTtcbiAgaWYgKF90YWJsZS5tYXAuZ2V0KGtleSkpIHtcbiAgICBfdGFibGUubWFwLmRlbGV0ZShrZXkpO1xuICB9XG4gIHJldHVybiBfdGFibGU7XG59XG5cbmNvbnN0IF90YWJsZXBhdGggPSAoeyBwYXRoIH0pID0+IGpvaW4ocGF0aCwgJ3RhYmxlLmpzb24nKTtcblxuY29uc3QgX2RlZmF1bHRUYWJsZSA9ICh7IGJsb2NrU2l6ZSwgbG9nU2l6ZSB9KSA9PlxuICB0YWJsZSh7XG4gICAgbmV4dEJ5dGU6IDAsXG4gICAgYmxvY2tTaXplOiBibG9ja1NpemUgfHwgX2Jsb2NrU2l6ZSxcbiAgICBsb2dTaXplOiBsb2dTaXplIHx8IF9sb2dTaXplLFxuICAgIG1hcDoge30sXG4gIH0pO1xuXG5jb25zdCB0aW1lb3V0MTAwID0gKCkgPT4gbmV3IFByb21pc2UocmVzb2x2ZSA9PiBzZXRUaW1lb3V0KHJlc29sdmUsIDEwMCkpO1xuXG5jb25zdCBfcmV0cnkgPSAoZm4sIG4pID0+IHtcbiAgbiA9IG4gfHwgNTtcbiAgY29uc3QgX3JldHJ5Rm4gPSB2YWx1ZSA9PiB7XG4gICAgaWYgKG4pIHtcbiAgICAgIG4tLTtcbiAgICAgIHJldHVybiBmbih2YWx1ZSkuY2F0Y2goX3JldHJ5Rm4pO1xuICAgIH1cbiAgICByZXR1cm4gZm4odmFsdWUpO1xuICB9O1xuICByZXR1cm4gX3JldHJ5Rm47XG59O1xuXG5jb25zdCBfcmVhZFRhYmxlID0gX3RoaXMgPT5cbiAgcmVhZEZpbGUoX3RhYmxlcGF0aChfdGhpcyksICd1dGY4JylcbiAgICAuY2F0Y2goZSA9PiBKU09OLnN0cmluZ2lmeShfZGVmYXVsdFRhYmxlKF90aGlzKSkpXG4gICAgLnRoZW4oSlNPTi5wYXJzZSlcbiAgICAudGhlbihfdGFibGUgPT4ge1xuICAgICAgaWYgKF90YWJsZS52ZXJzaW9uICE9PSBBUFBFTkRfVkVSU0lPTikge1xuICAgICAgICByZXR1cm4gX2RlZmF1bHRUYWJsZShfdGhpcyk7XG4gICAgICB9XG4gICAgICByZXR1cm4gX3RhYmxlO1xuICAgIH0pO1xuXG5jb25zdCBfd3JpdGVUYWJsZSA9IChfdGhpcywgX3RhYmxlKSA9PiB3cml0ZUpzb25GaWxlKF90YWJsZXBhdGgoX3RoaXMpLCBfdGFibGUpO1xuXG5jb25zdCBfbG9nRmlsZXBhdGggPSAoeyBwYXRoIH0sIHsgbG9nU2l6ZSB9LCBpbmRleCkgPT4ge1xuICBsZXQgbG9nSWQgPSAoKGluZGV4IC8gbG9nU2l6ZSkgfCAwKS50b1N0cmluZygpO1xuICB3aGlsZSAobG9nSWQubGVuZ3RoIDwgNCkge1xuICAgIGxvZ0lkID0gYDAke2xvZ0lkfWA7XG4gIH1cbiAgcmV0dXJuIGpvaW4ocGF0aCwgYGxvZyR7bG9nSWR9YCk7XG59O1xuXG5jb25zdCBfb3BlbkxvZyA9IChfdGhpcywgbW9kZSwgX3RhYmxlLCBpbmRleCkgPT4ge1xuICBpZiAoX3RoaXMuX2ZkICE9PSBudWxsKSB7XG4gICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpO1xuICB9IGVsc2Uge1xuICAgIC8vIElmIG1vZGUgaXMgJ2EnLCBzdGF0IHRoZSBsb2cgdG8gd3JpdGUgdG8sIGlmIGl0IHNob3VsZCBiZSBlbXB0eSBhbmRcbiAgICAvLyBpc24ndCwgdW5saW5rIGJlZm9yZSBvcGVuaW5nLlxuICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoKVxuICAgICAgLnRoZW4oKCkgPT4ge1xuICAgICAgICBpZiAobW9kZSA9PT0gJ2EnICYmIGluZGV4ICUgX3RhYmxlLmxvZ1NpemUgPT09IDApIHtcbiAgICAgICAgICByZXR1cm4gc3RhdChfbG9nRmlsZXBhdGgoX3RoaXMsIF90YWJsZSwgaW5kZXgpKVxuICAgICAgICAgICAgLnRoZW4oKHsgc2l6ZSB9KSA9PiB7XG4gICAgICAgICAgICAgIGlmIChzaXplID4gMCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB1bmxpbmsoX2xvZ0ZpbGVwYXRoKF90aGlzLCBfdGFibGUsIGluZGV4KSkudGhlbihcbiAgICAgICAgICAgICAgICAgIHRpbWVvdXQxMDAsXG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC5jYXRjaCgoKSA9PiB7fSk7XG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgICAudGhlbigoKSA9PiBvcGVuKF9sb2dGaWxlcGF0aChfdGhpcywgX3RhYmxlLCBpbmRleCksIG1vZGUpKVxuICAgICAgLnRoZW4oZmQgPT4ge1xuICAgICAgICBfdGhpcy5fZmQgPSBmZDtcbiAgICAgICAgaWYgKG1vZGUgPT09ICdhJykge1xuICAgICAgICAgIF90aGlzLl93cml0ZUJ1ZmZlciA9IG5ldyBCdWZmZXIoX3RhYmxlLmxvZ1NpemUpO1xuICAgICAgICAgIF90aGlzLl93cml0ZU9mZnNldCA9IDA7XG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgICAuY2F0Y2goZSA9PiB7XG4gICAgICAgIHRocm93IGU7XG4gICAgICB9KTtcbiAgfVxufTtcblxuY29uc3QgX2Nsb3NlTG9nID0gX3RoaXMgPT4ge1xuICBpZiAoX3RoaXMuX2ZkID09PSBudWxsKSB7XG4gICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoKVxuICAgICAgLnRoZW4oKCkgPT4ge1xuICAgICAgICBpZiAoX3RoaXMuX3dyaXRlQnVmZmVyKSB7XG4gICAgICAgICAgcmV0dXJuIHdyaXRlKF90aGlzLl9mZCwgX3RoaXMuX3dyaXRlQnVmZmVyLCAwLCBfdGhpcy5fd3JpdGVPZmZzZXQpO1xuICAgICAgICB9XG4gICAgICB9KVxuICAgICAgLnRoZW4oKCkgPT4gY2xvc2UoX3RoaXMuX2ZkKSlcbiAgICAgIC50aGVuKCgpID0+IHtcbiAgICAgICAgX3RoaXMuX2ZkID0gbnVsbDtcbiAgICAgICAgX3RoaXMuX3dyaXRlQnVmZmVyID0gbnVsbDtcbiAgICAgICAgX3RoaXMuX3dyaXRlT2Zmc2V0ID0gMDtcbiAgICAgIH0pO1xuICB9XG59O1xuXG5jb25zdCBfcmVhZEJ1ZmZlclNpemUgPSAoX3RoaXMsIHsgYmxvY2tTaXplLCBsb2dTaXplIH0pID0+XG4gIE1hdGgubWluKDMyICogYmxvY2tTaXplLCBsb2dTaXplKTtcblxuY29uc3QgX3JlYWRMb2cgPSAoX3RoaXMsIF90YWJsZSkgPT4ge1xuICBsZXQgaW5kZXggPSAwO1xuICBjb25zdCBvdXQgPSBuZXcgUmVhZGFibGUoe1xuICAgIHJlYWQoKSB7fSxcbiAgfSk7XG5cbiAgY29uc3QgcmJTaXplID0gX3RhYmxlLmxvZ1NpemU7XG4gIGNvbnN0IF9yZWFkQnVmZmVyID0gbmV3IEJ1ZmZlcihyYlNpemUpO1xuXG4gIGZ1bmN0aW9uIF9sb2coKSB7XG4gICAgaWYgKGluZGV4ID49IF90YWJsZS5uZXh0Qnl0ZSkge1xuICAgICAgb3V0LnB1c2gobnVsbCk7XG4gICAgICByZXR1cm4gX2Nsb3NlTG9nKF90aGlzKTtcbiAgICB9XG5cbiAgICBjb25zdCBvZmZzZXQgPSAwO1xuICAgIGZ1bmN0aW9uIHN0ZXAoKSB7XG4gICAgICBpZiAoIV90aGlzLl9mZCkge1xuICAgICAgICBpbmRleCA9IF90YWJsZS5uZXh0Qnl0ZTtcbiAgICAgICAgcmV0dXJuIF9sb2coKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHJlYWQoX3RoaXMuX2ZkLCBfcmVhZEJ1ZmZlciwgMCwgcmJTaXplLCAwKS50aGVuKHJlYWQgPT4ge1xuICAgICAgICBpbmRleCArPSBfdGFibGUubG9nU2l6ZTtcbiAgICAgICAgb3V0LnB1c2goX3JlYWRCdWZmZXIpO1xuICAgICAgICByZXR1cm4gX2xvZygpO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIF9jbG9zZUxvZyhfdGhpcylcbiAgICAgIC50aGVuKCgpID0+IF9vcGVuTG9nKF90aGlzLCAncicsIF90YWJsZSwgaW5kZXgpKVxuICAgICAgLnRoZW4oc3RlcCk7XG4gIH1cbiAgUHJvbWlzZS5yZXNvbHZlKCkudGhlbihfbG9nKTtcblxuICByZXR1cm4gb3V0O1xufTtcblxuY29uc3QgX2FwcGVuZEJsb2NrID0gKF90aGlzLCBfdGFibGUsIGJsb2NrQ29udGVudCwgaW5kZXgsIG5leHQpID0+IHtcbiAgbGV0IHByZXA7XG4gIGlmIChfdGhpcy5fZmQgIT09IG51bGwgJiYgaW5kZXggJSBfdGFibGUubG9nU2l6ZSA9PT0gMCkge1xuICAgIHByZXAgPSBfY2xvc2VMb2coX3RoaXMpLnRoZW4oKCkgPT4gX29wZW5Mb2coX3RoaXMsICdhJywgX3RhYmxlLCBpbmRleCkpO1xuICB9IGVsc2UgaWYgKF90aGlzLl9mZCA9PT0gbnVsbCkge1xuICAgIHByZXAgPSBfb3BlbkxvZyhfdGhpcywgJ2EnLCBfdGFibGUsIGluZGV4KTtcbiAgfVxuICBmdW5jdGlvbiB3b3JrKCkge1xuICAgIGlmICghX3RoaXMuX2ZkKSB7XG4gICAgICByZXR1cm4gbmV4dChuZXcgRXJyb3IoKSk7XG4gICAgfVxuICAgIGlmIChibG9ja0NvbnRlbnQubGVuZ3RoID4gX3RhYmxlLmxvZ1NpemUpIHtcbiAgICAgIHJldHVybiBuZXh0KG5ldyBFcnJvcignYmxvY2sgbG9uZ2VyIHRoYW4gbWF4IHNpemUnKSk7XG4gICAgfVxuICAgIGNvbnN0IHdyaXRlU2xpY2UgPSBfdGhpcy5fd3JpdGVCdWZmZXIuc2xpY2UoXG4gICAgICBfdGhpcy5fd3JpdGVPZmZzZXQsXG4gICAgICBfdGhpcy5fd3JpdGVPZmZzZXQgKyBibG9ja0NvbnRlbnQubGVuZ3RoLFxuICAgICk7XG4gICAgLy8gaWYgKGJsb2NrQ29udGVudC5sZW5ndGggPCBfdGFibGUuYmxvY2tTaXplKSB7XG4gICAgLy8gICB3cml0ZVNsaWNlLmZpbGwoMCk7XG4gICAgLy8gfVxuICAgIGJsb2NrQ29udGVudC5jb3B5KHdyaXRlU2xpY2UpO1xuICAgIF90aGlzLl93cml0ZU9mZnNldCArPSBibG9ja0NvbnRlbnQubGVuZ3RoO1xuICAgIGlmIChfdGhpcy5fd3JpdGVPZmZzZXQgPiBfdGhpcy5fd3JpdGVCdWZmZXIubGVuZ3RoKSB7XG4gICAgICByZXR1cm4gbmV4dChcbiAgICAgICAgbmV3IEVycm9yKFxuICAgICAgICAgIGB3cml0ZU9mZnNldCAke190aGlzLl93cml0ZU9mZnNldH0gcGFzdCB3cml0ZUJ1ZmZlciBsZW5ndGggJHtcbiAgICAgICAgICAgIF90aGlzLl93cml0ZUJ1ZmZlci5sZW5ndGhcbiAgICAgICAgICB9YCxcbiAgICAgICAgKSxcbiAgICAgICk7XG4gICAgfVxuICAgIGlmIChfdGhpcy5fd3JpdGVPZmZzZXQgPiBfdGFibGUubG9nU2l6ZSkge1xuICAgICAgcmV0dXJuIG5leHQoXG4gICAgICAgIG5ldyBFcnJvcihcbiAgICAgICAgICBgd3JpdGVPZmZzZXQgJHtfdGhpcy5fd3JpdGVPZmZzZXR9IHBhc3QgbG9nU2l6ZSAke190YWJsZS5sb2dTaXplfWAsXG4gICAgICAgICksXG4gICAgICApO1xuICAgIH1cbiAgICBuZXh0KCk7XG4gICAgLy8gcmV0dXJuIGZzLndyaXRlKF90aGlzLl9mZCwgYmxvY2tDb250ZW50LCAwLCBfdGFibGUuYmxvY2tTaXplLCBuZXh0KTtcbiAgfVxuICBpZiAocHJlcCkge1xuICAgIHByZXAudGhlbih3b3JrKTtcbiAgfSBlbHNlIHtcbiAgICB3b3JrKCk7XG4gIH1cblxuICAvLyByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKClcbiAgLy8gLnRoZW4oZnVuY3Rpb24oKSB7XG4gIC8vICAgaWYgKGluZGV4ICUgKF90YWJsZS5sb2dTaXplIC8gX3RhYmxlLmJsb2NrU2l6ZSkgPT09IDApIHtcbiAgLy8gICAgIHJldHVybiBfY2xvc2VMb2coX3RoaXMpO1xuICAvLyAgIH1cbiAgLy8gfSlcbiAgLy8gLnRoZW4oZnVuY3Rpb24oKSB7XG4gIC8vICAgcmV0dXJuIF9vcGVuTG9nKF90aGlzLCAnYScsIF90YWJsZSwgaW5kZXgpO1xuICAvLyB9KVxuICAvLyAudGhlbihmdW5jdGlvbigpIHtcbiAgLy8gICBpZiAoIV90aGlzLl9mZCkge1xuICAvLyAgICAgdGhyb3cgbmV3IEVycm9yKCk7XG4gIC8vICAgfVxuICAvLyAgIGlmIChibG9ja0NvbnRlbnQubGVuZ3RoID4gX3RhYmxlLmJsb2NrU2l6ZSkge1xuICAvLyAgICAgdGhyb3cgbmV3IEVycm9yKCdibG9jayBsb25nZXIgdGhhbiBtYXggc2l6ZScpO1xuICAvLyAgIH1cbiAgLy8gICBpZiAoYmxvY2tDb250ZW50Lmxlbmd0aCA8IF90YWJsZS5ibG9ja1NpemUpIHtcbiAgLy8gICAgIHZhciBfYmxvY2tDb250ZW50ID0gbmV3IEJ1ZmZlcihfdGFibGUuYmxvY2tTaXplKTtcbiAgLy8gICAgIGJsb2NrQ29udGVudC5jb3B5KF9ibG9ja0NvbnRlbnQpO1xuICAvLyAgICAgYmxvY2tDb250ZW50ID0gX2Jsb2NrQ29udGVudDtcbiAgLy8gICB9XG4gIC8vICAgcmV0dXJuIHdyaXRlKF90aGlzLl9mZCwgYmxvY2tDb250ZW50LCAwLCBfdGFibGUuYmxvY2tTaXplKTtcbiAgLy8gfSk7XG59O1xuXG5jb25zdCBfc2l6ZU5lZWRlZCA9IChfdGhpcywgeyBtYXAgfSkgPT5cbiAgdmFsdWVzKG1hcCkucmVkdWNlKChjYXJyeSwgeyBzaXplIH0pID0+IGNhcnJ5ICsgc2l6ZSwgMCk7XG5cbmNvbnN0IF9zaXplVXNlZCA9IChfdGhpcywgeyBuZXh0Qnl0ZSB9KSA9PiBuZXh0Qnl0ZTtcblxuY29uc3QgX2NvbXBhY3RTaXplID0gKF90aGlzLCBfdGFibGUpID0+XG4gIE1hdGgubWF4KFxuICAgIF90aGlzLmNvbXBhY3RTaXplVGhyZXNob2xkLFxuICAgIF9zaXplTmVlZGVkKF90aGlzLCBfdGFibGUpICogX3RoaXMuY29tcGFjdE11bHRpcGxpZXJUaHJlc2hvbGQsXG4gICk7XG5cbmNvbnN0IF9sb2NrID0gKF90aGlzLCBtdXN0TG9jaywgcHJvbWlzZUZuKSA9PiB7XG4gIGlmIChtdXN0TG9jayAhPT0gZmFsc2UpIHtcbiAgICByZXR1cm4gKF90aGlzLmxvY2sgPSBwcm9taXNlRm4oX3RoaXMubG9jaykpO1xuICB9XG4gIHJldHVybiBwcm9taXNlRm4oUHJvbWlzZS5yZXNvbHZlKCkpO1xufTtcblxuY29uc3Qgc2VyaWFsRnNUYXNrID0gKGFycmF5LCBlYWNoKSA9PlxuICBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgbGV0IHF1ZXVlID0gMDtcbiAgICBsZXQgaW5kZXggPSAwO1xuICAgIGxldCBpbk5leHQgPSBmYWxzZTtcbiAgICBmdW5jdGlvbiBuZXh0KGVycikge1xuICAgICAgaWYgKGVycikge1xuICAgICAgICByZXR1cm4gcmVqZWN0KGVycik7XG4gICAgICB9XG4gICAgICBpZiAoaW5kZXggPT09IGFycmF5Lmxlbmd0aCkge1xuICAgICAgICByZXR1cm4gcmVzb2x2ZSgpO1xuICAgICAgfVxuICAgICAgcXVldWUrKztcbiAgICAgIGlmIChpbk5leHQpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgaW5OZXh0ID0gdHJ1ZTtcbiAgICAgIHdoaWxlIChxdWV1ZSA+IGluZGV4ICYmIGluZGV4IDwgYXJyYXkubGVuZ3RoKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgZWFjaChhcnJheVtpbmRleCsrXSwgbmV4dCk7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICByZXR1cm4gbmV4dChlKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaW5OZXh0ID0gZmFsc2U7XG4gICAgfVxuICAgIG5leHQoKTtcbiAgfSk7XG5cbmNsYXNzIEFwcGVuZFNlcmlhbGl6ZXIge1xuICBjb25zdHJ1Y3RvcihvcHRpb25zKSB7XG4gICAgdGhpcy5wYXRoID0gb3B0aW9ucy5jYWNoZURpclBhdGg7XG4gICAgdGhpcy5hdXRvUGFyc2UgPSBvcHRpb25zLmF1dG9QYXJzZTtcbiAgICB0aGlzLmJsb2NrU2l6ZSA9IG9wdGlvbnMuYmxvY2tTaXplIHx8IF9ibG9ja1NpemU7XG4gICAgdGhpcy5sb2dTaXplID0gb3B0aW9ucy5sb2dTaXplIHx8IF9sb2dTaXplO1xuICAgIHRoaXMuY29tcGFjdFNpemVUaHJlc2hvbGQgPSBvcHRpb25zLmNvbXBhY3RTaXplVGhyZXNob2xkIHx8IF9taW5Db21wYWN0U2l6ZTtcbiAgICB0aGlzLmNvbXBhY3RNdWx0aXBsaWVyVGhyZXNob2xkID1cbiAgICAgIG9wdGlvbnMuY29tcGFjdE11bHRpcGxpZXJUaHJlc2hvbGQgfHwgX2NvbXBhY3RNdWx0aXBsaWVyVGhyZXNob2xkO1xuXG4gICAgdGhpcy5sb2NrID0gUHJvbWlzZS5yZXNvbHZlKCk7XG4gICAgdGhpcy5fZmQgPSBudWxsO1xuICB9XG5cbiAgcmVhZChtdXN0TG9jaykge1xuICAgIGNvbnN0IHN0YXJ0ID0gRGF0ZS5ub3coKTtcbiAgICBjb25zdCBfdGhpcyA9IHRoaXM7XG5cbiAgICBmdW5jdGlvbiBfcmVhZCgpIHtcbiAgICAgIGxldCBhY3RpdmVUYWJsZTtcbiAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoKVxuICAgICAgICAudGhlbihfcmV0cnkoKCkgPT4gX3JlYWRUYWJsZShfdGhpcykpKVxuICAgICAgICAudGhlbihfdGFibGUgPT4ge1xuICAgICAgICAgIGFjdGl2ZVRhYmxlID0gX3RhYmxlO1xuICAgICAgICB9KVxuICAgICAgICAudGhlbigoKSA9PiB7XG4gICAgICAgICAgY29uc3QgbWFwID0gbmV3IE1hcCgpO1xuXG4gICAgICAgICAgY29uc3QgdmFsdWVTdGFydHMgPSBbXTtcbiAgICAgICAgICB2YWx1ZXMoYWN0aXZlVGFibGUubWFwKS5mb3JFYWNoKHZhbHVlID0+IHtcbiAgICAgICAgICAgIHZhbHVlU3RhcnRzLnB1c2goe1xuICAgICAgICAgICAgICBzdGFydDogdmFsdWUuc3RhcnQsXG4gICAgICAgICAgICAgIGVuZDogdmFsdWUuc3RhcnQgKyB2YWx1ZS5zaXplLFxuICAgICAgICAgICAgICB2YWx1ZSxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH0pO1xuICAgICAgICAgIHZhbHVlU3RhcnRzLnNvcnQoKGEsIGIpID0+IGEuc3RhcnQgLSBiLnN0YXJ0KTtcblxuICAgICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICBsZXQgdmFsdWVJbmRleCA9IDA7XG4gICAgICAgICAgICBsZXQgZGVzdEJ1ZmZlciA9IG5ldyBCdWZmZXIoMiAqIDEwMjQgKiAxMDI0KTtcbiAgICAgICAgICAgIGxldCBvZmZzZXQgPSAwO1xuICAgICAgICAgICAgbGV0IGxvZ09mZnNldCA9IDA7XG4gICAgICAgICAgICBjb25zdCBsb2cgPSBfcmVhZExvZyhfdGhpcywgYWN0aXZlVGFibGUpO1xuICAgICAgICAgICAgbG9nLm9uKCdkYXRhJywgZGF0YSA9PiB7XG4gICAgICAgICAgICAgIGlmICh2YWx1ZUluZGV4ID49IHZhbHVlU3RhcnRzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBmb3IgKGxldCBidWZmZXJJbmRleCA9IDA7IGJ1ZmZlckluZGV4IDwgZGF0YS5sZW5ndGg7ICkge1xuICAgICAgICAgICAgICAgIGlmIChidWZmZXJJbmRleCArIGxvZ09mZnNldCA+PSB2YWx1ZVN0YXJ0c1t2YWx1ZUluZGV4XS5lbmQpIHtcbiAgICAgICAgICAgICAgICAgIHZhbHVlSW5kZXgrKztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKHZhbHVlSW5kZXggPj0gdmFsdWVTdGFydHMubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGNvbnN0IHZhbHVlID0gdmFsdWVTdGFydHNbdmFsdWVJbmRleF0udmFsdWU7XG4gICAgICAgICAgICAgICAgaWYgKGJ1ZmZlckluZGV4ICsgbG9nT2Zmc2V0ID49IHZhbHVlLnN0YXJ0KSB7XG4gICAgICAgICAgICAgICAgICBpZiAodmFsdWUuc2l6ZSA+IGRlc3RCdWZmZXIubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG5ld0xlbmd0aCA9IE1hdGgucG93KFxuICAgICAgICAgICAgICAgICAgICAgIDIsXG4gICAgICAgICAgICAgICAgICAgICAgTWF0aC5jZWlsKE1hdGgubG9nKHZhbHVlLnNpemUpIC8gTWF0aC5sb2coMikpLFxuICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgICAgICBkZXN0QnVmZmVyID0gbmV3IEJ1ZmZlcihuZXdMZW5ndGgpO1xuICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICBjb25zdCByZWFkQW1vdW50ID0gTWF0aC5taW4oXG4gICAgICAgICAgICAgICAgICAgIHZhbHVlLnN0YXJ0ICsgdmFsdWUuc2l6ZSAtIGxvZ09mZnNldCAtIGJ1ZmZlckluZGV4LFxuICAgICAgICAgICAgICAgICAgICBhY3RpdmVUYWJsZS5sb2dTaXplIC0gYnVmZmVySW5kZXgsXG4gICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgICAgZGF0YVxuICAgICAgICAgICAgICAgICAgICAuc2xpY2UoYnVmZmVySW5kZXgsIGJ1ZmZlckluZGV4ICsgcmVhZEFtb3VudClcbiAgICAgICAgICAgICAgICAgICAgLmNvcHkoZGVzdEJ1ZmZlci5zbGljZShvZmZzZXQsIG9mZnNldCArIHJlYWRBbW91bnQpKTtcbiAgICAgICAgICAgICAgICAgIGJ1ZmZlckluZGV4ICs9IHJlYWRBbW91bnQ7XG4gICAgICAgICAgICAgICAgICBvZmZzZXQgKz0gcmVhZEFtb3VudDtcblxuICAgICAgICAgICAgICAgICAgaWYgKG9mZnNldCA+PSB2YWx1ZS5zaXplKSB7XG4gICAgICAgICAgICAgICAgICAgIG9mZnNldCA9IDA7XG4gICAgICAgICAgICAgICAgICAgIGlmIChfdGhpcy5hdXRvUGFyc2UpIHtcbiAgICAgICAgICAgICAgICAgICAgICAvLyBjb25zb2xlLmxvZyh2YWx1ZS5zaXplLCBkZXN0QnVmZmVyLnV0ZjhTbGljZSgwLCB2YWx1ZS5zaXplKSlcbiAgICAgICAgICAgICAgICAgICAgICBtYXAuc2V0KFxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWUua2V5LFxuICAgICAgICAgICAgICAgICAgICAgICAgSlNPTi5wYXJzZShkZXN0QnVmZmVyLnV0ZjhTbGljZSgwLCB2YWx1ZS5zaXplKSksXG4gICAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICBtYXAuc2V0KHZhbHVlLmtleSwgZGVzdEJ1ZmZlci51dGY4U2xpY2UoMCwgdmFsdWUuc2l6ZSkpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChidWZmZXJJbmRleCArIGxvZ09mZnNldCA8IHZhbHVlLnN0YXJ0KSB7XG4gICAgICAgICAgICAgICAgICBidWZmZXJJbmRleCArPSB2YWx1ZS5zdGFydCAtIChidWZmZXJJbmRleCArIGxvZ09mZnNldCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGxvZ09mZnNldCArPSBhY3RpdmVUYWJsZS5sb2dTaXplO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBsb2cub24oJ2VuZCcsIHJlc29sdmUpO1xuICAgICAgICAgICAgbG9nLm9uKCdlcnJvcicsIHJlamVjdCk7XG4gICAgICAgICAgfSkudGhlbigoKSA9PiBvYmpGcm9tKG1hcCkpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICByZXR1cm4gX2xvY2soX3RoaXMsIG11c3RMb2NrLCBwcm9taXNlID0+XG4gICAgICBwcm9taXNlLnRoZW4oKCkgPT4gX3JlYWQoKSkuY2F0Y2goZSA9PlxuICAgICAgICBfY2xvc2VMb2coX3RoaXMpLnRoZW4oKCkgPT4ge1xuICAgICAgICAgIHRocm93IGU7XG4gICAgICAgIH0pLFxuICAgICAgKSxcbiAgICApO1xuICB9XG5cbiAgd3JpdGUob3BzLCBtdXN0TG9jaykge1xuICAgIGlmIChvcHMubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCk7XG4gICAgfVxuXG4gICAgY29uc3Qgc3RlcHMgPSAwO1xuICAgIGNvbnN0IF90aGlzID0gdGhpcztcblxuICAgIGxldCBhY3RpdmVUYWJsZTtcbiAgICBsZXQgY29udGVudEJ1ZmZlcjtcbiAgICBsZXQgY29udGVudExlbmd0aDtcbiAgICBmdW5jdGlvbiBfd3JpdGUoKSB7XG4gICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKClcbiAgICAgICAgLnRoZW4oX3JldHJ5KCgpID0+IG1rZGlycChfdGhpcy5wYXRoKSkpXG4gICAgICAgIC50aGVuKF9yZXRyeSgoKSA9PiBfcmVhZFRhYmxlKF90aGlzKSkpXG4gICAgICAgIC50aGVuKF90YWJsZSA9PiB7XG4gICAgICAgICAgYWN0aXZlVGFibGUgPSBtb2RUYWJsZShfdGFibGUpO1xuICAgICAgICAgIGNvbnN0IF9vcHMgPSBvcHMuc2xpY2UoKTtcbiAgICAgICAgICBmdW5jdGlvbiBzdGVwKG9wLCBuZXh0KSB7XG4gICAgICAgICAgICAvLyBzdGVwcysrO1xuICAgICAgICAgICAgLy8gdmFyIG9wID0gX29wcy5zaGlmdCgpO1xuICAgICAgICAgICAgLy8gaWYgKCFvcCkge1xuICAgICAgICAgICAgLy8gICByZXR1cm47XG4gICAgICAgICAgICAvLyB9XG5cbiAgICAgICAgICAgIGxldCBjb250ZW50ID0gb3AudmFsdWU7XG4gICAgICAgICAgICBpZiAoY29udGVudCAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICBpZiAodHlwZW9mIGNvbnRlbnQgIT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICAgICAgY29udGVudCA9IEpTT04uc3RyaW5naWZ5KGNvbnRlbnQpO1xuICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgaWYgKFxuICAgICAgICAgICAgICAgIEJ1ZmZlci5ieXRlTGVuZ3RoICYmXG4gICAgICAgICAgICAgICAgY29udGVudEJ1ZmZlciAmJlxuICAgICAgICAgICAgICAgIEJ1ZmZlci5ieXRlTGVuZ3RoKGNvbnRlbnQpIDw9IGNvbnRlbnRCdWZmZXIubGVuZ3RoXG4gICAgICAgICAgICAgICkge1xuICAgICAgICAgICAgICAgIGNvbnRlbnRMZW5ndGggPSBjb250ZW50QnVmZmVyLnV0ZjhXcml0ZShjb250ZW50KTtcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjb250ZW50QnVmZmVyID0gbmV3IEJ1ZmZlcihjb250ZW50KTtcbiAgICAgICAgICAgICAgICBjb250ZW50TGVuZ3RoID0gY29udGVudEJ1ZmZlci5sZW5ndGg7XG4gICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICBjb25zdCBibG9ja0NvdW50ID0gTWF0aC5jZWlsKFxuICAgICAgICAgICAgICAgICgoYWN0aXZlVGFibGUubmV4dEJ5dGUgJSBhY3RpdmVUYWJsZS5sb2dTaXplKSArIGNvbnRlbnRMZW5ndGgpIC9cbiAgICAgICAgICAgICAgICAgIGFjdGl2ZVRhYmxlLmxvZ1NpemUsXG4gICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgIGxldCBuZXh0Qnl0ZSA9IGFjdGl2ZVRhYmxlLm5leHRCeXRlO1xuICAgICAgICAgICAgICBhY3RpdmVUYWJsZSA9IHB1dEtleShhY3RpdmVUYWJsZSwgb3Aua2V5LCBjb250ZW50TGVuZ3RoKTtcbiAgICAgICAgICAgICAgbGV0IGJ1ZmZlckluZGV4ID0gMDtcblxuICAgICAgICAgICAgICBjb25zdCBidWxrID0gQXJyYXkuZnJvbShuZXcgQXJyYXkoYmxvY2tDb3VudCkpLm1hcCgoXywgaSkgPT4gaSk7XG4gICAgICAgICAgICAgIHJldHVybiBzZXJpYWxGc1Rhc2soYnVsaywgKF8sIG5leHQpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBibG9ja1NsaWNlID0gY29udGVudEJ1ZmZlci5zbGljZShcbiAgICAgICAgICAgICAgICAgIGJ1ZmZlckluZGV4LFxuICAgICAgICAgICAgICAgICAgTWF0aC5taW4oXG4gICAgICAgICAgICAgICAgICAgIGJ1ZmZlckluZGV4ICtcbiAgICAgICAgICAgICAgICAgICAgICAoYWN0aXZlVGFibGUubG9nU2l6ZSAtIChuZXh0Qnl0ZSAlIGFjdGl2ZVRhYmxlLmxvZ1NpemUpKSxcbiAgICAgICAgICAgICAgICAgICAgY29udGVudExlbmd0aCxcbiAgICAgICAgICAgICAgICAgICksXG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICBfYXBwZW5kQmxvY2soX3RoaXMsIGFjdGl2ZVRhYmxlLCBibG9ja1NsaWNlLCBuZXh0Qnl0ZSwgbmV4dCk7XG4gICAgICAgICAgICAgICAgYnVmZmVySW5kZXggKz0gYmxvY2tTbGljZS5sZW5ndGg7XG4gICAgICAgICAgICAgICAgbmV4dEJ5dGUgKz0gYmxvY2tTbGljZS5sZW5ndGg7XG4gICAgICAgICAgICAgIH0pLnRoZW4obmV4dCk7XG5cbiAgICAgICAgICAgICAgLy8gZnVuY3Rpb24gYXBwZW5kKCkge1xuICAgICAgICAgICAgICAvLyAgIGlmIChidWZmZXJJbmRleCA8IGNvbnRlbnRCdWZmZXIubGVuZ3RoKSB7XG4gICAgICAgICAgICAgIC8vICAgICB2YXIgYmxvY2tTbGljZSA9IGNvbnRlbnRCdWZmZXIuc2xpY2UoYnVmZmVySW5kZXgsIGJ1ZmZlckluZGV4ICsgYWN0aXZlVGFibGUuYmxvY2tTaXplKTtcbiAgICAgICAgICAgICAgLy8gICAgIGJ1ZmZlckluZGV4ICs9IGFjdGl2ZVRhYmxlLmJsb2NrU2l6ZTtcbiAgICAgICAgICAgICAgLy8gICAgIHJldHVybiBfYXBwZW5kQmxvY2soX3RoaXMsIGFjdGl2ZVRhYmxlLCBibG9ja1NsaWNlLCBuZXh0Qnl0ZSsrKVxuICAgICAgICAgICAgICAvLyAgICAgLnRoZW4oYXBwZW5kKTtcbiAgICAgICAgICAgICAgLy8gICB9XG4gICAgICAgICAgICAgIC8vIH1cbiAgICAgICAgICAgICAgLy8gcmV0dXJuIGFwcGVuZCgpXG4gICAgICAgICAgICAgIC8vIC50aGVuKHN0ZXApO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgYWN0aXZlVGFibGUgPSBkZWxLZXkoYWN0aXZlVGFibGUsIG9wLmtleSk7XG4gICAgICAgICAgICAgIG5leHQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG5cbiAgICAgICAgICByZXR1cm4gc2VyaWFsRnNUYXNrKF9vcHMsIHN0ZXApO1xuXG4gICAgICAgICAgLy8gcmV0dXJuIHN0ZXAoKTtcbiAgICAgICAgfSlcbiAgICAgICAgLnRoZW4oKCkgPT4gX2Nsb3NlTG9nKF90aGlzKSlcbiAgICAgICAgLnRoZW4oXG4gICAgICAgICAgX3JldHJ5KCgpID0+IHtcbiAgICAgICAgICAgIGFjdGl2ZVRhYmxlID0gdGFibGUoYWN0aXZlVGFibGUpO1xuICAgICAgICAgICAgcmV0dXJuIF93cml0ZVRhYmxlKF90aGlzLCBhY3RpdmVUYWJsZSk7XG4gICAgICAgICAgfSksXG4gICAgICAgICk7XG4gICAgfVxuXG4gICAgcmV0dXJuIF9sb2NrKF90aGlzLCBtdXN0TG9jaywgcHJvbWlzZSA9PlxuICAgICAgcHJvbWlzZVxuICAgICAgICAudGhlbigoKSA9PiBfd3JpdGUoKSlcbiAgICAgICAgLmNhdGNoKGUgPT5cbiAgICAgICAgICBfY2xvc2VMb2coX3RoaXMpLnRoZW4oKCkgPT4ge1xuICAgICAgICAgICAgdGhyb3cgZTtcbiAgICAgICAgICB9KSxcbiAgICAgICAgKVxuICAgICAgICAudGhlbigoKSA9PiB7XG4gICAgICAgICAgaWYgKFxuICAgICAgICAgICAgX3NpemVVc2VkKF90aGlzLCBhY3RpdmVUYWJsZSkgPiBfY29tcGFjdFNpemUoX3RoaXMsIGFjdGl2ZVRhYmxlKVxuICAgICAgICAgICkge1xuICAgICAgICAgICAgcmV0dXJuIF90aGlzLmNvbXBhY3QoZmFsc2UpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSksXG4gICAgKTtcbiAgfVxuXG4gIGNvbXBhY3QobXVzdExvY2spIHtcbiAgICBjb25zdCBfdGhpcyA9IHRoaXM7XG5cbiAgICByZXR1cm4gX3RoaXNcbiAgICAgIC5yZWFkKG11c3RMb2NrKVxuICAgICAgLnRoZW4obWFwID0+IHtcbiAgICAgICAgY29uc3Qgb3BzID0gW107XG4gICAgICAgIE9iamVjdC5rZXlzKG1hcCkuZm9yRWFjaChrZXkgPT4ge1xuICAgICAgICAgIG9wcy5wdXNoKHtcbiAgICAgICAgICAgIGtleSxcbiAgICAgICAgICAgIHZhbHVlOiBtYXBba2V5XSxcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBvcHM7XG4gICAgICB9KVxuICAgICAgLnRoZW4ob3BzID0+XG4gICAgICAgIHJpbXJhZihgJHtfdGhpcy5wYXRofX5gKVxuICAgICAgICAgIC50aGVuKHRpbWVvdXQxMDApXG4gICAgICAgICAgLnRoZW4oKCkgPT4gb3BzKSxcbiAgICAgIClcbiAgICAgIC50aGVuKG9wcyA9PiB7XG4gICAgICAgIGNvbnN0IGNvcHkgPSBuZXcgQXBwZW5kU2VyaWFsaXplcih7XG4gICAgICAgICAgY2FjaGVEaXJQYXRoOiBgJHtfdGhpcy5wYXRofX5gLFxuXG4gICAgICAgICAgYmxvY2tTaXplOiBfdGhpcy5ibG9ja1NpemUsXG4gICAgICAgICAgbG9nU2l6ZTogX3RoaXMubG9nU2l6ZSxcbiAgICAgICAgICBjb21wYWN0U2l6ZVRocmVzaG9sZDogX3RoaXMuY29tcGFjdFNpemVUaHJlc2hvbGQsXG4gICAgICAgICAgY29tcGFjdE11bHRpcGxpZXJUaHJlc2hvbGQ6IF90aGlzLmNvbXBhY3RNdWx0aXBsaWVyVGhyZXNob2xkLFxuICAgICAgICB9KTtcblxuICAgICAgICByZXR1cm4gX2xvY2soX3RoaXMsIG11c3RMb2NrLCBwcm9taXNlID0+XG4gICAgICAgICAgcHJvbWlzZVxuICAgICAgICAgICAgLnRoZW4oKCkgPT4gY29weS53cml0ZShvcHMpKVxuICAgICAgICAgICAgLnRoZW4oKCkgPT4gcmltcmFmKF90aGlzLnBhdGgpKVxuICAgICAgICAgICAgLnRoZW4odGltZW91dDEwMClcbiAgICAgICAgICAgIC50aGVuKF9yZXRyeSgoKSA9PiByZW5hbWUoY29weS5wYXRoLCBfdGhpcy5wYXRoKSwgMTApKSxcbiAgICAgICAgKTtcbiAgICAgIH0pO1xuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gQXBwZW5kU2VyaWFsaXplcjtcbiJdLCJzb3VyY2VSb290IjoiL1VzZXJzL3R5bGVyYXJidXMvZGV2L3Byb3ZpZGVyL3NyYyJ9

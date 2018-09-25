'use strict';

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

const { readdir: _readdir, stat: _stat } = require('fs');
const { basename, join } = require('path');

const _rimraf = require('rimraf');

const logMessages = require('./util/log-messages');
const pluginCompat = require('./util/plugin-compat');
const promisify = require('./util/promisify');

const readdir = promisify(_readdir);
const rimraf = promisify(_rimraf);
const stat = promisify(_stat);

const directorySize = (() => {
  var _ref = _asyncToGenerator(function* (dir) {
    const _stat = yield stat(dir);
    if (_stat.isFile()) {
      return _stat.size;
    }

    if (_stat.isDirectory()) {
      const names = yield readdir(dir);
      let size = 0;
      for (const name of names) {
        size += yield directorySize(join(dir, name));
      }
      return size;
    }

    return 0;
  });

  return function directorySize(_x) {
    return _ref.apply(this, arguments);
  };
})();

class CacheInfo {
  constructor(id = '') {
    this.id = id;
    this.lastModified = 0;
    this.size = 0;
  }

  static fromDirectory(dir) {
    return _asyncToGenerator(function* () {
      const info = new CacheInfo(basename(dir));
      info.lastModified = new Date((yield stat(join(dir, 'stamp'))).mtime).getTime();
      info.size = yield directorySize(dir);
      return info;
    })();
  }

  static fromDirectoryChildren(dir) {
    return _asyncToGenerator(function* () {
      const children = [];
      const names = yield readdir(dir);
      for (const name of names) {
        children.push((yield CacheInfo.fromDirectory(join(dir, name))));
      }
      return children;
    })();
  }
}

// Compilers for webpack with multiple parallel configurations might try to
// delete caches at the same time. Mutex lock the process of pruning to keep
// from multiple pruning runs from colliding with each other.
let deleteLock = null;

class PruneCachesSystem {
  constructor(cacheRoot, options = {}) {
    this.cacheRoot = cacheRoot;

    this.options = Object.assign({
      // Caches younger than `maxAge` are not considered for deletion. They
      // must be at least this (default: 2 days) old in milliseconds.
      maxAge: 2 * 24 * 60 * 60 * 1000,
      // All caches together must be larger than `sizeThreshold` before any
      // caches will be deleted. Together they must be at least this
      // (default: 50 MB) big in bytes.
      sizeThreshold: 50 * 1024 * 1024
    }, options);
  }

  apply(compiler) {
    var _this = this;

    const compilerHooks = pluginCompat.hooks(compiler);

    const deleteOldCaches = (() => {
      var _ref2 = _asyncToGenerator(function* () {
        while (deleteLock !== null) {
          yield deleteLock;
        }

        let resolveLock;

        let infos;
        try {
          deleteLock = new Promise(function (resolve) {
            resolveLock = resolve;
          });

          infos = yield CacheInfo.fromDirectoryChildren(_this.cacheRoot);

          // Sort lastModified in descending order. More recently modified at the
          // beginning of the array.
          infos.sort(function (a, b) {
            return b.lastModified - a.lastModified;
          });

          const totalSize = infos.reduce(function (carry, info) {
            return carry + info.size;
          }, 0);
          const oldInfos = infos.filter(function (info) {
            return info.lastModified < Date.now() - _this.options.maxAge;
          });
          const oldTotalSize = oldInfos.reduce(function (carry, info) {
            return carry + info.size;
          }, 0);

          if (oldInfos.length > 0 && totalSize > _this.options.sizeThreshold) {
            const newInfos = infos.filter(function (info) {
              return info.lastModified >= Date.now() - _this.options.maxAge;
            });

            for (const info of oldInfos) {
              rimraf(join(_this.cacheRoot, info.id));
            }

            const newTotalSize = newInfos.reduce(function (carry, info) {
              return carry + info.size;
            }, 0);

            logMessages.deleteOldCaches(compiler, {
              infos,
              totalSize,
              newInfos,
              newTotalSize,
              oldInfos,
              oldTotalSize
            });
          } else {
            logMessages.keepCaches(compiler, {
              infos,
              totalSize
            });
          }
        } catch (error) {
          if (error.code !== 'ENOENT') {
            throw error;
          }
        } finally {
          if (typeof resolveLock === 'function') {
            deleteLock = null;
            resolveLock();
          }
        }
      });

      return function deleteOldCaches() {
        return _ref2.apply(this, arguments);
      };
    })();

    compilerHooks.watchRun.tapPromise('HardSource - PruneCachesSystem', deleteOldCaches);
    compilerHooks.run.tapPromise('HardSource - PruneCachesSystem', deleteOldCaches);
  }
}

module.exports = PruneCachesSystem;
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImhhcmQtc291cmNlLXdlYnBhY2stcGx1Z2luL2xpYi9TeXN0ZW1QcnVuZUNhY2hlcy5qcyJdLCJuYW1lcyI6WyJyZWFkZGlyIiwiX3JlYWRkaXIiLCJzdGF0IiwiX3N0YXQiLCJyZXF1aXJlIiwiYmFzZW5hbWUiLCJqb2luIiwiX3JpbXJhZiIsImxvZ01lc3NhZ2VzIiwicGx1Z2luQ29tcGF0IiwicHJvbWlzaWZ5IiwicmltcmFmIiwiZGlyZWN0b3J5U2l6ZSIsImRpciIsImlzRmlsZSIsInNpemUiLCJpc0RpcmVjdG9yeSIsIm5hbWVzIiwibmFtZSIsIkNhY2hlSW5mbyIsImNvbnN0cnVjdG9yIiwiaWQiLCJsYXN0TW9kaWZpZWQiLCJmcm9tRGlyZWN0b3J5IiwiaW5mbyIsIkRhdGUiLCJtdGltZSIsImdldFRpbWUiLCJmcm9tRGlyZWN0b3J5Q2hpbGRyZW4iLCJjaGlsZHJlbiIsInB1c2giLCJkZWxldGVMb2NrIiwiUHJ1bmVDYWNoZXNTeXN0ZW0iLCJjYWNoZVJvb3QiLCJvcHRpb25zIiwiT2JqZWN0IiwiYXNzaWduIiwibWF4QWdlIiwic2l6ZVRocmVzaG9sZCIsImFwcGx5IiwiY29tcGlsZXIiLCJjb21waWxlckhvb2tzIiwiaG9va3MiLCJkZWxldGVPbGRDYWNoZXMiLCJyZXNvbHZlTG9jayIsImluZm9zIiwiUHJvbWlzZSIsInJlc29sdmUiLCJzb3J0IiwiYSIsImIiLCJ0b3RhbFNpemUiLCJyZWR1Y2UiLCJjYXJyeSIsIm9sZEluZm9zIiwiZmlsdGVyIiwibm93Iiwib2xkVG90YWxTaXplIiwibGVuZ3RoIiwibmV3SW5mb3MiLCJuZXdUb3RhbFNpemUiLCJrZWVwQ2FjaGVzIiwiZXJyb3IiLCJjb2RlIiwid2F0Y2hSdW4iLCJ0YXBQcm9taXNlIiwicnVuIiwibW9kdWxlIiwiZXhwb3J0cyJdLCJtYXBwaW5ncyI6Ijs7OztBQUFBLE1BQU0sRUFBRUEsU0FBU0MsUUFBWCxFQUFxQkMsTUFBTUMsS0FBM0IsS0FBcUNDLFFBQVEsSUFBUixDQUEzQztB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SyxNQUFNYixJQUFYLElBQW1COEIsUUFBbkIsRUFBNkI7QUFDM0IzQyxxQkFBT0wsS0FBSyxNQUFLMkIsU0FBVixFQUFxQlQsS0FBS0gsRUFBMUIsQ0FBUDtBQUNEOztBQUVELGtCQUFNdUMsZUFBZUQsU0FBU1AsTUFBVCxDQUNuQixVQUFDQyxLQUFELEVBQVE3QixJQUFSO0FBQUEscUJBQWlCNkIsUUFBUTdCLEtBQUtULElBQTlCO0FBQUEsYUFEbUIsRUFFbkIsQ0FGbUIsQ0FBckI7O0FBS0FQLHdCQUFZbUMsZUFBWixDQUE0QkgsUUFBNUIsRUFBc0M7QUFDcENLLG1CQURvQztBQUVwQ00sdUJBRm9DO0FBR3BDUSxzQkFIb0M7QUFJcENDLDBCQUpvQztBQUtwQ04sc0JBTG9DO0FBTXBDRztBQU5vQyxhQUF0QztBQVFELFdBdEJELE1Bc0JPO0FBQ0xqRCx3QkFBWXFELFVBQVosQ0FBdUJyQixRQUF2QixFQUFpQztBQUMvQkssbUJBRCtCO0FBRS9CTTtBQUYrQixhQUFqQztBQUlEO0FBQ0YsU0FoREQsQ0FnREUsT0FBT1csS0FBUCxFQUFjO0FBQ2QsY0FBSUEsTUFBTUMsSUFBTixLQUFlLFFBQW5CLEVBQTZCO0FBQzNCLGtCQUFNRCxLQUFOO0FBQ0Q7QUFDRixTQXBERCxTQW9EVTtBQUNSLGNBQUksT0FBT2xCLFdBQVAsS0FBdUIsVUFBM0IsRUFBdUM7QUFDckNiLHlCQUFhLElBQWI7QUFDQWE7QUFDRDtBQUNGO0FBQ0YsT0FsRUs7O0FBQUE7QUFBQTtBQUFBO0FBQUEsUUFBTjs7QUFvRUFILGtCQUFjdUIsUUFBZCxDQUF1QkMsVUFBdkIsQ0FDRSxnQ0FERixFQUVFdEIsZUFGRjtBQUlBRixrQkFBY3lCLEdBQWQsQ0FBa0JELFVBQWxCLENBQ0UsZ0NBREYsRUFFRXRCLGVBRkY7QUFJRDtBQWpHcUI7O0FBb0d4QndCLE9BQU9DLE9BQVAsR0FBaUJwQyxpQkFBakIiLCJmaWxlIjoiaGFyZC1zb3VyY2Utd2VicGFjay1wbHVnaW4vbGliL1N5c3RlbVBydW5lQ2FjaGVzLmpzIiwic291cmNlc0NvbnRlbnQiOlsiY29uc3QgeyByZWFkZGlyOiBfcmVhZGRpciwgc3RhdDogX3N0YXQgfSA9IHJlcXVpcmUoJ2ZzJyk7XG5jb25zdCB7IGJhc2VuYW1lLCBqb2luIH0gPSByZXF1aXJlKCdwYXRoJyk7XG5cbmNvbnN0IF9yaW1yYWYgPSByZXF1aXJlKCdyaW1yYWYnKTtcblxuY29uc3QgbG9nTWVzc2FnZXMgPSByZXF1aXJlKCcuL3V0aWwvbG9nLW1lc3NhZ2VzJyk7XG5jb25zdCBwbHVnaW5Db21wYXQgPSByZXF1aXJlKCcuL3V0aWwvcGx1Z2luLWNvbXBhdCcpO1xuY29uc3QgcHJvbWlzaWZ5ID0gcmVxdWlyZSgnLi91dGlsL3Byb21pc2lmeScpO1xuXG5jb25zdCByZWFkZGlyID0gcHJvbWlzaWZ5KF9yZWFkZGlyKTtcbmNvbnN0IHJpbXJhZiA9IHByb21pc2lmeShfcmltcmFmKTtcbmNvbnN0IHN0YXQgPSBwcm9taXNpZnkoX3N0YXQpO1xuXG5jb25zdCBkaXJlY3RvcnlTaXplID0gYXN5bmMgZGlyID0+IHtcbiAgY29uc3QgX3N0YXQgPSBhd2FpdCBzdGF0KGRpcik7XG4gIGlmIChfc3RhdC5pc0ZpbGUoKSkge1xuICAgIHJldHVybiBfc3RhdC5zaXplO1xuICB9XG5cbiAgaWYgKF9zdGF0LmlzRGlyZWN0b3J5KCkpIHtcbiAgICBjb25zdCBuYW1lcyA9IGF3YWl0IHJlYWRkaXIoZGlyKTtcbiAgICBsZXQgc2l6ZSA9IDA7XG4gICAgZm9yIChjb25zdCBuYW1lIG9mIG5hbWVzKSB7XG4gICAgICBzaXplICs9IGF3YWl0IGRpcmVjdG9yeVNpemUoam9pbihkaXIsIG5hbWUpKTtcbiAgICB9XG4gICAgcmV0dXJuIHNpemU7XG4gIH1cblxuICByZXR1cm4gMDtcbn07XG5cbmNsYXNzIENhY2hlSW5mbyB7XG4gIGNvbnN0cnVjdG9yKGlkID0gJycpIHtcbiAgICB0aGlzLmlkID0gaWQ7XG4gICAgdGhpcy5sYXN0TW9kaWZpZWQgPSAwO1xuICAgIHRoaXMuc2l6ZSA9IDA7XG4gIH1cblxuICBzdGF0aWMgYXN5bmMgZnJvbURpcmVjdG9yeShkaXIpIHtcbiAgICBjb25zdCBpbmZvID0gbmV3IENhY2hlSW5mbyhiYXNlbmFtZShkaXIpKTtcbiAgICBpbmZvLmxhc3RNb2RpZmllZCA9IG5ldyBEYXRlKFxuICAgICAgKGF3YWl0IHN0YXQoam9pbihkaXIsICdzdGFtcCcpKSkubXRpbWUsXG4gICAgKS5nZXRUaW1lKCk7XG4gICAgaW5mby5zaXplID0gYXdhaXQgZGlyZWN0b3J5U2l6ZShkaXIpO1xuICAgIHJldHVybiBpbmZvO1xuICB9XG5cbiAgc3RhdGljIGFzeW5jIGZyb21EaXJlY3RvcnlDaGlsZHJlbihkaXIpIHtcbiAgICBjb25zdCBjaGlsZHJlbiA9IFtdO1xuICAgIGNvbnN0IG5hbWVzID0gYXdhaXQgcmVhZGRpcihkaXIpO1xuICAgIGZvciAoY29uc3QgbmFtZSBvZiBuYW1lcykge1xuICAgICAgY2hpbGRyZW4ucHVzaChhd2FpdCBDYWNoZUluZm8uZnJvbURpcmVjdG9yeShqb2luKGRpciwgbmFtZSkpKTtcbiAgICB9XG4gICAgcmV0dXJuIGNoaWxkcmVuO1xuICB9XG59XG5cbi8vIENvbXBpbGVycyBmb3Igd2VicGFjayB3aXRoIG11bHRpcGxlIHBhcmFsbGVsIGNvbmZpZ3VyYXRpb25zIG1pZ2h0IHRyeSB0b1xuLy8gZGVsZXRlIGNhY2hlcyBhdCB0aGUgc2FtZSB0aW1lLiBNdXRleCBsb2NrIHRoZSBwcm9jZXNzIG9mIHBydW5pbmcgdG8ga2VlcFxuLy8gZnJvbSBtdWx0aXBsZSBwcnVuaW5nIHJ1bnMgZnJvbSBjb2xsaWRpbmcgd2l0aCBlYWNoIG90aGVyLlxubGV0IGRlbGV0ZUxvY2sgPSBudWxsO1xuXG5jbGFzcyBQcnVuZUNhY2hlc1N5c3RlbSB7XG4gIGNvbnN0cnVjdG9yKGNhY2hlUm9vdCwgb3B0aW9ucyA9IHt9KSB7XG4gICAgdGhpcy5jYWNoZVJvb3QgPSBjYWNoZVJvb3Q7XG5cbiAgICB0aGlzLm9wdGlvbnMgPSBPYmplY3QuYXNzaWduKFxuICAgICAge1xuICAgICAgICAvLyBDYWNoZXMgeW91bmdlciB0aGFuIGBtYXhBZ2VgIGFyZSBub3QgY29uc2lkZXJlZCBmb3IgZGVsZXRpb24uIFRoZXlcbiAgICAgICAgLy8gbXVzdCBiZSBhdCBsZWFzdCB0aGlzIChkZWZhdWx0OiAyIGRheXMpIG9sZCBpbiBtaWxsaXNlY29uZHMuXG4gICAgICAgIG1heEFnZTogMiAqIDI0ICogNjAgKiA2MCAqIDEwMDAsXG4gICAgICAgIC8vIEFsbCBjYWNoZXMgdG9nZXRoZXIgbXVzdCBiZSBsYXJnZXIgdGhhbiBgc2l6ZVRocmVzaG9sZGAgYmVmb3JlIGFueVxuICAgICAgICAvLyBjYWNoZXMgd2lsbCBiZSBkZWxldGVkLiBUb2dldGhlciB0aGV5IG11c3QgYmUgYXQgbGVhc3QgdGhpc1xuICAgICAgICAvLyAoZGVmYXVsdDogNTAgTUIpIGJpZyBpbiBieXRlcy5cbiAgICAgICAgc2l6ZVRocmVzaG9sZDogNTAgKiAxMDI0ICogMTAyNCxcbiAgICAgIH0sXG4gICAgICBvcHRpb25zLFxuICAgICk7XG4gIH1cblxuICBhcHBseShjb21waWxlcikge1xuICAgIGNvbnN0IGNvbXBpbGVySG9va3MgPSBwbHVnaW5Db21wYXQuaG9va3MoY29tcGlsZXIpO1xuXG4gICAgY29uc3QgZGVsZXRlT2xkQ2FjaGVzID0gYXN5bmMgKCkgPT4ge1xuICAgICAgd2hpbGUgKGRlbGV0ZUxvY2sgIT09IG51bGwpIHtcbiAgICAgICAgYXdhaXQgZGVsZXRlTG9jaztcbiAgICAgIH1cblxuICAgICAgbGV0IHJlc29sdmVMb2NrO1xuXG4gICAgICBsZXQgaW5mb3M7XG4gICAgICB0cnkge1xuICAgICAgICBkZWxldGVMb2NrID0gbmV3IFByb21pc2UocmVzb2x2ZSA9PiB7XG4gICAgICAgICAgcmVzb2x2ZUxvY2sgPSByZXNvbHZlO1xuICAgICAgICB9KTtcblxuICAgICAgICBpbmZvcyA9IGF3YWl0IENhY2hlSW5mby5mcm9tRGlyZWN0b3J5Q2hpbGRyZW4odGhpcy5jYWNoZVJvb3QpO1xuXG4gICAgICAgIC8vIFNvcnQgbGFzdE1vZGlmaWVkIGluIGRlc2NlbmRpbmcgb3JkZXIuIE1vcmUgcmVjZW50bHkgbW9kaWZpZWQgYXQgdGhlXG4gICAgICAgIC8vIGJlZ2lubmluZyBvZiB0aGUgYXJyYXkuXG4gICAgICAgIGluZm9zLnNvcnQoKGEsIGIpID0+IGIubGFzdE1vZGlmaWVkIC0gYS5sYXN0TW9kaWZpZWQpO1xuXG4gICAgICAgIGNvbnN0IHRvdGFsU2l6ZSA9IGluZm9zLnJlZHVjZSgoY2FycnksIGluZm8pID0+IGNhcnJ5ICsgaW5mby5zaXplLCAwKTtcbiAgICAgICAgY29uc3Qgb2xkSW5mb3MgPSBpbmZvcy5maWx0ZXIoXG4gICAgICAgICAgaW5mbyA9PiBpbmZvLmxhc3RNb2RpZmllZCA8IERhdGUubm93KCkgLSB0aGlzLm9wdGlvbnMubWF4QWdlLFxuICAgICAgICApO1xuICAgICAgICBjb25zdCBvbGRUb3RhbFNpemUgPSBvbGRJbmZvcy5yZWR1Y2UoXG4gICAgICAgICAgKGNhcnJ5LCBpbmZvKSA9PiBjYXJyeSArIGluZm8uc2l6ZSxcbiAgICAgICAgICAwLFxuICAgICAgICApO1xuXG4gICAgICAgIGlmIChvbGRJbmZvcy5sZW5ndGggPiAwICYmIHRvdGFsU2l6ZSA+IHRoaXMub3B0aW9ucy5zaXplVGhyZXNob2xkKSB7XG4gICAgICAgICAgY29uc3QgbmV3SW5mb3MgPSBpbmZvcy5maWx0ZXIoXG4gICAgICAgICAgICBpbmZvID0+IGluZm8ubGFzdE1vZGlmaWVkID49IERhdGUubm93KCkgLSB0aGlzLm9wdGlvbnMubWF4QWdlLFxuICAgICAgICAgICk7XG5cbiAgICAgICAgICBmb3IgKGNvbnN0IGluZm8gb2Ygb2xkSW5mb3MpIHtcbiAgICAgICAgICAgIHJpbXJhZihqb2luKHRoaXMuY2FjaGVSb290LCBpbmZvLmlkKSk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgY29uc3QgbmV3VG90YWxTaXplID0gbmV3SW5mb3MucmVkdWNlKFxuICAgICAgICAgICAgKGNhcnJ5LCBpbmZvKSA9PiBjYXJyeSArIGluZm8uc2l6ZSxcbiAgICAgICAgICAgIDAsXG4gICAgICAgICAgKTtcblxuICAgICAgICAgIGxvZ01lc3NhZ2VzLmRlbGV0ZU9sZENhY2hlcyhjb21waWxlciwge1xuICAgICAgICAgICAgaW5mb3MsXG4gICAgICAgICAgICB0b3RhbFNpemUsXG4gICAgICAgICAgICBuZXdJbmZvcyxcbiAgICAgICAgICAgIG5ld1RvdGFsU2l6ZSxcbiAgICAgICAgICAgIG9sZEluZm9zLFxuICAgICAgICAgICAgb2xkVG90YWxTaXplLFxuICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGxvZ01lc3NhZ2VzLmtlZXBDYWNoZXMoY29tcGlsZXIsIHtcbiAgICAgICAgICAgIGluZm9zLFxuICAgICAgICAgICAgdG90YWxTaXplLFxuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICBpZiAoZXJyb3IuY29kZSAhPT0gJ0VOT0VOVCcpIHtcbiAgICAgICAgICB0aHJvdyBlcnJvcjtcbiAgICAgICAgfVxuICAgICAgfSBmaW5hbGx5IHtcbiAgICAgICAgaWYgKHR5cGVvZiByZXNvbHZlTG9jayA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgIGRlbGV0ZUxvY2sgPSBudWxsO1xuICAgICAgICAgIHJlc29sdmVMb2NrKCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9O1xuXG4gICAgY29tcGlsZXJIb29rcy53YXRjaFJ1bi50YXBQcm9taXNlKFxuICAgICAgJ0hhcmRTb3VyY2UgLSBQcnVuZUNhY2hlc1N5c3RlbScsXG4gICAgICBkZWxldGVPbGRDYWNoZXMsXG4gICAgKTtcbiAgICBjb21waWxlckhvb2tzLnJ1bi50YXBQcm9taXNlKFxuICAgICAgJ0hhcmRTb3VyY2UgLSBQcnVuZUNhY2hlc1N5c3RlbScsXG4gICAgICBkZWxldGVPbGRDYWNoZXMsXG4gICAgKTtcbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFBydW5lQ2FjaGVzU3lzdGVtO1xuIl0sInNvdXJjZVJvb3QiOiIvVXNlcnMvdHlsZXJhcmJ1cy9kZXYvcHJvdmlkZXIvc3JjIn0=

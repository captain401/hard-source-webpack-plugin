'use strict';

var fs = require('fs');
var path = require('path');
var vm = require('vm');

var expect = require('chai').expect;
var MemoryFS = require('memory-fs');

var dataSerializer = require('../../lib/CacheSerializerFactory').dataSerializer;

var mkdirp = require('mkdirp');
var rimraf = require('rimraf');
var webpack = require('webpack');
var mkdirp = require('mkdirp');

var isWebpack4 = require('webpack/package.json').version[0] >= 4;

function promisify(f, o) {
  var ctx = o && o.context || null;
  return function () {
    var args = Array.from(arguments);
    return new Promise(function (resolve, reject) {
      args.push(function (err, value) {
        if (err) {
          return reject(err);
        }
        return resolve(value);
      });
      f.apply(ctx, args);
    });
  };
}

function wrapModule(code) {
  return '(function(exports, require, module, __filename, __dirname) {' + code + '})';
}

function callModule(fn, filename) {
  var module = { exports: {} };
  fn(module.exports, Object.assign(function (modulename) {
    if (/\W/.test(modulename[0])) {
      return require(path.join(path.dirname(filename), modulename));
    }
    return require(modulename);
  }, require), module, filename, path.dirname(filename));
  return module.exports;
}

exports.compile = function (fixturePath, options) {
  var configPath = path.join(__dirname, '..', 'fixtures', fixturePath, 'webpack.config.js');
  var compiler = (options || {}).compiler || webpack(Object.assign(isWebpack4 ? {
    mode: 'development'
  } : {}, callModule(vm.runInThisContext(wrapModule(fs.readFileSync(configPath, 'utf8')), { filename: configPath }), configPath)));

  compiler.inputFileSystem.purge();
  var outputfs = compiler.outputFileSystem = new MemoryFS();

  var readdir = promisify(outputfs.readdir, { context: outputfs });
  var readFile = promisify(outputfs.readFile, { context: outputfs });
  var stat = promisify(outputfs.stat, { context: outputfs });
  var fsReaddir = promisify(fs.readdir, { context: fs });
  var fsReadFile = promisify(fs.readFile, { context: fs });
  var fsStat = promisify(fs.stat, { context: fs });
  var run = promisify(compiler.run, { context: compiler });
  var watching = options && options.watching;
  var _watch = function () {
    return new Promise(function (resolve, reject) {
      watching = compiler.watch({}, function (err, stats) {
        if (err) {
          return reject(err);
        }
        resolve(stats);
      });
    });
  };
  var watchStart = _watch;
  var watchStop = function () {
    return new Promise(function (resolve, reject) {
      watching.close(function (err, stats) {
        watching = null;
        if (err) {
          return reject(err);
        }
        resolve(stats);
      });
    });
  };
  var watchStartStop = function () {
    return _watch().then(function (stats) {
      watching.close();
      watching = null;
      return stats;
    });
  };
  var watchContinue = function () {
    return new Promise(function (resolve, reject) {
      watching.handler = function (err, stats) {
        if (err) {
          return reject(err);
        }
        resolve(stats);
      };
    });
  };

  var start;
  if (options && options.watch) {
    switch (options.watch) {
      case 'start':
        start = watchStart();
        break;
      case 'stop':
        start = watchStop();
        break;
      case 'startStop':
        start = watchStartStop();
        break;
      case 'continue':
        start = watchContinue();
        break;
    }
  } else {
    start = run();
  }

  return start.then(function (stats) {
    return Promise.all([readdir(compiler.options.output.path).catch(function () {
      return [];
    }).then(function (value) {
      return Promise.all(value.map(function (name) {
        var fullname = path.join(compiler.options.output.path, name);
        return stat(fullname).then(function (stat) {
          if (stat.isFile()) {
            return readFile(fullname, fullname.endsWith('.js') ? 'utf8' : '').then(function (file) {
              return [name, file];
            });
          }
        });
      }));
    }), fsReaddir(compiler.options.output.path).catch(function () {
      return [];
    }).then(function (value) {
      return Promise.all(value.map(function (name) {
        var fullname = path.join(compiler.options.output.path, name);
        return fsStat(fullname).then(function (stat) {
          if (stat.isFile()) {
            return fsReadFile(fullname, fullname.endsWith('.js') ? 'utf8' : '').then(function (file) {
              return [name, file];
            });
          }
        });
      }));
    })]).then(function (files) {
      return files[0].concat(files[1]);
    }).then(function (_value) {
      var promise = Promise.resolve({});
      _value.forEach(function (values) {
        promise = promise.then(function (carry) {
          if (values) {
            carry[values[0]] = values[1];
          }
          return carry;
        });
      });
      return promise;
    }).then(function (carry) {
      if (options && options.exportStats) {
        var statsJson = stats.toJson({
          errors: true,
          warnings: true
        });
        return {
          out: carry,
          warnings: statsJson.warnings,
          errors: statsJson.errors
        };
      }
      if (options && options.exportCompilation) {
        return {
          out: carry,
          compilation: stats.compilation,
          compiler: stats.compilation.compiler
        };
      }
      if (options && options.watch) {
        return {
          out: carry,
          watching: watching
        };
      } else {
        return carry;
      }
    });
  });
};

exports.compileTwiceEqual = function (fixturePath, compileOptions) {
  var run1 = exports.compile(fixturePath, compileOptions);
  return run1.then(function () {
    var run2 = exports.compile(fixturePath, compileOptions);
    return Promise.all([run1, run2]);
  }).then(function (runs) {
    expect(runs[0]).to.eql(runs[1]);
  });
};

exports.itCompilesTwice = function (fixturePath, compileOptions) {
  // before(function() {
  //   return exports.clean(fixturePath);
  // });

  var exportSuffix = '';
  if (compileOptions && compileOptions.exportStats) {
    exportSuffix = ' [exportStats]';
  }
  it('builds identical ' + fixturePath + ' fixture' + exportSuffix, function () {
    this.timeout(30000);
    return exports.clean(fixturePath).then(function () {
      return exports.compileTwiceEqual(fixturePath, compileOptions);
    });
  });
};

exports.itCompilesTwice.skipIf = function (features) {
  return function (fixturePath, compileOptions) {
    if (features.every(f => f)) {
      return exports.itCompilesTwice(fixturePath, compileOptions);
    } else {
      var exportSuffix = '';
      if (compileOptions && compileOptions.exportStats) {
        exportSuffix = ' [exportStats]';
      }
      return it.skip('builds identical ' + fixturePath + ' fixture' + exportSuffix);
    }
  };
};

exports.writeFiles = function (fixturePath, files) {
  var configPath = path.join(__dirname, '..', 'fixtures', fixturePath);

  fsUnlink = promisify(fs.unlink, { context: fs });
  _fsWriteFile = promisify(fs.writeFile, { context: fs });
  fsMkdirp = promisify(mkdirp);
  fsWriteFile = function (file, content, encode) {
    return fsMkdirp(path.dirname(file)).then(function () {
      return _fsWriteFile(file, content, encode);
    });
  };
  fsRimraf = promisify(rimraf);

  return Promise.all(Object.keys(files).map(function (key) {
    if (files[key] === null) {
      return fsRimraf(path.join(configPath, key)).catch(function () {});
    }
    return fsWriteFile(path.join(configPath, key), files[key]);
  }));
};

exports.readFiles = function (outputPath) {
  outputPath = path.join(__dirname, '..', 'fixtures', outputPath);

  var fsReaddir = promisify(fs.readdir, { context: fs });
  var fsReadFile = promisify(fs.readFile, { context: fs });
  var fsStat = promisify(fs.stat, { context: fs });

  return fsReaddir(outputPath).catch(function () {
    return [];
  }).then(function (value) {
    return Promise.all(value.map(function (name) {
      var fullname = path.join(outputPath, name);
      return fsStat(fullname).then(function (stat) {
        if (stat.isFile()) {
          return fsReadFile(fullname).then(function (file) {
            return [name, file];
          });
        }
      });
    }));
  }).then(function (_value) {
    var promise = Promise.resolve({});
    _value.forEach(function (values) {
      promise = promise.then(function (carry) {
        if (values) {
          carry[values[0]] = values[1];
        }
        return carry;
      });
    });
    return promise;
  });
};

exports.itCompiles = function (name, fixturePath, fns, expectHandle) {
  if (!fns) {
    expectHandle = fixturePath;
    fixturePath = name;
    fns = [function () {}, function () {}];
  } else if (!expectHandle) {
    expectHandle = fns;
    fns = [function () {}, function () {}];
  } else if (arguments.length === 4) {
    expectHandle = arguments[3];
    fns = fns[(arguments[2], arguments[2])];
  } else if (arguments.length > 4) {
    fns = [].slice.call(arguments, 2, arguments.length - 1);
    expectHandle = arguments[arguments.length - 1];
  }

  // before(function() {
  //   return exports.clean(fixturePath);
  // });

  it(name, function () {
    this.timeout(30000);
    this.slow(4000);
    var runs = [];
    var setups = [];
    var runIndex = 0;
    function doRun() {
      return Promise.resolve().then(function () {}).then(function () {
        return fns[runIndex](runs[runIndex - 1]);
      }).then(function (_setup) {
        setups[runIndex] = _setup;
        return exports.compile(fixturePath, _setup);
      }).then(function (run) {
        runs[runIndex] = run;
        runIndex++;
        if (runIndex < fns.length) {
          return doRun();
        }
      });
    }
    return exports.clean(fixturePath).then(function () {
      return doRun();
    }).then(function () {
      return expectHandle({
        run1: runs[0],
        run2: runs[1],
        runs: runs,
        setup1: setups[0],
        setup2: setups[1],
        setups: setups
      });
    });
  });
};

exports.itCompilesWithCache = function (name, fixturePath, fnA, fnB, expectHandle) {
  before(function () {
    return exports.clean(fixturePath);
  });

  it(name, function () {
    this.timeout(30000);
    this.slow(4000);
    var cache1, cache2;
    return Promise.resolve().then(function () {
      return fnA();
    }).then(function () {
      return exports.compile(fixturePath);
    }).then(function () {
      // return new Promise(function(resolve) {setTimeout(resolve, 1000);});
    }).then(function () {
      var serializer = dataSerializer.createSerializer({
        name: 'md5',
        cacheDirPath: path.join(__dirname, '../', 'fixtures', fixturePath, 'tmp/cache')
      });
      return serializer.read().then(function (_cache) {
        cache1 = _cache;
      });
    }).then(function () {
      return fnB();
    }).then(function () {
      return exports.compile(fixturePath);
    }).then(function () {
      // return new Promise(function(resolve) {setTimeout(resolve, 1000);});
    }).then(function () {
      var serializer = dataSerializer.createSerializer({
        name: 'md5',
        cacheDirPath: path.join(__dirname, '../', 'fixtures', fixturePath, 'tmp/cache')
      });
      return serializer.read().then(function (_cache) {
        cache2 = _cache;
      });
    }).then(function () {
      return expectHandle(cache1, cache2);
    });
  });
};

exports.itCompilesChange = function (fixturePath, filesA, filesB, expectHandle) {
  exports.itCompiles('builds changes in ' + fixturePath + ' fixture', fixturePath, function () {
    return exports.writeFiles(fixturePath, filesA);
  }, function () {
    return exports.writeFiles(fixturePath, filesB);
  }, expectHandle);
  before(function () {
    return exports.clean(fixturePath);
  });
};

exports.itCompilesChange.skipIf = function (features) {
  return function (fixturePath, ...args) {
    if (features.every(f => f)) {
      return exports.itCompilesChange(fixturePath, ...args);
    } else {
      return it.skip('builds changes in ' + fixturePath + ' fixture', fixturePath);
    }
  };
};

exports.itCompilesHardModules = function (fixturePath, filesA, filesB, expectHandle) {
  if (typeof filesA === 'function' || Array.isArray(filesA)) {
    filesB = filesA;
    filesA = {};
  }
  if (typeof filesB === 'function' || Array.isArray(filesB)) {
    expectHandle = filesB;
    filesB = filesA;
  }
  exports.itCompiles('builds hard modules in ' + fixturePath + ' fixture', fixturePath, function () {
    return exports.writeFiles(fixturePath, filesA).then(function () {
      return { exportCompilation: true };
    });
  }, function () {
    return exports.writeFiles(fixturePath, filesB).then(function () {
      return { exportCompilation: true };
    });
  }, function (out) {
    var hardModules = [];
    var shortener = new (require('webpack/lib/RequestShortener'))(path.resolve(__dirname, '../fixtures', fixturePath));
    function walk(compilation) {
      compilation.modules.forEach(function (module) {
        if (module.cacheItem && module.buildTimestamp === module.cacheItem.build.buildTimestamp) {
          hardModules.push(module.readableIdentifier(shortener));
        }
      });
      compilation.children.forEach(walk);
    }
    walk(out.run2.compilation);
    if (typeof expectHandle === 'function') {
      return expectHandle(out, hardModules);
    } else {
      expectHandle.forEach(function (handle) {
        if (handle instanceof RegExp) {
          expect(hardModules).to.satisfy(function (modules) {
            return modules.reduce(function (carry, module) {
              return carry || handle.test(module);
            }, false);
          });
        } else {
          if (handle.startsWith('!')) {
            expect(hardModules).to.not.include(handle.substring(1));
          } else {
            expect(hardModules).to.include(handle);
          }
        }
      });
    }
  });
  before(function () {
    return exports.clean(fixturePath);
  });
};

exports.itCompilesHardModules.skipIf = function (features) {
  return function (fixturePath, ...args) {
    if (features.every(f => f)) {
      return exports.itCompilesHardModules(fixturePath, ...args);
    } else {
      return it.skip('builds hard modules in ' + fixturePath + ' fixture');
    }
  };
};

exports.clean = function (fixturePath) {
  var tmpPath = path.join(__dirname, '..', 'fixtures', fixturePath, 'tmp');
  var nmPath = path.join(__dirname, '..', 'fixtures', fixturePath, 'node_modules');
  return Promise.all([promisify(rimraf)(tmpPath), promisify(rimraf)(nmPath)]).then(function () {
    return promisify(mkdirp)(tmpPath);
  });
};

exports.describeWP = function (version) {
  return function () {
    var wpVersion = Number(require('webpack/package.json').version[0]);
    if (wpVersion >= version) {
      describe.apply(null, arguments);
    } else {
      describe.skip.apply(null, arguments);
    }
  };
};

exports.describeWP2 = exports.describeWP(2);
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImhhcmQtc291cmNlLXdlYnBhY2stcGx1Z2luL3Rlc3RzL3V0aWwvaW5kZXguanMiXSwibmFtZXMiOlsiZnMiLCJyZXF1aXJlIiwicGF0aCIsInZtIiwiZXhwZWN0IiwiTWVtb3J5RlMiLCJkYXRhU2VyaWFsaXplciIsIm1rZGlycCIsInJpbXJhZiIsIndlYnBhY2siLCJpc1dlYnBhY2s0IiwidmVyc2lvbiIsInByb21pc2lmeSIsImYiLCJvIiwiY3R4IiwiY29udGV4dCIsImFyZ3MiLCJBcnJheSIsImZyb20iLCJhcmd1bWVudHMiLCJQcm9taXNlIiwicmVzb2x2ZSIsInJlamVjdCIsInB1c2giLCJlcnIiLCJ2YWx1ZSIsImFwcGx5Iiwid3JhcE1vZHVsZSIsImNvZGUiLCJjYWxsTW9kdWxlIiwiZm4iLCJmaWxlbmFtZSIsIm1vZHVsZSIsImV4cG9ydHMiLCJPYmplY3QiLCJhc3NpZ24iLCJtb2R1bGVuYW1lIiwidGVzdCIsImpvaW4iLCJkaXJuYW1lIiwiY29tcGlsZSIsImZpeHR1cmVQYXRoIiwib3B0aW9ucyIsImNvbmZpZ1BhdGgiLCJfX2Rpcm5hbWUiLCJjb21waWxlciIsIm1vZGUiLCJydW5JblRoaXNDb250ZXh0IiwicmVhZEZpbGVTeW5jIiwiaW5wdXRGaWxlU3lzdGVtIiwicHVyZ2UiLCJvdXRwdXRmcyIsIm91dHB1dEZpbGVTeXN0ZW0iLCJyZWFkZGlyIiwicmVhZEZpbGUiLCJzdGF0IiwiZnNSZWFkZGlyIiwiZnNSZWFkRmlsZSIsImZzU3RhdCIsInJ1biIsIndhdGNoaW5nIiwiX3dhdGNoIiwid2F0Y2giLCJzdGF0cyIsIndhdGNoU3RhcnQiLCJ3YXRjaFN0b3AiLCJjbG9zZSIsIndhdGNoU3RhcnRTdG9wIiwidGhlbiIsIndhdGNoQ29udGludWUiLCJoYW5kbGVyIiwic3RhcnQiLCJhbGwiLCJvdXRwdXQiLCJjYXRjaCIsIm1hcCIsIm5hbWUiLCJmdWxsbmFtZSIsImlzRmlsZSIsImVuZHNXaXRoIiwiZmlsZSIsImZpbGVzIiwiY29uY2F0IiwiX3ZhbHVlIiwicHJvbWlzZSIsImZvckVhY2giLCJ2YWx1ZXMiLCJjYXJyeSIsImV4cG9ydFN0YXRzIiwic3RhdHNKc29uIiwidG9Kc29uIiwiZXJyb3JzIiwid2FybmluZ3MiLCJvdXQiLCJleHBvcnRDb21waWxhdGlvbiIsImNvbXBpbGF0aW9uIiwiY29tcGlsZVR3aWNlRXF1YWwiLCJjb21waWxlT3B0aW9ucyIsInJ1bjEiLCJydW4yIiwicnVucyIsInRvIiwiZXFsIiwiaXRDb21waWxlc1R3aWNlIiwiZXhwb3J0U3VmZml4IiwiaXQiLCJ0aW1lb3V0IiwiY2xlYW4iLCJza2lwSWYiLCJmZWF0dXJlcyIsImV2ZXJ5Iiwic2tpcCIsIndyaXRlRmlsZXMiLCJmc1VubGluayIsInVubGluayIsIl9mc1dyaXRlRmlsZSIsIndyaXRlRmlsZSIsImZzTWtkaXJwIiwiZnNXcml0ZUZpbGUiLCJjb250ZW50IiwiZW5jb2RlIiwiZnNSaW1yYWYiLCJrZXlzIiwia2V5IiwicmVhZEZpbGVzIiwib3V0cHV0UGF0aCIsIml0Q29tcGlsZXMiLCJmbnMiLCJleHBlY3RIYW5kbGUiLCJsZW5ndGgiLCJzbGljZSIsImNhbGwiLCJzbG93Iiwic2V0dXBzIiwicnVuSW5kZXgiLCJkb1J1biIsIl9zZXR1cCIsInNldHVwMSIsInNldHVwMiIsIml0Q29tcGlsZXNXaXRoQ2FjaGUiLCJmbkEiLCJmbkIiLCJiZWZvcmUiLCJjYWNoZTEiLCJjYWNoZTIiLCJzZXJpYWxpemVyIiwiY3JlYXRlU2VyaWFsaXplciIsImNhY2hlRGlyUGF0aCIsInJlYWQiLCJfY2FjaGUiLCJpdENvbXBpbGVzQ2hhbmdlIiwiZmlsZXNBIiwiZmlsZXNCIiwiaXRDb21waWxlc0hhcmRNb2R1bGVzIiwiaXNBcnJheSIsImhhcmRNb2R1bGVzIiwic2hvcnRlbmVyIiwid2FsayIsIm1vZHVsZXMiLCJjYWNoZUl0ZW0iLCJidWlsZFRpbWVzdGFtcCIsImJ1aWxkIiwicmVhZGFibGVJZGVudGlmaWVyIiwiY2hpbGRyZW4iLCJoYW5kbGUiLCJSZWdFeHAiLCJzYXRpc2Z5IiwicmVkdWNlIiwic3RhcnRzV2l0aCIsIm5vdCIsImluY2x1ZGUiLCJzdWJzdHJpbmciLCJ0bXBQYXRoIiwibm1QYXRoIiwiZGVzY3JpYmVXUCIsIndwVmVyc2lvbiIsIk51bWJlciIsImRlc2NyaWJlIiwiZGVzY3JpYmVXUDIiXSwibWFwcGluZ3MiOiI7O0FBQUEsSUFBSUEsS0FBS0MsUUFBUSxJQUFSLENBQVQ7QUFDQSxJQUFJQyxPQUFPRCxRQUFRLE1BQVIsQ0FBWDtBQUNBLElBQUlFLEtBQUtGLFFBQVEsSUFBUixDQUFUOztBQUVBLElBQUlHLFNBQVNILFFBQVEsTUFBUixFQUFnQkcsTUFBN0I7QUFDQSxJQUFJQyxXQUFXSixRQUFRLFdBQVIsQ0FBZjs7QUFFQSxJQUFJSyxpQkFBaUJMLDRDQUE0Q0ssY0FBakU7O0FBRUEsSUFBSUMsU0FBU04sUUFBUSxRQUFSLENBQWI7QUFDQSxJQUFJTyxTQUFTUCxRQUFRLFFBQVIsQ0FBYjtBQUNBLElBQUlRLFVBQVVSLFFBQVEsU0FBUixDQUFkO0FBQ0EsSUFBSU0sU0FBU04sUUFBUSxRQUFSLENBQWI7O0FBRUEsSUFBSVMsYUFBYVQsUUFBUSxzQkFBUixFQUFnQ1UsT0FBaEMsQ0FBd0MsQ0FBeEMsS0FBOEMsQ0FBL0Q7O0FBRUEsU0FBU0MsU0FBVCxDQUFtQkMsQ0FBbkIsRUFBc0JDLENBQXRCLEVBQXlCO0FBQ3ZCLE1BQUlDLE1BQU1ELEtBQUtBLEVBQUVFLE9BQVAsSUFBa0IsSUFBNUI7QUFDQSxTQUFPLFlBQVc7QUFDaEIsUUFBSUMsT0FBT0MsTUFBTUMsSUFBTixDQUFXQyxTQUFYLENBQVg7QUFDQSxXQUFPLElBQUlDLE9BQUosQ0FBWSxVQUFTQyxPQUFULEVBQWtCQyxNQUFsQixFQUEwQjtBQUMzQ04sV0FBS08sSUFBTCxDQUFVLFVBQVNDLEdBQVQsRUFBY0MsS0FBZCxFQUFxQjtBQUM3QixZQUFJRCxHQUFKLEVBQVM7QUFBQyxpQkFBT0YsT0FBT0UsR0FBUCxDQUFQO0FBQW9CO0FBQzlCLGVBQU9ILFFBQVFJLEtBQVIsQ0FBUDtB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VUFBU2xFLFdBQVQsRUFBc0I7QUFDcEMsTUFBSW1JLFVBQVUzSyxLQUFLcUMsSUFBTCxDQUFVTSxTQUFWLEVBQXFCLElBQXJCLEVBQTJCLFVBQTNCLEVBQXVDSCxXQUF2QyxFQUFvRCxLQUFwRCxDQUFkO0FBQ0EsTUFBSW9JLFNBQVM1SyxLQUFLcUMsSUFBTCxDQUFVTSxTQUFWLEVBQXFCLElBQXJCLEVBQTJCLFVBQTNCLEVBQXVDSCxXQUF2QyxFQUFvRCxjQUFwRCxDQUFiO0FBQ0EsU0FBT3JCLFFBQVFvRCxHQUFSLENBQVksQ0FDakI3RCxVQUFVSixNQUFWLEVBQWtCcUssT0FBbEIsQ0FEaUIsRUFFakJqSyxVQUFVSixNQUFWLEVBQWtCc0ssTUFBbEIsQ0FGaUIsQ0FBWixFQUlOekcsSUFKTSxDQUlELFlBQVc7QUFDZixXQUFPekQsVUFBVUwsTUFBVixFQUFrQnNLLE9BQWxCLENBQVA7QUFDRCxHQU5NLENBQVA7QUFPRCxDQVZEOztBQVlBM0ksUUFBUTZJLFVBQVIsR0FBcUIsVUFBU3BLLE9BQVQsRUFBa0I7QUFDckMsU0FBTyxZQUFXO0FBQ2hCLFFBQUlxSyxZQUFZQyxPQUFPaEwsUUFBUSxzQkFBUixFQUFnQ1UsT0FBaEMsQ0FBd0MsQ0FBeEMsQ0FBUCxDQUFoQjtBQUNBLFFBQUlxSyxhQUFhckssT0FBakIsRUFBMEI7QUFDeEJ1SyxlQUFTdkosS0FBVCxDQUFlLElBQWYsRUFBcUJQLFNBQXJCO0FBQ0QsS0FGRCxNQUdLO0FBQ0g4SixlQUFTbEUsSUFBVCxDQUFjckYsS0FBZCxDQUFvQixJQUFwQixFQUEwQlAsU0FBMUI7QUFDRDtBQUNGLEdBUkQ7QUFTRCxDQVZEOztBQVlBYyxRQUFRaUosV0FBUixHQUFzQmpKLFFBQVE2SSxVQUFSLENBQW1CLENBQW5CLENBQXRCIiwiZmlsZSI6ImhhcmQtc291cmNlLXdlYnBhY2stcGx1Z2luL3Rlc3RzL3V0aWwvaW5kZXguanMiLCJzb3VyY2VzQ29udGVudCI6WyJ2YXIgZnMgPSByZXF1aXJlKCdmcycpO1xudmFyIHBhdGggPSByZXF1aXJlKCdwYXRoJyk7XG52YXIgdm0gPSByZXF1aXJlKCd2bScpO1xuXG52YXIgZXhwZWN0ID0gcmVxdWlyZSgnY2hhaScpLmV4cGVjdDtcbnZhciBNZW1vcnlGUyA9IHJlcXVpcmUoJ21lbW9yeS1mcycpO1xuXG52YXIgZGF0YVNlcmlhbGl6ZXIgPSByZXF1aXJlKCcuLi8uLi9saWIvQ2FjaGVTZXJpYWxpemVyRmFjdG9yeScpLmRhdGFTZXJpYWxpemVyO1xuXG52YXIgbWtkaXJwID0gcmVxdWlyZSgnbWtkaXJwJyk7XG52YXIgcmltcmFmID0gcmVxdWlyZSgncmltcmFmJyk7XG52YXIgd2VicGFjayA9IHJlcXVpcmUoJ3dlYnBhY2snKTtcbnZhciBta2RpcnAgPSByZXF1aXJlKCdta2RpcnAnKTtcblxudmFyIGlzV2VicGFjazQgPSByZXF1aXJlKCd3ZWJwYWNrL3BhY2thZ2UuanNvbicpLnZlcnNpb25bMF0gPj0gNDtcblxuZnVuY3Rpb24gcHJvbWlzaWZ5KGYsIG8pIHtcbiAgdmFyIGN0eCA9IG8gJiYgby5jb250ZXh0IHx8IG51bGw7XG4gIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICB2YXIgYXJncyA9IEFycmF5LmZyb20oYXJndW1lbnRzKTtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICBhcmdzLnB1c2goZnVuY3Rpb24oZXJyLCB2YWx1ZSkge1xuICAgICAgICBpZiAoZXJyKSB7cmV0dXJuIHJlamVjdChlcnIpO31cbiAgICAgICAgcmV0dXJuIHJlc29sdmUodmFsdWUpO1xuICAgICAgfSk7XG4gICAgICBmLmFwcGx5KGN0eCwgYXJncyk7XG4gICAgfSk7XG4gIH07XG59XG5cbmZ1bmN0aW9uIHdyYXBNb2R1bGUoY29kZSkge1xuICByZXR1cm4gJyhmdW5jdGlvbihleHBvcnRzLCByZXF1aXJlLCBtb2R1bGUsIF9fZmlsZW5hbWUsIF9fZGlybmFtZSkgeycgK1xuICAgIGNvZGUgK1xuICAnfSknO1xufVxuXG5mdW5jdGlvbiBjYWxsTW9kdWxlKGZuLCBmaWxlbmFtZSkge1xuICB2YXIgbW9kdWxlID0ge2V4cG9ydHM6IHt9fTtcbiAgZm4obW9kdWxlLmV4cG9ydHMsIE9iamVjdC5hc3NpZ24oZnVuY3Rpb24obW9kdWxlbmFtZSkge1xuICAgIGlmICgvXFxXLy50ZXN0KG1vZHVsZW5hbWVbMF0pKSB7XG4gICAgICByZXR1cm4gcmVxdWlyZShwYXRoLmpvaW4ocGF0aC5kaXJuYW1lKGZpbGVuYW1lKSwgbW9kdWxlbmFtZSkpO1xuICAgIH1cbiAgICByZXR1cm4gcmVxdWlyZShtb2R1bGVuYW1lKTtcbiAgfSwgcmVxdWlyZSksIG1vZHVsZSwgZmlsZW5hbWUsIHBhdGguZGlybmFtZShmaWxlbmFtZSkpO1xuICByZXR1cm4gbW9kdWxlLmV4cG9ydHM7XG59XG5cbmV4cG9ydHMuY29tcGlsZSA9IGZ1bmN0aW9uKGZpeHR1cmVQYXRoLCBvcHRpb25zKSB7XG4gIHZhciBjb25maWdQYXRoID0gcGF0aC5qb2luKF9fZGlybmFtZSwgJy4uJywgJ2ZpeHR1cmVzJywgZml4dHVyZVBhdGgsICd3ZWJwYWNrLmNvbmZpZy5qcycpO1xuICB2YXIgY29tcGlsZXIgPSAob3B0aW9ucyB8fCB7fSkuY29tcGlsZXIgfHxcbiAgICB3ZWJwYWNrKE9iamVjdC5hc3NpZ24oXG4gICAgICBpc1dlYnBhY2s0ID9cbiAgICAgICAge1xuICAgICAgICAgIG1vZGU6ICdkZXZlbG9wbWVudCcsXG4gICAgICAgIH0gOlxuICAgICAgICB7fSxcbiAgICAgIGNhbGxNb2R1bGUodm0ucnVuSW5UaGlzQ29udGV4dChcbiAgICAgICAgd3JhcE1vZHVsZShmcy5yZWFkRmlsZVN5bmMoY29uZmlnUGF0aCwgJ3V0ZjgnKSksXG4gICAgICAgIHtmaWxlbmFtZTogY29uZmlnUGF0aH1cbiAgICAgICksIGNvbmZpZ1BhdGgpXG4gICAgKSk7XG5cbiAgY29tcGlsZXIuaW5wdXRGaWxlU3lzdGVtLnB1cmdlKCk7XG4gIHZhciBvdXRwdXRmcyA9IGNvbXBpbGVyLm91dHB1dEZpbGVTeXN0ZW0gPSBuZXcgTWVtb3J5RlMoKTtcblxuICB2YXIgcmVhZGRpciA9IHByb21pc2lmeShvdXRwdXRmcy5yZWFkZGlyLCB7Y29udGV4dDogb3V0cHV0ZnN9KTtcbiAgdmFyIHJlYWRGaWxlID0gcHJvbWlzaWZ5KG91dHB1dGZzLnJlYWRGaWxlLCB7Y29udGV4dDogb3V0cHV0ZnN9KTtcbiAgdmFyIHN0YXQgPSBwcm9taXNpZnkob3V0cHV0ZnMuc3RhdCwge2NvbnRleHQ6IG91dHB1dGZzfSk7XG4gIHZhciBmc1JlYWRkaXIgPSBwcm9taXNpZnkoZnMucmVhZGRpciwge2NvbnRleHQ6IGZzfSk7XG4gIHZhciBmc1JlYWRGaWxlID0gcHJvbWlzaWZ5KGZzLnJlYWRGaWxlLCB7Y29udGV4dDogZnN9KTtcbiAgdmFyIGZzU3RhdCA9IHByb21pc2lmeShmcy5zdGF0LCB7Y29udGV4dDogZnN9KTtcbiAgdmFyIHJ1biA9IHByb21pc2lmeShjb21waWxlci5ydW4sIHtjb250ZXh0OiBjb21waWxlcn0pO1xuICB2YXIgd2F0Y2hpbmcgPSBvcHRpb25zICYmIG9wdGlvbnMud2F0Y2hpbmc7XG4gIHZhciBfd2F0Y2ggPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICB3YXRjaGluZyA9IGNvbXBpbGVyLndhdGNoKHt9LCBmdW5jdGlvbihlcnIsIHN0YXRzKSB7XG4gICAgICAgIGlmIChlcnIpIHtyZXR1cm4gcmVqZWN0KGVycik7fVxuICAgICAgICByZXNvbHZlKHN0YXRzKTtcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9O1xuICB2YXIgd2F0Y2hTdGFydCA9IF93YXRjaDtcbiAgdmFyIHdhdGNoU3RvcCA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgIHdhdGNoaW5nLmNsb3NlKGZ1bmN0aW9uKGVyciwgc3RhdHMpIHtcbiAgICAgICAgd2F0Y2hpbmcgPSBudWxsO1xuICAgICAgICBpZiAoZXJyKSB7cmV0dXJuIHJlamVjdChlcnIpO31cbiAgICAgICAgcmVzb2x2ZShzdGF0cyk7XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfTtcbiAgdmFyIHdhdGNoU3RhcnRTdG9wID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIF93YXRjaCgpXG4gICAgLnRoZW4oZnVuY3Rpb24oc3RhdHMpIHtcbiAgICAgIHdhdGNoaW5nLmNsb3NlKCk7XG4gICAgICB3YXRjaGluZyA9IG51bGw7XG4gICAgICByZXR1cm4gc3RhdHM7XG4gICAgfSk7XG4gIH07XG4gIHZhciB3YXRjaENvbnRpbnVlID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgd2F0Y2hpbmcuaGFuZGxlciA9IGZ1bmN0aW9uKGVyciwgc3RhdHMpIHtcbiAgICAgICAgaWYgKGVycikge3JldHVybiByZWplY3QoZXJyKTt9XG4gICAgICAgIHJlc29sdmUoc3RhdHMpO1xuICAgICAgfTtcbiAgICB9KTtcbiAgfTtcblxuICB2YXIgc3RhcnQ7XG4gIGlmIChvcHRpb25zICYmIG9wdGlvbnMud2F0Y2gpIHtcbiAgICBzd2l0Y2ggKG9wdGlvbnMud2F0Y2gpIHtcbiAgICBjYXNlICdzdGFydCc6XG4gICAgICBzdGFydCA9IHdhdGNoU3RhcnQoKTtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgJ3N0b3AnOlxuICAgICAgc3RhcnQgPSB3YXRjaFN0b3AoKTtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgJ3N0YXJ0U3RvcCc6XG4gICAgICBzdGFydCA9IHdhdGNoU3RhcnRTdG9wKCk7XG4gICAgICBicmVhaztcbiAgICBjYXNlICdjb250aW51ZSc6XG4gICAgICBzdGFydCA9IHdhdGNoQ29udGludWUoKTtcbiAgICAgIGJyZWFrO1xuICAgIH1cbiAgfVxuICBlbHNlIHtcbiAgICBzdGFydCA9IHJ1bigpO1xuICB9XG5cbiAgcmV0dXJuIHN0YXJ0XG4gIC50aGVuKGZ1bmN0aW9uKHN0YXRzKSB7XG4gICAgcmV0dXJuIFByb21pc2UuYWxsKFtcbiAgICAgIHJlYWRkaXIoY29tcGlsZXIub3B0aW9ucy5vdXRwdXQucGF0aClcbiAgICAgIC5jYXRjaChmdW5jdGlvbigpIHtyZXR1cm4gW107fSlcbiAgICAgIC50aGVuKGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgIHJldHVybiBQcm9taXNlLmFsbCh2YWx1ZS5tYXAoZnVuY3Rpb24obmFtZSkge1xuICAgICAgICAgIHZhciBmdWxsbmFtZSA9IHBhdGguam9pbihjb21waWxlci5vcHRpb25zLm91dHB1dC5wYXRoLCBuYW1lKTtcbiAgICAgICAgICByZXR1cm4gc3RhdChmdWxsbmFtZSlcbiAgICAgICAgICAudGhlbihmdW5jdGlvbihzdGF0KSB7XG4gICAgICAgICAgICBpZiAoc3RhdC5pc0ZpbGUoKSkge1xuICAgICAgICAgICAgICByZXR1cm4gcmVhZEZpbGUoZnVsbG5hbWUsIGZ1bGxuYW1lLmVuZHNXaXRoKCcuanMnKSA/ICd1dGY4JyA6ICcnKVxuICAgICAgICAgICAgICAudGhlbihmdW5jdGlvbihmaWxlKSB7cmV0dXJuIFtuYW1lLCBmaWxlXTt9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KTtcbiAgICAgICAgfSkpO1xuICAgICAgfSksXG4gICAgICBmc1JlYWRkaXIoY29tcGlsZXIub3B0aW9ucy5vdXRwdXQucGF0aClcbiAgICAgIC5jYXRjaChmdW5jdGlvbigpIHtyZXR1cm4gW107fSlcbiAgICAgIC50aGVuKGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgIHJldHVybiBQcm9taXNlLmFsbCh2YWx1ZS5tYXAoZnVuY3Rpb24obmFtZSkge1xuICAgICAgICAgIHZhciBmdWxsbmFtZSA9IHBhdGguam9pbihjb21waWxlci5vcHRpb25zLm91dHB1dC5wYXRoLCBuYW1lKTtcbiAgICAgICAgICByZXR1cm4gZnNTdGF0KGZ1bGxuYW1lKVxuICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKHN0YXQpIHtcbiAgICAgICAgICAgIGlmIChzdGF0LmlzRmlsZSgpKSB7XG4gICAgICAgICAgICAgIHJldHVybiBmc1JlYWRGaWxlKGZ1bGxuYW1lLCBmdWxsbmFtZS5lbmRzV2l0aCgnLmpzJykgPyAndXRmOCcgOiAnJylcbiAgICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24oZmlsZSkge3JldHVybiBbbmFtZSwgZmlsZV07fSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pKVxuICAgICAgfSksXG4gICAgXSlcbiAgICAudGhlbihmdW5jdGlvbihmaWxlcykge1xuICAgICAgcmV0dXJuIGZpbGVzWzBdLmNvbmNhdChmaWxlc1sxXSk7XG4gICAgfSlcbiAgICAudGhlbihmdW5jdGlvbihfdmFsdWUpIHtcbiAgICAgIHZhciBwcm9taXNlID0gUHJvbWlzZS5yZXNvbHZlKHt9KTtcbiAgICAgIF92YWx1ZS5mb3JFYWNoKGZ1bmN0aW9uKHZhbHVlcykge1xuICAgICAgICBwcm9taXNlID0gcHJvbWlzZVxuICAgICAgICAudGhlbihmdW5jdGlvbihjYXJyeSkge1xuICAgICAgICAgIGlmICh2YWx1ZXMpIHtcbiAgICAgICAgICAgIGNhcnJ5W3ZhbHVlc1swXV0gPSB2YWx1ZXNbMV07XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiBjYXJyeTtcbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICAgIHJldHVybiBwcm9taXNlO1xuICAgIH0pXG4gICAgLnRoZW4oZnVuY3Rpb24oY2FycnkpIHtcbiAgICAgIGlmIChvcHRpb25zICYmIG9wdGlvbnMuZXhwb3J0U3RhdHMpIHtcbiAgICAgICAgdmFyIHN0YXRzSnNvbiA9IHN0YXRzLnRvSnNvbih7XG4gICAgICAgICAgZXJyb3JzOiB0cnVlLFxuICAgICAgICAgIHdhcm5pbmdzOiB0cnVlLFxuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICBvdXQ6IGNhcnJ5LFxuICAgICAgICAgIHdhcm5pbmdzOiBzdGF0c0pzb24ud2FybmluZ3MsXG4gICAgICAgICAgZXJyb3JzOiBzdGF0c0pzb24uZXJyb3JzLFxuICAgICAgICB9O1xuICAgICAgfVxuICAgICAgaWYgKG9wdGlvbnMgJiYgb3B0aW9ucy5leHBvcnRDb21waWxhdGlvbikge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgIG91dDogY2FycnksXG4gICAgICAgICAgY29tcGlsYXRpb246IHN0YXRzLmNvbXBpbGF0aW9uLFxuICAgICAgICAgIGNvbXBpbGVyOiBzdGF0cy5jb21waWxhdGlvbi5jb21waWxlcixcbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICAgIGlmIChvcHRpb25zICYmIG9wdGlvbnMud2F0Y2gpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICBvdXQ6IGNhcnJ5LFxuICAgICAgICAgIHdhdGNoaW5nOiB3YXRjaGluZyxcbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICAgIGVsc2Uge1xuICAgICAgICByZXR1cm4gY2Fycnk7XG4gICAgICB9XG4gICAgfSk7XG4gIH0pXG4gIDtcbn07XG5cbmV4cG9ydHMuY29tcGlsZVR3aWNlRXF1YWwgPSBmdW5jdGlvbihmaXh0dXJlUGF0aCwgY29tcGlsZU9wdGlvbnMpIHtcbiAgdmFyIHJ1bjEgPSBleHBvcnRzLmNvbXBpbGUoZml4dHVyZVBhdGgsIGNvbXBpbGVPcHRpb25zKTtcbiAgcmV0dXJuIHJ1bjFcbiAgLnRoZW4oZnVuY3Rpb24oKSB7XG4gICAgdmFyIHJ1bjIgPSBleHBvcnRzLmNvbXBpbGUoZml4dHVyZVBhdGgsIGNvbXBpbGVPcHRpb25zKTtcbiAgICByZXR1cm4gUHJvbWlzZS5hbGwoW3J1bjEsIHJ1bjJdKTtcbiAgfSlcbiAgLnRoZW4oZnVuY3Rpb24ocnVucykge1xuICAgIGV4cGVjdChydW5zWzBdKS50by5lcWwocnVuc1sxXSk7XG4gIH0pO1xufTtcblxuZXhwb3J0cy5pdENvbXBpbGVzVHdpY2UgPSBmdW5jdGlvbihmaXh0dXJlUGF0aCwgY29tcGlsZU9wdGlvbnMpIHtcbiAgLy8gYmVmb3JlKGZ1bmN0aW9uKCkge1xuICAvLyAgIHJldHVybiBleHBvcnRzLmNsZWFuKGZpeHR1cmVQYXRoKTtcbiAgLy8gfSk7XG5cbiAgdmFyIGV4cG9ydFN1ZmZpeCA9ICcnO1xuICBpZiAoY29tcGlsZU9wdGlvbnMgJiYgY29tcGlsZU9wdGlvbnMuZXhwb3J0U3RhdHMpIHtcbiAgICBleHBvcnRTdWZmaXggPSAnIFtleHBvcnRTdGF0c10nO1xuICB9XG4gIGl0KCdidWlsZHMgaWRlbnRpY2FsICcgKyBmaXh0dXJlUGF0aCArICcgZml4dHVyZScgKyBleHBvcnRTdWZmaXgsIGZ1bmN0aW9uKCkge1xuICAgIHRoaXMudGltZW91dCgzMDAwMCk7XG4gICAgcmV0dXJuIGV4cG9ydHMuY2xlYW4oZml4dHVyZVBhdGgpXG4gICAgLnRoZW4oZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gZXhwb3J0cy5jb21waWxlVHdpY2VFcXVhbChmaXh0dXJlUGF0aCwgY29tcGlsZU9wdGlvbnMpO1xuICAgIH0pO1xuICB9KTtcbn07XG5cbmV4cG9ydHMuaXRDb21waWxlc1R3aWNlLnNraXBJZiA9IGZ1bmN0aW9uKGZlYXR1cmVzKSB7XG4gIHJldHVybiBmdW5jdGlvbihmaXh0dXJlUGF0aCwgY29tcGlsZU9wdGlvbnMpIHtcbiAgICBpZiAoZmVhdHVyZXMuZXZlcnkoZiA9PiBmKSkge1xuICAgICAgcmV0dXJuIGV4cG9ydHMuaXRDb21waWxlc1R3aWNlKGZpeHR1cmVQYXRoLCBjb21waWxlT3B0aW9ucyk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgdmFyIGV4cG9ydFN1ZmZpeCA9ICcnO1xuICAgICAgaWYgKGNvbXBpbGVPcHRpb25zICYmIGNvbXBpbGVPcHRpb25zLmV4cG9ydFN0YXRzKSB7XG4gICAgICAgIGV4cG9ydFN1ZmZpeCA9ICcgW2V4cG9ydFN0YXRzXSc7XG4gICAgICB9XG4gICAgICByZXR1cm4gaXQuc2tpcCgnYnVpbGRzIGlkZW50aWNhbCAnICsgZml4dHVyZVBhdGggKyAnIGZpeHR1cmUnICsgZXhwb3J0U3VmZml4KTtcbiAgICB9XG4gIH1cbn07XG5cbmV4cG9ydHMud3JpdGVGaWxlcyA9IGZ1bmN0aW9uKGZpeHR1cmVQYXRoLCBmaWxlcykge1xuICB2YXIgY29uZmlnUGF0aCA9IHBhdGguam9pbihfX2Rpcm5hbWUsICcuLicsICdmaXh0dXJlcycsIGZpeHR1cmVQYXRoKTtcblxuICBmc1VubGluayA9IHByb21pc2lmeShmcy51bmxpbmssIHtjb250ZXh0OiBmc30pO1xuICBfZnNXcml0ZUZpbGUgPSBwcm9taXNpZnkoZnMud3JpdGVGaWxlLCB7Y29udGV4dDogZnN9KTtcbiAgZnNNa2RpcnAgPSBwcm9taXNpZnkobWtkaXJwKTtcbiAgZnNXcml0ZUZpbGUgPSBmdW5jdGlvbihmaWxlLCBjb250ZW50LCBlbmNvZGUpIHtcbiAgICByZXR1cm4gZnNNa2RpcnAocGF0aC5kaXJuYW1lKGZpbGUpKVxuICAgIC50aGVuKGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIF9mc1dyaXRlRmlsZShmaWxlLCBjb250ZW50LCBlbmNvZGUpO1xuICAgIH0pO1xuICB9O1xuICBmc1JpbXJhZiA9IHByb21pc2lmeShyaW1yYWYpO1xuXG4gIHJldHVybiBQcm9taXNlLmFsbChPYmplY3Qua2V5cyhmaWxlcykubWFwKGZ1bmN0aW9uKGtleSkge1xuICAgIGlmIChmaWxlc1trZXldID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gZnNSaW1yYWYocGF0aC5qb2luKGNvbmZpZ1BhdGgsIGtleSkpLmNhdGNoKGZ1bmN0aW9uKCkge30pO1xuICAgIH1cbiAgICByZXR1cm4gZnNXcml0ZUZpbGUocGF0aC5qb2luKGNvbmZpZ1BhdGgsIGtleSksIGZpbGVzW2tleV0pO1xuICB9KSk7XG59O1xuXG5leHBvcnRzLnJlYWRGaWxlcyA9IGZ1bmN0aW9uKG91dHB1dFBhdGgpIHtcbiAgb3V0cHV0UGF0aCA9IHBhdGguam9pbihfX2Rpcm5hbWUsICcuLicsICdmaXh0dXJlcycsIG91dHB1dFBhdGgpO1xuXG4gIHZhciBmc1JlYWRkaXIgPSBwcm9taXNpZnkoZnMucmVhZGRpciwge2NvbnRleHQ6IGZzfSk7XG4gIHZhciBmc1JlYWRGaWxlID0gcHJvbWlzaWZ5KGZzLnJlYWRGaWxlLCB7Y29udGV4dDogZnN9KTtcbiAgdmFyIGZzU3RhdCA9IHByb21pc2lmeShmcy5zdGF0LCB7Y29udGV4dDogZnN9KTtcblxuICByZXR1cm4gZnNSZWFkZGlyKG91dHB1dFBhdGgpXG4gIC5jYXRjaChmdW5jdGlvbigpIHtyZXR1cm4gW107fSlcbiAgLnRoZW4oZnVuY3Rpb24odmFsdWUpIHtcbiAgICByZXR1cm4gUHJvbWlzZS5hbGwodmFsdWUubWFwKGZ1bmN0aW9uKG5hbWUpIHtcbiAgICAgIHZhciBmdWxsbmFtZSA9IHBhdGguam9pbihvdXRwdXRQYXRoLCBuYW1lKTtcbiAgICAgIHJldHVybiBmc1N0YXQoZnVsbG5hbWUpXG4gICAgICAudGhlbihmdW5jdGlvbihzdGF0KSB7XG4gICAgICAgIGlmIChzdGF0LmlzRmlsZSgpKSB7XG4gICAgICAgICAgcmV0dXJuIGZzUmVhZEZpbGUoZnVsbG5hbWUpXG4gICAgICAgICAgLnRoZW4oZnVuY3Rpb24oZmlsZSkge3JldHVybiBbbmFtZSwgZmlsZV07fSk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH0pKTtcbiAgfSlcbiAgLnRoZW4oZnVuY3Rpb24oX3ZhbHVlKSB7XG4gICAgdmFyIHByb21pc2UgPSBQcm9taXNlLnJlc29sdmUoe30pO1xuICAgIF92YWx1ZS5mb3JFYWNoKGZ1bmN0aW9uKHZhbHVlcykge1xuICAgICAgcHJvbWlzZSA9IHByb21pc2VcbiAgICAgIC50aGVuKGZ1bmN0aW9uKGNhcnJ5KSB7XG4gICAgICAgIGlmICh2YWx1ZXMpIHtcbiAgICAgICAgICBjYXJyeVt2YWx1ZXNbMF1dID0gdmFsdWVzWzFdO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBjYXJyeTtcbiAgICAgIH0pO1xuICAgIH0pO1xuICAgIHJldHVybiBwcm9taXNlO1xuICB9KTtcbn07XG5cbmV4cG9ydHMuaXRDb21waWxlcyA9IGZ1bmN0aW9uKG5hbWUsIGZpeHR1cmVQYXRoLCBmbnMsIGV4cGVjdEhhbmRsZSkge1xuICBpZiAoIWZucykge1xuICAgIGV4cGVjdEhhbmRsZSA9IGZpeHR1cmVQYXRoO1xuICAgIGZpeHR1cmVQYXRoID0gbmFtZTtcbiAgICBmbnMgPSBbZnVuY3Rpb24oKSB7fSwgZnVuY3Rpb24oKSB7fV07XG4gIH1cbiAgZWxzZSBpZiAoIWV4cGVjdEhhbmRsZSkge1xuICAgIGV4cGVjdEhhbmRsZSA9IGZucztcbiAgICBmbnMgPSBbZnVuY3Rpb24oKSB7fSwgZnVuY3Rpb24oKSB7fV07XG4gIH1cbiAgZWxzZSBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gNCkge1xuICAgIGV4cGVjdEhhbmRsZSA9IGFyZ3VtZW50c1szXTtcbiAgICBmbnMgPSBmbnNbYXJndW1lbnRzWzJdLCBhcmd1bWVudHNbMl1dO1xuICB9XG4gIGVsc2UgaWYgKGFyZ3VtZW50cy5sZW5ndGggPiA0KSB7XG4gICAgZm5zID0gW10uc2xpY2UuY2FsbChhcmd1bWVudHMsIDIsIGFyZ3VtZW50cy5sZW5ndGggLSAxKTtcbiAgICBleHBlY3RIYW5kbGUgPSBhcmd1bWVudHNbYXJndW1lbnRzLmxlbmd0aCAtIDFdO1xuICB9XG5cbiAgLy8gYmVmb3JlKGZ1bmN0aW9uKCkge1xuICAvLyAgIHJldHVybiBleHBvcnRzLmNsZWFuKGZpeHR1cmVQYXRoKTtcbiAgLy8gfSk7XG5cbiAgaXQobmFtZSwgZnVuY3Rpb24oKSB7XG4gICAgdGhpcy50aW1lb3V0KDMwMDAwKTtcbiAgICB0aGlzLnNsb3coNDAwMCk7XG4gICAgdmFyIHJ1bnMgPSBbXTtcbiAgICB2YXIgc2V0dXBzID0gW107XG4gICAgdmFyIHJ1bkluZGV4ID0gMDtcbiAgICBmdW5jdGlvbiBkb1J1bigpIHtcbiAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoKVxuICAgICAgLnRoZW4oZnVuY3Rpb24oKSB7fSlcbiAgICAgIC50aGVuKGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gZm5zW3J1bkluZGV4XShydW5zW3J1bkluZGV4IC0gMV0pO1xuICAgICAgfSlcbiAgICAgIC50aGVuKGZ1bmN0aW9uKF9zZXR1cCkge1xuICAgICAgICBzZXR1cHNbcnVuSW5kZXhdID0gX3NldHVwO1xuICAgICAgICByZXR1cm4gZXhwb3J0cy5jb21waWxlKGZpeHR1cmVQYXRoLCBfc2V0dXApO1xuICAgICAgfSlcbiAgICAgIC50aGVuKGZ1bmN0aW9uKHJ1bikge1xuICAgICAgICBydW5zW3J1bkluZGV4XSA9IHJ1bjtcbiAgICAgICAgcnVuSW5kZXgrKztcbiAgICAgICAgaWYgKHJ1bkluZGV4IDwgZm5zLmxlbmd0aCkge1xuICAgICAgICAgIHJldHVybiBkb1J1bigpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG4gICAgcmV0dXJuIGV4cG9ydHMuY2xlYW4oZml4dHVyZVBhdGgpXG4gICAgLnRoZW4oZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gZG9SdW4oKTtcbiAgICB9KVxuICAgIC50aGVuKGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIGV4cGVjdEhhbmRsZSh7XG4gICAgICAgIHJ1bjE6IHJ1bnNbMF0sXG4gICAgICAgIHJ1bjI6IHJ1bnNbMV0sXG4gICAgICAgIHJ1bnM6IHJ1bnMsXG4gICAgICAgIHNldHVwMTogc2V0dXBzWzBdLFxuICAgICAgICBzZXR1cDI6IHNldHVwc1sxXSxcbiAgICAgICAgc2V0dXBzOiBzZXR1cHMsXG4gICAgICB9KTtcbiAgICB9KTtcbiAgfSk7XG59O1xuXG5leHBvcnRzLml0Q29tcGlsZXNXaXRoQ2FjaGUgPSBmdW5jdGlvbihuYW1lLCBmaXh0dXJlUGF0aCwgZm5BLCBmbkIsIGV4cGVjdEhhbmRsZSkge1xuICBiZWZvcmUoZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIGV4cG9ydHMuY2xlYW4oZml4dHVyZVBhdGgpO1xuICB9KTtcblxuICBpdChuYW1lLCBmdW5jdGlvbigpIHtcbiAgICB0aGlzLnRpbWVvdXQoMzAwMDApO1xuICAgIHRoaXMuc2xvdyg0MDAwKTtcbiAgICB2YXIgY2FjaGUxLCBjYWNoZTI7XG4gICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpXG4gICAgLnRoZW4oZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gZm5BKCk7XG4gICAgfSlcbiAgICAudGhlbihmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBleHBvcnRzLmNvbXBpbGUoZml4dHVyZVBhdGgpO1xuICAgIH0pXG4gICAgLnRoZW4oZnVuY3Rpb24oKSB7XG4gICAgICAvLyByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSkge3NldFRpbWVvdXQocmVzb2x2ZSwgMTAwMCk7fSk7XG4gICAgfSlcbiAgICAudGhlbihmdW5jdGlvbigpIHtcbiAgICAgIHZhciBzZXJpYWxpemVyID0gZGF0YVNlcmlhbGl6ZXIuY3JlYXRlU2VyaWFsaXplcih7XG4gICAgICAgIG5hbWU6ICdtZDUnLFxuICAgICAgICBjYWNoZURpclBhdGg6IHBhdGguam9pbihfX2Rpcm5hbWUsICcuLi8nLCAnZml4dHVyZXMnLCBmaXh0dXJlUGF0aCwgJ3RtcC9jYWNoZScpXG4gICAgICB9KTtcbiAgICAgIHJldHVybiBzZXJpYWxpemVyLnJlYWQoKS50aGVuKGZ1bmN0aW9uKF9jYWNoZSkgeyBjYWNoZTEgPSBfY2FjaGU7IH0pO1xuICAgIH0pXG4gICAgLnRoZW4oZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gZm5CKCk7XG4gICAgfSlcbiAgICAudGhlbihmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBleHBvcnRzLmNvbXBpbGUoZml4dHVyZVBhdGgpO1xuICAgIH0pXG4gICAgLnRoZW4oZnVuY3Rpb24oKSB7XG4gICAgICAvLyByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSkge3NldFRpbWVvdXQocmVzb2x2ZSwgMTAwMCk7fSk7XG4gICAgfSlcbiAgICAudGhlbihmdW5jdGlvbigpIHtcbiAgICAgIHZhciBzZXJpYWxpemVyID0gZGF0YVNlcmlhbGl6ZXIuY3JlYXRlU2VyaWFsaXplcih7XG4gICAgICAgIG5hbWU6ICdtZDUnLFxuICAgICAgICBjYWNoZURpclBhdGg6IHBhdGguam9pbihfX2Rpcm5hbWUsICcuLi8nLCAnZml4dHVyZXMnLCBmaXh0dXJlUGF0aCwgJ3RtcC9jYWNoZScpXG4gICAgICB9KTtcbiAgICAgIHJldHVybiBzZXJpYWxpemVyLnJlYWQoKS50aGVuKGZ1bmN0aW9uKF9jYWNoZSkgeyBjYWNoZTIgPSBfY2FjaGU7IH0pO1xuICAgIH0pXG4gICAgLnRoZW4oZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gZXhwZWN0SGFuZGxlKGNhY2hlMSwgY2FjaGUyKTtcbiAgICB9KTtcbiAgfSk7XG59XG5cbmV4cG9ydHMuaXRDb21waWxlc0NoYW5nZSA9IGZ1bmN0aW9uKGZpeHR1cmVQYXRoLCBmaWxlc0EsIGZpbGVzQiwgZXhwZWN0SGFuZGxlKSB7XG4gIGV4cG9ydHMuaXRDb21waWxlcygnYnVpbGRzIGNoYW5nZXMgaW4gJyArIGZpeHR1cmVQYXRoICsgJyBmaXh0dXJlJywgZml4dHVyZVBhdGgsIGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBleHBvcnRzLndyaXRlRmlsZXMoZml4dHVyZVBhdGgsIGZpbGVzQSk7XG4gIH0sIGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBleHBvcnRzLndyaXRlRmlsZXMoZml4dHVyZVBhdGgsIGZpbGVzQik7XG4gIH0sIGV4cGVjdEhhbmRsZSk7XG4gIGJlZm9yZShmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gZXhwb3J0cy5jbGVhbihmaXh0dXJlUGF0aCk7XG4gIH0pO1xufTtcblxuZXhwb3J0cy5pdENvbXBpbGVzQ2hhbmdlLnNraXBJZiA9IGZ1bmN0aW9uKGZlYXR1cmVzKSB7XG4gIHJldHVybiBmdW5jdGlvbihmaXh0dXJlUGF0aCwgLi4uYXJncykge1xuICAgIGlmIChmZWF0dXJlcy5ldmVyeShmID0+IGYpKSB7XG4gICAgICByZXR1cm4gZXhwb3J0cy5pdENvbXBpbGVzQ2hhbmdlKGZpeHR1cmVQYXRoLCAuLi5hcmdzKTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICByZXR1cm4gaXQuc2tpcCgnYnVpbGRzIGNoYW5nZXMgaW4gJyArIGZpeHR1cmVQYXRoICsgJyBmaXh0dXJlJywgZml4dHVyZVBhdGgpO1xuICAgIH1cbiAgfVxufTtcblxuZXhwb3J0cy5pdENvbXBpbGVzSGFyZE1vZHVsZXMgPSBmdW5jdGlvbihmaXh0dXJlUGF0aCwgZmlsZXNBLCBmaWxlc0IsIGV4cGVjdEhhbmRsZSkge1xuICBpZiAodHlwZW9mIGZpbGVzQSA9PT0gJ2Z1bmN0aW9uJyB8fCBBcnJheS5pc0FycmF5KGZpbGVzQSkpIHtcbiAgICBmaWxlc0IgPSBmaWxlc0E7XG4gICAgZmlsZXNBID0ge307XG4gIH1cbiAgaWYgKHR5cGVvZiBmaWxlc0IgPT09ICdmdW5jdGlvbicgfHwgQXJyYXkuaXNBcnJheShmaWxlc0IpKSB7XG4gICAgZXhwZWN0SGFuZGxlID0gZmlsZXNCO1xuICAgIGZpbGVzQiA9IGZpbGVzQTtcbiAgfVxuICBleHBvcnRzLml0Q29tcGlsZXMoJ2J1aWxkcyBoYXJkIG1vZHVsZXMgaW4gJyArIGZpeHR1cmVQYXRoICsgJyBmaXh0dXJlJywgZml4dHVyZVBhdGgsIGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBleHBvcnRzLndyaXRlRmlsZXMoZml4dHVyZVBhdGgsIGZpbGVzQSlcbiAgICAudGhlbihmdW5jdGlvbigpIHtyZXR1cm4ge2V4cG9ydENvbXBpbGF0aW9uOiB0cnVlfTt9KTtcbiAgfSwgZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIGV4cG9ydHMud3JpdGVGaWxlcyhmaXh0dXJlUGF0aCwgZmlsZXNCKVxuICAgIC50aGVuKGZ1bmN0aW9uKCkge3JldHVybiB7ZXhwb3J0Q29tcGlsYXRpb246IHRydWV9O30pO1xuICB9LCBmdW5jdGlvbihvdXQpIHtcbiAgICB2YXIgaGFyZE1vZHVsZXMgPSBbXTtcbiAgICB2YXIgc2hvcnRlbmVyID0gbmV3IChyZXF1aXJlKCd3ZWJwYWNrL2xpYi9SZXF1ZXN0U2hvcnRlbmVyJykpKHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuLi9maXh0dXJlcycsIGZpeHR1cmVQYXRoKSk7XG4gICAgZnVuY3Rpb24gd2Fsayhjb21waWxhdGlvbikge1xuICAgICAgY29tcGlsYXRpb24ubW9kdWxlcy5mb3JFYWNoKGZ1bmN0aW9uKG1vZHVsZSkge1xuICAgICAgICBpZiAobW9kdWxlLmNhY2hlSXRlbSAmJiBtb2R1bGUuYnVpbGRUaW1lc3RhbXAgPT09IG1vZHVsZS5jYWNoZUl0ZW0uYnVpbGQuYnVpbGRUaW1lc3RhbXApIHtcbiAgICAgICAgICBoYXJkTW9kdWxlcy5wdXNoKG1vZHVsZS5yZWFkYWJsZUlkZW50aWZpZXIoc2hvcnRlbmVyKSk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgY29tcGlsYXRpb24uY2hpbGRyZW4uZm9yRWFjaCh3YWxrKTtcbiAgICB9XG4gICAgd2FsayhvdXQucnVuMi5jb21waWxhdGlvbik7XG4gICAgaWYgKHR5cGVvZiBleHBlY3RIYW5kbGUgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHJldHVybiBleHBlY3RIYW5kbGUob3V0LCBoYXJkTW9kdWxlcyk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgZXhwZWN0SGFuZGxlLmZvckVhY2goZnVuY3Rpb24oaGFuZGxlKSB7XG4gICAgICAgIGlmIChoYW5kbGUgaW5zdGFuY2VvZiBSZWdFeHApIHtcbiAgICAgICAgICBleHBlY3QoaGFyZE1vZHVsZXMpLnRvLnNhdGlzZnkoZnVuY3Rpb24obW9kdWxlcykge1xuICAgICAgICAgICAgcmV0dXJuIG1vZHVsZXMucmVkdWNlKGZ1bmN0aW9uKGNhcnJ5LCBtb2R1bGUpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIGNhcnJ5IHx8IGhhbmRsZS50ZXN0KG1vZHVsZSk7XG4gICAgICAgICAgICB9LCBmYWxzZSk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgaWYgKGhhbmRsZS5zdGFydHNXaXRoKCchJykpIHtcbiAgICAgICAgICAgIGV4cGVjdChoYXJkTW9kdWxlcykudG8ubm90LmluY2x1ZGUoaGFuZGxlLnN1YnN0cmluZygxKSk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGV4cGVjdChoYXJkTW9kdWxlcykudG8uaW5jbHVkZShoYW5kbGUpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuICB9KTtcbiAgYmVmb3JlKGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBleHBvcnRzLmNsZWFuKGZpeHR1cmVQYXRoKTtcbiAgfSk7XG59O1xuXG5leHBvcnRzLml0Q29tcGlsZXNIYXJkTW9kdWxlcy5za2lwSWYgPSBmdW5jdGlvbihmZWF0dXJlcykge1xuICByZXR1cm4gZnVuY3Rpb24oZml4dHVyZVBhdGgsIC4uLmFyZ3MpIHtcbiAgICBpZiAoZmVhdHVyZXMuZXZlcnkoZiA9PiBmKSkge1xuICAgICAgcmV0dXJuIGV4cG9ydHMuaXRDb21waWxlc0hhcmRNb2R1bGVzKGZpeHR1cmVQYXRoLCAuLi5hcmdzKTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICByZXR1cm4gaXQuc2tpcCgnYnVpbGRzIGhhcmQgbW9kdWxlcyBpbiAnICsgZml4dHVyZVBhdGggKyAnIGZpeHR1cmUnKTtcbiAgICB9XG4gIH1cbn07XG5cbmV4cG9ydHMuY2xlYW4gPSBmdW5jdGlvbihmaXh0dXJlUGF0aCkge1xuICB2YXIgdG1wUGF0aCA9IHBhdGguam9pbihfX2Rpcm5hbWUsICcuLicsICdmaXh0dXJlcycsIGZpeHR1cmVQYXRoLCAndG1wJyk7XG4gIHZhciBubVBhdGggPSBwYXRoLmpvaW4oX19kaXJuYW1lLCAnLi4nLCAnZml4dHVyZXMnLCBmaXh0dXJlUGF0aCwgJ25vZGVfbW9kdWxlcycpO1xuICByZXR1cm4gUHJvbWlzZS5hbGwoW1xuICAgIHByb21pc2lmeShyaW1yYWYpKHRtcFBhdGgpLFxuICAgIHByb21pc2lmeShyaW1yYWYpKG5tUGF0aCksXG4gIF0pXG4gIC50aGVuKGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBwcm9taXNpZnkobWtkaXJwKSh0bXBQYXRoKTtcbiAgfSk7XG59O1xuXG5leHBvcnRzLmRlc2NyaWJlV1AgPSBmdW5jdGlvbih2ZXJzaW9uKSB7XG4gIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICB2YXIgd3BWZXJzaW9uID0gTnVtYmVyKHJlcXVpcmUoJ3dlYnBhY2svcGFja2FnZS5qc29uJykudmVyc2lvblswXSk7XG4gICAgaWYgKHdwVmVyc2lvbiA+PSB2ZXJzaW9uKSB7XG4gICAgICBkZXNjcmliZS5hcHBseShudWxsLCBhcmd1bWVudHMpO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIGRlc2NyaWJlLnNraXAuYXBwbHkobnVsbCwgYXJndW1lbnRzKTtcbiAgICB9XG4gIH07XG59O1xuXG5leHBvcnRzLmRlc2NyaWJlV1AyID0gZXhwb3J0cy5kZXNjcmliZVdQKDIpO1xuIl0sInNvdXJjZVJvb3QiOiIvVXNlcnMvdHlsZXJhcmJ1cy9kZXYvcHJvdmlkZXIvc3JjIn0=

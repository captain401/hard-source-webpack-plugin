'use strict';

var fs = require('fs');

var expect = require('chai').expect;

var describeWP = require('./util').describeWP;
var itCompiles = require('./util').itCompiles;
var itCompilesChange = require('./util').itCompilesChange;
var itCompilesHardModules = require('./util').itCompilesHardModules;
var itCompilesTwice = require('./util').itCompilesTwice;
var itCompilesWithCache = require('./util').itCompilesWithCache;
var writeFiles = require('./util').writeFiles;

describe('hard-source features', function () {

  describe('with identical content, but has changed', function () {
    context('with an update, but identical content', function () {
      itCompilesWithCache('does not change the cache without a content change', 'hard-source-md5', function () {
        return writeFiles('hard-source-md5', {
          'fib.js': ['module.exports = function(n) {', '  return n + (n > 0 ? n - 1 : 0);', '};'].join('\n')
        });
      }, function () {
        return writeFiles('hard-source-md5', {
          'fib.js': ['module.exports = function(n) {', '  return n + (n > 0 ? n - 1 : 0);', '};'].join('\n')
        });
      }, function (cache1, cache2) {
        delete cache1.__hardSource_parityToken_root;
        delete cache2.__hardSource_parityToken_root;
        expect(cache1).to.eql(cache2);
      });
    });

    context('with an update and different content', function () {
      itCompilesWithCache('does not change the cache without a content change', 'hard-source-md5', function () {
        return writeFiles('hard-source-md5', {
          'fib.js': ['module.exports = function(n) {', '  return n + (n > 0 ? n - 1 : 0);', '};'].join('\n')
        });
      }, function () {
        return writeFiles('hard-source-md5', {
          'fib.js': ['module.exports = function(n) {', '  return 1;', '};'].join('\n')
        });
      }, function (cache1, cache2) {
        expect(cache1).to.not.eql(cache2);
      });
    });
  });

  itCompiles('compiles hard-source-confighash with fresh cache', 'hard-source-confighash', function () {
    return writeFiles('hard-source-confighash', {
      'config-hash': 'a'
    });
  }, function () {
    return writeFiles('hard-source-confighash', {
      'config-hash': 'b'
    }).then(function () {
      return fs.readFileSync(__dirname + '/fixtures/hard-source-confighash/tmp/cache/stamp', 'utf8');
    });
  }, function (output) {
    var stamp = fs.readFileSync(__dirname + '/fixtures/hard-source-confighash/tmp/cache/stamp', 'utf8');
    expect(stamp).to.not.equal(output.setup2);
  });

  itCompilesChange('hard-source-confighash-dir', {
    'config-hash': 'a',
    'fib.js': ['module.exports = function(n) {', '  return n + (n > 0 ? n - 1 : 0);', '};'].join('\n'),
    'fib/index.js': null
  }, {
    'config-hash': 'b',
    'fib.js': null,
    'fib/index.js': ['module.exports = function(n) {', '  return n + (n > 0 ? n - 2 : 0);', '};'].join('\n')
  }, function (output) {
    expect(fs.readdirSync(__dirname + '/fixtures/hard-source-confighash-dir/tmp/cache')).to.have.length(2);
  });

  function itCompilesEnvironmentHashDisabled(key, config, config2) {
    itCompiles('compiles hard-source-environmenthash-' + key + ' with out of date vendor when environment paths disabled', 'hard-source-environmenthash', function () {
      return writeFiles('hard-source-environmenthash', {
        'hard-source-config.js': config.join('\n'),
        'vendor/lib1.js': 'console.log("a");\n'
      });
    }, function () {
      return writeFiles('hard-source-environmenthash', {
        'hard-source-config.js': (config2 || config).join('\n'),
        'vendor/lib1.js': 'console.log("b");\n'
      });
    }, function (output) {
      expect(output.run1).to.eql(output.run2);
      expect(output.run2['main.js']).to.not.match(/"b"/);
    });
  }

  function itCompilesEnvironmentHash(key, config, config2) {
    itCompiles('compiles hard-source-environmenthash-' + key + ' with fresh cache', 'hard-source-environmenthash', function () {
      return writeFiles('hard-source-environmenthash', {
        'hard-source-config.js': config.join('\n'),
        'vendor/lib1.js': 'console.log("a");\n',
        'env-hash': 'a'
      });
    }, function () {
      return writeFiles('hard-source-environmenthash', {
        'hard-source-config.js': (config2 || config).join('\n'),
        'vendor/lib1.js': 'console.log("b");\n',
        'env-hash': 'b'
      }).then(function () {
        return fs.readFileSync(__dirname + '/fixtures/hard-source-environmenthash/tmp/cache/stamp', 'utf8');
      });
    }, function (output) {
      var stamp = fs.readFileSync(__dirname + '/fixtures/hard-source-environmenthash/tmp/cache/stamp', 'utf8');
      expect(stamp).to.not.equal(output.setup2);
    });
  }

  itCompilesEnvironmentHashDisabled('false', ['{', '  cacheDirectory: "cache",', '  environmentHash: false,', '}'], ['{', '  cacheDirectory: "cache",', '  environmentHash: false,', '}']);

  itCompilesEnvironmentHash('string', ['{', '  cacheDirectory: "cache",', '  environmentHash: "a",', '}'], ['{', '  cacheDirectory: "cache",', '  environmentHash: "b",', '}']);

  itCompilesEnvironmentHash('envhash', ['{', '  cacheDirectory: "cache",', '  environmentHash: {', '    root: __dirname,', '    directories: ["vendor"],', '    files: [],', '  },', '}']);

  itCompilesEnvironmentHash('envhash-files', ['{', '  cacheDirectory: "cache",', '  environmentHash: {', '    root: __dirname,', '    directories: ["vendor"],', '    files: ["env-hash"],', '  },', '}']);

  itCompilesEnvironmentHash('function', ['{', '  cacheDirectory: "cache",', '  environmentHash: function(config) {', '    return fs.readFileSync(__dirname + "/env-hash", "utf8");', '  },', '}']);

  itCompilesEnvironmentHash('function-promise', ['{', '  cacheDirectory: "cache",', '  environmentHash: function(config) {', '    return new Promise(function(resolve, reject) {', '      fs.readFile(__dirname + "/env-hash", "utf8", function(err, src) {', '        if (err) {return reject(err);}', '        resolve(src);', '      });', '    });', '  },', '}']);

  var _packageYarnLockHashConfig = ['{', '  cacheDirectory: "cache",', '  environmentHash: {', '    root: __dirname,', '  },', '}'];

  function itCompilesPackageYarnLockHash(key, files1, files2) {
    itCompiles('compiles hard-source-packageyarnlock-hash ' + key + ' with fresh cache', 'hard-source-packageyarnlock-hash', function () {
      return writeFiles('hard-source-packageyarnlock-hash', Object.assign({
        'hard-source-config.js': _packageYarnLockHashConfig.join('\n')
      }, files1));
    }, function () {
      return writeFiles('hard-source-packageyarnlock-hash', Object.assign({
        'hard-source-config.js': _packageYarnLockHashConfig.join('\n')
      }, files2)).then(function () {
        return fs.readFileSync(__dirname + '/fixtures/hard-source-packageyarnlock-hash/tmp/cache/stamp', 'utf8');
      });
    }, function (output) {
      var stamp = fs.readFileSync(__dirname + '/fixtures/hard-source-packageyarnlock-hash/tmp/cache/stamp', 'utf8');
      expect(stamp).to.not.equal(output.setup2);
    });
  }

  itCompilesPackageYarnLockHash('package-lock', {
    'package-lock.json': 'a',
    'yarn.lock': null
  }, {
    'package-lock.json': 'b',
    'yarn.lock': null
  });

  itCompilesPackageYarnLockHash('yarn-lock', {
    'package-lock.json': null,
    'yarn.lock': 'a'
  }, {
    'package-lock.json': null,
    'yarn.lock': 'b'
  });

  itCompilesPackageYarnLockHash('package-yarn-lock', {
    'package-lock.json': 'a',
    'yarn.lock': 'b'
  }, {
    'package-lock.json': 'a',
    'yarn.lock': 'c'
  });

  itCompilesPackageYarnLockHash('package-yarn-lock-2', {
    'package-lock.json': 'a',
    'yarn.lock': 'b'
  }, {
    'package-lock.json': 'c',
    'yarn.lock': 'b'
  });

  itCompilesTwice('hard-source-exclude-plugin');
  itCompilesHardModules('hard-source-exclude-plugin', ['./index.js', '!./fib.js']);

  itCompilesChange('hard-source-prune', {
    'config-hash': 'a'
  }, {
    'config-hash': 'b'
  }, function (output) {
    expect(fs.readdirSync(__dirname + '/fixtures/hard-source-prune/tmp/cache')).to.have.length(1);
  });
});

describeWP(4)('hard-source webpack 4 features', function () {

  itCompilesTwice('hard-source-parallel-plugin');
  itCompilesTwice('hard-source-parallel-plugin-config-mismatch');
  itCompilesTwice('hard-source-parallel-plugin-context');
  itCompilesTwice('hard-source-parallel-plugin-defaults');
});
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImhhcmQtc291cmNlLXdlYnBhY2stcGx1Z2luL3Rlc3RzL2hhcmQtc291cmNlLmpzIl0sIm5hbWVzIjpbImZzIiwicmVxdWlyZSIsImV4cGVjdCIsImRlc2NyaWJlV1AiLCJpdENvbXBpbGVzIiwiaXRDb21waWxlc0NoYW5nZSIsIml0Q29tcGlsZXNIYXJkTW9kdWxlcyIsIml0Q29tcGlsZXNUd2ljZSIsIml0Q29tcGlsZXNXaXRoQ2FjaGUiLCJ3cml0ZUZpbGVzIiwiZGVzY3JpYmUiLCJjb250ZXh0Iiwiam9pbiIsImNhY2hlMSIsImNhY2hlMiIsIl9faGFyZFNvdXJjZV9wYXJpdHlUb2tlbl9yb290IiwidG8iLCJlcWwiLCJub3QiLCJ0aGVuIiwicmVhZEZpbGVTeW5jIiwiX19kaXJuYW1lIiwib3V0cHV0Iiwic3RhbXAiLCJlcXVhbCIsInNldHVwMiIsInJlYWRkaXJTeW5jIiwiaGF2ZSIsImxlbmd0aCIsIml0Q29tcGlsZXNFbnZpcm9ubWVudEhhc2hEaXNhYmxlZCIsImtleSIsImNvbmZpZyIsImNvbmZpZzIiLCJydW4xIiwicnVuMiIsIm1hdGNoIiwiaXRDb21waWxlc0Vudmlyb25tZW50SGFzaCIsIl9wYWNrYWdlWWFybkxvY2tIYXNoQ29uZmlnIiwiaXRDb21waWxlc1BhY2thZ2VZYXJuTG9ja0hhc2giLCJmaWxlczEiLCJmaWxlczIiLCJPYmplY3QiLCJhc3NpZ24iXSwibWFwcGluZ3MiOiI7O0FBQUEsSUFBSUEsS0FBS0MsUUFBUSxJQUFSLENBQVQ7O0FBRUEsSUFBSUMsU0FBU0QsUUFBUSxNQUFSLEVBQWdCQyxNQUE3Qjs7QUFFQSxJQUFJQyxhQUFhRixrQkFBa0JFLFVBQW5DO0FBQ0EsSUFBSUMsYUFBYUgsa0JBQWtCRyxVQUFuQztBQUNBLElBQUlDLG1CQUFtQkosa0JBQWtCSSxnQkFBekM7QUFDQSxJQUFJQyx3QkFBd0JMLGtCQUFrQksscUJBQTlDO0FBQ0EsSUFBSUMsa0JBQWtCTixrQkFBa0JNLGVBQXhDO0FBQ0EsSUFBSUMsc0JBQXNC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LENBQWVMLFlBQVksdUNBQTNCLENBQVAsRUFDQ0wsRUFERCxDQUNJVyxJQURKLENBQ1NDLE1BRFQsQ0FDZ0IsQ0FEaEI7QUFFRCxHQVBEO0FBU0QsQ0F0UkQ7O0FBd1JBekIsV0FBVyxDQUFYLEVBQWMsZ0NBQWQsRUFBZ0QsWUFBVzs7QUFFekRJLGtCQUFnQiw2QkFBaEI7QUFDQUEsa0JBQWdCLDZDQUFoQjtBQUNBQSxrQkFBZ0IscUNBQWhCO0FBQ0FBLGtCQUFnQixzQ0FBaEI7QUFFRCxDQVBEIiwiZmlsZSI6ImhhcmQtc291cmNlLXdlYnBhY2stcGx1Z2luL3Rlc3RzL2hhcmQtc291cmNlLmpzIiwic291cmNlc0NvbnRlbnQiOlsidmFyIGZzID0gcmVxdWlyZSgnZnMnKTtcblxudmFyIGV4cGVjdCA9IHJlcXVpcmUoJ2NoYWknKS5leHBlY3Q7XG5cbnZhciBkZXNjcmliZVdQID0gcmVxdWlyZSgnLi91dGlsJykuZGVzY3JpYmVXUDtcbnZhciBpdENvbXBpbGVzID0gcmVxdWlyZSgnLi91dGlsJykuaXRDb21waWxlcztcbnZhciBpdENvbXBpbGVzQ2hhbmdlID0gcmVxdWlyZSgnLi91dGlsJykuaXRDb21waWxlc0NoYW5nZTtcbnZhciBpdENvbXBpbGVzSGFyZE1vZHVsZXMgPSByZXF1aXJlKCcuL3V0aWwnKS5pdENvbXBpbGVzSGFyZE1vZHVsZXM7XG52YXIgaXRDb21waWxlc1R3aWNlID0gcmVxdWlyZSgnLi91dGlsJykuaXRDb21waWxlc1R3aWNlO1xudmFyIGl0Q29tcGlsZXNXaXRoQ2FjaGUgPSByZXF1aXJlKCcuL3V0aWwnKS5pdENvbXBpbGVzV2l0aENhY2hlO1xudmFyIHdyaXRlRmlsZXMgPSByZXF1aXJlKCcuL3V0aWwnKS53cml0ZUZpbGVzO1xuXG5kZXNjcmliZSgnaGFyZC1zb3VyY2UgZmVhdHVyZXMnLCBmdW5jdGlvbigpIHtcblxuICBkZXNjcmliZSgnd2l0aCBpZGVudGljYWwgY29udGVudCwgYnV0IGhhcyBjaGFuZ2VkJywgZnVuY3Rpb24oKSB7XG4gICAgY29udGV4dCgnd2l0aCBhbiB1cGRhdGUsIGJ1dCBpZGVudGljYWwgY29udGVudCcsIGZ1bmN0aW9uKCkge1xuICAgICAgaXRDb21waWxlc1dpdGhDYWNoZShcbiAgICAgICAgJ2RvZXMgbm90IGNoYW5nZSB0aGUgY2FjaGUgd2l0aG91dCBhIGNvbnRlbnQgY2hhbmdlJyxcbiAgICAgICAgJ2hhcmQtc291cmNlLW1kNScsXG4gICAgICAgIGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHJldHVybiB3cml0ZUZpbGVzKCdoYXJkLXNvdXJjZS1tZDUnLCB7XG4gICAgICAgICAgICAnZmliLmpzJzogW1xuICAgICAgICAgICAgICAnbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihuKSB7JyxcbiAgICAgICAgICAgICAgJyAgcmV0dXJuIG4gKyAobiA+IDAgPyBuIC0gMSA6IDApOycsXG4gICAgICAgICAgICAgICd9OycsXG4gICAgICAgICAgICBdLmpvaW4oJ1xcbicpXG4gICAgICAgICAgfSlcbiAgICAgICAgfSxcbiAgICAgICAgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgcmV0dXJuIHdyaXRlRmlsZXMoJ2hhcmQtc291cmNlLW1kNScsIHtcbiAgICAgICAgICAgICdmaWIuanMnOiBbXG4gICAgICAgICAgICAgICdtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKG4pIHsnLFxuICAgICAgICAgICAgICAnICByZXR1cm4gbiArIChuID4gMCA/IG4gLSAxIDogMCk7JyxcbiAgICAgICAgICAgICAgJ307JyxcbiAgICAgICAgICAgIF0uam9pbignXFxuJylcbiAgICAgICAgICB9KVxuICAgICAgICB9LFxuICAgICAgICBmdW5jdGlvbihjYWNoZTEsIGNhY2hlMikge1xuICAgICAgICAgIGRlbGV0ZSBjYWNoZTEuX19oYXJkU291cmNlX3Bhcml0eVRva2VuX3Jvb3Q7XG4gICAgICAgICAgZGVsZXRlIGNhY2hlMi5fX2hhcmRTb3VyY2VfcGFyaXR5VG9rZW5fcm9vdDtcbiAgICAgICAgICBleHBlY3QoY2FjaGUxKS50by5lcWwoY2FjaGUyKTtcbiAgICAgICAgfVxuICAgICAgKTtcbiAgICB9KTtcblxuICAgIGNvbnRleHQoJ3dpdGggYW4gdXBkYXRlIGFuZCBkaWZmZXJlbnQgY29udGVudCcsIGZ1bmN0aW9uKCkge1xuICAgICAgaXRDb21waWxlc1dpdGhDYWNoZShcbiAgICAgICAgJ2RvZXMgbm90IGNoYW5nZSB0aGUgY2FjaGUgd2l0aG91dCBhIGNvbnRlbnQgY2hhbmdlJyxcbiAgICAgICAgJ2hhcmQtc291cmNlLW1kNScsXG4gICAgICAgIGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHJldHVybiB3cml0ZUZpbGVzKCdoYXJkLXNvdXJjZS1tZDUnLCB7XG4gICAgICAgICAgICAnZmliLmpzJzogW1xuICAgICAgICAgICAgICAnbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihuKSB7JyxcbiAgICAgICAgICAgICAgJyAgcmV0dXJuIG4gKyAobiA+IDAgPyBuIC0gMSA6IDApOycsXG4gICAgICAgICAgICAgICd9OycsXG4gICAgICAgICAgICBdLmpvaW4oJ1xcbicpXG4gICAgICAgICAgfSk7XG4gICAgICAgIH0sXG4gICAgICAgIGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHJldHVybiB3cml0ZUZpbGVzKCdoYXJkLXNvdXJjZS1tZDUnLCB7XG4gICAgICAgICAgICAnZmliLmpzJzogW1xuICAgICAgICAgICAgICAnbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihuKSB7JyxcbiAgICAgICAgICAgICAgJyAgcmV0dXJuIDE7JyxcbiAgICAgICAgICAgICAgJ307JyxcbiAgICAgICAgICAgIF0uam9pbignXFxuJylcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSxcbiAgICAgICAgZnVuY3Rpb24oY2FjaGUxLCBjYWNoZTIpIHtcbiAgICAgICAgICBleHBlY3QoY2FjaGUxKS50by5ub3QuZXFsKGNhY2hlMik7XG4gICAgICAgIH1cbiAgICAgICk7XG4gICAgfSk7XG4gIH0pO1xuXG4gIGl0Q29tcGlsZXMoJ2NvbXBpbGVzIGhhcmQtc291cmNlLWNvbmZpZ2hhc2ggd2l0aCBmcmVzaCBjYWNoZScsICdoYXJkLXNvdXJjZS1jb25maWdoYXNoJywgZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHdyaXRlRmlsZXMoJ2hhcmQtc291cmNlLWNvbmZpZ2hhc2gnLCB7XG4gICAgICAnY29uZmlnLWhhc2gnOiAnYScsXG4gICAgfSk7XG4gIH0sIGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB3cml0ZUZpbGVzKCdoYXJkLXNvdXJjZS1jb25maWdoYXNoJywge1xuICAgICAgJ2NvbmZpZy1oYXNoJzogJ2InLFxuICAgIH0pXG4gICAgLnRoZW4oZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gZnMucmVhZEZpbGVTeW5jKF9fZGlybmFtZSArICcvZml4dHVyZXMvaGFyZC1zb3VyY2UtY29uZmlnaGFzaC90bXAvY2FjaGUvc3RhbXAnLCAndXRmOCcpO1xuICAgIH0pO1xuICB9LCBmdW5jdGlvbihvdXRwdXQpIHtcbiAgICB2YXIgc3RhbXAgPSBmcy5yZWFkRmlsZVN5bmMoX19kaXJuYW1lICsgJy9maXh0dXJlcy9oYXJkLXNvdXJjZS1jb25maWdoYXNoL3RtcC9jYWNoZS9zdGFtcCcsICd1dGY4Jyk7XG4gICAgZXhwZWN0KHN0YW1wKS50by5ub3QuZXF1YWwob3V0cHV0LnNldHVwMik7XG4gIH0pO1xuXG4gIGl0Q29tcGlsZXNDaGFuZ2UoJ2hhcmQtc291cmNlLWNvbmZpZ2hhc2gtZGlyJywge1xuICAgICdjb25maWctaGFzaCc6ICdhJyxcbiAgICAnZmliLmpzJzogW1xuICAgICAgJ21vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24obikgeycsXG4gICAgICAnICByZXR1cm4gbiArIChuID4gMCA/IG4gLSAxIDogMCk7JyxcbiAgICAgICd9OycsXG4gICAgXS5qb2luKCdcXG4nKSxcbiAgICAnZmliL2luZGV4LmpzJzogbnVsbCxcbiAgfSwge1xuICAgICdjb25maWctaGFzaCc6ICdiJyxcbiAgICAnZmliLmpzJzogbnVsbCxcbiAgICAnZmliL2luZGV4LmpzJzogW1xuICAgICAgJ21vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24obikgeycsXG4gICAgICAnICByZXR1cm4gbiArIChuID4gMCA/IG4gLSAyIDogMCk7JyxcbiAgICAgICd9OycsXG4gICAgXS5qb2luKCdcXG4nKSxcbiAgfSwgZnVuY3Rpb24ob3V0cHV0KSB7XG4gICAgZXhwZWN0KGZzLnJlYWRkaXJTeW5jKF9fZGlybmFtZSArICcvZml4dHVyZXMvaGFyZC1zb3VyY2UtY29uZmlnaGFzaC1kaXIvdG1wL2NhY2hlJykpXG4gICAgLnRvLmhhdmUubGVuZ3RoKDIpO1xuICB9KTtcblxuICBmdW5jdGlvbiBpdENvbXBpbGVzRW52aXJvbm1lbnRIYXNoRGlzYWJsZWQoa2V5LCBjb25maWcsIGNvbmZpZzIpIHtcbiAgICBpdENvbXBpbGVzKCdjb21waWxlcyBoYXJkLXNvdXJjZS1lbnZpcm9ubWVudGhhc2gtJyArIGtleSArICcgd2l0aCBvdXQgb2YgZGF0ZSB2ZW5kb3Igd2hlbiBlbnZpcm9ubWVudCBwYXRocyBkaXNhYmxlZCcsICdoYXJkLXNvdXJjZS1lbnZpcm9ubWVudGhhc2gnLCBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiB3cml0ZUZpbGVzKCdoYXJkLXNvdXJjZS1lbnZpcm9ubWVudGhhc2gnLCB7XG4gICAgICAgICdoYXJkLXNvdXJjZS1jb25maWcuanMnOiBjb25maWcuam9pbignXFxuJyksXG4gICAgICAgICd2ZW5kb3IvbGliMS5qcyc6ICdjb25zb2xlLmxvZyhcImFcIik7XFxuJyxcbiAgICAgIH0pO1xuICAgIH0sIGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHdyaXRlRmlsZXMoJ2hhcmQtc291cmNlLWVudmlyb25tZW50aGFzaCcsIHtcbiAgICAgICAgJ2hhcmQtc291cmNlLWNvbmZpZy5qcyc6IChjb25maWcyIHx8IGNvbmZpZykuam9pbignXFxuJyksXG4gICAgICAgICd2ZW5kb3IvbGliMS5qcyc6ICdjb25zb2xlLmxvZyhcImJcIik7XFxuJyxcbiAgICAgIH0pO1xuICAgIH0sIGZ1bmN0aW9uKG91dHB1dCkge1xuICAgICAgZXhwZWN0KG91dHB1dC5ydW4xKS50by5lcWwob3V0cHV0LnJ1bjIpO1xuICAgICAgZXhwZWN0KG91dHB1dC5ydW4yWydtYWluLmpzJ10pLnRvLm5vdC5tYXRjaCgvXCJiXCIvKTtcbiAgICB9KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGl0Q29tcGlsZXNFbnZpcm9ubWVudEhhc2goa2V5LCBjb25maWcsIGNvbmZpZzIpIHtcbiAgICBpdENvbXBpbGVzKCdjb21waWxlcyBoYXJkLXNvdXJjZS1lbnZpcm9ubWVudGhhc2gtJyArIGtleSArICcgd2l0aCBmcmVzaCBjYWNoZScsICdoYXJkLXNvdXJjZS1lbnZpcm9ubWVudGhhc2gnLCBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiB3cml0ZUZpbGVzKCdoYXJkLXNvdXJjZS1lbnZpcm9ubWVudGhhc2gnLCB7XG4gICAgICAgICdoYXJkLXNvdXJjZS1jb25maWcuanMnOiBjb25maWcuam9pbignXFxuJyksXG4gICAgICAgICd2ZW5kb3IvbGliMS5qcyc6ICdjb25zb2xlLmxvZyhcImFcIik7XFxuJyxcbiAgICAgICAgJ2Vudi1oYXNoJzogJ2EnLFxuICAgICAgfSk7XG4gICAgfSwgZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gd3JpdGVGaWxlcygnaGFyZC1zb3VyY2UtZW52aXJvbm1lbnRoYXNoJywge1xuICAgICAgICAnaGFyZC1zb3VyY2UtY29uZmlnLmpzJzogKGNvbmZpZzIgfHwgY29uZmlnKS5qb2luKCdcXG4nKSxcbiAgICAgICAgJ3ZlbmRvci9saWIxLmpzJzogJ2NvbnNvbGUubG9nKFwiYlwiKTtcXG4nLFxuICAgICAgICAnZW52LWhhc2gnOiAnYicsXG4gICAgICB9KVxuICAgICAgLnRoZW4oZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBmcy5yZWFkRmlsZVN5bmMoX19kaXJuYW1lICsgJy9maXh0dXJlcy9oYXJkLXNvdXJjZS1lbnZpcm9ubWVudGhhc2gvdG1wL2NhY2hlL3N0YW1wJywgJ3V0ZjgnKTtcbiAgICAgIH0pO1xuICAgIH0sIGZ1bmN0aW9uKG91dHB1dCkge1xuICAgICAgdmFyIHN0YW1wID0gZnMucmVhZEZpbGVTeW5jKF9fZGlybmFtZSArICcvZml4dHVyZXMvaGFyZC1zb3VyY2UtZW52aXJvbm1lbnRoYXNoL3RtcC9jYWNoZS9zdGFtcCcsICd1dGY4Jyk7XG4gICAgICBleHBlY3Qoc3RhbXApLnRvLm5vdC5lcXVhbChvdXRwdXQuc2V0dXAyKTtcbiAgICB9KTtcbiAgfVxuXG4gIGl0Q29tcGlsZXNFbnZpcm9ubWVudEhhc2hEaXNhYmxlZCgnZmFsc2UnLCBbXG4gICAgJ3snLFxuICAgICcgIGNhY2hlRGlyZWN0b3J5OiBcImNhY2hlXCIsJyxcbiAgICAnICBlbnZpcm9ubWVudEhhc2g6IGZhbHNlLCcsXG4gICAgJ30nLFxuICBdLCBbXG4gICAgJ3snLFxuICAgICcgIGNhY2hlRGlyZWN0b3J5OiBcImNhY2hlXCIsJyxcbiAgICAnICBlbnZpcm9ubWVudEhhc2g6IGZhbHNlLCcsXG4gICAgJ30nLFxuICBdKTtcblxuICBpdENvbXBpbGVzRW52aXJvbm1lbnRIYXNoKCdzdHJpbmcnLCBbXG4gICAgJ3snLFxuICAgICcgIGNhY2hlRGlyZWN0b3J5OiBcImNhY2hlXCIsJyxcbiAgICAnICBlbnZpcm9ubWVudEhhc2g6IFwiYVwiLCcsXG4gICAgJ30nLFxuICBdLCBbXG4gICAgJ3snLFxuICAgICcgIGNhY2hlRGlyZWN0b3J5OiBcImNhY2hlXCIsJyxcbiAgICAnICBlbnZpcm9ubWVudEhhc2g6IFwiYlwiLCcsXG4gICAgJ30nLFxuICBdKTtcblxuICBpdENvbXBpbGVzRW52aXJvbm1lbnRIYXNoKCdlbnZoYXNoJywgW1xuICAgICd7JyxcbiAgICAnICBjYWNoZURpcmVjdG9yeTogXCJjYWNoZVwiLCcsXG4gICAgJyAgZW52aXJvbm1lbnRIYXNoOiB7JyxcbiAgICAnICAgIHJvb3Q6IF9fZGlybmFtZSwnLFxuICAgICcgICAgZGlyZWN0b3JpZXM6IFtcInZlbmRvclwiXSwnLFxuICAgICcgICAgZmlsZXM6IFtdLCcsXG4gICAgJyAgfSwnLFxuICAgICd9JyxcbiAgXSk7XG5cbiAgaXRDb21waWxlc0Vudmlyb25tZW50SGFzaCgnZW52aGFzaC1maWxlcycsIFtcbiAgICAneycsXG4gICAgJyAgY2FjaGVEaXJlY3Rvcnk6IFwiY2FjaGVcIiwnLFxuICAgICcgIGVudmlyb25tZW50SGFzaDogeycsXG4gICAgJyAgICByb290OiBfX2Rpcm5hbWUsJyxcbiAgICAnICAgIGRpcmVjdG9yaWVzOiBbXCJ2ZW5kb3JcIl0sJyxcbiAgICAnICAgIGZpbGVzOiBbXCJlbnYtaGFzaFwiXSwnLFxuICAgICcgIH0sJyxcbiAgICAnfScsXG4gIF0pO1xuXG4gIGl0Q29tcGlsZXNFbnZpcm9ubWVudEhhc2goJ2Z1bmN0aW9uJywgW1xuICAgICd7JyxcbiAgICAnICBjYWNoZURpcmVjdG9yeTogXCJjYWNoZVwiLCcsXG4gICAgJyAgZW52aXJvbm1lbnRIYXNoOiBmdW5jdGlvbihjb25maWcpIHsnLFxuICAgICcgICAgcmV0dXJuIGZzLnJlYWRGaWxlU3luYyhfX2Rpcm5hbWUgKyBcIi9lbnYtaGFzaFwiLCBcInV0ZjhcIik7JyxcbiAgICAnICB9LCcsXG4gICAgJ30nLFxuICBdKTtcblxuICBpdENvbXBpbGVzRW52aXJvbm1lbnRIYXNoKCdmdW5jdGlvbi1wcm9taXNlJywgW1xuICAgICd7JyxcbiAgICAnICBjYWNoZURpcmVjdG9yeTogXCJjYWNoZVwiLCcsXG4gICAgJyAgZW52aXJvbm1lbnRIYXNoOiBmdW5jdGlvbihjb25maWcpIHsnLFxuICAgICcgICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCkgeycsXG4gICAgJyAgICAgIGZzLnJlYWRGaWxlKF9fZGlybmFtZSArIFwiL2Vudi1oYXNoXCIsIFwidXRmOFwiLCBmdW5jdGlvbihlcnIsIHNyYykgeycsXG4gICAgJyAgICAgICAgaWYgKGVycikge3JldHVybiByZWplY3QoZXJyKTt9JyxcbiAgICAnICAgICAgICByZXNvbHZlKHNyYyk7JyxcbiAgICAnICAgICAgfSk7JyxcbiAgICAnICAgIH0pOycsXG4gICAgJyAgfSwnLFxuICAgICd9JyxcbiAgXSk7XG5cbiAgdmFyIF9wYWNrYWdlWWFybkxvY2tIYXNoQ29uZmlnID0gW1xuICAgICd7JyxcbiAgICAnICBjYWNoZURpcmVjdG9yeTogXCJjYWNoZVwiLCcsXG4gICAgJyAgZW52aXJvbm1lbnRIYXNoOiB7JyxcbiAgICAnICAgIHJvb3Q6IF9fZGlybmFtZSwnLFxuICAgICcgIH0sJyxcbiAgICAnfScsXG4gIF07XG5cbiAgZnVuY3Rpb24gaXRDb21waWxlc1BhY2thZ2VZYXJuTG9ja0hhc2goa2V5LCBmaWxlczEsIGZpbGVzMikge1xuICAgIGl0Q29tcGlsZXMoJ2NvbXBpbGVzIGhhcmQtc291cmNlLXBhY2thZ2V5YXJubG9jay1oYXNoICcgKyBrZXkgKyAnIHdpdGggZnJlc2ggY2FjaGUnLCAnaGFyZC1zb3VyY2UtcGFja2FnZXlhcm5sb2NrLWhhc2gnLCBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiB3cml0ZUZpbGVzKCdoYXJkLXNvdXJjZS1wYWNrYWdleWFybmxvY2staGFzaCcsIE9iamVjdC5hc3NpZ24oe1xuICAgICAgICAnaGFyZC1zb3VyY2UtY29uZmlnLmpzJzogX3BhY2thZ2VZYXJuTG9ja0hhc2hDb25maWcuam9pbignXFxuJyksXG4gICAgICB9LCBmaWxlczEpKTtcbiAgICB9LCBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiB3cml0ZUZpbGVzKCdoYXJkLXNvdXJjZS1wYWNrYWdleWFybmxvY2staGFzaCcsIE9iamVjdC5hc3NpZ24oe1xuICAgICAgICAnaGFyZC1zb3VyY2UtY29uZmlnLmpzJzogX3BhY2thZ2VZYXJuTG9ja0hhc2hDb25maWcuam9pbignXFxuJyksXG4gICAgICB9LCBmaWxlczIpKVxuICAgICAgLnRoZW4oZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBmcy5yZWFkRmlsZVN5bmMoX19kaXJuYW1lICsgJy9maXh0dXJlcy9oYXJkLXNvdXJjZS1wYWNrYWdleWFybmxvY2staGFzaC90bXAvY2FjaGUvc3RhbXAnLCAndXRmOCcpO1xuICAgICAgfSk7XG4gICAgfSwgZnVuY3Rpb24ob3V0cHV0KSB7XG4gICAgICB2YXIgc3RhbXAgPSBmcy5yZWFkRmlsZVN5bmMoX19kaXJuYW1lICsgJy9maXh0dXJlcy9oYXJkLXNvdXJjZS1wYWNrYWdleWFybmxvY2staGFzaC90bXAvY2FjaGUvc3RhbXAnLCAndXRmOCcpO1xuICAgICAgZXhwZWN0KHN0YW1wKS50by5ub3QuZXF1YWwob3V0cHV0LnNldHVwMik7XG4gICAgfSk7XG4gIH1cblxuICBpdENvbXBpbGVzUGFja2FnZVlhcm5Mb2NrSGFzaCgncGFja2FnZS1sb2NrJywge1xuICAgICdwYWNrYWdlLWxvY2suanNvbic6ICdhJyxcbiAgICAneWFybi5sb2NrJzogbnVsbCxcbiAgfSwge1xuICAgICdwYWNrYWdlLWxvY2suanNvbic6ICdiJyxcbiAgICAneWFybi5sb2NrJzogbnVsbCxcbiAgfSk7XG5cbiAgaXRDb21waWxlc1BhY2thZ2VZYXJuTG9ja0hhc2goJ3lhcm4tbG9jaycsIHtcbiAgICAncGFja2FnZS1sb2NrLmpzb24nOiBudWxsLFxuICAgICd5YXJuLmxvY2snOiAnYScsXG4gIH0sIHtcbiAgICAncGFja2FnZS1sb2NrLmpzb24nOiBudWxsLFxuICAgICd5YXJuLmxvY2snOiAnYicsXG4gIH0pO1xuXG4gIGl0Q29tcGlsZXNQYWNrYWdlWWFybkxvY2tIYXNoKCdwYWNrYWdlLXlhcm4tbG9jaycsIHtcbiAgICAncGFja2FnZS1sb2NrLmpzb24nOiAnYScsXG4gICAgJ3lhcm4ubG9jayc6ICdiJyxcbiAgfSwge1xuICAgICdwYWNrYWdlLWxvY2suanNvbic6ICdhJyxcbiAgICAneWFybi5sb2NrJzogJ2MnLFxuICB9KTtcblxuICBpdENvbXBpbGVzUGFja2FnZVlhcm5Mb2NrSGFzaCgncGFja2FnZS15YXJuLWxvY2stMicsIHtcbiAgICAncGFja2FnZS1sb2NrLmpzb24nOiAnYScsXG4gICAgJ3lhcm4ubG9jayc6ICdiJyxcbiAgfSwge1xuICAgICdwYWNrYWdlLWxvY2suanNvbic6ICdjJyxcbiAgICAneWFybi5sb2NrJzogJ2InLFxuICB9KTtcblxuICBpdENvbXBpbGVzVHdpY2UoJ2hhcmQtc291cmNlLWV4Y2x1ZGUtcGx1Z2luJyk7XG4gIGl0Q29tcGlsZXNIYXJkTW9kdWxlcygnaGFyZC1zb3VyY2UtZXhjbHVkZS1wbHVnaW4nLCBbJy4vaW5kZXguanMnLCAnIS4vZmliLmpzJ10pO1xuXG4gIGl0Q29tcGlsZXNDaGFuZ2UoJ2hhcmQtc291cmNlLXBydW5lJywge1xuICAgICdjb25maWctaGFzaCc6ICdhJyxcbiAgfSwge1xuICAgICdjb25maWctaGFzaCc6ICdiJyxcbiAgfSwgZnVuY3Rpb24ob3V0cHV0KSB7XG4gICAgZXhwZWN0KGZzLnJlYWRkaXJTeW5jKF9fZGlybmFtZSArICcvZml4dHVyZXMvaGFyZC1zb3VyY2UtcHJ1bmUvdG1wL2NhY2hlJykpXG4gICAgLnRvLmhhdmUubGVuZ3RoKDEpO1xuICB9KTtcblxufSk7XG5cbmRlc2NyaWJlV1AoNCkoJ2hhcmQtc291cmNlIHdlYnBhY2sgNCBmZWF0dXJlcycsIGZ1bmN0aW9uKCkge1xuXG4gIGl0Q29tcGlsZXNUd2ljZSgnaGFyZC1zb3VyY2UtcGFyYWxsZWwtcGx1Z2luJyk7XG4gIGl0Q29tcGlsZXNUd2ljZSgnaGFyZC1zb3VyY2UtcGFyYWxsZWwtcGx1Z2luLWNvbmZpZy1taXNtYXRjaCcpO1xuICBpdENvbXBpbGVzVHdpY2UoJ2hhcmQtc291cmNlLXBhcmFsbGVsLXBsdWdpbi1jb250ZXh0Jyk7XG4gIGl0Q29tcGlsZXNUd2ljZSgnaGFyZC1zb3VyY2UtcGFyYWxsZWwtcGx1Z2luLWRlZmF1bHRzJyk7XG5cbn0pO1xuIl0sInNvdXJjZVJvb3QiOiIvVXNlcnMvdHlsZXJhcmJ1cy9kZXYvcHJvdmlkZXIvc3JjIn0=

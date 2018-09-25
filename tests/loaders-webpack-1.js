'use strict';

var expect = require('chai').expect;

var util = require('./util');
var itCompiles = util.itCompiles;
var itCompilesTwice = util.itCompilesTwice;
var itCompilesChange = util.itCompilesChange;
var itCompilesHardModules = util.itCompilesHardModules;
var clean = util.clean;
var compile = util.compile;
var writeFiles = util.writeFiles;

describe('loader webpack use', function () {

  itCompilesTwice('loader-css');
  itCompilesTwice('loader-file');
  itCompilesTwice('loader-file-context');
  itCompilesTwice('loader-file-options');
  itCompilesTwice('loader-file-use');
  itCompilesTwice('loader-custom-missing-dep');
  itCompilesTwice('loader-custom-no-dep');

  itCompilesHardModules('loader-css', ['./index.css']);
  itCompilesHardModules('loader-file', ['./image.png']);
  // itCompilesHardModules('loader-file-context', ['./image.png']);
  itCompilesHardModules('loader-file-use', ['./src/index.js', './src/image.png']);
  itCompilesHardModules('loader-custom-user-loader', ['./loader.js!./index.js']);
  itCompilesHardModules('loader-custom-no-dep', ['./index.js', './loader.js!./fib.js']);
});

describe('loader webpack warnings & errors', function () {

  var fixturePath = 'loader-warning';

  before(function () {
    return clean(fixturePath);
  });

  it('should cache errors & warnings from loader', function () {
    this.timeout(10000);
    return compile(fixturePath, { exportStats: true }).then(function (run1) {
      return Promise.all([run1, compile(fixturePath, { exportStats: true })]);
    }).then(function (runs) {
      expect(runs[0].out).to.eql(runs[1].out);
      expect(runs[0].warnings.length).to.greaterThan(0);
      expect(runs[0].errors.length).to.greaterThan(0);
      expect(runs[1].warnings).to.eql(runs[0].warnings);
      expect(runs[1].errors).to.eql(runs[0].errors);
    });
  });
});

describe('loader webpack use - builds changes', function () {

  itCompilesChange('loader-custom-context-dep', {
    'dir/a': ['// a'].join('\n'),
    'dir/b': null
  }, {
    'dir/a': null,
    'dir/b': ['// b'].join('\n')
  }, function (output) {
    expect(output.run1['main.js'].toString()).to.match(/\/\/ a/);
    expect(output.run2['main.js'].toString()).to.match(/\/\/ b/);
  });

  itCompilesChange('loader-custom-deep-context-dep', {
    'dir/dirdir': null,
    'dir/subdir/a': '// a',
    'dir/subdir/b': null
  }, {
    'dir/dirdir/a': null,
    'dir/dirdir/b': '// b',
    'dir/subdir': null
  }, function (output) {
    expect(output.run1['main.js'].toString()).to.match(/\/\/ subdir\/a/);
    expect(output.run2['main.js'].toString()).to.match(/\/\/ dirdir\/b/);
  });

  itCompilesChange('loader-custom-prepend-helper', {
    'loader-helper.js': ['function helper(a) {', '  console.log(a);', '}'].join('\n')
  }, {
    'loader-helper.js': ['function helper(b) {', '  console.log(b);', '}'].join('\n')
  }, function (output) {
    expect(output.run1['main.js'].toString()).to.match(/console\.log\(a\)/);
    expect(output.run2['main.js'].toString()).to.match(/console\.log\(b\)/);
  });

  itCompilesChange('loader-custom-missing-dep-added', {
    'fib.js': null
  }, {
    'fib.js': ['module.exports = function(n) {', '  return n + (n > 0 ? n - 1 : 0);', '};'].join('\n')
  }, function (output) {
    expect(output.run1['main.js'].toString()).to.not.match(/n - 1/);
    expect(output.run2['main.js'].toString()).to.match(/n - 1/);
  });

  itCompilesChange('loader-custom-missing-dep-added', {
    'fib.js': ['module.exports = function(n) {', '  return n + (n > 0 ? n - 1 : 0);', '};'].join('\n')
  }, {
    'fib.js': null
  }, function (output) {
    expect(output.run1['main.js'].toString()).to.match(/n - 1/);
    expect(output.run2['main.js'].toString()).to.not.match(/n - 1/);
  });

  itCompilesChange('loader-custom-no-dep-moved', {
    'fib.js': '',
    'fib/index.js': null
  }, {
    'fib.js': null,
    'fib/index.js': ''
  }, function (output) {
    expect(output.run1['main.js'].toString()).to.match(/fib\.js/);
    expect(output.run1['main.js'].toString()).to.not.match(/fib\/index\.js/);
    expect(output.run2['main.js'].toString()).to.match(/fib\/index\.js/);
    expect(output.run2['main.js'].toString()).to.not.match(/fib\.js/);
  });

  itCompilesChange('loader-custom-resolve-missing', {
    'fib.js': null,
    'loader.js': null
  }, {
    'fib.js': ['module.exports = function(n) {', '  return n + (n > 0 ? n - 2 : 0);', '};'].join('\n'),
    'loader.js': null
  }, function (output) {
    expect(output.run1['main.js'].toString()).to.match(/n - 1/);
    expect(output.run2['main.js'].toString()).to.match(/n - 2/);
  });

  itCompilesChange('loader-custom-resolve-missing', {
    'loader.js': null
  }, {
    'loader.js': ['module.exports = function(source) {', '  this.cacheable && this.cacheable();', '  return [', '    \'// loader.js\',', '    source,', '  ].join(\'\\n\');', '};'].join('\n')
  }, function (output) {
    expect(output.run1['main.js'].toString()).to.match(/loader\/index\.js/);
    expect(output.run2['main.js'].toString()).to.match(/loader\.js/);
  });

  itCompilesChange('loader-custom-resolve-missing-query', {
    'fib.js': null,
    'loader.js': null
  }, {
    'fib.js': ['module.exports = function(n) {', '  return n + (n > 0 ? n - 2 : 0);', '};'].join('\n'),
    'loader.js': null
  }, function (output) {
    expect(output.run1['main.js'].toString()).to.match(/n - 1/);
    expect(output.run2['main.js'].toString()).to.match(/n - 2/);
  });

  itCompiles('loader-file-move', 'loader-file-move', function () {
    return writeFiles('loader-file-move', {
      'index.js': 'require(\'./image.png\');\n'
    }).then(function () {
      return {
        exportCompilation: true
      };
    });
  }, function (run1) {
    return new Promise(function (resolve) {
      setTimeout(resolve, 1000);
    }).then(function () {
      return writeFiles('loader-file-move', {
        'index.js': '// require(\'./image.png\');\n'
      });
    }).then(function () {
      return {
        compiler: run1.compiler,
        exportCompilation: true
      };
    });
  }, function (run2) {
    return new Promise(function (resolve) {
      setTimeout(resolve, 1000);
    }).then(function () {
      return writeFiles('loader-file-move', {
        'index.js': 'require(\'./image.png\');\n'
      });
    }).then(function () {
      return {
        compiler: run2.compiler,
        exportCompilation: true
      };
    });
  }, function (output) {
    expect(output.runs[0].compiler).to.equal(output.runs[1].compiler);
    expect(output.runs[0].compiler).to.equal(output.runs[2].compiler);
    expect(output.runs[0].out).to.not.eql(output.runs[1].out);
    expect(output.runs[0].out).to.eql(output.runs[2].out);
  });
});

describe('loader webpack use - watch mode', function () {

  it('loader-file-use: compiles in watch mode', function (done) {
    compile('loader-file-use', { watch: 'startStop' }).then(function (result) {
      return compile('loader-file-use', { watch: 'startStop' });
    }).then(function (result) {
      done();
    }).catch(done);
  });
});
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImhhcmQtc291cmNlLXdlYnBhY2stcGx1Z2luL3Rlc3RzL2xvYWRlcnMtd2VicGFjay0xLmpzIl0sIm5hbWVzIjpbImV4cGVjdCIsInJlcXVpcmUiLCJ1dGlsIiwiaXRDb21waWxlcyIsIml0Q29tcGlsZXNUd2ljZSIsIml0Q29tcGlsZXNDaGFuZ2UiLCJpdENvbXBpbGVzSGFyZE1vZHVsZXMiLCJjbGVhbiIsImNvbXBpbGUiLCJ3cml0ZUZpbGVzIiwiZGVzY3JpYmUiLCJmaXh0dXJlUGF0aCIsImJlZm9yZSIsIml0IiwidGltZW91dCIsImV4cG9ydFN0YXRzIiwidGhlbiIsInJ1bjEiLCJQcm9taXNlIiwiYWxsIiwicnVucyIsIm91dCIsInRvIiwiZXFsIiwid2FybmluZ3MiLCJsZW5ndGgiLCJncmVhdGVyVGhhbiIsImVycm9ycyIsImpvaW4iLCJvdXRwdXQiLCJ0b1N0cmluZyIsIm1hdGNoIiwicnVuMiIsIm5vdCIsImV4cG9ydENvbXBpbGF0aW9uIiwicmVzb2x2ZSIsInNldFRpbWVvdXQiLCJjb21waWxlciIsImVxdWFsIiwiZG9uZSIsIndhdGNoIiwicmVzdWx0IiwiY2F0Y2giXSwibWFwcGluZ3MiOiI7O0FBQUEsSUFBSUEsU0FBU0MsUUFBUSxNQUFSLEVBQWdCRCxNQUE3Qjs7QUFFQSxJQUFJRSxPQUFPRCxpQkFBWDtBQUNBLElBQUlFLGFBQWFELEtBQUtDLFVBQXRCO0FBQ0EsSUFBSUMsa0JBQWtCRixLQUFLRSxlQUEzQjtBQUNBLElBQUlDLG1CQUFtQkgsS0FBS0csZ0JBQTVCO0FBQ0EsSUFBSUMsd0JBQXdCSixLQUFLSSxxQkFBakM7QUFDQSxJQUFJQyxRQUFRTCxLQUFLSyxLQUFqQjtBQUNBLElBQUlDLFVBQVVOLEtBQUtNLE9BQW5CO0FBQ0EsSUFBSUMsYUFBYVAsS0FBS08sVUFBdEI7O0FBRUFDLFNBQVMsb0JBQVQsRUFBK0IsWUFBVzs7QUFFeENOLGtCQUFnQixZQUFoQjtBQUNBQSxrQkFBZ0IsYUFBaEI7QUFDQUEsa0JBQWdCLHFCQUFo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QUFPLFdBQVIsRUFBM0IsQ0FBUDtBQUNELEtBSEQsRUFJQ3hCLElBSkQsQ0FJTSxVQUFTeUIsTUFBVCxFQUFpQjtBQUNyQkY7QUFDRCxLQU5ELEVBT0NHLEtBUEQsQ0FPT0gsSUFQUDtBQVFELEdBVEQ7QUFXRCxDQWJEIiwiZmlsZSI6ImhhcmQtc291cmNlLXdlYnBhY2stcGx1Z2luL3Rlc3RzL2xvYWRlcnMtd2VicGFjay0xLmpzIiwic291cmNlc0NvbnRlbnQiOlsidmFyIGV4cGVjdCA9IHJlcXVpcmUoJ2NoYWknKS5leHBlY3Q7XG5cbnZhciB1dGlsID0gcmVxdWlyZSgnLi91dGlsJyk7XG52YXIgaXRDb21waWxlcyA9IHV0aWwuaXRDb21waWxlcztcbnZhciBpdENvbXBpbGVzVHdpY2UgPSB1dGlsLml0Q29tcGlsZXNUd2ljZTtcbnZhciBpdENvbXBpbGVzQ2hhbmdlID0gdXRpbC5pdENvbXBpbGVzQ2hhbmdlO1xudmFyIGl0Q29tcGlsZXNIYXJkTW9kdWxlcyA9IHV0aWwuaXRDb21waWxlc0hhcmRNb2R1bGVzO1xudmFyIGNsZWFuID0gdXRpbC5jbGVhbjtcbnZhciBjb21waWxlID0gdXRpbC5jb21waWxlO1xudmFyIHdyaXRlRmlsZXMgPSB1dGlsLndyaXRlRmlsZXM7XG5cbmRlc2NyaWJlKCdsb2FkZXIgd2VicGFjayB1c2UnLCBmdW5jdGlvbigpIHtcblxuICBpdENvbXBpbGVzVHdpY2UoJ2xvYWRlci1jc3MnKTtcbiAgaXRDb21waWxlc1R3aWNlKCdsb2FkZXItZmlsZScpO1xuICBpdENvbXBpbGVzVHdpY2UoJ2xvYWRlci1maWxlLWNvbnRleHQnKTtcbiAgaXRDb21waWxlc1R3aWNlKCdsb2FkZXItZmlsZS1vcHRpb25zJyk7XG4gIGl0Q29tcGlsZXNUd2ljZSgnbG9hZGVyLWZpbGUtdXNlJyk7XG4gIGl0Q29tcGlsZXNUd2ljZSgnbG9hZGVyLWN1c3RvbS1taXNzaW5nLWRlcCcpO1xuICBpdENvbXBpbGVzVHdpY2UoJ2xvYWRlci1jdXN0b20tbm8tZGVwJyk7XG5cbiAgaXRDb21waWxlc0hhcmRNb2R1bGVzKCdsb2FkZXItY3NzJywgWycuL2luZGV4LmNzcyddKTtcbiAgaXRDb21waWxlc0hhcmRNb2R1bGVzKCdsb2FkZXItZmlsZScsIFsnLi9pbWFnZS5wbmcnXSk7XG4gIC8vIGl0Q29tcGlsZXNIYXJkTW9kdWxlcygnbG9hZGVyLWZpbGUtY29udGV4dCcsIFsnLi9pbWFnZS5wbmcnXSk7XG4gIGl0Q29tcGlsZXNIYXJkTW9kdWxlcygnbG9hZGVyLWZpbGUtdXNlJywgWycuL3NyYy9pbmRleC5qcycsICcuL3NyYy9pbWFnZS5wbmcnXSk7XG4gIGl0Q29tcGlsZXNIYXJkTW9kdWxlcygnbG9hZGVyLWN1c3RvbS11c2VyLWxvYWRlcicsIFsnLi9sb2FkZXIuanMhLi9pbmRleC5qcyddKTtcbiAgaXRDb21waWxlc0hhcmRNb2R1bGVzKCdsb2FkZXItY3VzdG9tLW5vLWRlcCcsIFsnLi9pbmRleC5qcycsICcuL2xvYWRlci5qcyEuL2ZpYi5qcyddKTtcblxufSk7XG5cbmRlc2NyaWJlKCdsb2FkZXIgd2VicGFjayB3YXJuaW5ncyAmIGVycm9ycycsIGZ1bmN0aW9uKCkge1xuXG4gIHZhciBmaXh0dXJlUGF0aCA9ICdsb2FkZXItd2FybmluZyc7XG5cbiAgYmVmb3JlKGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBjbGVhbihmaXh0dXJlUGF0aCk7XG4gIH0pO1xuXG4gIGl0KCdzaG91bGQgY2FjaGUgZXJyb3JzICYgd2FybmluZ3MgZnJvbSBsb2FkZXInLCBmdW5jdGlvbigpIHtcbiAgICB0aGlzLnRpbWVvdXQoMTAwMDApO1xuICAgIHJldHVybiBjb21waWxlKGZpeHR1cmVQYXRoLCB7ZXhwb3J0U3RhdHM6IHRydWV9KVxuICAgICAgLnRoZW4oZnVuY3Rpb24ocnVuMSkge1xuICAgICAgICByZXR1cm4gUHJvbWlzZS5hbGwoW3J1bjEsIGNvbXBpbGUoZml4dHVyZVBhdGgsIHtleHBvcnRTdGF0czogdHJ1ZX0pXSlcbiAgICAgIH0pLnRoZW4oZnVuY3Rpb24ocnVucykge1xuICAgICAgICBleHBlY3QocnVuc1swXS5vdXQpLnRvLmVxbChydW5zWzFdLm91dCk7XG4gICAgICAgIGV4cGVjdChydW5zWzBdLndhcm5pbmdzLmxlbmd0aCkudG8uZ3JlYXRlclRoYW4oMCk7XG4gICAgICAgIGV4cGVjdChydW5zWzBdLmVycm9ycy5sZW5ndGgpLnRvLmdyZWF0ZXJUaGFuKDApO1xuICAgICAgICBleHBlY3QocnVuc1sxXS53YXJuaW5ncykudG8uZXFsKHJ1bnNbMF0ud2FybmluZ3MpO1xuICAgICAgICBleHBlY3QocnVuc1sxXS5lcnJvcnMpLnRvLmVxbChydW5zWzBdLmVycm9ycyk7XG4gICAgICB9KTtcbiAgfSk7XG5cbn0pO1xuXG5kZXNjcmliZSgnbG9hZGVyIHdlYnBhY2sgdXNlIC0gYnVpbGRzIGNoYW5nZXMnLCBmdW5jdGlvbigpIHtcblxuICBpdENvbXBpbGVzQ2hhbmdlKCdsb2FkZXItY3VzdG9tLWNvbnRleHQtZGVwJywge1xuICAgICdkaXIvYSc6IFtcbiAgICAgICcvLyBhJyxcbiAgICBdLmpvaW4oJ1xcbicpLFxuICAgICdkaXIvYic6IG51bGwsXG4gIH0sIHtcbiAgICAnZGlyL2EnOiBudWxsLFxuICAgICdkaXIvYic6IFtcbiAgICAgICcvLyBiJyxcbiAgICBdLmpvaW4oJ1xcbicpLFxuICB9LCBmdW5jdGlvbihvdXRwdXQpIHtcbiAgICBleHBlY3Qob3V0cHV0LnJ1bjFbJ21haW4uanMnXS50b1N0cmluZygpKS50by5tYXRjaCgvXFwvXFwvIGEvKTtcbiAgICBleHBlY3Qob3V0cHV0LnJ1bjJbJ21haW4uanMnXS50b1N0cmluZygpKS50by5tYXRjaCgvXFwvXFwvIGIvKTtcbiAgfSk7XG5cbiAgaXRDb21waWxlc0NoYW5nZSgnbG9hZGVyLWN1c3RvbS1kZWVwLWNvbnRleHQtZGVwJywge1xuICAgICdkaXIvZGlyZGlyJzogbnVsbCxcbiAgICAnZGlyL3N1YmRpci9hJzogJy8vIGEnLFxuICAgICdkaXIvc3ViZGlyL2InOiBudWxsLFxuICB9LCB7XG4gICAgJ2Rpci9kaXJkaXIvYSc6IG51bGwsXG4gICAgJ2Rpci9kaXJkaXIvYic6ICcvLyBiJyxcbiAgICAnZGlyL3N1YmRpcic6IG51bGwsXG4gIH0sIGZ1bmN0aW9uKG91dHB1dCkge1xuICAgIGV4cGVjdChvdXRwdXQucnVuMVsnbWFpbi5qcyddLnRvU3RyaW5nKCkpLnRvLm1hdGNoKC9cXC9cXC8gc3ViZGlyXFwvYS8pO1xuICAgIGV4cGVjdChvdXRwdXQucnVuMlsnbWFpbi5qcyddLnRvU3RyaW5nKCkpLnRvLm1hdGNoKC9cXC9cXC8gZGlyZGlyXFwvYi8pO1xuICB9KTtcblxuICBpdENvbXBpbGVzQ2hhbmdlKCdsb2FkZXItY3VzdG9tLXByZXBlbmQtaGVscGVyJywge1xuICAgICdsb2FkZXItaGVscGVyLmpzJzogW1xuICAgICAgJ2Z1bmN0aW9uIGhlbHBlcihhKSB7JyxcbiAgICAgICcgIGNvbnNvbGUubG9nKGEpOycsXG4gICAgICAnfScsXG4gICAgXS5qb2luKCdcXG4nKSxcbiAgfSwge1xuICAgICdsb2FkZXItaGVscGVyLmpzJzogW1xuICAgICAgJ2Z1bmN0aW9uIGhlbHBlcihiKSB7JyxcbiAgICAgICcgIGNvbnNvbGUubG9nKGIpOycsXG4gICAgICAnfScsXG4gICAgXS5qb2luKCdcXG4nKSxcbiAgfSwgZnVuY3Rpb24ob3V0cHV0KSB7XG4gICAgZXhwZWN0KG91dHB1dC5ydW4xWydtYWluLmpzJ10udG9TdHJpbmcoKSkudG8ubWF0Y2goL2NvbnNvbGVcXC5sb2dcXChhXFwpLyk7XG4gICAgZXhwZWN0KG91dHB1dC5ydW4yWydtYWluLmpzJ10udG9TdHJpbmcoKSkudG8ubWF0Y2goL2NvbnNvbGVcXC5sb2dcXChiXFwpLyk7XG4gIH0pO1xuXG4gIGl0Q29tcGlsZXNDaGFuZ2UoJ2xvYWRlci1jdXN0b20tbWlzc2luZy1kZXAtYWRkZWQnLCB7XG4gICAgJ2ZpYi5qcyc6IG51bGwsXG4gIH0sIHtcbiAgICAnZmliLmpzJzogW1xuICAgICAgJ21vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24obikgeycsXG4gICAgICAnICByZXR1cm4gbiArIChuID4gMCA/IG4gLSAxIDogMCk7JyxcbiAgICAgICd9OycsXG4gICAgXS5qb2luKCdcXG4nKSxcbiAgfSwgZnVuY3Rpb24ob3V0cHV0KSB7XG4gICAgZXhwZWN0KG91dHB1dC5ydW4xWydtYWluLmpzJ10udG9TdHJpbmcoKSkudG8ubm90Lm1hdGNoKC9uIC0gMS8pO1xuICAgIGV4cGVjdChvdXRwdXQucnVuMlsnbWFpbi5qcyddLnRvU3RyaW5nKCkpLnRvLm1hdGNoKC9uIC0gMS8pO1xuICB9KTtcblxuICBpdENvbXBpbGVzQ2hhbmdlKCdsb2FkZXItY3VzdG9tLW1pc3NpbmctZGVwLWFkZGVkJywge1xuICAgICdmaWIuanMnOiBbXG4gICAgICAnbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihuKSB7JyxcbiAgICAgICcgIHJldHVybiBuICsgKG4gPiAwID8gbiAtIDEgOiAwKTsnLFxuICAgICAgJ307JyxcbiAgICBdLmpvaW4oJ1xcbicpLFxuICB9LCB7XG4gICAgJ2ZpYi5qcyc6IG51bGwsXG4gIH0sIGZ1bmN0aW9uKG91dHB1dCkge1xuICAgIGV4cGVjdChvdXRwdXQucnVuMVsnbWFpbi5qcyddLnRvU3RyaW5nKCkpLnRvLm1hdGNoKC9uIC0gMS8pO1xuICAgIGV4cGVjdChvdXRwdXQucnVuMlsnbWFpbi5qcyddLnRvU3RyaW5nKCkpLnRvLm5vdC5tYXRjaCgvbiAtIDEvKTtcbiAgfSk7XG5cbiAgaXRDb21waWxlc0NoYW5nZSgnbG9hZGVyLWN1c3RvbS1uby1kZXAtbW92ZWQnLCB7XG4gICAgJ2ZpYi5qcyc6ICcnLFxuICAgICdmaWIvaW5kZXguanMnOiBudWxsLFxuICB9LCB7XG4gICAgJ2ZpYi5qcyc6IG51bGwsXG4gICAgJ2ZpYi9pbmRleC5qcyc6ICcnLFxuICB9LCBmdW5jdGlvbihvdXRwdXQpIHtcbiAgICBleHBlY3Qob3V0cHV0LnJ1bjFbJ21haW4uanMnXS50b1N0cmluZygpKS50by5tYXRjaCgvZmliXFwuanMvKTtcbiAgICBleHBlY3Qob3V0cHV0LnJ1bjFbJ21haW4uanMnXS50b1N0cmluZygpKS50by5ub3QubWF0Y2goL2ZpYlxcL2luZGV4XFwuanMvKTtcbiAgICBleHBlY3Qob3V0cHV0LnJ1bjJbJ21haW4uanMnXS50b1N0cmluZygpKS50by5tYXRjaCgvZmliXFwvaW5kZXhcXC5qcy8pO1xuICAgIGV4cGVjdChvdXRwdXQucnVuMlsnbWFpbi5qcyddLnRvU3RyaW5nKCkpLnRvLm5vdC5tYXRjaCgvZmliXFwuanMvKTtcbiAgfSk7XG5cbiAgaXRDb21waWxlc0NoYW5nZSgnbG9hZGVyLWN1c3RvbS1yZXNvbHZlLW1pc3NpbmcnLCB7XG4gICAgJ2ZpYi5qcyc6IG51bGwsXG4gICAgJ2xvYWRlci5qcyc6IG51bGwsXG4gIH0sIHtcbiAgICAnZmliLmpzJzogW1xuICAgICAgJ21vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24obikgeycsXG4gICAgICAnICByZXR1cm4gbiArIChuID4gMCA/IG4gLSAyIDogMCk7JyxcbiAgICAgICd9OycsXG4gICAgXS5qb2luKCdcXG4nKSxcbiAgICAnbG9hZGVyLmpzJzogbnVsbCxcbiAgfSwgZnVuY3Rpb24ob3V0cHV0KSB7XG4gICAgZXhwZWN0KG91dHB1dC5ydW4xWydtYWluLmpzJ10udG9TdHJpbmcoKSkudG8ubWF0Y2goL24gLSAxLyk7XG4gICAgZXhwZWN0KG91dHB1dC5ydW4yWydtYWluLmpzJ10udG9TdHJpbmcoKSkudG8ubWF0Y2goL24gLSAyLyk7XG4gIH0pO1xuXG4gIGl0Q29tcGlsZXNDaGFuZ2UoJ2xvYWRlci1jdXN0b20tcmVzb2x2ZS1taXNzaW5nJywge1xuICAgICdsb2FkZXIuanMnOiBudWxsLFxuICB9LCB7XG4gICAgJ2xvYWRlci5qcyc6IFtcbiAgICAgICdtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKHNvdXJjZSkgeycsXG4gICAgICAnICB0aGlzLmNhY2hlYWJsZSAmJiB0aGlzLmNhY2hlYWJsZSgpOycsXG4gICAgICAnICByZXR1cm4gWycsXG4gICAgICAnICAgIFxcJy8vIGxvYWRlci5qc1xcJywnLFxuICAgICAgJyAgICBzb3VyY2UsJyxcbiAgICAgICcgIF0uam9pbihcXCdcXFxcblxcJyk7JyxcbiAgICAgICd9OycsXG4gICAgXS5qb2luKCdcXG4nKSxcbiAgfSwgZnVuY3Rpb24ob3V0cHV0KSB7XG4gICAgZXhwZWN0KG91dHB1dC5ydW4xWydtYWluLmpzJ10udG9TdHJpbmcoKSkudG8ubWF0Y2goL2xvYWRlclxcL2luZGV4XFwuanMvKTtcbiAgICBleHBlY3Qob3V0cHV0LnJ1bjJbJ21haW4uanMnXS50b1N0cmluZygpKS50by5tYXRjaCgvbG9hZGVyXFwuanMvKTtcbiAgfSk7XG5cbiAgaXRDb21waWxlc0NoYW5nZSgnbG9hZGVyLWN1c3RvbS1yZXNvbHZlLW1pc3NpbmctcXVlcnknLCB7XG4gICAgJ2ZpYi5qcyc6IG51bGwsXG4gICAgJ2xvYWRlci5qcyc6IG51bGwsXG4gIH0sIHtcbiAgICAnZmliLmpzJzogW1xuICAgICAgJ21vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24obikgeycsXG4gICAgICAnICByZXR1cm4gbiArIChuID4gMCA/IG4gLSAyIDogMCk7JyxcbiAgICAgICd9OycsXG4gICAgXS5qb2luKCdcXG4nKSxcbiAgICAnbG9hZGVyLmpzJzogbnVsbCxcbiAgfSwgZnVuY3Rpb24ob3V0cHV0KSB7XG4gICAgZXhwZWN0KG91dHB1dC5ydW4xWydtYWluLmpzJ10udG9TdHJpbmcoKSkudG8ubWF0Y2goL24gLSAxLyk7XG4gICAgZXhwZWN0KG91dHB1dC5ydW4yWydtYWluLmpzJ10udG9TdHJpbmcoKSkudG8ubWF0Y2goL24gLSAyLyk7XG4gIH0pO1xuXG4gIGl0Q29tcGlsZXMoJ2xvYWRlci1maWxlLW1vdmUnLCAnbG9hZGVyLWZpbGUtbW92ZScsXG4gICAgZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gd3JpdGVGaWxlcygnbG9hZGVyLWZpbGUtbW92ZScsIHtcbiAgICAgICAgJ2luZGV4LmpzJzogJ3JlcXVpcmUoXFwnLi9pbWFnZS5wbmdcXCcpO1xcbicsXG4gICAgICB9KVxuICAgICAgLnRoZW4oZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgZXhwb3J0Q29tcGlsYXRpb246IHRydWUsXG4gICAgICAgIH07XG4gICAgICB9KTtcbiAgICB9LFxuICAgIGZ1bmN0aW9uKHJ1bjEpIHtcbiAgICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlKSB7c2V0VGltZW91dChyZXNvbHZlLCAxMDAwKTt9KVxuICAgICAgLnRoZW4oZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB3cml0ZUZpbGVzKCdsb2FkZXItZmlsZS1tb3ZlJywge1xuICAgICAgICAgICdpbmRleC5qcyc6ICcvLyByZXF1aXJlKFxcJy4vaW1hZ2UucG5nXFwnKTtcXG4nLFxuICAgICAgICB9KVxuICAgICAgfSlcbiAgICAgIC50aGVuKGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgIGNvbXBpbGVyOiBydW4xLmNvbXBpbGVyLFxuICAgICAgICAgIGV4cG9ydENvbXBpbGF0aW9uOiB0cnVlLFxuICAgICAgICB9O1xuICAgICAgfSk7XG4gICAgfSxcbiAgICBmdW5jdGlvbihydW4yKSB7XG4gICAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSkge3NldFRpbWVvdXQocmVzb2x2ZSwgMTAwMCk7fSlcbiAgICAgIC50aGVuKGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gd3JpdGVGaWxlcygnbG9hZGVyLWZpbGUtbW92ZScsIHtcbiAgICAgICAgICAnaW5kZXguanMnOiAncmVxdWlyZShcXCcuL2ltYWdlLnBuZ1xcJyk7XFxuJyxcbiAgICAgICAgfSlcbiAgICAgIH0pXG4gICAgICAudGhlbihmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICBjb21waWxlcjogcnVuMi5jb21waWxlcixcbiAgICAgICAgICBleHBvcnRDb21waWxhdGlvbjogdHJ1ZSxcbiAgICAgICAgfTtcbiAgICAgIH0pO1xuICAgIH0sXG4gICAgZnVuY3Rpb24ob3V0cHV0KSB7XG4gICAgICBleHBlY3Qob3V0cHV0LnJ1bnNbMF0uY29tcGlsZXIpLnRvLmVxdWFsKG91dHB1dC5ydW5zWzFdLmNvbXBpbGVyKTtcbiAgICAgIGV4cGVjdChvdXRwdXQucnVuc1swXS5jb21waWxlcikudG8uZXF1YWwob3V0cHV0LnJ1bnNbMl0uY29tcGlsZXIpO1xuICAgICAgZXhwZWN0KG91dHB1dC5ydW5zWzBdLm91dCkudG8ubm90LmVxbChvdXRwdXQucnVuc1sxXS5vdXQpO1xuICAgICAgZXhwZWN0KG91dHB1dC5ydW5zWzBdLm91dCkudG8uZXFsKG91dHB1dC5ydW5zWzJdLm91dCk7XG4gICAgfVxuICApO1xuXG59KTtcblxuZGVzY3JpYmUoJ2xvYWRlciB3ZWJwYWNrIHVzZSAtIHdhdGNoIG1vZGUnLCBmdW5jdGlvbigpIHtcblxuICBpdCgnbG9hZGVyLWZpbGUtdXNlOiBjb21waWxlcyBpbiB3YXRjaCBtb2RlJywgZnVuY3Rpb24oZG9uZSkge1xuICAgIGNvbXBpbGUoJ2xvYWRlci1maWxlLXVzZScsIHt3YXRjaDogJ3N0YXJ0U3RvcCd9KVxuICAgIC50aGVuKGZ1bmN0aW9uKHJlc3VsdCkge1xuICAgICAgcmV0dXJuIGNvbXBpbGUoJ2xvYWRlci1maWxlLXVzZScsIHt3YXRjaDogJ3N0YXJ0U3RvcCd9KTtcbiAgICB9KVxuICAgIC50aGVuKGZ1bmN0aW9uKHJlc3VsdCkge1xuICAgICAgZG9uZSgpO1xuICAgIH0pXG4gICAgLmNhdGNoKGRvbmUpO1xuICB9KTtcblxufSk7XG4iXSwic291cmNlUm9vdCI6Ii9Vc2Vycy90eWxlcmFyYnVzL2Rldi9wcm92aWRlci9zcmMifQ==

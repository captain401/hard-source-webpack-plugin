'use strict';

var expect = require('chai').expect;

var itCompilesTwice = require('./util').itCompilesTwice;
var itCompilesChange = require('./util').itCompilesChange;
var itCompilesHardModules = require('./util').itCompilesHardModules;

describe('basic webpack use - compiles identically', function () {

  itCompilesTwice('base-10deps-1nest');
  itCompilesTwice('base-10deps-1nest', { exportStats: true });
  itCompilesTwice('base-1dep');
  itCompilesTwice('base-1dep', { exportStats: true });
  itCompilesTwice('base-1dep-full-width');
  itCompilesTwice('base-1dep-full-width', { exportStats: true });
  itCompilesTwice('base-1dep-hash-filename');
  itCompilesTwice('base-1dep-hash-filename', { exportStats: true });
  itCompilesTwice('base-1dep-optional');
  itCompilesTwice('base-1dep-optional', { exportStats: true });
  itCompilesTwice('base-amd-1dep');
  itCompilesTwice('base-amd-1dep', { exportStats: true });
  itCompilesTwice('base-amd-1dep-local');
  itCompilesTwice('base-amd-1dep-local', { exportStats: true });
  itCompilesTwice('base-amd-code-split');
  itCompilesTwice('base-amd-code-split', { exportStats: true });
  itCompilesTwice('base-amd-context');
  itCompilesTwice('base-amd-context', { exportStats: true });
  itCompilesTwice('base-code-split');
  itCompilesTwice('base-code-split', { exportStats: true });
  itCompilesTwice('base-code-split-devtool-source-map');
  itCompilesTwice('base-code-split-devtool-source-map', { exportStats: true });
  itCompilesTwice('base-code-split-ensure');
  itCompilesTwice('base-code-split-ensure', { exportStats: true });
  itCompilesTwice('base-code-split-nest');
  itCompilesTwice('base-code-split-nest', { exportStats: true });
  itCompilesTwice('base-code-split-nest-devtool-source-map');
  itCompilesTwice('base-code-split-nest-devtool-source-map', { exportStats: true });
  itCompilesTwice('base-code-split-process');
  itCompilesTwice('base-code-split-process', { exportStats: true });
  itCompilesTwice('base-context');
  itCompilesTwice('base-context', { exportStats: true });
  itCompilesTwice('base-context-devtool-source-map');
  itCompilesTwice('base-context-devtool-source-map', { exportStats: true });
  itCompilesTwice('base-context-optional');
  itCompilesTwice('base-context-optional', { exportStats: true });
  itCompilesTwice('base-deep-context');
  itCompilesTwice('base-deep-context', { exportStats: true });
  itCompilesTwice('base-deep-context-devtool-source-map');
  itCompilesTwice('base-deep-context-devtool-source-map', { exportStats: true });
  itCompilesTwice('base-devtool-cheap-eval-source-map');
  itCompilesTwice('base-devtool-cheap-eval-source-map', { exportStats: true });
  itCompilesTwice('base-devtool-cheap-source-map');
  itCompilesTwice('base-devtool-cheap-source-map', { exportStats: true });
  itCompilesTwice('base-devtool-eval');
  itCompilesTwice('base-devtool-eval', { exportStats: true });
  itCompilesTwice('base-devtool-eval-source-map');
  itCompilesTwice('base-devtool-eval-source-map', { exportStats: true });
  itCompilesTwice('base-devtool-eval-source-map-hash-filename');
  itCompilesTwice('base-devtool-eval-source-map-hash-filename', { exportStats: true });
  itCompilesTwice('base-devtool-inline-cheap-source-map');
  itCompilesTwice('base-devtool-inline-cheap-source-map', { exportStats: true });
  itCompilesTwice('base-devtool-inline-cheap-source-map-hash-filename');
  itCompilesTwice('base-devtool-inline-cheap-source-map-hash-filename', { exportStats: true });
  itCompilesTwice('base-devtool-source-map');
  itCompilesTwice('base-devtool-source-map', { exportStats: true });
  itCompilesTwice('base-devtool-source-map-hash-filename');
  itCompilesTwice('base-devtool-source-map-hash-filename', { exportStats: true });
  itCompilesTwice('base-error-resolve');
  itCompilesTwice('base-error-resolve', { exportStats: true });
  itCompilesTwice('base-external');
  itCompilesTwice('base-external', { exportStats: true });
  itCompilesTwice('base-path-info');
  itCompilesTwice('base-path-info', { exportStats: true });
  itCompilesTwice('base-process-env');
  itCompilesTwice('base-process-env', { exportStats: true });
  itCompilesTwice('base-records-json');
  itCompilesTwice('base-records-json', { exportStats: true });
  itCompilesTwice('base-target-node-1dep');
  itCompilesTwice('base-target-node-1dep', { exportStats: true });
});

describe('basic webpack use - compiles hard modules', function () {

  itCompilesHardModules('base-1dep', ['./fib.js', './index.js']);
  // itCompilesHardModules('base-context', [/\.\/a( sync)? nonrecursive \\d/, './a/index.js']);
  // itCompilesHardModules('base-deep-context', [/\.\/a( sync)? \\d/]);
  itCompilesHardModules('base-code-split', ['./fib.js', './index.js']);
  itCompilesHardModules('base-query-request', ['./fib.js?argument']);
  itCompilesHardModules('base-external', ['./index.js']);
  itCompilesHardModules('base-options-default', ['./fib.js', './index.js']);
});

describe('basic webpack use - builds changes', function () {

  itCompilesChange('base-change-1dep', {
    'fib.js': ['module.exports = function(n) {', '  return n + (n > 0 ? n - 1 : 0);', '};'].join('\n'),
    'fib/index.js': null
  }, {
    'fib.js': null,
    'fib/index.js': ['module.exports = function(n) {', '  return n + (n > 0 ? n - 2 : 0);', '};'].join('\n')
  }, function (output) {
    expect(output.run1['main.js'].toString()).to.match(/n - 1/);
    expect(output.run2['main.js'].toString()).to.match(/n - 2/);
  });

  itCompilesChange('base-move-1dep', {
    'fib.js': ['module.exports = function(n) {', '  return n + (n > 0 ? n - 1 : 0);', '};'].join('\n'),
    'fib/index.js': null
  }, {
    'fib.js': null,
    'fib/index.js': ['module.exports = function(n) {', '  return n + (n > 0 ? n - 2 : 0);', '};'].join('\n')
  }, function (output) {
    expect(output.run1['main.js'].toString()).to.match(/n - 1/);
    expect(output.run1['main.js'].toString()).to.not.match(/n - 2/);
    expect(output.run2['main.js'].toString()).to.match(/n - 2/);
    expect(output.run2['main.js'].toString()).to.not.match(/n - 1/);
  });

  itCompilesChange('base-change-context', {
    'a/1.js': 'module.exports = 1;\n',
    'a/11.js': null
  }, {
    'a/1.js': null,
    'a/11.js': 'module.exports = 11;\n'
  }, function (output) {
    expect(output.run1['main.js'].toString()).to.match(/ = 1;/);
    expect(output.run1['main.js'].toString()).to.not.match(/ = 11;/);
    expect(output.run2['main.js'].toString()).to.match(/ = 11;/);
    expect(output.run2['main.js'].toString()).to.not.match(/ = 1;/);
  });

  itCompilesChange('base-move-context', {
    'a/1/index.js': null,
    'a/1.js': 'module.exports = 1;\n'
  }, {
    'a/1/index.js': 'module.exports = 1;\n',
    'a/1.js': null
  }, function (output) {
    expect(output.run1['main.js'].toString()).to.match(/1\.js/);
    expect(output.run2['main.js'].toString()).to.match(/1\/index\.js/);
  });

  itCompilesChange('base-move-10deps-1nest', {
    'b/6.js': ['module.exports = 6;'].join('\n'),
    'b/6/index.js': null,
    // Change a second file make sure multiple invalidations don't
    // break everything.
    'b/7.js': ['module.exports = 7;'].join('\n'),
    'b/7/index.js': null
  }, {
    'b/6.js': null,
    'b/6/index.js': ['module.exports = 60;'].join('\n'),
    'b/7.js': null,
    'b/7/index.js': ['module.exports = 70;'].join('\n')
  }, function (output) {
    expect(output.run1['main.js'].toString()).to.match(/ = 6;/);
    expect(output.run1['main.js'].toString()).to.not.match(/ = 60;/);
    expect(output.run2['main.js'].toString()).to.match(/ = 60;/);
    expect(output.run2['main.js'].toString()).to.not.match(/ = 6;/);
  });

  itCompilesChange('base-deep-context', {
    'a/b/11.js': null,
    'a/b/11-2.js': null
  }, {
    'a/b/11.js': 'module.exports = 11;'
  }, function (output) {
    expect(output.run1['main.js'].toString()).to.not.match(/11\.js/);
    expect(output.run1['main.js'].toString()).to.not.match(/exports = 11/);
    expect(output.run2['main.js'].toString()).to.match(/11\.js/);
    expect(output.run2['main.js'].toString()).to.match(/exports = 11/);
  });

  itCompilesChange('base-deep-context', {
    'a/b/11.js': 'module.exports = 11;',
    'a/b/11-2.js': null
  }, {
    'a/b/11.js': null
  }, function (output) {
    expect(output.run1['main.js'].toString()).to.match(/11\.js/);
    expect(output.run1['main.js'].toString()).to.match(/exports = 11/);
    expect(output.run2['main.js'].toString()).to.not.match(/11\.js/);
    expect(output.run2['main.js'].toString()).to.not.match(/exports = 11/);
  });

  itCompilesChange('base-deep-context', {
    'a/b/11.js': 'module.exports = 11;',
    'a/b/11-2.js': null
  }, {
    'a/b/11.js': null,
    'a/b/11-2.js': 'module.exports = 11;'
  }, function (output) {
    expect(output.run1['main.js'].toString()).to.match(/11\.js/);
    expect(output.run1['main.js'].toString()).to.not.match(/11-2\.js/);
    expect(output.run1['main.js'].toString()).to.match(/exports = 11/);
    expect(output.run2['main.js'].toString()).to.not.match(/11\.js/);
    expect(output.run2['main.js'].toString()).to.match(/11-2\.js/);
    expect(output.run2['main.js'].toString()).to.match(/exports = 11/);
  });

  itCompilesChange('base-deep-context', {
    'a/b/c/12.js': null
  }, {
    'a/b/c/12.js': 'module.exports = 12;'
  }, function (output) {
    expect(output.run1['main.js'].toString()).to.not.match(/c\/12\.js/);
    expect(output.run1['main.js'].toString()).to.not.match(/exports = 12/);
    expect(output.run2['main.js'].toString()).to.match(/c\/12\.js/);
    expect(output.run2['main.js'].toString()).to.match(/exports = 12/);
  });

  itCompilesChange('base-deep-context', {
    'a/b/c/12.js': 'module.exports = 12;'
  }, {
    'a/b/c': null
  }, function (output) {
    expect(output.run1['main.js'].toString()).to.match(/c\/12\.js/);
    expect(output.run1['main.js'].toString()).to.match(/exports = 12/);
    expect(output.run2['main.js'].toString()).to.not.match(/c\/12\.js/);
    expect(output.run2['main.js'].toString()).to.not.match(/exports = 12/);
  });

  itCompilesChange('base-context-move', {
    'vendor/a/1.js': 'module.exports = 1;',
    'vendor/a/2.js': 'module.exports = 2;',
    'vendor/a/3.js': 'module.exports = 3;',
    'vendor/a/4.js': 'module.exports = 4;',
    'vendor/a/5.js': 'module.exports = 5;',
    'web_modules/a': null
  }, {
    'web_modules/a/1.js': 'module.exports = 11;',
    'web_modules/a/2.js': 'module.exports = 12;',
    'web_modules/a/3.js': 'module.exports = 13;',
    'web_modules/a/4.js': 'module.exports = 14;',
    'web_modules/a/5.js': 'module.exports = 15;',
    'vendor/a': null
  }, function (output) {
    expect(output.run1['main.js'].toString()).to.match(/exports = 1;/);
    expect(output.run1['main.js'].toString()).to.not.match(/exports = 11;/);
    expect(output.run2['main.js'].toString()).to.match(/exports = 11;/);
    expect(output.run2['main.js'].toString()).to.not.match(/exports = 1;/);
  });

  itCompilesChange('base-resolve-missing', {
    'fib.js': null
  }, {
    'fib.js': ['module.exports = function(n) {', '  return n + (n > 0 ? n - 2 : 0);', '};'].join('\n')
  }, function (output) {
    expect(output.run1['main.js'].toString()).to.match(/n - 1/);
    expect(output.run2['main.js'].toString()).to.match(/n - 2/);
  });
});
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImhhcmQtc291cmNlLXdlYnBhY2stcGx1Z2luL3Rlc3RzL2Jhc2Utd2VicGFjay0xLmpzIl0sIm5hbWVzIjpbImV4cGVjdCIsInJlcXVpcmUiLCJpdENvbXBpbGVzVHdpY2UiLCJpdENvbXBpbGVzQ2hhbmdlIiwiaXRDb21waWxlc0hhcmRNb2R1bGVzIiwiZGVzY3JpYmUiLCJleHBvcnRTdGF0cyIsImpvaW4iLCJvdXRwdXQiLCJydW4xIiwidG9TdHJpbmciLCJ0byIsIm1hdGNoIiwicnVuMiIsIm5vdCJdLCJtYXBwaW5ncyI6Ijs7QUFBQSxJQUFJQSxTQUFTQyxRQUFRLE1BQVIsRUFBZ0JELE1BQTdCOztBQUVBLElBQUlFLGtCQUFrQkQsa0JBQWtCQyxlQUF4QztBQUNBLElBQUlDLG1CQUFtQkYsa0JBQWtCRSxnQkFBekM7QUFDQSxJQUFJQyx3QkFBd0JILGtCQUFrQkcscUJBQTlDOztBQUVBQyxTQUFTLDBDQUFULEVBQXFELFlBQVc7O0FBRTlESCxrQkFBZ0IsbUJBQWhCO0FBQ0FBLGtCQUFnQixtQkFBaEIsRUFBcUMsRUFBQ0ksYUFBYSxJQUFkLEVBQXJDO0FBQ0FKLGtCQUFnQixXQUFoQjtBQUNBQSxrQkFBZ0IsV0FBaEIsRUFBNkIsRUFBQ0ksYUFBYSxJQUFkLEVBQTdCO0FBQ0FKLGtCQUFnQixzQkFBaEI7QUFDQUEsa0JBQWdCLHNCQUFoQixFQUF3QyxFQUFDSSxhQUFhLElBQWQsRUFBeEM7QUFDQUosa0JBQWdCLHlCQUFoQjtBQUNBQSxrQkFBZ0IseUJBQWhCLEVBQTJDLEVBQUNJLGFBQWEsSUFBZCxFQUEzQztBQUNBSixrQkFBZ0Isb0JBQWhCO0FBQ0FBLGtCQUFnQixvQkFBaEIsRUFBc0MsRUFBQ0ksYUFBYSxJQUFkLEVBQXRDO0FBQ0FKLGtCQUFnQixlQUFoQjtBQUNBQSxrQkFBZ0IsZUFBaEIsRUFBaUMsRUFBQ0ksYUFBYSxJQUFkLEVBQWpDO0FBQ0FKLGtCQUFnQixxQkFBaEI7QUFDQUEsa0JBQWdCLHFCQUFoQixFQUF1QyxFQUFDSSxhQUFh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T0ssSUFBUCxDQUFZLFNBQVosRUFBdUJILFFBQXZCLEVBQVAsRUFBMENDLEVBQTFDLENBQTZDQyxLQUE3QyxDQUFtRCxlQUFuRDtBQUNBWixXQUFPUSxPQUFPSyxJQUFQLENBQVksU0FBWixFQUF1QkgsUUFBdkIsRUFBUCxFQUEwQ0MsRUFBMUMsQ0FBNkNHLEdBQTdDLENBQWlERixLQUFqRCxDQUF1RCxjQUF2RDtBQUNELEdBbkJEOztBQXFCQVQsbUJBQWlCLHNCQUFqQixFQUF5QztBQUN2QyxjQUFVO0FBRDZCLEdBQXpDLEVBRUc7QUFDRCxjQUFVLENBQ1IsZ0NBRFEsRUFFUixtQ0FGUSxFQUdSLElBSFEsRUFJUkksSUFKUSxDQUlILElBSkc7QUFEVCxHQUZILEVBUUcsVUFBU0MsTUFBVCxFQUFpQjtBQUNsQlIsV0FBT1EsT0FBT0MsSUFBUCxDQUFZLFNBQVosRUFBdUJDLFFBQXZCLEVBQVAsRUFBMENDLEVBQTFDLENBQTZDQyxLQUE3QyxDQUFtRCxPQUFuRDtBQUNBWixXQUFPUSxPQUFPSyxJQUFQLENBQVksU0FBWixFQUF1QkgsUUFBdkIsRUFBUCxFQUEwQ0MsRUFBMUMsQ0FBNkNDLEtBQTdDLENBQW1ELE9BQW5EO0FBQ0QsR0FYRDtBQWFELENBNUxEIiwiZmlsZSI6ImhhcmQtc291cmNlLXdlYnBhY2stcGx1Z2luL3Rlc3RzL2Jhc2Utd2VicGFjay0xLmpzIiwic291cmNlc0NvbnRlbnQiOlsidmFyIGV4cGVjdCA9IHJlcXVpcmUoJ2NoYWknKS5leHBlY3Q7XG5cbnZhciBpdENvbXBpbGVzVHdpY2UgPSByZXF1aXJlKCcuL3V0aWwnKS5pdENvbXBpbGVzVHdpY2U7XG52YXIgaXRDb21waWxlc0NoYW5nZSA9IHJlcXVpcmUoJy4vdXRpbCcpLml0Q29tcGlsZXNDaGFuZ2U7XG52YXIgaXRDb21waWxlc0hhcmRNb2R1bGVzID0gcmVxdWlyZSgnLi91dGlsJykuaXRDb21waWxlc0hhcmRNb2R1bGVzO1xuXG5kZXNjcmliZSgnYmFzaWMgd2VicGFjayB1c2UgLSBjb21waWxlcyBpZGVudGljYWxseScsIGZ1bmN0aW9uKCkge1xuXG4gIGl0Q29tcGlsZXNUd2ljZSgnYmFzZS0xMGRlcHMtMW5lc3QnKTtcbiAgaXRDb21waWxlc1R3aWNlKCdiYXNlLTEwZGVwcy0xbmVzdCcsIHtleHBvcnRTdGF0czogdHJ1ZX0pO1xuICBpdENvbXBpbGVzVHdpY2UoJ2Jhc2UtMWRlcCcpO1xuICBpdENvbXBpbGVzVHdpY2UoJ2Jhc2UtMWRlcCcsIHtleHBvcnRTdGF0czogdHJ1ZX0pO1xuICBpdENvbXBpbGVzVHdpY2UoJ2Jhc2UtMWRlcC1mdWxsLXdpZHRoJyk7XG4gIGl0Q29tcGlsZXNUd2ljZSgnYmFzZS0xZGVwLWZ1bGwtd2lkdGgnLCB7ZXhwb3J0U3RhdHM6IHRydWV9KTtcbiAgaXRDb21waWxlc1R3aWNlKCdiYXNlLTFkZXAtaGFzaC1maWxlbmFtZScpO1xuICBpdENvbXBpbGVzVHdpY2UoJ2Jhc2UtMWRlcC1oYXNoLWZpbGVuYW1lJywge2V4cG9ydFN0YXRzOiB0cnVlfSk7XG4gIGl0Q29tcGlsZXNUd2ljZSgnYmFzZS0xZGVwLW9wdGlvbmFsJyk7XG4gIGl0Q29tcGlsZXNUd2ljZSgnYmFzZS0xZGVwLW9wdGlvbmFsJywge2V4cG9ydFN0YXRzOiB0cnVlfSk7XG4gIGl0Q29tcGlsZXNUd2ljZSgnYmFzZS1hbWQtMWRlcCcpO1xuICBpdENvbXBpbGVzVHdpY2UoJ2Jhc2UtYW1kLTFkZXAnLCB7ZXhwb3J0U3RhdHM6IHRydWV9KTtcbiAgaXRDb21waWxlc1R3aWNlKCdiYXNlLWFtZC0xZGVwLWxvY2FsJyk7XG4gIGl0Q29tcGlsZXNUd2ljZSgnYmFzZS1hbWQtMWRlcC1sb2NhbCcsIHtleHBvcnRTdGF0czogdHJ1ZX0pO1xuICBpdENvbXBpbGVzVHdpY2UoJ2Jhc2UtYW1kLWNvZGUtc3BsaXQnKTtcbiAgaXRDb21waWxlc1R3aWNlKCdiYXNlLWFtZC1jb2RlLXNwbGl0Jywge2V4cG9ydFN0YXRzOiB0cnVlfSk7XG4gIGl0Q29tcGlsZXNUd2ljZSgnYmFzZS1hbWQtY29udGV4dCcpO1xuICBpdENvbXBpbGVzVHdpY2UoJ2Jhc2UtYW1kLWNvbnRleHQnLCB7ZXhwb3J0U3RhdHM6IHRydWV9KTtcbiAgaXRDb21waWxlc1R3aWNlKCdiYXNlLWNvZGUtc3BsaXQnKTtcbiAgaXRDb21waWxlc1R3aWNlKCdiYXNlLWNvZGUtc3BsaXQnLCB7ZXhwb3J0U3RhdHM6IHRydWV9KTtcbiAgaXRDb21waWxlc1R3aWNlKCdiYXNlLWNvZGUtc3BsaXQtZGV2dG9vbC1zb3VyY2UtbWFwJyk7XG4gIGl0Q29tcGlsZXNUd2ljZSgnYmFzZS1jb2RlLXNwbGl0LWRldnRvb2wtc291cmNlLW1hcCcsIHtleHBvcnRTdGF0czogdHJ1ZX0pO1xuICBpdENvbXBpbGVzVHdpY2UoJ2Jhc2UtY29kZS1zcGxpdC1lbnN1cmUnKTtcbiAgaXRDb21waWxlc1R3aWNlKCdiYXNlLWNvZGUtc3BsaXQtZW5zdXJlJywge2V4cG9ydFN0YXRzOiB0cnVlfSk7XG4gIGl0Q29tcGlsZXNUd2ljZSgnYmFzZS1jb2RlLXNwbGl0LW5lc3QnKTtcbiAgaXRDb21waWxlc1R3aWNlKCdiYXNlLWNvZGUtc3BsaXQtbmVzdCcsIHtleHBvcnRTdGF0czogdHJ1ZX0pO1xuICBpdENvbXBpbGVzVHdpY2UoJ2Jhc2UtY29kZS1zcGxpdC1uZXN0LWRldnRvb2wtc291cmNlLW1hcCcpO1xuICBpdENvbXBpbGVzVHdpY2UoJ2Jhc2UtY29kZS1zcGxpdC1uZXN0LWRldnRvb2wtc291cmNlLW1hcCcsIHtleHBvcnRTdGF0czogdHJ1ZX0pO1xuICBpdENvbXBpbGVzVHdpY2UoJ2Jhc2UtY29kZS1zcGxpdC1wcm9jZXNzJyk7XG4gIGl0Q29tcGlsZXNUd2ljZSgnYmFzZS1jb2RlLXNwbGl0LXByb2Nlc3MnLCB7ZXhwb3J0U3RhdHM6IHRydWV9KTtcbiAgaXRDb21waWxlc1R3aWNlKCdiYXNlLWNvbnRleHQnKTtcbiAgaXRDb21waWxlc1R3aWNlKCdiYXNlLWNvbnRleHQnLCB7ZXhwb3J0U3RhdHM6IHRydWV9KTtcbiAgaXRDb21waWxlc1R3aWNlKCdiYXNlLWNvbnRleHQtZGV2dG9vbC1zb3VyY2UtbWFwJyk7XG4gIGl0Q29tcGlsZXNUd2ljZSgnYmFzZS1jb250ZXh0LWRldnRvb2wtc291cmNlLW1hcCcsIHtleHBvcnRTdGF0czogdHJ1ZX0pO1xuICBpdENvbXBpbGVzVHdpY2UoJ2Jhc2UtY29udGV4dC1vcHRpb25hbCcpO1xuICBpdENvbXBpbGVzVHdpY2UoJ2Jhc2UtY29udGV4dC1vcHRpb25hbCcsIHtleHBvcnRTdGF0czogdHJ1ZX0pO1xuICBpdENvbXBpbGVzVHdpY2UoJ2Jhc2UtZGVlcC1jb250ZXh0Jyk7XG4gIGl0Q29tcGlsZXNUd2ljZSgnYmFzZS1kZWVwLWNvbnRleHQnLCB7ZXhwb3J0U3RhdHM6IHRydWV9KTtcbiAgaXRDb21waWxlc1R3aWNlKCdiYXNlLWRlZXAtY29udGV4dC1kZXZ0b29sLXNvdXJjZS1tYXAnKTtcbiAgaXRDb21waWxlc1R3aWNlKCdiYXNlLWRlZXAtY29udGV4dC1kZXZ0b29sLXNvdXJjZS1tYXAnLCB7ZXhwb3J0U3RhdHM6IHRydWV9KTtcbiAgaXRDb21waWxlc1R3aWNlKCdiYXNlLWRldnRvb2wtY2hlYXAtZXZhbC1zb3VyY2UtbWFwJyk7XG4gIGl0Q29tcGlsZXNUd2ljZSgnYmFzZS1kZXZ0b29sLWNoZWFwLWV2YWwtc291cmNlLW1hcCcsIHtleHBvcnRTdGF0czogdHJ1ZX0pO1xuICBpdENvbXBpbGVzVHdpY2UoJ2Jhc2UtZGV2dG9vbC1jaGVhcC1zb3VyY2UtbWFwJyk7XG4gIGl0Q29tcGlsZXNUd2ljZSgnYmFzZS1kZXZ0b29sLWNoZWFwLXNvdXJjZS1tYXAnLCB7ZXhwb3J0U3RhdHM6IHRydWV9KTtcbiAgaXRDb21waWxlc1R3aWNlKCdiYXNlLWRldnRvb2wtZXZhbCcpO1xuICBpdENvbXBpbGVzVHdpY2UoJ2Jhc2UtZGV2dG9vbC1ldmFsJywge2V4cG9ydFN0YXRzOiB0cnVlfSk7XG4gIGl0Q29tcGlsZXNUd2ljZSgnYmFzZS1kZXZ0b29sLWV2YWwtc291cmNlLW1hcCcpO1xuICBpdENvbXBpbGVzVHdpY2UoJ2Jhc2UtZGV2dG9vbC1ldmFsLXNvdXJjZS1tYXAnLCB7ZXhwb3J0U3RhdHM6IHRydWV9KTtcbiAgaXRDb21waWxlc1R3aWNlKCdiYXNlLWRldnRvb2wtZXZhbC1zb3VyY2UtbWFwLWhhc2gtZmlsZW5hbWUnKTtcbiAgaXRDb21waWxlc1R3aWNlKCdiYXNlLWRldnRvb2wtZXZhbC1zb3VyY2UtbWFwLWhhc2gtZmlsZW5hbWUnLCB7ZXhwb3J0U3RhdHM6IHRydWV9KTtcbiAgaXRDb21waWxlc1R3aWNlKCdiYXNlLWRldnRvb2wtaW5saW5lLWNoZWFwLXNvdXJjZS1tYXAnKTtcbiAgaXRDb21waWxlc1R3aWNlKCdiYXNlLWRldnRvb2wtaW5saW5lLWNoZWFwLXNvdXJjZS1tYXAnLCB7ZXhwb3J0U3RhdHM6IHRydWV9KTtcbiAgaXRDb21waWxlc1R3aWNlKCdiYXNlLWRldnRvb2wtaW5saW5lLWNoZWFwLXNvdXJjZS1tYXAtaGFzaC1maWxlbmFtZScpO1xuICBpdENvbXBpbGVzVHdpY2UoJ2Jhc2UtZGV2dG9vbC1pbmxpbmUtY2hlYXAtc291cmNlLW1hcC1oYXNoLWZpbGVuYW1lJywge2V4cG9ydFN0YXRzOiB0cnVlfSk7XG4gIGl0Q29tcGlsZXNUd2ljZSgnYmFzZS1kZXZ0b29sLXNvdXJjZS1tYXAnKTtcbiAgaXRDb21waWxlc1R3aWNlKCdiYXNlLWRldnRvb2wtc291cmNlLW1hcCcsIHtleHBvcnRTdGF0czogdHJ1ZX0pO1xuICBpdENvbXBpbGVzVHdpY2UoJ2Jhc2UtZGV2dG9vbC1zb3VyY2UtbWFwLWhhc2gtZmlsZW5hbWUnKTtcbiAgaXRDb21waWxlc1R3aWNlKCdiYXNlLWRldnRvb2wtc291cmNlLW1hcC1oYXNoLWZpbGVuYW1lJywge2V4cG9ydFN0YXRzOiB0cnVlfSk7XG4gIGl0Q29tcGlsZXNUd2ljZSgnYmFzZS1lcnJvci1yZXNvbHZlJyk7XG4gIGl0Q29tcGlsZXNUd2ljZSgnYmFzZS1lcnJvci1yZXNvbHZlJywge2V4cG9ydFN0YXRzOiB0cnVlfSk7XG4gIGl0Q29tcGlsZXNUd2ljZSgnYmFzZS1leHRlcm5hbCcpO1xuICBpdENvbXBpbGVzVHdpY2UoJ2Jhc2UtZXh0ZXJuYWwnLCB7ZXhwb3J0U3RhdHM6IHRydWV9KTtcbiAgaXRDb21waWxlc1R3aWNlKCdiYXNlLXBhdGgtaW5mbycpO1xuICBpdENvbXBpbGVzVHdpY2UoJ2Jhc2UtcGF0aC1pbmZvJywge2V4cG9ydFN0YXRzOiB0cnVlfSk7XG4gIGl0Q29tcGlsZXNUd2ljZSgnYmFzZS1wcm9jZXNzLWVudicpO1xuICBpdENvbXBpbGVzVHdpY2UoJ2Jhc2UtcHJvY2Vzcy1lbnYnLCB7ZXhwb3J0U3RhdHM6IHRydWV9KTtcbiAgaXRDb21waWxlc1R3aWNlKCdiYXNlLXJlY29yZHMtanNvbicpO1xuICBpdENvbXBpbGVzVHdpY2UoJ2Jhc2UtcmVjb3Jkcy1qc29uJywge2V4cG9ydFN0YXRzOiB0cnVlfSk7XG4gIGl0Q29tcGlsZXNUd2ljZSgnYmFzZS10YXJnZXQtbm9kZS0xZGVwJyk7XG4gIGl0Q29tcGlsZXNUd2ljZSgnYmFzZS10YXJnZXQtbm9kZS0xZGVwJywge2V4cG9ydFN0YXRzOiB0cnVlfSk7XG5cbn0pO1xuXG5kZXNjcmliZSgnYmFzaWMgd2VicGFjayB1c2UgLSBjb21waWxlcyBoYXJkIG1vZHVsZXMnLCBmdW5jdGlvbigpIHtcblxuICBpdENvbXBpbGVzSGFyZE1vZHVsZXMoJ2Jhc2UtMWRlcCcsIFsnLi9maWIuanMnLCAnLi9pbmRleC5qcyddKTtcbiAgLy8gaXRDb21waWxlc0hhcmRNb2R1bGVzKCdiYXNlLWNvbnRleHQnLCBbL1xcLlxcL2EoIHN5bmMpPyBub25yZWN1cnNpdmUgXFxcXGQvLCAnLi9hL2luZGV4LmpzJ10pO1xuICAvLyBpdENvbXBpbGVzSGFyZE1vZHVsZXMoJ2Jhc2UtZGVlcC1jb250ZXh0JywgWy9cXC5cXC9hKCBzeW5jKT8gXFxcXGQvXSk7XG4gIGl0Q29tcGlsZXNIYXJkTW9kdWxlcygnYmFzZS1jb2RlLXNwbGl0JywgWycuL2ZpYi5qcycsICcuL2luZGV4LmpzJ10pO1xuICBpdENvbXBpbGVzSGFyZE1vZHVsZXMoJ2Jhc2UtcXVlcnktcmVxdWVzdCcsIFsnLi9maWIuanM/YXJndW1lbnQnXSk7XG4gIGl0Q29tcGlsZXNIYXJkTW9kdWxlcygnYmFzZS1leHRlcm5hbCcsIFsnLi9pbmRleC5qcyddKTtcbiAgaXRDb21waWxlc0hhcmRNb2R1bGVzKCdiYXNlLW9wdGlvbnMtZGVmYXVsdCcsIFsnLi9maWIuanMnLCAnLi9pbmRleC5qcyddKTtcblxufSk7XG5cbmRlc2NyaWJlKCdiYXNpYyB3ZWJwYWNrIHVzZSAtIGJ1aWxkcyBjaGFuZ2VzJywgZnVuY3Rpb24oKSB7XG5cbiAgaXRDb21waWxlc0NoYW5nZSgnYmFzZS1jaGFuZ2UtMWRlcCcsIHtcbiAgICAnZmliLmpzJzogW1xuICAgICAgJ21vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24obikgeycsXG4gICAgICAnICByZXR1cm4gbiArIChuID4gMCA/IG4gLSAxIDogMCk7JyxcbiAgICAgICd9OycsXG4gICAgXS5qb2luKCdcXG4nKSxcbiAgICAnZmliL2luZGV4LmpzJzogbnVsbCxcbiAgfSwge1xuICAgICdmaWIuanMnOiBudWxsLFxuICAgICdmaWIvaW5kZXguanMnOiBbXG4gICAgICAnbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihuKSB7JyxcbiAgICAgICcgIHJldHVybiBuICsgKG4gPiAwID8gbiAtIDIgOiAwKTsnLFxuICAgICAgJ307JyxcbiAgICBdLmpvaW4oJ1xcbicpLFxuICB9LCBmdW5jdGlvbihvdXRwdXQpIHtcbiAgICBleHBlY3Qob3V0cHV0LnJ1bjFbJ21haW4uanMnXS50b1N0cmluZygpKS50by5tYXRjaCgvbiAtIDEvKTtcbiAgICBleHBlY3Qob3V0cHV0LnJ1bjJbJ21haW4uanMnXS50b1N0cmluZygpKS50by5tYXRjaCgvbiAtIDIvKTtcbiAgfSk7XG5cbiAgaXRDb21waWxlc0NoYW5nZSgnYmFzZS1tb3ZlLTFkZXAnLCB7XG4gICAgJ2ZpYi5qcyc6IFtcbiAgICAgICdtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKG4pIHsnLFxuICAgICAgJyAgcmV0dXJuIG4gKyAobiA+IDAgPyBuIC0gMSA6IDApOycsXG4gICAgICAnfTsnLFxuICAgIF0uam9pbignXFxuJyksXG4gICAgJ2ZpYi9pbmRleC5qcyc6IG51bGwsXG4gIH0sIHtcbiAgICAnZmliLmpzJzogbnVsbCxcbiAgICAnZmliL2luZGV4LmpzJzogW1xuICAgICAgJ21vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24obikgeycsXG4gICAgICAnICByZXR1cm4gbiArIChuID4gMCA/IG4gLSAyIDogMCk7JyxcbiAgICAgICd9OycsXG4gICAgXS5qb2luKCdcXG4nKSxcbiAgfSwgZnVuY3Rpb24ob3V0cHV0KSB7XG4gICAgZXhwZWN0KG91dHB1dC5ydW4xWydtYWluLmpzJ10udG9TdHJpbmcoKSkudG8ubWF0Y2goL24gLSAxLyk7XG4gICAgZXhwZWN0KG91dHB1dC5ydW4xWydtYWluLmpzJ10udG9TdHJpbmcoKSkudG8ubm90Lm1hdGNoKC9uIC0gMi8pO1xuICAgIGV4cGVjdChvdXRwdXQucnVuMlsnbWFpbi5qcyddLnRvU3RyaW5nKCkpLnRvLm1hdGNoKC9uIC0gMi8pO1xuICAgIGV4cGVjdChvdXRwdXQucnVuMlsnbWFpbi5qcyddLnRvU3RyaW5nKCkpLnRvLm5vdC5tYXRjaCgvbiAtIDEvKTtcbiAgfSk7XG5cbiAgaXRDb21waWxlc0NoYW5nZSgnYmFzZS1jaGFuZ2UtY29udGV4dCcsIHtcbiAgICAnYS8xLmpzJzogJ21vZHVsZS5leHBvcnRzID0gMTtcXG4nLFxuICAgICdhLzExLmpzJzogbnVsbCxcbiAgfSwge1xuICAgICdhLzEuanMnOiBudWxsLFxuICAgICdhLzExLmpzJzogJ21vZHVsZS5leHBvcnRzID0gMTE7XFxuJyxcbiAgfSwgZnVuY3Rpb24ob3V0cHV0KSB7XG4gICAgZXhwZWN0KG91dHB1dC5ydW4xWydtYWluLmpzJ10udG9TdHJpbmcoKSkudG8ubWF0Y2goLyA9IDE7Lyk7XG4gICAgZXhwZWN0KG91dHB1dC5ydW4xWydtYWluLmpzJ10udG9TdHJpbmcoKSkudG8ubm90Lm1hdGNoKC8gPSAxMTsvKTtcbiAgICBleHBlY3Qob3V0cHV0LnJ1bjJbJ21haW4uanMnXS50b1N0cmluZygpKS50by5tYXRjaCgvID0gMTE7Lyk7XG4gICAgZXhwZWN0KG91dHB1dC5ydW4yWydtYWluLmpzJ10udG9TdHJpbmcoKSkudG8ubm90Lm1hdGNoKC8gPSAxOy8pO1xuICB9KTtcblxuICBpdENvbXBpbGVzQ2hhbmdlKCdiYXNlLW1vdmUtY29udGV4dCcsIHtcbiAgICAnYS8xL2luZGV4LmpzJzogbnVsbCxcbiAgICAnYS8xLmpzJzogJ21vZHVsZS5leHBvcnRzID0gMTtcXG4nLFxuICB9LCB7XG4gICAgJ2EvMS9pbmRleC5qcyc6ICdtb2R1bGUuZXhwb3J0cyA9IDE7XFxuJyxcbiAgICAnYS8xLmpzJzogbnVsbCxcbiAgfSwgZnVuY3Rpb24ob3V0cHV0KSB7XG4gICAgZXhwZWN0KG91dHB1dC5ydW4xWydtYWluLmpzJ10udG9TdHJpbmcoKSkudG8ubWF0Y2goLzFcXC5qcy8pO1xuICAgIGV4cGVjdChvdXRwdXQucnVuMlsnbWFpbi5qcyddLnRvU3RyaW5nKCkpLnRvLm1hdGNoKC8xXFwvaW5kZXhcXC5qcy8pO1xuICB9KTtcblxuICBpdENvbXBpbGVzQ2hhbmdlKCdiYXNlLW1vdmUtMTBkZXBzLTFuZXN0Jywge1xuICAgICdiLzYuanMnOiBbXG4gICAgICAnbW9kdWxlLmV4cG9ydHMgPSA2OycsXG4gICAgXS5qb2luKCdcXG4nKSxcbiAgICAnYi82L2luZGV4LmpzJzogbnVsbCxcbiAgICAvLyBDaGFuZ2UgYSBzZWNvbmQgZmlsZSBtYWtlIHN1cmUgbXVsdGlwbGUgaW52YWxpZGF0aW9ucyBkb24ndFxuICAgIC8vIGJyZWFrIGV2ZXJ5dGhpbmcuXG4gICAgJ2IvNy5qcyc6IFtcbiAgICAgICdtb2R1bGUuZXhwb3J0cyA9IDc7JyxcbiAgICBdLmpvaW4oJ1xcbicpLFxuICAgICdiLzcvaW5kZXguanMnOiBudWxsLFxuICB9LCB7XG4gICAgJ2IvNi5qcyc6IG51bGwsXG4gICAgJ2IvNi9pbmRleC5qcyc6IFtcbiAgICAgICdtb2R1bGUuZXhwb3J0cyA9IDYwOycsXG4gICAgXS5qb2luKCdcXG4nKSxcbiAgICAnYi83LmpzJzogbnVsbCxcbiAgICAnYi83L2luZGV4LmpzJzogW1xuICAgICAgJ21vZHVsZS5leHBvcnRzID0gNzA7JyxcbiAgICBdLmpvaW4oJ1xcbicpLFxuICB9LCBmdW5jdGlvbihvdXRwdXQpIHtcbiAgICBleHBlY3Qob3V0cHV0LnJ1bjFbJ21haW4uanMnXS50b1N0cmluZygpKS50by5tYXRjaCgvID0gNjsvKTtcbiAgICBleHBlY3Qob3V0cHV0LnJ1bjFbJ21haW4uanMnXS50b1N0cmluZygpKS50by5ub3QubWF0Y2goLyA9IDYwOy8pO1xuICAgIGV4cGVjdChvdXRwdXQucnVuMlsnbWFpbi5qcyddLnRvU3RyaW5nKCkpLnRvLm1hdGNoKC8gPSA2MDsvKTtcbiAgICBleHBlY3Qob3V0cHV0LnJ1bjJbJ21haW4uanMnXS50b1N0cmluZygpKS50by5ub3QubWF0Y2goLyA9IDY7Lyk7XG4gIH0pO1xuXG4gIGl0Q29tcGlsZXNDaGFuZ2UoJ2Jhc2UtZGVlcC1jb250ZXh0Jywge1xuICAgICdhL2IvMTEuanMnOiBudWxsLFxuICAgICdhL2IvMTEtMi5qcyc6IG51bGwsXG4gIH0sIHtcbiAgICAnYS9iLzExLmpzJzogJ21vZHVsZS5leHBvcnRzID0gMTE7JyxcbiAgfSwgZnVuY3Rpb24ob3V0cHV0KSB7XG4gICAgZXhwZWN0KG91dHB1dC5ydW4xWydtYWluLmpzJ10udG9TdHJpbmcoKSkudG8ubm90Lm1hdGNoKC8xMVxcLmpzLyk7XG4gICAgZXhwZWN0KG91dHB1dC5ydW4xWydtYWluLmpzJ10udG9TdHJpbmcoKSkudG8ubm90Lm1hdGNoKC9leHBvcnRzID0gMTEvKTtcbiAgICBleHBlY3Qob3V0cHV0LnJ1bjJbJ21haW4uanMnXS50b1N0cmluZygpKS50by5tYXRjaCgvMTFcXC5qcy8pO1xuICAgIGV4cGVjdChvdXRwdXQucnVuMlsnbWFpbi5qcyddLnRvU3RyaW5nKCkpLnRvLm1hdGNoKC9leHBvcnRzID0gMTEvKTtcbiAgfSk7XG5cbiAgaXRDb21waWxlc0NoYW5nZSgnYmFzZS1kZWVwLWNvbnRleHQnLCB7XG4gICAgJ2EvYi8xMS5qcyc6ICdtb2R1bGUuZXhwb3J0cyA9IDExOycsXG4gICAgJ2EvYi8xMS0yLmpzJzogbnVsbCxcbiAgfSwge1xuICAgICdhL2IvMTEuanMnOiBudWxsLFxuICB9LCBmdW5jdGlvbihvdXRwdXQpIHtcbiAgICBleHBlY3Qob3V0cHV0LnJ1bjFbJ21haW4uanMnXS50b1N0cmluZygpKS50by5tYXRjaCgvMTFcXC5qcy8pO1xuICAgIGV4cGVjdChvdXRwdXQucnVuMVsnbWFpbi5qcyddLnRvU3RyaW5nKCkpLnRvLm1hdGNoKC9leHBvcnRzID0gMTEvKTtcbiAgICBleHBlY3Qob3V0cHV0LnJ1bjJbJ21haW4uanMnXS50b1N0cmluZygpKS50by5ub3QubWF0Y2goLzExXFwuanMvKTtcbiAgICBleHBlY3Qob3V0cHV0LnJ1bjJbJ21haW4uanMnXS50b1N0cmluZygpKS50by5ub3QubWF0Y2goL2V4cG9ydHMgPSAxMS8pO1xuICB9KTtcblxuICBpdENvbXBpbGVzQ2hhbmdlKCdiYXNlLWRlZXAtY29udGV4dCcsIHtcbiAgICAnYS9iLzExLmpzJzogJ21vZHVsZS5leHBvcnRzID0gMTE7JyxcbiAgICAnYS9iLzExLTIuanMnOiBudWxsLFxuICB9LCB7XG4gICAgJ2EvYi8xMS5qcyc6IG51bGwsXG4gICAgJ2EvYi8xMS0yLmpzJzogJ21vZHVsZS5leHBvcnRzID0gMTE7JyxcbiAgfSwgZnVuY3Rpb24ob3V0cHV0KSB7XG4gICAgZXhwZWN0KG91dHB1dC5ydW4xWydtYWluLmpzJ10udG9TdHJpbmcoKSkudG8ubWF0Y2goLzExXFwuanMvKTtcbiAgICBleHBlY3Qob3V0cHV0LnJ1bjFbJ21haW4uanMnXS50b1N0cmluZygpKS50by5ub3QubWF0Y2goLzExLTJcXC5qcy8pO1xuICAgIGV4cGVjdChvdXRwdXQucnVuMVsnbWFpbi5qcyddLnRvU3RyaW5nKCkpLnRvLm1hdGNoKC9leHBvcnRzID0gMTEvKTtcbiAgICBleHBlY3Qob3V0cHV0LnJ1bjJbJ21haW4uanMnXS50b1N0cmluZygpKS50by5ub3QubWF0Y2goLzExXFwuanMvKTtcbiAgICBleHBlY3Qob3V0cHV0LnJ1bjJbJ21haW4uanMnXS50b1N0cmluZygpKS50by5tYXRjaCgvMTEtMlxcLmpzLyk7XG4gICAgZXhwZWN0KG91dHB1dC5ydW4yWydtYWluLmpzJ10udG9TdHJpbmcoKSkudG8ubWF0Y2goL2V4cG9ydHMgPSAxMS8pO1xuICB9KTtcblxuICBpdENvbXBpbGVzQ2hhbmdlKCdiYXNlLWRlZXAtY29udGV4dCcsIHtcbiAgICAnYS9iL2MvMTIuanMnOiBudWxsLFxuICB9LCB7XG4gICAgJ2EvYi9jLzEyLmpzJzogJ21vZHVsZS5leHBvcnRzID0gMTI7JyxcbiAgfSwgZnVuY3Rpb24ob3V0cHV0KSB7XG4gICAgZXhwZWN0KG91dHB1dC5ydW4xWydtYWluLmpzJ10udG9TdHJpbmcoKSkudG8ubm90Lm1hdGNoKC9jXFwvMTJcXC5qcy8pO1xuICAgIGV4cGVjdChvdXRwdXQucnVuMVsnbWFpbi5qcyddLnRvU3RyaW5nKCkpLnRvLm5vdC5tYXRjaCgvZXhwb3J0cyA9IDEyLyk7XG4gICAgZXhwZWN0KG91dHB1dC5ydW4yWydtYWluLmpzJ10udG9TdHJpbmcoKSkudG8ubWF0Y2goL2NcXC8xMlxcLmpzLyk7XG4gICAgZXhwZWN0KG91dHB1dC5ydW4yWydtYWluLmpzJ10udG9TdHJpbmcoKSkudG8ubWF0Y2goL2V4cG9ydHMgPSAxMi8pO1xuICB9KTtcblxuICBpdENvbXBpbGVzQ2hhbmdlKCdiYXNlLWRlZXAtY29udGV4dCcsIHtcbiAgICAnYS9iL2MvMTIuanMnOiAnbW9kdWxlLmV4cG9ydHMgPSAxMjsnLFxuICB9LCB7XG4gICAgJ2EvYi9jJzogbnVsbCxcbiAgfSwgZnVuY3Rpb24ob3V0cHV0KSB7XG4gICAgZXhwZWN0KG91dHB1dC5ydW4xWydtYWluLmpzJ10udG9TdHJpbmcoKSkudG8ubWF0Y2goL2NcXC8xMlxcLmpzLyk7XG4gICAgZXhwZWN0KG91dHB1dC5ydW4xWydtYWluLmpzJ10udG9TdHJpbmcoKSkudG8ubWF0Y2goL2V4cG9ydHMgPSAxMi8pO1xuICAgIGV4cGVjdChvdXRwdXQucnVuMlsnbWFpbi5qcyddLnRvU3RyaW5nKCkpLnRvLm5vdC5tYXRjaCgvY1xcLzEyXFwuanMvKTtcbiAgICBleHBlY3Qob3V0cHV0LnJ1bjJbJ21haW4uanMnXS50b1N0cmluZygpKS50by5ub3QubWF0Y2goL2V4cG9ydHMgPSAxMi8pO1xuICB9KTtcblxuICBpdENvbXBpbGVzQ2hhbmdlKCdiYXNlLWNvbnRleHQtbW92ZScsIHtcbiAgICAndmVuZG9yL2EvMS5qcyc6ICdtb2R1bGUuZXhwb3J0cyA9IDE7JyxcbiAgICAndmVuZG9yL2EvMi5qcyc6ICdtb2R1bGUuZXhwb3J0cyA9IDI7JyxcbiAgICAndmVuZG9yL2EvMy5qcyc6ICdtb2R1bGUuZXhwb3J0cyA9IDM7JyxcbiAgICAndmVuZG9yL2EvNC5qcyc6ICdtb2R1bGUuZXhwb3J0cyA9IDQ7JyxcbiAgICAndmVuZG9yL2EvNS5qcyc6ICdtb2R1bGUuZXhwb3J0cyA9IDU7JyxcbiAgICAnd2ViX21vZHVsZXMvYSc6IG51bGwsXG4gIH0sIHtcbiAgICAnd2ViX21vZHVsZXMvYS8xLmpzJzogJ21vZHVsZS5leHBvcnRzID0gMTE7JyxcbiAgICAnd2ViX21vZHVsZXMvYS8yLmpzJzogJ21vZHVsZS5leHBvcnRzID0gMTI7JyxcbiAgICAnd2ViX21vZHVsZXMvYS8zLmpzJzogJ21vZHVsZS5leHBvcnRzID0gMTM7JyxcbiAgICAnd2ViX21vZHVsZXMvYS80LmpzJzogJ21vZHVsZS5leHBvcnRzID0gMTQ7JyxcbiAgICAnd2ViX21vZHVsZXMvYS81LmpzJzogJ21vZHVsZS5leHBvcnRzID0gMTU7JyxcbiAgICAndmVuZG9yL2EnOiBudWxsLFxuICB9LCBmdW5jdGlvbihvdXRwdXQpIHtcbiAgICBleHBlY3Qob3V0cHV0LnJ1bjFbJ21haW4uanMnXS50b1N0cmluZygpKS50by5tYXRjaCgvZXhwb3J0cyA9IDE7Lyk7XG4gICAgZXhwZWN0KG91dHB1dC5ydW4xWydtYWluLmpzJ10udG9TdHJpbmcoKSkudG8ubm90Lm1hdGNoKC9leHBvcnRzID0gMTE7Lyk7XG4gICAgZXhwZWN0KG91dHB1dC5ydW4yWydtYWluLmpzJ10udG9TdHJpbmcoKSkudG8ubWF0Y2goL2V4cG9ydHMgPSAxMTsvKTtcbiAgICBleHBlY3Qob3V0cHV0LnJ1bjJbJ21haW4uanMnXS50b1N0cmluZygpKS50by5ub3QubWF0Y2goL2V4cG9ydHMgPSAxOy8pO1xuICB9KTtcblxuICBpdENvbXBpbGVzQ2hhbmdlKCdiYXNlLXJlc29sdmUtbWlzc2luZycsIHtcbiAgICAnZmliLmpzJzogbnVsbCxcbiAgfSwge1xuICAgICdmaWIuanMnOiBbXG4gICAgICAnbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihuKSB7JyxcbiAgICAgICcgIHJldHVybiBuICsgKG4gPiAwID8gbiAtIDIgOiAwKTsnLFxuICAgICAgJ307JyxcbiAgICBdLmpvaW4oJ1xcbicpLFxuICB9LCBmdW5jdGlvbihvdXRwdXQpIHtcbiAgICBleHBlY3Qob3V0cHV0LnJ1bjFbJ21haW4uanMnXS50b1N0cmluZygpKS50by5tYXRjaCgvbiAtIDEvKTtcbiAgICBleHBlY3Qob3V0cHV0LnJ1bjJbJ21haW4uanMnXS50b1N0cmluZygpKS50by5tYXRjaCgvbiAtIDIvKTtcbiAgfSk7XG5cbn0pO1xuIl0sInNvdXJjZVJvb3QiOiIvVXNlcnMvdHlsZXJhcmJ1cy9kZXYvcHJvdmlkZXIvc3JjIn0=

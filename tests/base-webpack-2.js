'use strict';

var expect = require('chai').expect;

var itCompiles = require('./util').itCompiles;
var itCompilesTwice = require('./util').itCompilesTwice;
var itCompilesChange = require('./util').itCompilesChange;
var itCompilesHardModules = require('./util').itCompilesHardModules;
var describeWP2 = require('./util').describeWP2;

describeWP2('basic webpack 2 use - compiles identically', function () {

  itCompilesTwice('base-es2015-module');
  itCompilesTwice('base-es2015-module', { exportStats: true });
  itCompilesTwice('base-es2015-module-compatibility');
  itCompilesTwice('base-es2015-module-compatibility', { exportStats: true });
  itCompilesTwice('base-es2015-module-export-before-import');
  itCompilesTwice('base-es2015-module-export-before-import', { exportStats: true });
  itCompilesTwice('base-es2015-module-use-before-import');
  itCompilesTwice('base-es2015-module-use-before-import', { exportStats: true });
  itCompilesTwice('base-es2015-rename-module');
  itCompilesTwice('base-es2015-rename-module', { exportStats: true });
  itCompilesTwice('base-es2015-system-context');
  itCompilesTwice('base-es2015-system-context', { exportStats: true });
  itCompilesTwice('base-es2015-system-module');
  itCompilesTwice('base-es2015-system-module', { exportStats: true });
  itCompilesTwice('base-warning-context');
  itCompilesTwice('base-warning-context', { exportStats: true });
  itCompilesTwice('base-warning-es2015');
  itCompilesTwice('base-warning-es2015', { exportStats: true });

  itCompilesHardModules('base-es2015-module', ['./index.js', './obj.js', './fib.js']);
  itCompilesHardModules('base-es2015-module-compatibility', ['./index.js', './obj.js', './fib.js']);
  itCompilesHardModules('base-es2015-module-export-before-import', ['./index.js', './obj.js', './fib.js']);
  itCompilesHardModules('base-es2015-module-use-before-import', ['./index.js', './obj.js', './fib.js']);

  itCompiles('it includes compatibility dependency in base-es2015-module-compatibility', 'base-es2015-module-compatibility', function (output) {
    expect(output.run2['main.js'].toString()).to.contain('__esModule');
  });
});

describeWP2('basic webpack 2 use - builds changes', function () {

  itCompilesChange('base-change-es2015-module', {
    'index.js': ['import {key} from \'./obj\';', 'export default key;'].join('\n')
  }, {
    'index.js': ['import {fib} from \'./obj\';', 'export default fib(3);'].join('\n')
  }, function (output) {
    expect(eval(output.run1['main.js'].toString())).to.eql({ default: 'obj' });
    expect(eval(output.run2['main.js'].toString())).to.eql({ default: 5 });
    // expect(output.run1['main.js'].toString()).to.contain('"a" /* key */');
    // expect(output.run1['main.js'].toString()).to.not.contain('__webpack_exports__["a"]');
    // expect(output.run2['main.js'].toString()).to.contain('"a" /* fib */');
    // expect(output.run2['main.js'].toString()).to.contain('__webpack_require__.d(__webpack_exports__, "a"');
    // expect(output.run2['main.js'].toString()).to.contain('__webpack_exports__["a"]');
  });

  itCompilesChange('base-change-es2015-commonjs-module', {
    'index.js': ['import {key} from \'./obj\';', 'export default key;'].join('\n')
  }, {
    'index.js': ['var fib = require(\'./obj\').fib;', 'module.exports = fib(3);'].join('\n')
  }, function (output) {
    const result1 = eval(output.run1['main.js'].toString()).default;
    expect(result1).to.eql('obj');
    const result2 = eval(output.run2['main.js'].toString());
    expect(result2).to.eql(5);
    // expect(output.run1['main.js'].toString()).to.contain('"a" /* key */');
    // expect(output.run1['main.js'].toString()).to.not.contain('__webpack_exports__["a"]');
    // expect(output.run2['main.js'].toString()).to.match(/__webpack_require__\(\d\)\.fib/);
    // expect(output.run2['main.js'].toString()).to.contain('__webpack_require__.d(__webpack_exports__, "fib"');
    // expect(output.run2['main.js'].toString()).to.contain('__webpack_exports__["a"]');
  });

  itCompilesChange('base-change-es2015-export-module', {
    'index.js': ['import {key} from \'./obj\';', 'export default key;'].join('\n')
  }, {
    'index.js': ['import {fib} from \'./obj\';', 'export default fib(3);'].join('\n')
  }, function (output) {
    const result1 = eval(output.run1['main.js'].toString()).default;
    expect(result1).to.eql('obj');
    const result2 = eval(output.run2['main.js'].toString()).default;
    expect(result2).to.eql(5);
    // expect(output.run1['main.js'].toString()).to.contain('"a" /* key */');
    // expect(output.run1['main.js'].toString()).to.not.contain('__webpack_exports__["a"]');
    // expect(output.run2['main.js'].toString()).to.contain('"a" /* fib */');
    // expect(output.run2['main.js'].toString()).to.contain('__webpack_exports__["a"]');
  });

  itCompilesChange('base-change-es2015-export-order-module', {
    'other.js': ['import {fib, key} from \'./obj\';', 'export default [fib, key];'].join('\n')
  }, {
    'other.js': ['import {fib, key} from \'./obj\';', 'export default [key, fib];'].join('\n')
  }, function (output) {
    const result1 = eval(output.run1['main.js'].toString()).default;
    expect(result1[0][0](3)).to.eql(5);
    expect(result1[0][1]).to.eql('obj');
    expect(result1[1][0](3)).to.eql(5);
    expect(result1[1][1]).to.eql(undefined);
    const result2 = eval(output.run2['main.js'].toString()).default;
    expect(result2[0][0](3)).to.eql(5);
    expect(result2[0][1]).to.eql('obj');
    expect(result2[1][0]).to.eql(undefined);
    expect(result2[1][1](3)).to.eql(5);
    // var run1FibId = /__webpack_exports__\["(\w)"\] = fib/.exec(output.run1['main.js'].toString())[1];
    // var run1KeyId = run1FibId === 'a' ? 'b' : 'a';
    // expect(output.run1['main.js'].toString()).to.contain('console.log(__WEBPACK_IMPORTED_MODULE_0__obj__["' + run1FibId + '" /* fib */], __WEBPACK_IMPORTED_MODULE_0__obj__["' + run1KeyId + '" /* key */]);');
    // var run2FibId = /__webpack_exports__\["(\w)"\] = fib/.exec(output.run2['main.js'].toString())[1];
    // var run2KeyId = run2FibId === 'a' ? 'b' : 'a';
    // expect(output.run2['main.js'].toString()).to.contain('console.log(__WEBPACK_IMPORTED_MODULE_0__obj__["' + run2FibId + '" /* fib */], __WEBPACK_IMPORTED_MODULE_0__obj__["' + run2KeyId + '" /* key */]);');
  });

  itCompilesChange('base-change-es2015-export-order-module', {
    'other.js': ['import {fib, key} from \'./obj\';', 'export default [fib, key];'].join('\n'),
    'obj.js': ['import \'./other\';', 'export function fib(n) {', '  return n + (n > 0 ? n - 1 : 0);', '}', 'export var key = \'obj\';'].join('\n')
  }, {
    'other.js': ['import {fib, key} from \'./obj\';', 'export default [key, fib];'].join('\n'),
    'obj.js': ['import \'./other\';', 'export var key = \'obj\';', 'export function fib(n) {', '  return n + (n > 0 ? n - 1 : 0);', '}'].join('\n')
  }, function (output) {
    const result1 = eval(output.run1['main.js'].toString()).default;
    expect(result1[0][0](3)).to.eql(5);
    expect(result1[0][1]).to.eql('obj');
    expect(result1[1][0](3)).to.eql(5);
    expect(result1[1][1]).to.eql(undefined);
    const result2 = eval(output.run2['main.js'].toString()).default;
    expect(result2[0][0](3)).to.eql(5);
    expect(result2[0][1]).to.eql('obj');
    expect(result2[1][0]).to.eql(undefined);
    expect(result2[1][1](3)).to.eql(5);
    // var run1FibId = /__webpack_exports__\["(\w)"\] = fib/.exec(output.run1['main.js'].toString())[1];
    // var run1KeyId = run1FibId === 'a' ? 'b' : 'a';
    // expect(output.run1['main.js'].toString()).to.contain('console.log(__WEBPACK_IMPORTED_MODULE_0__obj__["' + run1FibId + '" /* fib */], __WEBPACK_IMPORTED_MODULE_0__obj__["' + run1KeyId + '" /* key */]);');
    // var run2FibId = /__webpack_exports__\["(\w)"\] = fib/.exec(output.run2['main.js'].toString())[1];
    // var run2KeyId = run2FibId === 'a' ? 'b' : 'a';
    // expect(output.run2['main.js'].toString()).to.contain('console.log(__WEBPACK_IMPORTED_MODULE_0__obj__["' + run2FibId + '" /* fib */], __WEBPACK_IMPORTED_MODULE_0__obj__["' + run2KeyId + '" /* key */]);');
  });

  itCompilesChange('base-change-es2015-all-module', {
    'index.js': ['import {key} from \'./obj\';', 'export default key;'].join('\n')
  }, {
    'index.js': ['import * as obj from \'./obj\';', 'export default obj.fib(3);'].join('\n')
  }, function (output) {
    expect(eval(output.run1['main.js'].toString())).to.eql({ default: 'obj' });
    expect(eval(output.run2['main.js'].toString())).to.eql({ default: 5 });
    // expect(output.run1['main.js'].toString()).to.contain('"a" /* key */');
    // expect(output.run1['main.js'].toString()).to.not.contain('__webpack_exports__["a"]');
    // expect(output.run2['main.js'].toString()).to.contain('"a" /* fib */');
    // expect(output.run2['main.js'].toString()).to.contain('__webpack_exports__["a"]');
  });

  itCompilesChange('base-change-es2015-default-module', {
    'index.js': ['import {key} from \'./obj\';', 'export default key;'].join('\n')
  }, {
    'index.js': ['import obj, {fib} from \'./obj\';', 'export default [obj.fib(3), fib(2)];'].join('\n')
  }, function (output) {
    expect(eval(output.run1['main.js'].toString())).to.eql({ default: 'obj' });
    expect(eval(output.run2['main.js'].toString())).to.eql({ default: [5, 3] });
    // expect(output.run1['main.js'].toString()).to.contain('"a" /* key */');
    // expect(output.run1['main.js'].toString()).to.contain('__webpack_exports__["a"]');
    // expect(output.run2['main.js'].toString()).to.contain('"b" /* fib */');
    // expect(output.run2['main.js'].toString()).to.contain('__webpack_exports__["a"]');
  });

  itCompilesChange('base-change-es2015-rename-module', {
    'index.js': ['import {rekey as key} from \'./obj\';', 'export default key;'].join('\n')
  }, {
    'index.js': ['import {refib as fib} from \'./obj\';', 'export default fib(3);'].join('\n')
  }, function (output) {
    expect(eval(output.run1['main.js'].toString())).to.eql({ default: 'obj' });
    expect(eval(output.run2['main.js'].toString())).to.eql({ default: 5 });
    // expect(output.run1['main.js'].toString()).to.contain('"a" /* rekey */');
    // expect(output.run1['main.js'].toString()).to.not.contain('__webpack_exports__["a"]');
    // expect(output.run2['main.js'].toString()).to.contain('"a" /* refib */');
    // expect(output.run2['main.js'].toString()).to.contain('__webpack_exports__["a"]');
  });

  itCompilesChange('base-change-es2015-module', {
    'index.js': ['import {fib} from \'./obj\';', 'export default fib(3);'].join('\n')
  }, {
    'index.js': ['import {key} from \'./obj\';', 'export default key;'].join('\n')
  }, function (output) {
    expect(eval(output.run1['main.js'].toString())).to.eql({ default: 5 });
    expect(eval(output.run2['main.js'].toString())).to.eql({ default: 'obj' });
    // expect(output.run1['main.js'].toString()).to.contain('"a" /* fib */');
    // expect(output.run1['main.js'].toString()).to.contain('__webpack_exports__["a"]');
    // expect(output.run2['main.js'].toString()).to.contain('"a" /* key */');
    // expect(output.run2['main.js'].toString()).to.not.contain('__webpack_exports__["a"]');
  });

  itCompilesChange('base-change-es2015-export-module', {
    'index.js': ['import {fib} from \'./obj\';', 'export default fib(3);'].join('\n')
  }, {
    'index.js': ['import {key} from \'./obj\';', 'export default key;'].join('\n')
  }, function (output) {
    expect(eval(output.run1['main.js'].toString())).to.eql({ default: 5 });
    expect(eval(output.run2['main.js'].toString())).to.eql({ default: 'obj' });
    // expect(output.run1['main.js'].toString()).to.contain('"a" /* fib */');
    // expect(output.run1['main.js'].toString()).to.contain('__webpack_exports__["a"]');
    // expect(output.run2['main.js'].toString()).to.contain('"a" /* key */');
    // expect(output.run2['main.js'].toString()).to.not.contain('__webpack_exports__["a"]');
  });

  itCompilesChange('base-change-es2015-all-module', {
    'index.js': ['import * as obj from \'./obj\';', 'export default obj.fib(3);'].join('\n')
  }, {
    'index.js': ['import {key} from \'./obj\';', 'export default key;'].join('\n')
  }, function (output) {
    expect(eval(output.run1['main.js'].toString())).to.eql({ default: 5 });
    expect(eval(output.run2['main.js'].toString())).to.eql({ default: 'obj' });
    // expect(output.run1['main.js'].toString()).to.contain('"a" /* fib */');
    // expect(output.run1['main.js'].toString()).to.contain('__webpack_exports__["a"]');
    // expect(output.run2['main.js'].toString()).to.contain('"a" /* key */');
    // expect(output.run2['main.js'].toString()).to.not.contain('__webpack_exports__["a"]');
  });

  itCompilesChange('base-change-es2015-default-module', {
    'index.js': ['import obj, {fib} from \'./obj\';', 'export default [obj.fib(3), fib(2)];'].join('\n')
  }, {
    'index.js': ['import {key} from \'./obj\';', 'export default key;'].join('\n')
  }, function (output) {
    expect(eval(output.run1['main.js'].toString())).to.eql({ default: [5, 3] });
    expect(eval(output.run2['main.js'].toString())).to.eql({ default: 'obj' });
    // expect(output.run1['main.js'].toString()).to.contain('"b" /* fib */');
    // expect(output.run1['main.js'].toString()).to.contain('__webpack_exports__["a"]');
    // expect(output.run2['main.js'].toString()).to.contain('"a" /* key */');
    // expect(output.run2['main.js'].toString()).to.contain('__webpack_exports__["a"]');
  });

  itCompilesChange('base-change-es2015-rename-module', {
    'index.js': ['import {refib as fib} from \'./obj\';', 'export default fib(3);'].join('\n')
  }, {
    'index.js': ['import {rekey as key} from \'./obj\';', 'export default key;'].join('\n')
  }, function (output) {
    expect(eval(output.run1['main.js'].toString())).to.eql({ default: 5 });
    expect(eval(output.run2['main.js'].toString())).to.eql({ default: 'obj' });
    // expect(output.run1['main.js'].toString()).to.contain('"a" /* refib */');
    // expect(output.run1['main.js'].toString()).to.contain('__webpack_exports__["a"]');
    // expect(output.run2['main.js'].toString()).to.contain('"a" /* rekey */');
    // expect(output.run2['main.js'].toString()).to.not.contain('__webpack_exports__["a"]');
  });
});
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImhhcmQtc291cmNlLXdlYnBhY2stcGx1Z2luL3Rlc3RzL2Jhc2Utd2VicGFjay0yLmpzIl0sIm5hbWVzIjpbImV4cGVjdCIsInJlcXVpcmUiLCJpdENvbXBpbGVzIiwiaXRDb21waWxlc1R3aWNlIiwiaXRDb21waWxlc0NoYW5nZSIsIml0Q29tcGlsZXNIYXJkTW9kdWxlcyIsImRlc2NyaWJlV1AyIiwiZXhwb3J0U3RhdHMiLCJvdXRwdXQiLCJydW4yIiwidG9TdHJpbmciLCJ0byIsImNvbnRhaW4iLCJqb2luIiwiZXZhbCIsInJ1bjEiLCJlcWwiLCJkZWZhdWx0IiwicmVzdWx0MSIsInJlc3VsdDIiLCJ1bmRlZmluZWQiXSwibWFwcGluZ3MiOiI7O0FBQUEsSUFBSUEsU0FBU0MsUUFBUSxNQUFSLEVBQWdCRCxNQUE3Qjs7QUFFQSxJQUFJRSxhQUFhRCxrQkFBa0JDLFVBQW5DO0FBQ0EsSUFBSUMsa0JBQWtCRixrQkFBa0JFLGVBQXhDO0FBQ0EsSUFBSUMsbUJBQW1CSCxrQkFBa0JHLGdCQUF6QztBQUNBLElBQUlDLHdCQUF3Qkosa0JBQWtCSSxxQkFBOUM7QUFDQSxJQUFJQyxjQUFjTCxrQkFBa0JLLFdBQXBDOztBQUVBQSxZQUFZLDRDQUFaLEVBQTBELFlBQVc7O0FBRW5FSCxrQkFBZ0Isb0JBQWhCO0FBQ0FBLGtCQUFnQixvQkFBaEIsRUFBc0MsRUFBQ0ksYUFBYSxJQUFkLEVBQXRDO0FBQ0FKLGtCQUFnQixrQ0FBaEI7QUFDQUEsa0JBQWdCLGtDQUFoQixFQUFvRCxFQUFDSSxhQUFhLElBQWQsRUFBcEQ7QUFDQUosa0JBQWdCLHlDQUFoQjtBQUNBQSxrQkFBZ0IseUNBQWhCLEVBQTJELEVBQUNJLGFBQWEsSUFBZCxFQUEzRDtBQUNBSixrQkFBZ0Isc0NBQWhCO0FBQ0FBLGtCQUFnQixzQ0FBaEIsRUFBd0QsRUFBQ0ksYUFBYSxJQUFkLEVBQXhEO0FBQ0FKLGtCQUFnQiwyQkFBaEI7QUFDQUEsa0JBQWdCLDJCQUFoQixFQUE2QyxFQUFDSSxhQUFhLElB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dHMvYmFzZS13ZWJwYWNrLTIuanMiLCJzb3VyY2VzQ29udGVudCI6WyJ2YXIgZXhwZWN0ID0gcmVxdWlyZSgnY2hhaScpLmV4cGVjdDtcblxudmFyIGl0Q29tcGlsZXMgPSByZXF1aXJlKCcuL3V0aWwnKS5pdENvbXBpbGVzO1xudmFyIGl0Q29tcGlsZXNUd2ljZSA9IHJlcXVpcmUoJy4vdXRpbCcpLml0Q29tcGlsZXNUd2ljZTtcbnZhciBpdENvbXBpbGVzQ2hhbmdlID0gcmVxdWlyZSgnLi91dGlsJykuaXRDb21waWxlc0NoYW5nZTtcbnZhciBpdENvbXBpbGVzSGFyZE1vZHVsZXMgPSByZXF1aXJlKCcuL3V0aWwnKS5pdENvbXBpbGVzSGFyZE1vZHVsZXM7XG52YXIgZGVzY3JpYmVXUDIgPSByZXF1aXJlKCcuL3V0aWwnKS5kZXNjcmliZVdQMjtcblxuZGVzY3JpYmVXUDIoJ2Jhc2ljIHdlYnBhY2sgMiB1c2UgLSBjb21waWxlcyBpZGVudGljYWxseScsIGZ1bmN0aW9uKCkge1xuXG4gIGl0Q29tcGlsZXNUd2ljZSgnYmFzZS1lczIwMTUtbW9kdWxlJyk7XG4gIGl0Q29tcGlsZXNUd2ljZSgnYmFzZS1lczIwMTUtbW9kdWxlJywge2V4cG9ydFN0YXRzOiB0cnVlfSk7XG4gIGl0Q29tcGlsZXNUd2ljZSgnYmFzZS1lczIwMTUtbW9kdWxlLWNvbXBhdGliaWxpdHknKTtcbiAgaXRDb21waWxlc1R3aWNlKCdiYXNlLWVzMjAxNS1tb2R1bGUtY29tcGF0aWJpbGl0eScsIHtleHBvcnRTdGF0czogdHJ1ZX0pO1xuICBpdENvbXBpbGVzVHdpY2UoJ2Jhc2UtZXMyMDE1LW1vZHVsZS1leHBvcnQtYmVmb3JlLWltcG9ydCcpO1xuICBpdENvbXBpbGVzVHdpY2UoJ2Jhc2UtZXMyMDE1LW1vZHVsZS1leHBvcnQtYmVmb3JlLWltcG9ydCcsIHtleHBvcnRTdGF0czogdHJ1ZX0pO1xuICBpdENvbXBpbGVzVHdpY2UoJ2Jhc2UtZXMyMDE1LW1vZHVsZS11c2UtYmVmb3JlLWltcG9ydCcpO1xuICBpdENvbXBpbGVzVHdpY2UoJ2Jhc2UtZXMyMDE1LW1vZHVsZS11c2UtYmVmb3JlLWltcG9ydCcsIHtleHBvcnRTdGF0czogdHJ1ZX0pO1xuICBpdENvbXBpbGVzVHdpY2UoJ2Jhc2UtZXMyMDE1LXJlbmFtZS1tb2R1bGUnKTtcbiAgaXRDb21waWxlc1R3aWNlKCdiYXNlLWVzMjAxNS1yZW5hbWUtbW9kdWxlJywge2V4cG9ydFN0YXRzOiB0cnVlfSk7XG4gIGl0Q29tcGlsZXNUd2ljZSgnYmFzZS1lczIwMTUtc3lzdGVtLWNvbnRleHQnKTtcbiAgaXRDb21waWxlc1R3aWNlKCdiYXNlLWVzMjAxNS1zeXN0ZW0tY29udGV4dCcsIHtleHBvcnRTdGF0czogdHJ1ZX0pO1xuICBpdENvbXBpbGVzVHdpY2UoJ2Jhc2UtZXMyMDE1LXN5c3RlbS1tb2R1bGUnKTtcbiAgaXRDb21waWxlc1R3aWNlKCdiYXNlLWVzMjAxNS1zeXN0ZW0tbW9kdWxlJywge2V4cG9ydFN0YXRzOiB0cnVlfSk7XG4gIGl0Q29tcGlsZXNUd2ljZSgnYmFzZS13YXJuaW5nLWNvbnRleHQnKTtcbiAgaXRDb21waWxlc1R3aWNlKCdiYXNlLXdhcm5pbmctY29udGV4dCcsIHtleHBvcnRTdGF0czogdHJ1ZX0pO1xuICBpdENvbXBpbGVzVHdpY2UoJ2Jhc2Utd2FybmluZy1lczIwMTUnKTtcbiAgaXRDb21waWxlc1R3aWNlKCdiYXNlLXdhcm5pbmctZXMyMDE1Jywge2V4cG9ydFN0YXRzOiB0cnVlfSk7XG5cbiAgaXRDb21waWxlc0hhcmRNb2R1bGVzKCdiYXNlLWVzMjAxNS1tb2R1bGUnLCBbJy4vaW5kZXguanMnLCAnLi9vYmouanMnLCAnLi9maWIuanMnXSk7XG4gIGl0Q29tcGlsZXNIYXJkTW9kdWxlcygnYmFzZS1lczIwMTUtbW9kdWxlLWNvbXBhdGliaWxpdHknLCBbJy4vaW5kZXguanMnLCAnLi9vYmouanMnLCAnLi9maWIuanMnXSk7XG4gIGl0Q29tcGlsZXNIYXJkTW9kdWxlcygnYmFzZS1lczIwMTUtbW9kdWxlLWV4cG9ydC1iZWZvcmUtaW1wb3J0JywgWycuL2luZGV4LmpzJywgJy4vb2JqLmpzJywgJy4vZmliLmpzJ10pO1xuICBpdENvbXBpbGVzSGFyZE1vZHVsZXMoJ2Jhc2UtZXMyMDE1LW1vZHVsZS11c2UtYmVmb3JlLWltcG9ydCcsIFsnLi9pbmRleC5qcycsICcuL29iai5qcycsICcuL2ZpYi5qcyddKTtcblxuICBpdENvbXBpbGVzKFxuICAgICdpdCBpbmNsdWRlcyBjb21wYXRpYmlsaXR5IGRlcGVuZGVuY3kgaW4gYmFzZS1lczIwMTUtbW9kdWxlLWNvbXBhdGliaWxpdHknLCBcbiAgICAnYmFzZS1lczIwMTUtbW9kdWxlLWNvbXBhdGliaWxpdHknLFxuICAgIGZ1bmN0aW9uKG91dHB1dCkge1xuICAgICAgZXhwZWN0KG91dHB1dC5ydW4yWydtYWluLmpzJ10udG9TdHJpbmcoKSkudG8uY29udGFpbignX19lc01vZHVsZScpO1xuICAgIH1cbiAgKTtcblxufSk7XG5cbmRlc2NyaWJlV1AyKCdiYXNpYyB3ZWJwYWNrIDIgdXNlIC0gYnVpbGRzIGNoYW5nZXMnLCBmdW5jdGlvbigpIHtcblxuICBpdENvbXBpbGVzQ2hhbmdlKCdiYXNlLWNoYW5nZS1lczIwMTUtbW9kdWxlJywge1xuICAgICdpbmRleC5qcyc6IFtcbiAgICAgICdpbXBvcnQge2tleX0gZnJvbSBcXCcuL29ialxcJzsnLFxuICAgICAgJ2V4cG9ydCBkZWZhdWx0IGtleTsnLFxuICAgIF0uam9pbignXFxuJyksXG4gIH0sIHtcbiAgICAnaW5kZXguanMnOiBbXG4gICAgICAnaW1wb3J0IHtmaWJ9IGZyb20gXFwnLi9vYmpcXCc7JyxcbiAgICAgICdleHBvcnQgZGVmYXVsdCBmaWIoMyk7JyxcbiAgICBdLmpvaW4oJ1xcbicpLFxuICB9LCBmdW5jdGlvbihvdXRwdXQpIHtcbiAgICBleHBlY3QoZXZhbChvdXRwdXQucnVuMVsnbWFpbi5qcyddLnRvU3RyaW5nKCkpKS50by5lcWwoe2RlZmF1bHQ6ICdvYmonfSk7XG4gICAgZXhwZWN0KGV2YWwob3V0cHV0LnJ1bjJbJ21haW4uanMnXS50b1N0cmluZygpKSkudG8uZXFsKHtkZWZhdWx0OiA1fSk7XG4gICAgLy8gZXhwZWN0KG91dHB1dC5ydW4xWydtYWluLmpzJ10udG9TdHJpbmcoKSkudG8uY29udGFpbignXCJhXCIgLyoga2V5ICovJyk7XG4gICAgLy8gZXhwZWN0KG91dHB1dC5ydW4xWydtYWluLmpzJ10udG9TdHJpbmcoKSkudG8ubm90LmNvbnRhaW4oJ19fd2VicGFja19leHBvcnRzX19bXCJhXCJdJyk7XG4gICAgLy8gZXhwZWN0KG91dHB1dC5ydW4yWydtYWluLmpzJ10udG9TdHJpbmcoKSkudG8uY29udGFpbignXCJhXCIgLyogZmliICovJyk7XG4gICAgLy8gZXhwZWN0KG91dHB1dC5ydW4yWydtYWluLmpzJ10udG9TdHJpbmcoKSkudG8uY29udGFpbignX193ZWJwYWNrX3JlcXVpcmVfXy5kKF9fd2VicGFja19leHBvcnRzX18sIFwiYVwiJyk7XG4gICAgLy8gZXhwZWN0KG91dHB1dC5ydW4yWydtYWluLmpzJ10udG9TdHJpbmcoKSkudG8uY29udGFpbignX193ZWJwYWNrX2V4cG9ydHNfX1tcImFcIl0nKTtcbiAgfSk7XG5cbiAgaXRDb21waWxlc0NoYW5nZSgnYmFzZS1jaGFuZ2UtZXMyMDE1LWNvbW1vbmpzLW1vZHVsZScsIHtcbiAgICAnaW5kZXguanMnOiBbXG4gICAgICAnaW1wb3J0IHtrZXl9IGZyb20gXFwnLi9vYmpcXCc7JyxcbiAgICAgICdleHBvcnQgZGVmYXVsdCBrZXk7JyxcbiAgICBdLmpvaW4oJ1xcbicpLFxuICB9LCB7XG4gICAgJ2luZGV4LmpzJzogW1xuICAgICAgJ3ZhciBmaWIgPSByZXF1aXJlKFxcJy4vb2JqXFwnKS5maWI7JyxcbiAgICAgICdtb2R1bGUuZXhwb3J0cyA9IGZpYigzKTsnLFxuICAgIF0uam9pbignXFxuJyksXG4gIH0sIGZ1bmN0aW9uKG91dHB1dCkge1xuICAgIGNvbnN0IHJlc3VsdDEgPSBldmFsKG91dHB1dC5ydW4xWydtYWluLmpzJ10udG9TdHJpbmcoKSkuZGVmYXVsdDtcbiAgICBleHBlY3QocmVzdWx0MSkudG8uZXFsKCdvYmonKTtcbiAgICBjb25zdCByZXN1bHQyID0gZXZhbChvdXRwdXQucnVuMlsnbWFpbi5qcyddLnRvU3RyaW5nKCkpO1xuICAgIGV4cGVjdChyZXN1bHQyKS50by5lcWwoNSk7XG4gICAgLy8gZXhwZWN0KG91dHB1dC5ydW4xWydtYWluLmpzJ10udG9TdHJpbmcoKSkudG8uY29udGFpbignXCJhXCIgLyoga2V5ICovJyk7XG4gICAgLy8gZXhwZWN0KG91dHB1dC5ydW4xWydtYWluLmpzJ10udG9TdHJpbmcoKSkudG8ubm90LmNvbnRhaW4oJ19fd2VicGFja19leHBvcnRzX19bXCJhXCJdJyk7XG4gICAgLy8gZXhwZWN0KG91dHB1dC5ydW4yWydtYWluLmpzJ10udG9TdHJpbmcoKSkudG8ubWF0Y2goL19fd2VicGFja19yZXF1aXJlX19cXChcXGRcXClcXC5maWIvKTtcbiAgICAvLyBleHBlY3Qob3V0cHV0LnJ1bjJbJ21haW4uanMnXS50b1N0cmluZygpKS50by5jb250YWluKCdfX3dlYnBhY2tfcmVxdWlyZV9fLmQoX193ZWJwYWNrX2V4cG9ydHNfXywgXCJmaWJcIicpO1xuICAgIC8vIGV4cGVjdChvdXRwdXQucnVuMlsnbWFpbi5qcyddLnRvU3RyaW5nKCkpLnRvLmNvbnRhaW4oJ19fd2VicGFja19leHBvcnRzX19bXCJhXCJdJyk7XG4gIH0pO1xuXG4gIGl0Q29tcGlsZXNDaGFuZ2UoJ2Jhc2UtY2hhbmdlLWVzMjAxNS1leHBvcnQtbW9kdWxlJywge1xuICAgICdpbmRleC5qcyc6IFtcbiAgICAgICdpbXBvcnQge2tleX0gZnJvbSBcXCcuL29ialxcJzsnLFxuICAgICAgJ2V4cG9ydCBkZWZhdWx0IGtleTsnLFxuICAgIF0uam9pbignXFxuJyksXG4gIH0sIHtcbiAgICAnaW5kZXguanMnOiBbXG4gICAgICAnaW1wb3J0IHtmaWJ9IGZyb20gXFwnLi9vYmpcXCc7JyxcbiAgICAgICdleHBvcnQgZGVmYXVsdCBmaWIoMyk7JyxcbiAgICBdLmpvaW4oJ1xcbicpLFxuICB9LCBmdW5jdGlvbihvdXRwdXQpIHtcbiAgICBjb25zdCByZXN1bHQxID0gZXZhbChvdXRwdXQucnVuMVsnbWFpbi5qcyddLnRvU3RyaW5nKCkpLmRlZmF1bHQ7XG4gICAgZXhwZWN0KHJlc3VsdDEpLnRvLmVxbCgnb2JqJyk7XG4gICAgY29uc3QgcmVzdWx0MiA9IGV2YWwob3V0cHV0LnJ1bjJbJ21haW4uanMnXS50b1N0cmluZygpKS5kZWZhdWx0O1xuICAgIGV4cGVjdChyZXN1bHQyKS50by5lcWwoNSk7XG4gICAgLy8gZXhwZWN0KG91dHB1dC5ydW4xWydtYWluLmpzJ10udG9TdHJpbmcoKSkudG8uY29udGFpbignXCJhXCIgLyoga2V5ICovJyk7XG4gICAgLy8gZXhwZWN0KG91dHB1dC5ydW4xWydtYWluLmpzJ10udG9TdHJpbmcoKSkudG8ubm90LmNvbnRhaW4oJ19fd2VicGFja19leHBvcnRzX19bXCJhXCJdJyk7XG4gICAgLy8gZXhwZWN0KG91dHB1dC5ydW4yWydtYWluLmpzJ10udG9TdHJpbmcoKSkudG8uY29udGFpbignXCJhXCIgLyogZmliICovJyk7XG4gICAgLy8gZXhwZWN0KG91dHB1dC5ydW4yWydtYWluLmpzJ10udG9TdHJpbmcoKSkudG8uY29udGFpbignX193ZWJwYWNrX2V4cG9ydHNfX1tcImFcIl0nKTtcbiAgfSk7XG5cbiAgaXRDb21waWxlc0NoYW5nZSgnYmFzZS1jaGFuZ2UtZXMyMDE1LWV4cG9ydC1vcmRlci1tb2R1bGUnLCB7XG4gICAgJ290aGVyLmpzJzogW1xuICAgICAgJ2ltcG9ydCB7ZmliLCBrZXl9IGZyb20gXFwnLi9vYmpcXCc7JyxcbiAgICAgICdleHBvcnQgZGVmYXVsdCBbZmliLCBrZXldOycsXG4gICAgXS5qb2luKCdcXG4nKSxcbiAgfSwge1xuICAgICdvdGhlci5qcyc6IFtcbiAgICAgICdpbXBvcnQge2ZpYiwga2V5fSBmcm9tIFxcJy4vb2JqXFwnOycsXG4gICAgICAnZXhwb3J0IGRlZmF1bHQgW2tleSwgZmliXTsnLFxuICAgIF0uam9pbignXFxuJyksXG4gIH0sIGZ1bmN0aW9uKG91dHB1dCkge1xuICAgIGNvbnN0IHJlc3VsdDEgPSBldmFsKG91dHB1dC5ydW4xWydtYWluLmpzJ10udG9TdHJpbmcoKSkuZGVmYXVsdDtcbiAgICBleHBlY3QocmVzdWx0MVswXVswXSgzKSkudG8uZXFsKDUpO1xuICAgIGV4cGVjdChyZXN1bHQxWzBdWzFdKS50by5lcWwoJ29iaicpO1xuICAgIGV4cGVjdChyZXN1bHQxWzFdWzBdKDMpKS50by5lcWwoNSk7XG4gICAgZXhwZWN0KHJlc3VsdDFbMV1bMV0pLnRvLmVxbCh1bmRlZmluZWQpO1xuICAgIGNvbnN0IHJlc3VsdDIgPSBldmFsKG91dHB1dC5ydW4yWydtYWluLmpzJ10udG9TdHJpbmcoKSkuZGVmYXVsdDtcbiAgICBleHBlY3QocmVzdWx0MlswXVswXSgzKSkudG8uZXFsKDUpO1xuICAgIGV4cGVjdChyZXN1bHQyWzBdWzFdKS50by5lcWwoJ29iaicpO1xuICAgIGV4cGVjdChyZXN1bHQyWzFdWzBdKS50by5lcWwodW5kZWZpbmVkKTtcbiAgICBleHBlY3QocmVzdWx0MlsxXVsxXSgzKSkudG8uZXFsKDUpO1xuICAgIC8vIHZhciBydW4xRmliSWQgPSAvX193ZWJwYWNrX2V4cG9ydHNfX1xcW1wiKFxcdylcIlxcXSA9IGZpYi8uZXhlYyhvdXRwdXQucnVuMVsnbWFpbi5qcyddLnRvU3RyaW5nKCkpWzFdO1xuICAgIC8vIHZhciBydW4xS2V5SWQgPSBydW4xRmliSWQgPT09ICdhJyA/ICdiJyA6ICdhJztcbiAgICAvLyBleHBlY3Qob3V0cHV0LnJ1bjFbJ21haW4uanMnXS50b1N0cmluZygpKS50by5jb250YWluKCdjb25zb2xlLmxvZyhfX1dFQlBBQ0tfSU1QT1JURURfTU9EVUxFXzBfX29ial9fW1wiJyArIHJ1bjFGaWJJZCArICdcIiAvKiBmaWIgKi9dLCBfX1dFQlBBQ0tfSU1QT1JURURfTU9EVUxFXzBfX29ial9fW1wiJyArIHJ1bjFLZXlJZCArICdcIiAvKiBrZXkgKi9dKTsnKTtcbiAgICAvLyB2YXIgcnVuMkZpYklkID0gL19fd2VicGFja19leHBvcnRzX19cXFtcIihcXHcpXCJcXF0gPSBmaWIvLmV4ZWMob3V0cHV0LnJ1bjJbJ21haW4uanMnXS50b1N0cmluZygpKVsxXTtcbiAgICAvLyB2YXIgcnVuMktleUlkID0gcnVuMkZpYklkID09PSAnYScgPyAnYicgOiAnYSc7XG4gICAgLy8gZXhwZWN0KG91dHB1dC5ydW4yWydtYWluLmpzJ10udG9TdHJpbmcoKSkudG8uY29udGFpbignY29uc29sZS5sb2coX19XRUJQQUNLX0lNUE9SVEVEX01PRFVMRV8wX19vYmpfX1tcIicgKyBydW4yRmliSWQgKyAnXCIgLyogZmliICovXSwgX19XRUJQQUNLX0lNUE9SVEVEX01PRFVMRV8wX19vYmpfX1tcIicgKyBydW4yS2V5SWQgKyAnXCIgLyoga2V5ICovXSk7Jyk7XG4gIH0pO1xuXG4gIGl0Q29tcGlsZXNDaGFuZ2UoJ2Jhc2UtY2hhbmdlLWVzMjAxNS1leHBvcnQtb3JkZXItbW9kdWxlJywge1xuICAgICdvdGhlci5qcyc6IFtcbiAgICAgICdpbXBvcnQge2ZpYiwga2V5fSBmcm9tIFxcJy4vb2JqXFwnOycsXG4gICAgICAnZXhwb3J0IGRlZmF1bHQgW2ZpYiwga2V5XTsnLFxuICAgIF0uam9pbignXFxuJyksXG4gICAgJ29iai5qcyc6IFtcbiAgICAgICdpbXBvcnQgXFwnLi9vdGhlclxcJzsnLFxuICAgICAgJ2V4cG9ydCBmdW5jdGlvbiBmaWIobikgeycsXG4gICAgICAnICByZXR1cm4gbiArIChuID4gMCA/IG4gLSAxIDogMCk7JyxcbiAgICAgICd9JyxcbiAgICAgICdleHBvcnQgdmFyIGtleSA9IFxcJ29ialxcJzsnLFxuICAgIF0uam9pbignXFxuJyksXG4gIH0sIHtcbiAgICAnb3RoZXIuanMnOiBbXG4gICAgICAnaW1wb3J0IHtmaWIsIGtleX0gZnJvbSBcXCcuL29ialxcJzsnLFxuICAgICAgJ2V4cG9ydCBkZWZhdWx0IFtrZXksIGZpYl07JyxcbiAgICBdLmpvaW4oJ1xcbicpLFxuICAgICdvYmouanMnOiBbXG4gICAgICAnaW1wb3J0IFxcJy4vb3RoZXJcXCc7JyxcbiAgICAgICdleHBvcnQgdmFyIGtleSA9IFxcJ29ialxcJzsnLFxuICAgICAgJ2V4cG9ydCBmdW5jdGlvbiBmaWIobikgeycsXG4gICAgICAnICByZXR1cm4gbiArIChuID4gMCA/IG4gLSAxIDogMCk7JyxcbiAgICAgICd9JyxcbiAgICBdLmpvaW4oJ1xcbicpLFxuICB9LCBmdW5jdGlvbihvdXRwdXQpIHtcbiAgICBjb25zdCByZXN1bHQxID0gZXZhbChvdXRwdXQucnVuMVsnbWFpbi5qcyddLnRvU3RyaW5nKCkpLmRlZmF1bHQ7XG4gICAgZXhwZWN0KHJlc3VsdDFbMF1bMF0oMykpLnRvLmVxbCg1KTtcbiAgICBleHBlY3QocmVzdWx0MVswXVsxXSkudG8uZXFsKCdvYmonKTtcbiAgICBleHBlY3QocmVzdWx0MVsxXVswXSgzKSkudG8uZXFsKDUpO1xuICAgIGV4cGVjdChyZXN1bHQxWzFdWzFdKS50by5lcWwodW5kZWZpbmVkKTtcbiAgICBjb25zdCByZXN1bHQyID0gZXZhbChvdXRwdXQucnVuMlsnbWFpbi5qcyddLnRvU3RyaW5nKCkpLmRlZmF1bHQ7XG4gICAgZXhwZWN0KHJlc3VsdDJbMF1bMF0oMykpLnRvLmVxbCg1KTtcbiAgICBleHBlY3QocmVzdWx0MlswXVsxXSkudG8uZXFsKCdvYmonKTtcbiAgICBleHBlY3QocmVzdWx0MlsxXVswXSkudG8uZXFsKHVuZGVmaW5lZCk7XG4gICAgZXhwZWN0KHJlc3VsdDJbMV1bMV0oMykpLnRvLmVxbCg1KTtcbiAgICAvLyB2YXIgcnVuMUZpYklkID0gL19fd2VicGFja19leHBvcnRzX19cXFtcIihcXHcpXCJcXF0gPSBmaWIvLmV4ZWMob3V0cHV0LnJ1bjFbJ21haW4uanMnXS50b1N0cmluZygpKVsxXTtcbiAgICAvLyB2YXIgcnVuMUtleUlkID0gcnVuMUZpYklkID09PSAnYScgPyAnYicgOiAnYSc7XG4gICAgLy8gZXhwZWN0KG91dHB1dC5ydW4xWydtYWluLmpzJ10udG9TdHJpbmcoKSkudG8uY29udGFpbignY29uc29sZS5sb2coX19XRUJQQUNLX0lNUE9SVEVEX01PRFVMRV8wX19vYmpfX1tcIicgKyBydW4xRmliSWQgKyAnXCIgLyogZmliICovXSwgX19XRUJQQUNLX0lNUE9SVEVEX01PRFVMRV8wX19vYmpfX1tcIicgKyBydW4xS2V5SWQgKyAnXCIgLyoga2V5ICovXSk7Jyk7XG4gICAgLy8gdmFyIHJ1bjJGaWJJZCA9IC9fX3dlYnBhY2tfZXhwb3J0c19fXFxbXCIoXFx3KVwiXFxdID0gZmliLy5leGVjKG91dHB1dC5ydW4yWydtYWluLmpzJ10udG9TdHJpbmcoKSlbMV07XG4gICAgLy8gdmFyIHJ1bjJLZXlJZCA9IHJ1bjJGaWJJZCA9PT0gJ2EnID8gJ2InIDogJ2EnO1xuICAgIC8vIGV4cGVjdChvdXRwdXQucnVuMlsnbWFpbi5qcyddLnRvU3RyaW5nKCkpLnRvLmNvbnRhaW4oJ2NvbnNvbGUubG9nKF9fV0VCUEFDS19JTVBPUlRFRF9NT0RVTEVfMF9fb2JqX19bXCInICsgcnVuMkZpYklkICsgJ1wiIC8qIGZpYiAqL10sIF9fV0VCUEFDS19JTVBPUlRFRF9NT0RVTEVfMF9fb2JqX19bXCInICsgcnVuMktleUlkICsgJ1wiIC8qIGtleSAqL10pOycpO1xuICB9KTtcblxuICBpdENvbXBpbGVzQ2hhbmdlKCdiYXNlLWNoYW5nZS1lczIwMTUtYWxsLW1vZHVsZScsIHtcbiAgICAnaW5kZXguanMnOiBbXG4gICAgICAnaW1wb3J0IHtrZXl9IGZyb20gXFwnLi9vYmpcXCc7JyxcbiAgICAgICdleHBvcnQgZGVmYXVsdCBrZXk7JyxcbiAgICBdLmpvaW4oJ1xcbicpLFxuICB9LCB7XG4gICAgJ2luZGV4LmpzJzogW1xuICAgICAgJ2ltcG9ydCAqIGFzIG9iaiBmcm9tIFxcJy4vb2JqXFwnOycsXG4gICAgICAnZXhwb3J0IGRlZmF1bHQgb2JqLmZpYigzKTsnLFxuICAgIF0uam9pbignXFxuJyksXG4gIH0sIGZ1bmN0aW9uKG91dHB1dCkge1xuICAgIGV4cGVjdChldmFsKG91dHB1dC5ydW4xWydtYWluLmpzJ10udG9TdHJpbmcoKSkpLnRvLmVxbCh7ZGVmYXVsdDogJ29iaid9KTtcbiAgICBleHBlY3QoZXZhbChvdXRwdXQucnVuMlsnbWFpbi5qcyddLnRvU3RyaW5nKCkpKS50by5lcWwoe2RlZmF1bHQ6IDV9KTtcbiAgICAvLyBleHBlY3Qob3V0cHV0LnJ1bjFbJ21haW4uanMnXS50b1N0cmluZygpKS50by5jb250YWluKCdcImFcIiAvKiBrZXkgKi8nKTtcbiAgICAvLyBleHBlY3Qob3V0cHV0LnJ1bjFbJ21haW4uanMnXS50b1N0cmluZygpKS50by5ub3QuY29udGFpbignX193ZWJwYWNrX2V4cG9ydHNfX1tcImFcIl0nKTtcbiAgICAvLyBleHBlY3Qob3V0cHV0LnJ1bjJbJ21haW4uanMnXS50b1N0cmluZygpKS50by5jb250YWluKCdcImFcIiAvKiBmaWIgKi8nKTtcbiAgICAvLyBleHBlY3Qob3V0cHV0LnJ1bjJbJ21haW4uanMnXS50b1N0cmluZygpKS50by5jb250YWluKCdfX3dlYnBhY2tfZXhwb3J0c19fW1wiYVwiXScpO1xuICB9KTtcblxuICBpdENvbXBpbGVzQ2hhbmdlKCdiYXNlLWNoYW5nZS1lczIwMTUtZGVmYXVsdC1tb2R1bGUnLCB7XG4gICAgJ2luZGV4LmpzJzogW1xuICAgICAgJ2ltcG9ydCB7a2V5fSBmcm9tIFxcJy4vb2JqXFwnOycsXG4gICAgICAnZXhwb3J0IGRlZmF1bHQga2V5OycsXG4gICAgXS5qb2luKCdcXG4nKSxcbiAgfSwge1xuICAgICdpbmRleC5qcyc6IFtcbiAgICAgICdpbXBvcnQgb2JqLCB7ZmlifSBmcm9tIFxcJy4vb2JqXFwnOycsXG4gICAgICAnZXhwb3J0IGRlZmF1bHQgW29iai5maWIoMyksIGZpYigyKV07JyxcbiAgICBdLmpvaW4oJ1xcbicpLFxuICB9LCBmdW5jdGlvbihvdXRwdXQpIHtcbiAgICBleHBlY3QoZXZhbChvdXRwdXQucnVuMVsnbWFpbi5qcyddLnRvU3RyaW5nKCkpKS50by5lcWwoe2RlZmF1bHQ6ICdvYmonfSk7XG4gICAgZXhwZWN0KGV2YWwob3V0cHV0LnJ1bjJbJ21haW4uanMnXS50b1N0cmluZygpKSkudG8uZXFsKHtkZWZhdWx0OiBbNSwgM119KTtcbiAgICAvLyBleHBlY3Qob3V0cHV0LnJ1bjFbJ21haW4uanMnXS50b1N0cmluZygpKS50by5jb250YWluKCdcImFcIiAvKiBrZXkgKi8nKTtcbiAgICAvLyBleHBlY3Qob3V0cHV0LnJ1bjFbJ21haW4uanMnXS50b1N0cmluZygpKS50by5jb250YWluKCdfX3dlYnBhY2tfZXhwb3J0c19fW1wiYVwiXScpO1xuICAgIC8vIGV4cGVjdChvdXRwdXQucnVuMlsnbWFpbi5qcyddLnRvU3RyaW5nKCkpLnRvLmNvbnRhaW4oJ1wiYlwiIC8qIGZpYiAqLycpO1xuICAgIC8vIGV4cGVjdChvdXRwdXQucnVuMlsnbWFpbi5qcyddLnRvU3RyaW5nKCkpLnRvLmNvbnRhaW4oJ19fd2VicGFja19leHBvcnRzX19bXCJhXCJdJyk7XG4gIH0pO1xuXG4gIGl0Q29tcGlsZXNDaGFuZ2UoJ2Jhc2UtY2hhbmdlLWVzMjAxNS1yZW5hbWUtbW9kdWxlJywge1xuICAgICdpbmRleC5qcyc6IFtcbiAgICAgICdpbXBvcnQge3Jla2V5IGFzIGtleX0gZnJvbSBcXCcuL29ialxcJzsnLFxuICAgICAgJ2V4cG9ydCBkZWZhdWx0IGtleTsnLFxuICAgIF0uam9pbignXFxuJyksXG4gIH0sIHtcbiAgICAnaW5kZXguanMnOiBbXG4gICAgICAnaW1wb3J0IHtyZWZpYiBhcyBmaWJ9IGZyb20gXFwnLi9vYmpcXCc7JyxcbiAgICAgICdleHBvcnQgZGVmYXVsdCBmaWIoMyk7JyxcbiAgICBdLmpvaW4oJ1xcbicpLFxuICB9LCBmdW5jdGlvbihvdXRwdXQpIHtcbiAgICBleHBlY3QoZXZhbChvdXRwdXQucnVuMVsnbWFpbi5qcyddLnRvU3RyaW5nKCkpKS50by5lcWwoe2RlZmF1bHQ6ICdvYmonfSk7XG4gICAgZXhwZWN0KGV2YWwob3V0cHV0LnJ1bjJbJ21haW4uanMnXS50b1N0cmluZygpKSkudG8uZXFsKHtkZWZhdWx0OiA1fSk7XG4gICAgLy8gZXhwZWN0KG91dHB1dC5ydW4xWydtYWluLmpzJ10udG9TdHJpbmcoKSkudG8uY29udGFpbignXCJhXCIgLyogcmVrZXkgKi8nKTtcbiAgICAvLyBleHBlY3Qob3V0cHV0LnJ1bjFbJ21haW4uanMnXS50b1N0cmluZygpKS50by5ub3QuY29udGFpbignX193ZWJwYWNrX2V4cG9ydHNfX1tcImFcIl0nKTtcbiAgICAvLyBleHBlY3Qob3V0cHV0LnJ1bjJbJ21haW4uanMnXS50b1N0cmluZygpKS50by5jb250YWluKCdcImFcIiAvKiByZWZpYiAqLycpO1xuICAgIC8vIGV4cGVjdChvdXRwdXQucnVuMlsnbWFpbi5qcyddLnRvU3RyaW5nKCkpLnRvLmNvbnRhaW4oJ19fd2VicGFja19leHBvcnRzX19bXCJhXCJdJyk7XG4gIH0pO1xuXG4gIGl0Q29tcGlsZXNDaGFuZ2UoJ2Jhc2UtY2hhbmdlLWVzMjAxNS1tb2R1bGUnLCB7XG4gICAgJ2luZGV4LmpzJzogW1xuICAgICAgJ2ltcG9ydCB7ZmlifSBmcm9tIFxcJy4vb2JqXFwnOycsXG4gICAgICAnZXhwb3J0IGRlZmF1bHQgZmliKDMpOycsXG4gICAgXS5qb2luKCdcXG4nKSxcbiAgfSwge1xuICAgICdpbmRleC5qcyc6IFtcbiAgICAgICdpbXBvcnQge2tleX0gZnJvbSBcXCcuL29ialxcJzsnLFxuICAgICAgJ2V4cG9ydCBkZWZhdWx0IGtleTsnLFxuICAgIF0uam9pbignXFxuJyksXG4gIH0sIGZ1bmN0aW9uKG91dHB1dCkge1xuICAgIGV4cGVjdChldmFsKG91dHB1dC5ydW4xWydtYWluLmpzJ10udG9TdHJpbmcoKSkpLnRvLmVxbCh7ZGVmYXVsdDogNX0pO1xuICAgIGV4cGVjdChldmFsKG91dHB1dC5ydW4yWydtYWluLmpzJ10udG9TdHJpbmcoKSkpLnRvLmVxbCh7ZGVmYXVsdDogJ29iaid9KTtcbiAgICAvLyBleHBlY3Qob3V0cHV0LnJ1bjFbJ21haW4uanMnXS50b1N0cmluZygpKS50by5jb250YWluKCdcImFcIiAvKiBmaWIgKi8nKTtcbiAgICAvLyBleHBlY3Qob3V0cHV0LnJ1bjFbJ21haW4uanMnXS50b1N0cmluZygpKS50by5jb250YWluKCdfX3dlYnBhY2tfZXhwb3J0c19fW1wiYVwiXScpO1xuICAgIC8vIGV4cGVjdChvdXRwdXQucnVuMlsnbWFpbi5qcyddLnRvU3RyaW5nKCkpLnRvLmNvbnRhaW4oJ1wiYVwiIC8qIGtleSAqLycpO1xuICAgIC8vIGV4cGVjdChvdXRwdXQucnVuMlsnbWFpbi5qcyddLnRvU3RyaW5nKCkpLnRvLm5vdC5jb250YWluKCdfX3dlYnBhY2tfZXhwb3J0c19fW1wiYVwiXScpO1xuICB9KTtcblxuICBpdENvbXBpbGVzQ2hhbmdlKCdiYXNlLWNoYW5nZS1lczIwMTUtZXhwb3J0LW1vZHVsZScsIHtcbiAgICAnaW5kZXguanMnOiBbXG4gICAgICAnaW1wb3J0IHtmaWJ9IGZyb20gXFwnLi9vYmpcXCc7JyxcbiAgICAgICdleHBvcnQgZGVmYXVsdCBmaWIoMyk7JyxcbiAgICBdLmpvaW4oJ1xcbicpLFxuICB9LCB7XG4gICAgJ2luZGV4LmpzJzogW1xuICAgICAgJ2ltcG9ydCB7a2V5fSBmcm9tIFxcJy4vb2JqXFwnOycsXG4gICAgICAnZXhwb3J0IGRlZmF1bHQga2V5OycsXG4gICAgXS5qb2luKCdcXG4nKSxcbiAgfSwgZnVuY3Rpb24ob3V0cHV0KSB7XG4gICAgZXhwZWN0KGV2YWwob3V0cHV0LnJ1bjFbJ21haW4uanMnXS50b1N0cmluZygpKSkudG8uZXFsKHtkZWZhdWx0OiA1fSk7XG4gICAgZXhwZWN0KGV2YWwob3V0cHV0LnJ1bjJbJ21haW4uanMnXS50b1N0cmluZygpKSkudG8uZXFsKHtkZWZhdWx0OiAnb2JqJ30pO1xuICAgIC8vIGV4cGVjdChvdXRwdXQucnVuMVsnbWFpbi5qcyddLnRvU3RyaW5nKCkpLnRvLmNvbnRhaW4oJ1wiYVwiIC8qIGZpYiAqLycpO1xuICAgIC8vIGV4cGVjdChvdXRwdXQucnVuMVsnbWFpbi5qcyddLnRvU3RyaW5nKCkpLnRvLmNvbnRhaW4oJ19fd2VicGFja19leHBvcnRzX19bXCJhXCJdJyk7XG4gICAgLy8gZXhwZWN0KG91dHB1dC5ydW4yWydtYWluLmpzJ10udG9TdHJpbmcoKSkudG8uY29udGFpbignXCJhXCIgLyoga2V5ICovJyk7XG4gICAgLy8gZXhwZWN0KG91dHB1dC5ydW4yWydtYWluLmpzJ10udG9TdHJpbmcoKSkudG8ubm90LmNvbnRhaW4oJ19fd2VicGFja19leHBvcnRzX19bXCJhXCJdJyk7XG4gIH0pO1xuXG4gIGl0Q29tcGlsZXNDaGFuZ2UoJ2Jhc2UtY2hhbmdlLWVzMjAxNS1hbGwtbW9kdWxlJywge1xuICAgICdpbmRleC5qcyc6IFtcbiAgICAgICdpbXBvcnQgKiBhcyBvYmogZnJvbSBcXCcuL29ialxcJzsnLFxuICAgICAgJ2V4cG9ydCBkZWZhdWx0IG9iai5maWIoMyk7JyxcbiAgICBdLmpvaW4oJ1xcbicpLFxuICB9LCB7XG4gICAgJ2luZGV4LmpzJzogW1xuICAgICAgJ2ltcG9ydCB7a2V5fSBmcm9tIFxcJy4vb2JqXFwnOycsXG4gICAgICAnZXhwb3J0IGRlZmF1bHQga2V5OycsXG4gICAgXS5qb2luKCdcXG4nKSxcbiAgfSwgZnVuY3Rpb24ob3V0cHV0KSB7XG4gICAgZXhwZWN0KGV2YWwob3V0cHV0LnJ1bjFbJ21haW4uanMnXS50b1N0cmluZygpKSkudG8uZXFsKHtkZWZhdWx0OiA1fSk7XG4gICAgZXhwZWN0KGV2YWwob3V0cHV0LnJ1bjJbJ21haW4uanMnXS50b1N0cmluZygpKSkudG8uZXFsKHtkZWZhdWx0OiAnb2JqJ30pO1xuICAgIC8vIGV4cGVjdChvdXRwdXQucnVuMVsnbWFpbi5qcyddLnRvU3RyaW5nKCkpLnRvLmNvbnRhaW4oJ1wiYVwiIC8qIGZpYiAqLycpO1xuICAgIC8vIGV4cGVjdChvdXRwdXQucnVuMVsnbWFpbi5qcyddLnRvU3RyaW5nKCkpLnRvLmNvbnRhaW4oJ19fd2VicGFja19leHBvcnRzX19bXCJhXCJdJyk7XG4gICAgLy8gZXhwZWN0KG91dHB1dC5ydW4yWydtYWluLmpzJ10udG9TdHJpbmcoKSkudG8uY29udGFpbignXCJhXCIgLyoga2V5ICovJyk7XG4gICAgLy8gZXhwZWN0KG91dHB1dC5ydW4yWydtYWluLmpzJ10udG9TdHJpbmcoKSkudG8ubm90LmNvbnRhaW4oJ19fd2VicGFja19leHBvcnRzX19bXCJhXCJdJyk7XG4gIH0pO1xuXG4gIGl0Q29tcGlsZXNDaGFuZ2UoJ2Jhc2UtY2hhbmdlLWVzMjAxNS1kZWZhdWx0LW1vZHVsZScsIHtcbiAgICAnaW5kZXguanMnOiBbXG4gICAgICAnaW1wb3J0IG9iaiwge2ZpYn0gZnJvbSBcXCcuL29ialxcJzsnLFxuICAgICAgJ2V4cG9ydCBkZWZhdWx0IFtvYmouZmliKDMpLCBmaWIoMildOycsXG4gICAgXS5qb2luKCdcXG4nKSxcbiAgfSwge1xuICAgICdpbmRleC5qcyc6IFtcbiAgICAgICdpbXBvcnQge2tleX0gZnJvbSBcXCcuL29ialxcJzsnLFxuICAgICAgJ2V4cG9ydCBkZWZhdWx0IGtleTsnLFxuICAgIF0uam9pbignXFxuJyksXG4gIH0sIGZ1bmN0aW9uKG91dHB1dCkge1xuICAgIGV4cGVjdChldmFsKG91dHB1dC5ydW4xWydtYWluLmpzJ10udG9TdHJpbmcoKSkpLnRvLmVxbCh7ZGVmYXVsdDogWzUsIDNdfSk7XG4gICAgZXhwZWN0KGV2YWwob3V0cHV0LnJ1bjJbJ21haW4uanMnXS50b1N0cmluZygpKSkudG8uZXFsKHtkZWZhdWx0OiAnb2JqJ30pO1xuICAgIC8vIGV4cGVjdChvdXRwdXQucnVuMVsnbWFpbi5qcyddLnRvU3RyaW5nKCkpLnRvLmNvbnRhaW4oJ1wiYlwiIC8qIGZpYiAqLycpO1xuICAgIC8vIGV4cGVjdChvdXRwdXQucnVuMVsnbWFpbi5qcyddLnRvU3RyaW5nKCkpLnRvLmNvbnRhaW4oJ19fd2VicGFja19leHBvcnRzX19bXCJhXCJdJyk7XG4gICAgLy8gZXhwZWN0KG91dHB1dC5ydW4yWydtYWluLmpzJ10udG9TdHJpbmcoKSkudG8uY29udGFpbignXCJhXCIgLyoga2V5ICovJyk7XG4gICAgLy8gZXhwZWN0KG91dHB1dC5ydW4yWydtYWluLmpzJ10udG9TdHJpbmcoKSkudG8uY29udGFpbignX193ZWJwYWNrX2V4cG9ydHNfX1tcImFcIl0nKTtcbiAgfSk7XG5cbiAgaXRDb21waWxlc0NoYW5nZSgnYmFzZS1jaGFuZ2UtZXMyMDE1LXJlbmFtZS1tb2R1bGUnLCB7XG4gICAgJ2luZGV4LmpzJzogW1xuICAgICAgJ2ltcG9ydCB7cmVmaWIgYXMgZmlifSBmcm9tIFxcJy4vb2JqXFwnOycsXG4gICAgICAnZXhwb3J0IGRlZmF1bHQgZmliKDMpOycsXG4gICAgXS5qb2luKCdcXG4nKSxcbiAgfSwge1xuICAgICdpbmRleC5qcyc6IFtcbiAgICAgICdpbXBvcnQge3Jla2V5IGFzIGtleX0gZnJvbSBcXCcuL29ialxcJzsnLFxuICAgICAgJ2V4cG9ydCBkZWZhdWx0IGtleTsnLFxuICAgIF0uam9pbignXFxuJyksXG4gIH0sIGZ1bmN0aW9uKG91dHB1dCkge1xuICAgIGV4cGVjdChldmFsKG91dHB1dC5ydW4xWydtYWluLmpzJ10udG9TdHJpbmcoKSkpLnRvLmVxbCh7ZGVmYXVsdDogNX0pO1xuICAgIGV4cGVjdChldmFsKG91dHB1dC5ydW4yWydtYWluLmpzJ10udG9TdHJpbmcoKSkpLnRvLmVxbCh7ZGVmYXVsdDogJ29iaid9KTtcbiAgICAvLyBleHBlY3Qob3V0cHV0LnJ1bjFbJ21haW4uanMnXS50b1N0cmluZygpKS50by5jb250YWluKCdcImFcIiAvKiByZWZpYiAqLycpO1xuICAgIC8vIGV4cGVjdChvdXRwdXQucnVuMVsnbWFpbi5qcyddLnRvU3RyaW5nKCkpLnRvLmNvbnRhaW4oJ19fd2VicGFja19leHBvcnRzX19bXCJhXCJdJyk7XG4gICAgLy8gZXhwZWN0KG91dHB1dC5ydW4yWydtYWluLmpzJ10udG9TdHJpbmcoKSkudG8uY29udGFpbignXCJhXCIgLyogcmVrZXkgKi8nKTtcbiAgICAvLyBleHBlY3Qob3V0cHV0LnJ1bjJbJ21haW4uanMnXS50b1N0cmluZygpKS50by5ub3QuY29udGFpbignX193ZWJwYWNrX2V4cG9ydHNfX1tcImFcIl0nKTtcbiAgfSk7XG5cbn0pO1xuIl0sInNvdXJjZVJvb3QiOiIvVXNlcnMvdHlsZXJhcmJ1cy9kZXYvcHJvdmlkZXIvc3JjIn0=

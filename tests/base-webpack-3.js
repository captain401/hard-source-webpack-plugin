'use strict';

var expect = require('chai').expect;

var itCompilesTwice = require('./util').itCompilesTwice;
var itCompilesChange = require('./util').itCompilesChange;
var itCompilesHardModules = require('./util').itCompilesHardModules;
var describeWP = require('./util').describeWP;

describeWP(3)('basic webpack 3 use - compiles identically', function () {

  itCompilesTwice('base-1dep-query');
  itCompilesTwice('base-1dep-query', { exportStats: true });
  itCompilesTwice('base-devtool-nosources-source-map');
  itCompilesTwice('base-devtool-nosources-source-map', { exportStats: true });
  itCompilesTwice('base-es2015-module-export-star');
  itCompilesTwice('base-es2015-module-export-star', { exportStats: true });
  itCompilesTwice('base-es2015-module-export-star-alt');
  itCompilesTwice('base-es2015-module-export-star-alt', { exportStats: true });

  itCompilesHardModules('base-es2015-module-export-star', ['./export.js', './fab.js', './fib.js', './index.js']);
  itCompilesHardModules('base-es2015-module-export-star-alt', ['./export.js', './fab.js', './fib.js', './index.js']);
});

describeWP(3)('basic webpack 3 use - builds changes', function () {

  itCompilesChange('base-es2015-module-export-star-some', {
    'index.js': ['import {fib} from \'./export\';', 'export default fib(3);'].join('\n')
  }, {
    'index.js': ['import {fab} from \'./export\';', 'export default fab(4);'].join('\n')
  }, function (output) {
    expect(eval(output.run1['main.js'].toString())).to.eql({ default: 5 });
    expect(eval(output.run2['main.js'].toString())).to.eql({ default: 6 });
    // expect(output.run1['main.js'].toString()).to.contain('__webpack_exports__["a"]');
    // expect(output.run2['main.js'].toString()).to.contain('"a" /* fab */');
    // expect(output.run2['main.js'].toString()).to.contain('__webpack_require__.d(__webpack_exports__, "a"');
    // expect(output.run2['main.js'].toString()).to.contain('__webpack_exports__["a"]');
  });
});
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImhhcmQtc291cmNlLXdlYnBhY2stcGx1Z2luL3Rlc3RzL2Jhc2Utd2VicGFjay0zLmpzIl0sIm5hbWVzIjpbImV4cGVjdCIsInJlcXVpcmUiLCJpdENvbXBpbGVzVHdpY2UiLCJpdENvbXBpbGVzQ2hhbmdlIiwiaXRDb21waWxlc0hhcmRNb2R1bGVzIiwiZGVzY3JpYmVXUCIsImV4cG9ydFN0YXRzIiwiam9pbiIsIm91dHB1dCIsImV2YWwiLCJydW4xIiwidG9TdHJpbmciLCJ0byIsImVxbCIsImRlZmF1bHQiLCJydW4yIl0sIm1hcHBpbmdzIjoiOztBQUFBLElBQUlBLFNBQVNDLFFBQVEsTUFBUixFQUFnQkQsTUFBN0I7O0FBRUEsSUFBSUUsa0JBQWtCRCxrQkFBa0JDLGVBQXhDO0FBQ0EsSUFBSUMsbUJBQW1CRixrQkFBa0JFLGdCQUF6QztBQUNBLElBQUlDLHdCQUF3Qkgsa0JBQWtCRyxxQkFBOUM7QUFDQSxJQUFJQyxhQUFhSixrQkFBa0JJLFVBQW5DOztBQUVBQSxXQUFXLENBQVgsRUFBYyw0Q0FBZCxFQUE0RCxZQUFXOztBQUVyRUgsa0JBQWdCLGlCQUFoQjtBQUNBQSxrQkFBZ0IsaUJBQWhCLEVBQW1DLEVBQUNJLGFBQWEsSUFBZCxFQUFuQztBQUNBSixrQkFBZ0IsbUNBQWhCO0FBQ0FBLGtCQUFnQixtQ0FBaEIsRUFBcUQsRUFBQ0ksYUFBYSxJQUFkLEVBQXJEO0FBQ0FKLGtCQUFnQixnQ0FBaEI7QUFDQUEsa0JBQWdCLGdDQUFoQixFQUFrRCxFQUFDSSxhQUFhLElBQWQsRUFBbEQ7QUFDQUosa0JBQWdCLG9DQUFoQjtBQUNBQSxrQkFBZ0Isb0NBQWhCLEVBQXNELEVBQUNJLGFBQWEsSUFBZCxFQUF0RDs7QUFFQUYsd0JBQXNCLGdDQUF0QixFQUF3RCxDQUFDLGFBQUQsRUFBZ0IsVUFBaEIsRUFBNEIsVUFBNUIsRUFBd0MsWUFBeEMsQ0FBeEQ7QUFDQUEsd0JBQXNCLG9DQUF0QixFQUE0RCxDQUFDLGFBQUQsRUFBZ0IsVUFBaEIsRUFBNEIsVUFBNUIsRUFBd0MsWUFBeEMsQ0FBNUQ7QUFFRCxDQWREOztBQWdCQUMsV0FBVyxDQUFYLEVBQWMsc0NBQWQsRUFBc0QsWUFBVzs7QUFFL0RGLG1CQUFpQixxQ0FBakIsRUFBd0Q7QUFDdEQsZ0JBQVksQ0FDVixpQ0FEVSxFQUVWLHdCQUZVLEVBR1ZJLElBSFUsQ0FHTCxJQUhLO0FBRDBDLEdBQXhELEVBS0c7QUFDRCxnQkFBWSxDQUNWLGlDQURVLEVBRVYsd0JBRlUsRUFHVkEsSUFIVSxDQUdMLElBSEs7QUFEWCxHQUxILEVBVUcsVUFBU0MsTUFBVCxFQUFpQjtBQUNsQlIsV0FBT1MsS0FBS0QsT0FBT0UsSUFBUCxDQUFZLFNBQVosRUFBdUJDLFFBQXZCLEVBQUwsQ0FBUCxFQUFnREMsRUFBaEQsQ0FBbURDLEdBQW5ELENBQXVELEVBQUNDLFNBQVMsQ0FBVixFQUF2RDtBQUNBZCxXQUFPUyxLQUFLRCxPQUFPTyxJQUFQLENBQVksU0FBWixFQUF1QkosUUFBdkIsRUFBTCxDQUFQLEVBQWdEQyxFQUFoRCxDQUFtREMsR0FBbkQsQ0FBdUQsRUFBQ0MsU0FBUyxDQUFWLEVBQXZEO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDRCxHQWpCRDtBQW1CRCxDQXJCRCIsImZpbGUiOiJoYXJkLXNvdXJjZS13ZWJwYWNrLXBsdWdpbi90ZXN0cy9iYXNlLXdlYnBhY2stMy5qcyIsInNvdXJjZXNDb250ZW50IjpbInZhciBleHBlY3QgPSByZXF1aXJlKCdjaGFpJykuZXhwZWN0O1xuXG52YXIgaXRDb21waWxlc1R3aWNlID0gcmVxdWlyZSgnLi91dGlsJykuaXRDb21waWxlc1R3aWNlO1xudmFyIGl0Q29tcGlsZXNDaGFuZ2UgPSByZXF1aXJlKCcuL3V0aWwnKS5pdENvbXBpbGVzQ2hhbmdlO1xudmFyIGl0Q29tcGlsZXNIYXJkTW9kdWxlcyA9IHJlcXVpcmUoJy4vdXRpbCcpLml0Q29tcGlsZXNIYXJkTW9kdWxlcztcbnZhciBkZXNjcmliZVdQID0gcmVxdWlyZSgnLi91dGlsJykuZGVzY3JpYmVXUDtcblxuZGVzY3JpYmVXUCgzKSgnYmFzaWMgd2VicGFjayAzIHVzZSAtIGNvbXBpbGVzIGlkZW50aWNhbGx5JywgZnVuY3Rpb24oKSB7XG5cbiAgaXRDb21waWxlc1R3aWNlKCdiYXNlLTFkZXAtcXVlcnknKTtcbiAgaXRDb21waWxlc1R3aWNlKCdiYXNlLTFkZXAtcXVlcnknLCB7ZXhwb3J0U3RhdHM6IHRydWV9KTtcbiAgaXRDb21waWxlc1R3aWNlKCdiYXNlLWRldnRvb2wtbm9zb3VyY2VzLXNvdXJjZS1tYXAnKTtcbiAgaXRDb21waWxlc1R3aWNlKCdiYXNlLWRldnRvb2wtbm9zb3VyY2VzLXNvdXJjZS1tYXAnLCB7ZXhwb3J0U3RhdHM6IHRydWV9KTtcbiAgaXRDb21waWxlc1R3aWNlKCdiYXNlLWVzMjAxNS1tb2R1bGUtZXhwb3J0LXN0YXInKTtcbiAgaXRDb21waWxlc1R3aWNlKCdiYXNlLWVzMjAxNS1tb2R1bGUtZXhwb3J0LXN0YXInLCB7ZXhwb3J0U3RhdHM6IHRydWV9KTtcbiAgaXRDb21waWxlc1R3aWNlKCdiYXNlLWVzMjAxNS1tb2R1bGUtZXhwb3J0LXN0YXItYWx0Jyk7XG4gIGl0Q29tcGlsZXNUd2ljZSgnYmFzZS1lczIwMTUtbW9kdWxlLWV4cG9ydC1zdGFyLWFsdCcsIHtleHBvcnRTdGF0czogdHJ1ZX0pO1xuXG4gIGl0Q29tcGlsZXNIYXJkTW9kdWxlcygnYmFzZS1lczIwMTUtbW9kdWxlLWV4cG9ydC1zdGFyJywgWycuL2V4cG9ydC5qcycsICcuL2ZhYi5qcycsICcuL2ZpYi5qcycsICcuL2luZGV4LmpzJ10pO1xuICBpdENvbXBpbGVzSGFyZE1vZHVsZXMoJ2Jhc2UtZXMyMDE1LW1vZHVsZS1leHBvcnQtc3Rhci1hbHQnLCBbJy4vZXhwb3J0LmpzJywgJy4vZmFiLmpzJywgJy4vZmliLmpzJywgJy4vaW5kZXguanMnXSk7XG5cbn0pO1xuXG5kZXNjcmliZVdQKDMpKCdiYXNpYyB3ZWJwYWNrIDMgdXNlIC0gYnVpbGRzIGNoYW5nZXMnLCBmdW5jdGlvbigpIHtcblxuICBpdENvbXBpbGVzQ2hhbmdlKCdiYXNlLWVzMjAxNS1tb2R1bGUtZXhwb3J0LXN0YXItc29tZScsIHtcbiAgICAnaW5kZXguanMnOiBbXG4gICAgICAnaW1wb3J0IHtmaWJ9IGZyb20gXFwnLi9leHBvcnRcXCc7JyxcbiAgICAgICdleHBvcnQgZGVmYXVsdCBmaWIoMyk7JyxcbiAgICBdLmpvaW4oJ1xcbicpLFxuICB9LCB7XG4gICAgJ2luZGV4LmpzJzogW1xuICAgICAgJ2ltcG9ydCB7ZmFifSBmcm9tIFxcJy4vZXhwb3J0XFwnOycsXG4gICAgICAnZXhwb3J0IGRlZmF1bHQgZmFiKDQpOycsXG4gICAgXS5qb2luKCdcXG4nKSxcbiAgfSwgZnVuY3Rpb24ob3V0cHV0KSB7XG4gICAgZXhwZWN0KGV2YWwob3V0cHV0LnJ1bjFbJ21haW4uanMnXS50b1N0cmluZygpKSkudG8uZXFsKHtkZWZhdWx0OiA1fSk7XG4gICAgZXhwZWN0KGV2YWwob3V0cHV0LnJ1bjJbJ21haW4uanMnXS50b1N0cmluZygpKSkudG8uZXFsKHtkZWZhdWx0OiA2fSk7XG4gICAgLy8gZXhwZWN0KG91dHB1dC5ydW4xWydtYWluLmpzJ10udG9TdHJpbmcoKSkudG8uY29udGFpbignX193ZWJwYWNrX2V4cG9ydHNfX1tcImFcIl0nKTtcbiAgICAvLyBleHBlY3Qob3V0cHV0LnJ1bjJbJ21haW4uanMnXS50b1N0cmluZygpKS50by5jb250YWluKCdcImFcIiAvKiBmYWIgKi8nKTtcbiAgICAvLyBleHBlY3Qob3V0cHV0LnJ1bjJbJ21haW4uanMnXS50b1N0cmluZygpKS50by5jb250YWluKCdfX3dlYnBhY2tfcmVxdWlyZV9fLmQoX193ZWJwYWNrX2V4cG9ydHNfXywgXCJhXCInKTtcbiAgICAvLyBleHBlY3Qob3V0cHV0LnJ1bjJbJ21haW4uanMnXS50b1N0cmluZygpKS50by5jb250YWluKCdfX3dlYnBhY2tfZXhwb3J0c19fW1wiYVwiXScpO1xuICB9KTtcblxufSk7XG4iXSwic291cmNlUm9vdCI6Ii9Vc2Vycy90eWxlcmFyYnVzL2Rldi9wcm92aWRlci9zcmMifQ==

'use strict';

var expect = require('chai').expect;

var itCompilesTwice = require('./util').itCompilesTwice;
var itCompilesChange = require('./util').itCompilesChange;
var describeWP2 = require('./util').describeWP2;

var c = require('./util/features');

describeWP2('plugin webpack 2 use', function () {

  itCompilesTwice.skipIf([c.uglify])('plugin-uglify-babel-devtool-source-map');
  itCompilesTwice.skipIf([c.uglify])('plugin-uglify-babel-devtool-source-map', { exportStats: true });
});

describeWP2('plugin webpack 2 use - builds changes', function () {

  itCompilesChange.skipIf([c.uglify])('plugin-uglify-1dep-es2015', {
    'index.js': ['import {key} from \'./obj\';', 'export default key;'].join('\n')
  }, {
    'index.js': ['import {fib} from \'./obj\';', 'export default fib(3);'].join('\n')
  }, function (output) {
    expect(eval(output.run1['main.js'].toString())).to.eql({ default: 'obj' });
    expect(eval(output.run2['main.js'].toString())).to.eql({ default: 5 });
    // var main1 = output.run1['main.js'].toString();
    // var main2 = output.run2['main.js'].toString();
    // var run1Ids = /var (\w)=(\w)\(\d\)/.exec(main1);
    // var run2Ids = /var (\w)=(\w)\(\d\)/.exec(main2);
    // var run1Module = run1Ids[1];
    // var run1Require = run1Ids[2];
    // var run2Module = run2Ids[1];
    // var run2Require = run2Ids[2];
    // expect(main1).to.contain(run1Module + '.a');
    // expect(main1).to.not.match(new RegExp(
    //   // webpack 2.x
    //   run1Require + '\\.i\\(' + run1Module + '\\.a\\)\\(|' +
    //   // webpack <3.?
    //   run1Module + '\\.a\\(|' +
    //   // webpack 3.?
    //   'Object\\(' + run1Module + '\\.a\\)\\('
    // ));
    // expect(main1).to.not.match(/(\w\.a)=function/);
    // expect(main2).to.match(new RegExp(
    //   // webpack 2.x
    //   run2Require + '\\.i\\(' + run2Module + '\\.a\\)\\(|' +
    //   // webpack <3.?
    //   run2Module + '\\.a\\(|' +
    //   // webpack 3.?
    //   'Object\\(' + run2Module + '\\.a\\)\\('
    // ));
    // expect(main2).to.match(/(\w\.a)=function/);
  });

  itCompilesChange('plugin-hmr-es2015', {
    'index.js': ['import {key} from \'./fib\';', 'export default key;'].join('\n')
  }, {
    'index.js': ['import {fib} from \'./fib\';', 'export default fib(3);'].join('\n')
  }, function (output) {
    var window = {};
    expect(eval(output.run1['main.js'].toString())).to.eql({ default: 'fib' });
    expect(eval(output.run2['main.js'].toString())).to.eql({ default: 4 });
    expect(Object.keys(output.run2).filter(function (key) {
      return (/\.hot-update\.json/.test(key)
      );
    })).to.length.of(1);
  });
});
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImhhcmQtc291cmNlLXdlYnBhY2stcGx1Z2luL3Rlc3RzL3BsdWdpbnMtd2VicGFjay0yLmpzIl0sIm5hbWVzIjpbImV4cGVjdCIsInJlcXVpcmUiLCJpdENvbXBpbGVzVHdpY2UiLCJpdENvbXBpbGVzQ2hhbmdlIiwiZGVzY3JpYmVXUDIiLCJjIiwic2tpcElmIiwidWdsaWZ5IiwiZXhwb3J0U3RhdHMiLCJqb2luIiwib3V0cHV0IiwiZXZhbCIsInJ1bjEiLCJ0b1N0cmluZyIsInRvIiwiZXFsIiwiZGVmYXVsdCIsInJ1bjIiLCJ3aW5kb3ciLCJPYmplY3QiLCJrZXlzIiwiZmlsdGVyIiwia2V5IiwidGVzdCIsImxlbmd0aCIsIm9mIl0sIm1hcHBpbmdzIjoiOztBQUFBLElBQUlBLFNBQVNDLFFBQVEsTUFBUixFQUFnQkQsTUFBN0I7O0FBRUEsSUFBSUUsa0JBQWtCRCxrQkFBa0JDLGVBQXhDO0FBQ0EsSUFBSUMsbUJBQW1CRixrQkFBa0JFLGdCQUF6QztBQUNBLElBQUlDLGNBQWNILGtCQUFrQkcsV0FBcEM7O0FBRUEsSUFBSUMsSUFBSUosMEJBQVI7O0FBRUFHLFlBQVksc0JBQVosRUFBb0MsWUFBVzs7QUFFN0NGLGtCQUFnQkksTUFBaEIsQ0FBdUIsQ0FBQ0QsRUFBRUUsTUFBSCxDQUF2QixFQUFtQyx3Q0FBbkM7QUFDQUwsa0JBQWdCSSxNQUFoQixDQUF1QixDQUFDRCxFQUFFRSxNQUFILENBQXZCLEVBQW1DLHdDQUFuQyxFQUE2RSxFQUFDQyxhQUFhLElBQWQsRUFBN0U7QUFFRCxDQUxEOztBQU9BSixZQUFZLHVDQUFaLEVBQXFELFlBQVc7O0FBRTlERCxtQkFBaUJHLE1BQWpCLENBQXdCLENBQUNELEVBQUVFLE1BQUgsQ0FBeEIsRUFBb0MsMkJBQXBDLEVBQWlFO0FBQy9ELGdCQUFZLENBQ1YsOEJBRFUsRUFFVixxQkFGVSxFQUdWRSxJQUhVLENBR0wsSUFISztBQURtRCxHQUFqRSxFQUtHO0FBQ0QsZ0JBQVksQ0FDViw4QkFEVSxFQUVWLHdCQUZVLEVBR1ZBLElBSFUsQ0FHTCxJQUhLO0FBRFgsR0FMSCxFQVVHLFVBQVNDLE1BQVQsRUFBaUI7QUFDbEJWLFdBQU9XLEtBQUtELE9BQU9FLElBQVAsQ0FBWSxTQUFaLEVBQXVCQyxRQUF2QixFQUFMLENBQVAsRUFBZ0RDLEVBQWhELENBQW1EQyxHQUFuRCxDQUF1RCxFQUFDQyxTQUFTLEtBQVYsRUFBdkQ7QUFDQWhCLFdBQU9XLEtBQUtELE9BQU9PLElBQVAsQ0FBWSxTQUFaLEVBQXVCSixRQUF2QixFQUFMLENBQVAsRUFBZ0RDLEVBQWhELENBQW1EQyxHQUFuRCxDQUF1RCxFQUFDQyxTQUFTLENBQVYsRUFBdkQ7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDRCxHQXhDRDs7QUEwQ0FiLG1CQUFpQixtQkFBakIsRUFBc0M7QUFDcEMsZ0JBQVksQ0FDViw4QkFEVSxFQUVWLHFCQUZVLEVBR1ZNLElBSFUsQ0FHTCxJQUhLO0FBRHdCLEdBQXRDLEVBS0c7QUFDRCxnQkFBWSxDQUNWLDhCQURVLEVBRVYsd0JBRlUsRUFHVkEsSUFIVSxDQUdMLElBSEs7QUFEWCxHQUxILEVBVUcsVUFBU0MsTUFBVCxFQUFpQjtBQUNsQixRQUFJUSxTQUFTLEVBQWI7QUFDQWxCLFdBQU9XLEtBQUtELE9BQU9FLElBQVAsQ0FBWSxTQUFaLEVBQXVCQyxRQUF2QixFQUFMLENBQVAsRUFBZ0RDLEVBQWhELENBQW1EQyxHQUFuRCxDQUF1RCxFQUFDQyxTQUFTLEtBQVYsRUFBdkQ7QUFDQWhCLFdBQU9XLEtBQUtELE9BQU9PLElBQVAsQ0FBWSxTQUFaLEVBQXVCSixRQUF2QixFQUFMLENBQVAsRUFBZ0RDLEVBQWhELENBQW1EQyxHQUFuRCxDQUF1RCxFQUFDQyxTQUFTLENBQVYsRUFBdkQ7QUFDQWhCLFdBQU9tQixPQUFPQyxJQUFQLENBQVlWLE9BQU9PLElBQW5CLEVBQXlCSSxNQUF6QixDQUFnQyxVQUFTQyxHQUFULEVBQWM7QUFDbkQsYUFBTyxzQkFBcUJDLElBQXJCLENBQTBCRCxHQUExQjtBQUFQO0FBQ0QsS0FGTSxDQUFQLEVBRUlSLEVBRkosQ0FFT1UsTUFGUCxDQUVjQyxFQUZkLENBRWlCLENBRmpCO0FBR0QsR0FqQkQ7QUFtQkQsQ0EvREQiLCJmaWxlIjoiaGFyZC1zb3VyY2Utd2VicGFjay1wbHVnaW4vdGVzdHMvcGx1Z2lucy13ZWJwYWNrLTIuanMiLCJzb3VyY2VzQ29udGVudCI6WyJ2YXIgZXhwZWN0ID0gcmVxdWlyZSgnY2hhaScpLmV4cGVjdDtcblxudmFyIGl0Q29tcGlsZXNUd2ljZSA9IHJlcXVpcmUoJy4vdXRpbCcpLml0Q29tcGlsZXNUd2ljZTtcbnZhciBpdENvbXBpbGVzQ2hhbmdlID0gcmVxdWlyZSgnLi91dGlsJykuaXRDb21waWxlc0NoYW5nZTtcbnZhciBkZXNjcmliZVdQMiA9IHJlcXVpcmUoJy4vdXRpbCcpLmRlc2NyaWJlV1AyO1xuXG52YXIgYyA9IHJlcXVpcmUoJy4vdXRpbC9mZWF0dXJlcycpO1xuXG5kZXNjcmliZVdQMigncGx1Z2luIHdlYnBhY2sgMiB1c2UnLCBmdW5jdGlvbigpIHtcblxuICBpdENvbXBpbGVzVHdpY2Uuc2tpcElmKFtjLnVnbGlmeV0pKCdwbHVnaW4tdWdsaWZ5LWJhYmVsLWRldnRvb2wtc291cmNlLW1hcCcpO1xuICBpdENvbXBpbGVzVHdpY2Uuc2tpcElmKFtjLnVnbGlmeV0pKCdwbHVnaW4tdWdsaWZ5LWJhYmVsLWRldnRvb2wtc291cmNlLW1hcCcsIHtleHBvcnRTdGF0czogdHJ1ZX0pO1xuXG59KTtcblxuZGVzY3JpYmVXUDIoJ3BsdWdpbiB3ZWJwYWNrIDIgdXNlIC0gYnVpbGRzIGNoYW5nZXMnLCBmdW5jdGlvbigpIHtcblxuICBpdENvbXBpbGVzQ2hhbmdlLnNraXBJZihbYy51Z2xpZnldKSgncGx1Z2luLXVnbGlmeS0xZGVwLWVzMjAxNScsIHtcbiAgICAnaW5kZXguanMnOiBbXG4gICAgICAnaW1wb3J0IHtrZXl9IGZyb20gXFwnLi9vYmpcXCc7JyxcbiAgICAgICdleHBvcnQgZGVmYXVsdCBrZXk7JyxcbiAgICBdLmpvaW4oJ1xcbicpLFxuICB9LCB7XG4gICAgJ2luZGV4LmpzJzogW1xuICAgICAgJ2ltcG9ydCB7ZmlifSBmcm9tIFxcJy4vb2JqXFwnOycsXG4gICAgICAnZXhwb3J0IGRlZmF1bHQgZmliKDMpOycsXG4gICAgXS5qb2luKCdcXG4nKSxcbiAgfSwgZnVuY3Rpb24ob3V0cHV0KSB7XG4gICAgZXhwZWN0KGV2YWwob3V0cHV0LnJ1bjFbJ21haW4uanMnXS50b1N0cmluZygpKSkudG8uZXFsKHtkZWZhdWx0OiAnb2JqJ30pO1xuICAgIGV4cGVjdChldmFsKG91dHB1dC5ydW4yWydtYWluLmpzJ10udG9TdHJpbmcoKSkpLnRvLmVxbCh7ZGVmYXVsdDogNX0pO1xuICAgIC8vIHZhciBtYWluMSA9IG91dHB1dC5ydW4xWydtYWluLmpzJ10udG9TdHJpbmcoKTtcbiAgICAvLyB2YXIgbWFpbjIgPSBvdXRwdXQucnVuMlsnbWFpbi5qcyddLnRvU3RyaW5nKCk7XG4gICAgLy8gdmFyIHJ1bjFJZHMgPSAvdmFyIChcXHcpPShcXHcpXFwoXFxkXFwpLy5leGVjKG1haW4xKTtcbiAgICAvLyB2YXIgcnVuMklkcyA9IC92YXIgKFxcdyk9KFxcdylcXChcXGRcXCkvLmV4ZWMobWFpbjIpO1xuICAgIC8vIHZhciBydW4xTW9kdWxlID0gcnVuMUlkc1sxXTtcbiAgICAvLyB2YXIgcnVuMVJlcXVpcmUgPSBydW4xSWRzWzJdO1xuICAgIC8vIHZhciBydW4yTW9kdWxlID0gcnVuMklkc1sxXTtcbiAgICAvLyB2YXIgcnVuMlJlcXVpcmUgPSBydW4ySWRzWzJdO1xuICAgIC8vIGV4cGVjdChtYWluMSkudG8uY29udGFpbihydW4xTW9kdWxlICsgJy5hJyk7XG4gICAgLy8gZXhwZWN0KG1haW4xKS50by5ub3QubWF0Y2gobmV3IFJlZ0V4cChcbiAgICAvLyAgIC8vIHdlYnBhY2sgMi54XG4gICAgLy8gICBydW4xUmVxdWlyZSArICdcXFxcLmlcXFxcKCcgKyBydW4xTW9kdWxlICsgJ1xcXFwuYVxcXFwpXFxcXCh8JyArXG4gICAgLy8gICAvLyB3ZWJwYWNrIDwzLj9cbiAgICAvLyAgIHJ1bjFNb2R1bGUgKyAnXFxcXC5hXFxcXCh8JyArXG4gICAgLy8gICAvLyB3ZWJwYWNrIDMuP1xuICAgIC8vICAgJ09iamVjdFxcXFwoJyArIHJ1bjFNb2R1bGUgKyAnXFxcXC5hXFxcXClcXFxcKCdcbiAgICAvLyApKTtcbiAgICAvLyBleHBlY3QobWFpbjEpLnRvLm5vdC5tYXRjaCgvKFxcd1xcLmEpPWZ1bmN0aW9uLyk7XG4gICAgLy8gZXhwZWN0KG1haW4yKS50by5tYXRjaChuZXcgUmVnRXhwKFxuICAgIC8vICAgLy8gd2VicGFjayAyLnhcbiAgICAvLyAgIHJ1bjJSZXF1aXJlICsgJ1xcXFwuaVxcXFwoJyArIHJ1bjJNb2R1bGUgKyAnXFxcXC5hXFxcXClcXFxcKHwnICtcbiAgICAvLyAgIC8vIHdlYnBhY2sgPDMuP1xuICAgIC8vICAgcnVuMk1vZHVsZSArICdcXFxcLmFcXFxcKHwnICtcbiAgICAvLyAgIC8vIHdlYnBhY2sgMy4/XG4gICAgLy8gICAnT2JqZWN0XFxcXCgnICsgcnVuMk1vZHVsZSArICdcXFxcLmFcXFxcKVxcXFwoJ1xuICAgIC8vICkpO1xuICAgIC8vIGV4cGVjdChtYWluMikudG8ubWF0Y2goLyhcXHdcXC5hKT1mdW5jdGlvbi8pO1xuICB9KTtcblxuICBpdENvbXBpbGVzQ2hhbmdlKCdwbHVnaW4taG1yLWVzMjAxNScsIHtcbiAgICAnaW5kZXguanMnOiBbXG4gICAgICAnaW1wb3J0IHtrZXl9IGZyb20gXFwnLi9maWJcXCc7JyxcbiAgICAgICdleHBvcnQgZGVmYXVsdCBrZXk7JyxcbiAgICBdLmpvaW4oJ1xcbicpLFxuICB9LCB7XG4gICAgJ2luZGV4LmpzJzogW1xuICAgICAgJ2ltcG9ydCB7ZmlifSBmcm9tIFxcJy4vZmliXFwnOycsXG4gICAgICAnZXhwb3J0IGRlZmF1bHQgZmliKDMpOycsXG4gICAgXS5qb2luKCdcXG4nKSxcbiAgfSwgZnVuY3Rpb24ob3V0cHV0KSB7XG4gICAgdmFyIHdpbmRvdyA9IHt9O1xuICAgIGV4cGVjdChldmFsKG91dHB1dC5ydW4xWydtYWluLmpzJ10udG9TdHJpbmcoKSkpLnRvLmVxbCh7ZGVmYXVsdDogJ2ZpYid9KTtcbiAgICBleHBlY3QoZXZhbChvdXRwdXQucnVuMlsnbWFpbi5qcyddLnRvU3RyaW5nKCkpKS50by5lcWwoe2RlZmF1bHQ6IDR9KTtcbiAgICBleHBlY3QoT2JqZWN0LmtleXMob3V0cHV0LnJ1bjIpLmZpbHRlcihmdW5jdGlvbihrZXkpIHtcbiAgICAgIHJldHVybiAvXFwuaG90LXVwZGF0ZVxcLmpzb24vLnRlc3Qoa2V5KTtcbiAgICB9KSkudG8ubGVuZ3RoLm9mKDEpO1xuICB9KTtcblxufSk7XG4iXSwic291cmNlUm9vdCI6Ii9Vc2Vycy90eWxlcmFyYnVzL2Rldi9wcm92aWRlci9zcmMifQ==

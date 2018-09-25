'use strict';

var expect = require('chai').expect;

var describeWP = require('./util').describeWP;
var itCompilesTwice = require('./util').itCompilesTwice;
var itCompilesHardModules = require('./util').itCompilesHardModules;
var itCompilesChange = require('./util').itCompilesChange;
var writeFiles = require('./util').writeFiles;
var compile = require('./util').compile;
var clean = require('./util').clean;

var c = require('./util/features');

describeWP(4)('plugin webpack 4 use', function () {

  itCompilesTwice('plugin-side-effect');
  itCompilesTwice('plugin-side-effect', { exportStats: true });
  itCompilesTwice('plugin-side-effect-settings');
  itCompilesTwice('plugin-side-effect-settings', { exportStats: true });

  itCompilesTwice.skipIf([c.miniCss])('plugin-mini-css-extract');
  itCompilesTwice.skipIf([c.miniCss])('plugin-mini-css-extract', { exportStats: true });
  // itCompilesHardModules.skipIf([c.miniCss])('plugin-mini-css-extract', ['./index.css']);

  itCompilesTwice.skipIf([c.miniCss])('plugin-mini-css-extract-file');
  itCompilesTwice.skipIf([c.miniCss])('plugin-mini-css-extract-file', { exportStats: true });
});

describeWP(4)('plugin webpack 4 use - builds change', function () {

  itCompilesChange('plugin-mini-css-extract-change', {
    'index.css': ['.hello {', '  color: blue;', '}'].join('\n')
  }, {
    'index.css': ['.hello {', '  color: red;', '}'].join('\n')
  }, function (output) {
    expect(output.run1['main.css'].toString()).to.match(/blue/);
    expect(output.run2['main.css'].toString()).to.match(/red/);
  });

  itCompilesChange('plugin-side-effect-change', {
    'index.js': ['import {fib} from \'./obj\';', '', 'console.log(fib(3));'].join('\n')
  }, {
    'index.js': ['import {fab} from \'./obj\';', '', 'console.log(fab(3));'].join('\n')
  }, function (output) {
    expect(output.run1['main.js'].toString()).to.match(/fib/);
    expect(output.run1['main.js'].toString()).to.not.match(/fab/);
    expect(output.run2['main.js'].toString()).to.match(/fab/);
    expect(output.run2['main.js'].toString()).to.not.match(/fib/);
  });
});

describeWP(4)('plugin webpack 4 use - watch mode', function () {

  it('plugin-mini-css-extract-watch: #339', function () {
    this.timeout(60000);

    return clean('plugin-mini-css-extract-watch').then(function () {
      return writeFiles('plugin-mini-css-extract-watch', {
        'index.css': ['.hello {', '  color: blue;', '}'].join('\n')
      });
    }).then(function () {
      return compile('plugin-mini-css-extract-watch', {
        watch: 'start'
      });
    }).then(function (result) {
      return writeFiles('plugin-mini-css-extract-watch', {
        'index.css': ['.hello {', '  color: red;', '}'].join('\n')
      }).then(function () {
        return compile('plugin-mini-css-extract-watch', {
          watching: result.watching,
          watch: 'continue'
        });
      }).then(function (result) {
        return compile('plugin-mini-css-extract-watch', {
          watching: result.watching,
          watch: 'stop'
        });
      }).then(function () {
        return result;
      });
    }).then(function (result) {
      return compile('plugin-mini-css-extract-watch').then(function (result2) {
        return {
          result,
          result2
        };
      });
    }).then(function (results) {
      expect(results.result2['main.css'].toString()).to.not.equal(results.result.out['main.css'].toString());
    });
  });
});
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImhhcmQtc291cmNlLXdlYnBhY2stcGx1Z2luL3Rlc3RzL3BsdWdpbnMtd2VicGFjay00LmpzIl0sIm5hbWVzIjpbImV4cGVjdCIsInJlcXVpcmUiLCJkZXNjcmliZVdQIiwiaXRDb21waWxlc1R3aWNlIiwiaXRDb21waWxlc0hhcmRNb2R1bGVzIiwiaXRDb21waWxlc0NoYW5nZSIsIndyaXRlRmlsZXMiLCJjb21waWxlIiwiY2xlYW4iLCJjIiwiZXhwb3J0U3RhdHMiLCJza2lwSWYiLCJtaW5pQ3NzIiwiam9pbiIsIm91dHB1dCIsInJ1bjEiLCJ0b1N0cmluZyIsInRvIiwibWF0Y2giLCJydW4yIiwibm90IiwiaXQiLCJ0aW1lb3V0IiwidGhlbiIsIndhdGNoIiwicmVzdWx0Iiwid2F0Y2hpbmciLCJyZXN1bHQyIiwicmVzdWx0cyIsImVxdWFsIiwib3V0Il0sIm1hcHBpbmdzIjoiOztBQUFBLElBQUlBLFNBQVNDLFFBQVEsTUFBUixFQUFnQkQsTUFBN0I7O0FBRUEsSUFBSUUsYUFBYUQsa0JBQWtCQyxVQUFuQztBQUNBLElBQUlDLGtCQUFrQkYsa0JBQWtCRSxlQUF4QztBQUNBLElBQUlDLHdCQUF3Qkgsa0JBQWtCRyxxQkFBOUM7QUFDQSxJQUFJQyxtQkFBbUJKLGtCQUFrQkksZ0JBQXpDO0FBQ0EsSUFBSUMsYUFBYUwsa0JBQWtCSyxVQUFuQztBQUNBLElBQUlDLFVBQVVOLGtCQUFrQk0sT0FBaEM7QUFDQSxJQUFJQyxRQUFRUCxrQkFBa0JPLEtBQTlCOztBQUVBLElBQUlDLElBQUlSLDBCQUFSOztBQUVBQyxXQUFXLENBQVgsRUFBYyxzQkFBZCxFQUFzQyxZQUFXOztBQUUvQ0Msa0JBQWdCLG9CQUFoQjtBQUNBQSxrQkFBZ0Isb0JBQWhCLEVBQXNDLEVBQUNPLGFBQWEsSUFBZCxFQUF0QztBQUNBUCxrQkFBZ0IsNkJBQWhCO0FBQ0FBLGtCQUFnQiw2QkFBaEIsRUFBK0MsRUFBQ08sYUFBYSxJQUFkLEVBQS9DOztBQUVBUCxrQkFBZ0JRLE1BQWhCLENB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QUhXLEVBSVhPLElBSlcsQ0FJTixJQUpNO0FBRG9DLE9BQTVDLEVBT05VLElBUE0sQ0FPRCxZQUFXO0FBQ2YsZUFBT2hCLFFBQVEsK0JBQVIsRUFBeUM7QUFDOUNtQixvQkFBVUQsT0FBT0MsUUFENkI7QUFFOUNGLGlCQUFPO0FBRnVDLFNBQXpDLENBQVA7QUFJRCxPQVpNLEVBYU5ELElBYk0sQ0FhRCxVQUFTRSxNQUFULEVBQWlCO0FBQ3JCLGVBQU9sQixRQUFRLCtCQUFSLEVBQXlDO0FBQzlDbUIsb0JBQVVELE9BQU9DLFFBRDZCO0FBRTlDRixpQkFBTztBQUZ1QyxTQUF6QyxDQUFQO0FBSUQsT0FsQk0sRUFtQk5ELElBbkJNLENBbUJELFlBQVc7QUFBQyxlQUFPRSxNQUFQO0FBQWUsT0FuQjFCLENBQVA7QUFvQkQsS0FwQ00sRUFxQ05GLElBckNNLENBcUNELFVBQVNFLE1BQVQsRUFBaUI7QUFDckIsYUFBT2xCLFFBQVEsK0JBQVIsRUFDTmdCLElBRE0sQ0FDRCxVQUFTSSxPQUFULEVBQWtCO0FBQ3RCLGVBQU87QUFDTEYsZ0JBREs7QUFFTEU7QUFGSyxTQUFQO0FBSUQsT0FOTSxDQUFQO0FBT0QsS0E3Q00sRUE4Q05KLElBOUNNLENBOENELFVBQVNLLE9BQVQsRUFBa0I7QUFDdEI1QixhQUFPNEIsUUFBUUQsT0FBUixDQUFnQixVQUFoQixFQUE0QlgsUUFBNUIsRUFBUCxFQUNHQyxFQURILENBQ01HLEdBRE4sQ0FDVVMsS0FEVixDQUNnQkQsUUFBUUgsTUFBUixDQUFlSyxHQUFmLENBQW1CLFVBQW5CLEVBQStCZCxRQUEvQixFQURoQjtBQUVELEtBakRNLENBQVA7QUFrREQsR0FyREQ7QUF1REQsQ0F6REQiLCJmaWxlIjoiaGFyZC1zb3VyY2Utd2VicGFjay1wbHVnaW4vdGVzdHMvcGx1Z2lucy13ZWJwYWNrLTQuanMiLCJzb3VyY2VzQ29udGVudCI6WyJ2YXIgZXhwZWN0ID0gcmVxdWlyZSgnY2hhaScpLmV4cGVjdDtcblxudmFyIGRlc2NyaWJlV1AgPSByZXF1aXJlKCcuL3V0aWwnKS5kZXNjcmliZVdQO1xudmFyIGl0Q29tcGlsZXNUd2ljZSA9IHJlcXVpcmUoJy4vdXRpbCcpLml0Q29tcGlsZXNUd2ljZTtcbnZhciBpdENvbXBpbGVzSGFyZE1vZHVsZXMgPSByZXF1aXJlKCcuL3V0aWwnKS5pdENvbXBpbGVzSGFyZE1vZHVsZXM7XG52YXIgaXRDb21waWxlc0NoYW5nZSA9IHJlcXVpcmUoJy4vdXRpbCcpLml0Q29tcGlsZXNDaGFuZ2U7XG52YXIgd3JpdGVGaWxlcyA9IHJlcXVpcmUoJy4vdXRpbCcpLndyaXRlRmlsZXM7XG52YXIgY29tcGlsZSA9IHJlcXVpcmUoJy4vdXRpbCcpLmNvbXBpbGU7XG52YXIgY2xlYW4gPSByZXF1aXJlKCcuL3V0aWwnKS5jbGVhbjtcblxudmFyIGMgPSByZXF1aXJlKCcuL3V0aWwvZmVhdHVyZXMnKTtcblxuZGVzY3JpYmVXUCg0KSgncGx1Z2luIHdlYnBhY2sgNCB1c2UnLCBmdW5jdGlvbigpIHtcblxuICBpdENvbXBpbGVzVHdpY2UoJ3BsdWdpbi1zaWRlLWVmZmVjdCcpO1xuICBpdENvbXBpbGVzVHdpY2UoJ3BsdWdpbi1zaWRlLWVmZmVjdCcsIHtleHBvcnRTdGF0czogdHJ1ZX0pO1xuICBpdENvbXBpbGVzVHdpY2UoJ3BsdWdpbi1zaWRlLWVmZmVjdC1zZXR0aW5ncycpO1xuICBpdENvbXBpbGVzVHdpY2UoJ3BsdWdpbi1zaWRlLWVmZmVjdC1zZXR0aW5ncycsIHtleHBvcnRTdGF0czogdHJ1ZX0pO1xuXG4gIGl0Q29tcGlsZXNUd2ljZS5za2lwSWYoW2MubWluaUNzc10pKCdwbHVnaW4tbWluaS1jc3MtZXh0cmFjdCcpO1xuICBpdENvbXBpbGVzVHdpY2Uuc2tpcElmKFtjLm1pbmlDc3NdKSgncGx1Z2luLW1pbmktY3NzLWV4dHJhY3QnLCB7ZXhwb3J0U3RhdHM6IHRydWV9KTtcbiAgLy8gaXRDb21waWxlc0hhcmRNb2R1bGVzLnNraXBJZihbYy5taW5pQ3NzXSkoJ3BsdWdpbi1taW5pLWNzcy1leHRyYWN0JywgWycuL2luZGV4LmNzcyddKTtcblxuICBpdENvbXBpbGVzVHdpY2Uuc2tpcElmKFtjLm1pbmlDc3NdKSgncGx1Z2luLW1pbmktY3NzLWV4dHJhY3QtZmlsZScpO1xuICBpdENvbXBpbGVzVHdpY2Uuc2tpcElmKFtjLm1pbmlDc3NdKSgncGx1Z2luLW1pbmktY3NzLWV4dHJhY3QtZmlsZScsIHtleHBvcnRTdGF0czogdHJ1ZX0pO1xuXG59KTtcblxuZGVzY3JpYmVXUCg0KSgncGx1Z2luIHdlYnBhY2sgNCB1c2UgLSBidWlsZHMgY2hhbmdlJywgZnVuY3Rpb24oKSB7XG5cbiAgaXRDb21waWxlc0NoYW5nZSgncGx1Z2luLW1pbmktY3NzLWV4dHJhY3QtY2hhbmdlJywge1xuICAgICdpbmRleC5jc3MnOiBbXG4gICAgICAnLmhlbGxvIHsnLFxuICAgICAgJyAgY29sb3I6IGJsdWU7JyxcbiAgICAgICd9JyxcbiAgICBdLmpvaW4oJ1xcbicpLFxuICB9LCB7XG4gICAgJ2luZGV4LmNzcyc6IFtcbiAgICAgICcuaGVsbG8geycsXG4gICAgICAnICBjb2xvcjogcmVkOycsXG4gICAgICAnfScsXG4gICAgXS5qb2luKCdcXG4nKSxcbiAgfSwgZnVuY3Rpb24ob3V0cHV0KSB7XG4gICAgZXhwZWN0KG91dHB1dC5ydW4xWydtYWluLmNzcyddLnRvU3RyaW5nKCkpLnRvLm1hdGNoKC9ibHVlLyk7XG4gICAgZXhwZWN0KG91dHB1dC5ydW4yWydtYWluLmNzcyddLnRvU3RyaW5nKCkpLnRvLm1hdGNoKC9yZWQvKTtcbiAgfSk7XG5cbiAgaXRDb21waWxlc0NoYW5nZSgncGx1Z2luLXNpZGUtZWZmZWN0LWNoYW5nZScsIHtcbiAgICAnaW5kZXguanMnOiBbXG4gICAgICAnaW1wb3J0IHtmaWJ9IGZyb20gXFwnLi9vYmpcXCc7JyxcbiAgICAgICcnLFxuICAgICAgJ2NvbnNvbGUubG9nKGZpYigzKSk7JyxcbiAgICBdLmpvaW4oJ1xcbicpLFxuICB9LCB7XG4gICAgJ2luZGV4LmpzJzogW1xuICAgICAgJ2ltcG9ydCB7ZmFifSBmcm9tIFxcJy4vb2JqXFwnOycsXG4gICAgICAnJyxcbiAgICAgICdjb25zb2xlLmxvZyhmYWIoMykpOycsXG4gICAgXS5qb2luKCdcXG4nKSxcbiAgfSwgZnVuY3Rpb24ob3V0cHV0KSB7XG4gICAgZXhwZWN0KG91dHB1dC5ydW4xWydtYWluLmpzJ10udG9TdHJpbmcoKSkudG8ubWF0Y2goL2ZpYi8pO1xuICAgIGV4cGVjdChvdXRwdXQucnVuMVsnbWFpbi5qcyddLnRvU3RyaW5nKCkpLnRvLm5vdC5tYXRjaCgvZmFiLyk7XG4gICAgZXhwZWN0KG91dHB1dC5ydW4yWydtYWluLmpzJ10udG9TdHJpbmcoKSkudG8ubWF0Y2goL2ZhYi8pO1xuICAgIGV4cGVjdChvdXRwdXQucnVuMlsnbWFpbi5qcyddLnRvU3RyaW5nKCkpLnRvLm5vdC5tYXRjaCgvZmliLyk7XG4gIH0pO1xuXG59KTtcblxuZGVzY3JpYmVXUCg0KSgncGx1Z2luIHdlYnBhY2sgNCB1c2UgLSB3YXRjaCBtb2RlJywgZnVuY3Rpb24oKSB7XG5cbiAgaXQoJ3BsdWdpbi1taW5pLWNzcy1leHRyYWN0LXdhdGNoOiAjMzM5JywgZnVuY3Rpb24oKSB7XG4gICAgdGhpcy50aW1lb3V0KDYwMDAwKTtcblxuICAgIHJldHVybiBjbGVhbigncGx1Z2luLW1pbmktY3NzLWV4dHJhY3Qtd2F0Y2gnKVxuICAgIC50aGVuKGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHdyaXRlRmlsZXMoJ3BsdWdpbi1taW5pLWNzcy1leHRyYWN0LXdhdGNoJywge1xuICAgICAgICAnaW5kZXguY3NzJzogW1xuICAgICAgICAgICcuaGVsbG8geycsXG4gICAgICAgICAgJyAgY29sb3I6IGJsdWU7JyxcbiAgICAgICAgICAnfScsXG4gICAgICAgIF0uam9pbignXFxuJyksXG4gICAgICB9KTtcbiAgICB9KVxuICAgIC50aGVuKGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIGNvbXBpbGUoJ3BsdWdpbi1taW5pLWNzcy1leHRyYWN0LXdhdGNoJywge1xuICAgICAgICB3YXRjaDogJ3N0YXJ0JyxcbiAgICAgIH0pO1xuICAgIH0pXG4gICAgLnRoZW4oZnVuY3Rpb24ocmVzdWx0KSB7XG4gICAgICByZXR1cm4gd3JpdGVGaWxlcygncGx1Z2luLW1pbmktY3NzLWV4dHJhY3Qtd2F0Y2gnLCB7XG4gICAgICAgICdpbmRleC5jc3MnOiBbXG4gICAgICAgICAgJy5oZWxsbyB7JyxcbiAgICAgICAgICAnICBjb2xvcjogcmVkOycsXG4gICAgICAgICAgJ30nLFxuICAgICAgICBdLmpvaW4oJ1xcbicpLFxuICAgICAgfSlcbiAgICAgIC50aGVuKGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gY29tcGlsZSgncGx1Z2luLW1pbmktY3NzLWV4dHJhY3Qtd2F0Y2gnLCB7XG4gICAgICAgICAgd2F0Y2hpbmc6IHJlc3VsdC53YXRjaGluZyxcbiAgICAgICAgICB3YXRjaDogJ2NvbnRpbnVlJyxcbiAgICAgICAgfSk7XG4gICAgICB9KVxuICAgICAgLnRoZW4oZnVuY3Rpb24ocmVzdWx0KSB7XG4gICAgICAgIHJldHVybiBjb21waWxlKCdwbHVnaW4tbWluaS1jc3MtZXh0cmFjdC13YXRjaCcsIHtcbiAgICAgICAgICB3YXRjaGluZzogcmVzdWx0LndhdGNoaW5nLFxuICAgICAgICAgIHdhdGNoOiAnc3RvcCcsXG4gICAgICAgIH0pO1xuICAgICAgfSlcbiAgICAgIC50aGVuKGZ1bmN0aW9uKCkge3JldHVybiByZXN1bHQ7fSk7XG4gICAgfSlcbiAgICAudGhlbihmdW5jdGlvbihyZXN1bHQpIHtcbiAgICAgIHJldHVybiBjb21waWxlKCdwbHVnaW4tbWluaS1jc3MtZXh0cmFjdC13YXRjaCcpXG4gICAgICAudGhlbihmdW5jdGlvbihyZXN1bHQyKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgcmVzdWx0LFxuICAgICAgICAgIHJlc3VsdDIsXG4gICAgICAgIH07XG4gICAgICB9KTtcbiAgICB9KVxuICAgIC50aGVuKGZ1bmN0aW9uKHJlc3VsdHMpIHtcbiAgICAgIGV4cGVjdChyZXN1bHRzLnJlc3VsdDJbJ21haW4uY3NzJ10udG9TdHJpbmcoKSlcbiAgICAgICAgLnRvLm5vdC5lcXVhbChyZXN1bHRzLnJlc3VsdC5vdXRbJ21haW4uY3NzJ10udG9TdHJpbmcoKSk7XG4gICAgfSk7XG4gIH0pO1xuXG59KTtcbiJdLCJzb3VyY2VSb290IjoiL1VzZXJzL3R5bGVyYXJidXMvZGV2L3Byb3ZpZGVyL3NyYyJ9

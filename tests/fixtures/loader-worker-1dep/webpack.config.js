'use strict';

var pluginCompat = require('../../../lib/util/plugin-compat');
var HardSourceWebpackPlugin = require('../../..');

module.exports = {
  context: __dirname,
  entry: './index.js',
  output: {
    path: __dirname + '/tmp',
    filename: 'main.js'
  },
  plugins: [new HardSourceWebpackPlugin({
    cacheDirectory: 'cache',
    environmentHash: {
      root: __dirname + '/../../..'
    }
  }), {
    apply(compiler) {
      pluginCompat.tap(compiler, 'hardSourceLog', 'loader-worker-1dep test', info => {
        if (info.level !== 'log') {
          throw new Error('loader-worker-1dep fixture should not produce logs');
        }
      });
    }
  }]
};
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImhhcmQtc291cmNlLXdlYnBhY2stcGx1Z2luL3Rlc3RzL2ZpeHR1cmVzL2xvYWRlci13b3JrZXItMWRlcC93ZWJwYWNrLmNvbmZpZy5qcyJdLCJuYW1lcyI6WyJwbHVnaW5Db21wYXQiLCJyZXF1aXJlIiwiSGFyZFNvdXJjZVdlYnBhY2tQbHVnaW4iLCJtb2R1bGUiLCJleHBvcnRzIiwiY29udGV4dCIsIl9fZGlybmFtZSIsImVudHJ5Iiwib3V0cHV0IiwicGF0aCIsImZpbGVuYW1lIiwicGx1Z2lucyIsImNhY2hlRGlyZWN0b3J5IiwiZW52aXJvbm1lbnRIYXNoIiwicm9vdCIsImFwcGx5IiwiY29tcGlsZXIiLCJ0YXAiLCJpbmZvIiwibGV2ZWwiLCJFcnJvciJdLCJtYXBwaW5ncyI6Ijs7QUFBQSxJQUFJQSxlQUFlQywwQ0FBbkI7QUFDQSxJQUFJQywwQkFBMEJELG1CQUE5Qjs7QUFFQUUsT0FBT0MsT0FBUCxHQUFpQjtBQUNmQyxXQUFTQyxTQURNO0FBRWZDLFNBQU8sWUFGUTtBQUdmQyxVQUFRO0FBQ05DLFVBQU1ILFlBQVksTUFEWjtBQUVOSSxjQUFVO0FBRkosR0FITztBQU9mQyxXQUFTLENBQ1AsSUFBSVQsdUJBQUosQ0FBNEI7QUFDMUJVLG9CQUFnQixPQURVO0FBRTFCQyxxQkFBaUI7QUFDZkMsWUFBTVIsWUFBWTtBQURIO0FBRlMsR0FBNUIsQ0FETyxFQU9QO0FBQ0VTLFVBQU1DLFFBQU4sRUFBZ0I7QUFDZGhCLG1CQUFhaUIsR0FBYixDQUFpQkQsUUFBakIsRUFBMkIsZUFBM0IsRUFBNEMseUJBQTVDLEVBQXVFRSxRQUFRO0FBQzdFLFlBQUlBLEtBQUtDLEtBQUwsS0FBZSxLQUFuQixFQUEwQjtBQUN4QixnQkFBTSxJQUFJQyxLQUFKLENBQVUsb0RBQVYsQ0FBTjtBQUNEO0FBQ0YsT0FKRDtBQUtEO0FBUEgsR0FQTztBQVBNLENBQWpCIiwiZmlsZSI6ImhhcmQtc291cmNlLXdlYnBhY2stcGx1Z2luL3Rlc3RzL2ZpeHR1cmVzL2xvYWRlci13b3JrZXItMWRlcC93ZWJwYWNrLmNvbmZpZy5qcyIsInNvdXJjZXNDb250ZW50IjpbInZhciBwbHVnaW5Db21wYXQgPSByZXF1aXJlKCcuLi8uLi8uLi9saWIvdXRpbC9wbHVnaW4tY29tcGF0Jyk7XG52YXIgSGFyZFNvdXJjZVdlYnBhY2tQbHVnaW4gPSByZXF1aXJlKCcuLi8uLi8uLicpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgY29udGV4dDogX19kaXJuYW1lLFxuICBlbnRyeTogJy4vaW5kZXguanMnLFxuICBvdXRwdXQ6IHtcbiAgICBwYXRoOiBfX2Rpcm5hbWUgKyAnL3RtcCcsXG4gICAgZmlsZW5hbWU6ICdtYWluLmpzJyxcbiAgfSxcbiAgcGx1Z2luczogW1xuICAgIG5ldyBIYXJkU291cmNlV2VicGFja1BsdWdpbih7XG4gICAgICBjYWNoZURpcmVjdG9yeTogJ2NhY2hlJyxcbiAgICAgIGVudmlyb25tZW50SGFzaDoge1xuICAgICAgICByb290OiBfX2Rpcm5hbWUgKyAnLy4uLy4uLy4uJyxcbiAgICAgIH0sXG4gICAgfSksXG4gICAge1xuICAgICAgYXBwbHkoY29tcGlsZXIpIHtcbiAgICAgICAgcGx1Z2luQ29tcGF0LnRhcChjb21waWxlciwgJ2hhcmRTb3VyY2VMb2cnLCAnbG9hZGVyLXdvcmtlci0xZGVwIHRlc3QnLCBpbmZvID0+IHtcbiAgICAgICAgICBpZiAoaW5mby5sZXZlbCAhPT0gJ2xvZycpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignbG9hZGVyLXdvcmtlci0xZGVwIGZpeHR1cmUgc2hvdWxkIG5vdCBwcm9kdWNlIGxvZ3MnKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfSxcbiAgICB9LFxuICBdLFxufTtcbiJdLCJzb3VyY2VSb290IjoiL1VzZXJzL3R5bGVyYXJidXMvZGV2L3Byb3ZpZGVyL3NyYyJ9

'use strict';

var HardSourceWebpackPlugin = require('../../..');

module.exports = {
  context: __dirname,
  entry: './index.js',
  output: {
    path: __dirname + '/tmp',
    filename: 'main.js',
    pathinfo: true
  },
  plugins: [new HardSourceWebpackPlugin({
    cacheDirectory: 'cache',
    environmentHash: {
      root: __dirname + '/../../..'
    }
  })]
};
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImhhcmQtc291cmNlLXdlYnBhY2stcGx1Z2luL3Rlc3RzL2ZpeHR1cmVzL2Jhc2UtcGF0aC1pbmZvL3dlYnBhY2suY29uZmlnLmpzIl0sIm5hbWVzIjpbIkhhcmRTb3VyY2VXZWJwYWNrUGx1Z2luIiwicmVxdWlyZSIsIm1vZHVsZSIsImV4cG9ydHMiLCJjb250ZXh0IiwiX19kaXJuYW1lIiwiZW50cnkiLCJvdXRwdXQiLCJwYXRoIiwiZmlsZW5hbWUiLCJwYXRoaW5mbyIsInBsdWdpbnMiLCJjYWNoZURpcmVjdG9yeSIsImVudmlyb25tZW50SGFzaCIsInJvb3QiXSwibWFwcGluZ3MiOiI7O0FBQUEsSUFBSUEsMEJBQTBCQyxtQkFBOUI7O0FBRUFDLE9BQU9DLE9BQVAsR0FBaUI7QUFDZkMsV0FBU0MsU0FETTtBQUVmQyxTQUFPLFlBRlE7QUFHZkMsVUFBUTtBQUNOQyxVQUFNSCxZQUFZLE1BRFo7QUFFTkksY0FBVSxTQUZKO0FBR05DLGNBQVU7QUFISixHQUhPO0FBUWZDLFdBQVMsQ0FDUCxJQUFJWCx1QkFBSixDQUE0QjtBQUMxQlksb0JBQWdCLE9BRFU7QUFFMUJDLHFCQUFpQjtBQUNmQyxZQUFNVCxZQUFZO0FBREg7QUFGUyxHQUE1QixDQURPO0FBUk0sQ0FBakIiLCJmaWxlIjoiaGFyZC1zb3VyY2Utd2VicGFjay1wbHVnaW4vdGVzdHMvZml4dHVyZXMvYmFzZS1wYXRoLWluZm8vd2VicGFjay5jb25maWcuanMiLCJzb3VyY2VzQ29udGVudCI6WyJ2YXIgSGFyZFNvdXJjZVdlYnBhY2tQbHVnaW4gPSByZXF1aXJlKCcuLi8uLi8uLicpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgY29udGV4dDogX19kaXJuYW1lLFxuICBlbnRyeTogJy4vaW5kZXguanMnLFxuICBvdXRwdXQ6IHtcbiAgICBwYXRoOiBfX2Rpcm5hbWUgKyAnL3RtcCcsXG4gICAgZmlsZW5hbWU6ICdtYWluLmpzJyxcbiAgICBwYXRoaW5mbzogdHJ1ZSxcbiAgfSxcbiAgcGx1Z2luczogW1xuICAgIG5ldyBIYXJkU291cmNlV2VicGFja1BsdWdpbih7XG4gICAgICBjYWNoZURpcmVjdG9yeTogJ2NhY2hlJyxcbiAgICAgIGVudmlyb25tZW50SGFzaDoge1xuICAgICAgICByb290OiBfX2Rpcm5hbWUgKyAnLy4uLy4uLy4uJyxcbiAgICAgIH0sXG4gICAgfSksXG4gIF0sXG59O1xuIl0sInNvdXJjZVJvb3QiOiIvVXNlcnMvdHlsZXJhcmJ1cy9kZXYvcHJvdmlkZXIvc3JjIn0=

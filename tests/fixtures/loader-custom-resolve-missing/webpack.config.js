'use strict';

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
  })]
};
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImhhcmQtc291cmNlLXdlYnBhY2stcGx1Z2luL3Rlc3RzL2ZpeHR1cmVzL2xvYWRlci1jdXN0b20tcmVzb2x2ZS1taXNzaW5nL3dlYnBhY2suY29uZmlnLmpzIl0sIm5hbWVzIjpbIkhhcmRTb3VyY2VXZWJwYWNrUGx1Z2luIiwicmVxdWlyZSIsIm1vZHVsZSIsImV4cG9ydHMiLCJjb250ZXh0IiwiX19kaXJuYW1lIiwiZW50cnkiLCJvdXRwdXQiLCJwYXRoIiwiZmlsZW5hbWUiLCJwbHVnaW5zIiwiY2FjaGVEaXJlY3RvcnkiLCJlbnZpcm9ubWVudEhhc2giLCJyb290Il0sIm1hcHBpbmdzIjoiOztBQUFBLElBQUlBLDBCQUEwQkMsbUJBQTlCOztBQUVBQyxPQUFPQyxPQUFQLEdBQWlCO0FBQ2ZDLFdBQVNDLFNBRE07QUFFZkMsU0FBTyxZQUZRO0FBR2ZDLFVBQVE7QUFDTkMsVUFBTUgsWUFBWSxNQURaO0FBRU5JLGNBQVU7QUFGSixHQUhPO0FBT2ZDLFdBQVMsQ0FDUCxJQUFJVix1QkFBSixDQUE0QjtBQUMxQlcsb0JBQWdCLE9BRFU7QUFFMUJDLHFCQUFpQjtBQUNmQyxZQUFNUixZQUFZO0FBREg7QUFGUyxHQUE1QixDQURPO0FBUE0sQ0FBakIiLCJmaWxlIjoiaGFyZC1zb3VyY2Utd2VicGFjay1wbHVnaW4vdGVzdHMvZml4dHVyZXMvbG9hZGVyLWN1c3RvbS1yZXNvbHZlLW1pc3Npbmcvd2VicGFjay5jb25maWcuanMiLCJzb3VyY2VzQ29udGVudCI6WyJ2YXIgSGFyZFNvdXJjZVdlYnBhY2tQbHVnaW4gPSByZXF1aXJlKCcuLi8uLi8uLicpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgY29udGV4dDogX19kaXJuYW1lLFxuICBlbnRyeTogJy4vaW5kZXguanMnLFxuICBvdXRwdXQ6IHtcbiAgICBwYXRoOiBfX2Rpcm5hbWUgKyAnL3RtcCcsXG4gICAgZmlsZW5hbWU6ICdtYWluLmpzJyxcbiAgfSxcbiAgcGx1Z2luczogW1xuICAgIG5ldyBIYXJkU291cmNlV2VicGFja1BsdWdpbih7XG4gICAgICBjYWNoZURpcmVjdG9yeTogJ2NhY2hlJyxcbiAgICAgIGVudmlyb25tZW50SGFzaDoge1xuICAgICAgICByb290OiBfX2Rpcm5hbWUgKyAnLy4uLy4uLy4uJyxcbiAgICAgIH0sXG4gICAgfSksXG4gIF0sXG59O1xuIl0sInNvdXJjZVJvb3QiOiIvVXNlcnMvdHlsZXJhcmJ1cy9kZXYvcHJvdmlkZXIvc3JjIn0=

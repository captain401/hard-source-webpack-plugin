'use strict';

var HardSourceWebpackPlugin = require('../../..');

module.exports = {
  context: __dirname,
  entry: './index.js',
  devtool: 'inline-cheap-source-map',
  output: {
    path: __dirname + '/tmp',
    filename: '[hash].js'
  },
  plugins: [new HardSourceWebpackPlugin({
    cacheDirectory: 'cache'
  })]
};
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImhhcmQtc291cmNlLXdlYnBhY2stcGx1Z2luL3Rlc3RzL2ZpeHR1cmVzL2Jhc2UtZGV2dG9vbC1pbmxpbmUtY2hlYXAtc291cmNlLW1hcC1oYXNoLWZpbGVuYW1lL3dlYnBhY2suY29uZmlnLmpzIl0sIm5hbWVzIjpbIkhhcmRTb3VyY2VXZWJwYWNrUGx1Z2luIiwicmVxdWlyZSIsIm1vZHVsZSIsImV4cG9ydHMiLCJjb250ZXh0IiwiX19kaXJuYW1lIiwiZW50cnkiLCJkZXZ0b29sIiwib3V0cHV0IiwicGF0aCIsImZpbGVuYW1lIiwicGx1Z2lucyIsImNhY2hlRGlyZWN0b3J5Il0sIm1hcHBpbmdzIjoiOztBQUFBLElBQUlBLDBCQUEwQkMsbUJBQTlCOztBQUVBQyxPQUFPQyxPQUFQLEdBQWlCO0FBQ2ZDLFdBQVNDLFNBRE07QUFFZkMsU0FBTyxZQUZRO0FBR2ZDLFdBQVMseUJBSE07QUFJZkMsVUFBUTtBQUNOQyxVQUFNSixZQUFZLE1BRFo7QUFFTkssY0FBVTtBQUZKLEdBSk87QUFRZkMsV0FBUyxDQUNQLElBQUlYLHVCQUFKLENBQTRCO0FBQzFCWSxvQkFBZ0I7QUFEVSxHQUE1QixDQURPO0FBUk0sQ0FBakIiLCJmaWxlIjoiaGFyZC1zb3VyY2Utd2VicGFjay1wbHVnaW4vdGVzdHMvZml4dHVyZXMvYmFzZS1kZXZ0b29sLWlubGluZS1jaGVhcC1zb3VyY2UtbWFwLWhhc2gtZmlsZW5hbWUvd2VicGFjay5jb25maWcuanMiLCJzb3VyY2VzQ29udGVudCI6WyJ2YXIgSGFyZFNvdXJjZVdlYnBhY2tQbHVnaW4gPSByZXF1aXJlKCcuLi8uLi8uLicpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgY29udGV4dDogX19kaXJuYW1lLFxuICBlbnRyeTogJy4vaW5kZXguanMnLFxuICBkZXZ0b29sOiAnaW5saW5lLWNoZWFwLXNvdXJjZS1tYXAnLFxuICBvdXRwdXQ6IHtcbiAgICBwYXRoOiBfX2Rpcm5hbWUgKyAnL3RtcCcsXG4gICAgZmlsZW5hbWU6ICdbaGFzaF0uanMnLFxuICB9LFxuICBwbHVnaW5zOiBbXG4gICAgbmV3IEhhcmRTb3VyY2VXZWJwYWNrUGx1Z2luKHtcbiAgICAgIGNhY2hlRGlyZWN0b3J5OiAnY2FjaGUnLFxuICAgIH0pLFxuICBdLFxufTtcbiJdLCJzb3VyY2VSb290IjoiL1VzZXJzL3R5bGVyYXJidXMvZGV2L3Byb3ZpZGVyL3NyYyJ9

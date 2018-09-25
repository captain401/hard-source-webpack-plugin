'use strict';

var HardSourceWebpackPlugin = require('../../..');

module.exports = {
  context: __dirname,
  entry: './index.js',
  output: {
    path: __dirname + '/tmp',
    filename: 'main.js'
  },
  devtool: 'source-map',
  plugins: [new HardSourceWebpackPlugin({
    cacheDirectory: 'cache'
  })]
};
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImhhcmQtc291cmNlLXdlYnBhY2stcGx1Z2luL3Rlc3RzL2ZpeHR1cmVzL2Jhc2UtY29udGV4dC1kZXZ0b29sLXNvdXJjZS1tYXAvd2VicGFjay5jb25maWcuanMiXSwibmFtZXMiOlsiSGFyZFNvdXJjZVdlYnBhY2tQbHVnaW4iLCJyZXF1aXJlIiwibW9kdWxlIiwiZXhwb3J0cyIsImNvbnRleHQiLCJfX2Rpcm5hbWUiLCJlbnRyeSIsIm91dHB1dCIsInBhdGgiLCJmaWxlbmFtZSIsImRldnRvb2wiLCJwbHVnaW5zIiwiY2FjaGVEaXJlY3RvcnkiXSwibWFwcGluZ3MiOiI7O0FBQUEsSUFBSUEsMEJBQTBCQyxtQkFBOUI7O0FBRUFDLE9BQU9DLE9BQVAsR0FBaUI7QUFDZkMsV0FBU0MsU0FETTtBQUVmQyxTQUFPLFlBRlE7QUFHZkMsVUFBUTtBQUNOQyxVQUFNSCxZQUFZLE1BRFo7QUFFTkksY0FBVTtBQUZKLEdBSE87QUFPZkMsV0FBUyxZQVBNO0FBUWZDLFdBQVMsQ0FDUCxJQUFJWCx1QkFBSixDQUE0QjtBQUMxQlksb0JBQWdCO0FBRFUsR0FBNUIsQ0FETztBQVJNLENBQWpCIiwiZmlsZSI6ImhhcmQtc291cmNlLXdlYnBhY2stcGx1Z2luL3Rlc3RzL2ZpeHR1cmVzL2Jhc2UtY29udGV4dC1kZXZ0b29sLXNvdXJjZS1tYXAvd2VicGFjay5jb25maWcuanMiLCJzb3VyY2VzQ29udGVudCI6WyJ2YXIgSGFyZFNvdXJjZVdlYnBhY2tQbHVnaW4gPSByZXF1aXJlKCcuLi8uLi8uLicpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgY29udGV4dDogX19kaXJuYW1lLFxuICBlbnRyeTogJy4vaW5kZXguanMnLFxuICBvdXRwdXQ6IHtcbiAgICBwYXRoOiBfX2Rpcm5hbWUgKyAnL3RtcCcsXG4gICAgZmlsZW5hbWU6ICdtYWluLmpzJyxcbiAgfSxcbiAgZGV2dG9vbDogJ3NvdXJjZS1tYXAnLFxuICBwbHVnaW5zOiBbXG4gICAgbmV3IEhhcmRTb3VyY2VXZWJwYWNrUGx1Z2luKHtcbiAgICAgIGNhY2hlRGlyZWN0b3J5OiAnY2FjaGUnLFxuICAgIH0pLFxuICBdLFxufTtcbiJdLCJzb3VyY2VSb290IjoiL1VzZXJzL3R5bGVyYXJidXMvZGV2L3Byb3ZpZGVyL3NyYyJ9

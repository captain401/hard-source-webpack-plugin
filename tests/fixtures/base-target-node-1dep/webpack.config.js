'use strict';

var HardSourceWebpackPlugin = require('../../..');

module.exports = {
  context: __dirname,
  entry: './index.js',
  target: 'node',
  output: {
    path: __dirname + '/tmp',
    filename: 'main.js'
  },
  plugins: [new HardSourceWebpackPlugin({
    cacheDirectory: 'cache'
  })]
};
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImhhcmQtc291cmNlLXdlYnBhY2stcGx1Z2luL3Rlc3RzL2ZpeHR1cmVzL2Jhc2UtdGFyZ2V0LW5vZGUtMWRlcC93ZWJwYWNrLmNvbmZpZy5qcyJdLCJuYW1lcyI6WyJIYXJkU291cmNlV2VicGFja1BsdWdpbiIsInJlcXVpcmUiLCJtb2R1bGUiLCJleHBvcnRzIiwiY29udGV4dCIsIl9fZGlybmFtZSIsImVudHJ5IiwidGFyZ2V0Iiwib3V0cHV0IiwicGF0aCIsImZpbGVuYW1lIiwicGx1Z2lucyIsImNhY2hlRGlyZWN0b3J5Il0sIm1hcHBpbmdzIjoiOztBQUFBLElBQUlBLDBCQUEwQkMsbUJBQTlCOztBQUVBQyxPQUFPQyxPQUFQLEdBQWlCO0FBQ2ZDLFdBQVNDLFNBRE07QUFFZkMsU0FBTyxZQUZRO0FBR2ZDLFVBQVEsTUFITztBQUlmQyxVQUFRO0FBQ05DLFVBQU1KLFlBQVksTUFEWjtBQUVOSyxjQUFVO0FBRkosR0FKTztBQVFmQyxXQUFTLENBQ1AsSUFBSVgsdUJBQUosQ0FBNEI7QUFDMUJZLG9CQUFnQjtBQURVLEdBQTVCLENBRE87QUFSTSxDQUFqQiIsImZpbGUiOiJoYXJkLXNvdXJjZS13ZWJwYWNrLXBsdWdpbi90ZXN0cy9maXh0dXJlcy9iYXNlLXRhcmdldC1ub2RlLTFkZXAvd2VicGFjay5jb25maWcuanMiLCJzb3VyY2VzQ29udGVudCI6WyJ2YXIgSGFyZFNvdXJjZVdlYnBhY2tQbHVnaW4gPSByZXF1aXJlKCcuLi8uLi8uLicpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgY29udGV4dDogX19kaXJuYW1lLFxuICBlbnRyeTogJy4vaW5kZXguanMnLFxuICB0YXJnZXQ6ICdub2RlJyxcbiAgb3V0cHV0OiB7XG4gICAgcGF0aDogX19kaXJuYW1lICsgJy90bXAnLFxuICAgIGZpbGVuYW1lOiAnbWFpbi5qcycsXG4gIH0sXG4gIHBsdWdpbnM6IFtcbiAgICBuZXcgSGFyZFNvdXJjZVdlYnBhY2tQbHVnaW4oe1xuICAgICAgY2FjaGVEaXJlY3Rvcnk6ICdjYWNoZScsXG4gICAgfSksXG4gIF0sXG59O1xuIl0sInNvdXJjZVJvb3QiOiIvVXNlcnMvdHlsZXJhcmJ1cy9kZXYvcHJvdmlkZXIvc3JjIn0=

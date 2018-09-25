'use strict';

var HardSourceWebpackPlugin = require('../../..');

module.exports = {
  context: __dirname,
  entry: './index.js',
  devtool: 'eval',
  output: {
    path: __dirname + '/tmp',
    filename: 'main.js'
  },
  plugins: [new HardSourceWebpackPlugin({
    cacheDirectory: 'cache'
  })]
};
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImhhcmQtc291cmNlLXdlYnBhY2stcGx1Z2luL3Rlc3RzL2ZpeHR1cmVzL2Jhc2UtZGV2dG9vbC1ldmFsL3dlYnBhY2suY29uZmlnLmpzIl0sIm5hbWVzIjpbIkhhcmRTb3VyY2VXZWJwYWNrUGx1Z2luIiwicmVxdWlyZSIsIm1vZHVsZSIsImV4cG9ydHMiLCJjb250ZXh0IiwiX19kaXJuYW1lIiwiZW50cnkiLCJkZXZ0b29sIiwib3V0cHV0IiwicGF0aCIsImZpbGVuYW1lIiwicGx1Z2lucyIsImNhY2hlRGlyZWN0b3J5Il0sIm1hcHBpbmdzIjoiOztBQUFBLElBQUlBLDBCQUEwQkMsbUJBQTlCOztBQUVBQyxPQUFPQyxPQUFQLEdBQWlCO0FBQ2ZDLFdBQVNDLFNBRE07QUFFZkMsU0FBTyxZQUZRO0FBR2ZDLFdBQVMsTUFITTtBQUlmQyxVQUFRO0FBQ05DLFVBQU1KLFlBQVksTUFEWjtBQUVOSyxjQUFVO0FBRkosR0FKTztBQVFmQyxXQUFTLENBQ1AsSUFBSVgsdUJBQUosQ0FBNEI7QUFDMUJZLG9CQUFnQjtBQURVLEdBQTVCLENBRE87QUFSTSxDQUFqQiIsImZpbGUiOiJoYXJkLXNvdXJjZS13ZWJwYWNrLXBsdWdpbi90ZXN0cy9maXh0dXJlcy9iYXNlLWRldnRvb2wtZXZhbC93ZWJwYWNrLmNvbmZpZy5qcyIsInNvdXJjZXNDb250ZW50IjpbInZhciBIYXJkU291cmNlV2VicGFja1BsdWdpbiA9IHJlcXVpcmUoJy4uLy4uLy4uJyk7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICBjb250ZXh0OiBfX2Rpcm5hbWUsXG4gIGVudHJ5OiAnLi9pbmRleC5qcycsXG4gIGRldnRvb2w6ICdldmFsJyxcbiAgb3V0cHV0OiB7XG4gICAgcGF0aDogX19kaXJuYW1lICsgJy90bXAnLFxuICAgIGZpbGVuYW1lOiAnbWFpbi5qcycsXG4gIH0sXG4gIHBsdWdpbnM6IFtcbiAgICBuZXcgSGFyZFNvdXJjZVdlYnBhY2tQbHVnaW4oe1xuICAgICAgY2FjaGVEaXJlY3Rvcnk6ICdjYWNoZScsXG4gICAgfSksXG4gIF0sXG59O1xuIl0sInNvdXJjZVJvb3QiOiIvVXNlcnMvdHlsZXJhcmJ1cy9kZXYvcHJvdmlkZXIvc3JjIn0=

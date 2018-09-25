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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImhhcmQtc291cmNlLXdlYnBhY2stcGx1Z2luL3Rlc3RzL2ZpeHR1cmVzL2Jhc2UtY2hhbmdlLTFkZXAvd2VicGFjay5jb25maWcuanMiXSwibmFtZXMiOlsiSGFyZFNvdXJjZVdlYnBhY2tQbHVnaW4iLCJyZXF1aXJlIiwibW9kdWxlIiwiZXhwb3J0cyIsImNvbnRleHQiLCJfX2Rpcm5hbWUiLCJlbnRyeSIsIm91dHB1dCIsInBhdGgiLCJmaWxlbmFtZSIsInBsdWdpbnMiLCJjYWNoZURpcmVjdG9yeSIsImVudmlyb25tZW50SGFzaCIsInJvb3QiXSwibWFwcGluZ3MiOiI7O0FBQUEsSUFBSUEsMEJBQTBCQyxtQkFBOUI7O0FBRUFDLE9BQU9DLE9BQVAsR0FBaUI7QUFDZkMsV0FBU0MsU0FETTtBQUVmQyxTQUFPLFlBRlE7QUFHZkMsVUFBUTtBQUNOQyxVQUFNSCxZQUFZLE1BRFo7QUFFTkksY0FBVTtBQUZKLEdBSE87QUFPZkMsV0FBUyxDQUNQLElBQUlWLHVCQUFKLENBQTRCO0FBQzFCVyxvQkFBZ0IsT0FEVTtBQUUxQkMscUJBQWlCO0FBQ2ZDLFlBQU1SLFlBQVk7QUFESDtBQUZTLEdBQTVCLENBRE87QUFQTSxDQUFqQiIsImZpbGUiOiJoYXJkLXNvdXJjZS13ZWJwYWNrLXBsdWdpbi90ZXN0cy9maXh0dXJlcy9iYXNlLWNoYW5nZS0xZGVwL3dlYnBhY2suY29uZmlnLmpzIiwic291cmNlc0NvbnRlbnQiOlsidmFyIEhhcmRTb3VyY2VXZWJwYWNrUGx1Z2luID0gcmVxdWlyZSgnLi4vLi4vLi4nKTtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIGNvbnRleHQ6IF9fZGlybmFtZSxcbiAgZW50cnk6ICcuL2luZGV4LmpzJyxcbiAgb3V0cHV0OiB7XG4gICAgcGF0aDogX19kaXJuYW1lICsgJy90bXAnLFxuICAgIGZpbGVuYW1lOiAnbWFpbi5qcycsXG4gIH0sXG4gIHBsdWdpbnM6IFtcbiAgICBuZXcgSGFyZFNvdXJjZVdlYnBhY2tQbHVnaW4oe1xuICAgICAgY2FjaGVEaXJlY3Rvcnk6ICdjYWNoZScsXG4gICAgICBlbnZpcm9ubWVudEhhc2g6IHtcbiAgICAgICAgcm9vdDogX19kaXJuYW1lICsgJy8uLi8uLi8uLicsXG4gICAgICB9LFxuICAgIH0pLFxuICBdLFxufTtcbiJdLCJzb3VyY2VSb290IjoiL1VzZXJzL3R5bGVyYXJidXMvZGV2L3Byb3ZpZGVyL3NyYyJ9

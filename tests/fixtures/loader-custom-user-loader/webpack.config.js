'use strict';

var HardSourceWebpackPlugin = require('../../..');
var webpackVersion = require('webpack/package.json').version;

var moduleOptions;

if (Number(webpackVersion.split('.')[0]) > 1) {
  moduleOptions = {
    rules: [{
      test: /\.png$/,
      loader: 'file-loader'
    }]
  };
} else {
  moduleOptions = {
    loaders: [{
      test: /\.png$/,
      loader: 'file-loader'
    }]
  };
}

module.exports = {
  context: __dirname,
  entry: './loader!./index.js',
  output: {
    path: __dirname + '/tmp',
    filename: 'main.js'
  },
  module: moduleOptions,
  plugins: [new HardSourceWebpackPlugin({
    cacheDirectory: 'cache',
    environmentHash: {
      root: __dirname + '/../../..'
    }
  })]
};
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImhhcmQtc291cmNlLXdlYnBhY2stcGx1Z2luL3Rlc3RzL2ZpeHR1cmVzL2xvYWRlci1jdXN0b20tdXNlci1sb2FkZXIvd2VicGFjay5jb25maWcuanMiXSwibmFtZXMiOlsiSGFyZFNvdXJjZVdlYnBhY2tQbHVnaW4iLCJyZXF1aXJlIiwid2VicGFja1ZlcnNpb24iLCJ2ZXJzaW9uIiwibW9kdWxlT3B0aW9ucyIsIk51bWJlciIsInNwbGl0IiwicnVsZXMiLCJ0ZXN0IiwibG9hZGVyIiwibG9hZGVycyIsIm1vZHVsZSIsImV4cG9ydHMiLCJjb250ZXh0IiwiX19kaXJuYW1lIiwiZW50cnkiLCJvdXRwdXQiLCJwYXRoIiwiZmlsZW5hbWUiLCJwbHVnaW5zIiwiY2FjaGVEaXJlY3RvcnkiLCJlbnZpcm9ubWVudEhhc2giLCJyb290Il0sIm1hcHBpbmdzIjoiOztBQUFBLElBQUlBLDBCQUEwQkMsbUJBQTlCO0FBQ0EsSUFBSUMsaUJBQWlCRCxRQUFRLHNCQUFSLEVBQWdDRSxPQUFyRDs7QUFFQSxJQUFJQyxhQUFKOztBQUVBLElBQUlDLE9BQU9ILGVBQWVJLEtBQWYsQ0FBcUIsR0FBckIsRUFBMEIsQ0FBMUIsQ0FBUCxJQUF1QyxDQUEzQyxFQUE4QztBQUM1Q0Ysa0JBQWdCO0FBQ2RHLFdBQU8sQ0FDTDtBQUNFQyxZQUFNLFFBRFI7QUFFRUMsY0FBUTtBQUZWLEtBREs7QUFETyxHQUFoQjtBQVFELENBVEQsTUFVSztBQUNITCxrQkFBZ0I7QUFDZE0sYUFBUyxDQUNQO0FBQ0VGLFlBQU0sUUFEUjtBQUVFQyxjQUFRO0FBRlYsS0FETztBQURLLEdBQWhCO0FBUUQ7O0FBRURFLE9BQU9DLE9BQVAsR0FBaUI7QUFDZkMsV0FBU0MsU0FETTtBQUVmQyxTQUFPLHFCQUZRO0FBR2ZDLFVBQVE7QUFDTkMsVUFBTUgsWUFBWSxNQURaO0FBRU5JLGNBQVU7QUFGSixHQUhPO0FBT2ZQLFVBQVFQLGFBUE87QUFRZmUsV0FBUyxDQUNQLElBQUluQix1QkFBSixDQUE0QjtBQUMxQm9CLG9CQUFnQixPQURVO0FBRTFCQyxxQkFBaUI7QUFDZkMsWUFBTVIsWUFBWTtBQURIO0FBRlMsR0FBNUIsQ0FETztBQVJNLENBQWpCIiwiZmlsZSI6ImhhcmQtc291cmNlLXdlYnBhY2stcGx1Z2luL3Rlc3RzL2ZpeHR1cmVzL2xvYWRlci1jdXN0b20tdXNlci1sb2FkZXIvd2VicGFjay5jb25maWcuanMiLCJzb3VyY2VzQ29udGVudCI6WyJ2YXIgSGFyZFNvdXJjZVdlYnBhY2tQbHVnaW4gPSByZXF1aXJlKCcuLi8uLi8uLicpO1xudmFyIHdlYnBhY2tWZXJzaW9uID0gcmVxdWlyZSgnd2VicGFjay9wYWNrYWdlLmpzb24nKS52ZXJzaW9uO1xuXG52YXIgbW9kdWxlT3B0aW9ucztcblxuaWYgKE51bWJlcih3ZWJwYWNrVmVyc2lvbi5zcGxpdCgnLicpWzBdKSA+IDEpIHtcbiAgbW9kdWxlT3B0aW9ucyA9IHtcbiAgICBydWxlczogW1xuICAgICAge1xuICAgICAgICB0ZXN0OiAvXFwucG5nJC8sXG4gICAgICAgIGxvYWRlcjogJ2ZpbGUtbG9hZGVyJyxcbiAgICAgIH0sXG4gICAgXSxcbiAgfTtcbn1cbmVsc2Uge1xuICBtb2R1bGVPcHRpb25zID0ge1xuICAgIGxvYWRlcnM6IFtcbiAgICAgIHtcbiAgICAgICAgdGVzdDogL1xcLnBuZyQvLFxuICAgICAgICBsb2FkZXI6ICdmaWxlLWxvYWRlcicsXG4gICAgICB9LFxuICAgIF0sXG4gIH07XG59XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICBjb250ZXh0OiBfX2Rpcm5hbWUsXG4gIGVudHJ5OiAnLi9sb2FkZXIhLi9pbmRleC5qcycsXG4gIG91dHB1dDoge1xuICAgIHBhdGg6IF9fZGlybmFtZSArICcvdG1wJyxcbiAgICBmaWxlbmFtZTogJ21haW4uanMnLFxuICB9LFxuICBtb2R1bGU6IG1vZHVsZU9wdGlvbnMsXG4gIHBsdWdpbnM6IFtcbiAgICBuZXcgSGFyZFNvdXJjZVdlYnBhY2tQbHVnaW4oe1xuICAgICAgY2FjaGVEaXJlY3Rvcnk6ICdjYWNoZScsXG4gICAgICBlbnZpcm9ubWVudEhhc2g6IHtcbiAgICAgICAgcm9vdDogX19kaXJuYW1lICsgJy8uLi8uLi8uLicsXG4gICAgICB9LFxuICAgIH0pLFxuICBdLFxufTtcbiJdLCJzb3VyY2VSb290IjoiL1VzZXJzL3R5bGVyYXJidXMvZGV2L3Byb3ZpZGVyL3NyYyJ9

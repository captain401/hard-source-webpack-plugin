'use strict';

var HardSourceWebpackPlugin = require('../../..');
var SerializerJsonPlugin = require('../../../lib/SerializerJsonPlugin');

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
  }), new SerializerJsonPlugin()]
};
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImhhcmQtc291cmNlLXdlYnBhY2stcGx1Z2luL3Rlc3RzL2ZpeHR1cmVzL3NlcmlhbGl6ZXItanNvbi1iYXNlLTFkZXAvd2VicGFjay5jb25maWcuanMiXSwibmFtZXMiOlsiSGFyZFNvdXJjZVdlYnBhY2tQbHVnaW4iLCJyZXF1aXJlIiwiU2VyaWFsaXplckpzb25QbHVnaW4iLCJtb2R1bGUiLCJleHBvcnRzIiwiY29udGV4dCIsIl9fZGlybmFtZSIsImVudHJ5Iiwib3V0cHV0IiwicGF0aCIsImZpbGVuYW1lIiwicGx1Z2lucyIsImNhY2hlRGlyZWN0b3J5IiwiZW52aXJvbm1lbnRIYXNoIiwicm9vdCJdLCJtYXBwaW5ncyI6Ijs7QUFBQSxJQUFJQSwwQkFBMEJDLG1CQUE5QjtBQUNBLElBQUlDLHVCQUF1QkQsNENBQTNCOztBQUVBRSxPQUFPQyxPQUFQLEdBQWlCO0FBQ2ZDLFdBQVNDLFNBRE07QUFFZkMsU0FBTyxZQUZRO0FBR2ZDLFVBQVE7QUFDTkMsVUFBTUgsWUFBWSxNQURaO0FBRU5JLGNBQVU7QUFGSixHQUhPO0FBT2ZDLFdBQVMsQ0FDUCxJQUFJWCx1QkFBSixDQUE0QjtBQUMxQlksb0JBQWdCLE9BRFU7QUFFMUJDLHFCQUFpQjtBQUNmQyxZQUFNUixZQUFZO0FBREg7QUFGUyxHQUE1QixDQURPLEVBT1AsSUFBSUosb0JBQUosRUFQTztBQVBNLENBQWpCIiwiZmlsZSI6ImhhcmQtc291cmNlLXdlYnBhY2stcGx1Z2luL3Rlc3RzL2ZpeHR1cmVzL3NlcmlhbGl6ZXItanNvbi1iYXNlLTFkZXAvd2VicGFjay5jb25maWcuanMiLCJzb3VyY2VzQ29udGVudCI6WyJ2YXIgSGFyZFNvdXJjZVdlYnBhY2tQbHVnaW4gPSByZXF1aXJlKCcuLi8uLi8uLicpO1xudmFyIFNlcmlhbGl6ZXJKc29uUGx1Z2luID0gcmVxdWlyZSgnLi4vLi4vLi4vbGliL1NlcmlhbGl6ZXJKc29uUGx1Z2luJyk7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICBjb250ZXh0OiBfX2Rpcm5hbWUsXG4gIGVudHJ5OiAnLi9pbmRleC5qcycsXG4gIG91dHB1dDoge1xuICAgIHBhdGg6IF9fZGlybmFtZSArICcvdG1wJyxcbiAgICBmaWxlbmFtZTogJ21haW4uanMnLFxuICB9LFxuICBwbHVnaW5zOiBbXG4gICAgbmV3IEhhcmRTb3VyY2VXZWJwYWNrUGx1Z2luKHtcbiAgICAgIGNhY2hlRGlyZWN0b3J5OiAnY2FjaGUnLFxuICAgICAgZW52aXJvbm1lbnRIYXNoOiB7XG4gICAgICAgIHJvb3Q6IF9fZGlybmFtZSArICcvLi4vLi4vLi4nLFxuICAgICAgfSxcbiAgICB9KSxcbiAgICBuZXcgU2VyaWFsaXplckpzb25QbHVnaW4oKSxcbiAgXSxcbn07XG4iXSwic291cmNlUm9vdCI6Ii9Vc2Vycy90eWxlcmFyYnVzL2Rldi9wcm92aWRlci9zcmMifQ==

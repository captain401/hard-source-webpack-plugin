'use strict';

var fs = require('fs');

var HardSourceWebpackPlugin = require('../../..');

var hardSourceConfig = eval('(function() { return (' + require('fs').readFileSync(__dirname + '/hard-source-config.js', 'utf8') + '); })')();

module.exports = {
  context: __dirname,
  entry: './loader.js!./index.js',
  output: {
    path: __dirname + '/tmp',
    filename: 'main.js'
  },
  plugins: [new HardSourceWebpackPlugin(hardSourceConfig)]
};
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImhhcmQtc291cmNlLXdlYnBhY2stcGx1Z2luL3Rlc3RzL2ZpeHR1cmVzL2hhcmQtc291cmNlLXBhY2thZ2V5YXJubG9jay1oYXNoL3dlYnBhY2suY29uZmlnLmpzIl0sIm5hbWVzIjpbImZzIiwicmVxdWlyZSIsIkhhcmRTb3VyY2VXZWJwYWNrUGx1Z2luIiwiaGFyZFNvdXJjZUNvbmZpZyIsImV2YWwiLCJyZWFkRmlsZVN5bmMiLCJfX2Rpcm5hbWUiLCJtb2R1bGUiLCJleHBvcnRzIiwiY29udGV4dCIsImVudHJ5Iiwib3V0cHV0IiwicGF0aCIsImZpbGVuYW1lIiwicGx1Z2lucyJdLCJtYXBwaW5ncyI6Ijs7QUFBQSxJQUFJQSxLQUFLQyxRQUFRLElBQVIsQ0FBVDs7QUFFQSxJQUFJQywwQkFBMEJELG1CQUE5Qjs7QUFFQSxJQUFJRSxtQkFBbUJDLEtBQ3JCLDJCQUNBSCxRQUFRLElBQVIsRUFDQ0ksWUFERCxDQUNjQyxZQUFZLHdCQUQxQixFQUNvRCxNQURwRCxDQURBLEdBR0EsT0FKcUIsR0FBdkI7O0FBT0FDLE9BQU9DLE9BQVAsR0FBaUI7QUFDZkMsV0FBU0gsU0FETTtBQUVmSSxTQUFPLHdCQUZRO0FBR2ZDLFVBQVE7QUFDTkMsVUFBTU4sWUFBWSxNQURaO0FBRU5PLGNBQVU7QUFGSixHQUhPO0FBT2ZDLFdBQVMsQ0FDUCxJQUFJWix1QkFBSixDQUE0QkMsZ0JBQTVCLENBRE87QUFQTSxDQUFqQiIsImZpbGUiOiJoYXJkLXNvdXJjZS13ZWJwYWNrLXBsdWdpbi90ZXN0cy9maXh0dXJlcy9oYXJkLXNvdXJjZS1wYWNrYWdleWFybmxvY2staGFzaC93ZWJwYWNrLmNvbmZpZy5qcyIsInNvdXJjZXNDb250ZW50IjpbInZhciBmcyA9IHJlcXVpcmUoJ2ZzJyk7XG5cbnZhciBIYXJkU291cmNlV2VicGFja1BsdWdpbiA9IHJlcXVpcmUoJy4uLy4uLy4uJyk7XG5cbnZhciBoYXJkU291cmNlQ29uZmlnID0gZXZhbChcbiAgJyhmdW5jdGlvbigpIHsgcmV0dXJuICgnICtcbiAgcmVxdWlyZSgnZnMnKVxuICAucmVhZEZpbGVTeW5jKF9fZGlybmFtZSArICcvaGFyZC1zb3VyY2UtY29uZmlnLmpzJywgJ3V0ZjgnKSArXG4gICcpOyB9KSdcbikoKTtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIGNvbnRleHQ6IF9fZGlybmFtZSxcbiAgZW50cnk6ICcuL2xvYWRlci5qcyEuL2luZGV4LmpzJyxcbiAgb3V0cHV0OiB7XG4gICAgcGF0aDogX19kaXJuYW1lICsgJy90bXAnLFxuICAgIGZpbGVuYW1lOiAnbWFpbi5qcycsXG4gIH0sXG4gIHBsdWdpbnM6IFtcbiAgICBuZXcgSGFyZFNvdXJjZVdlYnBhY2tQbHVnaW4oaGFyZFNvdXJjZUNvbmZpZyksXG4gIF0sXG59O1xuIl0sInNvdXJjZVJvb3QiOiIvVXNlcnMvdHlsZXJhcmJ1cy9kZXYvcHJvdmlkZXIvc3JjIn0=

'use strict';

var fs = require('fs');
var path = require('path');

module.exports = function (source) {
  this.cacheable && this.cacheable();
  this.addDependency(path.join(__dirname, 'fib.js'));
  return source;
};
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImhhcmQtc291cmNlLXdlYnBhY2stcGx1Z2luL3Rlc3RzL2ZpeHR1cmVzL2xvYWRlci1jdXN0b20tbWlzc2luZy1kZXAvbG9hZGVyLmpzIl0sIm5hbWVzIjpbImZzIiwicmVxdWlyZSIsInBhdGgiLCJtb2R1bGUiLCJleHBvcnRzIiwic291cmNlIiwiY2FjaGVhYmxlIiwiYWRkRGVwZW5kZW5jeSIsImpvaW4iLCJfX2Rpcm5hbWUiXSwibWFwcGluZ3MiOiI7O0FBQUEsSUFBSUEsS0FBS0MsUUFBUSxJQUFSLENBQVQ7QUFDQSxJQUFJQyxPQUFPRCxRQUFRLE1BQVIsQ0FBWDs7QUFFQUUsT0FBT0MsT0FBUCxHQUFpQixVQUFTQyxNQUFULEVBQWlCO0FBQ2hDLE9BQUtDLFNBQUwsSUFBa0IsS0FBS0EsU0FBTCxFQUFsQjtBQUNBLE9BQUtDLGFBQUwsQ0FBbUJMLEtBQUtNLElBQUwsQ0FBVUMsU0FBVixFQUFxQixRQUFyQixDQUFuQjtBQUNBLFNBQU9KLE1BQVA7QUFDRCxDQUpEIiwiZmlsZSI6ImhhcmQtc291cmNlLXdlYnBhY2stcGx1Z2luL3Rlc3RzL2ZpeHR1cmVzL2xvYWRlci1jdXN0b20tbWlzc2luZy1kZXAvbG9hZGVyLmpzIiwic291cmNlc0NvbnRlbnQiOlsidmFyIGZzID0gcmVxdWlyZSgnZnMnKTtcbnZhciBwYXRoID0gcmVxdWlyZSgncGF0aCcpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKHNvdXJjZSkge1xuICB0aGlzLmNhY2hlYWJsZSAmJiB0aGlzLmNhY2hlYWJsZSgpO1xuICB0aGlzLmFkZERlcGVuZGVuY3kocGF0aC5qb2luKF9fZGlybmFtZSwgJ2ZpYi5qcycpKTtcbiAgcmV0dXJuIHNvdXJjZTtcbn07XG4iXSwic291cmNlUm9vdCI6Ii9Vc2Vycy90eWxlcmFyYnVzL2Rldi9wcm92aWRlci9zcmMifQ==

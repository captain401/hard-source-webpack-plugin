'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _fib = require('./fib');

Object.keys(_fib).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _fib[key];
    }
  });
});

var _fab = require('./fab');

Object.keys(_fab).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _fab[key];
    }
  });
});
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImhhcmQtc291cmNlLXdlYnBhY2stcGx1Z2luL3Rlc3RzL2ZpeHR1cmVzL2Jhc2UtZXMyMDE1LW1vZHVsZS1leHBvcnQtc3Rhci1zb21lL2V4cG9ydC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7OztBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTs7OztBQUNBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSIsImZpbGUiOiJoYXJkLXNvdXJjZS13ZWJwYWNrLXBsdWdpbi90ZXN0cy9maXh0dXJlcy9iYXNlLWVzMjAxNS1tb2R1bGUtZXhwb3J0LXN0YXItc29tZS9leHBvcnQuanMiLCJzb3VyY2VzQ29udGVudCI6WyJleHBvcnQgKiBmcm9tICcuL2ZpYic7XG5leHBvcnQgKiBmcm9tICcuL2ZhYic7XG4iXSwic291cmNlUm9vdCI6Ii9Vc2Vycy90eWxlcmFyYnVzL2Rldi9wcm92aWRlci9zcmMifQ==

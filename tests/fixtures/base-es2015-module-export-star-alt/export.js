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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImhhcmQtc291cmNlLXdlYnBhY2stcGx1Z2luL3Rlc3RzL2ZpeHR1cmVzL2Jhc2UtZXMyMDE1LW1vZHVsZS1leHBvcnQtc3Rhci1hbHQvZXhwb3J0LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7O0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBOzs7O0FBQ0E7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBIiwiZmlsZSI6ImhhcmQtc291cmNlLXdlYnBhY2stcGx1Z2luL3Rlc3RzL2ZpeHR1cmVzL2Jhc2UtZXMyMDE1LW1vZHVsZS1leHBvcnQtc3Rhci1hbHQvZXhwb3J0LmpzIiwic291cmNlc0NvbnRlbnQiOlsiZXhwb3J0ICogZnJvbSAnLi9maWInO1xuZXhwb3J0ICogZnJvbSAnLi9mYWInO1xuIl0sInNvdXJjZVJvb3QiOiIvVXNlcnMvdHlsZXJhcmJ1cy9kZXYvcHJvdmlkZXIvc3JjIn0=

'use strict';

var fs = require('fs');
var path = require('path');

module.exports = function (source) {};

module.exports.pitch = function (remainingRequest) {
  this.cacheable && this.cacheable();
  return '// ' + remainingRequest.replace(/\\/g, '/');
};
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImhhcmQtc291cmNlLXdlYnBhY2stcGx1Z2luL3Rlc3RzL2ZpeHR1cmVzL2xvYWRlci1jdXN0b20tbm8tZGVwLW1vdmVkL2xvYWRlci5qcyJdLCJuYW1lcyI6WyJmcyIsInJlcXVpcmUiLCJwYXRoIiwibW9kdWxlIiwiZXhwb3J0cyIsInNvdXJjZSIsInBpdGNoIiwicmVtYWluaW5nUmVxdWVzdCIsImNhY2hlYWJsZSIsInJlcGxhY2UiXSwibWFwcGluZ3MiOiI7O0FBQUEsSUFBSUEsS0FBS0MsUUFBUSxJQUFSLENBQVQ7QUFDQSxJQUFJQyxPQUFPRCxRQUFRLE1BQVIsQ0FBWDs7QUFFQUUsT0FBT0MsT0FBUCxHQUFpQixVQUFTQyxNQUFULEVBQWlCLENBQUUsQ0FBcEM7O0FBRUFGLE9BQU9DLE9BQVAsQ0FBZUUsS0FBZixHQUF1QixVQUFTQyxnQkFBVCxFQUEyQjtBQUNoRCxPQUFLQyxTQUFMLElBQWtCLEtBQUtBLFNBQUwsRUFBbEI7QUFDQSxTQUFPLFFBQVFELGlCQUFpQkUsT0FBakIsQ0FBeUIsS0FBekIsRUFBZ0MsR0FBaEMsQ0FBZjtBQUNELENBSEQiLCJmaWxlIjoiaGFyZC1zb3VyY2Utd2VicGFjay1wbHVnaW4vdGVzdHMvZml4dHVyZXMvbG9hZGVyLWN1c3RvbS1uby1kZXAtbW92ZWQvbG9hZGVyLmpzIiwic291cmNlc0NvbnRlbnQiOlsidmFyIGZzID0gcmVxdWlyZSgnZnMnKTtcbnZhciBwYXRoID0gcmVxdWlyZSgncGF0aCcpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKHNvdXJjZSkge307XG5cbm1vZHVsZS5leHBvcnRzLnBpdGNoID0gZnVuY3Rpb24ocmVtYWluaW5nUmVxdWVzdCkge1xuICB0aGlzLmNhY2hlYWJsZSAmJiB0aGlzLmNhY2hlYWJsZSgpO1xuICByZXR1cm4gJy8vICcgKyByZW1haW5pbmdSZXF1ZXN0LnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbn07XG4iXSwic291cmNlUm9vdCI6Ii9Vc2Vycy90eWxlcmFyYnVzL2Rldi9wcm92aWRlci9zcmMifQ==

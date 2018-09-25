'use strict';

var context = require.context('.', false, /\d/);

module.exports = context.keys().reduce(function (carry, key) {
  return carry + context(key);
}, 0);
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImhhcmQtc291cmNlLXdlYnBhY2stcGx1Z2luL3Rlc3RzL2ZpeHR1cmVzL2Jhc2UtY2hhbmdlLWNvbnRleHQvYS9pbmRleC5qcyJdLCJuYW1lcyI6WyJjb250ZXh0IiwicmVxdWlyZSIsIm1vZHVsZSIsImV4cG9ydHMiLCJrZXlzIiwicmVkdWNlIiwiY2FycnkiLCJrZXkiXSwibWFwcGluZ3MiOiI7O0FBQUEsSUFBSUEsVUFBVUMsUUFBUUQsT0FBUixDQUFnQixHQUFoQixFQUFxQixLQUFyQixFQUE0QixJQUE1QixDQUFkOztBQUVBRSxPQUFPQyxPQUFQLEdBQWlCSCxRQUFRSSxJQUFSLEdBQ2RDLE1BRGMsQ0FDUCxVQUFTQyxLQUFULEVBQWdCQyxHQUFoQixFQUFxQjtBQUMzQixTQUFPRCxRQUFRTixRQUFRTyxHQUFSLENBQWY7QUFDRCxDQUhjLEVBR1osQ0FIWSxDQUFqQiIsImZpbGUiOiJoYXJkLXNvdXJjZS13ZWJwYWNrLXBsdWdpbi90ZXN0cy9maXh0dXJlcy9iYXNlLWNoYW5nZS1jb250ZXh0L2EvaW5kZXguanMiLCJzb3VyY2VzQ29udGVudCI6WyJ2YXIgY29udGV4dCA9IHJlcXVpcmUuY29udGV4dCgnLicsIGZhbHNlLCAvXFxkLyk7XG5cbm1vZHVsZS5leHBvcnRzID0gY29udGV4dC5rZXlzKClcbiAgLnJlZHVjZShmdW5jdGlvbihjYXJyeSwga2V5KSB7XG4gICAgcmV0dXJuIGNhcnJ5ICsgY29udGV4dChrZXkpO1xuICB9LCAwKTtcbiJdLCJzb3VyY2VSb290IjoiL1VzZXJzL3R5bGVyYXJidXMvZGV2L3Byb3ZpZGVyL3NyYyJ9

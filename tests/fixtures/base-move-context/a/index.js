'use strict';

var context = require.context('.', true, /\d/);

module.exports = context.keys().reduce(function (carry, key) {
  return carry + context(key);
}, 0);
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImhhcmQtc291cmNlLXdlYnBhY2stcGx1Z2luL3Rlc3RzL2ZpeHR1cmVzL2Jhc2UtbW92ZS1jb250ZXh0L2EvaW5kZXguanMiXSwibmFtZXMiOlsiY29udGV4dCIsInJlcXVpcmUiLCJtb2R1bGUiLCJleHBvcnRzIiwia2V5cyIsInJlZHVjZSIsImNhcnJ5Iiwia2V5Il0sIm1hcHBpbmdzIjoiOztBQUFBLElBQUlBLFVBQVVDLFFBQVFELE9BQVIsQ0FBZ0IsR0FBaEIsRUFBcUIsSUFBckIsRUFBMkIsSUFBM0IsQ0FBZDs7QUFFQUUsT0FBT0MsT0FBUCxHQUFpQkgsUUFBUUksSUFBUixHQUNkQyxNQURjLENBQ1AsVUFBU0MsS0FBVCxFQUFnQkMsR0FBaEIsRUFBcUI7QUFDM0IsU0FBT0QsUUFBUU4sUUFBUU8sR0FBUixDQUFmO0FBQ0QsQ0FIYyxFQUdaLENBSFksQ0FBakIiLCJmaWxlIjoiaGFyZC1zb3VyY2Utd2VicGFjay1wbHVnaW4vdGVzdHMvZml4dHVyZXMvYmFzZS1tb3ZlLWNvbnRleHQvYS9pbmRleC5qcyIsInNvdXJjZXNDb250ZW50IjpbInZhciBjb250ZXh0ID0gcmVxdWlyZS5jb250ZXh0KCcuJywgdHJ1ZSwgL1xcZC8pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGNvbnRleHQua2V5cygpXG4gIC5yZWR1Y2UoZnVuY3Rpb24oY2FycnksIGtleSkge1xuICAgIHJldHVybiBjYXJyeSArIGNvbnRleHQoa2V5KTtcbiAgfSwgMCk7XG4iXSwic291cmNlUm9vdCI6Ii9Vc2Vycy90eWxlcmFyYnVzL2Rldi9wcm92aWRlci9zcmMifQ==

'use strict';

require([], function () {
  var fib = require('./fib');
  require([], function () {
    var sq = require('./sq');

    console.log(fib(sq(3)));
  });
});
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImhhcmQtc291cmNlLXdlYnBhY2stcGx1Z2luL3Rlc3RzL2ZpeHR1cmVzL2Jhc2UtY29kZS1zcGxpdC1uZXN0LWRldnRvb2wtc291cmNlLW1hcC9pbmRleC5qcyJdLCJuYW1lcyI6WyJyZXF1aXJlIiwiZmliIiwic3EiLCJjb25zb2xlIiwibG9nIl0sIm1hcHBpbmdzIjoiOztBQUFBQSxRQUFRLEVBQVIsRUFBWSxZQUFXO0FBQ3JCLE1BQUlDLE1BQU1ELGdCQUFWO0FBQ0FBLFVBQVEsRUFBUixFQUFZLFlBQVc7QUFDckIsUUFBSUUsS0FBS0YsZUFBVDs7QUFFQUcsWUFBUUMsR0FBUixDQUFZSCxJQUFJQyxHQUFHLENBQUgsQ0FBSixDQUFaO0FBQ0QsR0FKRDtBQUtELENBUEQiLCJmaWxlIjoiaGFyZC1zb3VyY2Utd2VicGFjay1wbHVnaW4vdGVzdHMvZml4dHVyZXMvYmFzZS1jb2RlLXNwbGl0LW5lc3QtZGV2dG9vbC1zb3VyY2UtbWFwL2luZGV4LmpzIiwic291cmNlc0NvbnRlbnQiOlsicmVxdWlyZShbXSwgZnVuY3Rpb24oKSB7XG4gIHZhciBmaWIgPSByZXF1aXJlKCcuL2ZpYicpO1xuICByZXF1aXJlKFtdLCBmdW5jdGlvbigpIHtcbiAgICB2YXIgc3EgPSByZXF1aXJlKCcuL3NxJyk7XG5cbiAgICBjb25zb2xlLmxvZyhmaWIoc3EoMykpKTtcbiAgfSk7XG59KTtcbiJdLCJzb3VyY2VSb290IjoiL1VzZXJzL3R5bGVyYXJidXMvZGV2L3Byb3ZpZGVyL3NyYyJ9

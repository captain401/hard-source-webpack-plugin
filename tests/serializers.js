'use strict';

var fs = require('fs');
var join = require('path').join;

var expect = require('chai').expect;

function promisify(f, o) {
  var ctx = o && o.context || null;
  return function () {
    var args = Array.from(arguments);
    return new Promise(function (resolve, reject) {
      args.push(function (err, value) {
        if (err) {
          return reject(err);
        }
        return resolve(value);
      });
      f.apply(ctx, args);
    });
  };
}

var AppendSerializerPlugin = require('../lib/SerializerAppendPlugin');
var Append2SerializerPlugin = require('../lib/SerializerAppend2Plugin');

var itCompilesTwice = require('./util').itCompilesTwice;
var itCompilesChange = require('./util').itCompilesChange;

describe('hard source serializers - compiles identically', function () {

  itCompilesTwice('serializer-append-base-1dep');
  itCompilesTwice('serializer-append-2-base-1dep');
  itCompilesTwice('serializer-cacache-base-1dep');
  itCompilesTwice('serializer-json-base-1dep');
  itCompilesTwice('serializer-leveldb-base-1dep');
});

describe('hard source serializers - serializer abilities', function () {

  itCompilesChange('serializer-append-base-1dep-compact', {
    'fib.js': ['module.exports = function(n) {', '  return n + (n > 0 ? n - 1 : 0);', '};'].join('\n'),
    'fib/index.js': null
  }, {
    'fib.js': null,
    'fib/index.js': ['module.exports = function(n) {', '  return n + (n > 0 ? n - 2 : 0);', '};'].join('\n')
  }, function (output) {
    expect(output.run1['main.js'].toString()).to.match(/n - 1/);
    expect(output.run2['main.js'].toString()).to.match(/n - 2/);

    var cachePath = join(__dirname, 'fixtures/serializer-append-base-1dep-compact/tmp/cache');

    var stat = promisify(fs.stat);
    var oldSize;

    return Promise.resolve().then(function () {
      return stat(join(cachePath, 'md5/log0000'));
    }).then(function (_stat) {
      oldSize = _stat.size;
    }).then(function () {
      return AppendSerializerPlugin.createSerializer({
        name: 'md5',
        cacheDirPath: cachePath
      }).compact();
    }).then(function () {
      return stat(join(cachePath, 'md5/log0000'));
    }).then(function (_stat) {
      expect(oldSize).to.be.gt(_stat.size);
    });
  });

  itCompilesChange('serializer-append-2-base-1dep-compact', {
    'fib.js': ['module.exports = function(n) {', '  return n + (n > 0 ? n - 1 : 0);', '};'].join('\n'),
    'fib/index.js': null
  }, {
    'fib.js': null,
    'fib/index.js': ['module.exports = function(n) {', '  return n + (n > 0 ? n - 2 : 0);', '};'].join('\n')
  }, function (output) {
    expect(output.run1['main.js'].toString()).to.match(/n - 1/);
    expect(output.run2['main.js'].toString()).to.match(/n - 2/);

    var cachePath = join(__dirname, 'fixtures/serializer-append-2-base-1dep-compact/tmp/cache');

    var stat = promisify(fs.stat);
    var oldSize;

    return Promise.resolve().then(function () {
      return Append2SerializerPlugin.createSerializer({
        name: 'md5',
        autoParse: true,
        cacheDirPath: cachePath
      }).sizes();
    }).then(function (_stat) {
      oldSize = _stat.total;
    }).then(function () {
      return Append2SerializerPlugin.createSerializer({
        name: 'md5',
        autoParse: true,
        cacheDirPath: cachePath
      }).compact();
    }).then(function () {
      return Append2SerializerPlugin.createSerializer({
        name: 'md5',
        autoParse: true,
        cacheDirPath: cachePath
      }).sizes();
    }).then(function (_stat) {
      expect(oldSize).to.be.gt(_stat.total);
    });
  });

  itCompilesChange('serializer-append-2-base-1dep-bad-cache', {}, {
    'tmp/cache/module/log0000': ''
  }, function (output) {
    expect(output.run2).to.eql(output.run2);
  });
});
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImhhcmQtc291cmNlLXdlYnBhY2stcGx1Z2luL3Rlc3RzL3NlcmlhbGl6ZXJzLmpzIl0sIm5hbWVzIjpbImZzIiwicmVxdWlyZSIsImpvaW4iLCJleHBlY3QiLCJwcm9taXNpZnkiLCJmIiwibyIsImN0eCIsImNvbnRleHQiLCJhcmdzIiwiQXJyYXkiLCJmcm9tIiwiYXJndW1lbnRzIiwiUHJvbWlzZSIsInJlc29sdmUiLCJyZWplY3QiLCJwdXNoIiwiZXJyIiwidmFsdWUiLCJhcHBseSIsIkFwcGVuZFNlcmlhbGl6ZXJQbHVnaW4iLCJBcHBlbmQyU2VyaWFsaXplclBsdWdpbiIsIml0Q29tcGlsZXNUd2ljZSIsIml0Q29tcGlsZXNDaGFuZ2UiLCJkZXNjcmliZSIsIm91dHB1dCIsInJ1bjEiLCJ0b1N0cmluZyIsInRvIiwibWF0Y2giLCJydW4yIiwiY2FjaGVQYXRoIiwiX19kaXJuYW1lIiwic3RhdCIsIm9sZFNpemUiLCJ0aGVuIiwiX3N0YXQiLCJzaXplIiwiY3JlYXRlU2VyaWFsaXplciIsIm5hbWUiLCJjYWNoZURpclBhdGgiLCJjb21wYWN0IiwiYmUiLCJndCIsImF1dG9QYXJzZSIsInNpemVzIiwidG90YWwiLCJlcWwiXSwibWFwcGluZ3MiOiI7O0FBQUEsSUFBSUEsS0FBS0MsUUFBUSxJQUFSLENBQVQ7QUFDQSxJQUFJQyxPQUFPRCxRQUFRLE1BQVIsRUFBZ0JDLElBQTNCOztBQUVBLElBQUlDLFNBQVNGLFFBQVEsTUFBUixFQUFnQkUsTUFBN0I7O0FBRUEsU0FBU0MsU0FBVCxDQUFtQkMsQ0FBbkIsRUFBc0JDLENBQXRCLEVBQXlCO0FBQ3ZCLE1BQUlDLE1BQU1ELEtBQUtBLEVBQUVFLE9BQVAsSUFBa0IsSUFBNUI7QUFDQSxTQUFPLFlBQVc7QUFDaEIsUUFBSUMsT0FBT0MsTUFBTUMsSUFBTixDQUFXQyxTQUFYLENBQVg7QUFDQSxXQUFPLElBQUlDLE9BQUosQ0FBWSxVQUFTQyxPQUFULEVBQWtCQyxNQUFsQixFQUEwQjtBQUMzQ04sV0FBS08s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bkIsQ0FBc0JDLEVBQXRCLENBQXlCUCxNQUFNVSxLQUEvQjtBQUNELEtBOUJNLENBQVA7QUErQkQsR0F0REQ7O0FBd0RBdkIsbUJBQWlCLHlDQUFqQixFQUE0RCxFQUE1RCxFQUFnRTtBQUM5RCxnQ0FBNEI7QUFEa0MsR0FBaEUsRUFFRyxVQUFTRSxNQUFULEVBQWlCO0FBQ2xCdEIsV0FBT3NCLE9BQU9LLElBQWQsRUFBb0JGLEVBQXBCLENBQXVCbUIsR0FBdkIsQ0FBMkJ0QixPQUFPSyxJQUFsQztBQUNELEdBSkQ7QUFNRCxDQTdHRCIsImZpbGUiOiJoYXJkLXNvdXJjZS13ZWJwYWNrLXBsdWdpbi90ZXN0cy9zZXJpYWxpemVycy5qcyIsInNvdXJjZXNDb250ZW50IjpbInZhciBmcyA9IHJlcXVpcmUoJ2ZzJyk7XG52YXIgam9pbiA9IHJlcXVpcmUoJ3BhdGgnKS5qb2luO1xuXG52YXIgZXhwZWN0ID0gcmVxdWlyZSgnY2hhaScpLmV4cGVjdDtcblxuZnVuY3Rpb24gcHJvbWlzaWZ5KGYsIG8pIHtcbiAgdmFyIGN0eCA9IG8gJiYgby5jb250ZXh0IHx8IG51bGw7XG4gIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICB2YXIgYXJncyA9IEFycmF5LmZyb20oYXJndW1lbnRzKTtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICBhcmdzLnB1c2goZnVuY3Rpb24oZXJyLCB2YWx1ZSkge1xuICAgICAgICBpZiAoZXJyKSB7cmV0dXJuIHJlamVjdChlcnIpO31cbiAgICAgICAgcmV0dXJuIHJlc29sdmUodmFsdWUpO1xuICAgICAgfSk7XG4gICAgICBmLmFwcGx5KGN0eCwgYXJncyk7XG4gICAgfSk7XG4gIH07XG59XG5cbnZhciBBcHBlbmRTZXJpYWxpemVyUGx1Z2luID0gcmVxdWlyZSgnLi4vbGliL1NlcmlhbGl6ZXJBcHBlbmRQbHVnaW4nKTtcbnZhciBBcHBlbmQyU2VyaWFsaXplclBsdWdpbiA9IHJlcXVpcmUoJy4uL2xpYi9TZXJpYWxpemVyQXBwZW5kMlBsdWdpbicpO1xuXG52YXIgaXRDb21waWxlc1R3aWNlID0gcmVxdWlyZSgnLi91dGlsJykuaXRDb21waWxlc1R3aWNlO1xudmFyIGl0Q29tcGlsZXNDaGFuZ2UgPSByZXF1aXJlKCcuL3V0aWwnKS5pdENvbXBpbGVzQ2hhbmdlO1xuXG5kZXNjcmliZSgnaGFyZCBzb3VyY2Ugc2VyaWFsaXplcnMgLSBjb21waWxlcyBpZGVudGljYWxseScsIGZ1bmN0aW9uKCkge1xuXG4gIGl0Q29tcGlsZXNUd2ljZSgnc2VyaWFsaXplci1hcHBlbmQtYmFzZS0xZGVwJyk7XG4gIGl0Q29tcGlsZXNUd2ljZSgnc2VyaWFsaXplci1hcHBlbmQtMi1iYXNlLTFkZXAnKTtcbiAgaXRDb21waWxlc1R3aWNlKCdzZXJpYWxpemVyLWNhY2FjaGUtYmFzZS0xZGVwJyk7XG4gIGl0Q29tcGlsZXNUd2ljZSgnc2VyaWFsaXplci1qc29uLWJhc2UtMWRlcCcpO1xuICBpdENvbXBpbGVzVHdpY2UoJ3NlcmlhbGl6ZXItbGV2ZWxkYi1iYXNlLTFkZXAnKTtcblxufSk7XG5cbmRlc2NyaWJlKCdoYXJkIHNvdXJjZSBzZXJpYWxpemVycyAtIHNlcmlhbGl6ZXIgYWJpbGl0aWVzJywgZnVuY3Rpb24oKSB7XG5cbiAgaXRDb21waWxlc0NoYW5nZSgnc2VyaWFsaXplci1hcHBlbmQtYmFzZS0xZGVwLWNvbXBhY3QnLCB7XG4gICAgJ2ZpYi5qcyc6IFtcbiAgICAgICdtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKG4pIHsnLFxuICAgICAgJyAgcmV0dXJuIG4gKyAobiA+IDAgPyBuIC0gMSA6IDApOycsXG4gICAgICAnfTsnLFxuICAgIF0uam9pbignXFxuJyksXG4gICAgJ2ZpYi9pbmRleC5qcyc6IG51bGwsXG4gIH0sIHtcbiAgICAnZmliLmpzJzogbnVsbCxcbiAgICAnZmliL2luZGV4LmpzJzogW1xuICAgICAgJ21vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24obikgeycsXG4gICAgICAnICByZXR1cm4gbiArIChuID4gMCA/IG4gLSAyIDogMCk7JyxcbiAgICAgICd9OycsXG4gICAgXS5qb2luKCdcXG4nKSxcbiAgfSwgZnVuY3Rpb24ob3V0cHV0KSB7XG4gICAgZXhwZWN0KG91dHB1dC5ydW4xWydtYWluLmpzJ10udG9TdHJpbmcoKSkudG8ubWF0Y2goL24gLSAxLyk7XG4gICAgZXhwZWN0KG91dHB1dC5ydW4yWydtYWluLmpzJ10udG9TdHJpbmcoKSkudG8ubWF0Y2goL24gLSAyLyk7XG5cbiAgICB2YXIgY2FjaGVQYXRoID0gam9pbihfX2Rpcm5hbWUsICdmaXh0dXJlcy9zZXJpYWxpemVyLWFwcGVuZC1iYXNlLTFkZXAtY29tcGFjdC90bXAvY2FjaGUnKTtcblxuICAgIHZhciBzdGF0ID0gcHJvbWlzaWZ5KGZzLnN0YXQpO1xuICAgIHZhciBvbGRTaXplO1xuXG4gICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpXG4gICAgLnRoZW4oZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gc3RhdChqb2luKGNhY2hlUGF0aCwgJ21kNS9sb2cwMDAwJykpO1xuICAgIH0pXG4gICAgLnRoZW4oZnVuY3Rpb24oX3N0YXQpIHtcbiAgICAgIG9sZFNpemUgPSBfc3RhdC5zaXplO1xuICAgIH0pXG4gICAgLnRoZW4oZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gQXBwZW5kU2VyaWFsaXplclBsdWdpbi5jcmVhdGVTZXJpYWxpemVyKHtcbiAgICAgICAgbmFtZTogJ21kNScsXG4gICAgICAgIGNhY2hlRGlyUGF0aDogY2FjaGVQYXRoXG4gICAgICB9KVxuICAgICAgLmNvbXBhY3QoKTtcbiAgICB9KVxuICAgIC50aGVuKGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHN0YXQoam9pbihjYWNoZVBhdGgsICdtZDUvbG9nMDAwMCcpKTtcbiAgICB9KVxuICAgIC50aGVuKGZ1bmN0aW9uKF9zdGF0KSB7XG4gICAgICBleHBlY3Qob2xkU2l6ZSkudG8uYmUuZ3QoX3N0YXQuc2l6ZSk7XG4gICAgfSk7XG4gIH0pO1xuXG4gIGl0Q29tcGlsZXNDaGFuZ2UoJ3NlcmlhbGl6ZXItYXBwZW5kLTItYmFzZS0xZGVwLWNvbXBhY3QnLCB7XG4gICAgJ2ZpYi5qcyc6IFtcbiAgICAgICdtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKG4pIHsnLFxuICAgICAgJyAgcmV0dXJuIG4gKyAobiA+IDAgPyBuIC0gMSA6IDApOycsXG4gICAgICAnfTsnLFxuICAgIF0uam9pbignXFxuJyksXG4gICAgJ2ZpYi9pbmRleC5qcyc6IG51bGwsXG4gIH0sIHtcbiAgICAnZmliLmpzJzogbnVsbCxcbiAgICAnZmliL2luZGV4LmpzJzogW1xuICAgICAgJ21vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24obikgeycsXG4gICAgICAnICByZXR1cm4gbiArIChuID4gMCA/IG4gLSAyIDogMCk7JyxcbiAgICAgICd9OycsXG4gICAgXS5qb2luKCdcXG4nKSxcbiAgfSwgZnVuY3Rpb24ob3V0cHV0KSB7XG4gICAgZXhwZWN0KG91dHB1dC5ydW4xWydtYWluLmpzJ10udG9TdHJpbmcoKSkudG8ubWF0Y2goL24gLSAxLyk7XG4gICAgZXhwZWN0KG91dHB1dC5ydW4yWydtYWluLmpzJ10udG9TdHJpbmcoKSkudG8ubWF0Y2goL24gLSAyLyk7XG5cbiAgICB2YXIgY2FjaGVQYXRoID0gam9pbihfX2Rpcm5hbWUsICdmaXh0dXJlcy9zZXJpYWxpemVyLWFwcGVuZC0yLWJhc2UtMWRlcC1jb21wYWN0L3RtcC9jYWNoZScpO1xuXG4gICAgdmFyIHN0YXQgPSBwcm9taXNpZnkoZnMuc3RhdCk7XG4gICAgdmFyIG9sZFNpemU7XG5cbiAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKClcbiAgICAudGhlbihmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBBcHBlbmQyU2VyaWFsaXplclBsdWdpbi5jcmVhdGVTZXJpYWxpemVyKHtcbiAgICAgICAgbmFtZTogJ21kNScsXG4gICAgICAgIGF1dG9QYXJzZTogdHJ1ZSxcbiAgICAgICAgY2FjaGVEaXJQYXRoOiBjYWNoZVBhdGhcbiAgICAgIH0pXG4gICAgICAuc2l6ZXMoKTtcbiAgICB9KVxuICAgIC50aGVuKGZ1bmN0aW9uKF9zdGF0KSB7XG4gICAgICBvbGRTaXplID0gX3N0YXQudG90YWw7XG4gICAgfSlcbiAgICAudGhlbihmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBBcHBlbmQyU2VyaWFsaXplclBsdWdpbi5jcmVhdGVTZXJpYWxpemVyKHtcbiAgICAgICAgbmFtZTogJ21kNScsXG4gICAgICAgIGF1dG9QYXJzZTogdHJ1ZSxcbiAgICAgICAgY2FjaGVEaXJQYXRoOiBjYWNoZVBhdGhcbiAgICAgIH0pXG4gICAgICAuY29tcGFjdCgpO1xuICAgIH0pXG4gICAgLnRoZW4oZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gQXBwZW5kMlNlcmlhbGl6ZXJQbHVnaW4uY3JlYXRlU2VyaWFsaXplcih7XG4gICAgICAgIG5hbWU6ICdtZDUnLFxuICAgICAgICBhdXRvUGFyc2U6IHRydWUsXG4gICAgICAgIGNhY2hlRGlyUGF0aDogY2FjaGVQYXRoXG4gICAgICB9KVxuICAgICAgLnNpemVzKCk7XG4gICAgfSlcbiAgICAudGhlbihmdW5jdGlvbihfc3RhdCkge1xuICAgICAgZXhwZWN0KG9sZFNpemUpLnRvLmJlLmd0KF9zdGF0LnRvdGFsKTtcbiAgICB9KTtcbiAgfSk7XG5cbiAgaXRDb21waWxlc0NoYW5nZSgnc2VyaWFsaXplci1hcHBlbmQtMi1iYXNlLTFkZXAtYmFkLWNhY2hlJywge30sIHtcbiAgICAndG1wL2NhY2hlL21vZHVsZS9sb2cwMDAwJzogJycsXG4gIH0sIGZ1bmN0aW9uKG91dHB1dCkge1xuICAgIGV4cGVjdChvdXRwdXQucnVuMikudG8uZXFsKG91dHB1dC5ydW4yKTtcbiAgfSk7XG5cbn0pO1xuIl0sInNvdXJjZVJvb3QiOiIvVXNlcnMvdHlsZXJhcmJ1cy9kZXYvcHJvdmlkZXIvc3JjIn0=

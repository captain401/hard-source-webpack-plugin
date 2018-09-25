#!/usr/bin/env node
'use strict';

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

const rimraf = require('rimraf');

const AppendSerializer = require('../lib/hard-source-append-2-serializer');
const pify = require('../lib/util/promisify');

const lorem = `Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod
  tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam,
  quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo
  consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse
  cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non
  proident, sunt in culpa qui officia deserunt mollit anim id est laborum.`;
const superIpsum = Array.from(new Array(100), () => lorem).join('\n\n');

const diskFile = `${__dirname}/../tmp/append`;

const clean = () => {
  return pify(rimraf)(diskFile);
};

const serializer = () => {
  return new AppendSerializer({
    cacheDirPath: diskFile
  });
};

const read = () => {
  const s = serializer();
  return s.read();
};

const write = (size, lorem) => {
  const s = serializer();
  const ops = Array.from(new Array(size), (_, i) => ({
    key: `lorem${i}`,
    value: lorem
  }));
  return s.write(ops);
};

const sizes = [128, 256, 512, 1024, 2048, 4096];
const main = (() => {
  var _ref = _asyncToGenerator(function* () {
    for (const size of sizes) {
      yield clean();
      let start = Date.now();
      yield write(size, superIpsum);
      console.log('write', size, Date.now() - start);
      start = Date.now();
      const map = yield read();
      console.log('read', size, Date.now() - start);

      // validate
      if (Object.values(map).length !== size) {
        throw new Error(`missing entries: ${Object.values(map).length} !== ${size}`);
      }
      for (const value of Object.values(map)) {
        if (value !== superIpsum) {
          throw new Error('bad write or read');
        }
      }
    }
  });

  return function main() {
    return _ref.apply(this, arguments);
  };
})();

main();
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImhhcmQtc291cmNlLXdlYnBhY2stcGx1Z2luL2Jpbi9iZW5jaG1hcmstYXBwZW5kLXNlcmlhbGl6ZXIuanMiXSwibmFtZXMiOlsicmltcmFmIiwicmVxdWlyZSIsIkFwcGVuZFNlcmlhbGl6ZXIiLCJwaWZ5IiwibG9yZW0iLCJzdXBlcklwc3VtIiwiQXJyYXkiLCJmcm9tIiwiam9pbiIsImRpc2tGaWxlIiwiX19kaXJuYW1lIiwiY2xlYW4iLCJzZXJpYWxpemVyIiwiY2FjaGVEaXJQYXRoIiwicmVhZCIsInMiLCJ3cml0ZSIsInNpemUiLCJvcHMiLCJfIiwiaSIsImtleSIsInZhbHVlIiwic2l6ZXMiLCJtYWluIiwic3RhcnQiLCJEYXRlIiwibm93IiwiY29uc29sZSIsImxvZyIsIm1hcCIsIk9iamVjdCIsInZhbHVlcyIsImxlbmd0aCIsIkVycm9yIl0sIm1hcHBpbmdzIjoiOzs7O0FBRUEsTUFBTUEsU0FBU0MsUUFBUSxRQUFSLENBQWY7O0FBRUEsTUFBTUMsbUJBQW1CRCxpREFBekI7QUFDQSxNQUFNRSxPQUFPRixnQ0FBYjs7QUFFQSxNQUFNRyxRQUFTOzs7OzsyRUFBZjtBQU1BLE1BQU1DLGFBQWFDLE1BQU1DLElBQU4sQ0FBVyxJQUFJRCxLQUFKLENBQVUsR0FBVixDQUFYLEVBQTJCLE1BQU1GLEtBQWpDLEVBQXdDSSxJQUF4QyxDQUE2QyxNQUE3QyxDQUFuQjs7QUFFQSxNQUFNQyxXQUFZLEdBQUVDLFNBQVUsZ0JBQTlCOztBQUVBLE1BQU1DLFFBQVEsTUFBTTtBQUNsQixTQUFPUixLQUFLSCxNQUFMLEVBQWFTLFFBQWIsQ0FBUDtBQUNELENBRkQ7O0FBSUEsTUFBTUcsYUFBYSxNQUFNO0FBQ3ZCLFNBQU8sSUFBSVYsZ0JBQUosQ0FBcUI7QUFDMUJXLGtCQUFjSjtBQURZLEdBQXJCLENBQVA7QUFHRCxDQUpEOztBQU1BLE1BQU1LLE9BQU8sTUFBTTtBQUNqQixRQUFNQyxJQUFJSCxZQUFWO0FBQ0EsU0FBT0csRUFBRUQsSUFBRixFQUFQO0FBQ0QsQ0FIRDs7QUFLQSxNQUFNRSxRQUFRLENBQUNDLElBQUQsRUFBT2IsS0FBUCxLQUFpQjtBQUM3QixRQUFNVyxJQUFJSCxZQUFWO0FBQ0EsUUFBTU0sTUFBTVosTUFBTUMsSUFBTixDQUFXLElBQUlELEtBQUosQ0FBVVcsSUFBVixDQUFYLEVBQTRCLENBQUNFLENBQUQsRUFBSUMsQ0FBSixNQUFXO0FBQ2pEQyxTQUFNLFFBQU9ELENBQUUsRUFEa0M7QUFFakRFLFdBQU9sQjtBQUYwQyxHQUFYLENBQTVCLENBQVo7QUFJQSxTQUFPVyxFQUFFQyxLQUFGLENBQVFFLEdBQVIsQ0FBUDtBQUNELENBUEQ7O0FBU0EsTUFBTUssUUFBUSxDQUFDLEdBQUQsRUFBTSxHQUFOLEVBQVcsR0FBWCxFQUFnQixJQUFoQixFQUFzQixJQUF0QixFQUE0QixJQUE1QixDQUFkO0FBQ0EsTUFBTUM7QUFBQSwrQkFBTyxhQUFZO0FBQ3ZCLFNBQUssTUFBTVAsSUFBWCxJQUFtQk0sS0FBbkIsRUFBMEI7QUFDeEIsWUFBTVosT0FBTjtBQUNBLFVBQUljLFFBQVFDLEtBQUtDLEdBQUwsRUFBWjtBQUNBLFlBQU1YLE1BQU1DLElBQU4sRUFBWVosVUFBWixDQUFOO0FBQ0F1QixjQUFRQyxHQUFSLENBQVksT0FBWixFQUFxQlosSUFBckIsRUFBMkJTLEtBQUtDLEdBQUwsS0FBYUYsS0FBeEM7QUFDQUEsY0FBUUMsS0FBS0MsR0FBTCxFQUFSO0FBQ0EsWUFBTUcsTUFBTSxNQUFNaEIsTUFBbEI7QUFDQWMsY0FBUUMsR0FBUixDQUFZLE1BQVosRUFBb0JaLElBQXBCLEVBQTBCUyxLQUFLQyxHQUFMLEtBQWFGLEtBQXZDOztBQUVBO0FBQ0EsVUFBSU0sT0FBT0MsTUFBUCxDQUFjRixHQUFkLEVBQW1CRyxNQUFuQixLQUE4QmhCLElBQWxDLEVBQXdDO0FBQ3RDLGNBQU0sSUFBSWlCLEtBQUosQ0FDSCxvQkFBbUJILE9BQU9DLE1BQVAsQ0FBY0YsR0FBZCxFQUFtQkcsTUFBTyxRQUFPaEIsSUFBSyxFQUR0RCxDQUFOO0FBR0Q7QUFDRCxXQUFLLE1BQU1LLEtBQVgsSUFBb0JTLE9BQU9DLE1BQVAsQ0FBY0YsR0FBZCxDQUFwQixFQUF3QztBQUN0QyxZQUFJUixVQUFVakIsVUFBZCxFQUEwQjtBQUN4QixnQkFBTSxJQUFJNkIsS0FBSixDQUFVLG1CQUFWLENBQU47QUFDRDtBQUNGO0FBQ0Y7QUFDRixHQXRCSzs7QUFBQTtBQUFBO0FBQUE7QUFBQSxJQUFOOztBQXdCQVYiLCJmaWxlIjoiaGFyZC1zb3VyY2Utd2VicGFjay1wbHVnaW4vYmluL2JlbmNobWFyay1hcHBlbmQtc2VyaWFsaXplci5qcyIsInNvdXJjZXNDb250ZW50IjpbIlxuXG5jb25zdCByaW1yYWYgPSByZXF1aXJlKCdyaW1yYWYnKTtcblxuY29uc3QgQXBwZW5kU2VyaWFsaXplciA9IHJlcXVpcmUoJy4uL2xpYi9oYXJkLXNvdXJjZS1hcHBlbmQtMi1zZXJpYWxpemVyJyk7XG5jb25zdCBwaWZ5ID0gcmVxdWlyZSgnLi4vbGliL3V0aWwvcHJvbWlzaWZ5Jyk7XG5cbmNvbnN0IGxvcmVtID0gYExvcmVtIGlwc3VtIGRvbG9yIHNpdCBhbWV0LCBjb25zZWN0ZXR1ciBhZGlwaXNjaW5nIGVsaXQsIHNlZCBkbyBlaXVzbW9kXG4gIHRlbXBvciBpbmNpZGlkdW50IHV0IGxhYm9yZSBldCBkb2xvcmUgbWFnbmEgYWxpcXVhLiBVdCBlbmltIGFkIG1pbmltIHZlbmlhbSxcbiAgcXVpcyBub3N0cnVkIGV4ZXJjaXRhdGlvbiB1bGxhbWNvIGxhYm9yaXMgbmlzaSB1dCBhbGlxdWlwIGV4IGVhIGNvbW1vZG9cbiAgY29uc2VxdWF0LiBEdWlzIGF1dGUgaXJ1cmUgZG9sb3IgaW4gcmVwcmVoZW5kZXJpdCBpbiB2b2x1cHRhdGUgdmVsaXQgZXNzZVxuICBjaWxsdW0gZG9sb3JlIGV1IGZ1Z2lhdCBudWxsYSBwYXJpYXR1ci4gRXhjZXB0ZXVyIHNpbnQgb2NjYWVjYXQgY3VwaWRhdGF0IG5vblxuICBwcm9pZGVudCwgc3VudCBpbiBjdWxwYSBxdWkgb2ZmaWNpYSBkZXNlcnVudCBtb2xsaXQgYW5pbSBpZCBlc3QgbGFib3J1bS5gO1xuY29uc3Qgc3VwZXJJcHN1bSA9IEFycmF5LmZyb20obmV3IEFycmF5KDEwMCksICgpID0+IGxvcmVtKS5qb2luKCdcXG5cXG4nKTtcblxuY29uc3QgZGlza0ZpbGUgPSBgJHtfX2Rpcm5hbWV9Ly4uL3RtcC9hcHBlbmRgO1xuXG5jb25zdCBjbGVhbiA9ICgpID0+IHtcbiAgcmV0dXJuIHBpZnkocmltcmFmKShkaXNrRmlsZSk7XG59O1xuXG5jb25zdCBzZXJpYWxpemVyID0gKCkgPT4ge1xuICByZXR1cm4gbmV3IEFwcGVuZFNlcmlhbGl6ZXIoe1xuICAgIGNhY2hlRGlyUGF0aDogZGlza0ZpbGUsXG4gIH0pO1xufTtcblxuY29uc3QgcmVhZCA9ICgpID0+IHtcbiAgY29uc3QgcyA9IHNlcmlhbGl6ZXIoKTtcbiAgcmV0dXJuIHMucmVhZCgpO1xufTtcblxuY29uc3Qgd3JpdGUgPSAoc2l6ZSwgbG9yZW0pID0+IHtcbiAgY29uc3QgcyA9IHNlcmlhbGl6ZXIoKTtcbiAgY29uc3Qgb3BzID0gQXJyYXkuZnJvbShuZXcgQXJyYXkoc2l6ZSksIChfLCBpKSA9PiAoe1xuICAgIGtleTogYGxvcmVtJHtpfWAsXG4gICAgdmFsdWU6IGxvcmVtLFxuICB9KSk7XG4gIHJldHVybiBzLndyaXRlKG9wcyk7XG59O1xuXG5jb25zdCBzaXplcyA9IFsxMjgsIDI1NiwgNTEyLCAxMDI0LCAyMDQ4LCA0MDk2XTtcbmNvbnN0IG1haW4gPSBhc3luYyAoKSA9PiB7XG4gIGZvciAoY29uc3Qgc2l6ZSBvZiBzaXplcykge1xuICAgIGF3YWl0IGNsZWFuKCk7XG4gICAgbGV0IHN0YXJ0ID0gRGF0ZS5ub3coKTtcbiAgICBhd2FpdCB3cml0ZShzaXplLCBzdXBlcklwc3VtKTtcbiAgICBjb25zb2xlLmxvZygnd3JpdGUnLCBzaXplLCBEYXRlLm5vdygpIC0gc3RhcnQpO1xuICAgIHN0YXJ0ID0gRGF0ZS5ub3coKTtcbiAgICBjb25zdCBtYXAgPSBhd2FpdCByZWFkKCk7XG4gICAgY29uc29sZS5sb2coJ3JlYWQnLCBzaXplLCBEYXRlLm5vdygpIC0gc3RhcnQpO1xuXG4gICAgLy8gdmFsaWRhdGVcbiAgICBpZiAoT2JqZWN0LnZhbHVlcyhtYXApLmxlbmd0aCAhPT0gc2l6ZSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICBgbWlzc2luZyBlbnRyaWVzOiAke09iamVjdC52YWx1ZXMobWFwKS5sZW5ndGh9ICE9PSAke3NpemV9YCxcbiAgICAgICk7XG4gICAgfVxuICAgIGZvciAoY29uc3QgdmFsdWUgb2YgT2JqZWN0LnZhbHVlcyhtYXApKSB7XG4gICAgICBpZiAodmFsdWUgIT09IHN1cGVySXBzdW0pIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdiYWQgd3JpdGUgb3IgcmVhZCcpO1xuICAgICAgfVxuICAgIH1cbiAgfVxufTtcblxubWFpbigpO1xuIl0sInNvdXJjZVJvb3QiOiIvVXNlcnMvdHlsZXJhcmJ1cy9kZXYvcHJvdmlkZXIvc3JjIn0=

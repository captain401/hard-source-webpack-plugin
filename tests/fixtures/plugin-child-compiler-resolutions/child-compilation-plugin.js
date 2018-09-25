'use strict';

var SingleEntryPlugin = require('webpack/lib/SingleEntryPlugin');

var RuleSet;
try {
  RuleSet = require('webpack/lib/RuleSet');
} catch (error) {}

module.exports = ChildCompilationPlugin;

function ChildCompilationPlugin(loaders) {
  this.loaders = loaders;
};

ChildCompilationPlugin.prototype.apply = function (compiler) {
  var loaders = this.loaders;
  compiler.plugin('make', function (compilation, cb) {
    var compilerName = 'child';
    var child = compilation.createChildCompiler(compilerName, {});
    child.apply(new SingleEntryPlugin(compiler.options.context, compiler.options.entry, 'child'));
    child.plugin('compilation', function (compilation, params) {
      if (RuleSet) {
        params.normalModuleFactory.rules = new RuleSet(loaders);
      } else {
        params.normalModuleFactory.loaders.list = loaders;
      }
    });
    // Create a nested compilation cache. Webpack plugins making child compilers
    // must do this to not collide with modules used by other child compilations
    // (or the top level one). As well hard-source uses this to build a
    // compilation identifier so it can cache modules and other data per
    // compilation.
    child.plugin('compilation', function (compilation) {
      if (compilation.cache) {
        if (!compilation.cache[compilerName]) {
          compilation.cache[compilerName] = {};
        }
        compilation.cache = compilation.cache[compilerName];
      }
    });
    child.runAsChild(cb);
  });
};
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImhhcmQtc291cmNlLXdlYnBhY2stcGx1Z2luL3Rlc3RzL2ZpeHR1cmVzL3BsdWdpbi1jaGlsZC1jb21waWxlci1yZXNvbHV0aW9ucy9jaGlsZC1jb21waWxhdGlvbi1wbHVnaW4uanMiXSwibmFtZXMiOlsiU2luZ2xlRW50cnlQbHVnaW4iLCJyZXF1aXJlIiwiUnVsZVNldCIsImVycm9yIiwibW9kdWxlIiwiZXhwb3J0cyIsIkNoaWxkQ29tcGlsYXRpb25QbHVnaW4iLCJsb2FkZXJzIiwicHJvdG90eXBlIiwiYXBwbHkiLCJjb21waWxlciIsInBsdWdpbiIsImNvbXBpbGF0aW9uIiwiY2IiLCJjb21waWxlck5hbWUiLCJjaGlsZCIsImNyZWF0ZUNoaWxkQ29tcGlsZXIiLCJvcHRpb25zIiwiY29udGV4dCIsImVudHJ5IiwicGFyYW1zIiwibm9ybWFsTW9kdWxlRmFjdG9yeSIsInJ1bGVzIiwibGlzdCIsImNhY2hlIiwicnVuQXNDaGlsZCJdLCJtYXBwaW5ncyI6Ijs7QUFBQSxJQUFJQSxvQkFBb0JDLFFBQVEsK0JBQVIsQ0FBeEI7O0FBRUEsSUFBSUMsT0FBSjtBQUNBLElBQUk7QUFDRkEsWUFBVUQsUUFBUSxxQkFBUixDQUFWO0FBQ0QsQ0FGRCxDQUdBLE9BQU1FLEtBQU4sRUFBYSxDQUFFOztBQUVmQyxPQUFPQyxPQUFQLEdBQWlCQyxzQkFBakI7O0FBRUEsU0FBU0Esc0JBQVQsQ0FBZ0NDLE9BQWhDLEVBQXlDO0FBQ3ZDLE9BQUtBLE9BQUwsR0FBZUEsT0FBZjtBQUNEOztBQUVERCx1QkFBdUJFLFNBQXZCLENBQWlDQyxLQUFqQyxHQUF5QyxVQUFTQyxRQUFULEVBQW1CO0FBQzFELE1BQUlILFVBQVUsS0FBS0EsT0FBbkI7QUFDQUcsV0FBU0MsTUFBVCxDQUFnQixNQUFoQixFQUF3QixVQUFTQyxXQUFULEVBQXNCQyxFQUF0QixFQUEwQjtBQUNoRCxRQUFJQyxlQUFlLE9BQW5CO0FBQ0EsUUFBSUMsUUFBUUgsWUFBWUksbUJBQVosQ0FBZ0NGLFlBQWhDLEVBQThDLEVBQTlDLENBQVo7QUFDQUMsVUFBTU4sS0FBTixDQUFZLElBQUlULGlCQUFKLENBQXNCVSxTQUFTTyxPQUFULENBQWlCQyxPQUF2QyxFQUFnRFIsU0FBU08sT0FBVCxDQUFpQkUsS0FBakUsRUFBd0UsT0FBeEUsQ0FBWjtBQUNBSixVQUFNSixNQUFOLENBQWEsYUFBYixFQUE0QixVQUFTQyxXQUFULEVBQXNCUSxNQUF0QixFQUE4QjtBQUN4RCxVQUFJbEIsT0FBSixFQUFhO0FBQ1hrQixlQUFPQyxtQkFBUCxDQUEyQkMsS0FBM0IsR0FBbUMsSUFBSXBCLE9BQUosQ0FBWUssT0FBWixDQUFuQztBQUNELE9BRkQsTUFHSztBQUNIYSxlQUFPQyxtQkFBUCxDQUEyQmQsT0FBM0IsQ0FBbUNnQixJQUFuQyxHQUEwQ2hCLE9BQTFDO0FBQ0Q7QUFDRixLQVBEO0FBUUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBUSxVQUFNSixNQUFOLENBQWEsYUFBYixFQUE0QixVQUFVQyxXQUFWLEVBQXVCO0FBQ2pELFVBQUlBLFlBQVlZLEtBQWhCLEVBQXVCO0FBQ3JCLFlBQUksQ0FBQ1osWUFBWVksS0FBWixDQUFrQlYsWUFBbEIsQ0FBTCxFQUFzQztBQUNwQ0Ysc0JBQVlZLEtBQVosQ0FBa0JWLFlBQWxCLElBQWtDLEVBQWxDO0FBQ0Q7QUFDREYsb0JBQVlZLEtBQVosR0FBb0JaLFlBQVlZLEtBQVosQ0FBa0JWLFlBQWxCLENBQXBCO0FBQ0Q7QUFDRixLQVBEO0FBUUFDLFVBQU1VLFVBQU4sQ0FBaUJaLEVBQWpCO0FBQ0QsR0ExQkQ7QUEyQkQsQ0E3QkQiLCJmaWxlIjoiaGFyZC1zb3VyY2Utd2VicGFjay1wbHVnaW4vdGVzdHMvZml4dHVyZXMvcGx1Z2luLWNoaWxkLWNvbXBpbGVyLXJlc29sdXRpb25zL2NoaWxkLWNvbXBpbGF0aW9uLXBsdWdpbi5qcyIsInNvdXJjZXNDb250ZW50IjpbInZhciBTaW5nbGVFbnRyeVBsdWdpbiA9IHJlcXVpcmUoJ3dlYnBhY2svbGliL1NpbmdsZUVudHJ5UGx1Z2luJyk7XG5cbnZhciBSdWxlU2V0O1xudHJ5IHtcbiAgUnVsZVNldCA9IHJlcXVpcmUoJ3dlYnBhY2svbGliL1J1bGVTZXQnKTtcbn1cbmNhdGNoKGVycm9yKSB7fVxuXG5tb2R1bGUuZXhwb3J0cyA9IENoaWxkQ29tcGlsYXRpb25QbHVnaW47XG5cbmZ1bmN0aW9uIENoaWxkQ29tcGlsYXRpb25QbHVnaW4obG9hZGVycykge1xuICB0aGlzLmxvYWRlcnMgPSBsb2FkZXJzO1xufTtcblxuQ2hpbGRDb21waWxhdGlvblBsdWdpbi5wcm90b3R5cGUuYXBwbHkgPSBmdW5jdGlvbihjb21waWxlcikge1xuICB2YXIgbG9hZGVycyA9IHRoaXMubG9hZGVycztcbiAgY29tcGlsZXIucGx1Z2luKCdtYWtlJywgZnVuY3Rpb24oY29tcGlsYXRpb24sIGNiKSB7XG4gICAgdmFyIGNvbXBpbGVyTmFtZSA9ICdjaGlsZCc7XG4gICAgdmFyIGNoaWxkID0gY29tcGlsYXRpb24uY3JlYXRlQ2hpbGRDb21waWxlcihjb21waWxlck5hbWUsIHt9KTtcbiAgICBjaGlsZC5hcHBseShuZXcgU2luZ2xlRW50cnlQbHVnaW4oY29tcGlsZXIub3B0aW9ucy5jb250ZXh0LCBjb21waWxlci5vcHRpb25zLmVudHJ5LCAnY2hpbGQnKSk7XG4gICAgY2hpbGQucGx1Z2luKCdjb21waWxhdGlvbicsIGZ1bmN0aW9uKGNvbXBpbGF0aW9uLCBwYXJhbXMpIHtcbiAgICAgIGlmIChSdWxlU2V0KSB7XG4gICAgICAgIHBhcmFtcy5ub3JtYWxNb2R1bGVGYWN0b3J5LnJ1bGVzID0gbmV3IFJ1bGVTZXQobG9hZGVycyk7XG4gICAgICB9XG4gICAgICBlbHNlIHtcbiAgICAgICAgcGFyYW1zLm5vcm1hbE1vZHVsZUZhY3RvcnkubG9hZGVycy5saXN0ID0gbG9hZGVycztcbiAgICAgIH1cbiAgICB9KTtcbiAgICAvLyBDcmVhdGUgYSBuZXN0ZWQgY29tcGlsYXRpb24gY2FjaGUuIFdlYnBhY2sgcGx1Z2lucyBtYWtpbmcgY2hpbGQgY29tcGlsZXJzXG4gICAgLy8gbXVzdCBkbyB0aGlzIHRvIG5vdCBjb2xsaWRlIHdpdGggbW9kdWxlcyB1c2VkIGJ5IG90aGVyIGNoaWxkIGNvbXBpbGF0aW9uc1xuICAgIC8vIChvciB0aGUgdG9wIGxldmVsIG9uZSkuIEFzIHdlbGwgaGFyZC1zb3VyY2UgdXNlcyB0aGlzIHRvIGJ1aWxkIGFcbiAgICAvLyBjb21waWxhdGlvbiBpZGVudGlmaWVyIHNvIGl0IGNhbiBjYWNoZSBtb2R1bGVzIGFuZCBvdGhlciBkYXRhIHBlclxuICAgIC8vIGNvbXBpbGF0aW9uLlxuICAgIGNoaWxkLnBsdWdpbignY29tcGlsYXRpb24nLCBmdW5jdGlvbiAoY29tcGlsYXRpb24pIHtcbiAgICAgIGlmIChjb21waWxhdGlvbi5jYWNoZSkge1xuICAgICAgICBpZiAoIWNvbXBpbGF0aW9uLmNhY2hlW2NvbXBpbGVyTmFtZV0pIHtcbiAgICAgICAgICBjb21waWxhdGlvbi5jYWNoZVtjb21waWxlck5hbWVdID0ge307XG4gICAgICAgIH1cbiAgICAgICAgY29tcGlsYXRpb24uY2FjaGUgPSBjb21waWxhdGlvbi5jYWNoZVtjb21waWxlck5hbWVdO1xuICAgICAgfVxuICAgIH0pO1xuICAgIGNoaWxkLnJ1bkFzQ2hpbGQoY2IpO1xuICB9KTtcbn07XG4iXSwic291cmNlUm9vdCI6Ii9Vc2Vycy90eWxlcmFyYnVzL2Rldi9wcm92aWRlci9zcmMifQ==

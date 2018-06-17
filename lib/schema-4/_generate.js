'use strict';

require('source-map-support/register');

/** prelude
const serial = require('../util/serial');
const relateContext = require('../util/relate-context');

const LocalModule = require('webpack/lib/dependencies/LocalModule');

function flattenPrototype(obj) {
  if (typeof obj === 'string') {
    return obj;
  }
  const copy = {};
  for (const key in obj) {
    copy[key] = obj[key];
  }
  return copy;
}

const assignTruthful = {
  freeze(arg, dependency) {
    return arg;
  },
  thaw(arg, frozen) {
    return arg;
  },
};

const assignDefined = {
  freeze(arg, dependency) {
    if (typeof arg !== 'undefined') {
      return arg;
    }
  },
  thaw(arg, frozen) {
    if (typeof arg !== 'undefined') {
      return arg;
    }
  },
}

const optional = serial.assigned({
  prepend: assignTruthful,
  replaces: assignTruthful,
  critical: assignTruthful,
  namespaceObjectAsContext: assignDefined,
  callArgs: assignDefined,
  call: assignDefined,
  directImport: assignDefined,
  shorthand: assignDefined,
  optional: assignTruthful,
  loc: {
    freeze(arg, dependency) {
      return flattenPrototype(dependency.loc);
    },
    thaw(arg, frozen) {
      return arg;
    },
  },
});

const localModuleAssigned = {
  freeze(_, dependency) {
    if (
      typeof dependency.localModule === 'object' &&
      dependency.localModule !== null
    ) {
      return {
        name: dependency.localModule.name,
        idx: dependency.localModule.idx,
        used: dependency.localModule.used,
      };
    }
  },
  thaw(thawed, localModule, extra) {
    const state = extra.state;
    if (
      typeof localModule === 'object' &&
      localModule !== null
    ) {
      if (!state.localModules) {
        state.localModules = [];
      }
      if (!state.localModules[localModule.idx]) {
        state.localModules[localModule.idx] = new LocalModule(
          extra.module,
          localModule.name,
          localModule.idx,
        );
        state.localModules[localModule.idx].used =
          localModule.used;
      }
      thawed.localModule = state.localModules[localModule.idx];
    }
    return thawed;
  },
};

const warnings = {
  freeze(frozen, dependency) {
    if (frozen && dependency.getWarnings) {
      const warnings = dependency.getWarnings();
      if (warnings && warnings.length) {
        return warnings.map(
          ({ stack }) =>
            stack.includes('\n    at Object.freeze')
              ? stack.split('\n    at Object.freeze')[0]
              : stack.includes('\n    at pluginCompat.tap')
                ? stack.split('\n    at pluginCompat.tap')[0]
                : stack.split('\n    at Compiler.pluginCompat.tap')[0],
        );
      }
    }
  },
  thaw(dependency, warnings) {
    if (dependency && warnings && dependency.getWarnings) {
      const frozenWarnings = warnings;
      const _getWarnings = dependency.getWarnings;
      dependency.getWarnings = function() {
        const warnings = _getWarnings.call(this);
        if (warnings && warnings.length) {
          return warnings.map((warning, i) => {
            const stack = warning.stack.split(
              '\n    at Compilation.reportDependencyErrorsAndWarnings',
            )[1];
            warning.stack = `${
              frozenWarnings[i]
            }\n    at Compilation.reportDependencyErrorsAndWarnings${stack}`;
            return warning;
          });
        }
        return warnings;
      };
    }
    return dependency;
  },
};
**/

const constructorArguments = {
  /** dependencies
      dependencies: {
        freeze(arg, dependency, extra, methods) {
          return methods.mapFreeze('Dependency', null, arg, extra);
        },
        thaw(arg, frozen, extra, methods) {
          return methods.mapThaw('Dependency', null, arg, extra);
        },
      },
  **/
  /** freeze dependencies
          dependencies: methods.mapFreeze('Dependency', null, dependency.dependencies, extra),
  **/
  /** thaw dependencies
          methods.mapThaw('Dependency', null, frozen.dependencies, extra),
  **/
  /** depsArray
      depsArray: {
        freeze(arg, dependency, extra, methods) {
          return methods.mapFreeze('Dependency', null, arg, extra);
        },
        thaw(arg, frozen, extra, methods) {
          return methods.mapThaw('Dependency', null, arg, extra);
        },
      },
  **/
  /** freeze depsArray
          depsArray: methods.mapFreeze('Dependency', null, dependency.depsArray, extra),
  **/
  /** thaw depsArray
          methods.mapThaw('Dependency', null, frozen.depsArray, extra),
  **/
  /** localModule
      localModule: {
        freeze({ name, idx }, dependency, extra, methods) {
          return {
            name: name,
            idx: idx,
          };
        },
        thaw({ idx, name, used }, frozen, extra, methods) {
          const state = extra.state;
          if (!state.localModules) {
            state.localModules = [];
          }
          if (!state.localModules[idx]) {
            state.localModules[idx] = new LocalModule(extra.module, name, idx);
            state.localModules[idx].used = used;
          }
          return state.localModules[idx];
        },
      },
  **/
  /** freeze localModule
          localModule: {
            name: dependency.localModule.name,
            name: dependency.localModule.idx,
          },
  **/
  /** thaw prep localModule
        if (!extra.state.localModules) {
          extra.state.localModules = [];
        }
        if (!extra.state.localModules[frozen.localModule.idx]) {
          extra.state.localModules[frozen.localModule.idx] = new LocalModule(extra.module, frozen.localModule.name, frozen.localModule.idx);
          extra.state.localModules[frozen.localModule.idx].used = frozen.localModule.used;
        }
  **/
  /** thaw localModule
          extra.state.localModules[frozen.localModule.idx],
  **/
  /** regExp
      regExp: {
        freeze(arg, dependency, extra, methods) {
          return arg ? arg.source : false;
        },
        thaw(arg, frozen, extra, methods) {
          return arg ? new RegExp(arg) : arg;
        },
      },
  **/
  /** freeze regExp
          regExp: dependency.regExp ? dependency.regExp.source : false,
  **/
  /** thaw regExp
          frozen.regExp ? new RegExp(frozen.regExp) : frozen.regExp,
  **/
  /** request
      request: {
        freeze(arg, dependency, extra, methods) {
          return relateContext.relateAbsoluteRequest(extra.module.context, arg);
        },
        thaw(arg, dependency, extra, methods) {
          return arg;
          // return relateContext.contextNormalRequest(extra.compilation.compiler, arg);
        },
      },
  **/
  /** freeze request
          request: relateContext.relateAbsoluteRequest(extra.module.context, dependency.request),
  **/
  /** thaw request
          frozen.request,
  **/
  /** userRequest
      userRequest: {
        freeze(arg, dependency, extra, methods) {
          return relateContext.relateAbsoluteRequest(extra.module.context, arg);
        },
        thaw(arg, dependency, extra, methods) {
          return arg;
          // return relateContext.contextNormalRequest(extra.compilation.compiler, arg);
        },
      },
  **/
  /** freeze userRequest
          userRequest: relateContext.relateAbsoluteRequest(extra.module.context, dependency.userRequest),
  **/
  /** thaw userRequest
          frozen.userRequest,
  **/
  /** block
      block: {
        freeze(arg, dependency, extra, methods) {
          // Dependency nested in a parent. Freezing the block is a loop.
          if (arg.dependencies.includes(dependency)) {
            return;
          }
          return methods.freeze('DependencyBlock', null, arg, extra);
        },
        thaw(arg, frozen, extra, methods) {
          // Not having a block, means it needs to create a cycle and refer to its
          // parent.
          if (!arg) {
            return extra.parent;
          }
          return methods.thaw('DependencyBlock', null, arg, extra);
        },
      },
  **/
  /** freeze block
          block: !dependency.block.dependencies.includes(dependency) ?
            methods.freeze('DependencyBlock', null, dependency.block, extra) :
            undefined,
  **/
  /** thaw block
          !frozen.block ? extra.parent : methods.thaw('DependencyBlock', null, frozen.block, extra),
  **/
  /** importDependency
      importDependency: {
        freeze(arg, dependency, extra, methods) {
          return methods.freeze('Dependency', null, arg, extra);
        },
        thaw(arg, frozen, extra, methods) {
          return methods.thaw('Dependency', null, arg, extra);
        },
      },
  **/
  /** freeze importDependency
          importDependency: methods.freeze('Dependency', null, dependency.importDependency, extra),
  **/
  /** thaw importDependency
          methods.thaw('Dependency', null, frozen.importDependency, extra),
  **/
  /** originModule
      originModule: {
        freeze(arg, dependency, extra, methods) {
          // This will be in extra, generated or found during the process of thawing.
        },
        thaw(arg, frozen, extra, methods) {
          return extra.module;
        },
      },
  **/
  /** freeze originModule
          originModule: null,
  **/
  /** thaw originModule
          extra.module,
  **/
  /** activeExports
      activeExports: {
        freeze(arg, dependency, extra, methods) {
          return null;
        },
        thaw(arg, { name }, { state }, methods) {
          state.activeExports = state.activeExports || new Set();
          if (name) {
            state.activeExports.add(name);
          }
          return state.activeExports;
        },
      },
  **/
  /** freeze activeExports
          activeExports: null,
  **/
  /** thaw prep activeExports
        extra.state.activeExports = extra.state.activeExports || new Set();
        if (frozen.name) {
          extra.state.activeExports.add(frozen.name);
        }
  **/
  /** thaw activeExports
          extra.state.activeExports,
  **/
  /** otherStarExports
      otherStarExports: {
        freeze(arg, dependency, extra, methods) {
          if (arg) {
            // This will be in extra, generated during the process of thawing.
            return 'star';
          }
          return null;
        },
        thaw(arg, frozen, { state }, methods) {
          if (arg === 'star') {
            return state.otherStarExports || [];
          }
          return null;
        },
      },
  **/
  /** freeze otherStarExports
          otherStarExports: dependency.otherStarExports ? 'star' : null,
  **/
  /** thaw otherStarExports
          frozen.otherStarExports === 'star' ?
            (extra.state.otherStarExports || []) :
            null,
  **/
  /** options
      options: {
        freeze(arg, dependency, extra, methods) {
          if (arg.regExp) {
            return Object.assign({}, arg, {
              regExp: arg.regExp.source,
            });
          }
          return arg;
        },
        thaw(arg, frozen, extra, methods) {
          if (arg.regExp) {
            return Object.assign({}, arg, {
              regExp: new RegExp(arg.regExp),
            });
          }
          return arg;
        },
      },
  **/
  /** freeze options
          options: dependency.options.regExp ?
            Object.assign({}, dependency.options, {
              regExp: dependency.options.regExp.source,
            }) :
            dependency.options,
  **/
  /** thaw options
          frozen.options.regExp ?
            Object.assign({}, frozen.options, {
              regExp: new RegExp(frozen.options.regExp),
            }) :
            frozen.options,
  **/
  /** parserScope
      parserScope: {
        freeze(arg, dependencies, extra, methods) {
          return;
        },
        thaw(arg, frozen, { state }, methods) {
          state.harmonyParserScope = state.harmonyParserScope || {};
          return state.harmonyParserScope;
        },
      },
  **/
  /** freeze parserScope
          parserScope: null,
  **/
  /** thaw prep parserScope
        extra.state.harmonyParserScope = extra.state.harmonyParserScope || {};
  **/
  /** thaw parserScope
          extra.state.harmonyParserScope,
  **/
};

/** importDependencyState
  importDependency: {
    freeze(frozen) {
      return frozen;
    },
    thaw(thawed, frozen, extra) {
      const state = extra.state;
      const ref = frozen.range.toString();
      if (state.imports[ref]) {
        return state.imports[ref];
      }
      state.imports[ref] = thawed;
      return thawed;
    },
  },
**/

/** exportImportedDependencyState
  exportImportedDependency: {
    freeze(frozen) {},
    thaw(thawed, frozen, extra) {
      if (thawed.otherStarExports) {
        extra.state.otherStarExports = (
          extra.state.otherStarExports || []
        ).concat(thawed);
      }
      return thawed;
    },
  },
**/

const fs = require('fs');
const path = require('path');

const generateRaw = fs.readFileSync(path.join(__dirname, '_generate.js'), 'utf8');
const generateBlocks = generateRaw.split(/((?:\/\*\*)((?!\*\*\/)[^\r\n]*\r?\n)+)/g).filter(Boolean).filter(str => !str.startsWith('**/')).reduce((carry, item, index) => index % 2 === 0 ? [...carry, item] : carry, []);

const getBlock = name => {
  let lines = generateBlocks.find(block => block.startsWith(`/** ${name}`));
  if (lines) {
    lines = lines.split('\n');
    lines = lines.slice(1, lines.length - 1);
  }
  return lines || [];
};

const dependencyInfo = require('./basic-dependency.json');

let output = getBlock('prelude');

for (const dependency of dependencyInfo) {
  const DepName = dependency[0];
  const depName = DepName[0].toLowerCase() + DepName.slice(1);
  const DepNameSerial = `${DepName}Serial`;
  output.push(`const ${dependency[0]} = require('webpack/lib/dependencies/${dependency[0]}');`);
  output.push(`const ${DepNameSerial} = serial.serial('${DepName}', {`);

  // output.push(`  constructor: serial.constructed(${DepName}, {`);
  // for (const argument of dependency.slice(1)) {
  //   let block = getBlock(argument);
  //   if (!block.length) {
  //     block = [`    ${argument}: serial.identity,`];
  //   }
  //   output.push(...block);
  // }
  // output.push(`  }),`);

  output.push(`  constructor: {`);
  output.push(`    freeze(_, dependency, extra, methods) {`);
  output.push(`      return {`);
  for (const argument of dependency.slice(1)) {
    let block = getBlock(`freeze ${argument}`);
    if (!block.length) {
      block = [`        ${argument}: dependency.${argument},`];
    }
    output.push(...block);
  }
  output.push(`      };`);
  output.push(`    },`);
  output.push(`    thaw(thawed, frozen, extra, methods) {`);
  for (const argument of dependency.slice(1)) {
    let block = getBlock(`thaw prep ${argument}`);
    output.push(...block);
  }
  output.push(`      return new ${DepName}(`);
  for (const argument of dependency.slice(1)) {
    let block = getBlock(`thaw ${argument}`);
    if (!block.length) {
      block = [`        frozen.${argument},`];
    }
    output.push(...block);
  }
  output.push(`      );`);
  output.push(`    },`);
  output.push(`  },`);

  output.push(``);
  output.push(`  optional,`);

  if (DepName === 'AMDDefineDependency' || DepName === 'LocalModuleDependency') {
    output.push(``);
    output.push(`  localModuleAssigned,`);
  }

  output.push(``);
  output.push(`  warnings,`);

  if (DepName === 'HarmonyImportDependency') {
    output.push(``);
    output.push(...getBlock('importDependencyState'));
  }

  if (DepName === 'HarmonyExportImportedSpecifierDependency') {
    output.push(``);
    output.push(...getBlock('exportImportedDependencyState'));
  }

  output.push(`});`);
  output.push(``);
}

output.push(`exports.map = new Map();`);
for (const dependency of dependencyInfo) {
  const DepName = dependency[0];
  const DepNameSerial = `${DepName}Serial`;
  output.push(`exports.${DepName} = ${DepNameSerial};`);
  output.push(`exports.map.set(${DepName}, ${DepNameSerial});`);
}
output.push(``);

require('fs').writeFileSync(require('path').join(__dirname, 'index.js'), output.join('\n'), 'utf8');
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImhhcmQtc291cmNlLXdlYnBhY2stcGx1Z2luL2xpYi9zY2hlbWEtNC9fZ2VuZXJhdGUuanMiXSwibmFtZXMiOlsiY29uc3RydWN0b3JBcmd1bWVudHMiLCJmcyIsInJlcXVpcmUiLCJwYXRoIiwiZ2VuZXJhdGVSYXciLCJyZWFkRmlsZVN5bmMiLCJqb2luIiwiX19kaXJuYW1lIiwiZ2VuZXJhdGVCbG9ja3MiLCJzcGxpdCIsImZpbHRlciIsIkJvb2xlYW4iLCJzdHIiLCJzdGFydHNXaXRoIiwicmVkdWNlIiwiY2FycnkiLCJpdGVtIiwiaW5kZXgiLCJnZXRCbG9jayIsIm5hbWUiLCJsaW5lcyIsImZpbmQiLCJibG9jayIsInNsaWNlIiwibGVuZ3RoIiwiZGVwZW5kZW5jeUluZm8iLCJvdXRwdXQiLCJkZXBlbmRlbmN5IiwiRGVwTmFtZSIsImRlcE5hbWUiLCJ0b0xvd2VyQ2FzZSIsIkRlcE5hbWVTZXJpYWwiLCJwdXNoIiwiYXJndW1lbnQiLCJ3cml0ZUZpbGVTeW5jIl0sIm1hcHBpbmdzIjoiOzs7O0FBQUE7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBeUlBLE1BQU1BLHVCQUF1QjtBQUM3Qjs7Ozs7Ozs7OztBQVVBOzs7QUFHQTs7O0FBR0E7Ozs7Ozs7Ozs7QUFVQTs7O0FBR0E7OztBQUdBOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFxQkE7Ozs7OztBQU1BOzs7Ozs7Ozs7QUFTQTs7O0FBR0E7Ozs7Ozs7Ozs7QUFVQTs7O0FBR0E7OztBQUdBOzs7Ozs7Ozs7OztBQVdBOzs7QUFHQTs7O0FBR0E7Ozs7Ozs7Ozs7O0FBV0E7OztBQUdBOzs7QUFHQTs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQW1CQTs7Ozs7QUFLQTs7O0FBR0E7Ozs7Ozs7Ozs7QUFVQTs7O0FBR0E7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OztBQUVEUSxTQUFPTSxJQUFQLENBQWEsS0FBYjtBQUNBTixTQUFPTSxJQUFQLENBQWEsRUFBYjtBQUNEOztBQUVETixPQUFPTSxJQUFQLENBQWEsMEJBQWI7QUFDQSxLQUFLLE1BQU1MLFVBQVgsSUFBeUJGLGNBQXpCLEVBQXlDO0FBQ3ZDLFFBQU1HLFVBQVVELFdBQVcsQ0FBWCxDQUFoQjtBQUNBLFFBQU1JLGdCQUFpQixHQUFFSCxPQUFRLFFBQWpDO0FBQ0FGLFNBQU9NLElBQVAsQ0FBYSxXQUFVSixPQUFRLE1BQUtHLGFBQWMsR0FBbEQ7QUFDQUwsU0FBT00sSUFBUCxDQUFhLG1CQUFrQkosT0FBUSxLQUFJRyxhQUFjLElBQXpEO0FBQ0Q7QUFDREwsT0FBT00sSUFBUCxDQUFhLEVBQWI7O0FBRUE5QixRQUFRLElBQVIsRUFBY2dDLGFBQWQsQ0FBNEJoQyxRQUFRLE1BQVIsRUFBZ0JJLElBQWhCLENBQXFCQyxTQUFyQixFQUFnQyxVQUFoQyxDQUE1QixFQUF5RW1CLE9BQU9wQixJQUFQLENBQVksSUFBWixDQUF6RSxFQUE0RixNQUE1RiIsImZpbGUiOiJoYXJkLXNvdXJjZS13ZWJwYWNrLXBsdWdpbi9saWIvc2NoZW1hLTQvX2dlbmVyYXRlLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLyoqIHByZWx1ZGVcbmNvbnN0IHNlcmlhbCA9IHJlcXVpcmUoJy4uL3V0aWwvc2VyaWFsJyk7XG5jb25zdCByZWxhdGVDb250ZXh0ID0gcmVxdWlyZSgnLi4vdXRpbC9yZWxhdGUtY29udGV4dCcpO1xuXG5jb25zdCBMb2NhbE1vZHVsZSA9IHJlcXVpcmUoJ3dlYnBhY2svbGliL2RlcGVuZGVuY2llcy9Mb2NhbE1vZHVsZScpO1xuXG5mdW5jdGlvbiBmbGF0dGVuUHJvdG90eXBlKG9iaikge1xuICBpZiAodHlwZW9mIG9iaiA9PT0gJ3N0cmluZycpIHtcbiAgICByZXR1cm4gb2JqO1xuICB9XG4gIGNvbnN0IGNvcHkgPSB7fTtcbiAgZm9yIChjb25zdCBrZXkgaW4gb2JqKSB7XG4gICAgY29weVtrZXldID0gb2JqW2tleV07XG4gIH1cbiAgcmV0dXJuIGNvcHk7XG59XG5cbmNvbnN0IGFzc2lnblRydXRoZnVsID0ge1xuICBmcmVlemUoYXJnLCBkZXBlbmRlbmN5KSB7XG4gICAgcmV0dXJuIGFyZztcbiAgfSxcbiAgdGhhdyhhcmcsIGZyb3plbikge1xuICAgIHJldHVybiBhcmc7XG4gIH0sXG59O1xuXG5jb25zdCBhc3NpZ25EZWZpbmVkID0ge1xuICBmcmVlemUoYXJnLCBkZXBlbmRlbmN5KSB7XG4gICAgaWYgKHR5cGVvZiBhcmcgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICByZXR1cm4gYXJnO1xuICAgIH1cbiAgfSxcbiAgdGhhdyhhcmcsIGZyb3plbikge1xuICAgIGlmICh0eXBlb2YgYXJnICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgcmV0dXJuIGFyZztcbiAgICB9XG4gIH0sXG59XG5cbmNvbnN0IG9wdGlvbmFsID0gc2VyaWFsLmFzc2lnbmVkKHtcbiAgcHJlcGVuZDogYXNzaWduVHJ1dGhmdWwsXG4gIHJlcGxhY2VzOiBhc3NpZ25UcnV0aGZ1bCxcbiAgY3JpdGljYWw6IGFzc2lnblRydXRoZnVsLFxuICBuYW1lc3BhY2VPYmplY3RBc0NvbnRleHQ6IGFzc2lnbkRlZmluZWQsXG4gIGNhbGxBcmdzOiBhc3NpZ25EZWZpbmVkLFxuICBjYWxsOiBhc3NpZ25EZWZpbmVkLFxuICBkaXJlY3RJbXBvcnQ6IGFzc2lnbkRlZmluZWQsXG4gIHNob3J0aGFuZDogYXNzaWduRGVmaW5lZCxcbiAgb3B0aW9uYWw6IGFzc2lnblRydXRoZnVsLFxuICBsb2M6IHtcbiAgICBmcmVlemUoYXJnLCBkZXBlbmRlbmN5KSB7XG4gICAgICByZXR1cm4gZmxhdHRlblByb3RvdHlwZShkZXBlbmRlbmN5LmxvYyk7XG4gICAgfSxcbiAgICB0aGF3KGFyZywgZnJvemVuKSB7XG4gICAgICByZXR1cm4gYXJnO1xuICAgIH0sXG4gIH0sXG59KTtcblxuY29uc3QgbG9jYWxNb2R1bGVBc3NpZ25lZCA9IHtcbiAgZnJlZXplKF8sIGRlcGVuZGVuY3kpIHtcbiAgICBpZiAoXG4gICAgICB0eXBlb2YgZGVwZW5kZW5jeS5sb2NhbE1vZHVsZSA9PT0gJ29iamVjdCcgJiZcbiAgICAgIGRlcGVuZGVuY3kubG9jYWxNb2R1bGUgIT09IG51bGxcbiAgICApIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIG5hbWU6IGRlcGVuZGVuY3kubG9jYWxNb2R1bGUubmFtZSxcbiAgICAgICAgaWR4OiBkZXBlbmRlbmN5LmxvY2FsTW9kdWxlLmlkeCxcbiAgICAgICAgdXNlZDogZGVwZW5kZW5jeS5sb2NhbE1vZHVsZS51c2VkLFxuICAgICAgfTtcbiAgICB9XG4gIH0sXG4gIHRoYXcodGhhd2VkLCBsb2NhbE1vZHVsZSwgZXh0cmEpIHtcbiAgICBjb25zdCBzdGF0ZSA9IGV4dHJhLnN0YXRlO1xuICAgIGlmIChcbiAgICAgIHR5cGVvZiBsb2NhbE1vZHVsZSA9PT0gJ29iamVjdCcgJiZcbiAgICAgIGxvY2FsTW9kdWxlICE9PSBudWxsXG4gICAgKSB7XG4gICAgICBpZiAoIXN0YXRlLmxvY2FsTW9kdWxlcykge1xuICAgICAgICBzdGF0ZS5sb2NhbE1vZHVsZXMgPSBbXTtcbiAgICAgIH1cbiAgICAgIGlmICghc3RhdGUubG9jYWxNb2R1bGVzW2xvY2FsTW9kdWxlLmlkeF0pIHtcbiAgICAgICAgc3RhdGUubG9jYWxNb2R1bGVzW2xvY2FsTW9kdWxlLmlkeF0gPSBuZXcgTG9jYWxNb2R1bGUoXG4gICAgICAgICAgZXh0cmEubW9kdWxlLFxuICAgICAgICAgIGxvY2FsTW9kdWxlLm5hbWUsXG4gICAgICAgICAgbG9jYWxNb2R1bGUuaWR4LFxuICAgICAgICApO1xuICAgICAgICBzdGF0ZS5sb2NhbE1vZHVsZXNbbG9jYWxNb2R1bGUuaWR4XS51c2VkID1cbiAgICAgICAgICBsb2NhbE1vZHVsZS51c2VkO1xuICAgICAgfVxuICAgICAgdGhhd2VkLmxvY2FsTW9kdWxlID0gc3RhdGUubG9jYWxNb2R1bGVzW2xvY2FsTW9kdWxlLmlkeF07XG4gICAgfVxuICAgIHJldHVybiB0aGF3ZWQ7XG4gIH0sXG59O1xuXG5jb25zdCB3YXJuaW5ncyA9IHtcbiAgZnJlZXplKGZyb3plbiwgZGVwZW5kZW5jeSkge1xuICAgIGlmIChmcm96ZW4gJiYgZGVwZW5kZW5jeS5nZXRXYXJuaW5ncykge1xuICAgICAgY29uc3Qgd2FybmluZ3MgPSBkZXBlbmRlbmN5LmdldFdhcm5pbmdzKCk7XG4gICAgICBpZiAod2FybmluZ3MgJiYgd2FybmluZ3MubGVuZ3RoKSB7XG4gICAgICAgIHJldHVybiB3YXJuaW5ncy5tYXAoXG4gICAgICAgICAgKHsgc3RhY2sgfSkgPT5cbiAgICAgICAgICAgIHN0YWNrLmluY2x1ZGVzKCdcXG4gICAgYXQgT2JqZWN0LmZyZWV6ZScpXG4gICAgICAgICAgICAgID8gc3RhY2suc3BsaXQoJ1xcbiAgICBhdCBPYmplY3QuZnJlZXplJylbMF1cbiAgICAgICAgICAgICAgOiBzdGFjay5pbmNsdWRlcygnXFxuICAgIGF0IHBsdWdpbkNvbXBhdC50YXAnKVxuICAgICAgICAgICAgICAgID8gc3RhY2suc3BsaXQoJ1xcbiAgICBhdCBwbHVnaW5Db21wYXQudGFwJylbMF1cbiAgICAgICAgICAgICAgICA6IHN0YWNrLnNwbGl0KCdcXG4gICAgYXQgQ29tcGlsZXIucGx1Z2luQ29tcGF0LnRhcCcpWzBdLFxuICAgICAgICApO1xuICAgICAgfVxuICAgIH1cbiAgfSxcbiAgdGhhdyhkZXBlbmRlbmN5LCB3YXJuaW5ncykge1xuICAgIGlmIChkZXBlbmRlbmN5ICYmIHdhcm5pbmdzICYmIGRlcGVuZGVuY3kuZ2V0V2FybmluZ3MpIHtcbiAgICAgIGNvbnN0IGZyb3plbldhcm5pbmdzID0gd2FybmluZ3M7XG4gICAgICBjb25zdCBfZ2V0V2FybmluZ3MgPSBkZXBlbmRlbmN5LmdldFdhcm5pbmdzO1xuICAgICAgZGVwZW5kZW5jeS5nZXRXYXJuaW5ncyA9IGZ1bmN0aW9uKCkge1xuICAgICAgICBjb25zdCB3YXJuaW5ncyA9IF9nZXRXYXJuaW5ncy5jYWxsKHRoaXMpO1xuICAgICAgICBpZiAod2FybmluZ3MgJiYgd2FybmluZ3MubGVuZ3RoKSB7XG4gICAgICAgICAgcmV0dXJuIHdhcm5pbmdzLm1hcCgod2FybmluZywgaSkgPT4ge1xuICAgICAgICAgICAgY29uc3Qgc3RhY2sgPSB3YXJuaW5nLnN0YWNrLnNwbGl0KFxuICAgICAgICAgICAgICAnXFxuICAgIGF0IENvbXBpbGF0aW9uLnJlcG9ydERlcGVuZGVuY3lFcnJvcnNBbmRXYXJuaW5ncycsXG4gICAgICAgICAgICApWzFdO1xuICAgICAgICAgICAgd2FybmluZy5zdGFjayA9IGAke1xuICAgICAgICAgICAgICBmcm96ZW5XYXJuaW5nc1tpXVxuICAgICAgICAgICAgfVxcbiAgICBhdCBDb21waWxhdGlvbi5yZXBvcnREZXBlbmRlbmN5RXJyb3JzQW5kV2FybmluZ3Mke3N0YWNrfWA7XG4gICAgICAgICAgICByZXR1cm4gd2FybmluZztcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gd2FybmluZ3M7XG4gICAgICB9O1xuICAgIH1cbiAgICByZXR1cm4gZGVwZW5kZW5jeTtcbiAgfSxcbn07XG4qKi9cblxuY29uc3QgY29uc3RydWN0b3JBcmd1bWVudHMgPSB7XG4vKiogZGVwZW5kZW5jaWVzXG4gICAgZGVwZW5kZW5jaWVzOiB7XG4gICAgICBmcmVlemUoYXJnLCBkZXBlbmRlbmN5LCBleHRyYSwgbWV0aG9kcykge1xuICAgICAgICByZXR1cm4gbWV0aG9kcy5tYXBGcmVlemUoJ0RlcGVuZGVuY3knLCBudWxsLCBhcmcsIGV4dHJhKTtcbiAgICAgIH0sXG4gICAgICB0aGF3KGFyZywgZnJvemVuLCBleHRyYSwgbWV0aG9kcykge1xuICAgICAgICByZXR1cm4gbWV0aG9kcy5tYXBUaGF3KCdEZXBlbmRlbmN5JywgbnVsbCwgYXJnLCBleHRyYSk7XG4gICAgICB9LFxuICAgIH0sXG4qKi9cbi8qKiBmcmVlemUgZGVwZW5kZW5jaWVzXG4gICAgICAgIGRlcGVuZGVuY2llczogbWV0aG9kcy5tYXBGcmVlemUoJ0RlcGVuZGVuY3knLCBudWxsLCBkZXBlbmRlbmN5LmRlcGVuZGVuY2llcywgZXh0cmEpLFxuKiovXG4vKiogdGhhdyBkZXBlbmRlbmNpZXNcbiAgICAgICAgbWV0aG9kcy5tYXBUaGF3KCdEZXBlbmRlbmN5JywgbnVsbCwgZnJvemVuLmRlcGVuZGVuY2llcywgZXh0cmEpLFxuKiovXG4vKiogZGVwc0FycmF5XG4gICAgZGVwc0FycmF5OiB7XG4gICAgICBmcmVlemUoYXJnLCBkZXBlbmRlbmN5LCBleHRyYSwgbWV0aG9kcykge1xuICAgICAgICByZXR1cm4gbWV0aG9kcy5tYXBGcmVlemUoJ0RlcGVuZGVuY3knLCBudWxsLCBhcmcsIGV4dHJhKTtcbiAgICAgIH0sXG4gICAgICB0aGF3KGFyZywgZnJvemVuLCBleHRyYSwgbWV0aG9kcykge1xuICAgICAgICByZXR1cm4gbWV0aG9kcy5tYXBUaGF3KCdEZXBlbmRlbmN5JywgbnVsbCwgYXJnLCBleHRyYSk7XG4gICAgICB9LFxuICAgIH0sXG4qKi9cbi8qKiBmcmVlemUgZGVwc0FycmF5XG4gICAgICAgIGRlcHNBcnJheTogbWV0aG9kcy5tYXBGcmVlemUoJ0RlcGVuZGVuY3knLCBudWxsLCBkZXBlbmRlbmN5LmRlcHNBcnJheSwgZXh0cmEpLFxuKiovXG4vKiogdGhhdyBkZXBzQXJyYXlcbiAgICAgICAgbWV0aG9kcy5tYXBUaGF3KCdEZXBlbmRlbmN5JywgbnVsbCwgZnJvemVuLmRlcHNBcnJheSwgZXh0cmEpLFxuKiovXG4vKiogbG9jYWxNb2R1bGVcbiAgICBsb2NhbE1vZHVsZToge1xuICAgICAgZnJlZXplKHsgbmFtZSwgaWR4IH0sIGRlcGVuZGVuY3ksIGV4dHJhLCBtZXRob2RzKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgbmFtZTogbmFtZSxcbiAgICAgICAgICBpZHg6IGlkeCxcbiAgICAgICAgfTtcbiAgICAgIH0sXG4gICAgICB0aGF3KHsgaWR4LCBuYW1lLCB1c2VkIH0sIGZyb3plbiwgZXh0cmEsIG1ldGhvZHMpIHtcbiAgICAgICAgY29uc3Qgc3RhdGUgPSBleHRyYS5zdGF0ZTtcbiAgICAgICAgaWYgKCFzdGF0ZS5sb2NhbE1vZHVsZXMpIHtcbiAgICAgICAgICBzdGF0ZS5sb2NhbE1vZHVsZXMgPSBbXTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIXN0YXRlLmxvY2FsTW9kdWxlc1tpZHhdKSB7XG4gICAgICAgICAgc3RhdGUubG9jYWxNb2R1bGVzW2lkeF0gPSBuZXcgTG9jYWxNb2R1bGUoZXh0cmEubW9kdWxlLCBuYW1lLCBpZHgpO1xuICAgICAgICAgIHN0YXRlLmxvY2FsTW9kdWxlc1tpZHhdLnVzZWQgPSB1c2VkO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBzdGF0ZS5sb2NhbE1vZHVsZXNbaWR4XTtcbiAgICAgIH0sXG4gICAgfSxcbioqL1xuLyoqIGZyZWV6ZSBsb2NhbE1vZHVsZVxuICAgICAgICBsb2NhbE1vZHVsZToge1xuICAgICAgICAgIG5hbWU6IGRlcGVuZGVuY3kubG9jYWxNb2R1bGUubmFtZSxcbiAgICAgICAgICBuYW1lOiBkZXBlbmRlbmN5LmxvY2FsTW9kdWxlLmlkeCxcbiAgICAgICAgfSxcbioqL1xuLyoqIHRoYXcgcHJlcCBsb2NhbE1vZHVsZVxuICAgICAgaWYgKCFleHRyYS5zdGF0ZS5sb2NhbE1vZHVsZXMpIHtcbiAgICAgICAgZXh0cmEuc3RhdGUubG9jYWxNb2R1bGVzID0gW107XG4gICAgICB9XG4gICAgICBpZiAoIWV4dHJhLnN0YXRlLmxvY2FsTW9kdWxlc1tmcm96ZW4ubG9jYWxNb2R1bGUuaWR4XSkge1xuICAgICAgICBleHRyYS5zdGF0ZS5sb2NhbE1vZHVsZXNbZnJvemVuLmxvY2FsTW9kdWxlLmlkeF0gPSBuZXcgTG9jYWxNb2R1bGUoZXh0cmEubW9kdWxlLCBmcm96ZW4ubG9jYWxNb2R1bGUubmFtZSwgZnJvemVuLmxvY2FsTW9kdWxlLmlkeCk7XG4gICAgICAgIGV4dHJhLnN0YXRlLmxvY2FsTW9kdWxlc1tmcm96ZW4ubG9jYWxNb2R1bGUuaWR4XS51c2VkID0gZnJvemVuLmxvY2FsTW9kdWxlLnVzZWQ7XG4gICAgICB9XG4qKi9cbi8qKiB0aGF3IGxvY2FsTW9kdWxlXG4gICAgICAgIGV4dHJhLnN0YXRlLmxvY2FsTW9kdWxlc1tmcm96ZW4ubG9jYWxNb2R1bGUuaWR4XSxcbioqL1xuLyoqIHJlZ0V4cFxuICAgIHJlZ0V4cDoge1xuICAgICAgZnJlZXplKGFyZywgZGVwZW5kZW5jeSwgZXh0cmEsIG1ldGhvZHMpIHtcbiAgICAgICAgcmV0dXJuIGFyZyA/IGFyZy5zb3VyY2UgOiBmYWxzZTtcbiAgICAgIH0sXG4gICAgICB0aGF3KGFyZywgZnJvemVuLCBleHRyYSwgbWV0aG9kcykge1xuICAgICAgICByZXR1cm4gYXJnID8gbmV3IFJlZ0V4cChhcmcpIDogYXJnO1xuICAgICAgfSxcbiAgICB9LFxuKiovXG4vKiogZnJlZXplIHJlZ0V4cFxuICAgICAgICByZWdFeHA6IGRlcGVuZGVuY3kucmVnRXhwID8gZGVwZW5kZW5jeS5yZWdFeHAuc291cmNlIDogZmFsc2UsXG4qKi9cbi8qKiB0aGF3IHJlZ0V4cFxuICAgICAgICBmcm96ZW4ucmVnRXhwID8gbmV3IFJlZ0V4cChmcm96ZW4ucmVnRXhwKSA6IGZyb3plbi5yZWdFeHAsXG4qKi9cbi8qKiByZXF1ZXN0XG4gICAgcmVxdWVzdDoge1xuICAgICAgZnJlZXplKGFyZywgZGVwZW5kZW5jeSwgZXh0cmEsIG1ldGhvZHMpIHtcbiAgICAgICAgcmV0dXJuIHJlbGF0ZUNvbnRleHQucmVsYXRlQWJzb2x1dGVSZXF1ZXN0KGV4dHJhLm1vZHVsZS5jb250ZXh0LCBhcmcpO1xuICAgICAgfSxcbiAgICAgIHRoYXcoYXJnLCBkZXBlbmRlbmN5LCBleHRyYSwgbWV0aG9kcykge1xuICAgICAgICByZXR1cm4gYXJnO1xuICAgICAgICAvLyByZXR1cm4gcmVsYXRlQ29udGV4dC5jb250ZXh0Tm9ybWFsUmVxdWVzdChleHRyYS5jb21waWxhdGlvbi5jb21waWxlciwgYXJnKTtcbiAgICAgIH0sXG4gICAgfSxcbioqL1xuLyoqIGZyZWV6ZSByZXF1ZXN0XG4gICAgICAgIHJlcXVlc3Q6IHJlbGF0ZUNvbnRleHQucmVsYXRlQWJzb2x1dGVSZXF1ZXN0KGV4dHJhLm1vZHVsZS5jb250ZXh0LCBkZXBlbmRlbmN5LnJlcXVlc3QpLFxuKiovXG4vKiogdGhhdyByZXF1ZXN0XG4gICAgICAgIGZyb3plbi5yZXF1ZXN0LFxuKiovXG4vKiogdXNlclJlcXVlc3RcbiAgICB1c2VyUmVxdWVzdDoge1xuICAgICAgZnJlZXplKGFyZywgZGVwZW5kZW5jeSwgZXh0cmEsIG1ldGhvZHMpIHtcbiAgICAgICAgcmV0dXJuIHJlbGF0ZUNvbnRleHQucmVsYXRlQWJzb2x1dGVSZXF1ZXN0KGV4dHJhLm1vZHVsZS5jb250ZXh0LCBhcmcpO1xuICAgICAgfSxcbiAgICAgIHRoYXcoYXJnLCBkZXBlbmRlbmN5LCBleHRyYSwgbWV0aG9kcykge1xuICAgICAgICByZXR1cm4gYXJnO1xuICAgICAgICAvLyByZXR1cm4gcmVsYXRlQ29udGV4dC5jb250ZXh0Tm9ybWFsUmVxdWVzdChleHRyYS5jb21waWxhdGlvbi5jb21waWxlciwgYXJnKTtcbiAgICAgIH0sXG4gICAgfSxcbioqL1xuLyoqIGZyZWV6ZSB1c2VyUmVxdWVzdFxuICAgICAgICB1c2VyUmVxdWVzdDogcmVsYXRlQ29udGV4dC5yZWxhdGVBYnNvbHV0ZVJlcXVlc3QoZXh0cmEubW9kdWxlLmNvbnRleHQsIGRlcGVuZGVuY3kudXNlclJlcXVlc3QpLFxuKiovXG4vKiogdGhhdyB1c2VyUmVxdWVzdFxuICAgICAgICBmcm96ZW4udXNlclJlcXVlc3QsXG4qKi9cbi8qKiBibG9ja1xuICAgIGJsb2NrOiB7XG4gICAgICBmcmVlemUoYXJnLCBkZXBlbmRlbmN5LCBleHRyYSwgbWV0aG9kcykge1xuICAgICAgICAvLyBEZXBlbmRlbmN5IG5lc3RlZCBpbiBhIHBhcmVudC4gRnJlZXppbmcgdGhlIGJsb2NrIGlzIGEgbG9vcC5cbiAgICAgICAgaWYgKGFyZy5kZXBlbmRlbmNpZXMuaW5jbHVkZXMoZGVwZW5kZW5jeSkpIHtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG1ldGhvZHMuZnJlZXplKCdEZXBlbmRlbmN5QmxvY2snLCBudWxsLCBhcmcsIGV4dHJhKTtcbiAgICAgIH0sXG4gICAgICB0aGF3KGFyZywgZnJvemVuLCBleHRyYSwgbWV0aG9kcykge1xuICAgICAgICAvLyBOb3QgaGF2aW5nIGEgYmxvY2ssIG1lYW5zIGl0IG5lZWRzIHRvIGNyZWF0ZSBhIGN5Y2xlIGFuZCByZWZlciB0byBpdHNcbiAgICAgICAgLy8gcGFyZW50LlxuICAgICAgICBpZiAoIWFyZykge1xuICAgICAgICAgIHJldHVybiBleHRyYS5wYXJlbnQ7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG1ldGhvZHMudGhhdygnRGVwZW5kZW5jeUJsb2NrJywgbnVsbCwgYXJnLCBleHRyYSk7XG4gICAgICB9LFxuICAgIH0sXG4qKi9cbi8qKiBmcmVlemUgYmxvY2tcbiAgICAgICAgYmxvY2s6ICFkZXBlbmRlbmN5LmJsb2NrLmRlcGVuZGVuY2llcy5pbmNsdWRlcyhkZXBlbmRlbmN5KSA/XG4gICAgICAgICAgbWV0aG9kcy5mcmVlemUoJ0RlcGVuZGVuY3lCbG9jaycsIG51bGwsIGRlcGVuZGVuY3kuYmxvY2ssIGV4dHJhKSA6XG4gICAgICAgICAgdW5kZWZpbmVkLFxuKiovXG4vKiogdGhhdyBibG9ja1xuICAgICAgICAhZnJvemVuLmJsb2NrID8gZXh0cmEucGFyZW50IDogbWV0aG9kcy50aGF3KCdEZXBlbmRlbmN5QmxvY2snLCBudWxsLCBmcm96ZW4uYmxvY2ssIGV4dHJhKSxcbioqL1xuLyoqIGltcG9ydERlcGVuZGVuY3lcbiAgICBpbXBvcnREZXBlbmRlbmN5OiB7XG4gICAgICBmcmVlemUoYXJnLCBkZXBlbmRlbmN5LCBleHRyYSwgbWV0aG9kcykge1xuICAgICAgICByZXR1cm4gbWV0aG9kcy5mcmVlemUoJ0RlcGVuZGVuY3knLCBudWxsLCBhcmcsIGV4dHJhKTtcbiAgICAgIH0sXG4gICAgICB0aGF3KGFyZywgZnJvemVuLCBleHRyYSwgbWV0aG9kcykge1xuICAgICAgICByZXR1cm4gbWV0aG9kcy50aGF3KCdEZXBlbmRlbmN5JywgbnVsbCwgYXJnLCBleHRyYSk7XG4gICAgICB9LFxuICAgIH0sXG4qKi9cbi8qKiBmcmVlemUgaW1wb3J0RGVwZW5kZW5jeVxuICAgICAgICBpbXBvcnREZXBlbmRlbmN5OiBtZXRob2RzLmZyZWV6ZSgnRGVwZW5kZW5jeScsIG51bGwsIGRlcGVuZGVuY3kuaW1wb3J0RGVwZW5kZW5jeSwgZXh0cmEpLFxuKiovXG4vKiogdGhhdyBpbXBvcnREZXBlbmRlbmN5XG4gICAgICAgIG1ldGhvZHMudGhhdygnRGVwZW5kZW5jeScsIG51bGwsIGZyb3plbi5pbXBvcnREZXBlbmRlbmN5LCBleHRyYSksXG4qKi9cbi8qKiBvcmlnaW5Nb2R1bGVcbiAgICBvcmlnaW5Nb2R1bGU6IHtcbiAgICAgIGZyZWV6ZShhcmcsIGRlcGVuZGVuY3ksIGV4dHJhLCBtZXRob2RzKSB7XG4gICAgICAgIC8vIFRoaXMgd2lsbCBiZSBpbiBleHRyYSwgZ2VuZXJhdGVkIG9yIGZvdW5kIGR1cmluZyB0aGUgcHJvY2VzcyBvZiB0aGF3aW5nLlxuICAgICAgfSxcbiAgICAgIHRoYXcoYXJnLCBmcm96ZW4sIGV4dHJhLCBtZXRob2RzKSB7XG4gICAgICAgIHJldHVybiBleHRyYS5tb2R1bGU7XG4gICAgICB9LFxuICAgIH0sXG4qKi9cbi8qKiBmcmVlemUgb3JpZ2luTW9kdWxlXG4gICAgICAgIG9yaWdpbk1vZHVsZTogbnVsbCxcbioqL1xuLyoqIHRoYXcgb3JpZ2luTW9kdWxlXG4gICAgICAgIGV4dHJhLm1vZHVsZSxcbioqL1xuLyoqIGFjdGl2ZUV4cG9ydHNcbiAgICBhY3RpdmVFeHBvcnRzOiB7XG4gICAgICBmcmVlemUoYXJnLCBkZXBlbmRlbmN5LCBleHRyYSwgbWV0aG9kcykge1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH0sXG4gICAgICB0aGF3KGFyZywgeyBuYW1lIH0sIHsgc3RhdGUgfSwgbWV0aG9kcykge1xuICAgICAgICBzdGF0ZS5hY3RpdmVFeHBvcnRzID0gc3RhdGUuYWN0aXZlRXhwb3J0cyB8fCBuZXcgU2V0KCk7XG4gICAgICAgIGlmIChuYW1lKSB7XG4gICAgICAgICAgc3RhdGUuYWN0aXZlRXhwb3J0cy5hZGQobmFtZSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHN0YXRlLmFjdGl2ZUV4cG9ydHM7XG4gICAgICB9LFxuICAgIH0sXG4qKi9cbi8qKiBmcmVlemUgYWN0aXZlRXhwb3J0c1xuICAgICAgICBhY3RpdmVFeHBvcnRzOiBudWxsLFxuKiovXG4vKiogdGhhdyBwcmVwIGFjdGl2ZUV4cG9ydHNcbiAgICAgIGV4dHJhLnN0YXRlLmFjdGl2ZUV4cG9ydHMgPSBleHRyYS5zdGF0ZS5hY3RpdmVFeHBvcnRzIHx8IG5ldyBTZXQoKTtcbiAgICAgIGlmIChmcm96ZW4ubmFtZSkge1xuICAgICAgICBleHRyYS5zdGF0ZS5hY3RpdmVFeHBvcnRzLmFkZChmcm96ZW4ubmFtZSk7XG4gICAgICB9XG4qKi9cbi8qKiB0aGF3IGFjdGl2ZUV4cG9ydHNcbiAgICAgICAgZXh0cmEuc3RhdGUuYWN0aXZlRXhwb3J0cyxcbioqL1xuLyoqIG90aGVyU3RhckV4cG9ydHNcbiAgICBvdGhlclN0YXJFeHBvcnRzOiB7XG4gICAgICBmcmVlemUoYXJnLCBkZXBlbmRlbmN5LCBleHRyYSwgbWV0aG9kcykge1xuICAgICAgICBpZiAoYXJnKSB7XG4gICAgICAgICAgLy8gVGhpcyB3aWxsIGJlIGluIGV4dHJhLCBnZW5lcmF0ZWQgZHVyaW5nIHRoZSBwcm9jZXNzIG9mIHRoYXdpbmcuXG4gICAgICAgICAgcmV0dXJuICdzdGFyJztcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH0sXG4gICAgICB0aGF3KGFyZywgZnJvemVuLCB7IHN0YXRlIH0sIG1ldGhvZHMpIHtcbiAgICAgICAgaWYgKGFyZyA9PT0gJ3N0YXInKSB7XG4gICAgICAgICAgcmV0dXJuIHN0YXRlLm90aGVyU3RhckV4cG9ydHMgfHwgW107XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9LFxuICAgIH0sXG4qKi9cbi8qKiBmcmVlemUgb3RoZXJTdGFyRXhwb3J0c1xuICAgICAgICBvdGhlclN0YXJFeHBvcnRzOiBkZXBlbmRlbmN5Lm90aGVyU3RhckV4cG9ydHMgPyAnc3RhcicgOiBudWxsLFxuKiovXG4vKiogdGhhdyBvdGhlclN0YXJFeHBvcnRzXG4gICAgICAgIGZyb3plbi5vdGhlclN0YXJFeHBvcnRzID09PSAnc3RhcicgP1xuICAgICAgICAgIChleHRyYS5zdGF0ZS5vdGhlclN0YXJFeHBvcnRzIHx8IFtdKSA6XG4gICAgICAgICAgbnVsbCxcbioqL1xuLyoqIG9wdGlvbnNcbiAgICBvcHRpb25zOiB7XG4gICAgICBmcmVlemUoYXJnLCBkZXBlbmRlbmN5LCBleHRyYSwgbWV0aG9kcykge1xuICAgICAgICBpZiAoYXJnLnJlZ0V4cCkge1xuICAgICAgICAgIHJldHVybiBPYmplY3QuYXNzaWduKHt9LCBhcmcsIHtcbiAgICAgICAgICAgIHJlZ0V4cDogYXJnLnJlZ0V4cC5zb3VyY2UsXG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGFyZztcbiAgICAgIH0sXG4gICAgICB0aGF3KGFyZywgZnJvemVuLCBleHRyYSwgbWV0aG9kcykge1xuICAgICAgICBpZiAoYXJnLnJlZ0V4cCkge1xuICAgICAgICAgIHJldHVybiBPYmplY3QuYXNzaWduKHt9LCBhcmcsIHtcbiAgICAgICAgICAgIHJlZ0V4cDogbmV3IFJlZ0V4cChhcmcucmVnRXhwKSxcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gYXJnO1xuICAgICAgfSxcbiAgICB9LFxuKiovXG4vKiogZnJlZXplIG9wdGlvbnNcbiAgICAgICAgb3B0aW9uczogZGVwZW5kZW5jeS5vcHRpb25zLnJlZ0V4cCA/XG4gICAgICAgICAgT2JqZWN0LmFzc2lnbih7fSwgZGVwZW5kZW5jeS5vcHRpb25zLCB7XG4gICAgICAgICAgICByZWdFeHA6IGRlcGVuZGVuY3kub3B0aW9ucy5yZWdFeHAuc291cmNlLFxuICAgICAgICAgIH0pIDpcbiAgICAgICAgICBkZXBlbmRlbmN5Lm9wdGlvbnMsXG4qKi9cbi8qKiB0aGF3IG9wdGlvbnNcbiAgICAgICAgZnJvemVuLm9wdGlvbnMucmVnRXhwID9cbiAgICAgICAgICBPYmplY3QuYXNzaWduKHt9LCBmcm96ZW4ub3B0aW9ucywge1xuICAgICAgICAgICAgcmVnRXhwOiBuZXcgUmVnRXhwKGZyb3plbi5vcHRpb25zLnJlZ0V4cCksXG4gICAgICAgICAgfSkgOlxuICAgICAgICAgIGZyb3plbi5vcHRpb25zLFxuKiovXG4vKiogcGFyc2VyU2NvcGVcbiAgICBwYXJzZXJTY29wZToge1xuICAgICAgZnJlZXplKGFyZywgZGVwZW5kZW5jaWVzLCBleHRyYSwgbWV0aG9kcykge1xuICAgICAgICByZXR1cm47XG4gICAgICB9LFxuICAgICAgdGhhdyhhcmcsIGZyb3plbiwgeyBzdGF0ZSB9LCBtZXRob2RzKSB7XG4gICAgICAgIHN0YXRlLmhhcm1vbnlQYXJzZXJTY29wZSA9IHN0YXRlLmhhcm1vbnlQYXJzZXJTY29wZSB8fCB7fTtcbiAgICAgICAgcmV0dXJuIHN0YXRlLmhhcm1vbnlQYXJzZXJTY29wZTtcbiAgICAgIH0sXG4gICAgfSxcbioqL1xuLyoqIGZyZWV6ZSBwYXJzZXJTY29wZVxuICAgICAgICBwYXJzZXJTY29wZTogbnVsbCxcbioqL1xuLyoqIHRoYXcgcHJlcCBwYXJzZXJTY29wZVxuICAgICAgZXh0cmEuc3RhdGUuaGFybW9ueVBhcnNlclNjb3BlID0gZXh0cmEuc3RhdGUuaGFybW9ueVBhcnNlclNjb3BlIHx8IHt9O1xuKiovXG4vKiogdGhhdyBwYXJzZXJTY29wZVxuICAgICAgICBleHRyYS5zdGF0ZS5oYXJtb255UGFyc2VyU2NvcGUsXG4qKi9cbn07XG5cbi8qKiBpbXBvcnREZXBlbmRlbmN5U3RhdGVcbiAgaW1wb3J0RGVwZW5kZW5jeToge1xuICAgIGZyZWV6ZShmcm96ZW4pIHtcbiAgICAgIHJldHVybiBmcm96ZW47XG4gICAgfSxcbiAgICB0aGF3KHRoYXdlZCwgZnJvemVuLCBleHRyYSkge1xuICAgICAgY29uc3Qgc3RhdGUgPSBleHRyYS5zdGF0ZTtcbiAgICAgIGNvbnN0IHJlZiA9IGZyb3plbi5yYW5nZS50b1N0cmluZygpO1xuICAgICAgaWYgKHN0YXRlLmltcG9ydHNbcmVmXSkge1xuICAgICAgICByZXR1cm4gc3RhdGUuaW1wb3J0c1tyZWZdO1xuICAgICAgfVxuICAgICAgc3RhdGUuaW1wb3J0c1tyZWZdID0gdGhhd2VkO1xuICAgICAgcmV0dXJuIHRoYXdlZDtcbiAgICB9LFxuICB9LFxuKiovXG5cbi8qKiBleHBvcnRJbXBvcnRlZERlcGVuZGVuY3lTdGF0ZVxuICBleHBvcnRJbXBvcnRlZERlcGVuZGVuY3k6IHtcbiAgICBmcmVlemUoZnJvemVuKSB7fSxcbiAgICB0aGF3KHRoYXdlZCwgZnJvemVuLCBleHRyYSkge1xuICAgICAgaWYgKHRoYXdlZC5vdGhlclN0YXJFeHBvcnRzKSB7XG4gICAgICAgIGV4dHJhLnN0YXRlLm90aGVyU3RhckV4cG9ydHMgPSAoXG4gICAgICAgICAgZXh0cmEuc3RhdGUub3RoZXJTdGFyRXhwb3J0cyB8fCBbXVxuICAgICAgICApLmNvbmNhdCh0aGF3ZWQpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHRoYXdlZDtcbiAgICB9LFxuICB9LFxuKiovXG5cbmNvbnN0IGZzID0gcmVxdWlyZSgnZnMnKTtcbmNvbnN0IHBhdGggPSByZXF1aXJlKCdwYXRoJyk7XG5cbmNvbnN0IGdlbmVyYXRlUmF3ID0gZnMucmVhZEZpbGVTeW5jKHBhdGguam9pbihfX2Rpcm5hbWUsICdfZ2VuZXJhdGUuanMnKSwgJ3V0ZjgnKTtcbmNvbnN0IGdlbmVyYXRlQmxvY2tzID0gZ2VuZXJhdGVSYXdcbi5zcGxpdCgvKCg/OlxcL1xcKlxcKikoKD8hXFwqXFwqXFwvKVteXFxyXFxuXSpcXHI/XFxuKSspL2cpXG4uZmlsdGVyKEJvb2xlYW4pXG4uZmlsdGVyKHN0ciA9PiAhc3RyLnN0YXJ0c1dpdGgoJyoqLycpKVxuLnJlZHVjZSgoY2FycnksIGl0ZW0sIGluZGV4KSA9PiBpbmRleCAlIDIgPT09IDAgPyBbLi4uY2FycnksIGl0ZW1dIDogY2FycnksIFtdKTtcblxuY29uc3QgZ2V0QmxvY2sgPSBuYW1lID0+IHtcbiAgbGV0IGxpbmVzID0gZ2VuZXJhdGVCbG9ja3NcbiAgICAuZmluZChibG9jayA9PiBibG9jay5zdGFydHNXaXRoKGAvKiogJHtuYW1lfWApKTtcbiAgaWYgKGxpbmVzKSB7XG4gICAgbGluZXMgPSBsaW5lcy5zcGxpdCgnXFxuJyk7XG4gICAgbGluZXMgPSBsaW5lcy5zbGljZSgxLCBsaW5lcy5sZW5ndGggLSAxKTtcbiAgfVxuICByZXR1cm4gbGluZXMgfHwgW107XG59O1xuXG5jb25zdCBkZXBlbmRlbmN5SW5mbyA9IHJlcXVpcmUoJy4vYmFzaWMtZGVwZW5kZW5jeS5qc29uJyk7XG5cbmxldCBvdXRwdXQgPSBnZXRCbG9jaygncHJlbHVkZScpO1xuXG5mb3IgKGNvbnN0IGRlcGVuZGVuY3kgb2YgZGVwZW5kZW5jeUluZm8pIHtcbiAgY29uc3QgRGVwTmFtZSA9IGRlcGVuZGVuY3lbMF07XG4gIGNvbnN0IGRlcE5hbWUgPSBEZXBOYW1lWzBdLnRvTG93ZXJDYXNlKCkgKyBEZXBOYW1lLnNsaWNlKDEpO1xuICBjb25zdCBEZXBOYW1lU2VyaWFsID0gYCR7RGVwTmFtZX1TZXJpYWxgO1xuICBvdXRwdXQucHVzaChgY29uc3QgJHtkZXBlbmRlbmN5WzBdfSA9IHJlcXVpcmUoJ3dlYnBhY2svbGliL2RlcGVuZGVuY2llcy8ke2RlcGVuZGVuY3lbMF19Jyk7YCk7XG4gIG91dHB1dC5wdXNoKGBjb25zdCAke0RlcE5hbWVTZXJpYWx9ID0gc2VyaWFsLnNlcmlhbCgnJHtEZXBOYW1lfScsIHtgKTtcblxuICAvLyBvdXRwdXQucHVzaChgICBjb25zdHJ1Y3Rvcjogc2VyaWFsLmNvbnN0cnVjdGVkKCR7RGVwTmFtZX0sIHtgKTtcbiAgLy8gZm9yIChjb25zdCBhcmd1bWVudCBvZiBkZXBlbmRlbmN5LnNsaWNlKDEpKSB7XG4gIC8vICAgbGV0IGJsb2NrID0gZ2V0QmxvY2soYXJndW1lbnQpO1xuICAvLyAgIGlmICghYmxvY2subGVuZ3RoKSB7XG4gIC8vICAgICBibG9jayA9IFtgICAgICR7YXJndW1lbnR9OiBzZXJpYWwuaWRlbnRpdHksYF07XG4gIC8vICAgfVxuICAvLyAgIG91dHB1dC5wdXNoKC4uLmJsb2NrKTtcbiAgLy8gfVxuICAvLyBvdXRwdXQucHVzaChgICB9KSxgKTtcblxuICBvdXRwdXQucHVzaChgICBjb25zdHJ1Y3Rvcjoge2ApO1xuICBvdXRwdXQucHVzaChgICAgIGZyZWV6ZShfLCBkZXBlbmRlbmN5LCBleHRyYSwgbWV0aG9kcykge2ApO1xuICBvdXRwdXQucHVzaChgICAgICAgcmV0dXJuIHtgKTtcbiAgZm9yIChjb25zdCBhcmd1bWVudCBvZiBkZXBlbmRlbmN5LnNsaWNlKDEpKSB7XG4gICAgbGV0IGJsb2NrID0gZ2V0QmxvY2soYGZyZWV6ZSAke2FyZ3VtZW50fWApO1xuICAgIGlmICghYmxvY2subGVuZ3RoKSB7XG4gICAgICBibG9jayA9IFtgICAgICAgICAke2FyZ3VtZW50fTogZGVwZW5kZW5jeS4ke2FyZ3VtZW50fSxgXTtcbiAgICB9XG4gICAgb3V0cHV0LnB1c2goLi4uYmxvY2spO1xuICB9XG4gIG91dHB1dC5wdXNoKGAgICAgICB9O2ApO1xuICBvdXRwdXQucHVzaChgICAgIH0sYCk7XG4gIG91dHB1dC5wdXNoKGAgICAgdGhhdyh0aGF3ZWQsIGZyb3plbiwgZXh0cmEsIG1ldGhvZHMpIHtgKTtcbiAgZm9yIChjb25zdCBhcmd1bWVudCBvZiBkZXBlbmRlbmN5LnNsaWNlKDEpKSB7XG4gICAgbGV0IGJsb2NrID0gZ2V0QmxvY2soYHRoYXcgcHJlcCAke2FyZ3VtZW50fWApO1xuICAgIG91dHB1dC5wdXNoKC4uLmJsb2NrKTtcbiAgfVxuICBvdXRwdXQucHVzaChgICAgICAgcmV0dXJuIG5ldyAke0RlcE5hbWV9KGApO1xuICBmb3IgKGNvbnN0IGFyZ3VtZW50IG9mIGRlcGVuZGVuY3kuc2xpY2UoMSkpIHtcbiAgICBsZXQgYmxvY2sgPSBnZXRCbG9jayhgdGhhdyAke2FyZ3VtZW50fWApO1xuICAgIGlmICghYmxvY2subGVuZ3RoKSB7XG4gICAgICBibG9jayA9IFtgICAgICAgICBmcm96ZW4uJHthcmd1bWVudH0sYF07XG4gICAgfVxuICAgIG91dHB1dC5wdXNoKC4uLmJsb2NrKTtcbiAgfVxuICBvdXRwdXQucHVzaChgICAgICAgKTtgKTtcbiAgb3V0cHV0LnB1c2goYCAgICB9LGApO1xuICBvdXRwdXQucHVzaChgICB9LGApO1xuXG4gIG91dHB1dC5wdXNoKGBgKTtcbiAgb3V0cHV0LnB1c2goYCAgb3B0aW9uYWwsYCk7XG5cbiAgaWYgKERlcE5hbWUgPT09ICdBTUREZWZpbmVEZXBlbmRlbmN5JyB8fCBEZXBOYW1lID09PSAnTG9jYWxNb2R1bGVEZXBlbmRlbmN5Jykge1xuICAgIG91dHB1dC5wdXNoKGBgKTtcbiAgICBvdXRwdXQucHVzaChgICBsb2NhbE1vZHVsZUFzc2lnbmVkLGApO1xuICB9XG5cbiAgb3V0cHV0LnB1c2goYGApO1xuICBvdXRwdXQucHVzaChgICB3YXJuaW5ncyxgKTtcblxuICBpZiAoRGVwTmFtZSA9PT0gJ0hhcm1vbnlJbXBvcnREZXBlbmRlbmN5Jykge1xuICAgIG91dHB1dC5wdXNoKGBgKTtcbiAgICBvdXRwdXQucHVzaCguLi5nZXRCbG9jaygnaW1wb3J0RGVwZW5kZW5jeVN0YXRlJykpO1xuICB9XG5cbiAgaWYgKERlcE5hbWUgPT09ICdIYXJtb255RXhwb3J0SW1wb3J0ZWRTcGVjaWZpZXJEZXBlbmRlbmN5Jykge1xuICAgIG91dHB1dC5wdXNoKGBgKTtcbiAgICBvdXRwdXQucHVzaCguLi5nZXRCbG9jaygnZXhwb3J0SW1wb3J0ZWREZXBlbmRlbmN5U3RhdGUnKSk7XG4gIH1cblxuICBvdXRwdXQucHVzaChgfSk7YCk7XG4gIG91dHB1dC5wdXNoKGBgKTtcbn1cblxub3V0cHV0LnB1c2goYGV4cG9ydHMubWFwID0gbmV3IE1hcCgpO2ApO1xuZm9yIChjb25zdCBkZXBlbmRlbmN5IG9mIGRlcGVuZGVuY3lJbmZvKSB7XG4gIGNvbnN0IERlcE5hbWUgPSBkZXBlbmRlbmN5WzBdO1xuICBjb25zdCBEZXBOYW1lU2VyaWFsID0gYCR7RGVwTmFtZX1TZXJpYWxgO1xuICBvdXRwdXQucHVzaChgZXhwb3J0cy4ke0RlcE5hbWV9ID0gJHtEZXBOYW1lU2VyaWFsfTtgKTtcbiAgb3V0cHV0LnB1c2goYGV4cG9ydHMubWFwLnNldCgke0RlcE5hbWV9LCAke0RlcE5hbWVTZXJpYWx9KTtgKTtcbn1cbm91dHB1dC5wdXNoKGBgKTtcblxucmVxdWlyZSgnZnMnKS53cml0ZUZpbGVTeW5jKHJlcXVpcmUoJ3BhdGgnKS5qb2luKF9fZGlybmFtZSwgJ2luZGV4LmpzJyksIG91dHB1dC5qb2luKCdcXG4nKSwgJ3V0ZjgnKTtcbiJdLCJzb3VyY2VSb290IjoiL1VzZXJzL3R5bGVyYXJidXMvZGV2L3Byb3ZpZGVyL3NyYyJ9

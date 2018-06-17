'use strict';

require('source-map-support/register');

const cachePrefix = require('./util').cachePrefix;
const LoggerFactory = require('./loggerFactory');
const pluginCompat = require('./util/plugin-compat');
const relateContext = require('./util/relate-context');

let LocalModule;
try {
  LocalModule = require('webpack/lib/dependencies/LocalModule');
} catch (_) {}

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

let AMDDefineDependency;
let AMDRequireArrayDependency;
let AMDRequireContextDependency;
let AMDRequireDependency;
let AMDRequireItemDependency;
let CommonJsRequireContextDependency;
let CommonJsRequireDependency;
let ConstDependency;
let ContextDependency;
let ContextElementDependency;
let CriticalDependencyWarning;
let DelegatedExportsDependency;
let DelegatedSourceDependency;
let DllEntryDependency;
let HarmonyAcceptDependency;
let HarmonyAcceptImportDependency;
let HarmonyCompatibilityDependency;
let HarmonyExportExpressionDependency;
let HarmonyExportHeaderDependency;
let HarmonyExportImportedSpecifierDependency;
let HarmonyExportSpecifierDependency;
let HarmonyImportDependency;
let HarmonyImportSpecifierDependency;
let ImportContextDependency;
let ImportDependency;
let ImportEagerContextDependency;
let ImportEagerDependency;
let ImportLazyContextDependency;
let ImportLazyOnceContextDependency;
let ImportWeakContextDependency;
let ImportWeakDependency;
let LoaderDependency;
let LocalModuleDependency;
let ModuleDependency;
let ModuleHotAcceptDependency;
let ModuleHotDeclineDependency;
let MultiEntryDependency;
let NullDependency;
let PrefetchDependency;
let RequireContextDependency;
let RequireEnsureDependency;
let RequireEnsureItemDependency;
let RequireHeaderDependency;
let RequireIncludeDependency;
let RequireResolveContextDependency;
let RequireResolveDependency;
let RequireResolveHeaderDependency;
let SingleEntryDependency;
let UnsupportedDependency;

const DependencySchemas2 = [['AMDDefineDependency', 'range', 'arrayRange', 'functionRange', 'objectRange', 'namedModule'], ['AMDRequireArrayDependency', 'depsArray', 'range'], ['AMDRequireContextDependency', 'request', 'recursive', 'regExp', 'range', 'valueRange'], ['AMDRequireDependency', 'block'], ['AMDRequireItemDependency', 'request', 'range'], ['CommonJsRequireContextDependency', 'request', 'recursive', 'regExp', 'range', 'valueRange'], ['CommonJsRequireDependency', 'request', 'range'], ['ConstDependency', 'expression', 'range'], ['ContextDependency', 'request', 'recursive', 'regExp'], ['ContextElementDependency', 'request', 'userRequest'], ['DelegatedSourceDependency', 'request'], ['DllEntryDependency', 'dependencies', 'name'], ['HarmonyAcceptDependency', 'range', 'dependencies', 'hasCallback'], ['HarmonyAcceptImportDependency', 'request', 'importedVar', 'range'], ['HarmonyCompatibilityDependency', 'originModule'], ['HarmonyExportExpressionDependency', 'originModule', 'range', 'rangeStatement'], ['HarmonyExportHeaderDependency', 'range', 'rangeStatement'], ['HarmonyExportImportedSpecifierDependency', 'originModule', 'importDependency', 'importedVar', 'id', 'name'], ['HarmonyExportSpecifierDependency', 'originModule', 'id', 'name', 'position', 'immutable'], ['HarmonyImportDependency', 'request', 'importedVar', 'range'], ['HarmonyImportSpecifierDependency', 'importDependency', 'importedVar', 'id', 'name', 'range', 'strictExportPresence'], ['ImportContextDependency', 'request', 'recursive', 'regExp', 'range', 'valueRange', 'chunkName'], ['ImportDependency', 'request', 'block'], ['ImportEagerContextDependency', 'request', 'recursive', 'regExp', 'range', 'valueRange', 'chunkName'], ['ImportEagerDependency', 'request', 'range'], ['ImportLazyContextDependency', 'request', 'recursive', 'regExp', 'range', 'valueRange', 'chunkName'], ['ImportLazyOnceContextDependency', 'request', 'recursive', 'regExp', 'range', 'valueRange', 'chunkName'], ['LoaderDependency', 'request'], ['LocalModuleDependency', 'localModule', 'range'], ['ModuleDependency', 'request'], ['ModuleHotAcceptDependency', 'request', 'range'], ['ModuleHotDeclineDependency', 'request', 'range'], ['MultiEntryDependency', 'dependencies', 'name'], ['NullDependency'], ['PrefetchDependency', 'request'], ['RequireContextDependency', 'request', 'recursive', 'regExp', 'range'], ['RequireEnsureDependency', 'block'], ['RequireEnsureItemDependency', 'request'], ['RequireHeaderDependency', 'range'], ['RequireIncludeDependency', 'request', 'range'], ['RequireResolveContextDependency', 'request', 'recursive', 'regExp', 'range', 'valueRange'], ['RequireResolveDependency', 'request', 'range'], ['RequireResolveHeaderDependency', 'range'], ['SingleEntryDependency', 'request'], ['UnsupportedDependency', 'request', 'range']];

const DependencySchemas3 = [['AMDDefineDependency', 'range', 'arrayRange', 'functionRange', 'objectRange', 'namedModule'], ['AMDRequireArrayDependency', 'depsArray', 'range'], ['AMDRequireContextDependency', 'request', 'recursive', 'regExp', 'range', 'valueRange'], ['AMDRequireDependency', 'block'], ['AMDRequireItemDependency', 'request', 'range'], ['CommonJsRequireContextDependency', 'request', 'recursive', 'regExp', 'range', 'valueRange'], ['CommonJsRequireDependency', 'request', 'range'], ['ConstDependency', 'expression', 'range'], ['ContextDependency', 'request', 'recursive', 'regExp'], ['ContextElementDependency', 'request', 'userRequest'], ['CriticalDependencyWarning', 'message'], ['DelegatedExportsDependency', 'originModule', 'exports'], ['DelegatedSourceDependency', 'request'], ['DllEntryDependency', 'dependencies', 'name'], ['HarmonyAcceptDependency', 'range', 'dependencies', 'hasCallback'], ['HarmonyAcceptImportDependency', 'request', 'importedVar', 'range'], ['HarmonyCompatibilityDependency', 'originModule'], ['HarmonyExportExpressionDependency', 'originModule', 'range', 'rangeStatement'], ['HarmonyExportHeaderDependency', 'range', 'rangeStatement'], ['HarmonyExportImportedSpecifierDependency', 'originModule', 'importDependency', 'importedVar', 'id', 'name', 'activeExports', 'otherStarExports'], ['HarmonyExportSpecifierDependency', 'originModule', 'id', 'name', 'position', 'immutable'], ['HarmonyImportDependency', 'request', 'importedVar', 'range'], ['HarmonyImportSpecifierDependency', 'importDependency', 'importedVar', 'id', 'name', 'range', 'strictExportPresence'], ['ImportContextDependency', 'request', 'recursive', 'regExp', 'range', 'valueRange', 'chunkName'], ['ImportDependency', 'request', 'block'], ['ImportEagerContextDependency', 'request', 'recursive', 'regExp', 'range', 'valueRange', 'chunkName'], ['ImportEagerDependency', 'request', 'range'], ['ImportLazyContextDependency', 'request', 'recursive', 'regExp', 'range', 'valueRange', 'chunkName'], ['ImportLazyOnceContextDependency', 'request', 'recursive', 'regExp', 'range', 'valueRange', 'chunkName'], ['ImportWeakContextDependency', 'request', 'recursive', 'regExp', 'range', 'valueRange', 'chunkName'], ['ImportWeakDependency', 'request', 'range'], ['LoaderDependency', 'request'], ['LocalModuleDependency', 'localModule', 'range'], ['ModuleDependency', 'request'], ['ModuleHotAcceptDependency', 'request', 'range'], ['ModuleHotDeclineDependency', 'request', 'range'], ['MultiEntryDependency', 'dependencies', 'name'], ['NullDependency'], ['PrefetchDependency', 'request'], ['RequireContextDependency', 'request', 'recursive', 'regExp', 'asyncMode', 'range'], ['RequireEnsureDependency', 'block'], ['RequireEnsureItemDependency', 'request'], ['RequireHeaderDependency', 'range'], ['RequireIncludeDependency', 'request', 'range'], ['RequireResolveContextDependency', 'request', 'recursive', 'regExp', 'range', 'valueRange'], ['RequireResolveDependency', 'request', 'range'], ['RequireResolveHeaderDependency', 'range'], ['SingleEntryDependency', 'request'], ['UnsupportedDependency', 'request', 'range']];

const freezeArgument = {
  dependencies(arg, dependency, extra, methods) {
    return methods.mapFreeze('Dependency', null, arg, extra);
  },
  depsArray(arg, dependency, extra, methods) {
    return methods.mapFreeze('Dependency', null, arg, extra);
  },
  localModule({ name, idx }, dependency, extra, methods) {
    return {
      name: name,
      idx: idx
    };
  },
  regExp(arg, dependency, extra, methods) {
    return arg ? arg.source : false;
  },
  request(arg, dependency, extra, methods) {
    return relateContext.relateAbsoluteRequest(extra.module.context, arg);
  },
  userRequest(arg, dependency, extra, methods) {
    return relateContext.relateAbsoluteRequest(extra.module.context, arg);
  },
  block(arg, dependency, extra, methods) {
    // Dependency nested in a parent. Freezing the block is a loop.
    if (arg.dependencies.includes(dependency)) {
      return;
    }
    return methods.freeze('DependencyBlock', null, arg, extra);
  },
  importDependency(arg, dependency, extra, methods) {
    return methods.freeze('Dependency', null, arg, extra);
  },
  originModule(arg, dependency, extra, methods) {
    // This will be in extra, generated or found during the process of thawing.
  },
  activeExports(arg, dependency, extra, methods) {
    return null;
  },
  otherStarExports(arg, dependency, extra, methods) {
    if (arg) {
      // This will be in extra, generated during the process of thawing.
      return 'star';
    }
    return null;
  },
  options(arg, dependency, extra, methods) {
    if (arg.regExp) {
      return Object.assign({}, arg, {
        regExp: arg.regExp.source
      });
    }
    return arg;
  },
  parserScope(arg, dependencies, extra, methods) {
    return;
  }
};

const thawArgument = {
  dependencies(arg, frozen, extra, methods) {
    return methods.mapThaw('Dependency', null, arg, extra);
  },
  depsArray(arg, frozen, extra, methods) {
    return methods.mapThaw('Dependency', null, arg, extra);
  },
  localModule({ idx, name, used }, frozen, extra, methods) {
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
  regExp(arg, frozen, extra, methods) {
    return arg ? new RegExp(arg) : arg;
  },
  // request: function(arg, dependency, extra, methods) {
  //   return relateContext.contextNormalRequest(extra.compilation.compiler, arg);
  // },
  block(arg, frozen, extra, methods) {
    // Not having a block, means it needs to create a cycle and refer to its
    // parent.
    if (!arg) {
      return extra.parent;
    }
    return methods.thaw('DependencyBlock', null, arg, extra);
  },
  importDependency(arg, frozen, extra, methods) {
    return methods.thaw('Dependency', null, arg, extra);
  },
  originModule(arg, frozen, extra, methods) {
    return extra.module;
  },
  activeExports(arg, { name }, { state }, methods) {
    state.activeExports = state.activeExports || new Set();
    if (name) {
      state.activeExports.add(name);
    }
    return state.activeExports;
  },
  otherStarExports(arg, frozen, { state }, methods) {
    if (arg === 'star') {
      return state.otherStarExports || [];
    }
    return null;
  },
  options(arg, frozen, extra, methods) {
    if (arg.regExp) {
      return Object.assign({}, arg, {
        regExp: new RegExp(arg.regExp)
      });
    }
    return arg;
  },
  parserScope(arg, frozen, { state }, methods) {
    state.harmonyParserScope = state.harmonyParserScope || {};
    return state.harmonyParserScope;
  }
};

function freezeDependency(dependency, extra, methods) {
  const schemas = extra.schemas;
  for (let i = 0; i < schemas.length; i++) {
    if (dependency.constructor === schemas[i].Dependency) {
      const frozen = {
        type: schemas[i][0]
      };
      for (let j = 1; j < schemas[i].length; j++) {
        let arg = dependency[schemas[i][j]];
        if (freezeArgument[schemas[i][j]]) {
          arg = freezeArgument[schemas[i][j]](arg, dependency, extra, methods);
        }
        frozen[schemas[i][j]] = arg;
      }
      return frozen;
    }
  }
}

function thawDependency(frozen, extra, methods) {
  const schemas = extra.schemas;
  schemas.map = schemas.map || {};
  if (schemas.map[frozen.type]) {
    const depSchema = schemas.map[frozen.type];
    const Dependency = depSchema.Dependency;
    try {
      return new Dependency(...depSchema.args(frozen, extra, methods));
    } catch (_) {
      return new (Function.prototype.bind.apply(Dependency, [null].concat(depSchema.args(frozen, extra, methods))))();
    }
  }

  for (const depSchema of schemas) {
    if (frozen.type === depSchema[0]) {
      schemas.map[frozen.type] = depSchema;
      const Dependency = depSchema.Dependency;
      const lines = [];
      for (let j = 1; j < depSchema.length; j++) {
        const argName = depSchema[j];
        if (thawArgument[argName]) {
          lines.push(`  thawArgument.${argName}(frozen.${argName}, frozen, extra, methods)`);
        } else {
          lines.push(`  frozen.${argName}`);
        }
      }
      depSchema.args = new Function('thawArgument', `
        return function(frozen, extra, methods) {
          return [
          ${lines.join(',\n')}
          ];
        };
      `)(thawArgument);
      try {
        return new Dependency(...depSchema.args(frozen, extra, methods));
      } catch (_) {
        return new (Function.prototype.bind.apply(Dependency, [null].concat(depSchema.args(frozen, extra, methods))))();
      }
    }
  }
}

class TransformBasicDependencyPluginLegacy {
  constructor(options) {
    this.options = options;
  }

  apply(compiler) {
    let schemas = DependencySchemas3;
    if (this.options.schema < 3) {
      schemas = DependencySchemas2;
    }

    pluginCompat.tap(compiler, 'afterPlugins', 'TransformBasicDependencyPlugin scan Dependency types', () => {
      pluginCompat.tap(compiler, 'compilation', 'TransformBasicDependencyPlugin scan Dependencies types', ({ dependencyFactories }) => {
        const Dependencies = dependencyFactories.keys();
        for (const Dep of Dependencies) {
          for (let i = 0; i < schemas.length; i++) {
            if (Dep.name === schemas[i][0]) {
              schemas[i].Dependency = Dep;
            }
          }
        }
        for (let i = 0; i < schemas.length; i++) {
          if (!schemas[i].Dependency) {
            if (this.options.schema < 4) {} else {
              if (schemas[i][0] === 'JsonExportsDependency') {
                try {
                  schemas[i].Dependency = require('webpack/lib/dependencies/JsonExportsDependency');
                } catch (_) {}
              } else if (schemas[i][0] === 'DelegatedExportsDependency') {
                try {
                  schemas[i].Dependency = require('webpack/lib/dependencies/DelegatedExportsDependency');
                } catch (_) {}
              } else if (schemas[i][0] === 'DelegatedSourceDependency') {
                try {
                  schemas[i].Dependency = require('webpack/lib/dependencies/DelegatedSourceDependency');
                } catch (_) {}
              }
            }
          }
        }
      });
    });

    let methods;

    pluginCompat.tap(compiler, '_hardSourceMethods', 'TransformBasicDependencyPlugin methods', _methods => {
      methods = _methods;
    });

    pluginCompat.tap(compiler, '_hardSourceFreezeDependency', 'TransformBasicDependencyPlugin freeze', (frozen, dependency, extra) => {
      extra.schemas = schemas;
      const _frozen = freezeDependency(dependency, extra, methods);
      if (_frozen) {
        if (dependency.prepend) {
          _frozen.prepend = dependency.prepend;
        }
        if (dependency.replaces) {
          _frozen.replaces = dependency.replaces;
        }
        if (dependency.critical) {
          _frozen.critical = dependency.critical;
        }
        if (typeof dependency.namespaceObjectAsContext !== 'undefined') {
          _frozen.namespaceObjectAsContext = dependency.namespaceObjectAsContext;
        }
        if (typeof dependency.callArgs !== 'undefined') {
          _frozen.callArgs = dependency.callArgs;
        }
        if (typeof dependency.call !== 'undefined') {
          _frozen.call = dependency.call;
        }
        if (typeof dependency.directImport !== 'undefined') {
          _frozen.directImport = dependency.directImport;
        }
        if (typeof dependency.shorthand !== 'undefined') {
          _frozen.shorthand = dependency.shorthand;
        }
        if (typeof dependency.localModule === 'object' && dependency.localModule !== null) {
          _frozen.localModule = {
            name: dependency.localModule.name,
            idx: dependency.localModule.idx,
            used: dependency.localModule.used
          };
        }
        return _frozen;
      }

      return frozen;
    });

    pluginCompat.tap(compiler, '_hardSourceAfterFreezeDependency', 'TransformBasicDependencyPlugin after freeze', (frozen, dependency, extra) => {
      if (frozen && dependency.loc) {
        frozen.loc = flattenPrototype(dependency.loc);
      }

      if (frozen && dependency.optional) {
        frozen.optional = dependency.optional;
      }

      if (frozen && dependency.getWarnings) {
        const warnings = dependency.getWarnings();
        if (warnings && warnings.length) {
          frozen.warnings = warnings.map(({ stack }) => stack.includes('\n    at pluginCompat.tap') ? stack.split('\n    at pluginCompat.tap')[0] : stack.split('\n    at Compiler.pluginCompat.tap')[0]);
        }
      }

      return frozen;
    });

    pluginCompat.tap(compiler, '_hardSourceThawDependency', 'TransformBasicDependencyPlugin', (dependency, frozen, extra) => {
      extra.schemas = schemas;
      const _thawed = thawDependency(frozen, extra, methods);
      if (_thawed) {
        const state = extra.state;
        // console.log('Thawed', frozen.type);
        if (frozen.prepend) {
          _thawed.prepend = frozen.prepend;
        }
        if (frozen.replaces) {
          _thawed.replaces = frozen.replaced;
        }
        if (frozen.critical) {
          _thawed.critical = frozen.critical;
        }
        if (typeof frozen.namespaceObjectAsContext !== 'undefined') {
          _thawed.namespaceObjectAsContext = frozen.namespaceObjectAsContext;
        }
        if (typeof frozen.callArgs !== 'undefined') {
          _thawed.callArgs = frozen.callArgs;
        }
        if (typeof frozen.call !== 'undefined') {
          _thawed.call = frozen.call;
        }
        if (typeof frozen.directImport !== 'undefined') {
          _thawed.directImport = frozen.directImport;
        }
        if (typeof frozen.shorthand !== 'undefined') {
          _thawed.shorthand = frozen.shorthand;
        }
        if (typeof frozen.localModule === 'object' && frozen.localModule !== null) {
          if (!state.localModules) {
            state.localModules = [];
          }
          if (!state.localModules[frozen.localModule.idx]) {
            state.localModules[frozen.localModule.idx] = new LocalModule(extra.module, frozen.localModule.name, frozen.localModule.idx);
            state.localModules[frozen.localModule.idx].used = frozen.localModule.used;
          }
          _thawed.localModule = state.localModules[frozen.localModule.idx];
        }
        if (frozen.type === 'HarmonyImportDependency') {
          const ref = frozen.range.toString();
          if (state.imports[ref]) {
            return state.imports[ref];
          }
          state.imports[ref] = _thawed;
        } else if (frozen.type === 'HarmonyExportImportedSpecifierDependency') {
          if (_thawed.otherStarExports) {
            extra.state.otherStarExports = (extra.state.otherStarExports || []).concat(_thawed);
          }
        }
        return _thawed;
      }

      return dependency;
    });

    pluginCompat.tap(compiler, '_hardSourceAfterThawDependency', 'TransformBasicDependencyPlugin', (dependency, { loc, optional, warnings }, extra) => {
      if (dependency && loc) {
        dependency.loc = loc;
      }

      if (dependency && optional) {
        dependency.optional = true;
      }

      if (dependency && warnings && dependency.getWarnings) {
        const frozenWarnings = warnings;
        const _getWarnings = dependency.getWarnings;
        dependency.getWarnings = function () {
          const warnings = _getWarnings.call(this);
          if (warnings && warnings.length) {
            return warnings.map((warning, i) => {
              const stack = warning.stack.split('\n    at Compilation.reportDependencyErrorsAndWarnings')[1];
              warning.stack = `${frozenWarnings[i]}\n    at Compilation.reportDependencyErrorsAndWarnings${stack}`;
              return warning;
            });
          }
          return warnings;
        };
      }

      return dependency;
    });
  }
}

module.exports = TransformBasicDependencyPluginLegacy;
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImhhcmQtc291cmNlLXdlYnBhY2stcGx1Z2luL2xpYi9UcmFuc2Zvcm1CYXNpY0RlcGVuZGVuY3lQbHVnaW5MZWdhY3kuanMiXSwibmFtZXMiOlsiY2FjaGVQcmVmaXgiLCJyZXF1aXJlIiwiTG9nZ2VyRmFjdG9yeSIsInBsdWdpbkNvbXBhdCIsInJlbGF0ZUNvbnRleHQiLCJMb2NhbE1vZHVsZSIsIl8iLCJmbGF0dGVuUHJvdG90eXBlIiwib2JqIiwiY29weSIsImtleSIsIkFNRERlZmluZURlcGVuZGVuY3kiLCJBTURSZXF1aXJlQXJyYXlEZXBlbmRlbmN5IiwiQU1EUmVxdWlyZUNvbnRleHREZXBlbmRlbmN5IiwiQU1EUmVxdWlyZURlcGVuZGVuY3kiLCJBTURSZXF1aXJlSXRlbURlcGVuZGVuY3kiLCJDb21tb25Kc1JlcXVpcmVDb250ZXh0RGVwZW5kZW5jeSIsIkNvbW1vbkpzUmVxdWlyZURlcGVuZGVuY3kiLCJDb25zdERlcGVuZGVuY3kiLCJDb250ZXh0RGVwZW5kZW5jeSIsIkNvbnRleHRFbGVtZW50RGVwZW5kZW5jeSIsIkNyaXRpY2FsRGVwZW5kZW5jeVdhcm5pbmciLCJEZWxlZ2F0ZWRFeHBvcnRzRGVwZW5kZW5jeSIsIkRlbGVnYXRlZFNvdXJjZURlcGVuZGVuY3kiLCJEbGxFbnRyeURlcGVuZGVuY3kiLCJIYXJtb255QWNjZXB0RGVwZW5kZW5jeSIsIkhhcm1vbnlBY2NlcHRJbXBvcnREZXBlbmRlbmN5IiwiSGFybW9ueUNvbXBhdGliaWxpdHlEZXBlbmRlbmN5IiwiSGFybW9ueUV4cG9ydEV4cHJlc3Npb25EZXBlbmRlbmN5IiwiSGFybW9ueUV4cG9ydEhlYWRlckRlcGVuZGVuY3kiLCJIYXJtb255RXhwb3J0SW1wb3J0ZWRTcGVjaWZpZXJEZXBlbmRlbmN5IiwiSGFybW9ueUV4cG9ydFNwZWNpZmllckRlcGVuZGVuY3kiLCJIYXJtb255SW1wb3J0RGVwZW5kZW5jeSIsIkhhcm1vbnlJbXBvcnRTcGVjaWZpZXJEZXBlbmRlbmN5IiwiSW1wb3J0Q29udGV4dERlcGVuZGVuY3kiLCJJbXBvcnREZXBlbmRlbmN5IiwiSW1wb3J0RWFnZXJDb250ZXh0RGVwZW5kZW5jeSIsIkltcG9ydEVhZ2VyRGVwZW5kZW5jeSIsIkltcG9ydExhenlDb250ZXh0RGVwZW5kZW5jeSIsIkltcG9ydExhenlPbmNlQ29udGV4dERlcGVuZGVuY3kiLCJJbXBvcnRXZWFrQ29udGV4dERlcGVuZGVuY3kiLCJJbXBvcnRXZWFrRGVwZW5kZW5jeSIsIkxvYWRlckRlcGVuZGVuY3kiLCJMb2NhbE1vZHVsZURlcGVuZGVuY3kiLCJNb2R1bGVEZXBlbmRlbmN5IiwiTW9kdWxlSG90QWNjZXB0RGVwZW5kZW5jeSIsIk1vZHVsZUhvdERlY2xpbmVEZXBlbmRlbmN5IiwiTXVsdGlFbnRyeURlcGVuZGVuY3kiLCJOdWxsRGVwZW5kZW5jeSIsIlByZWZldGNoRGVwZW5kZW5jeSIsIlJlcXVpcmVDb250ZXh0RGVwZW5kZW5jeSIsIlJlcXVpcmVFbnN1cmVEZXBlbmRlbmN5IiwiUmVxdWlyZUVuc3VyZUl0ZW1EZXBlbmRlbmN5IiwiUmVxdWlyZUhlYWRlckRlcGVuZGVuY3kiLCJSZXF1aXJlSW5jbHVkZURlcGVuZGVuY3kiLCJSZXF1aXJlUmVzb2x2ZUNvbnRleHREZXBlbmRlbmN5IiwiUmVxdWlyZVJlc29sdmVEZXBlbmRlbmN5IiwiUmVxdWlyZVJlc29sdmVIZWFkZXJEZXBlbmRlbmN5IiwiU2luZ2xlRW50cnlEZXBlbmRlbmN5IiwiVW5zdXBwb3J0ZWREZXBlbmRlbmN5IiwiRGVwZW5kZW5jeVNjaGVtYXMyIiwiRGVwZW5kZW5jeVNjaGVtYXMzIiwiZnJlZXplQXJndW1lbnQiLCJkZXBlbmRlbmNpZXMiLCJhcmciLCJkZXBlbmRlbmN5IiwiZXh0cmEiLCJtZXRob2RzIiwibWFwRnJlZXplIiwiZGVwc0FycmF5IiwibG9jYWxNb2R1bGUiLCJuYW1lIiwiaWR4IiwicmVnRXhwIiwic291cmNlIiwicmVxdWVzdCIsInJlbGF0ZUFic29sdXRlUmVxdWVzdCIsIm1vZHVsZSIsImNvbnRleHQiLCJ1c2VyUmVxdWVzdCIsImJsb2NrIiwiaW5jbHVkZXMiLCJmcmVlemUiLCJpbXBvcnREZXBlbmRlbmN5Iiwib3JpZ2luTW9kdWxlIiwiYWN0aXZlRXhwb3J0cyIsIm90aGVyU3RhckV4cG9ydHMiLCJvcHRpb25zIiwiT2JqZWN0IiwiYXNzaWduIiwicGFyc2VyU2NvcGUiLCJ0aGF3QXJndW1lbnQiLCJmcm96ZW4iLCJtYXBUaGF3IiwidXNlZCIsInN0YXRlIiwibG9jYWxNb2R1bGVzIiwiUmVnRXhwIiwicGFyZW50IiwidGhhdyIsIlNldCIsImFkZCIsImhhcm1vbnlQYXJzZXJTY29wZSIsImZyZWV6ZURlcGVuZGVuY3kiLCJzY2hlbWFzIiwiaSIsImxlbmd0aCIsImNvbnN0cnVjdG9yIiwiRGVwZW5kZW5jeSIsInR5cGUiLCJqIiwidGhhd0RlcGVuZGVuY3kiLCJtYXAiLCJkZXBTY2hlbWEiLCJhcmdzIiwiRnVuY3Rpb24iLCJwcm90b3R5cGUiLCJiaW5kIiwiYXBwbHkiLCJjb25jYXQiLCJsaW5lcyIsImFyZ05hbWUiLCJwdXNoIiwiam9pbiIsIlRyYW5zZm9ybUJhc2ljRGVwZW5kZW5jeVBsdWdpbkxlZ2FjeSIsImNvbXBpbGVyIiwic2NoZW1hIiwidGFwIiwiZGVwZW5kZW5jeUZhY3RvcmllcyIsIkRlcGVuZGVuY2llcyIsImtleXMiLCJEZXAiLCJfbWV0aG9kcyIsIl9mcm96ZW4iLCJwcmVwZW5kIiwicmVwbGFjZXMiLCJjcml0aWNhbCIsIm5hbWVzcGFjZU9iamVjdEFzQ29udGV4dCIsImNhbGxBcmdzIiwiY2FsbCIsImRpcmVjdEltcG9ydCIsInNob3J0aGFuZCIsImxvYyIsIm9wdGlvbmFsIiwiZ2V0V2FybmluZ3MiLCJ3YXJuaW5ncyIsInN0YWNrIiwic3BsaXQiLCJfdGhhd2VkIiwicmVwbGFjZWQiLCJyZWYiLCJyYW5nZSIsInRvU3RyaW5nIiwiaW1wb3J0cyIsImZyb3plbldhcm5pbmdzIiwiX2dldFdhcm5pbmdzIiwid2FybmluZyIsImV4cG9ydHMiXSwibWFwcGluZ3MiOiI7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U0FkRDtBQWVEOztBQUVELGFBQU9oRixVQUFQO0FBQ0QsS0FsQ0g7QUFvQ0Q7QUFwUXdDOztBQXVRM0NZLE9BQU9nRixPQUFQLEdBQWlCakMsb0NBQWpCIiwiZmlsZSI6ImhhcmQtc291cmNlLXdlYnBhY2stcGx1Z2luL2xpYi9UcmFuc2Zvcm1CYXNpY0RlcGVuZGVuY3lQbHVnaW5MZWdhY3kuanMiLCJzb3VyY2VzQ29udGVudCI6WyJjb25zdCBjYWNoZVByZWZpeCA9IHJlcXVpcmUoJy4vdXRpbCcpLmNhY2hlUHJlZml4O1xuY29uc3QgTG9nZ2VyRmFjdG9yeSA9IHJlcXVpcmUoJy4vbG9nZ2VyRmFjdG9yeScpO1xuY29uc3QgcGx1Z2luQ29tcGF0ID0gcmVxdWlyZSgnLi91dGlsL3BsdWdpbi1jb21wYXQnKTtcbmNvbnN0IHJlbGF0ZUNvbnRleHQgPSByZXF1aXJlKCcuL3V0aWwvcmVsYXRlLWNvbnRleHQnKTtcblxubGV0IExvY2FsTW9kdWxlO1xudHJ5IHtcbiAgTG9jYWxNb2R1bGUgPSByZXF1aXJlKCd3ZWJwYWNrL2xpYi9kZXBlbmRlbmNpZXMvTG9jYWxNb2R1bGUnKTtcbn0gY2F0Y2ggKF8pIHt9XG5cbmZ1bmN0aW9uIGZsYXR0ZW5Qcm90b3R5cGUob2JqKSB7XG4gIGlmICh0eXBlb2Ygb2JqID09PSAnc3RyaW5nJykge1xuICAgIHJldHVybiBvYmo7XG4gIH1cbiAgY29uc3QgY29weSA9IHt9O1xuICBmb3IgKGNvbnN0IGtleSBpbiBvYmopIHtcbiAgICBjb3B5W2tleV0gPSBvYmpba2V5XTtcbiAgfVxuICByZXR1cm4gY29weTtcbn1cblxubGV0IEFNRERlZmluZURlcGVuZGVuY3k7XG5sZXQgQU1EUmVxdWlyZUFycmF5RGVwZW5kZW5jeTtcbmxldCBBTURSZXF1aXJlQ29udGV4dERlcGVuZGVuY3k7XG5sZXQgQU1EUmVxdWlyZURlcGVuZGVuY3k7XG5sZXQgQU1EUmVxdWlyZUl0ZW1EZXBlbmRlbmN5O1xubGV0IENvbW1vbkpzUmVxdWlyZUNvbnRleHREZXBlbmRlbmN5O1xubGV0IENvbW1vbkpzUmVxdWlyZURlcGVuZGVuY3k7XG5sZXQgQ29uc3REZXBlbmRlbmN5O1xubGV0IENvbnRleHREZXBlbmRlbmN5O1xubGV0IENvbnRleHRFbGVtZW50RGVwZW5kZW5jeTtcbmxldCBDcml0aWNhbERlcGVuZGVuY3lXYXJuaW5nO1xubGV0IERlbGVnYXRlZEV4cG9ydHNEZXBlbmRlbmN5O1xubGV0IERlbGVnYXRlZFNvdXJjZURlcGVuZGVuY3k7XG5sZXQgRGxsRW50cnlEZXBlbmRlbmN5O1xubGV0IEhhcm1vbnlBY2NlcHREZXBlbmRlbmN5O1xubGV0IEhhcm1vbnlBY2NlcHRJbXBvcnREZXBlbmRlbmN5O1xubGV0IEhhcm1vbnlDb21wYXRpYmlsaXR5RGVwZW5kZW5jeTtcbmxldCBIYXJtb255RXhwb3J0RXhwcmVzc2lvbkRlcGVuZGVuY3k7XG5sZXQgSGFybW9ueUV4cG9ydEhlYWRlckRlcGVuZGVuY3k7XG5sZXQgSGFybW9ueUV4cG9ydEltcG9ydGVkU3BlY2lmaWVyRGVwZW5kZW5jeTtcbmxldCBIYXJtb255RXhwb3J0U3BlY2lmaWVyRGVwZW5kZW5jeTtcbmxldCBIYXJtb255SW1wb3J0RGVwZW5kZW5jeTtcbmxldCBIYXJtb255SW1wb3J0U3BlY2lmaWVyRGVwZW5kZW5jeTtcbmxldCBJbXBvcnRDb250ZXh0RGVwZW5kZW5jeTtcbmxldCBJbXBvcnREZXBlbmRlbmN5O1xubGV0IEltcG9ydEVhZ2VyQ29udGV4dERlcGVuZGVuY3k7XG5sZXQgSW1wb3J0RWFnZXJEZXBlbmRlbmN5O1xubGV0IEltcG9ydExhenlDb250ZXh0RGVwZW5kZW5jeTtcbmxldCBJbXBvcnRMYXp5T25jZUNvbnRleHREZXBlbmRlbmN5O1xubGV0IEltcG9ydFdlYWtDb250ZXh0RGVwZW5kZW5jeTtcbmxldCBJbXBvcnRXZWFrRGVwZW5kZW5jeTtcbmxldCBMb2FkZXJEZXBlbmRlbmN5O1xubGV0IExvY2FsTW9kdWxlRGVwZW5kZW5jeTtcbmxldCBNb2R1bGVEZXBlbmRlbmN5O1xubGV0IE1vZHVsZUhvdEFjY2VwdERlcGVuZGVuY3k7XG5sZXQgTW9kdWxlSG90RGVjbGluZURlcGVuZGVuY3k7XG5sZXQgTXVsdGlFbnRyeURlcGVuZGVuY3k7XG5sZXQgTnVsbERlcGVuZGVuY3k7XG5sZXQgUHJlZmV0Y2hEZXBlbmRlbmN5O1xubGV0IFJlcXVpcmVDb250ZXh0RGVwZW5kZW5jeTtcbmxldCBSZXF1aXJlRW5zdXJlRGVwZW5kZW5jeTtcbmxldCBSZXF1aXJlRW5zdXJlSXRlbURlcGVuZGVuY3k7XG5sZXQgUmVxdWlyZUhlYWRlckRlcGVuZGVuY3k7XG5sZXQgUmVxdWlyZUluY2x1ZGVEZXBlbmRlbmN5O1xubGV0IFJlcXVpcmVSZXNvbHZlQ29udGV4dERlcGVuZGVuY3k7XG5sZXQgUmVxdWlyZVJlc29sdmVEZXBlbmRlbmN5O1xubGV0IFJlcXVpcmVSZXNvbHZlSGVhZGVyRGVwZW5kZW5jeTtcbmxldCBTaW5nbGVFbnRyeURlcGVuZGVuY3k7XG5sZXQgVW5zdXBwb3J0ZWREZXBlbmRlbmN5O1xuXG5jb25zdCBEZXBlbmRlbmN5U2NoZW1hczIgPSBbXG4gIFtcbiAgICAnQU1ERGVmaW5lRGVwZW5kZW5jeScsXG4gICAgJ3JhbmdlJyxcbiAgICAnYXJyYXlSYW5nZScsXG4gICAgJ2Z1bmN0aW9uUmFuZ2UnLFxuICAgICdvYmplY3RSYW5nZScsXG4gICAgJ25hbWVkTW9kdWxlJyxcbiAgXSxcbiAgWydBTURSZXF1aXJlQXJyYXlEZXBlbmRlbmN5JywgJ2RlcHNBcnJheScsICdyYW5nZSddLFxuICBbXG4gICAgJ0FNRFJlcXVpcmVDb250ZXh0RGVwZW5kZW5jeScsXG4gICAgJ3JlcXVlc3QnLFxuICAgICdyZWN1cnNpdmUnLFxuICAgICdyZWdFeHAnLFxuICAgICdyYW5nZScsXG4gICAgJ3ZhbHVlUmFuZ2UnLFxuICBdLFxuICBbJ0FNRFJlcXVpcmVEZXBlbmRlbmN5JywgJ2Jsb2NrJ10sXG4gIFsnQU1EUmVxdWlyZUl0ZW1EZXBlbmRlbmN5JywgJ3JlcXVlc3QnLCAncmFuZ2UnXSxcbiAgW1xuICAgICdDb21tb25Kc1JlcXVpcmVDb250ZXh0RGVwZW5kZW5jeScsXG4gICAgJ3JlcXVlc3QnLFxuICAgICdyZWN1cnNpdmUnLFxuICAgICdyZWdFeHAnLFxuICAgICdyYW5nZScsXG4gICAgJ3ZhbHVlUmFuZ2UnLFxuICBdLFxuICBbJ0NvbW1vbkpzUmVxdWlyZURlcGVuZGVuY3knLCAncmVxdWVzdCcsICdyYW5nZSddLFxuICBbJ0NvbnN0RGVwZW5kZW5jeScsICdleHByZXNzaW9uJywgJ3JhbmdlJ10sXG4gIFsnQ29udGV4dERlcGVuZGVuY3knLCAncmVxdWVzdCcsICdyZWN1cnNpdmUnLCAncmVnRXhwJ10sXG4gIFsnQ29udGV4dEVsZW1lbnREZXBlbmRlbmN5JywgJ3JlcXVlc3QnLCAndXNlclJlcXVlc3QnXSxcbiAgWydEZWxlZ2F0ZWRTb3VyY2VEZXBlbmRlbmN5JywgJ3JlcXVlc3QnXSxcbiAgWydEbGxFbnRyeURlcGVuZGVuY3knLCAnZGVwZW5kZW5jaWVzJywgJ25hbWUnXSxcbiAgWydIYXJtb255QWNjZXB0RGVwZW5kZW5jeScsICdyYW5nZScsICdkZXBlbmRlbmNpZXMnLCAnaGFzQ2FsbGJhY2snXSxcbiAgWydIYXJtb255QWNjZXB0SW1wb3J0RGVwZW5kZW5jeScsICdyZXF1ZXN0JywgJ2ltcG9ydGVkVmFyJywgJ3JhbmdlJ10sXG4gIFsnSGFybW9ueUNvbXBhdGliaWxpdHlEZXBlbmRlbmN5JywgJ29yaWdpbk1vZHVsZSddLFxuICBbXG4gICAgJ0hhcm1vbnlFeHBvcnRFeHByZXNzaW9uRGVwZW5kZW5jeScsXG4gICAgJ29yaWdpbk1vZHVsZScsXG4gICAgJ3JhbmdlJyxcbiAgICAncmFuZ2VTdGF0ZW1lbnQnLFxuICBdLFxuICBbJ0hhcm1vbnlFeHBvcnRIZWFkZXJEZXBlbmRlbmN5JywgJ3JhbmdlJywgJ3JhbmdlU3RhdGVtZW50J10sXG4gIFtcbiAgICAnSGFybW9ueUV4cG9ydEltcG9ydGVkU3BlY2lmaWVyRGVwZW5kZW5jeScsXG4gICAgJ29yaWdpbk1vZHVsZScsXG4gICAgJ2ltcG9ydERlcGVuZGVuY3knLFxuICAgICdpbXBvcnRlZFZhcicsXG4gICAgJ2lkJyxcbiAgICAnbmFtZScsXG4gIF0sXG4gIFtcbiAgICAnSGFybW9ueUV4cG9ydFNwZWNpZmllckRlcGVuZGVuY3knLFxuICAgICdvcmlnaW5Nb2R1bGUnLFxuICAgICdpZCcsXG4gICAgJ25hbWUnLFxuICAgICdwb3NpdGlvbicsXG4gICAgJ2ltbXV0YWJsZScsXG4gIF0sXG4gIFsnSGFybW9ueUltcG9ydERlcGVuZGVuY3knLCAncmVxdWVzdCcsICdpbXBvcnRlZFZhcicsICdyYW5nZSddLFxuICBbXG4gICAgJ0hhcm1vbnlJbXBvcnRTcGVjaWZpZXJEZXBlbmRlbmN5JyxcbiAgICAnaW1wb3J0RGVwZW5kZW5jeScsXG4gICAgJ2ltcG9ydGVkVmFyJyxcbiAgICAnaWQnLFxuICAgICduYW1lJyxcbiAgICAncmFuZ2UnLFxuICAgICdzdHJpY3RFeHBvcnRQcmVzZW5jZScsXG4gIF0sXG4gIFtcbiAgICAnSW1wb3J0Q29udGV4dERlcGVuZGVuY3knLFxuICAgICdyZXF1ZXN0JyxcbiAgICAncmVjdXJzaXZlJyxcbiAgICAncmVnRXhwJyxcbiAgICAncmFuZ2UnLFxuICAgICd2YWx1ZVJhbmdlJyxcbiAgICAnY2h1bmtOYW1lJyxcbiAgXSxcbiAgWydJbXBvcnREZXBlbmRlbmN5JywgJ3JlcXVlc3QnLCAnYmxvY2snXSxcbiAgW1xuICAgICdJbXBvcnRFYWdlckNvbnRleHREZXBlbmRlbmN5JyxcbiAgICAncmVxdWVzdCcsXG4gICAgJ3JlY3Vyc2l2ZScsXG4gICAgJ3JlZ0V4cCcsXG4gICAgJ3JhbmdlJyxcbiAgICAndmFsdWVSYW5nZScsXG4gICAgJ2NodW5rTmFtZScsXG4gIF0sXG4gIFsnSW1wb3J0RWFnZXJEZXBlbmRlbmN5JywgJ3JlcXVlc3QnLCAncmFuZ2UnXSxcbiAgW1xuICAgICdJbXBvcnRMYXp5Q29udGV4dERlcGVuZGVuY3knLFxuICAgICdyZXF1ZXN0JyxcbiAgICAncmVjdXJzaXZlJyxcbiAgICAncmVnRXhwJyxcbiAgICAncmFuZ2UnLFxuICAgICd2YWx1ZVJhbmdlJyxcbiAgICAnY2h1bmtOYW1lJyxcbiAgXSxcbiAgW1xuICAgICdJbXBvcnRMYXp5T25jZUNvbnRleHREZXBlbmRlbmN5JyxcbiAgICAncmVxdWVzdCcsXG4gICAgJ3JlY3Vyc2l2ZScsXG4gICAgJ3JlZ0V4cCcsXG4gICAgJ3JhbmdlJyxcbiAgICAndmFsdWVSYW5nZScsXG4gICAgJ2NodW5rTmFtZScsXG4gIF0sXG4gIFsnTG9hZGVyRGVwZW5kZW5jeScsICdyZXF1ZXN0J10sXG4gIFsnTG9jYWxNb2R1bGVEZXBlbmRlbmN5JywgJ2xvY2FsTW9kdWxlJywgJ3JhbmdlJ10sXG4gIFsnTW9kdWxlRGVwZW5kZW5jeScsICdyZXF1ZXN0J10sXG4gIFsnTW9kdWxlSG90QWNjZXB0RGVwZW5kZW5jeScsICdyZXF1ZXN0JywgJ3JhbmdlJ10sXG4gIFsnTW9kdWxlSG90RGVjbGluZURlcGVuZGVuY3knLCAncmVxdWVzdCcsICdyYW5nZSddLFxuICBbJ011bHRpRW50cnlEZXBlbmRlbmN5JywgJ2RlcGVuZGVuY2llcycsICduYW1lJ10sXG4gIFsnTnVsbERlcGVuZGVuY3knXSxcbiAgWydQcmVmZXRjaERlcGVuZGVuY3knLCAncmVxdWVzdCddLFxuICBbJ1JlcXVpcmVDb250ZXh0RGVwZW5kZW5jeScsICdyZXF1ZXN0JywgJ3JlY3Vyc2l2ZScsICdyZWdFeHAnLCAncmFuZ2UnXSxcbiAgWydSZXF1aXJlRW5zdXJlRGVwZW5kZW5jeScsICdibG9jayddLFxuICBbJ1JlcXVpcmVFbnN1cmVJdGVtRGVwZW5kZW5jeScsICdyZXF1ZXN0J10sXG4gIFsnUmVxdWlyZUhlYWRlckRlcGVuZGVuY3knLCAncmFuZ2UnXSxcbiAgWydSZXF1aXJlSW5jbHVkZURlcGVuZGVuY3knLCAncmVxdWVzdCcsICdyYW5nZSddLFxuICBbXG4gICAgJ1JlcXVpcmVSZXNvbHZlQ29udGV4dERlcGVuZGVuY3knLFxuICAgICdyZXF1ZXN0JyxcbiAgICAncmVjdXJzaXZlJyxcbiAgICAncmVnRXhwJyxcbiAgICAncmFuZ2UnLFxuICAgICd2YWx1ZVJhbmdlJyxcbiAgXSxcbiAgWydSZXF1aXJlUmVzb2x2ZURlcGVuZGVuY3knLCAncmVxdWVzdCcsICdyYW5nZSddLFxuICBbJ1JlcXVpcmVSZXNvbHZlSGVhZGVyRGVwZW5kZW5jeScsICdyYW5nZSddLFxuICBbJ1NpbmdsZUVudHJ5RGVwZW5kZW5jeScsICdyZXF1ZXN0J10sXG4gIFsnVW5zdXBwb3J0ZWREZXBlbmRlbmN5JywgJ3JlcXVlc3QnLCAncmFuZ2UnXSxcbl07XG5cbmNvbnN0IERlcGVuZGVuY3lTY2hlbWFzMyA9IFtcbiAgW1xuICAgICdBTUREZWZpbmVEZXBlbmRlbmN5JyxcbiAgICAncmFuZ2UnLFxuICAgICdhcnJheVJhbmdlJyxcbiAgICAnZnVuY3Rpb25SYW5nZScsXG4gICAgJ29iamVjdFJhbmdlJyxcbiAgICAnbmFtZWRNb2R1bGUnLFxuICBdLFxuICBbJ0FNRFJlcXVpcmVBcnJheURlcGVuZGVuY3knLCAnZGVwc0FycmF5JywgJ3JhbmdlJ10sXG4gIFtcbiAgICAnQU1EUmVxdWlyZUNvbnRleHREZXBlbmRlbmN5JyxcbiAgICAncmVxdWVzdCcsXG4gICAgJ3JlY3Vyc2l2ZScsXG4gICAgJ3JlZ0V4cCcsXG4gICAgJ3JhbmdlJyxcbiAgICAndmFsdWVSYW5nZScsXG4gIF0sXG4gIFsnQU1EUmVxdWlyZURlcGVuZGVuY3knLCAnYmxvY2snXSxcbiAgWydBTURSZXF1aXJlSXRlbURlcGVuZGVuY3knLCAncmVxdWVzdCcsICdyYW5nZSddLFxuICBbXG4gICAgJ0NvbW1vbkpzUmVxdWlyZUNvbnRleHREZXBlbmRlbmN5JyxcbiAgICAncmVxdWVzdCcsXG4gICAgJ3JlY3Vyc2l2ZScsXG4gICAgJ3JlZ0V4cCcsXG4gICAgJ3JhbmdlJyxcbiAgICAndmFsdWVSYW5nZScsXG4gIF0sXG4gIFsnQ29tbW9uSnNSZXF1aXJlRGVwZW5kZW5jeScsICdyZXF1ZXN0JywgJ3JhbmdlJ10sXG4gIFsnQ29uc3REZXBlbmRlbmN5JywgJ2V4cHJlc3Npb24nLCAncmFuZ2UnXSxcbiAgWydDb250ZXh0RGVwZW5kZW5jeScsICdyZXF1ZXN0JywgJ3JlY3Vyc2l2ZScsICdyZWdFeHAnXSxcbiAgWydDb250ZXh0RWxlbWVudERlcGVuZGVuY3knLCAncmVxdWVzdCcsICd1c2VyUmVxdWVzdCddLFxuICBbJ0NyaXRpY2FsRGVwZW5kZW5jeVdhcm5pbmcnLCAnbWVzc2FnZSddLFxuICBbJ0RlbGVnYXRlZEV4cG9ydHNEZXBlbmRlbmN5JywgJ29yaWdpbk1vZHVsZScsICdleHBvcnRzJ10sXG4gIFsnRGVsZWdhdGVkU291cmNlRGVwZW5kZW5jeScsICdyZXF1ZXN0J10sXG4gIFsnRGxsRW50cnlEZXBlbmRlbmN5JywgJ2RlcGVuZGVuY2llcycsICduYW1lJ10sXG4gIFsnSGFybW9ueUFjY2VwdERlcGVuZGVuY3knLCAncmFuZ2UnLCAnZGVwZW5kZW5jaWVzJywgJ2hhc0NhbGxiYWNrJ10sXG4gIFsnSGFybW9ueUFjY2VwdEltcG9ydERlcGVuZGVuY3knLCAncmVxdWVzdCcsICdpbXBvcnRlZFZhcicsICdyYW5nZSddLFxuICBbJ0hhcm1vbnlDb21wYXRpYmlsaXR5RGVwZW5kZW5jeScsICdvcmlnaW5Nb2R1bGUnXSxcbiAgW1xuICAgICdIYXJtb255RXhwb3J0RXhwcmVzc2lvbkRlcGVuZGVuY3knLFxuICAgICdvcmlnaW5Nb2R1bGUnLFxuICAgICdyYW5nZScsXG4gICAgJ3JhbmdlU3RhdGVtZW50JyxcbiAgXSxcbiAgWydIYXJtb255RXhwb3J0SGVhZGVyRGVwZW5kZW5jeScsICdyYW5nZScsICdyYW5nZVN0YXRlbWVudCddLFxuICBbXG4gICAgJ0hhcm1vbnlFeHBvcnRJbXBvcnRlZFNwZWNpZmllckRlcGVuZGVuY3knLFxuICAgICdvcmlnaW5Nb2R1bGUnLFxuICAgICdpbXBvcnREZXBlbmRlbmN5JyxcbiAgICAnaW1wb3J0ZWRWYXInLFxuICAgICdpZCcsXG4gICAgJ25hbWUnLFxuICAgICdhY3RpdmVFeHBvcnRzJyxcbiAgICAnb3RoZXJTdGFyRXhwb3J0cycsXG4gIF0sXG4gIFtcbiAgICAnSGFybW9ueUV4cG9ydFNwZWNpZmllckRlcGVuZGVuY3knLFxuICAgICdvcmlnaW5Nb2R1bGUnLFxuICAgICdpZCcsXG4gICAgJ25hbWUnLFxuICAgICdwb3NpdGlvbicsXG4gICAgJ2ltbXV0YWJsZScsXG4gIF0sXG4gIFsnSGFybW9ueUltcG9ydERlcGVuZGVuY3knLCAncmVxdWVzdCcsICdpbXBvcnRlZFZhcicsICdyYW5nZSddLFxuICBbXG4gICAgJ0hhcm1vbnlJbXBvcnRTcGVjaWZpZXJEZXBlbmRlbmN5JyxcbiAgICAnaW1wb3J0RGVwZW5kZW5jeScsXG4gICAgJ2ltcG9ydGVkVmFyJyxcbiAgICAnaWQnLFxuICAgICduYW1lJyxcbiAgICAncmFuZ2UnLFxuICAgICdzdHJpY3RFeHBvcnRQcmVzZW5jZScsXG4gIF0sXG4gIFtcbiAgICAnSW1wb3J0Q29udGV4dERlcGVuZGVuY3knLFxuICAgICdyZXF1ZXN0JyxcbiAgICAncmVjdXJzaXZlJyxcbiAgICAncmVnRXhwJyxcbiAgICAncmFuZ2UnLFxuICAgICd2YWx1ZVJhbmdlJyxcbiAgICAnY2h1bmtOYW1lJyxcbiAgXSxcbiAgWydJbXBvcnREZXBlbmRlbmN5JywgJ3JlcXVlc3QnLCAnYmxvY2snXSxcbiAgW1xuICAgICdJbXBvcnRFYWdlckNvbnRleHREZXBlbmRlbmN5JyxcbiAgICAncmVxdWVzdCcsXG4gICAgJ3JlY3Vyc2l2ZScsXG4gICAgJ3JlZ0V4cCcsXG4gICAgJ3JhbmdlJyxcbiAgICAndmFsdWVSYW5nZScsXG4gICAgJ2NodW5rTmFtZScsXG4gIF0sXG4gIFsnSW1wb3J0RWFnZXJEZXBlbmRlbmN5JywgJ3JlcXVlc3QnLCAncmFuZ2UnXSxcbiAgW1xuICAgICdJbXBvcnRMYXp5Q29udGV4dERlcGVuZGVuY3knLFxuICAgICdyZXF1ZXN0JyxcbiAgICAncmVjdXJzaXZlJyxcbiAgICAncmVnRXhwJyxcbiAgICAncmFuZ2UnLFxuICAgICd2YWx1ZVJhbmdlJyxcbiAgICAnY2h1bmtOYW1lJyxcbiAgXSxcbiAgW1xuICAgICdJbXBvcnRMYXp5T25jZUNvbnRleHREZXBlbmRlbmN5JyxcbiAgICAncmVxdWVzdCcsXG4gICAgJ3JlY3Vyc2l2ZScsXG4gICAgJ3JlZ0V4cCcsXG4gICAgJ3JhbmdlJyxcbiAgICAndmFsdWVSYW5nZScsXG4gICAgJ2NodW5rTmFtZScsXG4gIF0sXG4gIFtcbiAgICAnSW1wb3J0V2Vha0NvbnRleHREZXBlbmRlbmN5JyxcbiAgICAncmVxdWVzdCcsXG4gICAgJ3JlY3Vyc2l2ZScsXG4gICAgJ3JlZ0V4cCcsXG4gICAgJ3JhbmdlJyxcbiAgICAndmFsdWVSYW5nZScsXG4gICAgJ2NodW5rTmFtZScsXG4gIF0sXG4gIFsnSW1wb3J0V2Vha0RlcGVuZGVuY3knLCAncmVxdWVzdCcsICdyYW5nZSddLFxuICBbJ0xvYWRlckRlcGVuZGVuY3knLCAncmVxdWVzdCddLFxuICBbJ0xvY2FsTW9kdWxlRGVwZW5kZW5jeScsICdsb2NhbE1vZHVsZScsICdyYW5nZSddLFxuICBbJ01vZHVsZURlcGVuZGVuY3knLCAncmVxdWVzdCddLFxuICBbJ01vZHVsZUhvdEFjY2VwdERlcGVuZGVuY3knLCAncmVxdWVzdCcsICdyYW5nZSddLFxuICBbJ01vZHVsZUhvdERlY2xpbmVEZXBlbmRlbmN5JywgJ3JlcXVlc3QnLCAncmFuZ2UnXSxcbiAgWydNdWx0aUVudHJ5RGVwZW5kZW5jeScsICdkZXBlbmRlbmNpZXMnLCAnbmFtZSddLFxuICBbJ051bGxEZXBlbmRlbmN5J10sXG4gIFsnUHJlZmV0Y2hEZXBlbmRlbmN5JywgJ3JlcXVlc3QnXSxcbiAgW1xuICAgICdSZXF1aXJlQ29udGV4dERlcGVuZGVuY3knLFxuICAgICdyZXF1ZXN0JyxcbiAgICAncmVjdXJzaXZlJyxcbiAgICAncmVnRXhwJyxcbiAgICAnYXN5bmNNb2RlJyxcbiAgICAncmFuZ2UnLFxuICBdLFxuICBbJ1JlcXVpcmVFbnN1cmVEZXBlbmRlbmN5JywgJ2Jsb2NrJ10sXG4gIFsnUmVxdWlyZUVuc3VyZUl0ZW1EZXBlbmRlbmN5JywgJ3JlcXVlc3QnXSxcbiAgWydSZXF1aXJlSGVhZGVyRGVwZW5kZW5jeScsICdyYW5nZSddLFxuICBbJ1JlcXVpcmVJbmNsdWRlRGVwZW5kZW5jeScsICdyZXF1ZXN0JywgJ3JhbmdlJ10sXG4gIFtcbiAgICAnUmVxdWlyZVJlc29sdmVDb250ZXh0RGVwZW5kZW5jeScsXG4gICAgJ3JlcXVlc3QnLFxuICAgICdyZWN1cnNpdmUnLFxuICAgICdyZWdFeHAnLFxuICAgICdyYW5nZScsXG4gICAgJ3ZhbHVlUmFuZ2UnLFxuICBdLFxuICBbJ1JlcXVpcmVSZXNvbHZlRGVwZW5kZW5jeScsICdyZXF1ZXN0JywgJ3JhbmdlJ10sXG4gIFsnUmVxdWlyZVJlc29sdmVIZWFkZXJEZXBlbmRlbmN5JywgJ3JhbmdlJ10sXG4gIFsnU2luZ2xlRW50cnlEZXBlbmRlbmN5JywgJ3JlcXVlc3QnXSxcbiAgWydVbnN1cHBvcnRlZERlcGVuZGVuY3knLCAncmVxdWVzdCcsICdyYW5nZSddLFxuXTtcblxuY29uc3QgZnJlZXplQXJndW1lbnQgPSB7XG4gIGRlcGVuZGVuY2llcyhhcmcsIGRlcGVuZGVuY3ksIGV4dHJhLCBtZXRob2RzKSB7XG4gICAgcmV0dXJuIG1ldGhvZHMubWFwRnJlZXplKCdEZXBlbmRlbmN5JywgbnVsbCwgYXJnLCBleHRyYSk7XG4gIH0sXG4gIGRlcHNBcnJheShhcmcsIGRlcGVuZGVuY3ksIGV4dHJhLCBtZXRob2RzKSB7XG4gICAgcmV0dXJuIG1ldGhvZHMubWFwRnJlZXplKCdEZXBlbmRlbmN5JywgbnVsbCwgYXJnLCBleHRyYSk7XG4gIH0sXG4gIGxvY2FsTW9kdWxlKHsgbmFtZSwgaWR4IH0sIGRlcGVuZGVuY3ksIGV4dHJhLCBtZXRob2RzKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIG5hbWU6IG5hbWUsXG4gICAgICBpZHg6IGlkeCxcbiAgICB9O1xuICB9LFxuICByZWdFeHAoYXJnLCBkZXBlbmRlbmN5LCBleHRyYSwgbWV0aG9kcykge1xuICAgIHJldHVybiBhcmcgPyBhcmcuc291cmNlIDogZmFsc2U7XG4gIH0sXG4gIHJlcXVlc3QoYXJnLCBkZXBlbmRlbmN5LCBleHRyYSwgbWV0aG9kcykge1xuICAgIHJldHVybiByZWxhdGVDb250ZXh0LnJlbGF0ZUFic29sdXRlUmVxdWVzdChleHRyYS5tb2R1bGUuY29udGV4dCwgYXJnKTtcbiAgfSxcbiAgdXNlclJlcXVlc3QoYXJnLCBkZXBlbmRlbmN5LCBleHRyYSwgbWV0aG9kcykge1xuICAgIHJldHVybiByZWxhdGVDb250ZXh0LnJlbGF0ZUFic29sdXRlUmVxdWVzdChleHRyYS5tb2R1bGUuY29udGV4dCwgYXJnKTtcbiAgfSxcbiAgYmxvY2soYXJnLCBkZXBlbmRlbmN5LCBleHRyYSwgbWV0aG9kcykge1xuICAgIC8vIERlcGVuZGVuY3kgbmVzdGVkIGluIGEgcGFyZW50LiBGcmVlemluZyB0aGUgYmxvY2sgaXMgYSBsb29wLlxuICAgIGlmIChhcmcuZGVwZW5kZW5jaWVzLmluY2x1ZGVzKGRlcGVuZGVuY3kpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHJldHVybiBtZXRob2RzLmZyZWV6ZSgnRGVwZW5kZW5jeUJsb2NrJywgbnVsbCwgYXJnLCBleHRyYSk7XG4gIH0sXG4gIGltcG9ydERlcGVuZGVuY3koYXJnLCBkZXBlbmRlbmN5LCBleHRyYSwgbWV0aG9kcykge1xuICAgIHJldHVybiBtZXRob2RzLmZyZWV6ZSgnRGVwZW5kZW5jeScsIG51bGwsIGFyZywgZXh0cmEpO1xuICB9LFxuICBvcmlnaW5Nb2R1bGUoYXJnLCBkZXBlbmRlbmN5LCBleHRyYSwgbWV0aG9kcykge1xuICAgIC8vIFRoaXMgd2lsbCBiZSBpbiBleHRyYSwgZ2VuZXJhdGVkIG9yIGZvdW5kIGR1cmluZyB0aGUgcHJvY2VzcyBvZiB0aGF3aW5nLlxuICB9LFxuICBhY3RpdmVFeHBvcnRzKGFyZywgZGVwZW5kZW5jeSwgZXh0cmEsIG1ldGhvZHMpIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfSxcbiAgb3RoZXJTdGFyRXhwb3J0cyhhcmcsIGRlcGVuZGVuY3ksIGV4dHJhLCBtZXRob2RzKSB7XG4gICAgaWYgKGFyZykge1xuICAgICAgLy8gVGhpcyB3aWxsIGJlIGluIGV4dHJhLCBnZW5lcmF0ZWQgZHVyaW5nIHRoZSBwcm9jZXNzIG9mIHRoYXdpbmcuXG4gICAgICByZXR1cm4gJ3N0YXInO1xuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbiAgfSxcbiAgb3B0aW9ucyhhcmcsIGRlcGVuZGVuY3ksIGV4dHJhLCBtZXRob2RzKSB7XG4gICAgaWYgKGFyZy5yZWdFeHApIHtcbiAgICAgIHJldHVybiBPYmplY3QuYXNzaWduKHt9LCBhcmcsIHtcbiAgICAgICAgcmVnRXhwOiBhcmcucmVnRXhwLnNvdXJjZSxcbiAgICAgIH0pO1xuICAgIH1cbiAgICByZXR1cm4gYXJnO1xuICB9LFxuICBwYXJzZXJTY29wZShhcmcsIGRlcGVuZGVuY2llcywgZXh0cmEsIG1ldGhvZHMpIHtcbiAgICByZXR1cm47XG4gIH0sXG59O1xuXG5jb25zdCB0aGF3QXJndW1lbnQgPSB7XG4gIGRlcGVuZGVuY2llcyhhcmcsIGZyb3plbiwgZXh0cmEsIG1ldGhvZHMpIHtcbiAgICByZXR1cm4gbWV0aG9kcy5tYXBUaGF3KCdEZXBlbmRlbmN5JywgbnVsbCwgYXJnLCBleHRyYSk7XG4gIH0sXG4gIGRlcHNBcnJheShhcmcsIGZyb3plbiwgZXh0cmEsIG1ldGhvZHMpIHtcbiAgICByZXR1cm4gbWV0aG9kcy5tYXBUaGF3KCdEZXBlbmRlbmN5JywgbnVsbCwgYXJnLCBleHRyYSk7XG4gIH0sXG4gIGxvY2FsTW9kdWxlKHsgaWR4LCBuYW1lLCB1c2VkIH0sIGZyb3plbiwgZXh0cmEsIG1ldGhvZHMpIHtcbiAgICBjb25zdCBzdGF0ZSA9IGV4dHJhLnN0YXRlO1xuICAgIGlmICghc3RhdGUubG9jYWxNb2R1bGVzKSB7XG4gICAgICBzdGF0ZS5sb2NhbE1vZHVsZXMgPSBbXTtcbiAgICB9XG4gICAgaWYgKCFzdGF0ZS5sb2NhbE1vZHVsZXNbaWR4XSkge1xuICAgICAgc3RhdGUubG9jYWxNb2R1bGVzW2lkeF0gPSBuZXcgTG9jYWxNb2R1bGUoZXh0cmEubW9kdWxlLCBuYW1lLCBpZHgpO1xuICAgICAgc3RhdGUubG9jYWxNb2R1bGVzW2lkeF0udXNlZCA9IHVzZWQ7XG4gICAgfVxuICAgIHJldHVybiBzdGF0ZS5sb2NhbE1vZHVsZXNbaWR4XTtcbiAgfSxcbiAgcmVnRXhwKGFyZywgZnJvemVuLCBleHRyYSwgbWV0aG9kcykge1xuICAgIHJldHVybiBhcmcgPyBuZXcgUmVnRXhwKGFyZykgOiBhcmc7XG4gIH0sXG4gIC8vIHJlcXVlc3Q6IGZ1bmN0aW9uKGFyZywgZGVwZW5kZW5jeSwgZXh0cmEsIG1ldGhvZHMpIHtcbiAgLy8gICByZXR1cm4gcmVsYXRlQ29udGV4dC5jb250ZXh0Tm9ybWFsUmVxdWVzdChleHRyYS5jb21waWxhdGlvbi5jb21waWxlciwgYXJnKTtcbiAgLy8gfSxcbiAgYmxvY2soYXJnLCBmcm96ZW4sIGV4dHJhLCBtZXRob2RzKSB7XG4gICAgLy8gTm90IGhhdmluZyBhIGJsb2NrLCBtZWFucyBpdCBuZWVkcyB0byBjcmVhdGUgYSBjeWNsZSBhbmQgcmVmZXIgdG8gaXRzXG4gICAgLy8gcGFyZW50LlxuICAgIGlmICghYXJnKSB7XG4gICAgICByZXR1cm4gZXh0cmEucGFyZW50O1xuICAgIH1cbiAgICByZXR1cm4gbWV0aG9kcy50aGF3KCdEZXBlbmRlbmN5QmxvY2snLCBudWxsLCBhcmcsIGV4dHJhKTtcbiAgfSxcbiAgaW1wb3J0RGVwZW5kZW5jeShhcmcsIGZyb3plbiwgZXh0cmEsIG1ldGhvZHMpIHtcbiAgICByZXR1cm4gbWV0aG9kcy50aGF3KCdEZXBlbmRlbmN5JywgbnVsbCwgYXJnLCBleHRyYSk7XG4gIH0sXG4gIG9yaWdpbk1vZHVsZShhcmcsIGZyb3plbiwgZXh0cmEsIG1ldGhvZHMpIHtcbiAgICByZXR1cm4gZXh0cmEubW9kdWxlO1xuICB9LFxuICBhY3RpdmVFeHBvcnRzKGFyZywgeyBuYW1lIH0sIHsgc3RhdGUgfSwgbWV0aG9kcykge1xuICAgIHN0YXRlLmFjdGl2ZUV4cG9ydHMgPSBzdGF0ZS5hY3RpdmVFeHBvcnRzIHx8IG5ldyBTZXQoKTtcbiAgICBpZiAobmFtZSkge1xuICAgICAgc3RhdGUuYWN0aXZlRXhwb3J0cy5hZGQobmFtZSk7XG4gICAgfVxuICAgIHJldHVybiBzdGF0ZS5hY3RpdmVFeHBvcnRzO1xuICB9LFxuICBvdGhlclN0YXJFeHBvcnRzKGFyZywgZnJvemVuLCB7IHN0YXRlIH0sIG1ldGhvZHMpIHtcbiAgICBpZiAoYXJnID09PSAnc3RhcicpIHtcbiAgICAgIHJldHVybiBzdGF0ZS5vdGhlclN0YXJFeHBvcnRzIHx8IFtdO1xuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbiAgfSxcbiAgb3B0aW9ucyhhcmcsIGZyb3plbiwgZXh0cmEsIG1ldGhvZHMpIHtcbiAgICBpZiAoYXJnLnJlZ0V4cCkge1xuICAgICAgcmV0dXJuIE9iamVjdC5hc3NpZ24oe30sIGFyZywge1xuICAgICAgICByZWdFeHA6IG5ldyBSZWdFeHAoYXJnLnJlZ0V4cCksXG4gICAgICB9KTtcbiAgICB9XG4gICAgcmV0dXJuIGFyZztcbiAgfSxcbiAgcGFyc2VyU2NvcGUoYXJnLCBmcm96ZW4sIHsgc3RhdGUgfSwgbWV0aG9kcykge1xuICAgIHN0YXRlLmhhcm1vbnlQYXJzZXJTY29wZSA9IHN0YXRlLmhhcm1vbnlQYXJzZXJTY29wZSB8fCB7fTtcbiAgICByZXR1cm4gc3RhdGUuaGFybW9ueVBhcnNlclNjb3BlO1xuICB9LFxufTtcblxuZnVuY3Rpb24gZnJlZXplRGVwZW5kZW5jeShkZXBlbmRlbmN5LCBleHRyYSwgbWV0aG9kcykge1xuICBjb25zdCBzY2hlbWFzID0gZXh0cmEuc2NoZW1hcztcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBzY2hlbWFzLmxlbmd0aDsgaSsrKSB7XG4gICAgaWYgKGRlcGVuZGVuY3kuY29uc3RydWN0b3IgPT09IHNjaGVtYXNbaV0uRGVwZW5kZW5jeSkge1xuICAgICAgY29uc3QgZnJvemVuID0ge1xuICAgICAgICB0eXBlOiBzY2hlbWFzW2ldWzBdLFxuICAgICAgfTtcbiAgICAgIGZvciAobGV0IGogPSAxOyBqIDwgc2NoZW1hc1tpXS5sZW5ndGg7IGorKykge1xuICAgICAgICBsZXQgYXJnID0gZGVwZW5kZW5jeVtzY2hlbWFzW2ldW2pdXTtcbiAgICAgICAgaWYgKGZyZWV6ZUFyZ3VtZW50W3NjaGVtYXNbaV1bal1dKSB7XG4gICAgICAgICAgYXJnID0gZnJlZXplQXJndW1lbnRbc2NoZW1hc1tpXVtqXV0oYXJnLCBkZXBlbmRlbmN5LCBleHRyYSwgbWV0aG9kcyk7XG4gICAgICAgIH1cbiAgICAgICAgZnJvemVuW3NjaGVtYXNbaV1bal1dID0gYXJnO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGZyb3plbjtcbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gdGhhd0RlcGVuZGVuY3koZnJvemVuLCBleHRyYSwgbWV0aG9kcykge1xuICBjb25zdCBzY2hlbWFzID0gZXh0cmEuc2NoZW1hcztcbiAgc2NoZW1hcy5tYXAgPSBzY2hlbWFzLm1hcCB8fCB7fTtcbiAgaWYgKHNjaGVtYXMubWFwW2Zyb3plbi50eXBlXSkge1xuICAgIGNvbnN0IGRlcFNjaGVtYSA9IHNjaGVtYXMubWFwW2Zyb3plbi50eXBlXTtcbiAgICBjb25zdCBEZXBlbmRlbmN5ID0gZGVwU2NoZW1hLkRlcGVuZGVuY3k7XG4gICAgdHJ5IHtcbiAgICAgIHJldHVybiBuZXcgRGVwZW5kZW5jeSguLi5kZXBTY2hlbWEuYXJncyhmcm96ZW4sIGV4dHJhLCBtZXRob2RzKSk7XG4gICAgfSBjYXRjaCAoXykge1xuICAgICAgcmV0dXJuIG5ldyAoRnVuY3Rpb24ucHJvdG90eXBlLmJpbmQuYXBwbHkoXG4gICAgICAgIERlcGVuZGVuY3ksXG4gICAgICAgIFtudWxsXS5jb25jYXQoZGVwU2NoZW1hLmFyZ3MoZnJvemVuLCBleHRyYSwgbWV0aG9kcykpLFxuICAgICAgKSkoKTtcbiAgICB9XG4gIH1cblxuICBmb3IgKGNvbnN0IGRlcFNjaGVtYSBvZiBzY2hlbWFzKSB7XG4gICAgaWYgKGZyb3plbi50eXBlID09PSBkZXBTY2hlbWFbMF0pIHtcbiAgICAgIHNjaGVtYXMubWFwW2Zyb3plbi50eXBlXSA9IGRlcFNjaGVtYTtcbiAgICAgIGNvbnN0IERlcGVuZGVuY3kgPSBkZXBTY2hlbWEuRGVwZW5kZW5jeTtcbiAgICAgIGNvbnN0IGxpbmVzID0gW107XG4gICAgICBmb3IgKGxldCBqID0gMTsgaiA8IGRlcFNjaGVtYS5sZW5ndGg7IGorKykge1xuICAgICAgICBjb25zdCBhcmdOYW1lID0gZGVwU2NoZW1hW2pdO1xuICAgICAgICBpZiAodGhhd0FyZ3VtZW50W2FyZ05hbWVdKSB7XG4gICAgICAgICAgbGluZXMucHVzaChcbiAgICAgICAgICAgIGAgIHRoYXdBcmd1bWVudC4ke2FyZ05hbWV9KGZyb3plbi4ke2FyZ05hbWV9LCBmcm96ZW4sIGV4dHJhLCBtZXRob2RzKWAsXG4gICAgICAgICAgKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBsaW5lcy5wdXNoKGAgIGZyb3plbi4ke2FyZ05hbWV9YCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGRlcFNjaGVtYS5hcmdzID0gbmV3IEZ1bmN0aW9uKFxuICAgICAgICAndGhhd0FyZ3VtZW50JyxcbiAgICAgICAgYFxuICAgICAgICByZXR1cm4gZnVuY3Rpb24oZnJvemVuLCBleHRyYSwgbWV0aG9kcykge1xuICAgICAgICAgIHJldHVybiBbXG4gICAgICAgICAgJHtsaW5lcy5qb2luKCcsXFxuJyl9XG4gICAgICAgICAgXTtcbiAgICAgICAgfTtcbiAgICAgIGAsXG4gICAgICApKHRoYXdBcmd1bWVudCk7XG4gICAgICB0cnkge1xuICAgICAgICByZXR1cm4gbmV3IERlcGVuZGVuY3koLi4uZGVwU2NoZW1hLmFyZ3MoZnJvemVuLCBleHRyYSwgbWV0aG9kcykpO1xuICAgICAgfSBjYXRjaCAoXykge1xuICAgICAgICByZXR1cm4gbmV3IChGdW5jdGlvbi5wcm90b3R5cGUuYmluZC5hcHBseShcbiAgICAgICAgICBEZXBlbmRlbmN5LFxuICAgICAgICAgIFtudWxsXS5jb25jYXQoZGVwU2NoZW1hLmFyZ3MoZnJvemVuLCBleHRyYSwgbWV0aG9kcykpLFxuICAgICAgICApKSgpO1xuICAgICAgfVxuICAgIH1cbiAgfVxufVxuXG5jbGFzcyBUcmFuc2Zvcm1CYXNpY0RlcGVuZGVuY3lQbHVnaW5MZWdhY3kge1xuICBjb25zdHJ1Y3RvcihvcHRpb25zKSB7XG4gICAgdGhpcy5vcHRpb25zID0gb3B0aW9ucztcbiAgfVxuXG4gIGFwcGx5KGNvbXBpbGVyKSB7XG4gICAgbGV0IHNjaGVtYXMgPSBEZXBlbmRlbmN5U2NoZW1hczM7XG4gICAgaWYgKHRoaXMub3B0aW9ucy5zY2hlbWEgPCAzKSB7XG4gICAgICBzY2hlbWFzID0gRGVwZW5kZW5jeVNjaGVtYXMyO1xuICAgIH1cblxuICAgIHBsdWdpbkNvbXBhdC50YXAoXG4gICAgICBjb21waWxlcixcbiAgICAgICdhZnRlclBsdWdpbnMnLFxuICAgICAgJ1RyYW5zZm9ybUJhc2ljRGVwZW5kZW5jeVBsdWdpbiBzY2FuIERlcGVuZGVuY3kgdHlwZXMnLFxuICAgICAgKCkgPT4ge1xuICAgICAgICBwbHVnaW5Db21wYXQudGFwKFxuICAgICAgICAgIGNvbXBpbGVyLFxuICAgICAgICAgICdjb21waWxhdGlvbicsXG4gICAgICAgICAgJ1RyYW5zZm9ybUJhc2ljRGVwZW5kZW5jeVBsdWdpbiBzY2FuIERlcGVuZGVuY2llcyB0eXBlcycsXG4gICAgICAgICAgKHsgZGVwZW5kZW5jeUZhY3RvcmllcyB9KSA9PiB7XG4gICAgICAgICAgICBjb25zdCBEZXBlbmRlbmNpZXMgPSBkZXBlbmRlbmN5RmFjdG9yaWVzLmtleXMoKTtcbiAgICAgICAgICAgIGZvciAoY29uc3QgRGVwIG9mIERlcGVuZGVuY2llcykge1xuICAgICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHNjaGVtYXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICBpZiAoRGVwLm5hbWUgPT09IHNjaGVtYXNbaV1bMF0pIHtcbiAgICAgICAgICAgICAgICAgIHNjaGVtYXNbaV0uRGVwZW5kZW5jeSA9IERlcDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgc2NoZW1hcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICBpZiAoIXNjaGVtYXNbaV0uRGVwZW5kZW5jeSkge1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLm9wdGlvbnMuc2NoZW1hIDwgNCkge1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICBpZiAoc2NoZW1hc1tpXVswXSA9PT0gJ0pzb25FeHBvcnRzRGVwZW5kZW5jeScpIHtcbiAgICAgICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgICBzY2hlbWFzW1xuICAgICAgICAgICAgICAgICAgICAgICAgaVxuICAgICAgICAgICAgICAgICAgICAgIF0uRGVwZW5kZW5jeSA9IHJlcXVpcmUoJ3dlYnBhY2svbGliL2RlcGVuZGVuY2llcy9Kc29uRXhwb3J0c0RlcGVuZGVuY3knKTtcbiAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoXykge31cbiAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoc2NoZW1hc1tpXVswXSA9PT0gJ0RlbGVnYXRlZEV4cG9ydHNEZXBlbmRlbmN5Jykge1xuICAgICAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICAgIHNjaGVtYXNbXG4gICAgICAgICAgICAgICAgICAgICAgICBpXG4gICAgICAgICAgICAgICAgICAgICAgXS5EZXBlbmRlbmN5ID0gcmVxdWlyZSgnd2VicGFjay9saWIvZGVwZW5kZW5jaWVzL0RlbGVnYXRlZEV4cG9ydHNEZXBlbmRlbmN5Jyk7XG4gICAgICAgICAgICAgICAgICAgIH0gY2F0Y2ggKF8pIHt9XG4gICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHNjaGVtYXNbaV1bMF0gPT09ICdEZWxlZ2F0ZWRTb3VyY2VEZXBlbmRlbmN5Jykge1xuICAgICAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICAgIHNjaGVtYXNbXG4gICAgICAgICAgICAgICAgICAgICAgICBpXG4gICAgICAgICAgICAgICAgICAgICAgXS5EZXBlbmRlbmN5ID0gcmVxdWlyZSgnd2VicGFjay9saWIvZGVwZW5kZW5jaWVzL0RlbGVnYXRlZFNvdXJjZURlcGVuZGVuY3knKTtcbiAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoXykge31cbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9LFxuICAgICAgICApO1xuICAgICAgfSxcbiAgICApO1xuXG4gICAgbGV0IG1ldGhvZHM7XG5cbiAgICBwbHVnaW5Db21wYXQudGFwKFxuICAgICAgY29tcGlsZXIsXG4gICAgICAnX2hhcmRTb3VyY2VNZXRob2RzJyxcbiAgICAgICdUcmFuc2Zvcm1CYXNpY0RlcGVuZGVuY3lQbHVnaW4gbWV0aG9kcycsXG4gICAgICBfbWV0aG9kcyA9PiB7XG4gICAgICAgIG1ldGhvZHMgPSBfbWV0aG9kcztcbiAgICAgIH0sXG4gICAgKTtcblxuICAgIHBsdWdpbkNvbXBhdC50YXAoXG4gICAgICBjb21waWxlcixcbiAgICAgICdfaGFyZFNvdXJjZUZyZWV6ZURlcGVuZGVuY3knLFxuICAgICAgJ1RyYW5zZm9ybUJhc2ljRGVwZW5kZW5jeVBsdWdpbiBmcmVlemUnLFxuICAgICAgKGZyb3plbiwgZGVwZW5kZW5jeSwgZXh0cmEpID0+IHtcbiAgICAgICAgZXh0cmEuc2NoZW1hcyA9IHNjaGVtYXM7XG4gICAgICAgIGNvbnN0IF9mcm96ZW4gPSBmcmVlemVEZXBlbmRlbmN5KGRlcGVuZGVuY3ksIGV4dHJhLCBtZXRob2RzKTtcbiAgICAgICAgaWYgKF9mcm96ZW4pIHtcbiAgICAgICAgICBpZiAoZGVwZW5kZW5jeS5wcmVwZW5kKSB7XG4gICAgICAgICAgICBfZnJvemVuLnByZXBlbmQgPSBkZXBlbmRlbmN5LnByZXBlbmQ7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChkZXBlbmRlbmN5LnJlcGxhY2VzKSB7XG4gICAgICAgICAgICBfZnJvemVuLnJlcGxhY2VzID0gZGVwZW5kZW5jeS5yZXBsYWNlcztcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKGRlcGVuZGVuY3kuY3JpdGljYWwpIHtcbiAgICAgICAgICAgIF9mcm96ZW4uY3JpdGljYWwgPSBkZXBlbmRlbmN5LmNyaXRpY2FsO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAodHlwZW9mIGRlcGVuZGVuY3kubmFtZXNwYWNlT2JqZWN0QXNDb250ZXh0ICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgX2Zyb3plbi5uYW1lc3BhY2VPYmplY3RBc0NvbnRleHQgPVxuICAgICAgICAgICAgICBkZXBlbmRlbmN5Lm5hbWVzcGFjZU9iamVjdEFzQ29udGV4dDtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKHR5cGVvZiBkZXBlbmRlbmN5LmNhbGxBcmdzICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgX2Zyb3plbi5jYWxsQXJncyA9IGRlcGVuZGVuY3kuY2FsbEFyZ3M7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmICh0eXBlb2YgZGVwZW5kZW5jeS5jYWxsICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgX2Zyb3plbi5jYWxsID0gZGVwZW5kZW5jeS5jYWxsO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAodHlwZW9mIGRlcGVuZGVuY3kuZGlyZWN0SW1wb3J0ICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgX2Zyb3plbi5kaXJlY3RJbXBvcnQgPSBkZXBlbmRlbmN5LmRpcmVjdEltcG9ydDtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKHR5cGVvZiBkZXBlbmRlbmN5LnNob3J0aGFuZCAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIF9mcm96ZW4uc2hvcnRoYW5kID0gZGVwZW5kZW5jeS5zaG9ydGhhbmQ7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChcbiAgICAgICAgICAgIHR5cGVvZiBkZXBlbmRlbmN5LmxvY2FsTW9kdWxlID09PSAnb2JqZWN0JyAmJlxuICAgICAgICAgICAgZGVwZW5kZW5jeS5sb2NhbE1vZHVsZSAhPT0gbnVsbFxuICAgICAgICAgICkge1xuICAgICAgICAgICAgX2Zyb3plbi5sb2NhbE1vZHVsZSA9IHtcbiAgICAgICAgICAgICAgbmFtZTogZGVwZW5kZW5jeS5sb2NhbE1vZHVsZS5uYW1lLFxuICAgICAgICAgICAgICBpZHg6IGRlcGVuZGVuY3kubG9jYWxNb2R1bGUuaWR4LFxuICAgICAgICAgICAgICB1c2VkOiBkZXBlbmRlbmN5LmxvY2FsTW9kdWxlLnVzZWQsXG4gICAgICAgICAgICB9O1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gX2Zyb3plbjtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBmcm96ZW47XG4gICAgICB9LFxuICAgICk7XG5cbiAgICBwbHVnaW5Db21wYXQudGFwKFxuICAgICAgY29tcGlsZXIsXG4gICAgICAnX2hhcmRTb3VyY2VBZnRlckZyZWV6ZURlcGVuZGVuY3knLFxuICAgICAgJ1RyYW5zZm9ybUJhc2ljRGVwZW5kZW5jeVBsdWdpbiBhZnRlciBmcmVlemUnLFxuICAgICAgKGZyb3plbiwgZGVwZW5kZW5jeSwgZXh0cmEpID0+IHtcbiAgICAgICAgaWYgKGZyb3plbiAmJiBkZXBlbmRlbmN5LmxvYykge1xuICAgICAgICAgIGZyb3plbi5sb2MgPSBmbGF0dGVuUHJvdG90eXBlKGRlcGVuZGVuY3kubG9jKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChmcm96ZW4gJiYgZGVwZW5kZW5jeS5vcHRpb25hbCkge1xuICAgICAgICAgIGZyb3plbi5vcHRpb25hbCA9IGRlcGVuZGVuY3kub3B0aW9uYWw7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoZnJvemVuICYmIGRlcGVuZGVuY3kuZ2V0V2FybmluZ3MpIHtcbiAgICAgICAgICBjb25zdCB3YXJuaW5ncyA9IGRlcGVuZGVuY3kuZ2V0V2FybmluZ3MoKTtcbiAgICAgICAgICBpZiAod2FybmluZ3MgJiYgd2FybmluZ3MubGVuZ3RoKSB7XG4gICAgICAgICAgICBmcm96ZW4ud2FybmluZ3MgPSB3YXJuaW5ncy5tYXAoXG4gICAgICAgICAgICAgICh7IHN0YWNrIH0pID0+XG4gICAgICAgICAgICAgICAgc3RhY2suaW5jbHVkZXMoJ1xcbiAgICBhdCBwbHVnaW5Db21wYXQudGFwJylcbiAgICAgICAgICAgICAgICAgID8gc3RhY2suc3BsaXQoJ1xcbiAgICBhdCBwbHVnaW5Db21wYXQudGFwJylbMF1cbiAgICAgICAgICAgICAgICAgIDogc3RhY2suc3BsaXQoJ1xcbiAgICBhdCBDb21waWxlci5wbHVnaW5Db21wYXQudGFwJylbMF0sXG4gICAgICAgICAgICApO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBmcm96ZW47XG4gICAgICB9LFxuICAgICk7XG5cbiAgICBwbHVnaW5Db21wYXQudGFwKFxuICAgICAgY29tcGlsZXIsXG4gICAgICAnX2hhcmRTb3VyY2VUaGF3RGVwZW5kZW5jeScsXG4gICAgICAnVHJhbnNmb3JtQmFzaWNEZXBlbmRlbmN5UGx1Z2luJyxcbiAgICAgIChkZXBlbmRlbmN5LCBmcm96ZW4sIGV4dHJhKSA9PiB7XG4gICAgICAgIGV4dHJhLnNjaGVtYXMgPSBzY2hlbWFzO1xuICAgICAgICBjb25zdCBfdGhhd2VkID0gdGhhd0RlcGVuZGVuY3koZnJvemVuLCBleHRyYSwgbWV0aG9kcyk7XG4gICAgICAgIGlmIChfdGhhd2VkKSB7XG4gICAgICAgICAgY29uc3Qgc3RhdGUgPSBleHRyYS5zdGF0ZTtcbiAgICAgICAgICAvLyBjb25zb2xlLmxvZygnVGhhd2VkJywgZnJvemVuLnR5cGUpO1xuICAgICAgICAgIGlmIChmcm96ZW4ucHJlcGVuZCkge1xuICAgICAgICAgICAgX3RoYXdlZC5wcmVwZW5kID0gZnJvemVuLnByZXBlbmQ7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChmcm96ZW4ucmVwbGFjZXMpIHtcbiAgICAgICAgICAgIF90aGF3ZWQucmVwbGFjZXMgPSBmcm96ZW4ucmVwbGFjZWQ7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChmcm96ZW4uY3JpdGljYWwpIHtcbiAgICAgICAgICAgIF90aGF3ZWQuY3JpdGljYWwgPSBmcm96ZW4uY3JpdGljYWw7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmICh0eXBlb2YgZnJvemVuLm5hbWVzcGFjZU9iamVjdEFzQ29udGV4dCAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIF90aGF3ZWQubmFtZXNwYWNlT2JqZWN0QXNDb250ZXh0ID0gZnJvemVuLm5hbWVzcGFjZU9iamVjdEFzQ29udGV4dDtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKHR5cGVvZiBmcm96ZW4uY2FsbEFyZ3MgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICBfdGhhd2VkLmNhbGxBcmdzID0gZnJvemVuLmNhbGxBcmdzO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAodHlwZW9mIGZyb3plbi5jYWxsICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgX3RoYXdlZC5jYWxsID0gZnJvemVuLmNhbGw7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmICh0eXBlb2YgZnJvemVuLmRpcmVjdEltcG9ydCAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIF90aGF3ZWQuZGlyZWN0SW1wb3J0ID0gZnJvemVuLmRpcmVjdEltcG9ydDtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKHR5cGVvZiBmcm96ZW4uc2hvcnRoYW5kICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgX3RoYXdlZC5zaG9ydGhhbmQgPSBmcm96ZW4uc2hvcnRoYW5kO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoXG4gICAgICAgICAgICB0eXBlb2YgZnJvemVuLmxvY2FsTW9kdWxlID09PSAnb2JqZWN0JyAmJlxuICAgICAgICAgICAgZnJvemVuLmxvY2FsTW9kdWxlICE9PSBudWxsXG4gICAgICAgICAgKSB7XG4gICAgICAgICAgICBpZiAoIXN0YXRlLmxvY2FsTW9kdWxlcykge1xuICAgICAgICAgICAgICBzdGF0ZS5sb2NhbE1vZHVsZXMgPSBbXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICghc3RhdGUubG9jYWxNb2R1bGVzW2Zyb3plbi5sb2NhbE1vZHVsZS5pZHhdKSB7XG4gICAgICAgICAgICAgIHN0YXRlLmxvY2FsTW9kdWxlc1tmcm96ZW4ubG9jYWxNb2R1bGUuaWR4XSA9IG5ldyBMb2NhbE1vZHVsZShcbiAgICAgICAgICAgICAgICBleHRyYS5tb2R1bGUsXG4gICAgICAgICAgICAgICAgZnJvemVuLmxvY2FsTW9kdWxlLm5hbWUsXG4gICAgICAgICAgICAgICAgZnJvemVuLmxvY2FsTW9kdWxlLmlkeCxcbiAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgc3RhdGUubG9jYWxNb2R1bGVzW2Zyb3plbi5sb2NhbE1vZHVsZS5pZHhdLnVzZWQgPVxuICAgICAgICAgICAgICAgIGZyb3plbi5sb2NhbE1vZHVsZS51c2VkO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgX3RoYXdlZC5sb2NhbE1vZHVsZSA9IHN0YXRlLmxvY2FsTW9kdWxlc1tmcm96ZW4ubG9jYWxNb2R1bGUuaWR4XTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKGZyb3plbi50eXBlID09PSAnSGFybW9ueUltcG9ydERlcGVuZGVuY3knKSB7XG4gICAgICAgICAgICBjb25zdCByZWYgPSBmcm96ZW4ucmFuZ2UudG9TdHJpbmcoKTtcbiAgICAgICAgICAgIGlmIChzdGF0ZS5pbXBvcnRzW3JlZl0pIHtcbiAgICAgICAgICAgICAgcmV0dXJuIHN0YXRlLmltcG9ydHNbcmVmXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHN0YXRlLmltcG9ydHNbcmVmXSA9IF90aGF3ZWQ7XG4gICAgICAgICAgfSBlbHNlIGlmIChcbiAgICAgICAgICAgIGZyb3plbi50eXBlID09PSAnSGFybW9ueUV4cG9ydEltcG9ydGVkU3BlY2lmaWVyRGVwZW5kZW5jeSdcbiAgICAgICAgICApIHtcbiAgICAgICAgICAgIGlmIChfdGhhd2VkLm90aGVyU3RhckV4cG9ydHMpIHtcbiAgICAgICAgICAgICAgZXh0cmEuc3RhdGUub3RoZXJTdGFyRXhwb3J0cyA9IChcbiAgICAgICAgICAgICAgICBleHRyYS5zdGF0ZS5vdGhlclN0YXJFeHBvcnRzIHx8IFtdXG4gICAgICAgICAgICAgICkuY29uY2F0KF90aGF3ZWQpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gX3RoYXdlZDtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBkZXBlbmRlbmN5O1xuICAgICAgfSxcbiAgICApO1xuXG4gICAgcGx1Z2luQ29tcGF0LnRhcChcbiAgICAgIGNvbXBpbGVyLFxuICAgICAgJ19oYXJkU291cmNlQWZ0ZXJUaGF3RGVwZW5kZW5jeScsXG4gICAgICAnVHJhbnNmb3JtQmFzaWNEZXBlbmRlbmN5UGx1Z2luJyxcbiAgICAgIChkZXBlbmRlbmN5LCB7IGxvYywgb3B0aW9uYWwsIHdhcm5pbmdzIH0sIGV4dHJhKSA9PiB7XG4gICAgICAgIGlmIChkZXBlbmRlbmN5ICYmIGxvYykge1xuICAgICAgICAgIGRlcGVuZGVuY3kubG9jID0gbG9jO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGRlcGVuZGVuY3kgJiYgb3B0aW9uYWwpIHtcbiAgICAgICAgICBkZXBlbmRlbmN5Lm9wdGlvbmFsID0gdHJ1ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChkZXBlbmRlbmN5ICYmIHdhcm5pbmdzICYmIGRlcGVuZGVuY3kuZ2V0V2FybmluZ3MpIHtcbiAgICAgICAgICBjb25zdCBmcm96ZW5XYXJuaW5ncyA9IHdhcm5pbmdzO1xuICAgICAgICAgIGNvbnN0IF9nZXRXYXJuaW5ncyA9IGRlcGVuZGVuY3kuZ2V0V2FybmluZ3M7XG4gICAgICAgICAgZGVwZW5kZW5jeS5nZXRXYXJuaW5ncyA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgY29uc3Qgd2FybmluZ3MgPSBfZ2V0V2FybmluZ3MuY2FsbCh0aGlzKTtcbiAgICAgICAgICAgIGlmICh3YXJuaW5ncyAmJiB3YXJuaW5ncy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIHdhcm5pbmdzLm1hcCgod2FybmluZywgaSkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IHN0YWNrID0gd2FybmluZy5zdGFjay5zcGxpdChcbiAgICAgICAgICAgICAgICAgICdcXG4gICAgYXQgQ29tcGlsYXRpb24ucmVwb3J0RGVwZW5kZW5jeUVycm9yc0FuZFdhcm5pbmdzJyxcbiAgICAgICAgICAgICAgICApWzFdO1xuICAgICAgICAgICAgICAgIHdhcm5pbmcuc3RhY2sgPSBgJHtcbiAgICAgICAgICAgICAgICAgIGZyb3plbldhcm5pbmdzW2ldXG4gICAgICAgICAgICAgICAgfVxcbiAgICBhdCBDb21waWxhdGlvbi5yZXBvcnREZXBlbmRlbmN5RXJyb3JzQW5kV2FybmluZ3Mke3N0YWNrfWA7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHdhcm5pbmc7XG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHdhcm5pbmdzO1xuICAgICAgICAgIH07XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gZGVwZW5kZW5jeTtcbiAgICAgIH0sXG4gICAgKTtcbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFRyYW5zZm9ybUJhc2ljRGVwZW5kZW5jeVBsdWdpbkxlZ2FjeTtcbiJdLCJzb3VyY2VSb290IjoiL1VzZXJzL3R5bGVyYXJidXMvZGV2L3Byb3ZpZGVyL3NyYyJ9

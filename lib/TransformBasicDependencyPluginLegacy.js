'use strict';

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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImhhcmQtc291cmNlLXdlYnBhY2stcGx1Z2luL2xpYi9UcmFuc2Zvcm1CYXNpY0RlcGVuZGVuY3lQbHVnaW5MZWdhY3kuanMiXSwibmFtZXMiOlsiY2FjaGVQcmVmaXgiLCJyZXF1aXJlIiwiTG9nZ2VyRmFjdG9yeSIsInBsdWdpbkNvbXBhdCIsInJlbGF0ZUNvbnRleHQiLCJMb2NhbE1vZHVsZSIsIl8iLCJmbGF0dGVuUHJvdG90eXBlIiwib2JqIiwiY29weSIsImtleSIsIkFNRERlZmluZURlcGVuZGVuY3kiLCJBTURSZXF1aXJlQXJyYXlEZXBlbmRlbmN5IiwiQU1EUmVxdWlyZUNvbnRleHREZXBlbmRlbmN5IiwiQU1EUmVxdWlyZURlcGVuZGVuY3kiLCJBTURSZXF1aXJlSXRlbURlcGVuZGVuY3kiLCJDb21tb25Kc1JlcXVpcmVDb250ZXh0RGVwZW5kZW5jeSIsIkNvbW1vbkpzUmVxdWlyZURlcGVuZGVuY3kiLCJDb25zdERlcGVuZGVuY3kiLCJDb250ZXh0RGVwZW5kZW5jeSIsIkNvbnRleHRFbGVtZW50RGVwZW5kZW5jeSIsIkNyaXRpY2FsRGVwZW5kZW5jeVdhcm5pbmciLCJEZWxlZ2F0ZWRFeHBvcnRzRGVwZW5kZW5jeSIsIkRlbGVnYXRlZFNvdXJjZURlcGVuZGVuY3kiLCJEbGxFbnRyeURlcGVuZGVuY3kiLCJIYXJtb255QWNjZXB0RGVwZW5kZW5jeSIsIkhhcm1vbnlBY2NlcHRJbXBvcnREZXBlbmRlbmN5IiwiSGFybW9ueUNvbXBhdGliaWxpdHlEZXBlbmRlbmN5IiwiSGFybW9ueUV4cG9ydEV4cHJlc3Npb25EZXBlbmRlbmN5IiwiSGFybW9ueUV4cG9ydEhlYWRlckRlcGVuZGVuY3kiLCJIYXJtb255RXhwb3J0SW1wb3J0ZWRTcGVjaWZpZXJEZXBlbmRlbmN5IiwiSGFybW9ueUV4cG9ydFNwZWNpZmllckRlcGVuZGVuY3kiLCJIYXJtb255SW1wb3J0RGVwZW5kZW5jeSIsIkhhcm1vbnlJbXBvcnRTcGVjaWZpZXJEZXBlbmRlbmN5IiwiSW1wb3J0Q29udGV4dERlcGVuZGVuY3kiLCJJbXBvcnREZXBlbmRlbmN5IiwiSW1wb3J0RWFnZXJDb250ZXh0RGVwZW5kZW5jeSIsIkltcG9ydEVhZ2VyRGVwZW5kZW5jeSIsIkltcG9ydExhenlDb250ZXh0RGVwZW5kZW5jeSIsIkltcG9ydExhenlPbmNlQ29udGV4dERlcGVuZGVuY3kiLCJJbXBvcnRXZWFrQ29udGV4dERlcGVuZGVuY3kiLCJJbXBvcnRXZWFrRGVwZW5kZW5jeSIsIkxvYWRlckRlcGVuZGVuY3kiLCJMb2NhbE1vZHVsZURlcGVuZGVuY3kiLCJNb2R1bGVEZXBlbmRlbmN5IiwiTW9kdWxlSG90QWNjZXB0RGVwZW5kZW5jeSIsIk1vZHVsZUhvdERlY2xpbmVEZXBlbmRlbmN5IiwiTXVsdGlFbnRyeURlcGVuZGVuY3kiLCJOdWxsRGVwZW5kZW5jeSIsIlByZWZldGNoRGVwZW5kZW5jeSIsIlJlcXVpcmVDb250ZXh0RGVwZW5kZW5jeSIsIlJlcXVpcmVFbnN1cmVEZXBlbmRlbmN5IiwiUmVxdWlyZUVuc3VyZUl0ZW1EZXBlbmRlbmN5IiwiUmVxdWlyZUhlYWRlckRlcGVuZGVuY3kiLCJSZXF1aXJlSW5jbHVkZURlcGVuZGVuY3kiLCJSZXF1aXJlUmVzb2x2ZUNvbnRleHREZXBlbmRlbmN5IiwiUmVxdWlyZVJlc29sdmVEZXBlbmRlbmN5IiwiUmVxdWlyZVJlc29sdmVIZWFkZXJEZXBlbmRlbmN5IiwiU2luZ2xlRW50cnlEZXBlbmRlbmN5IiwiVW5zdXBwb3J0ZWREZXBlbmRlbmN5IiwiRGVwZW5kZW5jeVNjaGVtYXMyIiwiRGVwZW5kZW5jeVNjaGVtYXMzIiwiZnJlZXplQXJndW1lbnQiLCJkZXBlbmRlbmNpZXMiLCJhcmciLCJkZXBlbmRlbmN5IiwiZXh0cmEiLCJtZXRob2RzIiwibWFwRnJlZXplIiwiZGVwc0FycmF5IiwibG9jYWxNb2R1bGUiLCJuYW1lIiwiaWR4IiwicmVnRXhwIiwic291cmNlIiwicmVxdWVzdCIsInJlbGF0ZUFic29sdXRlUmVxdWVzdCIsIm1vZHVsZSIsImNvbnRleHQiLCJ1c2VyUmVxdWVzdCIsImJsb2NrIiwiaW5jbHVkZXMiLCJmcmVlemUiLCJpbXBvcnREZXBlbmRlbmN5Iiwib3JpZ2luTW9kdWxlIiwiYWN0aXZlRXhwb3J0cyIsIm90aGVyU3RhckV4cG9ydHMiLCJvcHRpb25zIiwiT2JqZWN0IiwiYXNzaWduIiwicGFyc2VyU2NvcGUiLCJ0aGF3QXJndW1lbnQiLCJmcm96ZW4iLCJtYXBUaGF3IiwidXNlZCIsInN0YXRlIiwibG9jYWxNb2R1bGVzIiwiUmVnRXhwIiwicGFyZW50IiwidGhhdyIsIlNldCIsImFkZCIsImhhcm1vbnlQYXJzZXJTY29wZSIsImZyZWV6ZURlcGVuZGVuY3kiLCJzY2hlbWFzIiwiaSIsImxlbmd0aCIsImNvbnN0cnVjdG9yIiwiRGVwZW5kZW5jeSIsInR5cGUiLCJqIiwidGhhd0RlcGVuZGVuY3kiLCJtYXAiLCJkZXBTY2hlbWEiLCJhcmdzIiwiRnVuY3Rpb24iLCJwcm90b3R5cGUiLCJiaW5kIiwiYXBwbHkiLCJjb25jYXQiLCJsaW5lcyIsImFyZ05hbWUiLCJwdXNoIiwiam9pbiIsIlRyYW5zZm9ybUJhc2ljRGVwZW5kZW5jeVBsdWdpbkxlZ2FjeSIsImNvbXBpbGVyIiwic2NoZW1hIiwidGFwIiwiZGVwZW5kZW5jeUZhY3RvcmllcyIsIkRlcGVuZGVuY2llcyIsImtleXMiLCJEZXAiLCJfbWV0aG9kcyIsIl9mcm96ZW4iLCJwcmVwZW5kIiwicmVwbGFjZXMiLCJjcml0aWNhbCIsIm5hbWVzcGFjZU9iamVjdEFzQ29udGV4dCIsImNhbGxBcmdzIiwiY2FsbCIsImRpcmVjdEltcG9ydCIsInNob3J0aGFuZCIsImxvYyIsIm9wdGlvbmFsIiwiZ2V0V2FybmluZ3MiLCJ3YXJuaW5ncyIsInN0YWNrIiwic3BsaXQiLCJfdGhhd2VkIiwicmVwbGFjZWQiLCJyZWYiLCJyYW5nZSIsInRvU3RyaW5nIiwiaW1wb3J0cyIsImZyb3plbldhcm5pbmdzIiwiX2dldFdhcm5pbmdzIiwid2FybmluZyIsImV4cG9ydHMiXSwibWFwcGluZ3MiOiI7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b0NEO0FBcFF3Qzs7QUF1UTNDWSxPQUFPZ0YsT0FBUCxHQUFpQmpDLG9DQUFqQiIsImZpbGUiOiJoYXJkLXNvdXJjZS13ZWJwYWNrLXBsdWdpbi9saWIvVHJhbnNmb3JtQmFzaWNEZXBlbmRlbmN5UGx1Z2luTGVnYWN5LmpzIiwic291cmNlc0NvbnRlbnQiOlsiY29uc3QgY2FjaGVQcmVmaXggPSByZXF1aXJlKCcuL3V0aWwnKS5jYWNoZVByZWZpeDtcbmNvbnN0IExvZ2dlckZhY3RvcnkgPSByZXF1aXJlKCcuL2xvZ2dlckZhY3RvcnknKTtcbmNvbnN0IHBsdWdpbkNvbXBhdCA9IHJlcXVpcmUoJy4vdXRpbC9wbHVnaW4tY29tcGF0Jyk7XG5jb25zdCByZWxhdGVDb250ZXh0ID0gcmVxdWlyZSgnLi91dGlsL3JlbGF0ZS1jb250ZXh0Jyk7XG5cbmxldCBMb2NhbE1vZHVsZTtcbnRyeSB7XG4gIExvY2FsTW9kdWxlID0gcmVxdWlyZSgnd2VicGFjay9saWIvZGVwZW5kZW5jaWVzL0xvY2FsTW9kdWxlJyk7XG59IGNhdGNoIChfKSB7fVxuXG5mdW5jdGlvbiBmbGF0dGVuUHJvdG90eXBlKG9iaikge1xuICBpZiAodHlwZW9mIG9iaiA9PT0gJ3N0cmluZycpIHtcbiAgICByZXR1cm4gb2JqO1xuICB9XG4gIGNvbnN0IGNvcHkgPSB7fTtcbiAgZm9yIChjb25zdCBrZXkgaW4gb2JqKSB7XG4gICAgY29weVtrZXldID0gb2JqW2tleV07XG4gIH1cbiAgcmV0dXJuIGNvcHk7XG59XG5cbmxldCBBTUREZWZpbmVEZXBlbmRlbmN5O1xubGV0IEFNRFJlcXVpcmVBcnJheURlcGVuZGVuY3k7XG5sZXQgQU1EUmVxdWlyZUNvbnRleHREZXBlbmRlbmN5O1xubGV0IEFNRFJlcXVpcmVEZXBlbmRlbmN5O1xubGV0IEFNRFJlcXVpcmVJdGVtRGVwZW5kZW5jeTtcbmxldCBDb21tb25Kc1JlcXVpcmVDb250ZXh0RGVwZW5kZW5jeTtcbmxldCBDb21tb25Kc1JlcXVpcmVEZXBlbmRlbmN5O1xubGV0IENvbnN0RGVwZW5kZW5jeTtcbmxldCBDb250ZXh0RGVwZW5kZW5jeTtcbmxldCBDb250ZXh0RWxlbWVudERlcGVuZGVuY3k7XG5sZXQgQ3JpdGljYWxEZXBlbmRlbmN5V2FybmluZztcbmxldCBEZWxlZ2F0ZWRFeHBvcnRzRGVwZW5kZW5jeTtcbmxldCBEZWxlZ2F0ZWRTb3VyY2VEZXBlbmRlbmN5O1xubGV0IERsbEVudHJ5RGVwZW5kZW5jeTtcbmxldCBIYXJtb255QWNjZXB0RGVwZW5kZW5jeTtcbmxldCBIYXJtb255QWNjZXB0SW1wb3J0RGVwZW5kZW5jeTtcbmxldCBIYXJtb255Q29tcGF0aWJpbGl0eURlcGVuZGVuY3k7XG5sZXQgSGFybW9ueUV4cG9ydEV4cHJlc3Npb25EZXBlbmRlbmN5O1xubGV0IEhhcm1vbnlFeHBvcnRIZWFkZXJEZXBlbmRlbmN5O1xubGV0IEhhcm1vbnlFeHBvcnRJbXBvcnRlZFNwZWNpZmllckRlcGVuZGVuY3k7XG5sZXQgSGFybW9ueUV4cG9ydFNwZWNpZmllckRlcGVuZGVuY3k7XG5sZXQgSGFybW9ueUltcG9ydERlcGVuZGVuY3k7XG5sZXQgSGFybW9ueUltcG9ydFNwZWNpZmllckRlcGVuZGVuY3k7XG5sZXQgSW1wb3J0Q29udGV4dERlcGVuZGVuY3k7XG5sZXQgSW1wb3J0RGVwZW5kZW5jeTtcbmxldCBJbXBvcnRFYWdlckNvbnRleHREZXBlbmRlbmN5O1xubGV0IEltcG9ydEVhZ2VyRGVwZW5kZW5jeTtcbmxldCBJbXBvcnRMYXp5Q29udGV4dERlcGVuZGVuY3k7XG5sZXQgSW1wb3J0TGF6eU9uY2VDb250ZXh0RGVwZW5kZW5jeTtcbmxldCBJbXBvcnRXZWFrQ29udGV4dERlcGVuZGVuY3k7XG5sZXQgSW1wb3J0V2Vha0RlcGVuZGVuY3k7XG5sZXQgTG9hZGVyRGVwZW5kZW5jeTtcbmxldCBMb2NhbE1vZHVsZURlcGVuZGVuY3k7XG5sZXQgTW9kdWxlRGVwZW5kZW5jeTtcbmxldCBNb2R1bGVIb3RBY2NlcHREZXBlbmRlbmN5O1xubGV0IE1vZHVsZUhvdERlY2xpbmVEZXBlbmRlbmN5O1xubGV0IE11bHRpRW50cnlEZXBlbmRlbmN5O1xubGV0IE51bGxEZXBlbmRlbmN5O1xubGV0IFByZWZldGNoRGVwZW5kZW5jeTtcbmxldCBSZXF1aXJlQ29udGV4dERlcGVuZGVuY3k7XG5sZXQgUmVxdWlyZUVuc3VyZURlcGVuZGVuY3k7XG5sZXQgUmVxdWlyZUVuc3VyZUl0ZW1EZXBlbmRlbmN5O1xubGV0IFJlcXVpcmVIZWFkZXJEZXBlbmRlbmN5O1xubGV0IFJlcXVpcmVJbmNsdWRlRGVwZW5kZW5jeTtcbmxldCBSZXF1aXJlUmVzb2x2ZUNvbnRleHREZXBlbmRlbmN5O1xubGV0IFJlcXVpcmVSZXNvbHZlRGVwZW5kZW5jeTtcbmxldCBSZXF1aXJlUmVzb2x2ZUhlYWRlckRlcGVuZGVuY3k7XG5sZXQgU2luZ2xlRW50cnlEZXBlbmRlbmN5O1xubGV0IFVuc3VwcG9ydGVkRGVwZW5kZW5jeTtcblxuY29uc3QgRGVwZW5kZW5jeVNjaGVtYXMyID0gW1xuICBbXG4gICAgJ0FNRERlZmluZURlcGVuZGVuY3knLFxuICAgICdyYW5nZScsXG4gICAgJ2FycmF5UmFuZ2UnLFxuICAgICdmdW5jdGlvblJhbmdlJyxcbiAgICAnb2JqZWN0UmFuZ2UnLFxuICAgICduYW1lZE1vZHVsZScsXG4gIF0sXG4gIFsnQU1EUmVxdWlyZUFycmF5RGVwZW5kZW5jeScsICdkZXBzQXJyYXknLCAncmFuZ2UnXSxcbiAgW1xuICAgICdBTURSZXF1aXJlQ29udGV4dERlcGVuZGVuY3knLFxuICAgICdyZXF1ZXN0JyxcbiAgICAncmVjdXJzaXZlJyxcbiAgICAncmVnRXhwJyxcbiAgICAncmFuZ2UnLFxuICAgICd2YWx1ZVJhbmdlJyxcbiAgXSxcbiAgWydBTURSZXF1aXJlRGVwZW5kZW5jeScsICdibG9jayddLFxuICBbJ0FNRFJlcXVpcmVJdGVtRGVwZW5kZW5jeScsICdyZXF1ZXN0JywgJ3JhbmdlJ10sXG4gIFtcbiAgICAnQ29tbW9uSnNSZXF1aXJlQ29udGV4dERlcGVuZGVuY3knLFxuICAgICdyZXF1ZXN0JyxcbiAgICAncmVjdXJzaXZlJyxcbiAgICAncmVnRXhwJyxcbiAgICAncmFuZ2UnLFxuICAgICd2YWx1ZVJhbmdlJyxcbiAgXSxcbiAgWydDb21tb25Kc1JlcXVpcmVEZXBlbmRlbmN5JywgJ3JlcXVlc3QnLCAncmFuZ2UnXSxcbiAgWydDb25zdERlcGVuZGVuY3knLCAnZXhwcmVzc2lvbicsICdyYW5nZSddLFxuICBbJ0NvbnRleHREZXBlbmRlbmN5JywgJ3JlcXVlc3QnLCAncmVjdXJzaXZlJywgJ3JlZ0V4cCddLFxuICBbJ0NvbnRleHRFbGVtZW50RGVwZW5kZW5jeScsICdyZXF1ZXN0JywgJ3VzZXJSZXF1ZXN0J10sXG4gIFsnRGVsZWdhdGVkU291cmNlRGVwZW5kZW5jeScsICdyZXF1ZXN0J10sXG4gIFsnRGxsRW50cnlEZXBlbmRlbmN5JywgJ2RlcGVuZGVuY2llcycsICduYW1lJ10sXG4gIFsnSGFybW9ueUFjY2VwdERlcGVuZGVuY3knLCAncmFuZ2UnLCAnZGVwZW5kZW5jaWVzJywgJ2hhc0NhbGxiYWNrJ10sXG4gIFsnSGFybW9ueUFjY2VwdEltcG9ydERlcGVuZGVuY3knLCAncmVxdWVzdCcsICdpbXBvcnRlZFZhcicsICdyYW5nZSddLFxuICBbJ0hhcm1vbnlDb21wYXRpYmlsaXR5RGVwZW5kZW5jeScsICdvcmlnaW5Nb2R1bGUnXSxcbiAgW1xuICAgICdIYXJtb255RXhwb3J0RXhwcmVzc2lvbkRlcGVuZGVuY3knLFxuICAgICdvcmlnaW5Nb2R1bGUnLFxuICAgICdyYW5nZScsXG4gICAgJ3JhbmdlU3RhdGVtZW50JyxcbiAgXSxcbiAgWydIYXJtb255RXhwb3J0SGVhZGVyRGVwZW5kZW5jeScsICdyYW5nZScsICdyYW5nZVN0YXRlbWVudCddLFxuICBbXG4gICAgJ0hhcm1vbnlFeHBvcnRJbXBvcnRlZFNwZWNpZmllckRlcGVuZGVuY3knLFxuICAgICdvcmlnaW5Nb2R1bGUnLFxuICAgICdpbXBvcnREZXBlbmRlbmN5JyxcbiAgICAnaW1wb3J0ZWRWYXInLFxuICAgICdpZCcsXG4gICAgJ25hbWUnLFxuICBdLFxuICBbXG4gICAgJ0hhcm1vbnlFeHBvcnRTcGVjaWZpZXJEZXBlbmRlbmN5JyxcbiAgICAnb3JpZ2luTW9kdWxlJyxcbiAgICAnaWQnLFxuICAgICduYW1lJyxcbiAgICAncG9zaXRpb24nLFxuICAgICdpbW11dGFibGUnLFxuICBdLFxuICBbJ0hhcm1vbnlJbXBvcnREZXBlbmRlbmN5JywgJ3JlcXVlc3QnLCAnaW1wb3J0ZWRWYXInLCAncmFuZ2UnXSxcbiAgW1xuICAgICdIYXJtb255SW1wb3J0U3BlY2lmaWVyRGVwZW5kZW5jeScsXG4gICAgJ2ltcG9ydERlcGVuZGVuY3knLFxuICAgICdpbXBvcnRlZFZhcicsXG4gICAgJ2lkJyxcbiAgICAnbmFtZScsXG4gICAgJ3JhbmdlJyxcbiAgICAnc3RyaWN0RXhwb3J0UHJlc2VuY2UnLFxuICBdLFxuICBbXG4gICAgJ0ltcG9ydENvbnRleHREZXBlbmRlbmN5JyxcbiAgICAncmVxdWVzdCcsXG4gICAgJ3JlY3Vyc2l2ZScsXG4gICAgJ3JlZ0V4cCcsXG4gICAgJ3JhbmdlJyxcbiAgICAndmFsdWVSYW5nZScsXG4gICAgJ2NodW5rTmFtZScsXG4gIF0sXG4gIFsnSW1wb3J0RGVwZW5kZW5jeScsICdyZXF1ZXN0JywgJ2Jsb2NrJ10sXG4gIFtcbiAgICAnSW1wb3J0RWFnZXJDb250ZXh0RGVwZW5kZW5jeScsXG4gICAgJ3JlcXVlc3QnLFxuICAgICdyZWN1cnNpdmUnLFxuICAgICdyZWdFeHAnLFxuICAgICdyYW5nZScsXG4gICAgJ3ZhbHVlUmFuZ2UnLFxuICAgICdjaHVua05hbWUnLFxuICBdLFxuICBbJ0ltcG9ydEVhZ2VyRGVwZW5kZW5jeScsICdyZXF1ZXN0JywgJ3JhbmdlJ10sXG4gIFtcbiAgICAnSW1wb3J0TGF6eUNvbnRleHREZXBlbmRlbmN5JyxcbiAgICAncmVxdWVzdCcsXG4gICAgJ3JlY3Vyc2l2ZScsXG4gICAgJ3JlZ0V4cCcsXG4gICAgJ3JhbmdlJyxcbiAgICAndmFsdWVSYW5nZScsXG4gICAgJ2NodW5rTmFtZScsXG4gIF0sXG4gIFtcbiAgICAnSW1wb3J0TGF6eU9uY2VDb250ZXh0RGVwZW5kZW5jeScsXG4gICAgJ3JlcXVlc3QnLFxuICAgICdyZWN1cnNpdmUnLFxuICAgICdyZWdFeHAnLFxuICAgICdyYW5nZScsXG4gICAgJ3ZhbHVlUmFuZ2UnLFxuICAgICdjaHVua05hbWUnLFxuICBdLFxuICBbJ0xvYWRlckRlcGVuZGVuY3knLCAncmVxdWVzdCddLFxuICBbJ0xvY2FsTW9kdWxlRGVwZW5kZW5jeScsICdsb2NhbE1vZHVsZScsICdyYW5nZSddLFxuICBbJ01vZHVsZURlcGVuZGVuY3knLCAncmVxdWVzdCddLFxuICBbJ01vZHVsZUhvdEFjY2VwdERlcGVuZGVuY3knLCAncmVxdWVzdCcsICdyYW5nZSddLFxuICBbJ01vZHVsZUhvdERlY2xpbmVEZXBlbmRlbmN5JywgJ3JlcXVlc3QnLCAncmFuZ2UnXSxcbiAgWydNdWx0aUVudHJ5RGVwZW5kZW5jeScsICdkZXBlbmRlbmNpZXMnLCAnbmFtZSddLFxuICBbJ051bGxEZXBlbmRlbmN5J10sXG4gIFsnUHJlZmV0Y2hEZXBlbmRlbmN5JywgJ3JlcXVlc3QnXSxcbiAgWydSZXF1aXJlQ29udGV4dERlcGVuZGVuY3knLCAncmVxdWVzdCcsICdyZWN1cnNpdmUnLCAncmVnRXhwJywgJ3JhbmdlJ10sXG4gIFsnUmVxdWlyZUVuc3VyZURlcGVuZGVuY3knLCAnYmxvY2snXSxcbiAgWydSZXF1aXJlRW5zdXJlSXRlbURlcGVuZGVuY3knLCAncmVxdWVzdCddLFxuICBbJ1JlcXVpcmVIZWFkZXJEZXBlbmRlbmN5JywgJ3JhbmdlJ10sXG4gIFsnUmVxdWlyZUluY2x1ZGVEZXBlbmRlbmN5JywgJ3JlcXVlc3QnLCAncmFuZ2UnXSxcbiAgW1xuICAgICdSZXF1aXJlUmVzb2x2ZUNvbnRleHREZXBlbmRlbmN5JyxcbiAgICAncmVxdWVzdCcsXG4gICAgJ3JlY3Vyc2l2ZScsXG4gICAgJ3JlZ0V4cCcsXG4gICAgJ3JhbmdlJyxcbiAgICAndmFsdWVSYW5nZScsXG4gIF0sXG4gIFsnUmVxdWlyZVJlc29sdmVEZXBlbmRlbmN5JywgJ3JlcXVlc3QnLCAncmFuZ2UnXSxcbiAgWydSZXF1aXJlUmVzb2x2ZUhlYWRlckRlcGVuZGVuY3knLCAncmFuZ2UnXSxcbiAgWydTaW5nbGVFbnRyeURlcGVuZGVuY3knLCAncmVxdWVzdCddLFxuICBbJ1Vuc3VwcG9ydGVkRGVwZW5kZW5jeScsICdyZXF1ZXN0JywgJ3JhbmdlJ10sXG5dO1xuXG5jb25zdCBEZXBlbmRlbmN5U2NoZW1hczMgPSBbXG4gIFtcbiAgICAnQU1ERGVmaW5lRGVwZW5kZW5jeScsXG4gICAgJ3JhbmdlJyxcbiAgICAnYXJyYXlSYW5nZScsXG4gICAgJ2Z1bmN0aW9uUmFuZ2UnLFxuICAgICdvYmplY3RSYW5nZScsXG4gICAgJ25hbWVkTW9kdWxlJyxcbiAgXSxcbiAgWydBTURSZXF1aXJlQXJyYXlEZXBlbmRlbmN5JywgJ2RlcHNBcnJheScsICdyYW5nZSddLFxuICBbXG4gICAgJ0FNRFJlcXVpcmVDb250ZXh0RGVwZW5kZW5jeScsXG4gICAgJ3JlcXVlc3QnLFxuICAgICdyZWN1cnNpdmUnLFxuICAgICdyZWdFeHAnLFxuICAgICdyYW5nZScsXG4gICAgJ3ZhbHVlUmFuZ2UnLFxuICBdLFxuICBbJ0FNRFJlcXVpcmVEZXBlbmRlbmN5JywgJ2Jsb2NrJ10sXG4gIFsnQU1EUmVxdWlyZUl0ZW1EZXBlbmRlbmN5JywgJ3JlcXVlc3QnLCAncmFuZ2UnXSxcbiAgW1xuICAgICdDb21tb25Kc1JlcXVpcmVDb250ZXh0RGVwZW5kZW5jeScsXG4gICAgJ3JlcXVlc3QnLFxuICAgICdyZWN1cnNpdmUnLFxuICAgICdyZWdFeHAnLFxuICAgICdyYW5nZScsXG4gICAgJ3ZhbHVlUmFuZ2UnLFxuICBdLFxuICBbJ0NvbW1vbkpzUmVxdWlyZURlcGVuZGVuY3knLCAncmVxdWVzdCcsICdyYW5nZSddLFxuICBbJ0NvbnN0RGVwZW5kZW5jeScsICdleHByZXNzaW9uJywgJ3JhbmdlJ10sXG4gIFsnQ29udGV4dERlcGVuZGVuY3knLCAncmVxdWVzdCcsICdyZWN1cnNpdmUnLCAncmVnRXhwJ10sXG4gIFsnQ29udGV4dEVsZW1lbnREZXBlbmRlbmN5JywgJ3JlcXVlc3QnLCAndXNlclJlcXVlc3QnXSxcbiAgWydDcml0aWNhbERlcGVuZGVuY3lXYXJuaW5nJywgJ21lc3NhZ2UnXSxcbiAgWydEZWxlZ2F0ZWRFeHBvcnRzRGVwZW5kZW5jeScsICdvcmlnaW5Nb2R1bGUnLCAnZXhwb3J0cyddLFxuICBbJ0RlbGVnYXRlZFNvdXJjZURlcGVuZGVuY3knLCAncmVxdWVzdCddLFxuICBbJ0RsbEVudHJ5RGVwZW5kZW5jeScsICdkZXBlbmRlbmNpZXMnLCAnbmFtZSddLFxuICBbJ0hhcm1vbnlBY2NlcHREZXBlbmRlbmN5JywgJ3JhbmdlJywgJ2RlcGVuZGVuY2llcycsICdoYXNDYWxsYmFjayddLFxuICBbJ0hhcm1vbnlBY2NlcHRJbXBvcnREZXBlbmRlbmN5JywgJ3JlcXVlc3QnLCAnaW1wb3J0ZWRWYXInLCAncmFuZ2UnXSxcbiAgWydIYXJtb255Q29tcGF0aWJpbGl0eURlcGVuZGVuY3knLCAnb3JpZ2luTW9kdWxlJ10sXG4gIFtcbiAgICAnSGFybW9ueUV4cG9ydEV4cHJlc3Npb25EZXBlbmRlbmN5JyxcbiAgICAnb3JpZ2luTW9kdWxlJyxcbiAgICAncmFuZ2UnLFxuICAgICdyYW5nZVN0YXRlbWVudCcsXG4gIF0sXG4gIFsnSGFybW9ueUV4cG9ydEhlYWRlckRlcGVuZGVuY3knLCAncmFuZ2UnLCAncmFuZ2VTdGF0ZW1lbnQnXSxcbiAgW1xuICAgICdIYXJtb255RXhwb3J0SW1wb3J0ZWRTcGVjaWZpZXJEZXBlbmRlbmN5JyxcbiAgICAnb3JpZ2luTW9kdWxlJyxcbiAgICAnaW1wb3J0RGVwZW5kZW5jeScsXG4gICAgJ2ltcG9ydGVkVmFyJyxcbiAgICAnaWQnLFxuICAgICduYW1lJyxcbiAgICAnYWN0aXZlRXhwb3J0cycsXG4gICAgJ290aGVyU3RhckV4cG9ydHMnLFxuICBdLFxuICBbXG4gICAgJ0hhcm1vbnlFeHBvcnRTcGVjaWZpZXJEZXBlbmRlbmN5JyxcbiAgICAnb3JpZ2luTW9kdWxlJyxcbiAgICAnaWQnLFxuICAgICduYW1lJyxcbiAgICAncG9zaXRpb24nLFxuICAgICdpbW11dGFibGUnLFxuICBdLFxuICBbJ0hhcm1vbnlJbXBvcnREZXBlbmRlbmN5JywgJ3JlcXVlc3QnLCAnaW1wb3J0ZWRWYXInLCAncmFuZ2UnXSxcbiAgW1xuICAgICdIYXJtb255SW1wb3J0U3BlY2lmaWVyRGVwZW5kZW5jeScsXG4gICAgJ2ltcG9ydERlcGVuZGVuY3knLFxuICAgICdpbXBvcnRlZFZhcicsXG4gICAgJ2lkJyxcbiAgICAnbmFtZScsXG4gICAgJ3JhbmdlJyxcbiAgICAnc3RyaWN0RXhwb3J0UHJlc2VuY2UnLFxuICBdLFxuICBbXG4gICAgJ0ltcG9ydENvbnRleHREZXBlbmRlbmN5JyxcbiAgICAncmVxdWVzdCcsXG4gICAgJ3JlY3Vyc2l2ZScsXG4gICAgJ3JlZ0V4cCcsXG4gICAgJ3JhbmdlJyxcbiAgICAndmFsdWVSYW5nZScsXG4gICAgJ2NodW5rTmFtZScsXG4gIF0sXG4gIFsnSW1wb3J0RGVwZW5kZW5jeScsICdyZXF1ZXN0JywgJ2Jsb2NrJ10sXG4gIFtcbiAgICAnSW1wb3J0RWFnZXJDb250ZXh0RGVwZW5kZW5jeScsXG4gICAgJ3JlcXVlc3QnLFxuICAgICdyZWN1cnNpdmUnLFxuICAgICdyZWdFeHAnLFxuICAgICdyYW5nZScsXG4gICAgJ3ZhbHVlUmFuZ2UnLFxuICAgICdjaHVua05hbWUnLFxuICBdLFxuICBbJ0ltcG9ydEVhZ2VyRGVwZW5kZW5jeScsICdyZXF1ZXN0JywgJ3JhbmdlJ10sXG4gIFtcbiAgICAnSW1wb3J0TGF6eUNvbnRleHREZXBlbmRlbmN5JyxcbiAgICAncmVxdWVzdCcsXG4gICAgJ3JlY3Vyc2l2ZScsXG4gICAgJ3JlZ0V4cCcsXG4gICAgJ3JhbmdlJyxcbiAgICAndmFsdWVSYW5nZScsXG4gICAgJ2NodW5rTmFtZScsXG4gIF0sXG4gIFtcbiAgICAnSW1wb3J0TGF6eU9uY2VDb250ZXh0RGVwZW5kZW5jeScsXG4gICAgJ3JlcXVlc3QnLFxuICAgICdyZWN1cnNpdmUnLFxuICAgICdyZWdFeHAnLFxuICAgICdyYW5nZScsXG4gICAgJ3ZhbHVlUmFuZ2UnLFxuICAgICdjaHVua05hbWUnLFxuICBdLFxuICBbXG4gICAgJ0ltcG9ydFdlYWtDb250ZXh0RGVwZW5kZW5jeScsXG4gICAgJ3JlcXVlc3QnLFxuICAgICdyZWN1cnNpdmUnLFxuICAgICdyZWdFeHAnLFxuICAgICdyYW5nZScsXG4gICAgJ3ZhbHVlUmFuZ2UnLFxuICAgICdjaHVua05hbWUnLFxuICBdLFxuICBbJ0ltcG9ydFdlYWtEZXBlbmRlbmN5JywgJ3JlcXVlc3QnLCAncmFuZ2UnXSxcbiAgWydMb2FkZXJEZXBlbmRlbmN5JywgJ3JlcXVlc3QnXSxcbiAgWydMb2NhbE1vZHVsZURlcGVuZGVuY3knLCAnbG9jYWxNb2R1bGUnLCAncmFuZ2UnXSxcbiAgWydNb2R1bGVEZXBlbmRlbmN5JywgJ3JlcXVlc3QnXSxcbiAgWydNb2R1bGVIb3RBY2NlcHREZXBlbmRlbmN5JywgJ3JlcXVlc3QnLCAncmFuZ2UnXSxcbiAgWydNb2R1bGVIb3REZWNsaW5lRGVwZW5kZW5jeScsICdyZXF1ZXN0JywgJ3JhbmdlJ10sXG4gIFsnTXVsdGlFbnRyeURlcGVuZGVuY3knLCAnZGVwZW5kZW5jaWVzJywgJ25hbWUnXSxcbiAgWydOdWxsRGVwZW5kZW5jeSddLFxuICBbJ1ByZWZldGNoRGVwZW5kZW5jeScsICdyZXF1ZXN0J10sXG4gIFtcbiAgICAnUmVxdWlyZUNvbnRleHREZXBlbmRlbmN5JyxcbiAgICAncmVxdWVzdCcsXG4gICAgJ3JlY3Vyc2l2ZScsXG4gICAgJ3JlZ0V4cCcsXG4gICAgJ2FzeW5jTW9kZScsXG4gICAgJ3JhbmdlJyxcbiAgXSxcbiAgWydSZXF1aXJlRW5zdXJlRGVwZW5kZW5jeScsICdibG9jayddLFxuICBbJ1JlcXVpcmVFbnN1cmVJdGVtRGVwZW5kZW5jeScsICdyZXF1ZXN0J10sXG4gIFsnUmVxdWlyZUhlYWRlckRlcGVuZGVuY3knLCAncmFuZ2UnXSxcbiAgWydSZXF1aXJlSW5jbHVkZURlcGVuZGVuY3knLCAncmVxdWVzdCcsICdyYW5nZSddLFxuICBbXG4gICAgJ1JlcXVpcmVSZXNvbHZlQ29udGV4dERlcGVuZGVuY3knLFxuICAgICdyZXF1ZXN0JyxcbiAgICAncmVjdXJzaXZlJyxcbiAgICAncmVnRXhwJyxcbiAgICAncmFuZ2UnLFxuICAgICd2YWx1ZVJhbmdlJyxcbiAgXSxcbiAgWydSZXF1aXJlUmVzb2x2ZURlcGVuZGVuY3knLCAncmVxdWVzdCcsICdyYW5nZSddLFxuICBbJ1JlcXVpcmVSZXNvbHZlSGVhZGVyRGVwZW5kZW5jeScsICdyYW5nZSddLFxuICBbJ1NpbmdsZUVudHJ5RGVwZW5kZW5jeScsICdyZXF1ZXN0J10sXG4gIFsnVW5zdXBwb3J0ZWREZXBlbmRlbmN5JywgJ3JlcXVlc3QnLCAncmFuZ2UnXSxcbl07XG5cbmNvbnN0IGZyZWV6ZUFyZ3VtZW50ID0ge1xuICBkZXBlbmRlbmNpZXMoYXJnLCBkZXBlbmRlbmN5LCBleHRyYSwgbWV0aG9kcykge1xuICAgIHJldHVybiBtZXRob2RzLm1hcEZyZWV6ZSgnRGVwZW5kZW5jeScsIG51bGwsIGFyZywgZXh0cmEpO1xuICB9LFxuICBkZXBzQXJyYXkoYXJnLCBkZXBlbmRlbmN5LCBleHRyYSwgbWV0aG9kcykge1xuICAgIHJldHVybiBtZXRob2RzLm1hcEZyZWV6ZSgnRGVwZW5kZW5jeScsIG51bGwsIGFyZywgZXh0cmEpO1xuICB9LFxuICBsb2NhbE1vZHVsZSh7IG5hbWUsIGlkeCB9LCBkZXBlbmRlbmN5LCBleHRyYSwgbWV0aG9kcykge1xuICAgIHJldHVybiB7XG4gICAgICBuYW1lOiBuYW1lLFxuICAgICAgaWR4OiBpZHgsXG4gICAgfTtcbiAgfSxcbiAgcmVnRXhwKGFyZywgZGVwZW5kZW5jeSwgZXh0cmEsIG1ldGhvZHMpIHtcbiAgICByZXR1cm4gYXJnID8gYXJnLnNvdXJjZSA6IGZhbHNlO1xuICB9LFxuICByZXF1ZXN0KGFyZywgZGVwZW5kZW5jeSwgZXh0cmEsIG1ldGhvZHMpIHtcbiAgICByZXR1cm4gcmVsYXRlQ29udGV4dC5yZWxhdGVBYnNvbHV0ZVJlcXVlc3QoZXh0cmEubW9kdWxlLmNvbnRleHQsIGFyZyk7XG4gIH0sXG4gIHVzZXJSZXF1ZXN0KGFyZywgZGVwZW5kZW5jeSwgZXh0cmEsIG1ldGhvZHMpIHtcbiAgICByZXR1cm4gcmVsYXRlQ29udGV4dC5yZWxhdGVBYnNvbHV0ZVJlcXVlc3QoZXh0cmEubW9kdWxlLmNvbnRleHQsIGFyZyk7XG4gIH0sXG4gIGJsb2NrKGFyZywgZGVwZW5kZW5jeSwgZXh0cmEsIG1ldGhvZHMpIHtcbiAgICAvLyBEZXBlbmRlbmN5IG5lc3RlZCBpbiBhIHBhcmVudC4gRnJlZXppbmcgdGhlIGJsb2NrIGlzIGEgbG9vcC5cbiAgICBpZiAoYXJnLmRlcGVuZGVuY2llcy5pbmNsdWRlcyhkZXBlbmRlbmN5KSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICByZXR1cm4gbWV0aG9kcy5mcmVlemUoJ0RlcGVuZGVuY3lCbG9jaycsIG51bGwsIGFyZywgZXh0cmEpO1xuICB9LFxuICBpbXBvcnREZXBlbmRlbmN5KGFyZywgZGVwZW5kZW5jeSwgZXh0cmEsIG1ldGhvZHMpIHtcbiAgICByZXR1cm4gbWV0aG9kcy5mcmVlemUoJ0RlcGVuZGVuY3knLCBudWxsLCBhcmcsIGV4dHJhKTtcbiAgfSxcbiAgb3JpZ2luTW9kdWxlKGFyZywgZGVwZW5kZW5jeSwgZXh0cmEsIG1ldGhvZHMpIHtcbiAgICAvLyBUaGlzIHdpbGwgYmUgaW4gZXh0cmEsIGdlbmVyYXRlZCBvciBmb3VuZCBkdXJpbmcgdGhlIHByb2Nlc3Mgb2YgdGhhd2luZy5cbiAgfSxcbiAgYWN0aXZlRXhwb3J0cyhhcmcsIGRlcGVuZGVuY3ksIGV4dHJhLCBtZXRob2RzKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH0sXG4gIG90aGVyU3RhckV4cG9ydHMoYXJnLCBkZXBlbmRlbmN5LCBleHRyYSwgbWV0aG9kcykge1xuICAgIGlmIChhcmcpIHtcbiAgICAgIC8vIFRoaXMgd2lsbCBiZSBpbiBleHRyYSwgZ2VuZXJhdGVkIGR1cmluZyB0aGUgcHJvY2VzcyBvZiB0aGF3aW5nLlxuICAgICAgcmV0dXJuICdzdGFyJztcbiAgICB9XG4gICAgcmV0dXJuIG51bGw7XG4gIH0sXG4gIG9wdGlvbnMoYXJnLCBkZXBlbmRlbmN5LCBleHRyYSwgbWV0aG9kcykge1xuICAgIGlmIChhcmcucmVnRXhwKSB7XG4gICAgICByZXR1cm4gT2JqZWN0LmFzc2lnbih7fSwgYXJnLCB7XG4gICAgICAgIHJlZ0V4cDogYXJnLnJlZ0V4cC5zb3VyY2UsXG4gICAgICB9KTtcbiAgICB9XG4gICAgcmV0dXJuIGFyZztcbiAgfSxcbiAgcGFyc2VyU2NvcGUoYXJnLCBkZXBlbmRlbmNpZXMsIGV4dHJhLCBtZXRob2RzKSB7XG4gICAgcmV0dXJuO1xuICB9LFxufTtcblxuY29uc3QgdGhhd0FyZ3VtZW50ID0ge1xuICBkZXBlbmRlbmNpZXMoYXJnLCBmcm96ZW4sIGV4dHJhLCBtZXRob2RzKSB7XG4gICAgcmV0dXJuIG1ldGhvZHMubWFwVGhhdygnRGVwZW5kZW5jeScsIG51bGwsIGFyZywgZXh0cmEpO1xuICB9LFxuICBkZXBzQXJyYXkoYXJnLCBmcm96ZW4sIGV4dHJhLCBtZXRob2RzKSB7XG4gICAgcmV0dXJuIG1ldGhvZHMubWFwVGhhdygnRGVwZW5kZW5jeScsIG51bGwsIGFyZywgZXh0cmEpO1xuICB9LFxuICBsb2NhbE1vZHVsZSh7IGlkeCwgbmFtZSwgdXNlZCB9LCBmcm96ZW4sIGV4dHJhLCBtZXRob2RzKSB7XG4gICAgY29uc3Qgc3RhdGUgPSBleHRyYS5zdGF0ZTtcbiAgICBpZiAoIXN0YXRlLmxvY2FsTW9kdWxlcykge1xuICAgICAgc3RhdGUubG9jYWxNb2R1bGVzID0gW107XG4gICAgfVxuICAgIGlmICghc3RhdGUubG9jYWxNb2R1bGVzW2lkeF0pIHtcbiAgICAgIHN0YXRlLmxvY2FsTW9kdWxlc1tpZHhdID0gbmV3IExvY2FsTW9kdWxlKGV4dHJhLm1vZHVsZSwgbmFtZSwgaWR4KTtcbiAgICAgIHN0YXRlLmxvY2FsTW9kdWxlc1tpZHhdLnVzZWQgPSB1c2VkO1xuICAgIH1cbiAgICByZXR1cm4gc3RhdGUubG9jYWxNb2R1bGVzW2lkeF07XG4gIH0sXG4gIHJlZ0V4cChhcmcsIGZyb3plbiwgZXh0cmEsIG1ldGhvZHMpIHtcbiAgICByZXR1cm4gYXJnID8gbmV3IFJlZ0V4cChhcmcpIDogYXJnO1xuICB9LFxuICAvLyByZXF1ZXN0OiBmdW5jdGlvbihhcmcsIGRlcGVuZGVuY3ksIGV4dHJhLCBtZXRob2RzKSB7XG4gIC8vICAgcmV0dXJuIHJlbGF0ZUNvbnRleHQuY29udGV4dE5vcm1hbFJlcXVlc3QoZXh0cmEuY29tcGlsYXRpb24uY29tcGlsZXIsIGFyZyk7XG4gIC8vIH0sXG4gIGJsb2NrKGFyZywgZnJvemVuLCBleHRyYSwgbWV0aG9kcykge1xuICAgIC8vIE5vdCBoYXZpbmcgYSBibG9jaywgbWVhbnMgaXQgbmVlZHMgdG8gY3JlYXRlIGEgY3ljbGUgYW5kIHJlZmVyIHRvIGl0c1xuICAgIC8vIHBhcmVudC5cbiAgICBpZiAoIWFyZykge1xuICAgICAgcmV0dXJuIGV4dHJhLnBhcmVudDtcbiAgICB9XG4gICAgcmV0dXJuIG1ldGhvZHMudGhhdygnRGVwZW5kZW5jeUJsb2NrJywgbnVsbCwgYXJnLCBleHRyYSk7XG4gIH0sXG4gIGltcG9ydERlcGVuZGVuY3koYXJnLCBmcm96ZW4sIGV4dHJhLCBtZXRob2RzKSB7XG4gICAgcmV0dXJuIG1ldGhvZHMudGhhdygnRGVwZW5kZW5jeScsIG51bGwsIGFyZywgZXh0cmEpO1xuICB9LFxuICBvcmlnaW5Nb2R1bGUoYXJnLCBmcm96ZW4sIGV4dHJhLCBtZXRob2RzKSB7XG4gICAgcmV0dXJuIGV4dHJhLm1vZHVsZTtcbiAgfSxcbiAgYWN0aXZlRXhwb3J0cyhhcmcsIHsgbmFtZSB9LCB7IHN0YXRlIH0sIG1ldGhvZHMpIHtcbiAgICBzdGF0ZS5hY3RpdmVFeHBvcnRzID0gc3RhdGUuYWN0aXZlRXhwb3J0cyB8fCBuZXcgU2V0KCk7XG4gICAgaWYgKG5hbWUpIHtcbiAgICAgIHN0YXRlLmFjdGl2ZUV4cG9ydHMuYWRkKG5hbWUpO1xuICAgIH1cbiAgICByZXR1cm4gc3RhdGUuYWN0aXZlRXhwb3J0cztcbiAgfSxcbiAgb3RoZXJTdGFyRXhwb3J0cyhhcmcsIGZyb3plbiwgeyBzdGF0ZSB9LCBtZXRob2RzKSB7XG4gICAgaWYgKGFyZyA9PT0gJ3N0YXInKSB7XG4gICAgICByZXR1cm4gc3RhdGUub3RoZXJTdGFyRXhwb3J0cyB8fCBbXTtcbiAgICB9XG4gICAgcmV0dXJuIG51bGw7XG4gIH0sXG4gIG9wdGlvbnMoYXJnLCBmcm96ZW4sIGV4dHJhLCBtZXRob2RzKSB7XG4gICAgaWYgKGFyZy5yZWdFeHApIHtcbiAgICAgIHJldHVybiBPYmplY3QuYXNzaWduKHt9LCBhcmcsIHtcbiAgICAgICAgcmVnRXhwOiBuZXcgUmVnRXhwKGFyZy5yZWdFeHApLFxuICAgICAgfSk7XG4gICAgfVxuICAgIHJldHVybiBhcmc7XG4gIH0sXG4gIHBhcnNlclNjb3BlKGFyZywgZnJvemVuLCB7IHN0YXRlIH0sIG1ldGhvZHMpIHtcbiAgICBzdGF0ZS5oYXJtb255UGFyc2VyU2NvcGUgPSBzdGF0ZS5oYXJtb255UGFyc2VyU2NvcGUgfHwge307XG4gICAgcmV0dXJuIHN0YXRlLmhhcm1vbnlQYXJzZXJTY29wZTtcbiAgfSxcbn07XG5cbmZ1bmN0aW9uIGZyZWV6ZURlcGVuZGVuY3koZGVwZW5kZW5jeSwgZXh0cmEsIG1ldGhvZHMpIHtcbiAgY29uc3Qgc2NoZW1hcyA9IGV4dHJhLnNjaGVtYXM7XG4gIGZvciAobGV0IGkgPSAwOyBpIDwgc2NoZW1hcy5sZW5ndGg7IGkrKykge1xuICAgIGlmIChkZXBlbmRlbmN5LmNvbnN0cnVjdG9yID09PSBzY2hlbWFzW2ldLkRlcGVuZGVuY3kpIHtcbiAgICAgIGNvbnN0IGZyb3plbiA9IHtcbiAgICAgICAgdHlwZTogc2NoZW1hc1tpXVswXSxcbiAgICAgIH07XG4gICAgICBmb3IgKGxldCBqID0gMTsgaiA8IHNjaGVtYXNbaV0ubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgbGV0IGFyZyA9IGRlcGVuZGVuY3lbc2NoZW1hc1tpXVtqXV07XG4gICAgICAgIGlmIChmcmVlemVBcmd1bWVudFtzY2hlbWFzW2ldW2pdXSkge1xuICAgICAgICAgIGFyZyA9IGZyZWV6ZUFyZ3VtZW50W3NjaGVtYXNbaV1bal1dKGFyZywgZGVwZW5kZW5jeSwgZXh0cmEsIG1ldGhvZHMpO1xuICAgICAgICB9XG4gICAgICAgIGZyb3plbltzY2hlbWFzW2ldW2pdXSA9IGFyZztcbiAgICAgIH1cbiAgICAgIHJldHVybiBmcm96ZW47XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIHRoYXdEZXBlbmRlbmN5KGZyb3plbiwgZXh0cmEsIG1ldGhvZHMpIHtcbiAgY29uc3Qgc2NoZW1hcyA9IGV4dHJhLnNjaGVtYXM7XG4gIHNjaGVtYXMubWFwID0gc2NoZW1hcy5tYXAgfHwge307XG4gIGlmIChzY2hlbWFzLm1hcFtmcm96ZW4udHlwZV0pIHtcbiAgICBjb25zdCBkZXBTY2hlbWEgPSBzY2hlbWFzLm1hcFtmcm96ZW4udHlwZV07XG4gICAgY29uc3QgRGVwZW5kZW5jeSA9IGRlcFNjaGVtYS5EZXBlbmRlbmN5O1xuICAgIHRyeSB7XG4gICAgICByZXR1cm4gbmV3IERlcGVuZGVuY3koLi4uZGVwU2NoZW1hLmFyZ3MoZnJvemVuLCBleHRyYSwgbWV0aG9kcykpO1xuICAgIH0gY2F0Y2ggKF8pIHtcbiAgICAgIHJldHVybiBuZXcgKEZ1bmN0aW9uLnByb3RvdHlwZS5iaW5kLmFwcGx5KFxuICAgICAgICBEZXBlbmRlbmN5LFxuICAgICAgICBbbnVsbF0uY29uY2F0KGRlcFNjaGVtYS5hcmdzKGZyb3plbiwgZXh0cmEsIG1ldGhvZHMpKSxcbiAgICAgICkpKCk7XG4gICAgfVxuICB9XG5cbiAgZm9yIChjb25zdCBkZXBTY2hlbWEgb2Ygc2NoZW1hcykge1xuICAgIGlmIChmcm96ZW4udHlwZSA9PT0gZGVwU2NoZW1hWzBdKSB7XG4gICAgICBzY2hlbWFzLm1hcFtmcm96ZW4udHlwZV0gPSBkZXBTY2hlbWE7XG4gICAgICBjb25zdCBEZXBlbmRlbmN5ID0gZGVwU2NoZW1hLkRlcGVuZGVuY3k7XG4gICAgICBjb25zdCBsaW5lcyA9IFtdO1xuICAgICAgZm9yIChsZXQgaiA9IDE7IGogPCBkZXBTY2hlbWEubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgY29uc3QgYXJnTmFtZSA9IGRlcFNjaGVtYVtqXTtcbiAgICAgICAgaWYgKHRoYXdBcmd1bWVudFthcmdOYW1lXSkge1xuICAgICAgICAgIGxpbmVzLnB1c2goXG4gICAgICAgICAgICBgICB0aGF3QXJndW1lbnQuJHthcmdOYW1lfShmcm96ZW4uJHthcmdOYW1lfSwgZnJvemVuLCBleHRyYSwgbWV0aG9kcylgLFxuICAgICAgICAgICk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgbGluZXMucHVzaChgICBmcm96ZW4uJHthcmdOYW1lfWApO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBkZXBTY2hlbWEuYXJncyA9IG5ldyBGdW5jdGlvbihcbiAgICAgICAgJ3RoYXdBcmd1bWVudCcsXG4gICAgICAgIGBcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKGZyb3plbiwgZXh0cmEsIG1ldGhvZHMpIHtcbiAgICAgICAgICByZXR1cm4gW1xuICAgICAgICAgICR7bGluZXMuam9pbignLFxcbicpfVxuICAgICAgICAgIF07XG4gICAgICAgIH07XG4gICAgICBgLFxuICAgICAgKSh0aGF3QXJndW1lbnQpO1xuICAgICAgdHJ5IHtcbiAgICAgICAgcmV0dXJuIG5ldyBEZXBlbmRlbmN5KC4uLmRlcFNjaGVtYS5hcmdzKGZyb3plbiwgZXh0cmEsIG1ldGhvZHMpKTtcbiAgICAgIH0gY2F0Y2ggKF8pIHtcbiAgICAgICAgcmV0dXJuIG5ldyAoRnVuY3Rpb24ucHJvdG90eXBlLmJpbmQuYXBwbHkoXG4gICAgICAgICAgRGVwZW5kZW5jeSxcbiAgICAgICAgICBbbnVsbF0uY29uY2F0KGRlcFNjaGVtYS5hcmdzKGZyb3plbiwgZXh0cmEsIG1ldGhvZHMpKSxcbiAgICAgICAgKSkoKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cblxuY2xhc3MgVHJhbnNmb3JtQmFzaWNEZXBlbmRlbmN5UGx1Z2luTGVnYWN5IHtcbiAgY29uc3RydWN0b3Iob3B0aW9ucykge1xuICAgIHRoaXMub3B0aW9ucyA9IG9wdGlvbnM7XG4gIH1cblxuICBhcHBseShjb21waWxlcikge1xuICAgIGxldCBzY2hlbWFzID0gRGVwZW5kZW5jeVNjaGVtYXMzO1xuICAgIGlmICh0aGlzLm9wdGlvbnMuc2NoZW1hIDwgMykge1xuICAgICAgc2NoZW1hcyA9IERlcGVuZGVuY3lTY2hlbWFzMjtcbiAgICB9XG5cbiAgICBwbHVnaW5Db21wYXQudGFwKFxuICAgICAgY29tcGlsZXIsXG4gICAgICAnYWZ0ZXJQbHVnaW5zJyxcbiAgICAgICdUcmFuc2Zvcm1CYXNpY0RlcGVuZGVuY3lQbHVnaW4gc2NhbiBEZXBlbmRlbmN5IHR5cGVzJyxcbiAgICAgICgpID0+IHtcbiAgICAgICAgcGx1Z2luQ29tcGF0LnRhcChcbiAgICAgICAgICBjb21waWxlcixcbiAgICAgICAgICAnY29tcGlsYXRpb24nLFxuICAgICAgICAgICdUcmFuc2Zvcm1CYXNpY0RlcGVuZGVuY3lQbHVnaW4gc2NhbiBEZXBlbmRlbmNpZXMgdHlwZXMnLFxuICAgICAgICAgICh7IGRlcGVuZGVuY3lGYWN0b3JpZXMgfSkgPT4ge1xuICAgICAgICAgICAgY29uc3QgRGVwZW5kZW5jaWVzID0gZGVwZW5kZW5jeUZhY3Rvcmllcy5rZXlzKCk7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IERlcCBvZiBEZXBlbmRlbmNpZXMpIHtcbiAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBzY2hlbWFzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgaWYgKERlcC5uYW1lID09PSBzY2hlbWFzW2ldWzBdKSB7XG4gICAgICAgICAgICAgICAgICBzY2hlbWFzW2ldLkRlcGVuZGVuY3kgPSBEZXA7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHNjaGVtYXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgaWYgKCFzY2hlbWFzW2ldLkRlcGVuZGVuY3kpIHtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5vcHRpb25zLnNjaGVtYSA8IDQpIHtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgaWYgKHNjaGVtYXNbaV1bMF0gPT09ICdKc29uRXhwb3J0c0RlcGVuZGVuY3knKSB7XG4gICAgICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgICAgc2NoZW1hc1tcbiAgICAgICAgICAgICAgICAgICAgICAgIGlcbiAgICAgICAgICAgICAgICAgICAgICBdLkRlcGVuZGVuY3kgPSByZXF1aXJlKCd3ZWJwYWNrL2xpYi9kZXBlbmRlbmNpZXMvSnNvbkV4cG9ydHNEZXBlbmRlbmN5Jyk7XG4gICAgICAgICAgICAgICAgICAgIH0gY2F0Y2ggKF8pIHt9XG4gICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHNjaGVtYXNbaV1bMF0gPT09ICdEZWxlZ2F0ZWRFeHBvcnRzRGVwZW5kZW5jeScpIHtcbiAgICAgICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgICBzY2hlbWFzW1xuICAgICAgICAgICAgICAgICAgICAgICAgaVxuICAgICAgICAgICAgICAgICAgICAgIF0uRGVwZW5kZW5jeSA9IHJlcXVpcmUoJ3dlYnBhY2svbGliL2RlcGVuZGVuY2llcy9EZWxlZ2F0ZWRFeHBvcnRzRGVwZW5kZW5jeScpO1xuICAgICAgICAgICAgICAgICAgICB9IGNhdGNoIChfKSB7fVxuICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChzY2hlbWFzW2ldWzBdID09PSAnRGVsZWdhdGVkU291cmNlRGVwZW5kZW5jeScpIHtcbiAgICAgICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgICBzY2hlbWFzW1xuICAgICAgICAgICAgICAgICAgICAgICAgaVxuICAgICAgICAgICAgICAgICAgICAgIF0uRGVwZW5kZW5jeSA9IHJlcXVpcmUoJ3dlYnBhY2svbGliL2RlcGVuZGVuY2llcy9EZWxlZ2F0ZWRTb3VyY2VEZXBlbmRlbmN5Jyk7XG4gICAgICAgICAgICAgICAgICAgIH0gY2F0Y2ggKF8pIHt9XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSxcbiAgICAgICAgKTtcbiAgICAgIH0sXG4gICAgKTtcblxuICAgIGxldCBtZXRob2RzO1xuXG4gICAgcGx1Z2luQ29tcGF0LnRhcChcbiAgICAgIGNvbXBpbGVyLFxuICAgICAgJ19oYXJkU291cmNlTWV0aG9kcycsXG4gICAgICAnVHJhbnNmb3JtQmFzaWNEZXBlbmRlbmN5UGx1Z2luIG1ldGhvZHMnLFxuICAgICAgX21ldGhvZHMgPT4ge1xuICAgICAgICBtZXRob2RzID0gX21ldGhvZHM7XG4gICAgICB9LFxuICAgICk7XG5cbiAgICBwbHVnaW5Db21wYXQudGFwKFxuICAgICAgY29tcGlsZXIsXG4gICAgICAnX2hhcmRTb3VyY2VGcmVlemVEZXBlbmRlbmN5JyxcbiAgICAgICdUcmFuc2Zvcm1CYXNpY0RlcGVuZGVuY3lQbHVnaW4gZnJlZXplJyxcbiAgICAgIChmcm96ZW4sIGRlcGVuZGVuY3ksIGV4dHJhKSA9PiB7XG4gICAgICAgIGV4dHJhLnNjaGVtYXMgPSBzY2hlbWFzO1xuICAgICAgICBjb25zdCBfZnJvemVuID0gZnJlZXplRGVwZW5kZW5jeShkZXBlbmRlbmN5LCBleHRyYSwgbWV0aG9kcyk7XG4gICAgICAgIGlmIChfZnJvemVuKSB7XG4gICAgICAgICAgaWYgKGRlcGVuZGVuY3kucHJlcGVuZCkge1xuICAgICAgICAgICAgX2Zyb3plbi5wcmVwZW5kID0gZGVwZW5kZW5jeS5wcmVwZW5kO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoZGVwZW5kZW5jeS5yZXBsYWNlcykge1xuICAgICAgICAgICAgX2Zyb3plbi5yZXBsYWNlcyA9IGRlcGVuZGVuY3kucmVwbGFjZXM7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChkZXBlbmRlbmN5LmNyaXRpY2FsKSB7XG4gICAgICAgICAgICBfZnJvemVuLmNyaXRpY2FsID0gZGVwZW5kZW5jeS5jcml0aWNhbDtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKHR5cGVvZiBkZXBlbmRlbmN5Lm5hbWVzcGFjZU9iamVjdEFzQ29udGV4dCAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIF9mcm96ZW4ubmFtZXNwYWNlT2JqZWN0QXNDb250ZXh0ID1cbiAgICAgICAgICAgICAgZGVwZW5kZW5jeS5uYW1lc3BhY2VPYmplY3RBc0NvbnRleHQ7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmICh0eXBlb2YgZGVwZW5kZW5jeS5jYWxsQXJncyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIF9mcm96ZW4uY2FsbEFyZ3MgPSBkZXBlbmRlbmN5LmNhbGxBcmdzO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAodHlwZW9mIGRlcGVuZGVuY3kuY2FsbCAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIF9mcm96ZW4uY2FsbCA9IGRlcGVuZGVuY3kuY2FsbDtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKHR5cGVvZiBkZXBlbmRlbmN5LmRpcmVjdEltcG9ydCAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIF9mcm96ZW4uZGlyZWN0SW1wb3J0ID0gZGVwZW5kZW5jeS5kaXJlY3RJbXBvcnQ7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmICh0eXBlb2YgZGVwZW5kZW5jeS5zaG9ydGhhbmQgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICBfZnJvemVuLnNob3J0aGFuZCA9IGRlcGVuZGVuY3kuc2hvcnRoYW5kO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoXG4gICAgICAgICAgICB0eXBlb2YgZGVwZW5kZW5jeS5sb2NhbE1vZHVsZSA9PT0gJ29iamVjdCcgJiZcbiAgICAgICAgICAgIGRlcGVuZGVuY3kubG9jYWxNb2R1bGUgIT09IG51bGxcbiAgICAgICAgICApIHtcbiAgICAgICAgICAgIF9mcm96ZW4ubG9jYWxNb2R1bGUgPSB7XG4gICAgICAgICAgICAgIG5hbWU6IGRlcGVuZGVuY3kubG9jYWxNb2R1bGUubmFtZSxcbiAgICAgICAgICAgICAgaWR4OiBkZXBlbmRlbmN5LmxvY2FsTW9kdWxlLmlkeCxcbiAgICAgICAgICAgICAgdXNlZDogZGVwZW5kZW5jeS5sb2NhbE1vZHVsZS51c2VkLFxuICAgICAgICAgICAgfTtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIF9mcm96ZW47XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gZnJvemVuO1xuICAgICAgfSxcbiAgICApO1xuXG4gICAgcGx1Z2luQ29tcGF0LnRhcChcbiAgICAgIGNvbXBpbGVyLFxuICAgICAgJ19oYXJkU291cmNlQWZ0ZXJGcmVlemVEZXBlbmRlbmN5JyxcbiAgICAgICdUcmFuc2Zvcm1CYXNpY0RlcGVuZGVuY3lQbHVnaW4gYWZ0ZXIgZnJlZXplJyxcbiAgICAgIChmcm96ZW4sIGRlcGVuZGVuY3ksIGV4dHJhKSA9PiB7XG4gICAgICAgIGlmIChmcm96ZW4gJiYgZGVwZW5kZW5jeS5sb2MpIHtcbiAgICAgICAgICBmcm96ZW4ubG9jID0gZmxhdHRlblByb3RvdHlwZShkZXBlbmRlbmN5LmxvYyk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoZnJvemVuICYmIGRlcGVuZGVuY3kub3B0aW9uYWwpIHtcbiAgICAgICAgICBmcm96ZW4ub3B0aW9uYWwgPSBkZXBlbmRlbmN5Lm9wdGlvbmFsO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGZyb3plbiAmJiBkZXBlbmRlbmN5LmdldFdhcm5pbmdzKSB7XG4gICAgICAgICAgY29uc3Qgd2FybmluZ3MgPSBkZXBlbmRlbmN5LmdldFdhcm5pbmdzKCk7XG4gICAgICAgICAgaWYgKHdhcm5pbmdzICYmIHdhcm5pbmdzLmxlbmd0aCkge1xuICAgICAgICAgICAgZnJvemVuLndhcm5pbmdzID0gd2FybmluZ3MubWFwKFxuICAgICAgICAgICAgICAoeyBzdGFjayB9KSA9PlxuICAgICAgICAgICAgICAgIHN0YWNrLmluY2x1ZGVzKCdcXG4gICAgYXQgcGx1Z2luQ29tcGF0LnRhcCcpXG4gICAgICAgICAgICAgICAgICA/IHN0YWNrLnNwbGl0KCdcXG4gICAgYXQgcGx1Z2luQ29tcGF0LnRhcCcpWzBdXG4gICAgICAgICAgICAgICAgICA6IHN0YWNrLnNwbGl0KCdcXG4gICAgYXQgQ29tcGlsZXIucGx1Z2luQ29tcGF0LnRhcCcpWzBdLFxuICAgICAgICAgICAgKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gZnJvemVuO1xuICAgICAgfSxcbiAgICApO1xuXG4gICAgcGx1Z2luQ29tcGF0LnRhcChcbiAgICAgIGNvbXBpbGVyLFxuICAgICAgJ19oYXJkU291cmNlVGhhd0RlcGVuZGVuY3knLFxuICAgICAgJ1RyYW5zZm9ybUJhc2ljRGVwZW5kZW5jeVBsdWdpbicsXG4gICAgICAoZGVwZW5kZW5jeSwgZnJvemVuLCBleHRyYSkgPT4ge1xuICAgICAgICBleHRyYS5zY2hlbWFzID0gc2NoZW1hcztcbiAgICAgICAgY29uc3QgX3RoYXdlZCA9IHRoYXdEZXBlbmRlbmN5KGZyb3plbiwgZXh0cmEsIG1ldGhvZHMpO1xuICAgICAgICBpZiAoX3RoYXdlZCkge1xuICAgICAgICAgIGNvbnN0IHN0YXRlID0gZXh0cmEuc3RhdGU7XG4gICAgICAgICAgLy8gY29uc29sZS5sb2coJ1RoYXdlZCcsIGZyb3plbi50eXBlKTtcbiAgICAgICAgICBpZiAoZnJvemVuLnByZXBlbmQpIHtcbiAgICAgICAgICAgIF90aGF3ZWQucHJlcGVuZCA9IGZyb3plbi5wcmVwZW5kO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoZnJvemVuLnJlcGxhY2VzKSB7XG4gICAgICAgICAgICBfdGhhd2VkLnJlcGxhY2VzID0gZnJvemVuLnJlcGxhY2VkO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoZnJvemVuLmNyaXRpY2FsKSB7XG4gICAgICAgICAgICBfdGhhd2VkLmNyaXRpY2FsID0gZnJvemVuLmNyaXRpY2FsO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAodHlwZW9mIGZyb3plbi5uYW1lc3BhY2VPYmplY3RBc0NvbnRleHQgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICBfdGhhd2VkLm5hbWVzcGFjZU9iamVjdEFzQ29udGV4dCA9IGZyb3plbi5uYW1lc3BhY2VPYmplY3RBc0NvbnRleHQ7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmICh0eXBlb2YgZnJvemVuLmNhbGxBcmdzICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgX3RoYXdlZC5jYWxsQXJncyA9IGZyb3plbi5jYWxsQXJncztcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKHR5cGVvZiBmcm96ZW4uY2FsbCAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIF90aGF3ZWQuY2FsbCA9IGZyb3plbi5jYWxsO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAodHlwZW9mIGZyb3plbi5kaXJlY3RJbXBvcnQgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICBfdGhhd2VkLmRpcmVjdEltcG9ydCA9IGZyb3plbi5kaXJlY3RJbXBvcnQ7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmICh0eXBlb2YgZnJvemVuLnNob3J0aGFuZCAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIF90aGF3ZWQuc2hvcnRoYW5kID0gZnJvemVuLnNob3J0aGFuZDtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKFxuICAgICAgICAgICAgdHlwZW9mIGZyb3plbi5sb2NhbE1vZHVsZSA9PT0gJ29iamVjdCcgJiZcbiAgICAgICAgICAgIGZyb3plbi5sb2NhbE1vZHVsZSAhPT0gbnVsbFxuICAgICAgICAgICkge1xuICAgICAgICAgICAgaWYgKCFzdGF0ZS5sb2NhbE1vZHVsZXMpIHtcbiAgICAgICAgICAgICAgc3RhdGUubG9jYWxNb2R1bGVzID0gW107XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoIXN0YXRlLmxvY2FsTW9kdWxlc1tmcm96ZW4ubG9jYWxNb2R1bGUuaWR4XSkge1xuICAgICAgICAgICAgICBzdGF0ZS5sb2NhbE1vZHVsZXNbZnJvemVuLmxvY2FsTW9kdWxlLmlkeF0gPSBuZXcgTG9jYWxNb2R1bGUoXG4gICAgICAgICAgICAgICAgZXh0cmEubW9kdWxlLFxuICAgICAgICAgICAgICAgIGZyb3plbi5sb2NhbE1vZHVsZS5uYW1lLFxuICAgICAgICAgICAgICAgIGZyb3plbi5sb2NhbE1vZHVsZS5pZHgsXG4gICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgIHN0YXRlLmxvY2FsTW9kdWxlc1tmcm96ZW4ubG9jYWxNb2R1bGUuaWR4XS51c2VkID1cbiAgICAgICAgICAgICAgICBmcm96ZW4ubG9jYWxNb2R1bGUudXNlZDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF90aGF3ZWQubG9jYWxNb2R1bGUgPSBzdGF0ZS5sb2NhbE1vZHVsZXNbZnJvemVuLmxvY2FsTW9kdWxlLmlkeF07XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChmcm96ZW4udHlwZSA9PT0gJ0hhcm1vbnlJbXBvcnREZXBlbmRlbmN5Jykge1xuICAgICAgICAgICAgY29uc3QgcmVmID0gZnJvemVuLnJhbmdlLnRvU3RyaW5nKCk7XG4gICAgICAgICAgICBpZiAoc3RhdGUuaW1wb3J0c1tyZWZdKSB7XG4gICAgICAgICAgICAgIHJldHVybiBzdGF0ZS5pbXBvcnRzW3JlZl07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBzdGF0ZS5pbXBvcnRzW3JlZl0gPSBfdGhhd2VkO1xuICAgICAgICAgIH0gZWxzZSBpZiAoXG4gICAgICAgICAgICBmcm96ZW4udHlwZSA9PT0gJ0hhcm1vbnlFeHBvcnRJbXBvcnRlZFNwZWNpZmllckRlcGVuZGVuY3knXG4gICAgICAgICAgKSB7XG4gICAgICAgICAgICBpZiAoX3RoYXdlZC5vdGhlclN0YXJFeHBvcnRzKSB7XG4gICAgICAgICAgICAgIGV4dHJhLnN0YXRlLm90aGVyU3RhckV4cG9ydHMgPSAoXG4gICAgICAgICAgICAgICAgZXh0cmEuc3RhdGUub3RoZXJTdGFyRXhwb3J0cyB8fCBbXVxuICAgICAgICAgICAgICApLmNvbmNhdChfdGhhd2VkKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIF90aGF3ZWQ7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gZGVwZW5kZW5jeTtcbiAgICAgIH0sXG4gICAgKTtcblxuICAgIHBsdWdpbkNvbXBhdC50YXAoXG4gICAgICBjb21waWxlcixcbiAgICAgICdfaGFyZFNvdXJjZUFmdGVyVGhhd0RlcGVuZGVuY3knLFxuICAgICAgJ1RyYW5zZm9ybUJhc2ljRGVwZW5kZW5jeVBsdWdpbicsXG4gICAgICAoZGVwZW5kZW5jeSwgeyBsb2MsIG9wdGlvbmFsLCB3YXJuaW5ncyB9LCBleHRyYSkgPT4ge1xuICAgICAgICBpZiAoZGVwZW5kZW5jeSAmJiBsb2MpIHtcbiAgICAgICAgICBkZXBlbmRlbmN5LmxvYyA9IGxvYztcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChkZXBlbmRlbmN5ICYmIG9wdGlvbmFsKSB7XG4gICAgICAgICAgZGVwZW5kZW5jeS5vcHRpb25hbCA9IHRydWU7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoZGVwZW5kZW5jeSAmJiB3YXJuaW5ncyAmJiBkZXBlbmRlbmN5LmdldFdhcm5pbmdzKSB7XG4gICAgICAgICAgY29uc3QgZnJvemVuV2FybmluZ3MgPSB3YXJuaW5ncztcbiAgICAgICAgICBjb25zdCBfZ2V0V2FybmluZ3MgPSBkZXBlbmRlbmN5LmdldFdhcm5pbmdzO1xuICAgICAgICAgIGRlcGVuZGVuY3kuZ2V0V2FybmluZ3MgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGNvbnN0IHdhcm5pbmdzID0gX2dldFdhcm5pbmdzLmNhbGwodGhpcyk7XG4gICAgICAgICAgICBpZiAod2FybmluZ3MgJiYgd2FybmluZ3MubGVuZ3RoKSB7XG4gICAgICAgICAgICAgIHJldHVybiB3YXJuaW5ncy5tYXAoKHdhcm5pbmcsIGkpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBzdGFjayA9IHdhcm5pbmcuc3RhY2suc3BsaXQoXG4gICAgICAgICAgICAgICAgICAnXFxuICAgIGF0IENvbXBpbGF0aW9uLnJlcG9ydERlcGVuZGVuY3lFcnJvcnNBbmRXYXJuaW5ncycsXG4gICAgICAgICAgICAgICAgKVsxXTtcbiAgICAgICAgICAgICAgICB3YXJuaW5nLnN0YWNrID0gYCR7XG4gICAgICAgICAgICAgICAgICBmcm96ZW5XYXJuaW5nc1tpXVxuICAgICAgICAgICAgICAgIH1cXG4gICAgYXQgQ29tcGlsYXRpb24ucmVwb3J0RGVwZW5kZW5jeUVycm9yc0FuZFdhcm5pbmdzJHtzdGFja31gO1xuICAgICAgICAgICAgICAgIHJldHVybiB3YXJuaW5nO1xuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB3YXJuaW5ncztcbiAgICAgICAgICB9O1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGRlcGVuZGVuY3k7XG4gICAgICB9LFxuICAgICk7XG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBUcmFuc2Zvcm1CYXNpY0RlcGVuZGVuY3lQbHVnaW5MZWdhY3k7XG4iXSwic291cmNlUm9vdCI6Ii9Vc2Vycy90eWxlcmFyYnVzL2Rldi9wcm92aWRlci9zcmMifQ==

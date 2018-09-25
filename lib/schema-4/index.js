'use strict';

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
  }
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
  }
};

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
    }
  }
});

const localModuleAssigned = {
  freeze(_, dependency) {
    if (typeof dependency.localModule === 'object' && dependency.localModule !== null) {
      return {
        name: dependency.localModule.name,
        idx: dependency.localModule.idx,
        used: dependency.localModule.used
      };
    }
  },
  thaw(thawed, localModule, extra) {
    const state = extra.state;
    if (typeof localModule === 'object' && localModule !== null) {
      if (!state.localModules) {
        state.localModules = [];
      }
      if (!state.localModules[localModule.idx]) {
        state.localModules[localModule.idx] = new LocalModule(extra.module, localModule.name, localModule.idx);
        state.localModules[localModule.idx].used = localModule.used;
      }
      thawed.localModule = state.localModules[localModule.idx];
    }
    return thawed;
  }
};

const warnings = {
  freeze(frozen, dependency) {
    if (frozen && dependency.getWarnings) {
      const warnings = dependency.getWarnings();
      if (warnings && warnings.length) {
        return warnings.map(({ stack }) => stack.includes('\n    at Object.freeze') ? stack.split('\n    at Object.freeze')[0] : stack.includes('\n    at pluginCompat.tap') ? stack.split('\n    at pluginCompat.tap')[0] : stack.split('\n    at Compiler.pluginCompat.tap')[0]);
      }
    }
  },
  thaw(dependency, warnings) {
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
  }
};
const AMDDefineDependency = require('webpack/lib/dependencies/AMDDefineDependency');
const AMDDefineDependencySerial = serial.serial('AMDDefineDependency', {
  constructor: {
    freeze(_, dependency, extra, methods) {
      return {
        range: dependency.range,
        arrayRange: dependency.arrayRange,
        functionRange: dependency.functionRange,
        objectRange: dependency.objectRange,
        namedModule: dependency.namedModule
      };
    },
    thaw(thawed, frozen, extra, methods) {
      return new AMDDefineDependency(frozen.range, frozen.arrayRange, frozen.functionRange, frozen.objectRange, frozen.namedModule);
    }
  },

  optional,

  localModuleAssigned,

  warnings
});

const AMDRequireArrayDependency = require('webpack/lib/dependencies/AMDRequireArrayDependency');
const AMDRequireArrayDependencySerial = serial.serial('AMDRequireArrayDependency', {
  constructor: {
    freeze(_, dependency, extra, methods) {
      return {
        depsArray: methods.mapFreeze('Dependency', null, dependency.depsArray, extra),
        range: dependency.range
      };
    },
    thaw(thawed, frozen, extra, methods) {
      return new AMDRequireArrayDependency(methods.mapThaw('Dependency', null, frozen.depsArray, extra), frozen.range);
    }
  },

  optional,

  warnings
});

const AMDRequireContextDependency = require('webpack/lib/dependencies/AMDRequireContextDependency');
const AMDRequireContextDependencySerial = serial.serial('AMDRequireContextDependency', {
  constructor: {
    freeze(_, dependency, extra, methods) {
      return {
        options: dependency.options.regExp ? Object.assign({}, dependency.options, {
          regExp: dependency.options.regExp.source
        }) : dependency.options,
        range: dependency.range,
        valueRange: dependency.valueRange
      };
    },
    thaw(thawed, frozen, extra, methods) {
      return new AMDRequireContextDependency(frozen.options.regExp ? Object.assign({}, frozen.options, {
        regExp: new RegExp(frozen.options.regExp)
      }) : frozen.options, frozen.range, frozen.valueRange);
    }
  },

  optional,

  warnings
});

const AMDRequireDependency = require('webpack/lib/dependencies/AMDRequireDependency');
const AMDRequireDependencySerial = serial.serial('AMDRequireDependency', {
  constructor: {
    freeze(_, dependency, extra, methods) {
      return {
        block: !dependency.block.dependencies.includes(dependency) ? methods.freeze('DependencyBlock', null, dependency.block, extra) : undefined
      };
    },
    thaw(thawed, frozen, extra, methods) {
      return new AMDRequireDependency(!frozen.block ? extra.parent : methods.thaw('DependencyBlock', null, frozen.block, extra));
    }
  },

  optional,

  warnings
});

const AMDRequireItemDependency = require('webpack/lib/dependencies/AMDRequireItemDependency');
const AMDRequireItemDependencySerial = serial.serial('AMDRequireItemDependency', {
  constructor: {
    freeze(_, dependency, extra, methods) {
      return {
        request: relateContext.relateAbsoluteRequest(extra.module.context, dependency.request),
        range: dependency.range
      };
    },
    thaw(thawed, frozen, extra, methods) {
      return new AMDRequireItemDependency(frozen.request, frozen.range);
    }
  },

  optional,

  warnings
});

const CommonJsRequireContextDependency = require('webpack/lib/dependencies/CommonJsRequireContextDependency');
const CommonJsRequireContextDependencySerial = serial.serial('CommonJsRequireContextDependency', {
  constructor: {
    freeze(_, dependency, extra, methods) {
      return {
        options: dependency.options.regExp ? Object.assign({}, dependency.options, {
          regExp: dependency.options.regExp.source
        }) : dependency.options,
        range: dependency.range,
        valueRange: dependency.valueRange
      };
    },
    thaw(thawed, frozen, extra, methods) {
      return new CommonJsRequireContextDependency(frozen.options.regExp ? Object.assign({}, frozen.options, {
        regExp: new RegExp(frozen.options.regExp)
      }) : frozen.options, frozen.range, frozen.valueRange);
    }
  },

  optional,

  warnings
});

const CommonJsRequireDependency = require('webpack/lib/dependencies/CommonJsRequireDependency');
const CommonJsRequireDependencySerial = serial.serial('CommonJsRequireDependency', {
  constructor: {
    freeze(_, dependency, extra, methods) {
      return {
        request: relateContext.relateAbsoluteRequest(extra.module.context, dependency.request),
        range: dependency.range
      };
    },
    thaw(thawed, frozen, extra, methods) {
      return new CommonJsRequireDependency(frozen.request, frozen.range);
    }
  },

  optional,

  warnings
});

const ConstDependency = require('webpack/lib/dependencies/ConstDependency');
const ConstDependencySerial = serial.serial('ConstDependency', {
  constructor: {
    freeze(_, dependency, extra, methods) {
      return {
        expression: dependency.expression,
        range: dependency.range,
        requireWebpackRequire: dependency.requireWebpackRequire
      };
    },
    thaw(thawed, frozen, extra, methods) {
      return new ConstDependency(frozen.expression, frozen.range, frozen.requireWebpackRequire);
    }
  },

  optional,

  warnings
});

const ContextDependency = require('webpack/lib/dependencies/ContextDependency');
const ContextDependencySerial = serial.serial('ContextDependency', {
  constructor: {
    freeze(_, dependency, extra, methods) {
      return {
        options: dependency.options.regExp ? Object.assign({}, dependency.options, {
          regExp: dependency.options.regExp.source
        }) : dependency.options
      };
    },
    thaw(thawed, frozen, extra, methods) {
      return new ContextDependency(frozen.options.regExp ? Object.assign({}, frozen.options, {
        regExp: new RegExp(frozen.options.regExp)
      }) : frozen.options);
    }
  },

  optional,

  warnings
});

const ContextElementDependency = require('webpack/lib/dependencies/ContextElementDependency');
const ContextElementDependencySerial = serial.serial('ContextElementDependency', {
  constructor: {
    freeze(_, dependency, extra, methods) {
      return {
        request: relateContext.relateAbsoluteRequest(extra.module.context, dependency.request),
        userRequest: relateContext.relateAbsoluteRequest(extra.module.context, dependency.userRequest)
      };
    },
    thaw(thawed, frozen, extra, methods) {
      return new ContextElementDependency(frozen.request, frozen.userRequest);
    }
  },

  optional,

  warnings
});

const CriticalDependencyWarning = require('webpack/lib/dependencies/CriticalDependencyWarning');
const CriticalDependencyWarningSerial = serial.serial('CriticalDependencyWarning', {
  constructor: {
    freeze(_, dependency, extra, methods) {
      return {
        message: dependency.message
      };
    },
    thaw(thawed, frozen, extra, methods) {
      return new CriticalDependencyWarning(frozen.message);
    }
  },

  optional,

  warnings
});

const DelegatedExportsDependency = require('webpack/lib/dependencies/DelegatedExportsDependency');
const DelegatedExportsDependencySerial = serial.serial('DelegatedExportsDependency', {
  constructor: {
    freeze(_, dependency, extra, methods) {
      return {
        originModule: null,
        exports: dependency.exports
      };
    },
    thaw(thawed, frozen, extra, methods) {
      return new DelegatedExportsDependency(extra.module, frozen.exports);
    }
  },

  optional,

  warnings
});

const DelegatedSourceDependency = require('webpack/lib/dependencies/DelegatedSourceDependency');
const DelegatedSourceDependencySerial = serial.serial('DelegatedSourceDependency', {
  constructor: {
    freeze(_, dependency, extra, methods) {
      return {
        request: relateContext.relateAbsoluteRequest(extra.module.context, dependency.request)
      };
    },
    thaw(thawed, frozen, extra, methods) {
      return new DelegatedSourceDependency(frozen.request);
    }
  },

  optional,

  warnings
});

const DllEntryDependency = require('webpack/lib/dependencies/DllEntryDependency');
const DllEntryDependencySerial = serial.serial('DllEntryDependency', {
  constructor: {
    freeze(_, dependency, extra, methods) {
      return {
        dependencies: methods.mapFreeze('Dependency', null, dependency.dependencies, extra),
        name: dependency.name
      };
    },
    thaw(thawed, frozen, extra, methods) {
      return new DllEntryDependency(methods.mapThaw('Dependency', null, frozen.dependencies, extra), frozen.name);
    }
  },

  optional,

  warnings
});

const HarmonyAcceptDependency = require('webpack/lib/dependencies/HarmonyAcceptDependency');
const HarmonyAcceptDependencySerial = serial.serial('HarmonyAcceptDependency', {
  constructor: {
    freeze(_, dependency, extra, methods) {
      return {
        range: dependency.range,
        dependencies: methods.mapFreeze('Dependency', null, dependency.dependencies, extra),
        hasCallback: dependency.hasCallback
      };
    },
    thaw(thawed, frozen, extra, methods) {
      return new HarmonyAcceptDependency(frozen.range, methods.mapThaw('Dependency', null, frozen.dependencies, extra), frozen.hasCallback);
    }
  },

  optional,

  warnings
});

const HarmonyAcceptImportDependency = require('webpack/lib/dependencies/HarmonyAcceptImportDependency');
const HarmonyAcceptImportDependencySerial = serial.serial('HarmonyAcceptImportDependency', {
  constructor: {
    freeze(_, dependency, extra, methods) {
      return {
        request: relateContext.relateAbsoluteRequest(extra.module.context, dependency.request),
        originModule: null,
        parserScope: null
      };
    },
    thaw(thawed, frozen, extra, methods) {
      extra.state.harmonyParserScope = extra.state.harmonyParserScope || {};
      return new HarmonyAcceptImportDependency(frozen.request, extra.module, extra.state.harmonyParserScope);
    }
  },

  optional,

  warnings
});

const HarmonyCompatibilityDependency = require('webpack/lib/dependencies/HarmonyCompatibilityDependency');
const HarmonyCompatibilityDependencySerial = serial.serial('HarmonyCompatibilityDependency', {
  constructor: {
    freeze(_, dependency, extra, methods) {
      return {
        originModule: null
      };
    },
    thaw(thawed, frozen, extra, methods) {
      return new HarmonyCompatibilityDependency(extra.module);
    }
  },

  optional,

  warnings
});

const HarmonyExportExpressionDependency = require('webpack/lib/dependencies/HarmonyExportExpressionDependency');
const HarmonyExportExpressionDependencySerial = serial.serial('HarmonyExportExpressionDependency', {
  constructor: {
    freeze(_, dependency, extra, methods) {
      return {
        originModule: null,
        range: dependency.range,
        rangeStatement: dependency.rangeStatement
      };
    },
    thaw(thawed, frozen, extra, methods) {
      return new HarmonyExportExpressionDependency(extra.module, frozen.range, frozen.rangeStatement);
    }
  },

  optional,

  warnings
});

const HarmonyExportHeaderDependency = require('webpack/lib/dependencies/HarmonyExportHeaderDependency');
const HarmonyExportHeaderDependencySerial = serial.serial('HarmonyExportHeaderDependency', {
  constructor: {
    freeze(_, dependency, extra, methods) {
      return {
        range: dependency.range,
        rangeStatement: dependency.rangeStatement
      };
    },
    thaw(thawed, frozen, extra, methods) {
      return new HarmonyExportHeaderDependency(frozen.range, frozen.rangeStatement);
    }
  },

  optional,

  warnings
});

const HarmonyExportImportedSpecifierDependency = require('webpack/lib/dependencies/HarmonyExportImportedSpecifierDependency');
const HarmonyExportImportedSpecifierDependencySerial = serial.serial('HarmonyExportImportedSpecifierDependency', {
  constructor: {
    freeze(_, dependency, extra, methods) {
      return {
        request: relateContext.relateAbsoluteRequest(extra.module.context, dependency.request),
        originModule: null,
        sourceOrder: dependency.sourceOrder,
        parserScope: null,
        id: dependency.id,
        name: dependency.name,
        activeExports: null,
        otherStarExports: dependency.otherStarExports ? 'star' : null,
        strictExportPresence: dependency.strictExportPresence
      };
    },
    thaw(thawed, frozen, extra, methods) {
      extra.state.harmonyParserScope = extra.state.harmonyParserScope || {};
      extra.state.activeExports = extra.state.activeExports || new Set();
      if (frozen.name) {
        extra.state.activeExports.add(frozen.name);
      }
      return new HarmonyExportImportedSpecifierDependency(frozen.request, extra.module, frozen.sourceOrder, extra.state.harmonyParserScope, frozen.id, frozen.name, extra.state.activeExports, frozen.otherStarExports === 'star' ? extra.state.otherStarExports || [] : null, frozen.strictExportPresence);
    }
  },

  optional,

  warnings,

  exportImportedDependency: {
    freeze(frozen) {},
    thaw(thawed, frozen, extra) {
      if (thawed.otherStarExports) {
        extra.state.otherStarExports = (extra.state.otherStarExports || []).concat(thawed);
      }
      return thawed;
    }
  }
});

const HarmonyExportSpecifierDependency = require('webpack/lib/dependencies/HarmonyExportSpecifierDependency');
const HarmonyExportSpecifierDependencySerial = serial.serial('HarmonyExportSpecifierDependency', {
  constructor: {
    freeze(_, dependency, extra, methods) {
      return {
        originModule: null,
        id: dependency.id,
        name: dependency.name
      };
    },
    thaw(thawed, frozen, extra, methods) {
      return new HarmonyExportSpecifierDependency(extra.module, frozen.id, frozen.name);
    }
  },

  optional,

  warnings
});

const HarmonyImportDependency = require('webpack/lib/dependencies/HarmonyImportDependency');
const HarmonyImportDependencySerial = serial.serial('HarmonyImportDependency', {
  constructor: {
    freeze(_, dependency, extra, methods) {
      return {
        request: relateContext.relateAbsoluteRequest(extra.module.context, dependency.request),
        originModule: null,
        sourceOrder: dependency.sourceOrder,
        parserScope: null
      };
    },
    thaw(thawed, frozen, extra, methods) {
      extra.state.harmonyParserScope = extra.state.harmonyParserScope || {};
      return new HarmonyImportDependency(frozen.request, extra.module, frozen.sourceOrder, extra.state.harmonyParserScope);
    }
  },

  optional,

  warnings,

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
    }
  }
});

const HarmonyImportSideEffectDependency = require('webpack/lib/dependencies/HarmonyImportSideEffectDependency');
const HarmonyImportSideEffectDependencySerial = serial.serial('HarmonyImportSideEffectDependency', {
  constructor: {
    freeze(_, dependency, extra, methods) {
      return {
        request: relateContext.relateAbsoluteRequest(extra.module.context, dependency.request),
        originModule: null,
        sourceOrder: dependency.sourceOrder,
        parserScope: null
      };
    },
    thaw(thawed, frozen, extra, methods) {
      extra.state.harmonyParserScope = extra.state.harmonyParserScope || {};
      return new HarmonyImportSideEffectDependency(frozen.request, extra.module, frozen.sourceOrder, extra.state.harmonyParserScope);
    }
  },

  optional,

  warnings
});

const HarmonyImportSpecifierDependency = require('webpack/lib/dependencies/HarmonyImportSpecifierDependency');
const HarmonyImportSpecifierDependencySerial = serial.serial('HarmonyImportSpecifierDependency', {
  constructor: {
    freeze(_, dependency, extra, methods) {
      return {
        request: relateContext.relateAbsoluteRequest(extra.module.context, dependency.request),
        originModule: null,
        sourceOrder: dependency.sourceOrder,
        parserScope: null,
        id: dependency.id,
        name: dependency.name,
        range: dependency.range,
        strictExportPresence: dependency.strictExportPresence
      };
    },
    thaw(thawed, frozen, extra, methods) {
      extra.state.harmonyParserScope = extra.state.harmonyParserScope || {};
      return new HarmonyImportSpecifierDependency(frozen.request, extra.module, frozen.sourceOrder, extra.state.harmonyParserScope, frozen.id, frozen.name, frozen.range, frozen.strictExportPresence);
    }
  },

  optional,

  warnings
});

const HarmonyInitDependency = require('webpack/lib/dependencies/HarmonyInitDependency');
const HarmonyInitDependencySerial = serial.serial('HarmonyInitDependency', {
  constructor: {
    freeze(_, dependency, extra, methods) {
      return {
        originModule: null
      };
    },
    thaw(thawed, frozen, extra, methods) {
      return new HarmonyInitDependency(extra.module);
    }
  },

  optional,

  warnings
});

const ImportContextDependency = require('webpack/lib/dependencies/ImportContextDependency');
const ImportContextDependencySerial = serial.serial('ImportContextDependency', {
  constructor: {
    freeze(_, dependency, extra, methods) {
      return {
        options: dependency.options.regExp ? Object.assign({}, dependency.options, {
          regExp: dependency.options.regExp.source
        }) : dependency.options,
        range: dependency.range,
        valueRange: dependency.valueRange
      };
    },
    thaw(thawed, frozen, extra, methods) {
      return new ImportContextDependency(frozen.options.regExp ? Object.assign({}, frozen.options, {
        regExp: new RegExp(frozen.options.regExp)
      }) : frozen.options, frozen.range, frozen.valueRange);
    }
  },

  optional,

  warnings
});

const ImportDependency = require('webpack/lib/dependencies/ImportDependency');
const ImportDependencySerial = serial.serial('ImportDependency', {
  constructor: {
    freeze(_, dependency, extra, methods) {
      return {
        request: relateContext.relateAbsoluteRequest(extra.module.context, dependency.request),
        originModule: null,
        block: !dependency.block.dependencies.includes(dependency) ? methods.freeze('DependencyBlock', null, dependency.block, extra) : undefined
      };
    },
    thaw(thawed, frozen, extra, methods) {
      return new ImportDependency(frozen.request, extra.module, !frozen.block ? extra.parent : methods.thaw('DependencyBlock', null, frozen.block, extra));
    }
  },

  optional,

  warnings
});

const ImportEagerDependency = require('webpack/lib/dependencies/ImportEagerDependency');
const ImportEagerDependencySerial = serial.serial('ImportEagerDependency', {
  constructor: {
    freeze(_, dependency, extra, methods) {
      return {
        request: relateContext.relateAbsoluteRequest(extra.module.context, dependency.request),
        originModule: null,
        range: dependency.range
      };
    },
    thaw(thawed, frozen, extra, methods) {
      return new ImportEagerDependency(frozen.request, extra.module, frozen.range);
    }
  },

  optional,

  warnings
});

const ImportWeakDependency = require('webpack/lib/dependencies/ImportWeakDependency');
const ImportWeakDependencySerial = serial.serial('ImportWeakDependency', {
  constructor: {
    freeze(_, dependency, extra, methods) {
      return {
        request: relateContext.relateAbsoluteRequest(extra.module.context, dependency.request),
        originModule: null,
        range: dependency.range
      };
    },
    thaw(thawed, frozen, extra, methods) {
      return new ImportWeakDependency(frozen.request, extra.module, frozen.range);
    }
  },

  optional,

  warnings
});

const JsonExportsDependency = require('webpack/lib/dependencies/JsonExportsDependency');
const JsonExportsDependencySerial = serial.serial('JsonExportsDependency', {
  constructor: {
    freeze(_, dependency, extra, methods) {
      return {
        exports: dependency.exports
      };
    },
    thaw(thawed, frozen, extra, methods) {
      return new JsonExportsDependency(frozen.exports);
    }
  },

  optional,

  warnings
});

const LoaderDependency = require('webpack/lib/dependencies/LoaderDependency');
const LoaderDependencySerial = serial.serial('LoaderDependency', {
  constructor: {
    freeze(_, dependency, extra, methods) {
      return {
        request: relateContext.relateAbsoluteRequest(extra.module.context, dependency.request)
      };
    },
    thaw(thawed, frozen, extra, methods) {
      return new LoaderDependency(frozen.request);
    }
  },

  optional,

  warnings
});

const LocalModuleDependency = require('webpack/lib/dependencies/LocalModuleDependency');
const LocalModuleDependencySerial = serial.serial('LocalModuleDependency', {
  constructor: {
    freeze(_, dependency, extra, methods) {
      return {
        localModule: {
          name: dependency.localModule.name,
          name: dependency.localModule.idx
        },
        range: dependency.range,
        callNew: dependency.callNew
      };
    },
    thaw(thawed, frozen, extra, methods) {
      if (!extra.state.localModules) {
        extra.state.localModules = [];
      }
      if (!extra.state.localModules[frozen.localModule.idx]) {
        extra.state.localModules[frozen.localModule.idx] = new LocalModule(extra.module, frozen.localModule.name, frozen.localModule.idx);
        extra.state.localModules[frozen.localModule.idx].used = frozen.localModule.used;
      }
      return new LocalModuleDependency(extra.state.localModules[frozen.localModule.idx], frozen.range, frozen.callNew);
    }
  },

  optional,

  localModuleAssigned,

  warnings
});

const ModuleDependency = require('webpack/lib/dependencies/ModuleDependency');
const ModuleDependencySerial = serial.serial('ModuleDependency', {
  constructor: {
    freeze(_, dependency, extra, methods) {
      return {
        request: relateContext.relateAbsoluteRequest(extra.module.context, dependency.request)
      };
    },
    thaw(thawed, frozen, extra, methods) {
      return new ModuleDependency(frozen.request);
    }
  },

  optional,

  warnings
});

const ModuleHotAcceptDependency = require('webpack/lib/dependencies/ModuleHotAcceptDependency');
const ModuleHotAcceptDependencySerial = serial.serial('ModuleHotAcceptDependency', {
  constructor: {
    freeze(_, dependency, extra, methods) {
      return {
        request: relateContext.relateAbsoluteRequest(extra.module.context, dependency.request),
        range: dependency.range
      };
    },
    thaw(thawed, frozen, extra, methods) {
      return new ModuleHotAcceptDependency(frozen.request, frozen.range);
    }
  },

  optional,

  warnings
});

const ModuleHotDeclineDependency = require('webpack/lib/dependencies/ModuleHotDeclineDependency');
const ModuleHotDeclineDependencySerial = serial.serial('ModuleHotDeclineDependency', {
  constructor: {
    freeze(_, dependency, extra, methods) {
      return {
        request: relateContext.relateAbsoluteRequest(extra.module.context, dependency.request),
        range: dependency.range
      };
    },
    thaw(thawed, frozen, extra, methods) {
      return new ModuleHotDeclineDependency(frozen.request, frozen.range);
    }
  },

  optional,

  warnings
});

const MultiEntryDependency = require('webpack/lib/dependencies/MultiEntryDependency');
const MultiEntryDependencySerial = serial.serial('MultiEntryDependency', {
  constructor: {
    freeze(_, dependency, extra, methods) {
      return {
        dependencies: methods.mapFreeze('Dependency', null, dependency.dependencies, extra),
        name: dependency.name
      };
    },
    thaw(thawed, frozen, extra, methods) {
      return new MultiEntryDependency(methods.mapThaw('Dependency', null, frozen.dependencies, extra), frozen.name);
    }
  },

  optional,

  warnings
});

const NullDependency = require('webpack/lib/dependencies/NullDependency');
const NullDependencySerial = serial.serial('NullDependency', {
  constructor: {
    freeze(_, dependency, extra, methods) {
      return {};
    },
    thaw(thawed, frozen, extra, methods) {
      return new NullDependency();
    }
  },

  optional,

  warnings
});

const PrefetchDependency = require('webpack/lib/dependencies/PrefetchDependency');
const PrefetchDependencySerial = serial.serial('PrefetchDependency', {
  constructor: {
    freeze(_, dependency, extra, methods) {
      return {
        request: relateContext.relateAbsoluteRequest(extra.module.context, dependency.request)
      };
    },
    thaw(thawed, frozen, extra, methods) {
      return new PrefetchDependency(frozen.request);
    }
  },

  optional,

  warnings
});

const RequireContextDependency = require('webpack/lib/dependencies/RequireContextDependency');
const RequireContextDependencySerial = serial.serial('RequireContextDependency', {
  constructor: {
    freeze(_, dependency, extra, methods) {
      return {
        options: dependency.options.regExp ? Object.assign({}, dependency.options, {
          regExp: dependency.options.regExp.source
        }) : dependency.options,
        range: dependency.range
      };
    },
    thaw(thawed, frozen, extra, methods) {
      return new RequireContextDependency(frozen.options.regExp ? Object.assign({}, frozen.options, {
        regExp: new RegExp(frozen.options.regExp)
      }) : frozen.options, frozen.range);
    }
  },

  optional,

  warnings
});

const RequireEnsureDependency = require('webpack/lib/dependencies/RequireEnsureDependency');
const RequireEnsureDependencySerial = serial.serial('RequireEnsureDependency', {
  constructor: {
    freeze(_, dependency, extra, methods) {
      return {
        block: !dependency.block.dependencies.includes(dependency) ? methods.freeze('DependencyBlock', null, dependency.block, extra) : undefined
      };
    },
    thaw(thawed, frozen, extra, methods) {
      return new RequireEnsureDependency(!frozen.block ? extra.parent : methods.thaw('DependencyBlock', null, frozen.block, extra));
    }
  },

  optional,

  warnings
});

const RequireEnsureItemDependency = require('webpack/lib/dependencies/RequireEnsureItemDependency');
const RequireEnsureItemDependencySerial = serial.serial('RequireEnsureItemDependency', {
  constructor: {
    freeze(_, dependency, extra, methods) {
      return {
        request: relateContext.relateAbsoluteRequest(extra.module.context, dependency.request)
      };
    },
    thaw(thawed, frozen, extra, methods) {
      return new RequireEnsureItemDependency(frozen.request);
    }
  },

  optional,

  warnings
});

const RequireHeaderDependency = require('webpack/lib/dependencies/RequireHeaderDependency');
const RequireHeaderDependencySerial = serial.serial('RequireHeaderDependency', {
  constructor: {
    freeze(_, dependency, extra, methods) {
      return {
        range: dependency.range
      };
    },
    thaw(thawed, frozen, extra, methods) {
      return new RequireHeaderDependency(frozen.range);
    }
  },

  optional,

  warnings
});

const RequireIncludeDependency = require('webpack/lib/dependencies/RequireIncludeDependency');
const RequireIncludeDependencySerial = serial.serial('RequireIncludeDependency', {
  constructor: {
    freeze(_, dependency, extra, methods) {
      return {
        request: relateContext.relateAbsoluteRequest(extra.module.context, dependency.request),
        range: dependency.range
      };
    },
    thaw(thawed, frozen, extra, methods) {
      return new RequireIncludeDependency(frozen.request, frozen.range);
    }
  },

  optional,

  warnings
});

const RequireResolveContextDependency = require('webpack/lib/dependencies/RequireResolveContextDependency');
const RequireResolveContextDependencySerial = serial.serial('RequireResolveContextDependency', {
  constructor: {
    freeze(_, dependency, extra, methods) {
      return {
        options: dependency.options.regExp ? Object.assign({}, dependency.options, {
          regExp: dependency.options.regExp.source
        }) : dependency.options,
        range: dependency.range,
        valueRange: dependency.valueRange
      };
    },
    thaw(thawed, frozen, extra, methods) {
      return new RequireResolveContextDependency(frozen.options.regExp ? Object.assign({}, frozen.options, {
        regExp: new RegExp(frozen.options.regExp)
      }) : frozen.options, frozen.range, frozen.valueRange);
    }
  },

  optional,

  warnings
});

const RequireResolveDependency = require('webpack/lib/dependencies/RequireResolveDependency');
const RequireResolveDependencySerial = serial.serial('RequireResolveDependency', {
  constructor: {
    freeze(_, dependency, extra, methods) {
      return {
        request: relateContext.relateAbsoluteRequest(extra.module.context, dependency.request),
        range: dependency.range
      };
    },
    thaw(thawed, frozen, extra, methods) {
      return new RequireResolveDependency(frozen.request, frozen.range);
    }
  },

  optional,

  warnings
});

const RequireResolveHeaderDependency = require('webpack/lib/dependencies/RequireResolveHeaderDependency');
const RequireResolveHeaderDependencySerial = serial.serial('RequireResolveHeaderDependency', {
  constructor: {
    freeze(_, dependency, extra, methods) {
      return {
        range: dependency.range
      };
    },
    thaw(thawed, frozen, extra, methods) {
      return new RequireResolveHeaderDependency(frozen.range);
    }
  },

  optional,

  warnings
});

const SingleEntryDependency = require('webpack/lib/dependencies/SingleEntryDependency');
const SingleEntryDependencySerial = serial.serial('SingleEntryDependency', {
  constructor: {
    freeze(_, dependency, extra, methods) {
      return {
        request: relateContext.relateAbsoluteRequest(extra.module.context, dependency.request)
      };
    },
    thaw(thawed, frozen, extra, methods) {
      return new SingleEntryDependency(frozen.request);
    }
  },

  optional,

  warnings
});

const UnsupportedDependency = require('webpack/lib/dependencies/UnsupportedDependency');
const UnsupportedDependencySerial = serial.serial('UnsupportedDependency', {
  constructor: {
    freeze(_, dependency, extra, methods) {
      return {
        request: relateContext.relateAbsoluteRequest(extra.module.context, dependency.request),
        range: dependency.range
      };
    },
    thaw(thawed, frozen, extra, methods) {
      return new UnsupportedDependency(frozen.request, frozen.range);
    }
  },

  optional,

  warnings
});

const WebAssemblyImportDependency = require('webpack/lib/dependencies/WebAssemblyImportDependency');
const WebAssemblyImportDependencySerial = serial.serial('WebAssemblyImportDependency', {
  constructor: {
    freeze(_, dependency, extra, methods) {
      return {
        request: relateContext.relateAbsoluteRequest(extra.module.context, dependency.request),
        name: dependency.name,
        description: dependency.description,
        onlyDirectImport: dependency.onlyDirectImport
      };
    },
    thaw(thawed, frozen, extra, methods) {
      return new WebAssemblyImportDependency(frozen.request, frozen.name, frozen.description, frozen.onlyDirectImport);
    }
  },

  optional,

  warnings
});

exports.map = new Map();
exports.AMDDefineDependency = AMDDefineDependencySerial;
exports.map.set(AMDDefineDependency, AMDDefineDependencySerial);
exports.AMDRequireArrayDependency = AMDRequireArrayDependencySerial;
exports.map.set(AMDRequireArrayDependency, AMDRequireArrayDependencySerial);
exports.AMDRequireContextDependency = AMDRequireContextDependencySerial;
exports.map.set(AMDRequireContextDependency, AMDRequireContextDependencySerial);
exports.AMDRequireDependency = AMDRequireDependencySerial;
exports.map.set(AMDRequireDependency, AMDRequireDependencySerial);
exports.AMDRequireItemDependency = AMDRequireItemDependencySerial;
exports.map.set(AMDRequireItemDependency, AMDRequireItemDependencySerial);
exports.CommonJsRequireContextDependency = CommonJsRequireContextDependencySerial;
exports.map.set(CommonJsRequireContextDependency, CommonJsRequireContextDependencySerial);
exports.CommonJsRequireDependency = CommonJsRequireDependencySerial;
exports.map.set(CommonJsRequireDependency, CommonJsRequireDependencySerial);
exports.ConstDependency = ConstDependencySerial;
exports.map.set(ConstDependency, ConstDependencySerial);
exports.ContextDependency = ContextDependencySerial;
exports.map.set(ContextDependency, ContextDependencySerial);
exports.ContextElementDependency = ContextElementDependencySerial;
exports.map.set(ContextElementDependency, ContextElementDependencySerial);
exports.CriticalDependencyWarning = CriticalDependencyWarningSerial;
exports.map.set(CriticalDependencyWarning, CriticalDependencyWarningSerial);
exports.DelegatedExportsDependency = DelegatedExportsDependencySerial;
exports.map.set(DelegatedExportsDependency, DelegatedExportsDependencySerial);
exports.DelegatedSourceDependency = DelegatedSourceDependencySerial;
exports.map.set(DelegatedSourceDependency, DelegatedSourceDependencySerial);
exports.DllEntryDependency = DllEntryDependencySerial;
exports.map.set(DllEntryDependency, DllEntryDependencySerial);
exports.HarmonyAcceptDependency = HarmonyAcceptDependencySerial;
exports.map.set(HarmonyAcceptDependency, HarmonyAcceptDependencySerial);
exports.HarmonyAcceptImportDependency = HarmonyAcceptImportDependencySerial;
exports.map.set(HarmonyAcceptImportDependency, HarmonyAcceptImportDependencySerial);
exports.HarmonyCompatibilityDependency = HarmonyCompatibilityDependencySerial;
exports.map.set(HarmonyCompatibilityDependency, HarmonyCompatibilityDependencySerial);
exports.HarmonyExportExpressionDependency = HarmonyExportExpressionDependencySerial;
exports.map.set(HarmonyExportExpressionDependency, HarmonyExportExpressionDependencySerial);
exports.HarmonyExportHeaderDependency = HarmonyExportHeaderDependencySerial;
exports.map.set(HarmonyExportHeaderDependency, HarmonyExportHeaderDependencySerial);
exports.HarmonyExportImportedSpecifierDependency = HarmonyExportImportedSpecifierDependencySerial;
exports.map.set(HarmonyExportImportedSpecifierDependency, HarmonyExportImportedSpecifierDependencySerial);
exports.HarmonyExportSpecifierDependency = HarmonyExportSpecifierDependencySerial;
exports.map.set(HarmonyExportSpecifierDependency, HarmonyExportSpecifierDependencySerial);
exports.HarmonyImportDependency = HarmonyImportDependencySerial;
exports.map.set(HarmonyImportDependency, HarmonyImportDependencySerial);
exports.HarmonyImportSideEffectDependency = HarmonyImportSideEffectDependencySerial;
exports.map.set(HarmonyImportSideEffectDependency, HarmonyImportSideEffectDependencySerial);
exports.HarmonyImportSpecifierDependency = HarmonyImportSpecifierDependencySerial;
exports.map.set(HarmonyImportSpecifierDependency, HarmonyImportSpecifierDependencySerial);
exports.HarmonyInitDependency = HarmonyInitDependencySerial;
exports.map.set(HarmonyInitDependency, HarmonyInitDependencySerial);
exports.ImportContextDependency = ImportContextDependencySerial;
exports.map.set(ImportContextDependency, ImportContextDependencySerial);
exports.ImportDependency = ImportDependencySerial;
exports.map.set(ImportDependency, ImportDependencySerial);
exports.ImportEagerDependency = ImportEagerDependencySerial;
exports.map.set(ImportEagerDependency, ImportEagerDependencySerial);
exports.ImportWeakDependency = ImportWeakDependencySerial;
exports.map.set(ImportWeakDependency, ImportWeakDependencySerial);
exports.JsonExportsDependency = JsonExportsDependencySerial;
exports.map.set(JsonExportsDependency, JsonExportsDependencySerial);
exports.LoaderDependency = LoaderDependencySerial;
exports.map.set(LoaderDependency, LoaderDependencySerial);
exports.LocalModuleDependency = LocalModuleDependencySerial;
exports.map.set(LocalModuleDependency, LocalModuleDependencySerial);
exports.ModuleDependency = ModuleDependencySerial;
exports.map.set(ModuleDependency, ModuleDependencySerial);
exports.ModuleHotAcceptDependency = ModuleHotAcceptDependencySerial;
exports.map.set(ModuleHotAcceptDependency, ModuleHotAcceptDependencySerial);
exports.ModuleHotDeclineDependency = ModuleHotDeclineDependencySerial;
exports.map.set(ModuleHotDeclineDependency, ModuleHotDeclineDependencySerial);
exports.MultiEntryDependency = MultiEntryDependencySerial;
exports.map.set(MultiEntryDependency, MultiEntryDependencySerial);
exports.NullDependency = NullDependencySerial;
exports.map.set(NullDependency, NullDependencySerial);
exports.PrefetchDependency = PrefetchDependencySerial;
exports.map.set(PrefetchDependency, PrefetchDependencySerial);
exports.RequireContextDependency = RequireContextDependencySerial;
exports.map.set(RequireContextDependency, RequireContextDependencySerial);
exports.RequireEnsureDependency = RequireEnsureDependencySerial;
exports.map.set(RequireEnsureDependency, RequireEnsureDependencySerial);
exports.RequireEnsureItemDependency = RequireEnsureItemDependencySerial;
exports.map.set(RequireEnsureItemDependency, RequireEnsureItemDependencySerial);
exports.RequireHeaderDependency = RequireHeaderDependencySerial;
exports.map.set(RequireHeaderDependency, RequireHeaderDependencySerial);
exports.RequireIncludeDependency = RequireIncludeDependencySerial;
exports.map.set(RequireIncludeDependency, RequireIncludeDependencySerial);
exports.RequireResolveContextDependency = RequireResolveContextDependencySerial;
exports.map.set(RequireResolveContextDependency, RequireResolveContextDependencySerial);
exports.RequireResolveDependency = RequireResolveDependencySerial;
exports.map.set(RequireResolveDependency, RequireResolveDependencySerial);
exports.RequireResolveHeaderDependency = RequireResolveHeaderDependencySerial;
exports.map.set(RequireResolveHeaderDependency, RequireResolveHeaderDependencySerial);
exports.SingleEntryDependency = SingleEntryDependencySerial;
exports.map.set(SingleEntryDependency, SingleEntryDependencySerial);
exports.UnsupportedDependency = UnsupportedDependencySerial;
exports.map.set(UnsupportedDependency, UnsupportedDependencySerial);
exports.WebAssemblyImportDependency = WebAssemblyImportDependencySerial;
exports.map.set(WebAssemblyImportDependency, WebAssemblyImportDependencySerial);
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImhhcmQtc291cmNlLXdlYnBhY2stcGx1Z2luL2xpYi9zY2hlbWEtNC9pbmRleC5qcyJdLCJuYW1lcyI6WyJzZXJpYWwiLCJyZXF1aXJlIiwicmVsYXRlQ29udGV4dCIsIkxvY2FsTW9kdWxlIiwiZmxhdHRlblByb3RvdHlwZSIsIm9iaiIsImNvcHkiLCJrZXkiLCJhc3NpZ25UcnV0aGZ1bCIsImZyZWV6ZSIsImFyZyIsImRlcGVuZGVuY3kiLCJ0aGF3IiwiZnJvemVuIiwiYXNzaWduRGVmaW5lZCIsIm9wdGlvbmFsIiwiYXNzaWduZWQiLCJwcmVwZW5kIiwicmVwbGFjZXMiLCJjcml0aWNhbCIsIm5hbWVzcGFjZU9iamVjdEFzQ29udGV4dCIsImNhbGxBcmdzIiwiY2FsbCIsImRpcmVjdEltcG9ydCIsInNob3J0aGFuZCIsImxvYyIsImxvY2FsTW9kdWxlQXNzaWduZWQiLCJfIiwibG9jYWxNb2R1bGUiLCJuYW1lIiwiaWR4IiwidXNlZCIsInRoYXdlZCIsImV4dHJhIiwic3RhdGUiLCJsb2NhbE1vZHVsZXMiLCJtb2R1bGUiLCJ3YXJuaW5ncyIsImdldFdhcm5pbmdzIiwibGVuZ3RoIiwibWFwIiwic3RhY2siLCJpbmNsdWRlcyIsInNwbGl0IiwiZnJvemVuV2FybmluZ3MiLCJfZ2V0V2FybmluZ3MiLCJ3YXJuaW5nIiwiaSIsIkFNRERlZmluZURlcGVuZGVuY3kiLCJBTUREZWZpbmVEZXBlbmRlbmN5U2VyaWFsIiwiY29uc3RydWN0b3IiLCJtZXRob2RzIiwicmFuZ2UiLCJhcnJheVJhbmdlIiwiZnVuY3Rpb25SYW5nZSIsIm9iamVjdFJhbmdlIiwibmFtZWRNb2R1bGUiLCJBTURSZXF1aXJlQXJyYXlEZXBlbmRlbmN5IiwiQU1EUmVxdWlyZUFycmF5RGVwZW5kZW5jeVNlcmlhbCIsImRlcHNBcnJheSIsIm1hcEZyZWV6ZSIsIm1hcFRoYXciLCJBTURSZXF1aXJlQ29udGV4dERlcGVuZGVuY3kiLCJBTURSZXF1aXJlQ29udGV4dERlcGVuZGVuY3lTZXJpYWwiLCJvcHRpb25zIiwicmVnRXhwIiwiT2JqZWN0IiwiYXNzaWduIiwic291cmNlIiwidmFsdWVSYW5nZSIsIlJlZ0V4cCIsIkFNRFJlcXVpcmVEZXBlbmRlbmN5IiwiQU1EUmVxdWlyZURlcGVuZGVuY3lTZXJpYWwiLCJibG9jayIsImRlcGVuZGVuY2llcyIsInVuZGVmaW5lZCIsInBhcmVudCIsIkFNRFJlcXVpcmVJdGVtRGVwZW5kZW5jeSIsIkFNRFJlcXVpcmVJdGVtRGVwZW5kZW5jeVNlcmlhbCIsInJlcXVlc3QiLCJyZWxhdGVBYnNvbHV0ZVJlcXVlc3QiLCJjb250ZXh0IiwiQ29tbW9uSnNSZXF1aXJlQ29udGV4dERlcGVuZGVuY3kiLCJDb21tb25Kc1JlcXVpcmVDb250ZXh0RGVwZW5kZW5jeVNlcmlhbCIsIkNvbW1vbkpzUmVxdWlyZURlcGVuZGVuY3kiLCJDb21tb25Kc1JlcXVpcmVEZXBlbmRlbmN5U2VyaWFsIiwiQ29uc3REZXBlbmRlbmN5IiwiQ29uc3REZXBlbmRlbmN5U2VyaWFsIiwiZXhwcmVzc2lvbiIsInJlcXVpcmVXZWJwYWNrUmVxdWlyZSIsIkNvbnRleHREZXBlbmRlbmN5IiwiQ29udGV4dERlcGVuZGVuY3lTZXJpYWwiLCJDb250ZXh0RWxlbWVudERlcGVuZGVuY3kiLCJDb250ZXh0RWxlbWVudERlcGVuZGVuY3lTZXJpYWwiLCJ1c2VyUmVxdWVzdCIsIkNyaXRpY2FsRGVwZW5kZW5jeVdhcm5pbmciLCJDcml0aWNhbERlcGVuZGVuY3lXYXJuaW5nU2VyaWFsIiwibWVzc2FnZSIsIkRlbGVnYXRlZEV4cG9ydHNEZXBlbmRlbmN5IiwiRGVsZWdhdGVkRXhwb3J0c0RlcGVuZGVuY3lTZXJpYWwiLCJvcmlnaW5Nb2R1bGUiLCJleHBvcnRzIiwiRGVsZWdhdGVkU291cmNlRGVwZW5kZW5jeSIsIkRlbGVnYXRlZFNvdXJjZURlcGVuZGVuY3lTZXJpYWwiLCJEbGxFbnRyeURlcGVuZGVuY3kiLCJEbGxFbnRyeURlcGVuZGVuY3lTZXJpYWwiLCJIYXJtb255QWNjZXB0RGVwZW5kZW5jeSIsIkhhcm1vbnlBY2NlcHREZXBlbmRlbmN5U2VyaWFsIiwiaGFzQ2FsbGJhY2siLCJIYXJtb255QWNjZXB0SW1wb3J0RGVwZW5kZW5jeSIsIkhhcm1vbnlBY2NlcHRJbXBvcnREZXBlbmRlbmN5U2VyaWFsIiwicGFyc2VyU2NvcGUiLCJoYXJtb255UGFyc2VyU2NvcGUiLCJIYXJtb255Q29tcGF0aWJpbGl0eURlcGVuZGVuY3kiLCJIYXJtb255Q29tcGF0aWJpbGl0eURlcGVuZGVuY3lTZXJpYWwiLCJIYXJtb255RXhwb3J0RXhwcmVzc2lvbkRlcGVuZGVuY3kiLCJIYXJtb255RXhwb3J0RXhwcmVzc2lvbkRlcGVuZGVuY3lTZXJpYWwiLCJyYW5nZVN0YXRlbWVudCIsIkhhcm1vbnlFeHBvcnRIZWFkZXJEZXBlbmRlbmN5IiwiSGFybW9ueUV4cG9ydEhlYWRlckRlcGVuZGVuY3lTZXJpYWwiLCJIYXJtb255RXhwb3J0SW1wb3J0ZWRTcGVjaWZpZXJEZXBlbmRlbmN5IiwiSGFybW9ueUV4cG9ydEltcG9ydGVkU3BlY2lmaWVyRGVwZW5kZW5jeVNlcmlhbCIsInNvdXJjZU9yZGVyIiwiaWQiLCJhY3RpdmVFeHBvcnRzIiwib3RoZXJTdGFyRXhwb3J0cyIsInN0cmljdEV4cG9ydFByZXNlbmNlIiwiU2V0IiwiYWRkIiwiZXhwb3J0SW1wb3J0ZWREZXBlbmRlbmN5IiwiY29uY2F0IiwiSGFybW9ueUV4cG9ydFNwZWNpZmllckRlcGVuZGVuY3kiLCJIYXJtb255RXhwb3J0U3BlY2lmaWVyRGVwZW5kZW5jeVNlcmlhbCIsIkhhcm1vbnlJbXBvcnREZXBlbmRlbmN5IiwiSGFybW9ueUltcG9ydERlcGVuZGVuY3lTZXJpYWwiLCJpbXBvcnREZXBlbmRlbmN5IiwicmVmIiwidG9TdHJpbmciLCJpbXBvcnRzIiwiSGFybW9ueUltcG9ydFNpZGVFZmZlY3REZXBlbmRlbmN5IiwiSGFybW9ueUltcG9ydFNpZGVFZmZlY3REZXBlbmRlbmN5U2VyaWFsIiwiSGFybW9ueUltcG9ydFNwZWNpZmllckRlcGVuZGVuY3kiLCJIYXJtb255SW1wb3J0U3BlY2lmaWVyRGVwZW5kZW5jeVNlcmlhbCIsIkhhcm1vbnlJbml0RGVwZW5kZW5jeSIsIkhhcm1vbnlJbml0RGVwZW5kZW5jeVNlcmlhbCIsIkltcG9ydENvbnRleHREZXBlbmRlbmN5IiwiSW1wb3J0Q29udGV4dERlcGVuZGVuY3lTZXJpYWwiLCJJbXBvcnREZXBlbmRlbmN5IiwiSW1wb3J0RGVwZW5kZW5jeVNlcmlhbCIsIkltcG9ydEVhZ2VyRGVwZW5kZW5jeSIsIkltcG9ydEVhZ2VyRGVwZW5kZW5jeVNlcmlhbCIsIkltcG9ydFdlYWtEZXBlbmRlbmN5IiwiSW1wb3J0V2Vha0RlcGVuZGVuY3lTZXJpYWwiLCJKc29uRXhwb3J0c0RlcGVuZGVuY3kiLCJKc29uRXhwb3J0c0RlcGVuZGVuY3lTZXJpYWwiLCJMb2FkZXJEZXBlbmRlbmN5IiwiTG9hZGVyRGVwZW5kZW5jeVNlcmlhbCIsIkxvY2FsTW9kdWxlRGVwZW5kZW5jeSIsIkxvY2FsTW9kdWxlRGVwZW5kZW5jeVNlcmlhbCIsImNhbGxOZXciLCJNb2R1bGVEZXBlbmRlbmN5IiwiTW9kdWxlRGVwZW5kZW5jeVNlcmlhbCIsIk1vZHVsZUhvdEFjY2VwdERlcGVuZGVuY3kiLCJNb2R1bGVIb3RBY2NlcHREZXBlbmRlbmN5U2VyaWFsIiwiTW9kdWxlSG90RGVjbGluZURlcGVuZGVuY3kiLCJNb2R1bGVIb3REZWNsaW5lRGVwZW5kZW5jeVNlcmlhbCIsIk11bHRpRW50cnlEZXBlbmRlbmN5IiwiTXVsdGlFbnRyeURlcGVuZGVuY3lTZXJpYWwiLCJOdWxsRGVwZW5kZW5jeSIsIk51bGxEZXBlbmRlbmN5U2VyaWFsIiwiUHJlZmV0Y2hEZXBlbmRlbmN5IiwiUHJlZmV0Y2hEZXBlbmRlbmN5U2VyaWFsIiwiUmVxdWlyZUNvbnRleHREZXBlbmRlbmN5IiwiUmVxdWlyZUNvbnRleHREZXBlbmRlbmN5U2VyaWFsIiwiUmVxdWlyZUVuc3VyZURlcGVuZGVuY3kiLCJSZXF1aXJlRW5zdXJlRGVwZW5kZW5jeVNlcmlhbCIsIlJlcXVpcmVFbnN1cmVJdGVtRGVwZW5kZW5jeSIsIlJlcXVpcmVFbnN1cmVJdGVtRGVwZW5kZW5jeVNlcmlhbCIsIlJlcXVpcmVIZWFkZXJEZXBlbmRlbmN5IiwiUmVxdWlyZUhlYWRlckRlcGVuZGVuY3lTZXJpYWwiLCJSZXF1aXJlSW5jbHVkZURlcGVuZGVuY3kiLCJSZXF1aXJlSW5jbHVkZURlcGVuZGVuY3lTZXJpYWwiLCJSZXF1aXJlUmVzb2x2ZUNvbnRleHREZXBlbmRlbmN5IiwiUmVxdWlyZVJlc29sdmVDb250ZXh0RGVwZW5kZW5jeVNlcmlhbCIsIlJlcXVpcmVSZXNvbHZlRGVwZW5kZW5jeSIsIlJlcXVpcmVSZXNvbHZlRGVwZW5kZW5jeVNlcmlhbCIsIlJlcXVpcmVSZXNvbHZlSGVhZGVyRGVwZW5kZW5jeSIsIlJlcXVpcmVSZXNvbHZlSGVhZGVyRGVwZW5kZW5jeVNlcmlhbCIsIlNpbmdsZUVudHJ5RGVwZW5kZW5jeSIsIlNpbmdsZUVudHJ5RGVwZW5kZW5jeVNlcmlhbCIsIlVuc3VwcG9ydGVkRGVwZW5kZW5jeSIsIlVuc3VwcG9ydGVkRGVwZW5kZW5jeVNlcmlhbCIsIldlYkFzc2VtYmx5SW1wb3J0RGVwZW5kZW5jeSIsIldlYkFzc2VtYmx5SW1wb3J0RGVwZW5kZW5jeVNlcmlhbCIsImRlc2NyaXB0aW9uIiwib25seURpcmVjdEltcG9ydCIsIk1hcCIsInNldCJdLCJtYXBwaW5ncyI6Ijs7QUFBQSxNQUFNQSxTQUFTQyx5QkFBZjtBQUNBLE1BQU1DLGdCQUFnQkQsaUNBQXRCOztBQUVBLE1BQU1FLGNBQWNGLFFBQVEsc0NBQVIsQ0FBcEI7O0FBRUEsU0FBU0csZ0JBQVQsQ0FBMEJDLEdBQTFCLEVBQStCO0FBQzdCLE1BQUksT0FBT0EsR0FBUCxLQUFlLFFBQW5CLEVBQTZCO0FBQzNCLFdBQU9BLEdBQVA7QUFDRDtBQUNELFFBQU1DLE9BQU8sRUFBYjtBQUNBLE9BQUssTUFBTUMsR0FBWCxJQUFrQkYsR0FBbEIsRUFBdUI7QUFDckJDLFNBQUtDLEdBQUwsSUFBWUYsSUFBSUUsR0FBSixD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QUFZNkosR0FBWixDQUFnQnJCLDJCQUFoQixFQUE2Q0MsaUNBQTdDO0FBQ0E1RSxRQUFRNkUsdUJBQVIsR0FBa0NDLDZCQUFsQztBQUNBOUUsUUFBUTdELEdBQVIsQ0FBWTZKLEdBQVosQ0FBZ0JuQix1QkFBaEIsRUFBeUNDLDZCQUF6QztBQUNBOUUsUUFBUStFLHdCQUFSLEdBQW1DQyw4QkFBbkM7QUFDQWhGLFFBQVE3RCxHQUFSLENBQVk2SixHQUFaLENBQWdCakIsd0JBQWhCLEVBQTBDQyw4QkFBMUM7QUFDQWhGLFFBQVFpRiwrQkFBUixHQUEwQ0MscUNBQTFDO0FBQ0FsRixRQUFRN0QsR0FBUixDQUFZNkosR0FBWixDQUFnQmYsK0JBQWhCLEVBQWlEQyxxQ0FBakQ7QUFDQWxGLFFBQVFtRix3QkFBUixHQUFtQ0MsOEJBQW5DO0FBQ0FwRixRQUFRN0QsR0FBUixDQUFZNkosR0FBWixDQUFnQmIsd0JBQWhCLEVBQTBDQyw4QkFBMUM7QUFDQXBGLFFBQVFxRiw4QkFBUixHQUF5Q0Msb0NBQXpDO0FBQ0F0RixRQUFRN0QsR0FBUixDQUFZNkosR0FBWixDQUFnQlgsOEJBQWhCLEVBQWdEQyxvQ0FBaEQ7QUFDQXRGLFFBQVF1RixxQkFBUixHQUFnQ0MsMkJBQWhDO0FBQ0F4RixRQUFRN0QsR0FBUixDQUFZNkosR0FBWixDQUFnQlQscUJBQWhCLEVBQXVDQywyQkFBdkM7QUFDQXhGLFFBQVF5RixxQkFBUixHQUFnQ0MsMkJBQWhDO0FBQ0ExRixRQUFRN0QsR0FBUixDQUFZNkosR0FBWixDQUFnQlAscUJBQWhCLEVBQXVDQywyQkFBdkM7QUFDQTFGLFFBQVEyRiwyQkFBUixHQUFzQ0MsaUNBQXRDO0FBQ0E1RixRQUFRN0QsR0FBUixDQUFZNkosR0FBWixDQUFnQkwsMkJBQWhCLEVBQTZDQyxpQ0FBN0MiLCJmaWxlIjoiaGFyZC1zb3VyY2Utd2VicGFjay1wbHVnaW4vbGliL3NjaGVtYS00L2luZGV4LmpzIiwic291cmNlc0NvbnRlbnQiOlsiY29uc3Qgc2VyaWFsID0gcmVxdWlyZSgnLi4vdXRpbC9zZXJpYWwnKTtcbmNvbnN0IHJlbGF0ZUNvbnRleHQgPSByZXF1aXJlKCcuLi91dGlsL3JlbGF0ZS1jb250ZXh0Jyk7XG5cbmNvbnN0IExvY2FsTW9kdWxlID0gcmVxdWlyZSgnd2VicGFjay9saWIvZGVwZW5kZW5jaWVzL0xvY2FsTW9kdWxlJyk7XG5cbmZ1bmN0aW9uIGZsYXR0ZW5Qcm90b3R5cGUob2JqKSB7XG4gIGlmICh0eXBlb2Ygb2JqID09PSAnc3RyaW5nJykge1xuICAgIHJldHVybiBvYmo7XG4gIH1cbiAgY29uc3QgY29weSA9IHt9O1xuICBmb3IgKGNvbnN0IGtleSBpbiBvYmopIHtcbiAgICBjb3B5W2tleV0gPSBvYmpba2V5XTtcbiAgfVxuICByZXR1cm4gY29weTtcbn1cblxuY29uc3QgYXNzaWduVHJ1dGhmdWwgPSB7XG4gIGZyZWV6ZShhcmcsIGRlcGVuZGVuY3kpIHtcbiAgICByZXR1cm4gYXJnO1xuICB9LFxuICB0aGF3KGFyZywgZnJvemVuKSB7XG4gICAgcmV0dXJuIGFyZztcbiAgfSxcbn07XG5cbmNvbnN0IGFzc2lnbkRlZmluZWQgPSB7XG4gIGZyZWV6ZShhcmcsIGRlcGVuZGVuY3kpIHtcbiAgICBpZiAodHlwZW9mIGFyZyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgIHJldHVybiBhcmc7XG4gICAgfVxuICB9LFxuICB0aGF3KGFyZywgZnJvemVuKSB7XG4gICAgaWYgKHR5cGVvZiBhcmcgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICByZXR1cm4gYXJnO1xuICAgIH1cbiAgfSxcbn1cblxuY29uc3Qgb3B0aW9uYWwgPSBzZXJpYWwuYXNzaWduZWQoe1xuICBwcmVwZW5kOiBhc3NpZ25UcnV0aGZ1bCxcbiAgcmVwbGFjZXM6IGFzc2lnblRydXRoZnVsLFxuICBjcml0aWNhbDogYXNzaWduVHJ1dGhmdWwsXG4gIG5hbWVzcGFjZU9iamVjdEFzQ29udGV4dDogYXNzaWduRGVmaW5lZCxcbiAgY2FsbEFyZ3M6IGFzc2lnbkRlZmluZWQsXG4gIGNhbGw6IGFzc2lnbkRlZmluZWQsXG4gIGRpcmVjdEltcG9ydDogYXNzaWduRGVmaW5lZCxcbiAgc2hvcnRoYW5kOiBhc3NpZ25EZWZpbmVkLFxuICBvcHRpb25hbDogYXNzaWduVHJ1dGhmdWwsXG4gIGxvYzoge1xuICAgIGZyZWV6ZShhcmcsIGRlcGVuZGVuY3kpIHtcbiAgICAgIHJldHVybiBmbGF0dGVuUHJvdG90eXBlKGRlcGVuZGVuY3kubG9jKTtcbiAgICB9LFxuICAgIHRoYXcoYXJnLCBmcm96ZW4pIHtcbiAgICAgIHJldHVybiBhcmc7XG4gICAgfSxcbiAgfSxcbn0pO1xuXG5jb25zdCBsb2NhbE1vZHVsZUFzc2lnbmVkID0ge1xuICBmcmVlemUoXywgZGVwZW5kZW5jeSkge1xuICAgIGlmIChcbiAgICAgIHR5cGVvZiBkZXBlbmRlbmN5LmxvY2FsTW9kdWxlID09PSAnb2JqZWN0JyAmJlxuICAgICAgZGVwZW5kZW5jeS5sb2NhbE1vZHVsZSAhPT0gbnVsbFxuICAgICkge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgbmFtZTogZGVwZW5kZW5jeS5sb2NhbE1vZHVsZS5uYW1lLFxuICAgICAgICBpZHg6IGRlcGVuZGVuY3kubG9jYWxNb2R1bGUuaWR4LFxuICAgICAgICB1c2VkOiBkZXBlbmRlbmN5LmxvY2FsTW9kdWxlLnVzZWQsXG4gICAgICB9O1xuICAgIH1cbiAgfSxcbiAgdGhhdyh0aGF3ZWQsIGxvY2FsTW9kdWxlLCBleHRyYSkge1xuICAgIGNvbnN0IHN0YXRlID0gZXh0cmEuc3RhdGU7XG4gICAgaWYgKFxuICAgICAgdHlwZW9mIGxvY2FsTW9kdWxlID09PSAnb2JqZWN0JyAmJlxuICAgICAgbG9jYWxNb2R1bGUgIT09IG51bGxcbiAgICApIHtcbiAgICAgIGlmICghc3RhdGUubG9jYWxNb2R1bGVzKSB7XG4gICAgICAgIHN0YXRlLmxvY2FsTW9kdWxlcyA9IFtdO1xuICAgICAgfVxuICAgICAgaWYgKCFzdGF0ZS5sb2NhbE1vZHVsZXNbbG9jYWxNb2R1bGUuaWR4XSkge1xuICAgICAgICBzdGF0ZS5sb2NhbE1vZHVsZXNbbG9jYWxNb2R1bGUuaWR4XSA9IG5ldyBMb2NhbE1vZHVsZShcbiAgICAgICAgICBleHRyYS5tb2R1bGUsXG4gICAgICAgICAgbG9jYWxNb2R1bGUubmFtZSxcbiAgICAgICAgICBsb2NhbE1vZHVsZS5pZHgsXG4gICAgICAgICk7XG4gICAgICAgIHN0YXRlLmxvY2FsTW9kdWxlc1tsb2NhbE1vZHVsZS5pZHhdLnVzZWQgPVxuICAgICAgICAgIGxvY2FsTW9kdWxlLnVzZWQ7XG4gICAgICB9XG4gICAgICB0aGF3ZWQubG9jYWxNb2R1bGUgPSBzdGF0ZS5sb2NhbE1vZHVsZXNbbG9jYWxNb2R1bGUuaWR4XTtcbiAgICB9XG4gICAgcmV0dXJuIHRoYXdlZDtcbiAgfSxcbn07XG5cbmNvbnN0IHdhcm5pbmdzID0ge1xuICBmcmVlemUoZnJvemVuLCBkZXBlbmRlbmN5KSB7XG4gICAgaWYgKGZyb3plbiAmJiBkZXBlbmRlbmN5LmdldFdhcm5pbmdzKSB7XG4gICAgICBjb25zdCB3YXJuaW5ncyA9IGRlcGVuZGVuY3kuZ2V0V2FybmluZ3MoKTtcbiAgICAgIGlmICh3YXJuaW5ncyAmJiB3YXJuaW5ncy5sZW5ndGgpIHtcbiAgICAgICAgcmV0dXJuIHdhcm5pbmdzLm1hcChcbiAgICAgICAgICAoeyBzdGFjayB9KSA9PlxuICAgICAgICAgICAgc3RhY2suaW5jbHVkZXMoJ1xcbiAgICBhdCBPYmplY3QuZnJlZXplJylcbiAgICAgICAgICAgICAgPyBzdGFjay5zcGxpdCgnXFxuICAgIGF0IE9iamVjdC5mcmVlemUnKVswXVxuICAgICAgICAgICAgICA6IHN0YWNrLmluY2x1ZGVzKCdcXG4gICAgYXQgcGx1Z2luQ29tcGF0LnRhcCcpXG4gICAgICAgICAgICAgICAgPyBzdGFjay5zcGxpdCgnXFxuICAgIGF0IHBsdWdpbkNvbXBhdC50YXAnKVswXVxuICAgICAgICAgICAgICAgIDogc3RhY2suc3BsaXQoJ1xcbiAgICBhdCBDb21waWxlci5wbHVnaW5Db21wYXQudGFwJylbMF0sXG4gICAgICAgICk7XG4gICAgICB9XG4gICAgfVxuICB9LFxuICB0aGF3KGRlcGVuZGVuY3ksIHdhcm5pbmdzKSB7XG4gICAgaWYgKGRlcGVuZGVuY3kgJiYgd2FybmluZ3MgJiYgZGVwZW5kZW5jeS5nZXRXYXJuaW5ncykge1xuICAgICAgY29uc3QgZnJvemVuV2FybmluZ3MgPSB3YXJuaW5ncztcbiAgICAgIGNvbnN0IF9nZXRXYXJuaW5ncyA9IGRlcGVuZGVuY3kuZ2V0V2FybmluZ3M7XG4gICAgICBkZXBlbmRlbmN5LmdldFdhcm5pbmdzID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIGNvbnN0IHdhcm5pbmdzID0gX2dldFdhcm5pbmdzLmNhbGwodGhpcyk7XG4gICAgICAgIGlmICh3YXJuaW5ncyAmJiB3YXJuaW5ncy5sZW5ndGgpIHtcbiAgICAgICAgICByZXR1cm4gd2FybmluZ3MubWFwKCh3YXJuaW5nLCBpKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBzdGFjayA9IHdhcm5pbmcuc3RhY2suc3BsaXQoXG4gICAgICAgICAgICAgICdcXG4gICAgYXQgQ29tcGlsYXRpb24ucmVwb3J0RGVwZW5kZW5jeUVycm9yc0FuZFdhcm5pbmdzJyxcbiAgICAgICAgICAgIClbMV07XG4gICAgICAgICAgICB3YXJuaW5nLnN0YWNrID0gYCR7XG4gICAgICAgICAgICAgIGZyb3plbldhcm5pbmdzW2ldXG4gICAgICAgICAgICB9XFxuICAgIGF0IENvbXBpbGF0aW9uLnJlcG9ydERlcGVuZGVuY3lFcnJvcnNBbmRXYXJuaW5ncyR7c3RhY2t9YDtcbiAgICAgICAgICAgIHJldHVybiB3YXJuaW5nO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB3YXJuaW5ncztcbiAgICAgIH07XG4gICAgfVxuICAgIHJldHVybiBkZXBlbmRlbmN5O1xuICB9LFxufTtcbmNvbnN0IEFNRERlZmluZURlcGVuZGVuY3kgPSByZXF1aXJlKCd3ZWJwYWNrL2xpYi9kZXBlbmRlbmNpZXMvQU1ERGVmaW5lRGVwZW5kZW5jeScpO1xuY29uc3QgQU1ERGVmaW5lRGVwZW5kZW5jeVNlcmlhbCA9IHNlcmlhbC5zZXJpYWwoJ0FNRERlZmluZURlcGVuZGVuY3knLCB7XG4gIGNvbnN0cnVjdG9yOiB7XG4gICAgZnJlZXplKF8sIGRlcGVuZGVuY3ksIGV4dHJhLCBtZXRob2RzKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICByYW5nZTogZGVwZW5kZW5jeS5yYW5nZSxcbiAgICAgICAgYXJyYXlSYW5nZTogZGVwZW5kZW5jeS5hcnJheVJhbmdlLFxuICAgICAgICBmdW5jdGlvblJhbmdlOiBkZXBlbmRlbmN5LmZ1bmN0aW9uUmFuZ2UsXG4gICAgICAgIG9iamVjdFJhbmdlOiBkZXBlbmRlbmN5Lm9iamVjdFJhbmdlLFxuICAgICAgICBuYW1lZE1vZHVsZTogZGVwZW5kZW5jeS5uYW1lZE1vZHVsZSxcbiAgICAgIH07XG4gICAgfSxcbiAgICB0aGF3KHRoYXdlZCwgZnJvemVuLCBleHRyYSwgbWV0aG9kcykge1xuICAgICAgcmV0dXJuIG5ldyBBTUREZWZpbmVEZXBlbmRlbmN5KFxuICAgICAgICBmcm96ZW4ucmFuZ2UsXG4gICAgICAgIGZyb3plbi5hcnJheVJhbmdlLFxuICAgICAgICBmcm96ZW4uZnVuY3Rpb25SYW5nZSxcbiAgICAgICAgZnJvemVuLm9iamVjdFJhbmdlLFxuICAgICAgICBmcm96ZW4ubmFtZWRNb2R1bGUsXG4gICAgICApO1xuICAgIH0sXG4gIH0sXG5cbiAgb3B0aW9uYWwsXG5cbiAgbG9jYWxNb2R1bGVBc3NpZ25lZCxcblxuICB3YXJuaW5ncyxcbn0pO1xuXG5jb25zdCBBTURSZXF1aXJlQXJyYXlEZXBlbmRlbmN5ID0gcmVxdWlyZSgnd2VicGFjay9saWIvZGVwZW5kZW5jaWVzL0FNRFJlcXVpcmVBcnJheURlcGVuZGVuY3knKTtcbmNvbnN0IEFNRFJlcXVpcmVBcnJheURlcGVuZGVuY3lTZXJpYWwgPSBzZXJpYWwuc2VyaWFsKCdBTURSZXF1aXJlQXJyYXlEZXBlbmRlbmN5Jywge1xuICBjb25zdHJ1Y3Rvcjoge1xuICAgIGZyZWV6ZShfLCBkZXBlbmRlbmN5LCBleHRyYSwgbWV0aG9kcykge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgZGVwc0FycmF5OiBtZXRob2RzLm1hcEZyZWV6ZSgnRGVwZW5kZW5jeScsIG51bGwsIGRlcGVuZGVuY3kuZGVwc0FycmF5LCBleHRyYSksXG4gICAgICAgIHJhbmdlOiBkZXBlbmRlbmN5LnJhbmdlLFxuICAgICAgfTtcbiAgICB9LFxuICAgIHRoYXcodGhhd2VkLCBmcm96ZW4sIGV4dHJhLCBtZXRob2RzKSB7XG4gICAgICByZXR1cm4gbmV3IEFNRFJlcXVpcmVBcnJheURlcGVuZGVuY3koXG4gICAgICAgIG1ldGhvZHMubWFwVGhhdygnRGVwZW5kZW5jeScsIG51bGwsIGZyb3plbi5kZXBzQXJyYXksIGV4dHJhKSxcbiAgICAgICAgZnJvemVuLnJhbmdlLFxuICAgICAgKTtcbiAgICB9LFxuICB9LFxuXG4gIG9wdGlvbmFsLFxuXG4gIHdhcm5pbmdzLFxufSk7XG5cbmNvbnN0IEFNRFJlcXVpcmVDb250ZXh0RGVwZW5kZW5jeSA9IHJlcXVpcmUoJ3dlYnBhY2svbGliL2RlcGVuZGVuY2llcy9BTURSZXF1aXJlQ29udGV4dERlcGVuZGVuY3knKTtcbmNvbnN0IEFNRFJlcXVpcmVDb250ZXh0RGVwZW5kZW5jeVNlcmlhbCA9IHNlcmlhbC5zZXJpYWwoJ0FNRFJlcXVpcmVDb250ZXh0RGVwZW5kZW5jeScsIHtcbiAgY29uc3RydWN0b3I6IHtcbiAgICBmcmVlemUoXywgZGVwZW5kZW5jeSwgZXh0cmEsIG1ldGhvZHMpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIG9wdGlvbnM6IGRlcGVuZGVuY3kub3B0aW9ucy5yZWdFeHAgP1xuICAgICAgICAgIE9iamVjdC5hc3NpZ24oe30sIGRlcGVuZGVuY3kub3B0aW9ucywge1xuICAgICAgICAgICAgcmVnRXhwOiBkZXBlbmRlbmN5Lm9wdGlvbnMucmVnRXhwLnNvdXJjZSxcbiAgICAgICAgICB9KSA6XG4gICAgICAgICAgZGVwZW5kZW5jeS5vcHRpb25zLFxuICAgICAgICByYW5nZTogZGVwZW5kZW5jeS5yYW5nZSxcbiAgICAgICAgdmFsdWVSYW5nZTogZGVwZW5kZW5jeS52YWx1ZVJhbmdlLFxuICAgICAgfTtcbiAgICB9LFxuICAgIHRoYXcodGhhd2VkLCBmcm96ZW4sIGV4dHJhLCBtZXRob2RzKSB7XG4gICAgICByZXR1cm4gbmV3IEFNRFJlcXVpcmVDb250ZXh0RGVwZW5kZW5jeShcbiAgICAgICAgZnJvemVuLm9wdGlvbnMucmVnRXhwID9cbiAgICAgICAgICBPYmplY3QuYXNzaWduKHt9LCBmcm96ZW4ub3B0aW9ucywge1xuICAgICAgICAgICAgcmVnRXhwOiBuZXcgUmVnRXhwKGZyb3plbi5vcHRpb25zLnJlZ0V4cCksXG4gICAgICAgICAgfSkgOlxuICAgICAgICAgIGZyb3plbi5vcHRpb25zLFxuICAgICAgICBmcm96ZW4ucmFuZ2UsXG4gICAgICAgIGZyb3plbi52YWx1ZVJhbmdlLFxuICAgICAgKTtcbiAgICB9LFxuICB9LFxuXG4gIG9wdGlvbmFsLFxuXG4gIHdhcm5pbmdzLFxufSk7XG5cbmNvbnN0IEFNRFJlcXVpcmVEZXBlbmRlbmN5ID0gcmVxdWlyZSgnd2VicGFjay9saWIvZGVwZW5kZW5jaWVzL0FNRFJlcXVpcmVEZXBlbmRlbmN5Jyk7XG5jb25zdCBBTURSZXF1aXJlRGVwZW5kZW5jeVNlcmlhbCA9IHNlcmlhbC5zZXJpYWwoJ0FNRFJlcXVpcmVEZXBlbmRlbmN5Jywge1xuICBjb25zdHJ1Y3Rvcjoge1xuICAgIGZyZWV6ZShfLCBkZXBlbmRlbmN5LCBleHRyYSwgbWV0aG9kcykge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgYmxvY2s6ICFkZXBlbmRlbmN5LmJsb2NrLmRlcGVuZGVuY2llcy5pbmNsdWRlcyhkZXBlbmRlbmN5KSA/XG4gICAgICAgICAgbWV0aG9kcy5mcmVlemUoJ0RlcGVuZGVuY3lCbG9jaycsIG51bGwsIGRlcGVuZGVuY3kuYmxvY2ssIGV4dHJhKSA6XG4gICAgICAgICAgdW5kZWZpbmVkLFxuICAgICAgfTtcbiAgICB9LFxuICAgIHRoYXcodGhhd2VkLCBmcm96ZW4sIGV4dHJhLCBtZXRob2RzKSB7XG4gICAgICByZXR1cm4gbmV3IEFNRFJlcXVpcmVEZXBlbmRlbmN5KFxuICAgICAgICAhZnJvemVuLmJsb2NrID8gZXh0cmEucGFyZW50IDogbWV0aG9kcy50aGF3KCdEZXBlbmRlbmN5QmxvY2snLCBudWxsLCBmcm96ZW4uYmxvY2ssIGV4dHJhKSxcbiAgICAgICk7XG4gICAgfSxcbiAgfSxcblxuICBvcHRpb25hbCxcblxuICB3YXJuaW5ncyxcbn0pO1xuXG5jb25zdCBBTURSZXF1aXJlSXRlbURlcGVuZGVuY3kgPSByZXF1aXJlKCd3ZWJwYWNrL2xpYi9kZXBlbmRlbmNpZXMvQU1EUmVxdWlyZUl0ZW1EZXBlbmRlbmN5Jyk7XG5jb25zdCBBTURSZXF1aXJlSXRlbURlcGVuZGVuY3lTZXJpYWwgPSBzZXJpYWwuc2VyaWFsKCdBTURSZXF1aXJlSXRlbURlcGVuZGVuY3knLCB7XG4gIGNvbnN0cnVjdG9yOiB7XG4gICAgZnJlZXplKF8sIGRlcGVuZGVuY3ksIGV4dHJhLCBtZXRob2RzKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICByZXF1ZXN0OiByZWxhdGVDb250ZXh0LnJlbGF0ZUFic29sdXRlUmVxdWVzdChleHRyYS5tb2R1bGUuY29udGV4dCwgZGVwZW5kZW5jeS5yZXF1ZXN0KSxcbiAgICAgICAgcmFuZ2U6IGRlcGVuZGVuY3kucmFuZ2UsXG4gICAgICB9O1xuICAgIH0sXG4gICAgdGhhdyh0aGF3ZWQsIGZyb3plbiwgZXh0cmEsIG1ldGhvZHMpIHtcbiAgICAgIHJldHVybiBuZXcgQU1EUmVxdWlyZUl0ZW1EZXBlbmRlbmN5KFxuICAgICAgICBmcm96ZW4ucmVxdWVzdCxcbiAgICAgICAgZnJvemVuLnJhbmdlLFxuICAgICAgKTtcbiAgICB9LFxuICB9LFxuXG4gIG9wdGlvbmFsLFxuXG4gIHdhcm5pbmdzLFxufSk7XG5cbmNvbnN0IENvbW1vbkpzUmVxdWlyZUNvbnRleHREZXBlbmRlbmN5ID0gcmVxdWlyZSgnd2VicGFjay9saWIvZGVwZW5kZW5jaWVzL0NvbW1vbkpzUmVxdWlyZUNvbnRleHREZXBlbmRlbmN5Jyk7XG5jb25zdCBDb21tb25Kc1JlcXVpcmVDb250ZXh0RGVwZW5kZW5jeVNlcmlhbCA9IHNlcmlhbC5zZXJpYWwoJ0NvbW1vbkpzUmVxdWlyZUNvbnRleHREZXBlbmRlbmN5Jywge1xuICBjb25zdHJ1Y3Rvcjoge1xuICAgIGZyZWV6ZShfLCBkZXBlbmRlbmN5LCBleHRyYSwgbWV0aG9kcykge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgb3B0aW9uczogZGVwZW5kZW5jeS5vcHRpb25zLnJlZ0V4cCA/XG4gICAgICAgICAgT2JqZWN0LmFzc2lnbih7fSwgZGVwZW5kZW5jeS5vcHRpb25zLCB7XG4gICAgICAgICAgICByZWdFeHA6IGRlcGVuZGVuY3kub3B0aW9ucy5yZWdFeHAuc291cmNlLFxuICAgICAgICAgIH0pIDpcbiAgICAgICAgICBkZXBlbmRlbmN5Lm9wdGlvbnMsXG4gICAgICAgIHJhbmdlOiBkZXBlbmRlbmN5LnJhbmdlLFxuICAgICAgICB2YWx1ZVJhbmdlOiBkZXBlbmRlbmN5LnZhbHVlUmFuZ2UsXG4gICAgICB9O1xuICAgIH0sXG4gICAgdGhhdyh0aGF3ZWQsIGZyb3plbiwgZXh0cmEsIG1ldGhvZHMpIHtcbiAgICAgIHJldHVybiBuZXcgQ29tbW9uSnNSZXF1aXJlQ29udGV4dERlcGVuZGVuY3koXG4gICAgICAgIGZyb3plbi5vcHRpb25zLnJlZ0V4cCA/XG4gICAgICAgICAgT2JqZWN0LmFzc2lnbih7fSwgZnJvemVuLm9wdGlvbnMsIHtcbiAgICAgICAgICAgIHJlZ0V4cDogbmV3IFJlZ0V4cChmcm96ZW4ub3B0aW9ucy5yZWdFeHApLFxuICAgICAgICAgIH0pIDpcbiAgICAgICAgICBmcm96ZW4ub3B0aW9ucyxcbiAgICAgICAgZnJvemVuLnJhbmdlLFxuICAgICAgICBmcm96ZW4udmFsdWVSYW5nZSxcbiAgICAgICk7XG4gICAgfSxcbiAgfSxcblxuICBvcHRpb25hbCxcblxuICB3YXJuaW5ncyxcbn0pO1xuXG5jb25zdCBDb21tb25Kc1JlcXVpcmVEZXBlbmRlbmN5ID0gcmVxdWlyZSgnd2VicGFjay9saWIvZGVwZW5kZW5jaWVzL0NvbW1vbkpzUmVxdWlyZURlcGVuZGVuY3knKTtcbmNvbnN0IENvbW1vbkpzUmVxdWlyZURlcGVuZGVuY3lTZXJpYWwgPSBzZXJpYWwuc2VyaWFsKCdDb21tb25Kc1JlcXVpcmVEZXBlbmRlbmN5Jywge1xuICBjb25zdHJ1Y3Rvcjoge1xuICAgIGZyZWV6ZShfLCBkZXBlbmRlbmN5LCBleHRyYSwgbWV0aG9kcykge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgcmVxdWVzdDogcmVsYXRlQ29udGV4dC5yZWxhdGVBYnNvbHV0ZVJlcXVlc3QoZXh0cmEubW9kdWxlLmNvbnRleHQsIGRlcGVuZGVuY3kucmVxdWVzdCksXG4gICAgICAgIHJhbmdlOiBkZXBlbmRlbmN5LnJhbmdlLFxuICAgICAgfTtcbiAgICB9LFxuICAgIHRoYXcodGhhd2VkLCBmcm96ZW4sIGV4dHJhLCBtZXRob2RzKSB7XG4gICAgICByZXR1cm4gbmV3IENvbW1vbkpzUmVxdWlyZURlcGVuZGVuY3koXG4gICAgICAgIGZyb3plbi5yZXF1ZXN0LFxuICAgICAgICBmcm96ZW4ucmFuZ2UsXG4gICAgICApO1xuICAgIH0sXG4gIH0sXG5cbiAgb3B0aW9uYWwsXG5cbiAgd2FybmluZ3MsXG59KTtcblxuY29uc3QgQ29uc3REZXBlbmRlbmN5ID0gcmVxdWlyZSgnd2VicGFjay9saWIvZGVwZW5kZW5jaWVzL0NvbnN0RGVwZW5kZW5jeScpO1xuY29uc3QgQ29uc3REZXBlbmRlbmN5U2VyaWFsID0gc2VyaWFsLnNlcmlhbCgnQ29uc3REZXBlbmRlbmN5Jywge1xuICBjb25zdHJ1Y3Rvcjoge1xuICAgIGZyZWV6ZShfLCBkZXBlbmRlbmN5LCBleHRyYSwgbWV0aG9kcykge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgZXhwcmVzc2lvbjogZGVwZW5kZW5jeS5leHByZXNzaW9uLFxuICAgICAgICByYW5nZTogZGVwZW5kZW5jeS5yYW5nZSxcbiAgICAgICAgcmVxdWlyZVdlYnBhY2tSZXF1aXJlOiBkZXBlbmRlbmN5LnJlcXVpcmVXZWJwYWNrUmVxdWlyZSxcbiAgICAgIH07XG4gICAgfSxcbiAgICB0aGF3KHRoYXdlZCwgZnJvemVuLCBleHRyYSwgbWV0aG9kcykge1xuICAgICAgcmV0dXJuIG5ldyBDb25zdERlcGVuZGVuY3koXG4gICAgICAgIGZyb3plbi5leHByZXNzaW9uLFxuICAgICAgICBmcm96ZW4ucmFuZ2UsXG4gICAgICAgIGZyb3plbi5yZXF1aXJlV2VicGFja1JlcXVpcmUsXG4gICAgICApO1xuICAgIH0sXG4gIH0sXG5cbiAgb3B0aW9uYWwsXG5cbiAgd2FybmluZ3MsXG59KTtcblxuY29uc3QgQ29udGV4dERlcGVuZGVuY3kgPSByZXF1aXJlKCd3ZWJwYWNrL2xpYi9kZXBlbmRlbmNpZXMvQ29udGV4dERlcGVuZGVuY3knKTtcbmNvbnN0IENvbnRleHREZXBlbmRlbmN5U2VyaWFsID0gc2VyaWFsLnNlcmlhbCgnQ29udGV4dERlcGVuZGVuY3knLCB7XG4gIGNvbnN0cnVjdG9yOiB7XG4gICAgZnJlZXplKF8sIGRlcGVuZGVuY3ksIGV4dHJhLCBtZXRob2RzKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBvcHRpb25zOiBkZXBlbmRlbmN5Lm9wdGlvbnMucmVnRXhwID9cbiAgICAgICAgICBPYmplY3QuYXNzaWduKHt9LCBkZXBlbmRlbmN5Lm9wdGlvbnMsIHtcbiAgICAgICAgICAgIHJlZ0V4cDogZGVwZW5kZW5jeS5vcHRpb25zLnJlZ0V4cC5zb3VyY2UsXG4gICAgICAgICAgfSkgOlxuICAgICAgICAgIGRlcGVuZGVuY3kub3B0aW9ucyxcbiAgICAgIH07XG4gICAgfSxcbiAgICB0aGF3KHRoYXdlZCwgZnJvemVuLCBleHRyYSwgbWV0aG9kcykge1xuICAgICAgcmV0dXJuIG5ldyBDb250ZXh0RGVwZW5kZW5jeShcbiAgICAgICAgZnJvemVuLm9wdGlvbnMucmVnRXhwID9cbiAgICAgICAgICBPYmplY3QuYXNzaWduKHt9LCBmcm96ZW4ub3B0aW9ucywge1xuICAgICAgICAgICAgcmVnRXhwOiBuZXcgUmVnRXhwKGZyb3plbi5vcHRpb25zLnJlZ0V4cCksXG4gICAgICAgICAgfSkgOlxuICAgICAgICAgIGZyb3plbi5vcHRpb25zLFxuICAgICAgKTtcbiAgICB9LFxuICB9LFxuXG4gIG9wdGlvbmFsLFxuXG4gIHdhcm5pbmdzLFxufSk7XG5cbmNvbnN0IENvbnRleHRFbGVtZW50RGVwZW5kZW5jeSA9IHJlcXVpcmUoJ3dlYnBhY2svbGliL2RlcGVuZGVuY2llcy9Db250ZXh0RWxlbWVudERlcGVuZGVuY3knKTtcbmNvbnN0IENvbnRleHRFbGVtZW50RGVwZW5kZW5jeVNlcmlhbCA9IHNlcmlhbC5zZXJpYWwoJ0NvbnRleHRFbGVtZW50RGVwZW5kZW5jeScsIHtcbiAgY29uc3RydWN0b3I6IHtcbiAgICBmcmVlemUoXywgZGVwZW5kZW5jeSwgZXh0cmEsIG1ldGhvZHMpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHJlcXVlc3Q6IHJlbGF0ZUNvbnRleHQucmVsYXRlQWJzb2x1dGVSZXF1ZXN0KGV4dHJhLm1vZHVsZS5jb250ZXh0LCBkZXBlbmRlbmN5LnJlcXVlc3QpLFxuICAgICAgICB1c2VyUmVxdWVzdDogcmVsYXRlQ29udGV4dC5yZWxhdGVBYnNvbHV0ZVJlcXVlc3QoZXh0cmEubW9kdWxlLmNvbnRleHQsIGRlcGVuZGVuY3kudXNlclJlcXVlc3QpLFxuICAgICAgfTtcbiAgICB9LFxuICAgIHRoYXcodGhhd2VkLCBmcm96ZW4sIGV4dHJhLCBtZXRob2RzKSB7XG4gICAgICByZXR1cm4gbmV3IENvbnRleHRFbGVtZW50RGVwZW5kZW5jeShcbiAgICAgICAgZnJvemVuLnJlcXVlc3QsXG4gICAgICAgIGZyb3plbi51c2VyUmVxdWVzdCxcbiAgICAgICk7XG4gICAgfSxcbiAgfSxcblxuICBvcHRpb25hbCxcblxuICB3YXJuaW5ncyxcbn0pO1xuXG5jb25zdCBDcml0aWNhbERlcGVuZGVuY3lXYXJuaW5nID0gcmVxdWlyZSgnd2VicGFjay9saWIvZGVwZW5kZW5jaWVzL0NyaXRpY2FsRGVwZW5kZW5jeVdhcm5pbmcnKTtcbmNvbnN0IENyaXRpY2FsRGVwZW5kZW5jeVdhcm5pbmdTZXJpYWwgPSBzZXJpYWwuc2VyaWFsKCdDcml0aWNhbERlcGVuZGVuY3lXYXJuaW5nJywge1xuICBjb25zdHJ1Y3Rvcjoge1xuICAgIGZyZWV6ZShfLCBkZXBlbmRlbmN5LCBleHRyYSwgbWV0aG9kcykge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgbWVzc2FnZTogZGVwZW5kZW5jeS5tZXNzYWdlLFxuICAgICAgfTtcbiAgICB9LFxuICAgIHRoYXcodGhhd2VkLCBmcm96ZW4sIGV4dHJhLCBtZXRob2RzKSB7XG4gICAgICByZXR1cm4gbmV3IENyaXRpY2FsRGVwZW5kZW5jeVdhcm5pbmcoXG4gICAgICAgIGZyb3plbi5tZXNzYWdlLFxuICAgICAgKTtcbiAgICB9LFxuICB9LFxuXG4gIG9wdGlvbmFsLFxuXG4gIHdhcm5pbmdzLFxufSk7XG5cbmNvbnN0IERlbGVnYXRlZEV4cG9ydHNEZXBlbmRlbmN5ID0gcmVxdWlyZSgnd2VicGFjay9saWIvZGVwZW5kZW5jaWVzL0RlbGVnYXRlZEV4cG9ydHNEZXBlbmRlbmN5Jyk7XG5jb25zdCBEZWxlZ2F0ZWRFeHBvcnRzRGVwZW5kZW5jeVNlcmlhbCA9IHNlcmlhbC5zZXJpYWwoJ0RlbGVnYXRlZEV4cG9ydHNEZXBlbmRlbmN5Jywge1xuICBjb25zdHJ1Y3Rvcjoge1xuICAgIGZyZWV6ZShfLCBkZXBlbmRlbmN5LCBleHRyYSwgbWV0aG9kcykge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgb3JpZ2luTW9kdWxlOiBudWxsLFxuICAgICAgICBleHBvcnRzOiBkZXBlbmRlbmN5LmV4cG9ydHMsXG4gICAgICB9O1xuICAgIH0sXG4gICAgdGhhdyh0aGF3ZWQsIGZyb3plbiwgZXh0cmEsIG1ldGhvZHMpIHtcbiAgICAgIHJldHVybiBuZXcgRGVsZWdhdGVkRXhwb3J0c0RlcGVuZGVuY3koXG4gICAgICAgIGV4dHJhLm1vZHVsZSxcbiAgICAgICAgZnJvemVuLmV4cG9ydHMsXG4gICAgICApO1xuICAgIH0sXG4gIH0sXG5cbiAgb3B0aW9uYWwsXG5cbiAgd2FybmluZ3MsXG59KTtcblxuY29uc3QgRGVsZWdhdGVkU291cmNlRGVwZW5kZW5jeSA9IHJlcXVpcmUoJ3dlYnBhY2svbGliL2RlcGVuZGVuY2llcy9EZWxlZ2F0ZWRTb3VyY2VEZXBlbmRlbmN5Jyk7XG5jb25zdCBEZWxlZ2F0ZWRTb3VyY2VEZXBlbmRlbmN5U2VyaWFsID0gc2VyaWFsLnNlcmlhbCgnRGVsZWdhdGVkU291cmNlRGVwZW5kZW5jeScsIHtcbiAgY29uc3RydWN0b3I6IHtcbiAgICBmcmVlemUoXywgZGVwZW5kZW5jeSwgZXh0cmEsIG1ldGhvZHMpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHJlcXVlc3Q6IHJlbGF0ZUNvbnRleHQucmVsYXRlQWJzb2x1dGVSZXF1ZXN0KGV4dHJhLm1vZHVsZS5jb250ZXh0LCBkZXBlbmRlbmN5LnJlcXVlc3QpLFxuICAgICAgfTtcbiAgICB9LFxuICAgIHRoYXcodGhhd2VkLCBmcm96ZW4sIGV4dHJhLCBtZXRob2RzKSB7XG4gICAgICByZXR1cm4gbmV3IERlbGVnYXRlZFNvdXJjZURlcGVuZGVuY3koXG4gICAgICAgIGZyb3plbi5yZXF1ZXN0LFxuICAgICAgKTtcbiAgICB9LFxuICB9LFxuXG4gIG9wdGlvbmFsLFxuXG4gIHdhcm5pbmdzLFxufSk7XG5cbmNvbnN0IERsbEVudHJ5RGVwZW5kZW5jeSA9IHJlcXVpcmUoJ3dlYnBhY2svbGliL2RlcGVuZGVuY2llcy9EbGxFbnRyeURlcGVuZGVuY3knKTtcbmNvbnN0IERsbEVudHJ5RGVwZW5kZW5jeVNlcmlhbCA9IHNlcmlhbC5zZXJpYWwoJ0RsbEVudHJ5RGVwZW5kZW5jeScsIHtcbiAgY29uc3RydWN0b3I6IHtcbiAgICBmcmVlemUoXywgZGVwZW5kZW5jeSwgZXh0cmEsIG1ldGhvZHMpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIGRlcGVuZGVuY2llczogbWV0aG9kcy5tYXBGcmVlemUoJ0RlcGVuZGVuY3knLCBudWxsLCBkZXBlbmRlbmN5LmRlcGVuZGVuY2llcywgZXh0cmEpLFxuICAgICAgICBuYW1lOiBkZXBlbmRlbmN5Lm5hbWUsXG4gICAgICB9O1xuICAgIH0sXG4gICAgdGhhdyh0aGF3ZWQsIGZyb3plbiwgZXh0cmEsIG1ldGhvZHMpIHtcbiAgICAgIHJldHVybiBuZXcgRGxsRW50cnlEZXBlbmRlbmN5KFxuICAgICAgICBtZXRob2RzLm1hcFRoYXcoJ0RlcGVuZGVuY3knLCBudWxsLCBmcm96ZW4uZGVwZW5kZW5jaWVzLCBleHRyYSksXG4gICAgICAgIGZyb3plbi5uYW1lLFxuICAgICAgKTtcbiAgICB9LFxuICB9LFxuXG4gIG9wdGlvbmFsLFxuXG4gIHdhcm5pbmdzLFxufSk7XG5cbmNvbnN0IEhhcm1vbnlBY2NlcHREZXBlbmRlbmN5ID0gcmVxdWlyZSgnd2VicGFjay9saWIvZGVwZW5kZW5jaWVzL0hhcm1vbnlBY2NlcHREZXBlbmRlbmN5Jyk7XG5jb25zdCBIYXJtb255QWNjZXB0RGVwZW5kZW5jeVNlcmlhbCA9IHNlcmlhbC5zZXJpYWwoJ0hhcm1vbnlBY2NlcHREZXBlbmRlbmN5Jywge1xuICBjb25zdHJ1Y3Rvcjoge1xuICAgIGZyZWV6ZShfLCBkZXBlbmRlbmN5LCBleHRyYSwgbWV0aG9kcykge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgcmFuZ2U6IGRlcGVuZGVuY3kucmFuZ2UsXG4gICAgICAgIGRlcGVuZGVuY2llczogbWV0aG9kcy5tYXBGcmVlemUoJ0RlcGVuZGVuY3knLCBudWxsLCBkZXBlbmRlbmN5LmRlcGVuZGVuY2llcywgZXh0cmEpLFxuICAgICAgICBoYXNDYWxsYmFjazogZGVwZW5kZW5jeS5oYXNDYWxsYmFjayxcbiAgICAgIH07XG4gICAgfSxcbiAgICB0aGF3KHRoYXdlZCwgZnJvemVuLCBleHRyYSwgbWV0aG9kcykge1xuICAgICAgcmV0dXJuIG5ldyBIYXJtb255QWNjZXB0RGVwZW5kZW5jeShcbiAgICAgICAgZnJvemVuLnJhbmdlLFxuICAgICAgICBtZXRob2RzLm1hcFRoYXcoJ0RlcGVuZGVuY3knLCBudWxsLCBmcm96ZW4uZGVwZW5kZW5jaWVzLCBleHRyYSksXG4gICAgICAgIGZyb3plbi5oYXNDYWxsYmFjayxcbiAgICAgICk7XG4gICAgfSxcbiAgfSxcblxuICBvcHRpb25hbCxcblxuICB3YXJuaW5ncyxcbn0pO1xuXG5jb25zdCBIYXJtb255QWNjZXB0SW1wb3J0RGVwZW5kZW5jeSA9IHJlcXVpcmUoJ3dlYnBhY2svbGliL2RlcGVuZGVuY2llcy9IYXJtb255QWNjZXB0SW1wb3J0RGVwZW5kZW5jeScpO1xuY29uc3QgSGFybW9ueUFjY2VwdEltcG9ydERlcGVuZGVuY3lTZXJpYWwgPSBzZXJpYWwuc2VyaWFsKCdIYXJtb255QWNjZXB0SW1wb3J0RGVwZW5kZW5jeScsIHtcbiAgY29uc3RydWN0b3I6IHtcbiAgICBmcmVlemUoXywgZGVwZW5kZW5jeSwgZXh0cmEsIG1ldGhvZHMpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHJlcXVlc3Q6IHJlbGF0ZUNvbnRleHQucmVsYXRlQWJzb2x1dGVSZXF1ZXN0KGV4dHJhLm1vZHVsZS5jb250ZXh0LCBkZXBlbmRlbmN5LnJlcXVlc3QpLFxuICAgICAgICBvcmlnaW5Nb2R1bGU6IG51bGwsXG4gICAgICAgIHBhcnNlclNjb3BlOiBudWxsLFxuICAgICAgfTtcbiAgICB9LFxuICAgIHRoYXcodGhhd2VkLCBmcm96ZW4sIGV4dHJhLCBtZXRob2RzKSB7XG4gICAgICBleHRyYS5zdGF0ZS5oYXJtb255UGFyc2VyU2NvcGUgPSBleHRyYS5zdGF0ZS5oYXJtb255UGFyc2VyU2NvcGUgfHwge307XG4gICAgICByZXR1cm4gbmV3IEhhcm1vbnlBY2NlcHRJbXBvcnREZXBlbmRlbmN5KFxuICAgICAgICBmcm96ZW4ucmVxdWVzdCxcbiAgICAgICAgZXh0cmEubW9kdWxlLFxuICAgICAgICBleHRyYS5zdGF0ZS5oYXJtb255UGFyc2VyU2NvcGUsXG4gICAgICApO1xuICAgIH0sXG4gIH0sXG5cbiAgb3B0aW9uYWwsXG5cbiAgd2FybmluZ3MsXG59KTtcblxuY29uc3QgSGFybW9ueUNvbXBhdGliaWxpdHlEZXBlbmRlbmN5ID0gcmVxdWlyZSgnd2VicGFjay9saWIvZGVwZW5kZW5jaWVzL0hhcm1vbnlDb21wYXRpYmlsaXR5RGVwZW5kZW5jeScpO1xuY29uc3QgSGFybW9ueUNvbXBhdGliaWxpdHlEZXBlbmRlbmN5U2VyaWFsID0gc2VyaWFsLnNlcmlhbCgnSGFybW9ueUNvbXBhdGliaWxpdHlEZXBlbmRlbmN5Jywge1xuICBjb25zdHJ1Y3Rvcjoge1xuICAgIGZyZWV6ZShfLCBkZXBlbmRlbmN5LCBleHRyYSwgbWV0aG9kcykge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgb3JpZ2luTW9kdWxlOiBudWxsLFxuICAgICAgfTtcbiAgICB9LFxuICAgIHRoYXcodGhhd2VkLCBmcm96ZW4sIGV4dHJhLCBtZXRob2RzKSB7XG4gICAgICByZXR1cm4gbmV3IEhhcm1vbnlDb21wYXRpYmlsaXR5RGVwZW5kZW5jeShcbiAgICAgICAgZXh0cmEubW9kdWxlLFxuICAgICAgKTtcbiAgICB9LFxuICB9LFxuXG4gIG9wdGlvbmFsLFxuXG4gIHdhcm5pbmdzLFxufSk7XG5cbmNvbnN0IEhhcm1vbnlFeHBvcnRFeHByZXNzaW9uRGVwZW5kZW5jeSA9IHJlcXVpcmUoJ3dlYnBhY2svbGliL2RlcGVuZGVuY2llcy9IYXJtb255RXhwb3J0RXhwcmVzc2lvbkRlcGVuZGVuY3knKTtcbmNvbnN0IEhhcm1vbnlFeHBvcnRFeHByZXNzaW9uRGVwZW5kZW5jeVNlcmlhbCA9IHNlcmlhbC5zZXJpYWwoJ0hhcm1vbnlFeHBvcnRFeHByZXNzaW9uRGVwZW5kZW5jeScsIHtcbiAgY29uc3RydWN0b3I6IHtcbiAgICBmcmVlemUoXywgZGVwZW5kZW5jeSwgZXh0cmEsIG1ldGhvZHMpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIG9yaWdpbk1vZHVsZTogbnVsbCxcbiAgICAgICAgcmFuZ2U6IGRlcGVuZGVuY3kucmFuZ2UsXG4gICAgICAgIHJhbmdlU3RhdGVtZW50OiBkZXBlbmRlbmN5LnJhbmdlU3RhdGVtZW50LFxuICAgICAgfTtcbiAgICB9LFxuICAgIHRoYXcodGhhd2VkLCBmcm96ZW4sIGV4dHJhLCBtZXRob2RzKSB7XG4gICAgICByZXR1cm4gbmV3IEhhcm1vbnlFeHBvcnRFeHByZXNzaW9uRGVwZW5kZW5jeShcbiAgICAgICAgZXh0cmEubW9kdWxlLFxuICAgICAgICBmcm96ZW4ucmFuZ2UsXG4gICAgICAgIGZyb3plbi5yYW5nZVN0YXRlbWVudCxcbiAgICAgICk7XG4gICAgfSxcbiAgfSxcblxuICBvcHRpb25hbCxcblxuICB3YXJuaW5ncyxcbn0pO1xuXG5jb25zdCBIYXJtb255RXhwb3J0SGVhZGVyRGVwZW5kZW5jeSA9IHJlcXVpcmUoJ3dlYnBhY2svbGliL2RlcGVuZGVuY2llcy9IYXJtb255RXhwb3J0SGVhZGVyRGVwZW5kZW5jeScpO1xuY29uc3QgSGFybW9ueUV4cG9ydEhlYWRlckRlcGVuZGVuY3lTZXJpYWwgPSBzZXJpYWwuc2VyaWFsKCdIYXJtb255RXhwb3J0SGVhZGVyRGVwZW5kZW5jeScsIHtcbiAgY29uc3RydWN0b3I6IHtcbiAgICBmcmVlemUoXywgZGVwZW5kZW5jeSwgZXh0cmEsIG1ldGhvZHMpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHJhbmdlOiBkZXBlbmRlbmN5LnJhbmdlLFxuICAgICAgICByYW5nZVN0YXRlbWVudDogZGVwZW5kZW5jeS5yYW5nZVN0YXRlbWVudCxcbiAgICAgIH07XG4gICAgfSxcbiAgICB0aGF3KHRoYXdlZCwgZnJvemVuLCBleHRyYSwgbWV0aG9kcykge1xuICAgICAgcmV0dXJuIG5ldyBIYXJtb255RXhwb3J0SGVhZGVyRGVwZW5kZW5jeShcbiAgICAgICAgZnJvemVuLnJhbmdlLFxuICAgICAgICBmcm96ZW4ucmFuZ2VTdGF0ZW1lbnQsXG4gICAgICApO1xuICAgIH0sXG4gIH0sXG5cbiAgb3B0aW9uYWwsXG5cbiAgd2FybmluZ3MsXG59KTtcblxuY29uc3QgSGFybW9ueUV4cG9ydEltcG9ydGVkU3BlY2lmaWVyRGVwZW5kZW5jeSA9IHJlcXVpcmUoJ3dlYnBhY2svbGliL2RlcGVuZGVuY2llcy9IYXJtb255RXhwb3J0SW1wb3J0ZWRTcGVjaWZpZXJEZXBlbmRlbmN5Jyk7XG5jb25zdCBIYXJtb255RXhwb3J0SW1wb3J0ZWRTcGVjaWZpZXJEZXBlbmRlbmN5U2VyaWFsID0gc2VyaWFsLnNlcmlhbCgnSGFybW9ueUV4cG9ydEltcG9ydGVkU3BlY2lmaWVyRGVwZW5kZW5jeScsIHtcbiAgY29uc3RydWN0b3I6IHtcbiAgICBmcmVlemUoXywgZGVwZW5kZW5jeSwgZXh0cmEsIG1ldGhvZHMpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHJlcXVlc3Q6IHJlbGF0ZUNvbnRleHQucmVsYXRlQWJzb2x1dGVSZXF1ZXN0KGV4dHJhLm1vZHVsZS5jb250ZXh0LCBkZXBlbmRlbmN5LnJlcXVlc3QpLFxuICAgICAgICBvcmlnaW5Nb2R1bGU6IG51bGwsXG4gICAgICAgIHNvdXJjZU9yZGVyOiBkZXBlbmRlbmN5LnNvdXJjZU9yZGVyLFxuICAgICAgICBwYXJzZXJTY29wZTogbnVsbCxcbiAgICAgICAgaWQ6IGRlcGVuZGVuY3kuaWQsXG4gICAgICAgIG5hbWU6IGRlcGVuZGVuY3kubmFtZSxcbiAgICAgICAgYWN0aXZlRXhwb3J0czogbnVsbCxcbiAgICAgICAgb3RoZXJTdGFyRXhwb3J0czogZGVwZW5kZW5jeS5vdGhlclN0YXJFeHBvcnRzID8gJ3N0YXInIDogbnVsbCxcbiAgICAgICAgc3RyaWN0RXhwb3J0UHJlc2VuY2U6IGRlcGVuZGVuY3kuc3RyaWN0RXhwb3J0UHJlc2VuY2UsXG4gICAgICB9O1xuICAgIH0sXG4gICAgdGhhdyh0aGF3ZWQsIGZyb3plbiwgZXh0cmEsIG1ldGhvZHMpIHtcbiAgICAgIGV4dHJhLnN0YXRlLmhhcm1vbnlQYXJzZXJTY29wZSA9IGV4dHJhLnN0YXRlLmhhcm1vbnlQYXJzZXJTY29wZSB8fCB7fTtcbiAgICAgIGV4dHJhLnN0YXRlLmFjdGl2ZUV4cG9ydHMgPSBleHRyYS5zdGF0ZS5hY3RpdmVFeHBvcnRzIHx8IG5ldyBTZXQoKTtcbiAgICAgIGlmIChmcm96ZW4ubmFtZSkge1xuICAgICAgICBleHRyYS5zdGF0ZS5hY3RpdmVFeHBvcnRzLmFkZChmcm96ZW4ubmFtZSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gbmV3IEhhcm1vbnlFeHBvcnRJbXBvcnRlZFNwZWNpZmllckRlcGVuZGVuY3koXG4gICAgICAgIGZyb3plbi5yZXF1ZXN0LFxuICAgICAgICBleHRyYS5tb2R1bGUsXG4gICAgICAgIGZyb3plbi5zb3VyY2VPcmRlcixcbiAgICAgICAgZXh0cmEuc3RhdGUuaGFybW9ueVBhcnNlclNjb3BlLFxuICAgICAgICBmcm96ZW4uaWQsXG4gICAgICAgIGZyb3plbi5uYW1lLFxuICAgICAgICBleHRyYS5zdGF0ZS5hY3RpdmVFeHBvcnRzLFxuICAgICAgICBmcm96ZW4ub3RoZXJTdGFyRXhwb3J0cyA9PT0gJ3N0YXInID9cbiAgICAgICAgICAoZXh0cmEuc3RhdGUub3RoZXJTdGFyRXhwb3J0cyB8fCBbXSkgOlxuICAgICAgICAgIG51bGwsXG4gICAgICAgIGZyb3plbi5zdHJpY3RFeHBvcnRQcmVzZW5jZSxcbiAgICAgICk7XG4gICAgfSxcbiAgfSxcblxuICBvcHRpb25hbCxcblxuICB3YXJuaW5ncyxcblxuICBleHBvcnRJbXBvcnRlZERlcGVuZGVuY3k6IHtcbiAgICBmcmVlemUoZnJvemVuKSB7fSxcbiAgICB0aGF3KHRoYXdlZCwgZnJvemVuLCBleHRyYSkge1xuICAgICAgaWYgKHRoYXdlZC5vdGhlclN0YXJFeHBvcnRzKSB7XG4gICAgICAgIGV4dHJhLnN0YXRlLm90aGVyU3RhckV4cG9ydHMgPSAoXG4gICAgICAgICAgZXh0cmEuc3RhdGUub3RoZXJTdGFyRXhwb3J0cyB8fCBbXVxuICAgICAgICApLmNvbmNhdCh0aGF3ZWQpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHRoYXdlZDtcbiAgICB9LFxuICB9LFxufSk7XG5cbmNvbnN0IEhhcm1vbnlFeHBvcnRTcGVjaWZpZXJEZXBlbmRlbmN5ID0gcmVxdWlyZSgnd2VicGFjay9saWIvZGVwZW5kZW5jaWVzL0hhcm1vbnlFeHBvcnRTcGVjaWZpZXJEZXBlbmRlbmN5Jyk7XG5jb25zdCBIYXJtb255RXhwb3J0U3BlY2lmaWVyRGVwZW5kZW5jeVNlcmlhbCA9IHNlcmlhbC5zZXJpYWwoJ0hhcm1vbnlFeHBvcnRTcGVjaWZpZXJEZXBlbmRlbmN5Jywge1xuICBjb25zdHJ1Y3Rvcjoge1xuICAgIGZyZWV6ZShfLCBkZXBlbmRlbmN5LCBleHRyYSwgbWV0aG9kcykge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgb3JpZ2luTW9kdWxlOiBudWxsLFxuICAgICAgICBpZDogZGVwZW5kZW5jeS5pZCxcbiAgICAgICAgbmFtZTogZGVwZW5kZW5jeS5uYW1lLFxuICAgICAgfTtcbiAgICB9LFxuICAgIHRoYXcodGhhd2VkLCBmcm96ZW4sIGV4dHJhLCBtZXRob2RzKSB7XG4gICAgICByZXR1cm4gbmV3IEhhcm1vbnlFeHBvcnRTcGVjaWZpZXJEZXBlbmRlbmN5KFxuICAgICAgICBleHRyYS5tb2R1bGUsXG4gICAgICAgIGZyb3plbi5pZCxcbiAgICAgICAgZnJvemVuLm5hbWUsXG4gICAgICApO1xuICAgIH0sXG4gIH0sXG5cbiAgb3B0aW9uYWwsXG5cbiAgd2FybmluZ3MsXG59KTtcblxuY29uc3QgSGFybW9ueUltcG9ydERlcGVuZGVuY3kgPSByZXF1aXJlKCd3ZWJwYWNrL2xpYi9kZXBlbmRlbmNpZXMvSGFybW9ueUltcG9ydERlcGVuZGVuY3knKTtcbmNvbnN0IEhhcm1vbnlJbXBvcnREZXBlbmRlbmN5U2VyaWFsID0gc2VyaWFsLnNlcmlhbCgnSGFybW9ueUltcG9ydERlcGVuZGVuY3knLCB7XG4gIGNvbnN0cnVjdG9yOiB7XG4gICAgZnJlZXplKF8sIGRlcGVuZGVuY3ksIGV4dHJhLCBtZXRob2RzKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICByZXF1ZXN0OiByZWxhdGVDb250ZXh0LnJlbGF0ZUFic29sdXRlUmVxdWVzdChleHRyYS5tb2R1bGUuY29udGV4dCwgZGVwZW5kZW5jeS5yZXF1ZXN0KSxcbiAgICAgICAgb3JpZ2luTW9kdWxlOiBudWxsLFxuICAgICAgICBzb3VyY2VPcmRlcjogZGVwZW5kZW5jeS5zb3VyY2VPcmRlcixcbiAgICAgICAgcGFyc2VyU2NvcGU6IG51bGwsXG4gICAgICB9O1xuICAgIH0sXG4gICAgdGhhdyh0aGF3ZWQsIGZyb3plbiwgZXh0cmEsIG1ldGhvZHMpIHtcbiAgICAgIGV4dHJhLnN0YXRlLmhhcm1vbnlQYXJzZXJTY29wZSA9IGV4dHJhLnN0YXRlLmhhcm1vbnlQYXJzZXJTY29wZSB8fCB7fTtcbiAgICAgIHJldHVybiBuZXcgSGFybW9ueUltcG9ydERlcGVuZGVuY3koXG4gICAgICAgIGZyb3plbi5yZXF1ZXN0LFxuICAgICAgICBleHRyYS5tb2R1bGUsXG4gICAgICAgIGZyb3plbi5zb3VyY2VPcmRlcixcbiAgICAgICAgZXh0cmEuc3RhdGUuaGFybW9ueVBhcnNlclNjb3BlLFxuICAgICAgKTtcbiAgICB9LFxuICB9LFxuXG4gIG9wdGlvbmFsLFxuXG4gIHdhcm5pbmdzLFxuXG4gIGltcG9ydERlcGVuZGVuY3k6IHtcbiAgICBmcmVlemUoZnJvemVuKSB7XG4gICAgICByZXR1cm4gZnJvemVuO1xuICAgIH0sXG4gICAgdGhhdyh0aGF3ZWQsIGZyb3plbiwgZXh0cmEpIHtcbiAgICAgIGNvbnN0IHN0YXRlID0gZXh0cmEuc3RhdGU7XG4gICAgICBjb25zdCByZWYgPSBmcm96ZW4ucmFuZ2UudG9TdHJpbmcoKTtcbiAgICAgIGlmIChzdGF0ZS5pbXBvcnRzW3JlZl0pIHtcbiAgICAgICAgcmV0dXJuIHN0YXRlLmltcG9ydHNbcmVmXTtcbiAgICAgIH1cbiAgICAgIHN0YXRlLmltcG9ydHNbcmVmXSA9IHRoYXdlZDtcbiAgICAgIHJldHVybiB0aGF3ZWQ7XG4gICAgfSxcbiAgfSxcbn0pO1xuXG5jb25zdCBIYXJtb255SW1wb3J0U2lkZUVmZmVjdERlcGVuZGVuY3kgPSByZXF1aXJlKCd3ZWJwYWNrL2xpYi9kZXBlbmRlbmNpZXMvSGFybW9ueUltcG9ydFNpZGVFZmZlY3REZXBlbmRlbmN5Jyk7XG5jb25zdCBIYXJtb255SW1wb3J0U2lkZUVmZmVjdERlcGVuZGVuY3lTZXJpYWwgPSBzZXJpYWwuc2VyaWFsKCdIYXJtb255SW1wb3J0U2lkZUVmZmVjdERlcGVuZGVuY3knLCB7XG4gIGNvbnN0cnVjdG9yOiB7XG4gICAgZnJlZXplKF8sIGRlcGVuZGVuY3ksIGV4dHJhLCBtZXRob2RzKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICByZXF1ZXN0OiByZWxhdGVDb250ZXh0LnJlbGF0ZUFic29sdXRlUmVxdWVzdChleHRyYS5tb2R1bGUuY29udGV4dCwgZGVwZW5kZW5jeS5yZXF1ZXN0KSxcbiAgICAgICAgb3JpZ2luTW9kdWxlOiBudWxsLFxuICAgICAgICBzb3VyY2VPcmRlcjogZGVwZW5kZW5jeS5zb3VyY2VPcmRlcixcbiAgICAgICAgcGFyc2VyU2NvcGU6IG51bGwsXG4gICAgICB9O1xuICAgIH0sXG4gICAgdGhhdyh0aGF3ZWQsIGZyb3plbiwgZXh0cmEsIG1ldGhvZHMpIHtcbiAgICAgIGV4dHJhLnN0YXRlLmhhcm1vbnlQYXJzZXJTY29wZSA9IGV4dHJhLnN0YXRlLmhhcm1vbnlQYXJzZXJTY29wZSB8fCB7fTtcbiAgICAgIHJldHVybiBuZXcgSGFybW9ueUltcG9ydFNpZGVFZmZlY3REZXBlbmRlbmN5KFxuICAgICAgICBmcm96ZW4ucmVxdWVzdCxcbiAgICAgICAgZXh0cmEubW9kdWxlLFxuICAgICAgICBmcm96ZW4uc291cmNlT3JkZXIsXG4gICAgICAgIGV4dHJhLnN0YXRlLmhhcm1vbnlQYXJzZXJTY29wZSxcbiAgICAgICk7XG4gICAgfSxcbiAgfSxcblxuICBvcHRpb25hbCxcblxuICB3YXJuaW5ncyxcbn0pO1xuXG5jb25zdCBIYXJtb255SW1wb3J0U3BlY2lmaWVyRGVwZW5kZW5jeSA9IHJlcXVpcmUoJ3dlYnBhY2svbGliL2RlcGVuZGVuY2llcy9IYXJtb255SW1wb3J0U3BlY2lmaWVyRGVwZW5kZW5jeScpO1xuY29uc3QgSGFybW9ueUltcG9ydFNwZWNpZmllckRlcGVuZGVuY3lTZXJpYWwgPSBzZXJpYWwuc2VyaWFsKCdIYXJtb255SW1wb3J0U3BlY2lmaWVyRGVwZW5kZW5jeScsIHtcbiAgY29uc3RydWN0b3I6IHtcbiAgICBmcmVlemUoXywgZGVwZW5kZW5jeSwgZXh0cmEsIG1ldGhvZHMpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHJlcXVlc3Q6IHJlbGF0ZUNvbnRleHQucmVsYXRlQWJzb2x1dGVSZXF1ZXN0KGV4dHJhLm1vZHVsZS5jb250ZXh0LCBkZXBlbmRlbmN5LnJlcXVlc3QpLFxuICAgICAgICBvcmlnaW5Nb2R1bGU6IG51bGwsXG4gICAgICAgIHNvdXJjZU9yZGVyOiBkZXBlbmRlbmN5LnNvdXJjZU9yZGVyLFxuICAgICAgICBwYXJzZXJTY29wZTogbnVsbCxcbiAgICAgICAgaWQ6IGRlcGVuZGVuY3kuaWQsXG4gICAgICAgIG5hbWU6IGRlcGVuZGVuY3kubmFtZSxcbiAgICAgICAgcmFuZ2U6IGRlcGVuZGVuY3kucmFuZ2UsXG4gICAgICAgIHN0cmljdEV4cG9ydFByZXNlbmNlOiBkZXBlbmRlbmN5LnN0cmljdEV4cG9ydFByZXNlbmNlLFxuICAgICAgfTtcbiAgICB9LFxuICAgIHRoYXcodGhhd2VkLCBmcm96ZW4sIGV4dHJhLCBtZXRob2RzKSB7XG4gICAgICBleHRyYS5zdGF0ZS5oYXJtb255UGFyc2VyU2NvcGUgPSBleHRyYS5zdGF0ZS5oYXJtb255UGFyc2VyU2NvcGUgfHwge307XG4gICAgICByZXR1cm4gbmV3IEhhcm1vbnlJbXBvcnRTcGVjaWZpZXJEZXBlbmRlbmN5KFxuICAgICAgICBmcm96ZW4ucmVxdWVzdCxcbiAgICAgICAgZXh0cmEubW9kdWxlLFxuICAgICAgICBmcm96ZW4uc291cmNlT3JkZXIsXG4gICAgICAgIGV4dHJhLnN0YXRlLmhhcm1vbnlQYXJzZXJTY29wZSxcbiAgICAgICAgZnJvemVuLmlkLFxuICAgICAgICBmcm96ZW4ubmFtZSxcbiAgICAgICAgZnJvemVuLnJhbmdlLFxuICAgICAgICBmcm96ZW4uc3RyaWN0RXhwb3J0UHJlc2VuY2UsXG4gICAgICApO1xuICAgIH0sXG4gIH0sXG5cbiAgb3B0aW9uYWwsXG5cbiAgd2FybmluZ3MsXG59KTtcblxuY29uc3QgSGFybW9ueUluaXREZXBlbmRlbmN5ID0gcmVxdWlyZSgnd2VicGFjay9saWIvZGVwZW5kZW5jaWVzL0hhcm1vbnlJbml0RGVwZW5kZW5jeScpO1xuY29uc3QgSGFybW9ueUluaXREZXBlbmRlbmN5U2VyaWFsID0gc2VyaWFsLnNlcmlhbCgnSGFybW9ueUluaXREZXBlbmRlbmN5Jywge1xuICBjb25zdHJ1Y3Rvcjoge1xuICAgIGZyZWV6ZShfLCBkZXBlbmRlbmN5LCBleHRyYSwgbWV0aG9kcykge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgb3JpZ2luTW9kdWxlOiBudWxsLFxuICAgICAgfTtcbiAgICB9LFxuICAgIHRoYXcodGhhd2VkLCBmcm96ZW4sIGV4dHJhLCBtZXRob2RzKSB7XG4gICAgICByZXR1cm4gbmV3IEhhcm1vbnlJbml0RGVwZW5kZW5jeShcbiAgICAgICAgZXh0cmEubW9kdWxlLFxuICAgICAgKTtcbiAgICB9LFxuICB9LFxuXG4gIG9wdGlvbmFsLFxuXG4gIHdhcm5pbmdzLFxufSk7XG5cbmNvbnN0IEltcG9ydENvbnRleHREZXBlbmRlbmN5ID0gcmVxdWlyZSgnd2VicGFjay9saWIvZGVwZW5kZW5jaWVzL0ltcG9ydENvbnRleHREZXBlbmRlbmN5Jyk7XG5jb25zdCBJbXBvcnRDb250ZXh0RGVwZW5kZW5jeVNlcmlhbCA9IHNlcmlhbC5zZXJpYWwoJ0ltcG9ydENvbnRleHREZXBlbmRlbmN5Jywge1xuICBjb25zdHJ1Y3Rvcjoge1xuICAgIGZyZWV6ZShfLCBkZXBlbmRlbmN5LCBleHRyYSwgbWV0aG9kcykge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgb3B0aW9uczogZGVwZW5kZW5jeS5vcHRpb25zLnJlZ0V4cCA/XG4gICAgICAgICAgT2JqZWN0LmFzc2lnbih7fSwgZGVwZW5kZW5jeS5vcHRpb25zLCB7XG4gICAgICAgICAgICByZWdFeHA6IGRlcGVuZGVuY3kub3B0aW9ucy5yZWdFeHAuc291cmNlLFxuICAgICAgICAgIH0pIDpcbiAgICAgICAgICBkZXBlbmRlbmN5Lm9wdGlvbnMsXG4gICAgICAgIHJhbmdlOiBkZXBlbmRlbmN5LnJhbmdlLFxuICAgICAgICB2YWx1ZVJhbmdlOiBkZXBlbmRlbmN5LnZhbHVlUmFuZ2UsXG4gICAgICB9O1xuICAgIH0sXG4gICAgdGhhdyh0aGF3ZWQsIGZyb3plbiwgZXh0cmEsIG1ldGhvZHMpIHtcbiAgICAgIHJldHVybiBuZXcgSW1wb3J0Q29udGV4dERlcGVuZGVuY3koXG4gICAgICAgIGZyb3plbi5vcHRpb25zLnJlZ0V4cCA/XG4gICAgICAgICAgT2JqZWN0LmFzc2lnbih7fSwgZnJvemVuLm9wdGlvbnMsIHtcbiAgICAgICAgICAgIHJlZ0V4cDogbmV3IFJlZ0V4cChmcm96ZW4ub3B0aW9ucy5yZWdFeHApLFxuICAgICAgICAgIH0pIDpcbiAgICAgICAgICBmcm96ZW4ub3B0aW9ucyxcbiAgICAgICAgZnJvemVuLnJhbmdlLFxuICAgICAgICBmcm96ZW4udmFsdWVSYW5nZSxcbiAgICAgICk7XG4gICAgfSxcbiAgfSxcblxuICBvcHRpb25hbCxcblxuICB3YXJuaW5ncyxcbn0pO1xuXG5jb25zdCBJbXBvcnREZXBlbmRlbmN5ID0gcmVxdWlyZSgnd2VicGFjay9saWIvZGVwZW5kZW5jaWVzL0ltcG9ydERlcGVuZGVuY3knKTtcbmNvbnN0IEltcG9ydERlcGVuZGVuY3lTZXJpYWwgPSBzZXJpYWwuc2VyaWFsKCdJbXBvcnREZXBlbmRlbmN5Jywge1xuICBjb25zdHJ1Y3Rvcjoge1xuICAgIGZyZWV6ZShfLCBkZXBlbmRlbmN5LCBleHRyYSwgbWV0aG9kcykge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgcmVxdWVzdDogcmVsYXRlQ29udGV4dC5yZWxhdGVBYnNvbHV0ZVJlcXVlc3QoZXh0cmEubW9kdWxlLmNvbnRleHQsIGRlcGVuZGVuY3kucmVxdWVzdCksXG4gICAgICAgIG9yaWdpbk1vZHVsZTogbnVsbCxcbiAgICAgICAgYmxvY2s6ICFkZXBlbmRlbmN5LmJsb2NrLmRlcGVuZGVuY2llcy5pbmNsdWRlcyhkZXBlbmRlbmN5KSA/XG4gICAgICAgICAgbWV0aG9kcy5mcmVlemUoJ0RlcGVuZGVuY3lCbG9jaycsIG51bGwsIGRlcGVuZGVuY3kuYmxvY2ssIGV4dHJhKSA6XG4gICAgICAgICAgdW5kZWZpbmVkLFxuICAgICAgfTtcbiAgICB9LFxuICAgIHRoYXcodGhhd2VkLCBmcm96ZW4sIGV4dHJhLCBtZXRob2RzKSB7XG4gICAgICByZXR1cm4gbmV3IEltcG9ydERlcGVuZGVuY3koXG4gICAgICAgIGZyb3plbi5yZXF1ZXN0LFxuICAgICAgICBleHRyYS5tb2R1bGUsXG4gICAgICAgICFmcm96ZW4uYmxvY2sgPyBleHRyYS5wYXJlbnQgOiBtZXRob2RzLnRoYXcoJ0RlcGVuZGVuY3lCbG9jaycsIG51bGwsIGZyb3plbi5ibG9jaywgZXh0cmEpLFxuICAgICAgKTtcbiAgICB9LFxuICB9LFxuXG4gIG9wdGlvbmFsLFxuXG4gIHdhcm5pbmdzLFxufSk7XG5cbmNvbnN0IEltcG9ydEVhZ2VyRGVwZW5kZW5jeSA9IHJlcXVpcmUoJ3dlYnBhY2svbGliL2RlcGVuZGVuY2llcy9JbXBvcnRFYWdlckRlcGVuZGVuY3knKTtcbmNvbnN0IEltcG9ydEVhZ2VyRGVwZW5kZW5jeVNlcmlhbCA9IHNlcmlhbC5zZXJpYWwoJ0ltcG9ydEVhZ2VyRGVwZW5kZW5jeScsIHtcbiAgY29uc3RydWN0b3I6IHtcbiAgICBmcmVlemUoXywgZGVwZW5kZW5jeSwgZXh0cmEsIG1ldGhvZHMpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHJlcXVlc3Q6IHJlbGF0ZUNvbnRleHQucmVsYXRlQWJzb2x1dGVSZXF1ZXN0KGV4dHJhLm1vZHVsZS5jb250ZXh0LCBkZXBlbmRlbmN5LnJlcXVlc3QpLFxuICAgICAgICBvcmlnaW5Nb2R1bGU6IG51bGwsXG4gICAgICAgIHJhbmdlOiBkZXBlbmRlbmN5LnJhbmdlLFxuICAgICAgfTtcbiAgICB9LFxuICAgIHRoYXcodGhhd2VkLCBmcm96ZW4sIGV4dHJhLCBtZXRob2RzKSB7XG4gICAgICByZXR1cm4gbmV3IEltcG9ydEVhZ2VyRGVwZW5kZW5jeShcbiAgICAgICAgZnJvemVuLnJlcXVlc3QsXG4gICAgICAgIGV4dHJhLm1vZHVsZSxcbiAgICAgICAgZnJvemVuLnJhbmdlLFxuICAgICAgKTtcbiAgICB9LFxuICB9LFxuXG4gIG9wdGlvbmFsLFxuXG4gIHdhcm5pbmdzLFxufSk7XG5cbmNvbnN0IEltcG9ydFdlYWtEZXBlbmRlbmN5ID0gcmVxdWlyZSgnd2VicGFjay9saWIvZGVwZW5kZW5jaWVzL0ltcG9ydFdlYWtEZXBlbmRlbmN5Jyk7XG5jb25zdCBJbXBvcnRXZWFrRGVwZW5kZW5jeVNlcmlhbCA9IHNlcmlhbC5zZXJpYWwoJ0ltcG9ydFdlYWtEZXBlbmRlbmN5Jywge1xuICBjb25zdHJ1Y3Rvcjoge1xuICAgIGZyZWV6ZShfLCBkZXBlbmRlbmN5LCBleHRyYSwgbWV0aG9kcykge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgcmVxdWVzdDogcmVsYXRlQ29udGV4dC5yZWxhdGVBYnNvbHV0ZVJlcXVlc3QoZXh0cmEubW9kdWxlLmNvbnRleHQsIGRlcGVuZGVuY3kucmVxdWVzdCksXG4gICAgICAgIG9yaWdpbk1vZHVsZTogbnVsbCxcbiAgICAgICAgcmFuZ2U6IGRlcGVuZGVuY3kucmFuZ2UsXG4gICAgICB9O1xuICAgIH0sXG4gICAgdGhhdyh0aGF3ZWQsIGZyb3plbiwgZXh0cmEsIG1ldGhvZHMpIHtcbiAgICAgIHJldHVybiBuZXcgSW1wb3J0V2Vha0RlcGVuZGVuY3koXG4gICAgICAgIGZyb3plbi5yZXF1ZXN0LFxuICAgICAgICBleHRyYS5tb2R1bGUsXG4gICAgICAgIGZyb3plbi5yYW5nZSxcbiAgICAgICk7XG4gICAgfSxcbiAgfSxcblxuICBvcHRpb25hbCxcblxuICB3YXJuaW5ncyxcbn0pO1xuXG5jb25zdCBKc29uRXhwb3J0c0RlcGVuZGVuY3kgPSByZXF1aXJlKCd3ZWJwYWNrL2xpYi9kZXBlbmRlbmNpZXMvSnNvbkV4cG9ydHNEZXBlbmRlbmN5Jyk7XG5jb25zdCBKc29uRXhwb3J0c0RlcGVuZGVuY3lTZXJpYWwgPSBzZXJpYWwuc2VyaWFsKCdKc29uRXhwb3J0c0RlcGVuZGVuY3knLCB7XG4gIGNvbnN0cnVjdG9yOiB7XG4gICAgZnJlZXplKF8sIGRlcGVuZGVuY3ksIGV4dHJhLCBtZXRob2RzKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBleHBvcnRzOiBkZXBlbmRlbmN5LmV4cG9ydHMsXG4gICAgICB9O1xuICAgIH0sXG4gICAgdGhhdyh0aGF3ZWQsIGZyb3plbiwgZXh0cmEsIG1ldGhvZHMpIHtcbiAgICAgIHJldHVybiBuZXcgSnNvbkV4cG9ydHNEZXBlbmRlbmN5KFxuICAgICAgICBmcm96ZW4uZXhwb3J0cyxcbiAgICAgICk7XG4gICAgfSxcbiAgfSxcblxuICBvcHRpb25hbCxcblxuICB3YXJuaW5ncyxcbn0pO1xuXG5jb25zdCBMb2FkZXJEZXBlbmRlbmN5ID0gcmVxdWlyZSgnd2VicGFjay9saWIvZGVwZW5kZW5jaWVzL0xvYWRlckRlcGVuZGVuY3knKTtcbmNvbnN0IExvYWRlckRlcGVuZGVuY3lTZXJpYWwgPSBzZXJpYWwuc2VyaWFsKCdMb2FkZXJEZXBlbmRlbmN5Jywge1xuICBjb25zdHJ1Y3Rvcjoge1xuICAgIGZyZWV6ZShfLCBkZXBlbmRlbmN5LCBleHRyYSwgbWV0aG9kcykge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgcmVxdWVzdDogcmVsYXRlQ29udGV4dC5yZWxhdGVBYnNvbHV0ZVJlcXVlc3QoZXh0cmEubW9kdWxlLmNvbnRleHQsIGRlcGVuZGVuY3kucmVxdWVzdCksXG4gICAgICB9O1xuICAgIH0sXG4gICAgdGhhdyh0aGF3ZWQsIGZyb3plbiwgZXh0cmEsIG1ldGhvZHMpIHtcbiAgICAgIHJldHVybiBuZXcgTG9hZGVyRGVwZW5kZW5jeShcbiAgICAgICAgZnJvemVuLnJlcXVlc3QsXG4gICAgICApO1xuICAgIH0sXG4gIH0sXG5cbiAgb3B0aW9uYWwsXG5cbiAgd2FybmluZ3MsXG59KTtcblxuY29uc3QgTG9jYWxNb2R1bGVEZXBlbmRlbmN5ID0gcmVxdWlyZSgnd2VicGFjay9saWIvZGVwZW5kZW5jaWVzL0xvY2FsTW9kdWxlRGVwZW5kZW5jeScpO1xuY29uc3QgTG9jYWxNb2R1bGVEZXBlbmRlbmN5U2VyaWFsID0gc2VyaWFsLnNlcmlhbCgnTG9jYWxNb2R1bGVEZXBlbmRlbmN5Jywge1xuICBjb25zdHJ1Y3Rvcjoge1xuICAgIGZyZWV6ZShfLCBkZXBlbmRlbmN5LCBleHRyYSwgbWV0aG9kcykge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgbG9jYWxNb2R1bGU6IHtcbiAgICAgICAgICBuYW1lOiBkZXBlbmRlbmN5LmxvY2FsTW9kdWxlLm5hbWUsXG4gICAgICAgICAgbmFtZTogZGVwZW5kZW5jeS5sb2NhbE1vZHVsZS5pZHgsXG4gICAgICAgIH0sXG4gICAgICAgIHJhbmdlOiBkZXBlbmRlbmN5LnJhbmdlLFxuICAgICAgICBjYWxsTmV3OiBkZXBlbmRlbmN5LmNhbGxOZXcsXG4gICAgICB9O1xuICAgIH0sXG4gICAgdGhhdyh0aGF3ZWQsIGZyb3plbiwgZXh0cmEsIG1ldGhvZHMpIHtcbiAgICAgIGlmICghZXh0cmEuc3RhdGUubG9jYWxNb2R1bGVzKSB7XG4gICAgICAgIGV4dHJhLnN0YXRlLmxvY2FsTW9kdWxlcyA9IFtdO1xuICAgICAgfVxuICAgICAgaWYgKCFleHRyYS5zdGF0ZS5sb2NhbE1vZHVsZXNbZnJvemVuLmxvY2FsTW9kdWxlLmlkeF0pIHtcbiAgICAgICAgZXh0cmEuc3RhdGUubG9jYWxNb2R1bGVzW2Zyb3plbi5sb2NhbE1vZHVsZS5pZHhdID0gbmV3IExvY2FsTW9kdWxlKGV4dHJhLm1vZHVsZSwgZnJvemVuLmxvY2FsTW9kdWxlLm5hbWUsIGZyb3plbi5sb2NhbE1vZHVsZS5pZHgpO1xuICAgICAgICBleHRyYS5zdGF0ZS5sb2NhbE1vZHVsZXNbZnJvemVuLmxvY2FsTW9kdWxlLmlkeF0udXNlZCA9IGZyb3plbi5sb2NhbE1vZHVsZS51c2VkO1xuICAgICAgfVxuICAgICAgcmV0dXJuIG5ldyBMb2NhbE1vZHVsZURlcGVuZGVuY3koXG4gICAgICAgIGV4dHJhLnN0YXRlLmxvY2FsTW9kdWxlc1tmcm96ZW4ubG9jYWxNb2R1bGUuaWR4XSxcbiAgICAgICAgZnJvemVuLnJhbmdlLFxuICAgICAgICBmcm96ZW4uY2FsbE5ldyxcbiAgICAgICk7XG4gICAgfSxcbiAgfSxcblxuICBvcHRpb25hbCxcblxuICBsb2NhbE1vZHVsZUFzc2lnbmVkLFxuXG4gIHdhcm5pbmdzLFxufSk7XG5cbmNvbnN0IE1vZHVsZURlcGVuZGVuY3kgPSByZXF1aXJlKCd3ZWJwYWNrL2xpYi9kZXBlbmRlbmNpZXMvTW9kdWxlRGVwZW5kZW5jeScpO1xuY29uc3QgTW9kdWxlRGVwZW5kZW5jeVNlcmlhbCA9IHNlcmlhbC5zZXJpYWwoJ01vZHVsZURlcGVuZGVuY3knLCB7XG4gIGNvbnN0cnVjdG9yOiB7XG4gICAgZnJlZXplKF8sIGRlcGVuZGVuY3ksIGV4dHJhLCBtZXRob2RzKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICByZXF1ZXN0OiByZWxhdGVDb250ZXh0LnJlbGF0ZUFic29sdXRlUmVxdWVzdChleHRyYS5tb2R1bGUuY29udGV4dCwgZGVwZW5kZW5jeS5yZXF1ZXN0KSxcbiAgICAgIH07XG4gICAgfSxcbiAgICB0aGF3KHRoYXdlZCwgZnJvemVuLCBleHRyYSwgbWV0aG9kcykge1xuICAgICAgcmV0dXJuIG5ldyBNb2R1bGVEZXBlbmRlbmN5KFxuICAgICAgICBmcm96ZW4ucmVxdWVzdCxcbiAgICAgICk7XG4gICAgfSxcbiAgfSxcblxuICBvcHRpb25hbCxcblxuICB3YXJuaW5ncyxcbn0pO1xuXG5jb25zdCBNb2R1bGVIb3RBY2NlcHREZXBlbmRlbmN5ID0gcmVxdWlyZSgnd2VicGFjay9saWIvZGVwZW5kZW5jaWVzL01vZHVsZUhvdEFjY2VwdERlcGVuZGVuY3knKTtcbmNvbnN0IE1vZHVsZUhvdEFjY2VwdERlcGVuZGVuY3lTZXJpYWwgPSBzZXJpYWwuc2VyaWFsKCdNb2R1bGVIb3RBY2NlcHREZXBlbmRlbmN5Jywge1xuICBjb25zdHJ1Y3Rvcjoge1xuICAgIGZyZWV6ZShfLCBkZXBlbmRlbmN5LCBleHRyYSwgbWV0aG9kcykge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgcmVxdWVzdDogcmVsYXRlQ29udGV4dC5yZWxhdGVBYnNvbHV0ZVJlcXVlc3QoZXh0cmEubW9kdWxlLmNvbnRleHQsIGRlcGVuZGVuY3kucmVxdWVzdCksXG4gICAgICAgIHJhbmdlOiBkZXBlbmRlbmN5LnJhbmdlLFxuICAgICAgfTtcbiAgICB9LFxuICAgIHRoYXcodGhhd2VkLCBmcm96ZW4sIGV4dHJhLCBtZXRob2RzKSB7XG4gICAgICByZXR1cm4gbmV3IE1vZHVsZUhvdEFjY2VwdERlcGVuZGVuY3koXG4gICAgICAgIGZyb3plbi5yZXF1ZXN0LFxuICAgICAgICBmcm96ZW4ucmFuZ2UsXG4gICAgICApO1xuICAgIH0sXG4gIH0sXG5cbiAgb3B0aW9uYWwsXG5cbiAgd2FybmluZ3MsXG59KTtcblxuY29uc3QgTW9kdWxlSG90RGVjbGluZURlcGVuZGVuY3kgPSByZXF1aXJlKCd3ZWJwYWNrL2xpYi9kZXBlbmRlbmNpZXMvTW9kdWxlSG90RGVjbGluZURlcGVuZGVuY3knKTtcbmNvbnN0IE1vZHVsZUhvdERlY2xpbmVEZXBlbmRlbmN5U2VyaWFsID0gc2VyaWFsLnNlcmlhbCgnTW9kdWxlSG90RGVjbGluZURlcGVuZGVuY3knLCB7XG4gIGNvbnN0cnVjdG9yOiB7XG4gICAgZnJlZXplKF8sIGRlcGVuZGVuY3ksIGV4dHJhLCBtZXRob2RzKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICByZXF1ZXN0OiByZWxhdGVDb250ZXh0LnJlbGF0ZUFic29sdXRlUmVxdWVzdChleHRyYS5tb2R1bGUuY29udGV4dCwgZGVwZW5kZW5jeS5yZXF1ZXN0KSxcbiAgICAgICAgcmFuZ2U6IGRlcGVuZGVuY3kucmFuZ2UsXG4gICAgICB9O1xuICAgIH0sXG4gICAgdGhhdyh0aGF3ZWQsIGZyb3plbiwgZXh0cmEsIG1ldGhvZHMpIHtcbiAgICAgIHJldHVybiBuZXcgTW9kdWxlSG90RGVjbGluZURlcGVuZGVuY3koXG4gICAgICAgIGZyb3plbi5yZXF1ZXN0LFxuICAgICAgICBmcm96ZW4ucmFuZ2UsXG4gICAgICApO1xuICAgIH0sXG4gIH0sXG5cbiAgb3B0aW9uYWwsXG5cbiAgd2FybmluZ3MsXG59KTtcblxuY29uc3QgTXVsdGlFbnRyeURlcGVuZGVuY3kgPSByZXF1aXJlKCd3ZWJwYWNrL2xpYi9kZXBlbmRlbmNpZXMvTXVsdGlFbnRyeURlcGVuZGVuY3knKTtcbmNvbnN0IE11bHRpRW50cnlEZXBlbmRlbmN5U2VyaWFsID0gc2VyaWFsLnNlcmlhbCgnTXVsdGlFbnRyeURlcGVuZGVuY3knLCB7XG4gIGNvbnN0cnVjdG9yOiB7XG4gICAgZnJlZXplKF8sIGRlcGVuZGVuY3ksIGV4dHJhLCBtZXRob2RzKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBkZXBlbmRlbmNpZXM6IG1ldGhvZHMubWFwRnJlZXplKCdEZXBlbmRlbmN5JywgbnVsbCwgZGVwZW5kZW5jeS5kZXBlbmRlbmNpZXMsIGV4dHJhKSxcbiAgICAgICAgbmFtZTogZGVwZW5kZW5jeS5uYW1lLFxuICAgICAgfTtcbiAgICB9LFxuICAgIHRoYXcodGhhd2VkLCBmcm96ZW4sIGV4dHJhLCBtZXRob2RzKSB7XG4gICAgICByZXR1cm4gbmV3IE11bHRpRW50cnlEZXBlbmRlbmN5KFxuICAgICAgICBtZXRob2RzLm1hcFRoYXcoJ0RlcGVuZGVuY3knLCBudWxsLCBmcm96ZW4uZGVwZW5kZW5jaWVzLCBleHRyYSksXG4gICAgICAgIGZyb3plbi5uYW1lLFxuICAgICAgKTtcbiAgICB9LFxuICB9LFxuXG4gIG9wdGlvbmFsLFxuXG4gIHdhcm5pbmdzLFxufSk7XG5cbmNvbnN0IE51bGxEZXBlbmRlbmN5ID0gcmVxdWlyZSgnd2VicGFjay9saWIvZGVwZW5kZW5jaWVzL051bGxEZXBlbmRlbmN5Jyk7XG5jb25zdCBOdWxsRGVwZW5kZW5jeVNlcmlhbCA9IHNlcmlhbC5zZXJpYWwoJ051bGxEZXBlbmRlbmN5Jywge1xuICBjb25zdHJ1Y3Rvcjoge1xuICAgIGZyZWV6ZShfLCBkZXBlbmRlbmN5LCBleHRyYSwgbWV0aG9kcykge1xuICAgICAgcmV0dXJuIHtcbiAgICAgIH07XG4gICAgfSxcbiAgICB0aGF3KHRoYXdlZCwgZnJvemVuLCBleHRyYSwgbWV0aG9kcykge1xuICAgICAgcmV0dXJuIG5ldyBOdWxsRGVwZW5kZW5jeShcbiAgICAgICk7XG4gICAgfSxcbiAgfSxcblxuICBvcHRpb25hbCxcblxuICB3YXJuaW5ncyxcbn0pO1xuXG5jb25zdCBQcmVmZXRjaERlcGVuZGVuY3kgPSByZXF1aXJlKCd3ZWJwYWNrL2xpYi9kZXBlbmRlbmNpZXMvUHJlZmV0Y2hEZXBlbmRlbmN5Jyk7XG5jb25zdCBQcmVmZXRjaERlcGVuZGVuY3lTZXJpYWwgPSBzZXJpYWwuc2VyaWFsKCdQcmVmZXRjaERlcGVuZGVuY3knLCB7XG4gIGNvbnN0cnVjdG9yOiB7XG4gICAgZnJlZXplKF8sIGRlcGVuZGVuY3ksIGV4dHJhLCBtZXRob2RzKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICByZXF1ZXN0OiByZWxhdGVDb250ZXh0LnJlbGF0ZUFic29sdXRlUmVxdWVzdChleHRyYS5tb2R1bGUuY29udGV4dCwgZGVwZW5kZW5jeS5yZXF1ZXN0KSxcbiAgICAgIH07XG4gICAgfSxcbiAgICB0aGF3KHRoYXdlZCwgZnJvemVuLCBleHRyYSwgbWV0aG9kcykge1xuICAgICAgcmV0dXJuIG5ldyBQcmVmZXRjaERlcGVuZGVuY3koXG4gICAgICAgIGZyb3plbi5yZXF1ZXN0LFxuICAgICAgKTtcbiAgICB9LFxuICB9LFxuXG4gIG9wdGlvbmFsLFxuXG4gIHdhcm5pbmdzLFxufSk7XG5cbmNvbnN0IFJlcXVpcmVDb250ZXh0RGVwZW5kZW5jeSA9IHJlcXVpcmUoJ3dlYnBhY2svbGliL2RlcGVuZGVuY2llcy9SZXF1aXJlQ29udGV4dERlcGVuZGVuY3knKTtcbmNvbnN0IFJlcXVpcmVDb250ZXh0RGVwZW5kZW5jeVNlcmlhbCA9IHNlcmlhbC5zZXJpYWwoJ1JlcXVpcmVDb250ZXh0RGVwZW5kZW5jeScsIHtcbiAgY29uc3RydWN0b3I6IHtcbiAgICBmcmVlemUoXywgZGVwZW5kZW5jeSwgZXh0cmEsIG1ldGhvZHMpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIG9wdGlvbnM6IGRlcGVuZGVuY3kub3B0aW9ucy5yZWdFeHAgP1xuICAgICAgICAgIE9iamVjdC5hc3NpZ24oe30sIGRlcGVuZGVuY3kub3B0aW9ucywge1xuICAgICAgICAgICAgcmVnRXhwOiBkZXBlbmRlbmN5Lm9wdGlvbnMucmVnRXhwLnNvdXJjZSxcbiAgICAgICAgICB9KSA6XG4gICAgICAgICAgZGVwZW5kZW5jeS5vcHRpb25zLFxuICAgICAgICByYW5nZTogZGVwZW5kZW5jeS5yYW5nZSxcbiAgICAgIH07XG4gICAgfSxcbiAgICB0aGF3KHRoYXdlZCwgZnJvemVuLCBleHRyYSwgbWV0aG9kcykge1xuICAgICAgcmV0dXJuIG5ldyBSZXF1aXJlQ29udGV4dERlcGVuZGVuY3koXG4gICAgICAgIGZyb3plbi5vcHRpb25zLnJlZ0V4cCA/XG4gICAgICAgICAgT2JqZWN0LmFzc2lnbih7fSwgZnJvemVuLm9wdGlvbnMsIHtcbiAgICAgICAgICAgIHJlZ0V4cDogbmV3IFJlZ0V4cChmcm96ZW4ub3B0aW9ucy5yZWdFeHApLFxuICAgICAgICAgIH0pIDpcbiAgICAgICAgICBmcm96ZW4ub3B0aW9ucyxcbiAgICAgICAgZnJvemVuLnJhbmdlLFxuICAgICAgKTtcbiAgICB9LFxuICB9LFxuXG4gIG9wdGlvbmFsLFxuXG4gIHdhcm5pbmdzLFxufSk7XG5cbmNvbnN0IFJlcXVpcmVFbnN1cmVEZXBlbmRlbmN5ID0gcmVxdWlyZSgnd2VicGFjay9saWIvZGVwZW5kZW5jaWVzL1JlcXVpcmVFbnN1cmVEZXBlbmRlbmN5Jyk7XG5jb25zdCBSZXF1aXJlRW5zdXJlRGVwZW5kZW5jeVNlcmlhbCA9IHNlcmlhbC5zZXJpYWwoJ1JlcXVpcmVFbnN1cmVEZXBlbmRlbmN5Jywge1xuICBjb25zdHJ1Y3Rvcjoge1xuICAgIGZyZWV6ZShfLCBkZXBlbmRlbmN5LCBleHRyYSwgbWV0aG9kcykge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgYmxvY2s6ICFkZXBlbmRlbmN5LmJsb2NrLmRlcGVuZGVuY2llcy5pbmNsdWRlcyhkZXBlbmRlbmN5KSA/XG4gICAgICAgICAgbWV0aG9kcy5mcmVlemUoJ0RlcGVuZGVuY3lCbG9jaycsIG51bGwsIGRlcGVuZGVuY3kuYmxvY2ssIGV4dHJhKSA6XG4gICAgICAgICAgdW5kZWZpbmVkLFxuICAgICAgfTtcbiAgICB9LFxuICAgIHRoYXcodGhhd2VkLCBmcm96ZW4sIGV4dHJhLCBtZXRob2RzKSB7XG4gICAgICByZXR1cm4gbmV3IFJlcXVpcmVFbnN1cmVEZXBlbmRlbmN5KFxuICAgICAgICAhZnJvemVuLmJsb2NrID8gZXh0cmEucGFyZW50IDogbWV0aG9kcy50aGF3KCdEZXBlbmRlbmN5QmxvY2snLCBudWxsLCBmcm96ZW4uYmxvY2ssIGV4dHJhKSxcbiAgICAgICk7XG4gICAgfSxcbiAgfSxcblxuICBvcHRpb25hbCxcblxuICB3YXJuaW5ncyxcbn0pO1xuXG5jb25zdCBSZXF1aXJlRW5zdXJlSXRlbURlcGVuZGVuY3kgPSByZXF1aXJlKCd3ZWJwYWNrL2xpYi9kZXBlbmRlbmNpZXMvUmVxdWlyZUVuc3VyZUl0ZW1EZXBlbmRlbmN5Jyk7XG5jb25zdCBSZXF1aXJlRW5zdXJlSXRlbURlcGVuZGVuY3lTZXJpYWwgPSBzZXJpYWwuc2VyaWFsKCdSZXF1aXJlRW5zdXJlSXRlbURlcGVuZGVuY3knLCB7XG4gIGNvbnN0cnVjdG9yOiB7XG4gICAgZnJlZXplKF8sIGRlcGVuZGVuY3ksIGV4dHJhLCBtZXRob2RzKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICByZXF1ZXN0OiByZWxhdGVDb250ZXh0LnJlbGF0ZUFic29sdXRlUmVxdWVzdChleHRyYS5tb2R1bGUuY29udGV4dCwgZGVwZW5kZW5jeS5yZXF1ZXN0KSxcbiAgICAgIH07XG4gICAgfSxcbiAgICB0aGF3KHRoYXdlZCwgZnJvemVuLCBleHRyYSwgbWV0aG9kcykge1xuICAgICAgcmV0dXJuIG5ldyBSZXF1aXJlRW5zdXJlSXRlbURlcGVuZGVuY3koXG4gICAgICAgIGZyb3plbi5yZXF1ZXN0LFxuICAgICAgKTtcbiAgICB9LFxuICB9LFxuXG4gIG9wdGlvbmFsLFxuXG4gIHdhcm5pbmdzLFxufSk7XG5cbmNvbnN0IFJlcXVpcmVIZWFkZXJEZXBlbmRlbmN5ID0gcmVxdWlyZSgnd2VicGFjay9saWIvZGVwZW5kZW5jaWVzL1JlcXVpcmVIZWFkZXJEZXBlbmRlbmN5Jyk7XG5jb25zdCBSZXF1aXJlSGVhZGVyRGVwZW5kZW5jeVNlcmlhbCA9IHNlcmlhbC5zZXJpYWwoJ1JlcXVpcmVIZWFkZXJEZXBlbmRlbmN5Jywge1xuICBjb25zdHJ1Y3Rvcjoge1xuICAgIGZyZWV6ZShfLCBkZXBlbmRlbmN5LCBleHRyYSwgbWV0aG9kcykge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgcmFuZ2U6IGRlcGVuZGVuY3kucmFuZ2UsXG4gICAgICB9O1xuICAgIH0sXG4gICAgdGhhdyh0aGF3ZWQsIGZyb3plbiwgZXh0cmEsIG1ldGhvZHMpIHtcbiAgICAgIHJldHVybiBuZXcgUmVxdWlyZUhlYWRlckRlcGVuZGVuY3koXG4gICAgICAgIGZyb3plbi5yYW5nZSxcbiAgICAgICk7XG4gICAgfSxcbiAgfSxcblxuICBvcHRpb25hbCxcblxuICB3YXJuaW5ncyxcbn0pO1xuXG5jb25zdCBSZXF1aXJlSW5jbHVkZURlcGVuZGVuY3kgPSByZXF1aXJlKCd3ZWJwYWNrL2xpYi9kZXBlbmRlbmNpZXMvUmVxdWlyZUluY2x1ZGVEZXBlbmRlbmN5Jyk7XG5jb25zdCBSZXF1aXJlSW5jbHVkZURlcGVuZGVuY3lTZXJpYWwgPSBzZXJpYWwuc2VyaWFsKCdSZXF1aXJlSW5jbHVkZURlcGVuZGVuY3knLCB7XG4gIGNvbnN0cnVjdG9yOiB7XG4gICAgZnJlZXplKF8sIGRlcGVuZGVuY3ksIGV4dHJhLCBtZXRob2RzKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICByZXF1ZXN0OiByZWxhdGVDb250ZXh0LnJlbGF0ZUFic29sdXRlUmVxdWVzdChleHRyYS5tb2R1bGUuY29udGV4dCwgZGVwZW5kZW5jeS5yZXF1ZXN0KSxcbiAgICAgICAgcmFuZ2U6IGRlcGVuZGVuY3kucmFuZ2UsXG4gICAgICB9O1xuICAgIH0sXG4gICAgdGhhdyh0aGF3ZWQsIGZyb3plbiwgZXh0cmEsIG1ldGhvZHMpIHtcbiAgICAgIHJldHVybiBuZXcgUmVxdWlyZUluY2x1ZGVEZXBlbmRlbmN5KFxuICAgICAgICBmcm96ZW4ucmVxdWVzdCxcbiAgICAgICAgZnJvemVuLnJhbmdlLFxuICAgICAgKTtcbiAgICB9LFxuICB9LFxuXG4gIG9wdGlvbmFsLFxuXG4gIHdhcm5pbmdzLFxufSk7XG5cbmNvbnN0IFJlcXVpcmVSZXNvbHZlQ29udGV4dERlcGVuZGVuY3kgPSByZXF1aXJlKCd3ZWJwYWNrL2xpYi9kZXBlbmRlbmNpZXMvUmVxdWlyZVJlc29sdmVDb250ZXh0RGVwZW5kZW5jeScpO1xuY29uc3QgUmVxdWlyZVJlc29sdmVDb250ZXh0RGVwZW5kZW5jeVNlcmlhbCA9IHNlcmlhbC5zZXJpYWwoJ1JlcXVpcmVSZXNvbHZlQ29udGV4dERlcGVuZGVuY3knLCB7XG4gIGNvbnN0cnVjdG9yOiB7XG4gICAgZnJlZXplKF8sIGRlcGVuZGVuY3ksIGV4dHJhLCBtZXRob2RzKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBvcHRpb25zOiBkZXBlbmRlbmN5Lm9wdGlvbnMucmVnRXhwID9cbiAgICAgICAgICBPYmplY3QuYXNzaWduKHt9LCBkZXBlbmRlbmN5Lm9wdGlvbnMsIHtcbiAgICAgICAgICAgIHJlZ0V4cDogZGVwZW5kZW5jeS5vcHRpb25zLnJlZ0V4cC5zb3VyY2UsXG4gICAgICAgICAgfSkgOlxuICAgICAgICAgIGRlcGVuZGVuY3kub3B0aW9ucyxcbiAgICAgICAgcmFuZ2U6IGRlcGVuZGVuY3kucmFuZ2UsXG4gICAgICAgIHZhbHVlUmFuZ2U6IGRlcGVuZGVuY3kudmFsdWVSYW5nZSxcbiAgICAgIH07XG4gICAgfSxcbiAgICB0aGF3KHRoYXdlZCwgZnJvemVuLCBleHRyYSwgbWV0aG9kcykge1xuICAgICAgcmV0dXJuIG5ldyBSZXF1aXJlUmVzb2x2ZUNvbnRleHREZXBlbmRlbmN5KFxuICAgICAgICBmcm96ZW4ub3B0aW9ucy5yZWdFeHAgP1xuICAgICAgICAgIE9iamVjdC5hc3NpZ24oe30sIGZyb3plbi5vcHRpb25zLCB7XG4gICAgICAgICAgICByZWdFeHA6IG5ldyBSZWdFeHAoZnJvemVuLm9wdGlvbnMucmVnRXhwKSxcbiAgICAgICAgICB9KSA6XG4gICAgICAgICAgZnJvemVuLm9wdGlvbnMsXG4gICAgICAgIGZyb3plbi5yYW5nZSxcbiAgICAgICAgZnJvemVuLnZhbHVlUmFuZ2UsXG4gICAgICApO1xuICAgIH0sXG4gIH0sXG5cbiAgb3B0aW9uYWwsXG5cbiAgd2FybmluZ3MsXG59KTtcblxuY29uc3QgUmVxdWlyZVJlc29sdmVEZXBlbmRlbmN5ID0gcmVxdWlyZSgnd2VicGFjay9saWIvZGVwZW5kZW5jaWVzL1JlcXVpcmVSZXNvbHZlRGVwZW5kZW5jeScpO1xuY29uc3QgUmVxdWlyZVJlc29sdmVEZXBlbmRlbmN5U2VyaWFsID0gc2VyaWFsLnNlcmlhbCgnUmVxdWlyZVJlc29sdmVEZXBlbmRlbmN5Jywge1xuICBjb25zdHJ1Y3Rvcjoge1xuICAgIGZyZWV6ZShfLCBkZXBlbmRlbmN5LCBleHRyYSwgbWV0aG9kcykge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgcmVxdWVzdDogcmVsYXRlQ29udGV4dC5yZWxhdGVBYnNvbHV0ZVJlcXVlc3QoZXh0cmEubW9kdWxlLmNvbnRleHQsIGRlcGVuZGVuY3kucmVxdWVzdCksXG4gICAgICAgIHJhbmdlOiBkZXBlbmRlbmN5LnJhbmdlLFxuICAgICAgfTtcbiAgICB9LFxuICAgIHRoYXcodGhhd2VkLCBmcm96ZW4sIGV4dHJhLCBtZXRob2RzKSB7XG4gICAgICByZXR1cm4gbmV3IFJlcXVpcmVSZXNvbHZlRGVwZW5kZW5jeShcbiAgICAgICAgZnJvemVuLnJlcXVlc3QsXG4gICAgICAgIGZyb3plbi5yYW5nZSxcbiAgICAgICk7XG4gICAgfSxcbiAgfSxcblxuICBvcHRpb25hbCxcblxuICB3YXJuaW5ncyxcbn0pO1xuXG5jb25zdCBSZXF1aXJlUmVzb2x2ZUhlYWRlckRlcGVuZGVuY3kgPSByZXF1aXJlKCd3ZWJwYWNrL2xpYi9kZXBlbmRlbmNpZXMvUmVxdWlyZVJlc29sdmVIZWFkZXJEZXBlbmRlbmN5Jyk7XG5jb25zdCBSZXF1aXJlUmVzb2x2ZUhlYWRlckRlcGVuZGVuY3lTZXJpYWwgPSBzZXJpYWwuc2VyaWFsKCdSZXF1aXJlUmVzb2x2ZUhlYWRlckRlcGVuZGVuY3knLCB7XG4gIGNvbnN0cnVjdG9yOiB7XG4gICAgZnJlZXplKF8sIGRlcGVuZGVuY3ksIGV4dHJhLCBtZXRob2RzKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICByYW5nZTogZGVwZW5kZW5jeS5yYW5nZSxcbiAgICAgIH07XG4gICAgfSxcbiAgICB0aGF3KHRoYXdlZCwgZnJvemVuLCBleHRyYSwgbWV0aG9kcykge1xuICAgICAgcmV0dXJuIG5ldyBSZXF1aXJlUmVzb2x2ZUhlYWRlckRlcGVuZGVuY3koXG4gICAgICAgIGZyb3plbi5yYW5nZSxcbiAgICAgICk7XG4gICAgfSxcbiAgfSxcblxuICBvcHRpb25hbCxcblxuICB3YXJuaW5ncyxcbn0pO1xuXG5jb25zdCBTaW5nbGVFbnRyeURlcGVuZGVuY3kgPSByZXF1aXJlKCd3ZWJwYWNrL2xpYi9kZXBlbmRlbmNpZXMvU2luZ2xlRW50cnlEZXBlbmRlbmN5Jyk7XG5jb25zdCBTaW5nbGVFbnRyeURlcGVuZGVuY3lTZXJpYWwgPSBzZXJpYWwuc2VyaWFsKCdTaW5nbGVFbnRyeURlcGVuZGVuY3knLCB7XG4gIGNvbnN0cnVjdG9yOiB7XG4gICAgZnJlZXplKF8sIGRlcGVuZGVuY3ksIGV4dHJhLCBtZXRob2RzKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICByZXF1ZXN0OiByZWxhdGVDb250ZXh0LnJlbGF0ZUFic29sdXRlUmVxdWVzdChleHRyYS5tb2R1bGUuY29udGV4dCwgZGVwZW5kZW5jeS5yZXF1ZXN0KSxcbiAgICAgIH07XG4gICAgfSxcbiAgICB0aGF3KHRoYXdlZCwgZnJvemVuLCBleHRyYSwgbWV0aG9kcykge1xuICAgICAgcmV0dXJuIG5ldyBTaW5nbGVFbnRyeURlcGVuZGVuY3koXG4gICAgICAgIGZyb3plbi5yZXF1ZXN0LFxuICAgICAgKTtcbiAgICB9LFxuICB9LFxuXG4gIG9wdGlvbmFsLFxuXG4gIHdhcm5pbmdzLFxufSk7XG5cbmNvbnN0IFVuc3VwcG9ydGVkRGVwZW5kZW5jeSA9IHJlcXVpcmUoJ3dlYnBhY2svbGliL2RlcGVuZGVuY2llcy9VbnN1cHBvcnRlZERlcGVuZGVuY3knKTtcbmNvbnN0IFVuc3VwcG9ydGVkRGVwZW5kZW5jeVNlcmlhbCA9IHNlcmlhbC5zZXJpYWwoJ1Vuc3VwcG9ydGVkRGVwZW5kZW5jeScsIHtcbiAgY29uc3RydWN0b3I6IHtcbiAgICBmcmVlemUoXywgZGVwZW5kZW5jeSwgZXh0cmEsIG1ldGhvZHMpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHJlcXVlc3Q6IHJlbGF0ZUNvbnRleHQucmVsYXRlQWJzb2x1dGVSZXF1ZXN0KGV4dHJhLm1vZHVsZS5jb250ZXh0LCBkZXBlbmRlbmN5LnJlcXVlc3QpLFxuICAgICAgICByYW5nZTogZGVwZW5kZW5jeS5yYW5nZSxcbiAgICAgIH07XG4gICAgfSxcbiAgICB0aGF3KHRoYXdlZCwgZnJvemVuLCBleHRyYSwgbWV0aG9kcykge1xuICAgICAgcmV0dXJuIG5ldyBVbnN1cHBvcnRlZERlcGVuZGVuY3koXG4gICAgICAgIGZyb3plbi5yZXF1ZXN0LFxuICAgICAgICBmcm96ZW4ucmFuZ2UsXG4gICAgICApO1xuICAgIH0sXG4gIH0sXG5cbiAgb3B0aW9uYWwsXG5cbiAgd2FybmluZ3MsXG59KTtcblxuY29uc3QgV2ViQXNzZW1ibHlJbXBvcnREZXBlbmRlbmN5ID0gcmVxdWlyZSgnd2VicGFjay9saWIvZGVwZW5kZW5jaWVzL1dlYkFzc2VtYmx5SW1wb3J0RGVwZW5kZW5jeScpO1xuY29uc3QgV2ViQXNzZW1ibHlJbXBvcnREZXBlbmRlbmN5U2VyaWFsID0gc2VyaWFsLnNlcmlhbCgnV2ViQXNzZW1ibHlJbXBvcnREZXBlbmRlbmN5Jywge1xuICBjb25zdHJ1Y3Rvcjoge1xuICAgIGZyZWV6ZShfLCBkZXBlbmRlbmN5LCBleHRyYSwgbWV0aG9kcykge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgcmVxdWVzdDogcmVsYXRlQ29udGV4dC5yZWxhdGVBYnNvbHV0ZVJlcXVlc3QoZXh0cmEubW9kdWxlLmNvbnRleHQsIGRlcGVuZGVuY3kucmVxdWVzdCksXG4gICAgICAgIG5hbWU6IGRlcGVuZGVuY3kubmFtZSxcbiAgICAgICAgZGVzY3JpcHRpb246IGRlcGVuZGVuY3kuZGVzY3JpcHRpb24sXG4gICAgICAgIG9ubHlEaXJlY3RJbXBvcnQ6IGRlcGVuZGVuY3kub25seURpcmVjdEltcG9ydCxcbiAgICAgIH07XG4gICAgfSxcbiAgICB0aGF3KHRoYXdlZCwgZnJvemVuLCBleHRyYSwgbWV0aG9kcykge1xuICAgICAgcmV0dXJuIG5ldyBXZWJBc3NlbWJseUltcG9ydERlcGVuZGVuY3koXG4gICAgICAgIGZyb3plbi5yZXF1ZXN0LFxuICAgICAgICBmcm96ZW4ubmFtZSxcbiAgICAgICAgZnJvemVuLmRlc2NyaXB0aW9uLFxuICAgICAgICBmcm96ZW4ub25seURpcmVjdEltcG9ydCxcbiAgICAgICk7XG4gICAgfSxcbiAgfSxcblxuICBvcHRpb25hbCxcblxuICB3YXJuaW5ncyxcbn0pO1xuXG5leHBvcnRzLm1hcCA9IG5ldyBNYXAoKTtcbmV4cG9ydHMuQU1ERGVmaW5lRGVwZW5kZW5jeSA9IEFNRERlZmluZURlcGVuZGVuY3lTZXJpYWw7XG5leHBvcnRzLm1hcC5zZXQoQU1ERGVmaW5lRGVwZW5kZW5jeSwgQU1ERGVmaW5lRGVwZW5kZW5jeVNlcmlhbCk7XG5leHBvcnRzLkFNRFJlcXVpcmVBcnJheURlcGVuZGVuY3kgPSBBTURSZXF1aXJlQXJyYXlEZXBlbmRlbmN5U2VyaWFsO1xuZXhwb3J0cy5tYXAuc2V0KEFNRFJlcXVpcmVBcnJheURlcGVuZGVuY3ksIEFNRFJlcXVpcmVBcnJheURlcGVuZGVuY3lTZXJpYWwpO1xuZXhwb3J0cy5BTURSZXF1aXJlQ29udGV4dERlcGVuZGVuY3kgPSBBTURSZXF1aXJlQ29udGV4dERlcGVuZGVuY3lTZXJpYWw7XG5leHBvcnRzLm1hcC5zZXQoQU1EUmVxdWlyZUNvbnRleHREZXBlbmRlbmN5LCBBTURSZXF1aXJlQ29udGV4dERlcGVuZGVuY3lTZXJpYWwpO1xuZXhwb3J0cy5BTURSZXF1aXJlRGVwZW5kZW5jeSA9IEFNRFJlcXVpcmVEZXBlbmRlbmN5U2VyaWFsO1xuZXhwb3J0cy5tYXAuc2V0KEFNRFJlcXVpcmVEZXBlbmRlbmN5LCBBTURSZXF1aXJlRGVwZW5kZW5jeVNlcmlhbCk7XG5leHBvcnRzLkFNRFJlcXVpcmVJdGVtRGVwZW5kZW5jeSA9IEFNRFJlcXVpcmVJdGVtRGVwZW5kZW5jeVNlcmlhbDtcbmV4cG9ydHMubWFwLnNldChBTURSZXF1aXJlSXRlbURlcGVuZGVuY3ksIEFNRFJlcXVpcmVJdGVtRGVwZW5kZW5jeVNlcmlhbCk7XG5leHBvcnRzLkNvbW1vbkpzUmVxdWlyZUNvbnRleHREZXBlbmRlbmN5ID0gQ29tbW9uSnNSZXF1aXJlQ29udGV4dERlcGVuZGVuY3lTZXJpYWw7XG5leHBvcnRzLm1hcC5zZXQoQ29tbW9uSnNSZXF1aXJlQ29udGV4dERlcGVuZGVuY3ksIENvbW1vbkpzUmVxdWlyZUNvbnRleHREZXBlbmRlbmN5U2VyaWFsKTtcbmV4cG9ydHMuQ29tbW9uSnNSZXF1aXJlRGVwZW5kZW5jeSA9IENvbW1vbkpzUmVxdWlyZURlcGVuZGVuY3lTZXJpYWw7XG5leHBvcnRzLm1hcC5zZXQoQ29tbW9uSnNSZXF1aXJlRGVwZW5kZW5jeSwgQ29tbW9uSnNSZXF1aXJlRGVwZW5kZW5jeVNlcmlhbCk7XG5leHBvcnRzLkNvbnN0RGVwZW5kZW5jeSA9IENvbnN0RGVwZW5kZW5jeVNlcmlhbDtcbmV4cG9ydHMubWFwLnNldChDb25zdERlcGVuZGVuY3ksIENvbnN0RGVwZW5kZW5jeVNlcmlhbCk7XG5leHBvcnRzLkNvbnRleHREZXBlbmRlbmN5ID0gQ29udGV4dERlcGVuZGVuY3lTZXJpYWw7XG5leHBvcnRzLm1hcC5zZXQoQ29udGV4dERlcGVuZGVuY3ksIENvbnRleHREZXBlbmRlbmN5U2VyaWFsKTtcbmV4cG9ydHMuQ29udGV4dEVsZW1lbnREZXBlbmRlbmN5ID0gQ29udGV4dEVsZW1lbnREZXBlbmRlbmN5U2VyaWFsO1xuZXhwb3J0cy5tYXAuc2V0KENvbnRleHRFbGVtZW50RGVwZW5kZW5jeSwgQ29udGV4dEVsZW1lbnREZXBlbmRlbmN5U2VyaWFsKTtcbmV4cG9ydHMuQ3JpdGljYWxEZXBlbmRlbmN5V2FybmluZyA9IENyaXRpY2FsRGVwZW5kZW5jeVdhcm5pbmdTZXJpYWw7XG5leHBvcnRzLm1hcC5zZXQoQ3JpdGljYWxEZXBlbmRlbmN5V2FybmluZywgQ3JpdGljYWxEZXBlbmRlbmN5V2FybmluZ1NlcmlhbCk7XG5leHBvcnRzLkRlbGVnYXRlZEV4cG9ydHNEZXBlbmRlbmN5ID0gRGVsZWdhdGVkRXhwb3J0c0RlcGVuZGVuY3lTZXJpYWw7XG5leHBvcnRzLm1hcC5zZXQoRGVsZWdhdGVkRXhwb3J0c0RlcGVuZGVuY3ksIERlbGVnYXRlZEV4cG9ydHNEZXBlbmRlbmN5U2VyaWFsKTtcbmV4cG9ydHMuRGVsZWdhdGVkU291cmNlRGVwZW5kZW5jeSA9IERlbGVnYXRlZFNvdXJjZURlcGVuZGVuY3lTZXJpYWw7XG5leHBvcnRzLm1hcC5zZXQoRGVsZWdhdGVkU291cmNlRGVwZW5kZW5jeSwgRGVsZWdhdGVkU291cmNlRGVwZW5kZW5jeVNlcmlhbCk7XG5leHBvcnRzLkRsbEVudHJ5RGVwZW5kZW5jeSA9IERsbEVudHJ5RGVwZW5kZW5jeVNlcmlhbDtcbmV4cG9ydHMubWFwLnNldChEbGxFbnRyeURlcGVuZGVuY3ksIERsbEVudHJ5RGVwZW5kZW5jeVNlcmlhbCk7XG5leHBvcnRzLkhhcm1vbnlBY2NlcHREZXBlbmRlbmN5ID0gSGFybW9ueUFjY2VwdERlcGVuZGVuY3lTZXJpYWw7XG5leHBvcnRzLm1hcC5zZXQoSGFybW9ueUFjY2VwdERlcGVuZGVuY3ksIEhhcm1vbnlBY2NlcHREZXBlbmRlbmN5U2VyaWFsKTtcbmV4cG9ydHMuSGFybW9ueUFjY2VwdEltcG9ydERlcGVuZGVuY3kgPSBIYXJtb255QWNjZXB0SW1wb3J0RGVwZW5kZW5jeVNlcmlhbDtcbmV4cG9ydHMubWFwLnNldChIYXJtb255QWNjZXB0SW1wb3J0RGVwZW5kZW5jeSwgSGFybW9ueUFjY2VwdEltcG9ydERlcGVuZGVuY3lTZXJpYWwpO1xuZXhwb3J0cy5IYXJtb255Q29tcGF0aWJpbGl0eURlcGVuZGVuY3kgPSBIYXJtb255Q29tcGF0aWJpbGl0eURlcGVuZGVuY3lTZXJpYWw7XG5leHBvcnRzLm1hcC5zZXQoSGFybW9ueUNvbXBhdGliaWxpdHlEZXBlbmRlbmN5LCBIYXJtb255Q29tcGF0aWJpbGl0eURlcGVuZGVuY3lTZXJpYWwpO1xuZXhwb3J0cy5IYXJtb255RXhwb3J0RXhwcmVzc2lvbkRlcGVuZGVuY3kgPSBIYXJtb255RXhwb3J0RXhwcmVzc2lvbkRlcGVuZGVuY3lTZXJpYWw7XG5leHBvcnRzLm1hcC5zZXQoSGFybW9ueUV4cG9ydEV4cHJlc3Npb25EZXBlbmRlbmN5LCBIYXJtb255RXhwb3J0RXhwcmVzc2lvbkRlcGVuZGVuY3lTZXJpYWwpO1xuZXhwb3J0cy5IYXJtb255RXhwb3J0SGVhZGVyRGVwZW5kZW5jeSA9IEhhcm1vbnlFeHBvcnRIZWFkZXJEZXBlbmRlbmN5U2VyaWFsO1xuZXhwb3J0cy5tYXAuc2V0KEhhcm1vbnlFeHBvcnRIZWFkZXJEZXBlbmRlbmN5LCBIYXJtb255RXhwb3J0SGVhZGVyRGVwZW5kZW5jeVNlcmlhbCk7XG5leHBvcnRzLkhhcm1vbnlFeHBvcnRJbXBvcnRlZFNwZWNpZmllckRlcGVuZGVuY3kgPSBIYXJtb255RXhwb3J0SW1wb3J0ZWRTcGVjaWZpZXJEZXBlbmRlbmN5U2VyaWFsO1xuZXhwb3J0cy5tYXAuc2V0KEhhcm1vbnlFeHBvcnRJbXBvcnRlZFNwZWNpZmllckRlcGVuZGVuY3ksIEhhcm1vbnlFeHBvcnRJbXBvcnRlZFNwZWNpZmllckRlcGVuZGVuY3lTZXJpYWwpO1xuZXhwb3J0cy5IYXJtb255RXhwb3J0U3BlY2lmaWVyRGVwZW5kZW5jeSA9IEhhcm1vbnlFeHBvcnRTcGVjaWZpZXJEZXBlbmRlbmN5U2VyaWFsO1xuZXhwb3J0cy5tYXAuc2V0KEhhcm1vbnlFeHBvcnRTcGVjaWZpZXJEZXBlbmRlbmN5LCBIYXJtb255RXhwb3J0U3BlY2lmaWVyRGVwZW5kZW5jeVNlcmlhbCk7XG5leHBvcnRzLkhhcm1vbnlJbXBvcnREZXBlbmRlbmN5ID0gSGFybW9ueUltcG9ydERlcGVuZGVuY3lTZXJpYWw7XG5leHBvcnRzLm1hcC5zZXQoSGFybW9ueUltcG9ydERlcGVuZGVuY3ksIEhhcm1vbnlJbXBvcnREZXBlbmRlbmN5U2VyaWFsKTtcbmV4cG9ydHMuSGFybW9ueUltcG9ydFNpZGVFZmZlY3REZXBlbmRlbmN5ID0gSGFybW9ueUltcG9ydFNpZGVFZmZlY3REZXBlbmRlbmN5U2VyaWFsO1xuZXhwb3J0cy5tYXAuc2V0KEhhcm1vbnlJbXBvcnRTaWRlRWZmZWN0RGVwZW5kZW5jeSwgSGFybW9ueUltcG9ydFNpZGVFZmZlY3REZXBlbmRlbmN5U2VyaWFsKTtcbmV4cG9ydHMuSGFybW9ueUltcG9ydFNwZWNpZmllckRlcGVuZGVuY3kgPSBIYXJtb255SW1wb3J0U3BlY2lmaWVyRGVwZW5kZW5jeVNlcmlhbDtcbmV4cG9ydHMubWFwLnNldChIYXJtb255SW1wb3J0U3BlY2lmaWVyRGVwZW5kZW5jeSwgSGFybW9ueUltcG9ydFNwZWNpZmllckRlcGVuZGVuY3lTZXJpYWwpO1xuZXhwb3J0cy5IYXJtb255SW5pdERlcGVuZGVuY3kgPSBIYXJtb255SW5pdERlcGVuZGVuY3lTZXJpYWw7XG5leHBvcnRzLm1hcC5zZXQoSGFybW9ueUluaXREZXBlbmRlbmN5LCBIYXJtb255SW5pdERlcGVuZGVuY3lTZXJpYWwpO1xuZXhwb3J0cy5JbXBvcnRDb250ZXh0RGVwZW5kZW5jeSA9IEltcG9ydENvbnRleHREZXBlbmRlbmN5U2VyaWFsO1xuZXhwb3J0cy5tYXAuc2V0KEltcG9ydENvbnRleHREZXBlbmRlbmN5LCBJbXBvcnRDb250ZXh0RGVwZW5kZW5jeVNlcmlhbCk7XG5leHBvcnRzLkltcG9ydERlcGVuZGVuY3kgPSBJbXBvcnREZXBlbmRlbmN5U2VyaWFsO1xuZXhwb3J0cy5tYXAuc2V0KEltcG9ydERlcGVuZGVuY3ksIEltcG9ydERlcGVuZGVuY3lTZXJpYWwpO1xuZXhwb3J0cy5JbXBvcnRFYWdlckRlcGVuZGVuY3kgPSBJbXBvcnRFYWdlckRlcGVuZGVuY3lTZXJpYWw7XG5leHBvcnRzLm1hcC5zZXQoSW1wb3J0RWFnZXJEZXBlbmRlbmN5LCBJbXBvcnRFYWdlckRlcGVuZGVuY3lTZXJpYWwpO1xuZXhwb3J0cy5JbXBvcnRXZWFrRGVwZW5kZW5jeSA9IEltcG9ydFdlYWtEZXBlbmRlbmN5U2VyaWFsO1xuZXhwb3J0cy5tYXAuc2V0KEltcG9ydFdlYWtEZXBlbmRlbmN5LCBJbXBvcnRXZWFrRGVwZW5kZW5jeVNlcmlhbCk7XG5leHBvcnRzLkpzb25FeHBvcnRzRGVwZW5kZW5jeSA9IEpzb25FeHBvcnRzRGVwZW5kZW5jeVNlcmlhbDtcbmV4cG9ydHMubWFwLnNldChKc29uRXhwb3J0c0RlcGVuZGVuY3ksIEpzb25FeHBvcnRzRGVwZW5kZW5jeVNlcmlhbCk7XG5leHBvcnRzLkxvYWRlckRlcGVuZGVuY3kgPSBMb2FkZXJEZXBlbmRlbmN5U2VyaWFsO1xuZXhwb3J0cy5tYXAuc2V0KExvYWRlckRlcGVuZGVuY3ksIExvYWRlckRlcGVuZGVuY3lTZXJpYWwpO1xuZXhwb3J0cy5Mb2NhbE1vZHVsZURlcGVuZGVuY3kgPSBMb2NhbE1vZHVsZURlcGVuZGVuY3lTZXJpYWw7XG5leHBvcnRzLm1hcC5zZXQoTG9jYWxNb2R1bGVEZXBlbmRlbmN5LCBMb2NhbE1vZHVsZURlcGVuZGVuY3lTZXJpYWwpO1xuZXhwb3J0cy5Nb2R1bGVEZXBlbmRlbmN5ID0gTW9kdWxlRGVwZW5kZW5jeVNlcmlhbDtcbmV4cG9ydHMubWFwLnNldChNb2R1bGVEZXBlbmRlbmN5LCBNb2R1bGVEZXBlbmRlbmN5U2VyaWFsKTtcbmV4cG9ydHMuTW9kdWxlSG90QWNjZXB0RGVwZW5kZW5jeSA9IE1vZHVsZUhvdEFjY2VwdERlcGVuZGVuY3lTZXJpYWw7XG5leHBvcnRzLm1hcC5zZXQoTW9kdWxlSG90QWNjZXB0RGVwZW5kZW5jeSwgTW9kdWxlSG90QWNjZXB0RGVwZW5kZW5jeVNlcmlhbCk7XG5leHBvcnRzLk1vZHVsZUhvdERlY2xpbmVEZXBlbmRlbmN5ID0gTW9kdWxlSG90RGVjbGluZURlcGVuZGVuY3lTZXJpYWw7XG5leHBvcnRzLm1hcC5zZXQoTW9kdWxlSG90RGVjbGluZURlcGVuZGVuY3ksIE1vZHVsZUhvdERlY2xpbmVEZXBlbmRlbmN5U2VyaWFsKTtcbmV4cG9ydHMuTXVsdGlFbnRyeURlcGVuZGVuY3kgPSBNdWx0aUVudHJ5RGVwZW5kZW5jeVNlcmlhbDtcbmV4cG9ydHMubWFwLnNldChNdWx0aUVudHJ5RGVwZW5kZW5jeSwgTXVsdGlFbnRyeURlcGVuZGVuY3lTZXJpYWwpO1xuZXhwb3J0cy5OdWxsRGVwZW5kZW5jeSA9IE51bGxEZXBlbmRlbmN5U2VyaWFsO1xuZXhwb3J0cy5tYXAuc2V0KE51bGxEZXBlbmRlbmN5LCBOdWxsRGVwZW5kZW5jeVNlcmlhbCk7XG5leHBvcnRzLlByZWZldGNoRGVwZW5kZW5jeSA9IFByZWZldGNoRGVwZW5kZW5jeVNlcmlhbDtcbmV4cG9ydHMubWFwLnNldChQcmVmZXRjaERlcGVuZGVuY3ksIFByZWZldGNoRGVwZW5kZW5jeVNlcmlhbCk7XG5leHBvcnRzLlJlcXVpcmVDb250ZXh0RGVwZW5kZW5jeSA9IFJlcXVpcmVDb250ZXh0RGVwZW5kZW5jeVNlcmlhbDtcbmV4cG9ydHMubWFwLnNldChSZXF1aXJlQ29udGV4dERlcGVuZGVuY3ksIFJlcXVpcmVDb250ZXh0RGVwZW5kZW5jeVNlcmlhbCk7XG5leHBvcnRzLlJlcXVpcmVFbnN1cmVEZXBlbmRlbmN5ID0gUmVxdWlyZUVuc3VyZURlcGVuZGVuY3lTZXJpYWw7XG5leHBvcnRzLm1hcC5zZXQoUmVxdWlyZUVuc3VyZURlcGVuZGVuY3ksIFJlcXVpcmVFbnN1cmVEZXBlbmRlbmN5U2VyaWFsKTtcbmV4cG9ydHMuUmVxdWlyZUVuc3VyZUl0ZW1EZXBlbmRlbmN5ID0gUmVxdWlyZUVuc3VyZUl0ZW1EZXBlbmRlbmN5U2VyaWFsO1xuZXhwb3J0cy5tYXAuc2V0KFJlcXVpcmVFbnN1cmVJdGVtRGVwZW5kZW5jeSwgUmVxdWlyZUVuc3VyZUl0ZW1EZXBlbmRlbmN5U2VyaWFsKTtcbmV4cG9ydHMuUmVxdWlyZUhlYWRlckRlcGVuZGVuY3kgPSBSZXF1aXJlSGVhZGVyRGVwZW5kZW5jeVNlcmlhbDtcbmV4cG9ydHMubWFwLnNldChSZXF1aXJlSGVhZGVyRGVwZW5kZW5jeSwgUmVxdWlyZUhlYWRlckRlcGVuZGVuY3lTZXJpYWwpO1xuZXhwb3J0cy5SZXF1aXJlSW5jbHVkZURlcGVuZGVuY3kgPSBSZXF1aXJlSW5jbHVkZURlcGVuZGVuY3lTZXJpYWw7XG5leHBvcnRzLm1hcC5zZXQoUmVxdWlyZUluY2x1ZGVEZXBlbmRlbmN5LCBSZXF1aXJlSW5jbHVkZURlcGVuZGVuY3lTZXJpYWwpO1xuZXhwb3J0cy5SZXF1aXJlUmVzb2x2ZUNvbnRleHREZXBlbmRlbmN5ID0gUmVxdWlyZVJlc29sdmVDb250ZXh0RGVwZW5kZW5jeVNlcmlhbDtcbmV4cG9ydHMubWFwLnNldChSZXF1aXJlUmVzb2x2ZUNvbnRleHREZXBlbmRlbmN5LCBSZXF1aXJlUmVzb2x2ZUNvbnRleHREZXBlbmRlbmN5U2VyaWFsKTtcbmV4cG9ydHMuUmVxdWlyZVJlc29sdmVEZXBlbmRlbmN5ID0gUmVxdWlyZVJlc29sdmVEZXBlbmRlbmN5U2VyaWFsO1xuZXhwb3J0cy5tYXAuc2V0KFJlcXVpcmVSZXNvbHZlRGVwZW5kZW5jeSwgUmVxdWlyZVJlc29sdmVEZXBlbmRlbmN5U2VyaWFsKTtcbmV4cG9ydHMuUmVxdWlyZVJlc29sdmVIZWFkZXJEZXBlbmRlbmN5ID0gUmVxdWlyZVJlc29sdmVIZWFkZXJEZXBlbmRlbmN5U2VyaWFsO1xuZXhwb3J0cy5tYXAuc2V0KFJlcXVpcmVSZXNvbHZlSGVhZGVyRGVwZW5kZW5jeSwgUmVxdWlyZVJlc29sdmVIZWFkZXJEZXBlbmRlbmN5U2VyaWFsKTtcbmV4cG9ydHMuU2luZ2xlRW50cnlEZXBlbmRlbmN5ID0gU2luZ2xlRW50cnlEZXBlbmRlbmN5U2VyaWFsO1xuZXhwb3J0cy5tYXAuc2V0KFNpbmdsZUVudHJ5RGVwZW5kZW5jeSwgU2luZ2xlRW50cnlEZXBlbmRlbmN5U2VyaWFsKTtcbmV4cG9ydHMuVW5zdXBwb3J0ZWREZXBlbmRlbmN5ID0gVW5zdXBwb3J0ZWREZXBlbmRlbmN5U2VyaWFsO1xuZXhwb3J0cy5tYXAuc2V0KFVuc3VwcG9ydGVkRGVwZW5kZW5jeSwgVW5zdXBwb3J0ZWREZXBlbmRlbmN5U2VyaWFsKTtcbmV4cG9ydHMuV2ViQXNzZW1ibHlJbXBvcnREZXBlbmRlbmN5ID0gV2ViQXNzZW1ibHlJbXBvcnREZXBlbmRlbmN5U2VyaWFsO1xuZXhwb3J0cy5tYXAuc2V0KFdlYkFzc2VtYmx5SW1wb3J0RGVwZW5kZW5jeSwgV2ViQXNzZW1ibHlJbXBvcnREZXBlbmRlbmN5U2VyaWFsKTtcbiJdLCJzb3VyY2VSb290IjoiL1VzZXJzL3R5bGVyYXJidXMvZGV2L3Byb3ZpZGVyL3NyYyJ9

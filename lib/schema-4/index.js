'use strict';

require('source-map-support/register');

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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImhhcmQtc291cmNlLXdlYnBhY2stcGx1Z2luL2xpYi9zY2hlbWEtNC9pbmRleC5qcyJdLCJuYW1lcyI6WyJzZXJpYWwiLCJyZXF1aXJlIiwicmVsYXRlQ29udGV4dCIsIkxvY2FsTW9kdWxlIiwiZmxhdHRlblByb3RvdHlwZSIsIm9iaiIsImNvcHkiLCJrZXkiLCJhc3NpZ25UcnV0aGZ1bCIsImZyZWV6ZSIsImFyZyIsImRlcGVuZGVuY3kiLCJ0aGF3IiwiZnJvemVuIiwiYXNzaWduRGVmaW5lZCIsIm9wdGlvbmFsIiwiYXNzaWduZWQiLCJwcmVwZW5kIiwicmVwbGFjZXMiLCJjcml0aWNhbCIsIm5hbWVzcGFjZU9iamVjdEFzQ29udGV4dCIsImNhbGxBcmdzIiwiY2FsbCIsImRpcmVjdEltcG9ydCIsInNob3J0aGFuZCIsImxvYyIsImxvY2FsTW9kdWxlQXNzaWduZWQiLCJfIiwibG9jYWxNb2R1bGUiLCJuYW1lIiwiaWR4IiwidXNlZCIsInRoYXdlZCIsImV4dHJhIiwic3RhdGUiLCJsb2NhbE1vZHVsZXMiLCJtb2R1bGUiLCJ3YXJuaW5ncyIsImdldFdhcm5pbmdzIiwibGVuZ3RoIiwibWFwIiwic3RhY2siLCJpbmNsdWRlcyIsInNwbGl0IiwiZnJvemVuV2FybmluZ3MiLCJfZ2V0V2FybmluZ3MiLCJ3YXJuaW5nIiwiaSIsIkFNRERlZmluZURlcGVuZGVuY3kiLCJBTUREZWZpbmVEZXBlbmRlbmN5U2VyaWFsIiwiY29uc3RydWN0b3IiLCJtZXRob2RzIiwicmFuZ2UiLCJhcnJheVJhbmdlIiwiZnVuY3Rpb25SYW5nZSIsIm9iamVjdFJhbmdlIiwibmFtZWRNb2R1bGUiLCJBTURSZXF1aXJlQXJyYXlEZXBlbmRlbmN5IiwiQU1EUmVxdWlyZUFycmF5RGVwZW5kZW5jeVNlcmlhbCIsImRlcHNBcnJheSIsIm1hcEZyZWV6ZSIsIm1hcFRoYXciLCJBTURSZXF1aXJlQ29udGV4dERlcGVuZGVuY3kiLCJBTURSZXF1aXJlQ29udGV4dERlcGVuZGVuY3lTZXJpYWwiLCJvcHRpb25zIiwicmVnRXhwIiwiT2JqZWN0IiwiYXNzaWduIiwic291cmNlIiwidmFsdWVSYW5nZSIsIlJlZ0V4cCIsIkFNRFJlcXVpcmVEZXBlbmRlbmN5IiwiQU1EUmVxdWlyZURlcGVuZGVuY3lTZXJpYWwiLCJibG9jayIsImRlcGVuZGVuY2llcyIsInVuZGVmaW5lZCIsInBhcmVudCIsIkFNRFJlcXVpcmVJdGVtRGVwZW5kZW5jeSIsIkFNRFJlcXVpcmVJdGVtRGVwZW5kZW5jeVNlcmlhbCIsInJlcXVlc3QiLCJyZWxhdGVBYnNvbHV0ZVJlcXVlc3QiLCJjb250ZXh0IiwiQ29tbW9uSnNSZXF1aXJlQ29udGV4dERlcGVuZGVuY3kiLCJDb21tb25Kc1JlcXVpcmVDb250ZXh0RGVwZW5kZW5jeVNlcmlhbCIsIkNvbW1vbkpzUmVxdWlyZURlcGVuZGVuY3kiLCJDb21tb25Kc1JlcXVpcmVEZXBlbmRlbmN5U2VyaWFsIiwiQ29uc3REZXBlbmRlbmN5IiwiQ29uc3REZXBlbmRlbmN5U2VyaWFsIiwiZXhwcmVzc2lvbiIsInJlcXVpcmVXZWJwYWNrUmVxdWlyZSIsIkNvbnRleHREZXBlbmRlbmN5IiwiQ29udGV4dERlcGVuZGVuY3lTZXJpYWwiLCJDb250ZXh0RWxlbWVudERlcGVuZGVuY3kiLCJDb250ZXh0RWxlbWVudERlcGVuZGVuY3lTZXJpYWwiLCJ1c2VyUmVxdWVzdCIsIkNyaXRpY2FsRGVwZW5kZW5jeVdhcm5pbmciLCJDcml0aWNhbERlcGVuZGVuY3lXYXJuaW5nU2VyaWFsIiwibWVzc2FnZSIsIkRlbGVnYXRlZEV4cG9ydHNEZXBlbmRlbmN5IiwiRGVsZWdhdGVkRXhwb3J0c0RlcGVuZGVuY3lTZXJpYWwiLCJvcmlnaW5Nb2R1bGUiLCJleHBvcnRzIiwiRGVsZWdhdGVkU291cmNlRGVwZW5kZW5jeSIsIkRlbGVnYXRlZFNvdXJjZURlcGVuZGVuY3lTZXJpYWwiLCJEbGxFbnRyeURlcGVuZGVuY3kiLCJEbGxFbnRyeURlcGVuZGVuY3lTZXJpYWwiLCJIYXJtb255QWNjZXB0RGVwZW5kZW5jeSIsIkhhcm1vbnlBY2NlcHREZXBlbmRlbmN5U2VyaWFsIiwiaGFzQ2FsbGJhY2siLCJIYXJtb255QWNjZXB0SW1wb3J0RGVwZW5kZW5jeSIsIkhhcm1vbnlBY2NlcHRJbXBvcnREZXBlbmRlbmN5U2VyaWFsIiwicGFyc2VyU2NvcGUiLCJoYXJtb255UGFyc2VyU2NvcGUiLCJIYXJtb255Q29tcGF0aWJpbGl0eURlcGVuZGVuY3kiLCJIYXJtb255Q29tcGF0aWJpbGl0eURlcGVuZGVuY3lTZXJpYWwiLCJIYXJtb255RXhwb3J0RXhwcmVzc2lvbkRlcGVuZGVuY3kiLCJIYXJtb255RXhwb3J0RXhwcmVzc2lvbkRlcGVuZGVuY3lTZXJpYWwiLCJyYW5nZVN0YXRlbWVudCIsIkhhcm1vbnlFeHBvcnRIZWFkZXJEZXBlbmRlbmN5IiwiSGFybW9ueUV4cG9ydEhlYWRlckRlcGVuZGVuY3lTZXJpYWwiLCJIYXJtb255RXhwb3J0SW1wb3J0ZWRTcGVjaWZpZXJEZXBlbmRlbmN5IiwiSGFybW9ueUV4cG9ydEltcG9ydGVkU3BlY2lmaWVyRGVwZW5kZW5jeVNlcmlhbCIsInNvdXJjZU9yZGVyIiwiaWQiLCJhY3RpdmVFeHBvcnRzIiwib3RoZXJTdGFyRXhwb3J0cyIsInN0cmljdEV4cG9ydFByZXNlbmNlIiwiU2V0IiwiYWRkIiwiZXhwb3J0SW1wb3J0ZWREZXBlbmRlbmN5IiwiY29uY2F0IiwiSGFybW9ueUV4cG9ydFNwZWNpZmllckRlcGVuZGVuY3kiLCJIYXJtb255RXhwb3J0U3BlY2lmaWVyRGVwZW5kZW5jeVNlcmlhbCIsIkhhcm1vbnlJbXBvcnREZXBlbmRlbmN5IiwiSGFybW9ueUltcG9ydERlcGVuZGVuY3lTZXJpYWwiLCJpbXBvcnREZXBlbmRlbmN5IiwicmVmIiwidG9TdHJpbmciLCJpbXBvcnRzIiwiSGFybW9ueUltcG9ydFNpZGVFZmZlY3REZXBlbmRlbmN5IiwiSGFybW9ueUltcG9ydFNpZGVFZmZlY3REZXBlbmRlbmN5U2VyaWFsIiwiSGFybW9ueUltcG9ydFNwZWNpZmllckRlcGVuZGVuY3kiLCJIYXJtb255SW1wb3J0U3BlY2lmaWVyRGVwZW5kZW5jeVNlcmlhbCIsIkhhcm1vbnlJbml0RGVwZW5kZW5jeSIsIkhhcm1vbnlJbml0RGVwZW5kZW5jeVNlcmlhbCIsIkltcG9ydENvbnRleHREZXBlbmRlbmN5IiwiSW1wb3J0Q29udGV4dERlcGVuZGVuY3lTZXJpYWwiLCJJbXBvcnREZXBlbmRlbmN5IiwiSW1wb3J0RGVwZW5kZW5jeVNlcmlhbCIsIkltcG9ydEVhZ2VyRGVwZW5kZW5jeSIsIkltcG9ydEVhZ2VyRGVwZW5kZW5jeVNlcmlhbCIsIkltcG9ydFdlYWtEZXBlbmRlbmN5IiwiSW1wb3J0V2Vha0RlcGVuZGVuY3lTZXJpYWwiLCJKc29uRXhwb3J0c0RlcGVuZGVuY3kiLCJKc29uRXhwb3J0c0RlcGVuZGVuY3lTZXJpYWwiLCJMb2FkZXJEZXBlbmRlbmN5IiwiTG9hZGVyRGVwZW5kZW5jeVNlcmlhbCIsIkxvY2FsTW9kdWxlRGVwZW5kZW5jeSIsIkxvY2FsTW9kdWxlRGVwZW5kZW5jeVNlcmlhbCIsImNhbGxOZXciLCJNb2R1bGVEZXBlbmRlbmN5IiwiTW9kdWxlRGVwZW5kZW5jeVNlcmlhbCIsIk1vZHVsZUhvdEFjY2VwdERlcGVuZGVuY3kiLCJNb2R1bGVIb3RBY2NlcHREZXBlbmRlbmN5U2VyaWFsIiwiTW9kdWxlSG90RGVjbGluZURlcGVuZGVuY3kiLCJNb2R1bGVIb3REZWNsaW5lRGVwZW5kZW5jeVNlcmlhbCIsIk11bHRpRW50cnlEZXBlbmRlbmN5IiwiTXVsdGlFbnRyeURlcGVuZGVuY3lTZXJpYWwiLCJOdWxsRGVwZW5kZW5jeSIsIk51bGxEZXBlbmRlbmN5U2VyaWFsIiwiUHJlZmV0Y2hEZXBlbmRlbmN5IiwiUHJlZmV0Y2hEZXBlbmRlbmN5U2VyaWFsIiwiUmVxdWlyZUNvbnRleHREZXBlbmRlbmN5IiwiUmVxdWlyZUNvbnRleHREZXBlbmRlbmN5U2VyaWFsIiwiUmVxdWlyZUVuc3VyZURlcGVuZGVuY3kiLCJSZXF1aXJlRW5zdXJlRGVwZW5kZW5jeVNlcmlhbCIsIlJlcXVpcmVFbnN1cmVJdGVtRGVwZW5kZW5jeSIsIlJlcXVpcmVFbnN1cmVJdGVtRGVwZW5kZW5jeVNlcmlhbCIsIlJlcXVpcmVIZWFkZXJEZXBlbmRlbmN5IiwiUmVxdWlyZUhlYWRlckRlcGVuZGVuY3lTZXJpYWwiLCJSZXF1aXJlSW5jbHVkZURlcGVuZGVuY3kiLCJSZXF1aXJlSW5jbHVkZURlcGVuZGVuY3lTZXJpYWwiLCJSZXF1aXJlUmVzb2x2ZUNvbnRleHREZXBlbmRlbmN5IiwiUmVxdWlyZVJlc29sdmVDb250ZXh0RGVwZW5kZW5jeVNlcmlhbCIsIlJlcXVpcmVSZXNvbHZlRGVwZW5kZW5jeSIsIlJlcXVpcmVSZXNvbHZlRGVwZW5kZW5jeVNlcmlhbCIsIlJlcXVpcmVSZXNvbHZlSGVhZGVyRGVwZW5kZW5jeSIsIlJlcXVpcmVSZXNvbHZlSGVhZGVyRGVwZW5kZW5jeVNlcmlhbCIsIlNpbmdsZUVudHJ5RGVwZW5kZW5jeSIsIlNpbmdsZUVudHJ5RGVwZW5kZW5jeVNlcmlhbCIsIlVuc3VwcG9ydGVkRGVwZW5kZW5jeSIsIlVuc3VwcG9ydGVkRGVwZW5kZW5jeVNlcmlhbCIsIldlYkFzc2VtYmx5SW1wb3J0RGVwZW5kZW5jeSIsIldlYkFzc2VtYmx5SW1wb3J0RGVwZW5kZW5jeVNlcmlhbCIsImRlc2NyaXB0aW9uIiwib25seURpcmVjdEltcG9ydCIsIk1hcCIsInNldCJdLCJtYXBwaW5ncyI6Ijs7OztBQUFBLE1BQU1BLFNBQVNDLFFBQVEsZ0JBQVIsQ0FBZjtBQUNBLE1BQU1DLGdCQUFnQkQsUUFBUSx3QkFBUixDQUF0Qjs7QUFFQSxNQUFNRSxjQUFjRixRQUFRLHNDQUFSLENBQXBCOztBQUVBLFNBQVNHLGdCQUFULENBQTBCQyxHQUExQixFQUErQjtBQUM3QixNQUFJLE9BQU9BLEdBQVAsS0FBZSxRQUFuQixFQUE2QjtBQUMzQixXQUFPQSxHQUFQO0FBQ0Q7QUFDRCxRQUFNQyxPQUFPLEVBQWI7QUFDQSxPQUFLLE1BQU1DLEdBQVgsSUFBa0JGLEdBQWxCLEVBQXVCO0FBQ3JCQyxTQUFLQyxH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QztBQUNBNUUsUUFBUTdELEdBQVIsQ0FBWTZKLEdBQVosQ0FBZ0JyQiwyQkFBaEIsRUFBNkNDLGlDQUE3QztBQUNBNUUsUUFBUTZFLHVCQUFSLEdBQWtDQyw2QkFBbEM7QUFDQTlFLFFBQVE3RCxHQUFSLENBQVk2SixHQUFaLENBQWdCbkIsdUJBQWhCLEVBQXlDQyw2QkFBekM7QUFDQTlFLFFBQVErRSx3QkFBUixHQUFtQ0MsOEJBQW5DO0FBQ0FoRixRQUFRN0QsR0FBUixDQUFZNkosR0FBWixDQUFnQmpCLHdCQUFoQixFQUEwQ0MsOEJBQTFDO0FBQ0FoRixRQUFRaUYsK0JBQVIsR0FBMENDLHFDQUExQztBQUNBbEYsUUFBUTdELEdBQVIsQ0FBWTZKLEdBQVosQ0FBZ0JmLCtCQUFoQixFQUFpREMscUNBQWpEO0FBQ0FsRixRQUFRbUYsd0JBQVIsR0FBbUNDLDhCQUFuQztBQUNBcEYsUUFBUTdELEdBQVIsQ0FBWTZKLEdBQVosQ0FBZ0JiLHdCQUFoQixFQUEwQ0MsOEJBQTFDO0FBQ0FwRixRQUFRcUYsOEJBQVIsR0FBeUNDLG9DQUF6QztBQUNBdEYsUUFBUTdELEdBQVIsQ0FBWTZKLEdBQVosQ0FBZ0JYLDhCQUFoQixFQUFnREMsb0NBQWhEO0FBQ0F0RixRQUFRdUYscUJBQVIsR0FBZ0NDLDJCQUFoQztBQUNBeEYsUUFBUTdELEdBQVIsQ0FBWTZKLEdBQVosQ0FBZ0JULHFCQUFoQixFQUF1Q0MsMkJBQXZDO0FBQ0F4RixRQUFReUYscUJBQVIsR0FBZ0NDLDJCQUFoQztBQUNBMUYsUUFBUTdELEdBQVIsQ0FBWTZKLEdBQVosQ0FBZ0JQLHFCQUFoQixFQUF1Q0MsMkJBQXZDO0FBQ0ExRixRQUFRMkYsMkJBQVIsR0FBc0NDLGlDQUF0QztBQUNBNUYsUUFBUTdELEdBQVIsQ0FBWTZKLEdBQVosQ0FBZ0JMLDJCQUFoQixFQUE2Q0MsaUNBQTdDIiwiZmlsZSI6ImhhcmQtc291cmNlLXdlYnBhY2stcGx1Z2luL2xpYi9zY2hlbWEtNC9pbmRleC5qcyIsInNvdXJjZXNDb250ZW50IjpbImNvbnN0IHNlcmlhbCA9IHJlcXVpcmUoJy4uL3V0aWwvc2VyaWFsJyk7XG5jb25zdCByZWxhdGVDb250ZXh0ID0gcmVxdWlyZSgnLi4vdXRpbC9yZWxhdGUtY29udGV4dCcpO1xuXG5jb25zdCBMb2NhbE1vZHVsZSA9IHJlcXVpcmUoJ3dlYnBhY2svbGliL2RlcGVuZGVuY2llcy9Mb2NhbE1vZHVsZScpO1xuXG5mdW5jdGlvbiBmbGF0dGVuUHJvdG90eXBlKG9iaikge1xuICBpZiAodHlwZW9mIG9iaiA9PT0gJ3N0cmluZycpIHtcbiAgICByZXR1cm4gb2JqO1xuICB9XG4gIGNvbnN0IGNvcHkgPSB7fTtcbiAgZm9yIChjb25zdCBrZXkgaW4gb2JqKSB7XG4gICAgY29weVtrZXldID0gb2JqW2tleV07XG4gIH1cbiAgcmV0dXJuIGNvcHk7XG59XG5cbmNvbnN0IGFzc2lnblRydXRoZnVsID0ge1xuICBmcmVlemUoYXJnLCBkZXBlbmRlbmN5KSB7XG4gICAgcmV0dXJuIGFyZztcbiAgfSxcbiAgdGhhdyhhcmcsIGZyb3plbikge1xuICAgIHJldHVybiBhcmc7XG4gIH0sXG59O1xuXG5jb25zdCBhc3NpZ25EZWZpbmVkID0ge1xuICBmcmVlemUoYXJnLCBkZXBlbmRlbmN5KSB7XG4gICAgaWYgKHR5cGVvZiBhcmcgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICByZXR1cm4gYXJnO1xuICAgIH1cbiAgfSxcbiAgdGhhdyhhcmcsIGZyb3plbikge1xuICAgIGlmICh0eXBlb2YgYXJnICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgcmV0dXJuIGFyZztcbiAgICB9XG4gIH0sXG59XG5cbmNvbnN0IG9wdGlvbmFsID0gc2VyaWFsLmFzc2lnbmVkKHtcbiAgcHJlcGVuZDogYXNzaWduVHJ1dGhmdWwsXG4gIHJlcGxhY2VzOiBhc3NpZ25UcnV0aGZ1bCxcbiAgY3JpdGljYWw6IGFzc2lnblRydXRoZnVsLFxuICBuYW1lc3BhY2VPYmplY3RBc0NvbnRleHQ6IGFzc2lnbkRlZmluZWQsXG4gIGNhbGxBcmdzOiBhc3NpZ25EZWZpbmVkLFxuICBjYWxsOiBhc3NpZ25EZWZpbmVkLFxuICBkaXJlY3RJbXBvcnQ6IGFzc2lnbkRlZmluZWQsXG4gIHNob3J0aGFuZDogYXNzaWduRGVmaW5lZCxcbiAgb3B0aW9uYWw6IGFzc2lnblRydXRoZnVsLFxuICBsb2M6IHtcbiAgICBmcmVlemUoYXJnLCBkZXBlbmRlbmN5KSB7XG4gICAgICByZXR1cm4gZmxhdHRlblByb3RvdHlwZShkZXBlbmRlbmN5LmxvYyk7XG4gICAgfSxcbiAgICB0aGF3KGFyZywgZnJvemVuKSB7XG4gICAgICByZXR1cm4gYXJnO1xuICAgIH0sXG4gIH0sXG59KTtcblxuY29uc3QgbG9jYWxNb2R1bGVBc3NpZ25lZCA9IHtcbiAgZnJlZXplKF8sIGRlcGVuZGVuY3kpIHtcbiAgICBpZiAoXG4gICAgICB0eXBlb2YgZGVwZW5kZW5jeS5sb2NhbE1vZHVsZSA9PT0gJ29iamVjdCcgJiZcbiAgICAgIGRlcGVuZGVuY3kubG9jYWxNb2R1bGUgIT09IG51bGxcbiAgICApIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIG5hbWU6IGRlcGVuZGVuY3kubG9jYWxNb2R1bGUubmFtZSxcbiAgICAgICAgaWR4OiBkZXBlbmRlbmN5LmxvY2FsTW9kdWxlLmlkeCxcbiAgICAgICAgdXNlZDogZGVwZW5kZW5jeS5sb2NhbE1vZHVsZS51c2VkLFxuICAgICAgfTtcbiAgICB9XG4gIH0sXG4gIHRoYXcodGhhd2VkLCBsb2NhbE1vZHVsZSwgZXh0cmEpIHtcbiAgICBjb25zdCBzdGF0ZSA9IGV4dHJhLnN0YXRlO1xuICAgIGlmIChcbiAgICAgIHR5cGVvZiBsb2NhbE1vZHVsZSA9PT0gJ29iamVjdCcgJiZcbiAgICAgIGxvY2FsTW9kdWxlICE9PSBudWxsXG4gICAgKSB7XG4gICAgICBpZiAoIXN0YXRlLmxvY2FsTW9kdWxlcykge1xuICAgICAgICBzdGF0ZS5sb2NhbE1vZHVsZXMgPSBbXTtcbiAgICAgIH1cbiAgICAgIGlmICghc3RhdGUubG9jYWxNb2R1bGVzW2xvY2FsTW9kdWxlLmlkeF0pIHtcbiAgICAgICAgc3RhdGUubG9jYWxNb2R1bGVzW2xvY2FsTW9kdWxlLmlkeF0gPSBuZXcgTG9jYWxNb2R1bGUoXG4gICAgICAgICAgZXh0cmEubW9kdWxlLFxuICAgICAgICAgIGxvY2FsTW9kdWxlLm5hbWUsXG4gICAgICAgICAgbG9jYWxNb2R1bGUuaWR4LFxuICAgICAgICApO1xuICAgICAgICBzdGF0ZS5sb2NhbE1vZHVsZXNbbG9jYWxNb2R1bGUuaWR4XS51c2VkID1cbiAgICAgICAgICBsb2NhbE1vZHVsZS51c2VkO1xuICAgICAgfVxuICAgICAgdGhhd2VkLmxvY2FsTW9kdWxlID0gc3RhdGUubG9jYWxNb2R1bGVzW2xvY2FsTW9kdWxlLmlkeF07XG4gICAgfVxuICAgIHJldHVybiB0aGF3ZWQ7XG4gIH0sXG59O1xuXG5jb25zdCB3YXJuaW5ncyA9IHtcbiAgZnJlZXplKGZyb3plbiwgZGVwZW5kZW5jeSkge1xuICAgIGlmIChmcm96ZW4gJiYgZGVwZW5kZW5jeS5nZXRXYXJuaW5ncykge1xuICAgICAgY29uc3Qgd2FybmluZ3MgPSBkZXBlbmRlbmN5LmdldFdhcm5pbmdzKCk7XG4gICAgICBpZiAod2FybmluZ3MgJiYgd2FybmluZ3MubGVuZ3RoKSB7XG4gICAgICAgIHJldHVybiB3YXJuaW5ncy5tYXAoXG4gICAgICAgICAgKHsgc3RhY2sgfSkgPT5cbiAgICAgICAgICAgIHN0YWNrLmluY2x1ZGVzKCdcXG4gICAgYXQgT2JqZWN0LmZyZWV6ZScpXG4gICAgICAgICAgICAgID8gc3RhY2suc3BsaXQoJ1xcbiAgICBhdCBPYmplY3QuZnJlZXplJylbMF1cbiAgICAgICAgICAgICAgOiBzdGFjay5pbmNsdWRlcygnXFxuICAgIGF0IHBsdWdpbkNvbXBhdC50YXAnKVxuICAgICAgICAgICAgICAgID8gc3RhY2suc3BsaXQoJ1xcbiAgICBhdCBwbHVnaW5Db21wYXQudGFwJylbMF1cbiAgICAgICAgICAgICAgICA6IHN0YWNrLnNwbGl0KCdcXG4gICAgYXQgQ29tcGlsZXIucGx1Z2luQ29tcGF0LnRhcCcpWzBdLFxuICAgICAgICApO1xuICAgICAgfVxuICAgIH1cbiAgfSxcbiAgdGhhdyhkZXBlbmRlbmN5LCB3YXJuaW5ncykge1xuICAgIGlmIChkZXBlbmRlbmN5ICYmIHdhcm5pbmdzICYmIGRlcGVuZGVuY3kuZ2V0V2FybmluZ3MpIHtcbiAgICAgIGNvbnN0IGZyb3plbldhcm5pbmdzID0gd2FybmluZ3M7XG4gICAgICBjb25zdCBfZ2V0V2FybmluZ3MgPSBkZXBlbmRlbmN5LmdldFdhcm5pbmdzO1xuICAgICAgZGVwZW5kZW5jeS5nZXRXYXJuaW5ncyA9IGZ1bmN0aW9uKCkge1xuICAgICAgICBjb25zdCB3YXJuaW5ncyA9IF9nZXRXYXJuaW5ncy5jYWxsKHRoaXMpO1xuICAgICAgICBpZiAod2FybmluZ3MgJiYgd2FybmluZ3MubGVuZ3RoKSB7XG4gICAgICAgICAgcmV0dXJuIHdhcm5pbmdzLm1hcCgod2FybmluZywgaSkgPT4ge1xuICAgICAgICAgICAgY29uc3Qgc3RhY2sgPSB3YXJuaW5nLnN0YWNrLnNwbGl0KFxuICAgICAgICAgICAgICAnXFxuICAgIGF0IENvbXBpbGF0aW9uLnJlcG9ydERlcGVuZGVuY3lFcnJvcnNBbmRXYXJuaW5ncycsXG4gICAgICAgICAgICApWzFdO1xuICAgICAgICAgICAgd2FybmluZy5zdGFjayA9IGAke1xuICAgICAgICAgICAgICBmcm96ZW5XYXJuaW5nc1tpXVxuICAgICAgICAgICAgfVxcbiAgICBhdCBDb21waWxhdGlvbi5yZXBvcnREZXBlbmRlbmN5RXJyb3JzQW5kV2FybmluZ3Mke3N0YWNrfWA7XG4gICAgICAgICAgICByZXR1cm4gd2FybmluZztcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gd2FybmluZ3M7XG4gICAgICB9O1xuICAgIH1cbiAgICByZXR1cm4gZGVwZW5kZW5jeTtcbiAgfSxcbn07XG5jb25zdCBBTUREZWZpbmVEZXBlbmRlbmN5ID0gcmVxdWlyZSgnd2VicGFjay9saWIvZGVwZW5kZW5jaWVzL0FNRERlZmluZURlcGVuZGVuY3knKTtcbmNvbnN0IEFNRERlZmluZURlcGVuZGVuY3lTZXJpYWwgPSBzZXJpYWwuc2VyaWFsKCdBTUREZWZpbmVEZXBlbmRlbmN5Jywge1xuICBjb25zdHJ1Y3Rvcjoge1xuICAgIGZyZWV6ZShfLCBkZXBlbmRlbmN5LCBleHRyYSwgbWV0aG9kcykge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgcmFuZ2U6IGRlcGVuZGVuY3kucmFuZ2UsXG4gICAgICAgIGFycmF5UmFuZ2U6IGRlcGVuZGVuY3kuYXJyYXlSYW5nZSxcbiAgICAgICAgZnVuY3Rpb25SYW5nZTogZGVwZW5kZW5jeS5mdW5jdGlvblJhbmdlLFxuICAgICAgICBvYmplY3RSYW5nZTogZGVwZW5kZW5jeS5vYmplY3RSYW5nZSxcbiAgICAgICAgbmFtZWRNb2R1bGU6IGRlcGVuZGVuY3kubmFtZWRNb2R1bGUsXG4gICAgICB9O1xuICAgIH0sXG4gICAgdGhhdyh0aGF3ZWQsIGZyb3plbiwgZXh0cmEsIG1ldGhvZHMpIHtcbiAgICAgIHJldHVybiBuZXcgQU1ERGVmaW5lRGVwZW5kZW5jeShcbiAgICAgICAgZnJvemVuLnJhbmdlLFxuICAgICAgICBmcm96ZW4uYXJyYXlSYW5nZSxcbiAgICAgICAgZnJvemVuLmZ1bmN0aW9uUmFuZ2UsXG4gICAgICAgIGZyb3plbi5vYmplY3RSYW5nZSxcbiAgICAgICAgZnJvemVuLm5hbWVkTW9kdWxlLFxuICAgICAgKTtcbiAgICB9LFxuICB9LFxuXG4gIG9wdGlvbmFsLFxuXG4gIGxvY2FsTW9kdWxlQXNzaWduZWQsXG5cbiAgd2FybmluZ3MsXG59KTtcblxuY29uc3QgQU1EUmVxdWlyZUFycmF5RGVwZW5kZW5jeSA9IHJlcXVpcmUoJ3dlYnBhY2svbGliL2RlcGVuZGVuY2llcy9BTURSZXF1aXJlQXJyYXlEZXBlbmRlbmN5Jyk7XG5jb25zdCBBTURSZXF1aXJlQXJyYXlEZXBlbmRlbmN5U2VyaWFsID0gc2VyaWFsLnNlcmlhbCgnQU1EUmVxdWlyZUFycmF5RGVwZW5kZW5jeScsIHtcbiAgY29uc3RydWN0b3I6IHtcbiAgICBmcmVlemUoXywgZGVwZW5kZW5jeSwgZXh0cmEsIG1ldGhvZHMpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIGRlcHNBcnJheTogbWV0aG9kcy5tYXBGcmVlemUoJ0RlcGVuZGVuY3knLCBudWxsLCBkZXBlbmRlbmN5LmRlcHNBcnJheSwgZXh0cmEpLFxuICAgICAgICByYW5nZTogZGVwZW5kZW5jeS5yYW5nZSxcbiAgICAgIH07XG4gICAgfSxcbiAgICB0aGF3KHRoYXdlZCwgZnJvemVuLCBleHRyYSwgbWV0aG9kcykge1xuICAgICAgcmV0dXJuIG5ldyBBTURSZXF1aXJlQXJyYXlEZXBlbmRlbmN5KFxuICAgICAgICBtZXRob2RzLm1hcFRoYXcoJ0RlcGVuZGVuY3knLCBudWxsLCBmcm96ZW4uZGVwc0FycmF5LCBleHRyYSksXG4gICAgICAgIGZyb3plbi5yYW5nZSxcbiAgICAgICk7XG4gICAgfSxcbiAgfSxcblxuICBvcHRpb25hbCxcblxuICB3YXJuaW5ncyxcbn0pO1xuXG5jb25zdCBBTURSZXF1aXJlQ29udGV4dERlcGVuZGVuY3kgPSByZXF1aXJlKCd3ZWJwYWNrL2xpYi9kZXBlbmRlbmNpZXMvQU1EUmVxdWlyZUNvbnRleHREZXBlbmRlbmN5Jyk7XG5jb25zdCBBTURSZXF1aXJlQ29udGV4dERlcGVuZGVuY3lTZXJpYWwgPSBzZXJpYWwuc2VyaWFsKCdBTURSZXF1aXJlQ29udGV4dERlcGVuZGVuY3knLCB7XG4gIGNvbnN0cnVjdG9yOiB7XG4gICAgZnJlZXplKF8sIGRlcGVuZGVuY3ksIGV4dHJhLCBtZXRob2RzKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBvcHRpb25zOiBkZXBlbmRlbmN5Lm9wdGlvbnMucmVnRXhwID9cbiAgICAgICAgICBPYmplY3QuYXNzaWduKHt9LCBkZXBlbmRlbmN5Lm9wdGlvbnMsIHtcbiAgICAgICAgICAgIHJlZ0V4cDogZGVwZW5kZW5jeS5vcHRpb25zLnJlZ0V4cC5zb3VyY2UsXG4gICAgICAgICAgfSkgOlxuICAgICAgICAgIGRlcGVuZGVuY3kub3B0aW9ucyxcbiAgICAgICAgcmFuZ2U6IGRlcGVuZGVuY3kucmFuZ2UsXG4gICAgICAgIHZhbHVlUmFuZ2U6IGRlcGVuZGVuY3kudmFsdWVSYW5nZSxcbiAgICAgIH07XG4gICAgfSxcbiAgICB0aGF3KHRoYXdlZCwgZnJvemVuLCBleHRyYSwgbWV0aG9kcykge1xuICAgICAgcmV0dXJuIG5ldyBBTURSZXF1aXJlQ29udGV4dERlcGVuZGVuY3koXG4gICAgICAgIGZyb3plbi5vcHRpb25zLnJlZ0V4cCA/XG4gICAgICAgICAgT2JqZWN0LmFzc2lnbih7fSwgZnJvemVuLm9wdGlvbnMsIHtcbiAgICAgICAgICAgIHJlZ0V4cDogbmV3IFJlZ0V4cChmcm96ZW4ub3B0aW9ucy5yZWdFeHApLFxuICAgICAgICAgIH0pIDpcbiAgICAgICAgICBmcm96ZW4ub3B0aW9ucyxcbiAgICAgICAgZnJvemVuLnJhbmdlLFxuICAgICAgICBmcm96ZW4udmFsdWVSYW5nZSxcbiAgICAgICk7XG4gICAgfSxcbiAgfSxcblxuICBvcHRpb25hbCxcblxuICB3YXJuaW5ncyxcbn0pO1xuXG5jb25zdCBBTURSZXF1aXJlRGVwZW5kZW5jeSA9IHJlcXVpcmUoJ3dlYnBhY2svbGliL2RlcGVuZGVuY2llcy9BTURSZXF1aXJlRGVwZW5kZW5jeScpO1xuY29uc3QgQU1EUmVxdWlyZURlcGVuZGVuY3lTZXJpYWwgPSBzZXJpYWwuc2VyaWFsKCdBTURSZXF1aXJlRGVwZW5kZW5jeScsIHtcbiAgY29uc3RydWN0b3I6IHtcbiAgICBmcmVlemUoXywgZGVwZW5kZW5jeSwgZXh0cmEsIG1ldGhvZHMpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIGJsb2NrOiAhZGVwZW5kZW5jeS5ibG9jay5kZXBlbmRlbmNpZXMuaW5jbHVkZXMoZGVwZW5kZW5jeSkgP1xuICAgICAgICAgIG1ldGhvZHMuZnJlZXplKCdEZXBlbmRlbmN5QmxvY2snLCBudWxsLCBkZXBlbmRlbmN5LmJsb2NrLCBleHRyYSkgOlxuICAgICAgICAgIHVuZGVmaW5lZCxcbiAgICAgIH07XG4gICAgfSxcbiAgICB0aGF3KHRoYXdlZCwgZnJvemVuLCBleHRyYSwgbWV0aG9kcykge1xuICAgICAgcmV0dXJuIG5ldyBBTURSZXF1aXJlRGVwZW5kZW5jeShcbiAgICAgICAgIWZyb3plbi5ibG9jayA/IGV4dHJhLnBhcmVudCA6IG1ldGhvZHMudGhhdygnRGVwZW5kZW5jeUJsb2NrJywgbnVsbCwgZnJvemVuLmJsb2NrLCBleHRyYSksXG4gICAgICApO1xuICAgIH0sXG4gIH0sXG5cbiAgb3B0aW9uYWwsXG5cbiAgd2FybmluZ3MsXG59KTtcblxuY29uc3QgQU1EUmVxdWlyZUl0ZW1EZXBlbmRlbmN5ID0gcmVxdWlyZSgnd2VicGFjay9saWIvZGVwZW5kZW5jaWVzL0FNRFJlcXVpcmVJdGVtRGVwZW5kZW5jeScpO1xuY29uc3QgQU1EUmVxdWlyZUl0ZW1EZXBlbmRlbmN5U2VyaWFsID0gc2VyaWFsLnNlcmlhbCgnQU1EUmVxdWlyZUl0ZW1EZXBlbmRlbmN5Jywge1xuICBjb25zdHJ1Y3Rvcjoge1xuICAgIGZyZWV6ZShfLCBkZXBlbmRlbmN5LCBleHRyYSwgbWV0aG9kcykge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgcmVxdWVzdDogcmVsYXRlQ29udGV4dC5yZWxhdGVBYnNvbHV0ZVJlcXVlc3QoZXh0cmEubW9kdWxlLmNvbnRleHQsIGRlcGVuZGVuY3kucmVxdWVzdCksXG4gICAgICAgIHJhbmdlOiBkZXBlbmRlbmN5LnJhbmdlLFxuICAgICAgfTtcbiAgICB9LFxuICAgIHRoYXcodGhhd2VkLCBmcm96ZW4sIGV4dHJhLCBtZXRob2RzKSB7XG4gICAgICByZXR1cm4gbmV3IEFNRFJlcXVpcmVJdGVtRGVwZW5kZW5jeShcbiAgICAgICAgZnJvemVuLnJlcXVlc3QsXG4gICAgICAgIGZyb3plbi5yYW5nZSxcbiAgICAgICk7XG4gICAgfSxcbiAgfSxcblxuICBvcHRpb25hbCxcblxuICB3YXJuaW5ncyxcbn0pO1xuXG5jb25zdCBDb21tb25Kc1JlcXVpcmVDb250ZXh0RGVwZW5kZW5jeSA9IHJlcXVpcmUoJ3dlYnBhY2svbGliL2RlcGVuZGVuY2llcy9Db21tb25Kc1JlcXVpcmVDb250ZXh0RGVwZW5kZW5jeScpO1xuY29uc3QgQ29tbW9uSnNSZXF1aXJlQ29udGV4dERlcGVuZGVuY3lTZXJpYWwgPSBzZXJpYWwuc2VyaWFsKCdDb21tb25Kc1JlcXVpcmVDb250ZXh0RGVwZW5kZW5jeScsIHtcbiAgY29uc3RydWN0b3I6IHtcbiAgICBmcmVlemUoXywgZGVwZW5kZW5jeSwgZXh0cmEsIG1ldGhvZHMpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIG9wdGlvbnM6IGRlcGVuZGVuY3kub3B0aW9ucy5yZWdFeHAgP1xuICAgICAgICAgIE9iamVjdC5hc3NpZ24oe30sIGRlcGVuZGVuY3kub3B0aW9ucywge1xuICAgICAgICAgICAgcmVnRXhwOiBkZXBlbmRlbmN5Lm9wdGlvbnMucmVnRXhwLnNvdXJjZSxcbiAgICAgICAgICB9KSA6XG4gICAgICAgICAgZGVwZW5kZW5jeS5vcHRpb25zLFxuICAgICAgICByYW5nZTogZGVwZW5kZW5jeS5yYW5nZSxcbiAgICAgICAgdmFsdWVSYW5nZTogZGVwZW5kZW5jeS52YWx1ZVJhbmdlLFxuICAgICAgfTtcbiAgICB9LFxuICAgIHRoYXcodGhhd2VkLCBmcm96ZW4sIGV4dHJhLCBtZXRob2RzKSB7XG4gICAgICByZXR1cm4gbmV3IENvbW1vbkpzUmVxdWlyZUNvbnRleHREZXBlbmRlbmN5KFxuICAgICAgICBmcm96ZW4ub3B0aW9ucy5yZWdFeHAgP1xuICAgICAgICAgIE9iamVjdC5hc3NpZ24oe30sIGZyb3plbi5vcHRpb25zLCB7XG4gICAgICAgICAgICByZWdFeHA6IG5ldyBSZWdFeHAoZnJvemVuLm9wdGlvbnMucmVnRXhwKSxcbiAgICAgICAgICB9KSA6XG4gICAgICAgICAgZnJvemVuLm9wdGlvbnMsXG4gICAgICAgIGZyb3plbi5yYW5nZSxcbiAgICAgICAgZnJvemVuLnZhbHVlUmFuZ2UsXG4gICAgICApO1xuICAgIH0sXG4gIH0sXG5cbiAgb3B0aW9uYWwsXG5cbiAgd2FybmluZ3MsXG59KTtcblxuY29uc3QgQ29tbW9uSnNSZXF1aXJlRGVwZW5kZW5jeSA9IHJlcXVpcmUoJ3dlYnBhY2svbGliL2RlcGVuZGVuY2llcy9Db21tb25Kc1JlcXVpcmVEZXBlbmRlbmN5Jyk7XG5jb25zdCBDb21tb25Kc1JlcXVpcmVEZXBlbmRlbmN5U2VyaWFsID0gc2VyaWFsLnNlcmlhbCgnQ29tbW9uSnNSZXF1aXJlRGVwZW5kZW5jeScsIHtcbiAgY29uc3RydWN0b3I6IHtcbiAgICBmcmVlemUoXywgZGVwZW5kZW5jeSwgZXh0cmEsIG1ldGhvZHMpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHJlcXVlc3Q6IHJlbGF0ZUNvbnRleHQucmVsYXRlQWJzb2x1dGVSZXF1ZXN0KGV4dHJhLm1vZHVsZS5jb250ZXh0LCBkZXBlbmRlbmN5LnJlcXVlc3QpLFxuICAgICAgICByYW5nZTogZGVwZW5kZW5jeS5yYW5nZSxcbiAgICAgIH07XG4gICAgfSxcbiAgICB0aGF3KHRoYXdlZCwgZnJvemVuLCBleHRyYSwgbWV0aG9kcykge1xuICAgICAgcmV0dXJuIG5ldyBDb21tb25Kc1JlcXVpcmVEZXBlbmRlbmN5KFxuICAgICAgICBmcm96ZW4ucmVxdWVzdCxcbiAgICAgICAgZnJvemVuLnJhbmdlLFxuICAgICAgKTtcbiAgICB9LFxuICB9LFxuXG4gIG9wdGlvbmFsLFxuXG4gIHdhcm5pbmdzLFxufSk7XG5cbmNvbnN0IENvbnN0RGVwZW5kZW5jeSA9IHJlcXVpcmUoJ3dlYnBhY2svbGliL2RlcGVuZGVuY2llcy9Db25zdERlcGVuZGVuY3knKTtcbmNvbnN0IENvbnN0RGVwZW5kZW5jeVNlcmlhbCA9IHNlcmlhbC5zZXJpYWwoJ0NvbnN0RGVwZW5kZW5jeScsIHtcbiAgY29uc3RydWN0b3I6IHtcbiAgICBmcmVlemUoXywgZGVwZW5kZW5jeSwgZXh0cmEsIG1ldGhvZHMpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIGV4cHJlc3Npb246IGRlcGVuZGVuY3kuZXhwcmVzc2lvbixcbiAgICAgICAgcmFuZ2U6IGRlcGVuZGVuY3kucmFuZ2UsXG4gICAgICAgIHJlcXVpcmVXZWJwYWNrUmVxdWlyZTogZGVwZW5kZW5jeS5yZXF1aXJlV2VicGFja1JlcXVpcmUsXG4gICAgICB9O1xuICAgIH0sXG4gICAgdGhhdyh0aGF3ZWQsIGZyb3plbiwgZXh0cmEsIG1ldGhvZHMpIHtcbiAgICAgIHJldHVybiBuZXcgQ29uc3REZXBlbmRlbmN5KFxuICAgICAgICBmcm96ZW4uZXhwcmVzc2lvbixcbiAgICAgICAgZnJvemVuLnJhbmdlLFxuICAgICAgICBmcm96ZW4ucmVxdWlyZVdlYnBhY2tSZXF1aXJlLFxuICAgICAgKTtcbiAgICB9LFxuICB9LFxuXG4gIG9wdGlvbmFsLFxuXG4gIHdhcm5pbmdzLFxufSk7XG5cbmNvbnN0IENvbnRleHREZXBlbmRlbmN5ID0gcmVxdWlyZSgnd2VicGFjay9saWIvZGVwZW5kZW5jaWVzL0NvbnRleHREZXBlbmRlbmN5Jyk7XG5jb25zdCBDb250ZXh0RGVwZW5kZW5jeVNlcmlhbCA9IHNlcmlhbC5zZXJpYWwoJ0NvbnRleHREZXBlbmRlbmN5Jywge1xuICBjb25zdHJ1Y3Rvcjoge1xuICAgIGZyZWV6ZShfLCBkZXBlbmRlbmN5LCBleHRyYSwgbWV0aG9kcykge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgb3B0aW9uczogZGVwZW5kZW5jeS5vcHRpb25zLnJlZ0V4cCA/XG4gICAgICAgICAgT2JqZWN0LmFzc2lnbih7fSwgZGVwZW5kZW5jeS5vcHRpb25zLCB7XG4gICAgICAgICAgICByZWdFeHA6IGRlcGVuZGVuY3kub3B0aW9ucy5yZWdFeHAuc291cmNlLFxuICAgICAgICAgIH0pIDpcbiAgICAgICAgICBkZXBlbmRlbmN5Lm9wdGlvbnMsXG4gICAgICB9O1xuICAgIH0sXG4gICAgdGhhdyh0aGF3ZWQsIGZyb3plbiwgZXh0cmEsIG1ldGhvZHMpIHtcbiAgICAgIHJldHVybiBuZXcgQ29udGV4dERlcGVuZGVuY3koXG4gICAgICAgIGZyb3plbi5vcHRpb25zLnJlZ0V4cCA/XG4gICAgICAgICAgT2JqZWN0LmFzc2lnbih7fSwgZnJvemVuLm9wdGlvbnMsIHtcbiAgICAgICAgICAgIHJlZ0V4cDogbmV3IFJlZ0V4cChmcm96ZW4ub3B0aW9ucy5yZWdFeHApLFxuICAgICAgICAgIH0pIDpcbiAgICAgICAgICBmcm96ZW4ub3B0aW9ucyxcbiAgICAgICk7XG4gICAgfSxcbiAgfSxcblxuICBvcHRpb25hbCxcblxuICB3YXJuaW5ncyxcbn0pO1xuXG5jb25zdCBDb250ZXh0RWxlbWVudERlcGVuZGVuY3kgPSByZXF1aXJlKCd3ZWJwYWNrL2xpYi9kZXBlbmRlbmNpZXMvQ29udGV4dEVsZW1lbnREZXBlbmRlbmN5Jyk7XG5jb25zdCBDb250ZXh0RWxlbWVudERlcGVuZGVuY3lTZXJpYWwgPSBzZXJpYWwuc2VyaWFsKCdDb250ZXh0RWxlbWVudERlcGVuZGVuY3knLCB7XG4gIGNvbnN0cnVjdG9yOiB7XG4gICAgZnJlZXplKF8sIGRlcGVuZGVuY3ksIGV4dHJhLCBtZXRob2RzKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICByZXF1ZXN0OiByZWxhdGVDb250ZXh0LnJlbGF0ZUFic29sdXRlUmVxdWVzdChleHRyYS5tb2R1bGUuY29udGV4dCwgZGVwZW5kZW5jeS5yZXF1ZXN0KSxcbiAgICAgICAgdXNlclJlcXVlc3Q6IHJlbGF0ZUNvbnRleHQucmVsYXRlQWJzb2x1dGVSZXF1ZXN0KGV4dHJhLm1vZHVsZS5jb250ZXh0LCBkZXBlbmRlbmN5LnVzZXJSZXF1ZXN0KSxcbiAgICAgIH07XG4gICAgfSxcbiAgICB0aGF3KHRoYXdlZCwgZnJvemVuLCBleHRyYSwgbWV0aG9kcykge1xuICAgICAgcmV0dXJuIG5ldyBDb250ZXh0RWxlbWVudERlcGVuZGVuY3koXG4gICAgICAgIGZyb3plbi5yZXF1ZXN0LFxuICAgICAgICBmcm96ZW4udXNlclJlcXVlc3QsXG4gICAgICApO1xuICAgIH0sXG4gIH0sXG5cbiAgb3B0aW9uYWwsXG5cbiAgd2FybmluZ3MsXG59KTtcblxuY29uc3QgQ3JpdGljYWxEZXBlbmRlbmN5V2FybmluZyA9IHJlcXVpcmUoJ3dlYnBhY2svbGliL2RlcGVuZGVuY2llcy9Dcml0aWNhbERlcGVuZGVuY3lXYXJuaW5nJyk7XG5jb25zdCBDcml0aWNhbERlcGVuZGVuY3lXYXJuaW5nU2VyaWFsID0gc2VyaWFsLnNlcmlhbCgnQ3JpdGljYWxEZXBlbmRlbmN5V2FybmluZycsIHtcbiAgY29uc3RydWN0b3I6IHtcbiAgICBmcmVlemUoXywgZGVwZW5kZW5jeSwgZXh0cmEsIG1ldGhvZHMpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIG1lc3NhZ2U6IGRlcGVuZGVuY3kubWVzc2FnZSxcbiAgICAgIH07XG4gICAgfSxcbiAgICB0aGF3KHRoYXdlZCwgZnJvemVuLCBleHRyYSwgbWV0aG9kcykge1xuICAgICAgcmV0dXJuIG5ldyBDcml0aWNhbERlcGVuZGVuY3lXYXJuaW5nKFxuICAgICAgICBmcm96ZW4ubWVzc2FnZSxcbiAgICAgICk7XG4gICAgfSxcbiAgfSxcblxuICBvcHRpb25hbCxcblxuICB3YXJuaW5ncyxcbn0pO1xuXG5jb25zdCBEZWxlZ2F0ZWRFeHBvcnRzRGVwZW5kZW5jeSA9IHJlcXVpcmUoJ3dlYnBhY2svbGliL2RlcGVuZGVuY2llcy9EZWxlZ2F0ZWRFeHBvcnRzRGVwZW5kZW5jeScpO1xuY29uc3QgRGVsZWdhdGVkRXhwb3J0c0RlcGVuZGVuY3lTZXJpYWwgPSBzZXJpYWwuc2VyaWFsKCdEZWxlZ2F0ZWRFeHBvcnRzRGVwZW5kZW5jeScsIHtcbiAgY29uc3RydWN0b3I6IHtcbiAgICBmcmVlemUoXywgZGVwZW5kZW5jeSwgZXh0cmEsIG1ldGhvZHMpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIG9yaWdpbk1vZHVsZTogbnVsbCxcbiAgICAgICAgZXhwb3J0czogZGVwZW5kZW5jeS5leHBvcnRzLFxuICAgICAgfTtcbiAgICB9LFxuICAgIHRoYXcodGhhd2VkLCBmcm96ZW4sIGV4dHJhLCBtZXRob2RzKSB7XG4gICAgICByZXR1cm4gbmV3IERlbGVnYXRlZEV4cG9ydHNEZXBlbmRlbmN5KFxuICAgICAgICBleHRyYS5tb2R1bGUsXG4gICAgICAgIGZyb3plbi5leHBvcnRzLFxuICAgICAgKTtcbiAgICB9LFxuICB9LFxuXG4gIG9wdGlvbmFsLFxuXG4gIHdhcm5pbmdzLFxufSk7XG5cbmNvbnN0IERlbGVnYXRlZFNvdXJjZURlcGVuZGVuY3kgPSByZXF1aXJlKCd3ZWJwYWNrL2xpYi9kZXBlbmRlbmNpZXMvRGVsZWdhdGVkU291cmNlRGVwZW5kZW5jeScpO1xuY29uc3QgRGVsZWdhdGVkU291cmNlRGVwZW5kZW5jeVNlcmlhbCA9IHNlcmlhbC5zZXJpYWwoJ0RlbGVnYXRlZFNvdXJjZURlcGVuZGVuY3knLCB7XG4gIGNvbnN0cnVjdG9yOiB7XG4gICAgZnJlZXplKF8sIGRlcGVuZGVuY3ksIGV4dHJhLCBtZXRob2RzKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICByZXF1ZXN0OiByZWxhdGVDb250ZXh0LnJlbGF0ZUFic29sdXRlUmVxdWVzdChleHRyYS5tb2R1bGUuY29udGV4dCwgZGVwZW5kZW5jeS5yZXF1ZXN0KSxcbiAgICAgIH07XG4gICAgfSxcbiAgICB0aGF3KHRoYXdlZCwgZnJvemVuLCBleHRyYSwgbWV0aG9kcykge1xuICAgICAgcmV0dXJuIG5ldyBEZWxlZ2F0ZWRTb3VyY2VEZXBlbmRlbmN5KFxuICAgICAgICBmcm96ZW4ucmVxdWVzdCxcbiAgICAgICk7XG4gICAgfSxcbiAgfSxcblxuICBvcHRpb25hbCxcblxuICB3YXJuaW5ncyxcbn0pO1xuXG5jb25zdCBEbGxFbnRyeURlcGVuZGVuY3kgPSByZXF1aXJlKCd3ZWJwYWNrL2xpYi9kZXBlbmRlbmNpZXMvRGxsRW50cnlEZXBlbmRlbmN5Jyk7XG5jb25zdCBEbGxFbnRyeURlcGVuZGVuY3lTZXJpYWwgPSBzZXJpYWwuc2VyaWFsKCdEbGxFbnRyeURlcGVuZGVuY3knLCB7XG4gIGNvbnN0cnVjdG9yOiB7XG4gICAgZnJlZXplKF8sIGRlcGVuZGVuY3ksIGV4dHJhLCBtZXRob2RzKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBkZXBlbmRlbmNpZXM6IG1ldGhvZHMubWFwRnJlZXplKCdEZXBlbmRlbmN5JywgbnVsbCwgZGVwZW5kZW5jeS5kZXBlbmRlbmNpZXMsIGV4dHJhKSxcbiAgICAgICAgbmFtZTogZGVwZW5kZW5jeS5uYW1lLFxuICAgICAgfTtcbiAgICB9LFxuICAgIHRoYXcodGhhd2VkLCBmcm96ZW4sIGV4dHJhLCBtZXRob2RzKSB7XG4gICAgICByZXR1cm4gbmV3IERsbEVudHJ5RGVwZW5kZW5jeShcbiAgICAgICAgbWV0aG9kcy5tYXBUaGF3KCdEZXBlbmRlbmN5JywgbnVsbCwgZnJvemVuLmRlcGVuZGVuY2llcywgZXh0cmEpLFxuICAgICAgICBmcm96ZW4ubmFtZSxcbiAgICAgICk7XG4gICAgfSxcbiAgfSxcblxuICBvcHRpb25hbCxcblxuICB3YXJuaW5ncyxcbn0pO1xuXG5jb25zdCBIYXJtb255QWNjZXB0RGVwZW5kZW5jeSA9IHJlcXVpcmUoJ3dlYnBhY2svbGliL2RlcGVuZGVuY2llcy9IYXJtb255QWNjZXB0RGVwZW5kZW5jeScpO1xuY29uc3QgSGFybW9ueUFjY2VwdERlcGVuZGVuY3lTZXJpYWwgPSBzZXJpYWwuc2VyaWFsKCdIYXJtb255QWNjZXB0RGVwZW5kZW5jeScsIHtcbiAgY29uc3RydWN0b3I6IHtcbiAgICBmcmVlemUoXywgZGVwZW5kZW5jeSwgZXh0cmEsIG1ldGhvZHMpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHJhbmdlOiBkZXBlbmRlbmN5LnJhbmdlLFxuICAgICAgICBkZXBlbmRlbmNpZXM6IG1ldGhvZHMubWFwRnJlZXplKCdEZXBlbmRlbmN5JywgbnVsbCwgZGVwZW5kZW5jeS5kZXBlbmRlbmNpZXMsIGV4dHJhKSxcbiAgICAgICAgaGFzQ2FsbGJhY2s6IGRlcGVuZGVuY3kuaGFzQ2FsbGJhY2ssXG4gICAgICB9O1xuICAgIH0sXG4gICAgdGhhdyh0aGF3ZWQsIGZyb3plbiwgZXh0cmEsIG1ldGhvZHMpIHtcbiAgICAgIHJldHVybiBuZXcgSGFybW9ueUFjY2VwdERlcGVuZGVuY3koXG4gICAgICAgIGZyb3plbi5yYW5nZSxcbiAgICAgICAgbWV0aG9kcy5tYXBUaGF3KCdEZXBlbmRlbmN5JywgbnVsbCwgZnJvemVuLmRlcGVuZGVuY2llcywgZXh0cmEpLFxuICAgICAgICBmcm96ZW4uaGFzQ2FsbGJhY2ssXG4gICAgICApO1xuICAgIH0sXG4gIH0sXG5cbiAgb3B0aW9uYWwsXG5cbiAgd2FybmluZ3MsXG59KTtcblxuY29uc3QgSGFybW9ueUFjY2VwdEltcG9ydERlcGVuZGVuY3kgPSByZXF1aXJlKCd3ZWJwYWNrL2xpYi9kZXBlbmRlbmNpZXMvSGFybW9ueUFjY2VwdEltcG9ydERlcGVuZGVuY3knKTtcbmNvbnN0IEhhcm1vbnlBY2NlcHRJbXBvcnREZXBlbmRlbmN5U2VyaWFsID0gc2VyaWFsLnNlcmlhbCgnSGFybW9ueUFjY2VwdEltcG9ydERlcGVuZGVuY3knLCB7XG4gIGNvbnN0cnVjdG9yOiB7XG4gICAgZnJlZXplKF8sIGRlcGVuZGVuY3ksIGV4dHJhLCBtZXRob2RzKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICByZXF1ZXN0OiByZWxhdGVDb250ZXh0LnJlbGF0ZUFic29sdXRlUmVxdWVzdChleHRyYS5tb2R1bGUuY29udGV4dCwgZGVwZW5kZW5jeS5yZXF1ZXN0KSxcbiAgICAgICAgb3JpZ2luTW9kdWxlOiBudWxsLFxuICAgICAgICBwYXJzZXJTY29wZTogbnVsbCxcbiAgICAgIH07XG4gICAgfSxcbiAgICB0aGF3KHRoYXdlZCwgZnJvemVuLCBleHRyYSwgbWV0aG9kcykge1xuICAgICAgZXh0cmEuc3RhdGUuaGFybW9ueVBhcnNlclNjb3BlID0gZXh0cmEuc3RhdGUuaGFybW9ueVBhcnNlclNjb3BlIHx8IHt9O1xuICAgICAgcmV0dXJuIG5ldyBIYXJtb255QWNjZXB0SW1wb3J0RGVwZW5kZW5jeShcbiAgICAgICAgZnJvemVuLnJlcXVlc3QsXG4gICAgICAgIGV4dHJhLm1vZHVsZSxcbiAgICAgICAgZXh0cmEuc3RhdGUuaGFybW9ueVBhcnNlclNjb3BlLFxuICAgICAgKTtcbiAgICB9LFxuICB9LFxuXG4gIG9wdGlvbmFsLFxuXG4gIHdhcm5pbmdzLFxufSk7XG5cbmNvbnN0IEhhcm1vbnlDb21wYXRpYmlsaXR5RGVwZW5kZW5jeSA9IHJlcXVpcmUoJ3dlYnBhY2svbGliL2RlcGVuZGVuY2llcy9IYXJtb255Q29tcGF0aWJpbGl0eURlcGVuZGVuY3knKTtcbmNvbnN0IEhhcm1vbnlDb21wYXRpYmlsaXR5RGVwZW5kZW5jeVNlcmlhbCA9IHNlcmlhbC5zZXJpYWwoJ0hhcm1vbnlDb21wYXRpYmlsaXR5RGVwZW5kZW5jeScsIHtcbiAgY29uc3RydWN0b3I6IHtcbiAgICBmcmVlemUoXywgZGVwZW5kZW5jeSwgZXh0cmEsIG1ldGhvZHMpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIG9yaWdpbk1vZHVsZTogbnVsbCxcbiAgICAgIH07XG4gICAgfSxcbiAgICB0aGF3KHRoYXdlZCwgZnJvemVuLCBleHRyYSwgbWV0aG9kcykge1xuICAgICAgcmV0dXJuIG5ldyBIYXJtb255Q29tcGF0aWJpbGl0eURlcGVuZGVuY3koXG4gICAgICAgIGV4dHJhLm1vZHVsZSxcbiAgICAgICk7XG4gICAgfSxcbiAgfSxcblxuICBvcHRpb25hbCxcblxuICB3YXJuaW5ncyxcbn0pO1xuXG5jb25zdCBIYXJtb255RXhwb3J0RXhwcmVzc2lvbkRlcGVuZGVuY3kgPSByZXF1aXJlKCd3ZWJwYWNrL2xpYi9kZXBlbmRlbmNpZXMvSGFybW9ueUV4cG9ydEV4cHJlc3Npb25EZXBlbmRlbmN5Jyk7XG5jb25zdCBIYXJtb255RXhwb3J0RXhwcmVzc2lvbkRlcGVuZGVuY3lTZXJpYWwgPSBzZXJpYWwuc2VyaWFsKCdIYXJtb255RXhwb3J0RXhwcmVzc2lvbkRlcGVuZGVuY3knLCB7XG4gIGNvbnN0cnVjdG9yOiB7XG4gICAgZnJlZXplKF8sIGRlcGVuZGVuY3ksIGV4dHJhLCBtZXRob2RzKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBvcmlnaW5Nb2R1bGU6IG51bGwsXG4gICAgICAgIHJhbmdlOiBkZXBlbmRlbmN5LnJhbmdlLFxuICAgICAgICByYW5nZVN0YXRlbWVudDogZGVwZW5kZW5jeS5yYW5nZVN0YXRlbWVudCxcbiAgICAgIH07XG4gICAgfSxcbiAgICB0aGF3KHRoYXdlZCwgZnJvemVuLCBleHRyYSwgbWV0aG9kcykge1xuICAgICAgcmV0dXJuIG5ldyBIYXJtb255RXhwb3J0RXhwcmVzc2lvbkRlcGVuZGVuY3koXG4gICAgICAgIGV4dHJhLm1vZHVsZSxcbiAgICAgICAgZnJvemVuLnJhbmdlLFxuICAgICAgICBmcm96ZW4ucmFuZ2VTdGF0ZW1lbnQsXG4gICAgICApO1xuICAgIH0sXG4gIH0sXG5cbiAgb3B0aW9uYWwsXG5cbiAgd2FybmluZ3MsXG59KTtcblxuY29uc3QgSGFybW9ueUV4cG9ydEhlYWRlckRlcGVuZGVuY3kgPSByZXF1aXJlKCd3ZWJwYWNrL2xpYi9kZXBlbmRlbmNpZXMvSGFybW9ueUV4cG9ydEhlYWRlckRlcGVuZGVuY3knKTtcbmNvbnN0IEhhcm1vbnlFeHBvcnRIZWFkZXJEZXBlbmRlbmN5U2VyaWFsID0gc2VyaWFsLnNlcmlhbCgnSGFybW9ueUV4cG9ydEhlYWRlckRlcGVuZGVuY3knLCB7XG4gIGNvbnN0cnVjdG9yOiB7XG4gICAgZnJlZXplKF8sIGRlcGVuZGVuY3ksIGV4dHJhLCBtZXRob2RzKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICByYW5nZTogZGVwZW5kZW5jeS5yYW5nZSxcbiAgICAgICAgcmFuZ2VTdGF0ZW1lbnQ6IGRlcGVuZGVuY3kucmFuZ2VTdGF0ZW1lbnQsXG4gICAgICB9O1xuICAgIH0sXG4gICAgdGhhdyh0aGF3ZWQsIGZyb3plbiwgZXh0cmEsIG1ldGhvZHMpIHtcbiAgICAgIHJldHVybiBuZXcgSGFybW9ueUV4cG9ydEhlYWRlckRlcGVuZGVuY3koXG4gICAgICAgIGZyb3plbi5yYW5nZSxcbiAgICAgICAgZnJvemVuLnJhbmdlU3RhdGVtZW50LFxuICAgICAgKTtcbiAgICB9LFxuICB9LFxuXG4gIG9wdGlvbmFsLFxuXG4gIHdhcm5pbmdzLFxufSk7XG5cbmNvbnN0IEhhcm1vbnlFeHBvcnRJbXBvcnRlZFNwZWNpZmllckRlcGVuZGVuY3kgPSByZXF1aXJlKCd3ZWJwYWNrL2xpYi9kZXBlbmRlbmNpZXMvSGFybW9ueUV4cG9ydEltcG9ydGVkU3BlY2lmaWVyRGVwZW5kZW5jeScpO1xuY29uc3QgSGFybW9ueUV4cG9ydEltcG9ydGVkU3BlY2lmaWVyRGVwZW5kZW5jeVNlcmlhbCA9IHNlcmlhbC5zZXJpYWwoJ0hhcm1vbnlFeHBvcnRJbXBvcnRlZFNwZWNpZmllckRlcGVuZGVuY3knLCB7XG4gIGNvbnN0cnVjdG9yOiB7XG4gICAgZnJlZXplKF8sIGRlcGVuZGVuY3ksIGV4dHJhLCBtZXRob2RzKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICByZXF1ZXN0OiByZWxhdGVDb250ZXh0LnJlbGF0ZUFic29sdXRlUmVxdWVzdChleHRyYS5tb2R1bGUuY29udGV4dCwgZGVwZW5kZW5jeS5yZXF1ZXN0KSxcbiAgICAgICAgb3JpZ2luTW9kdWxlOiBudWxsLFxuICAgICAgICBzb3VyY2VPcmRlcjogZGVwZW5kZW5jeS5zb3VyY2VPcmRlcixcbiAgICAgICAgcGFyc2VyU2NvcGU6IG51bGwsXG4gICAgICAgIGlkOiBkZXBlbmRlbmN5LmlkLFxuICAgICAgICBuYW1lOiBkZXBlbmRlbmN5Lm5hbWUsXG4gICAgICAgIGFjdGl2ZUV4cG9ydHM6IG51bGwsXG4gICAgICAgIG90aGVyU3RhckV4cG9ydHM6IGRlcGVuZGVuY3kub3RoZXJTdGFyRXhwb3J0cyA/ICdzdGFyJyA6IG51bGwsXG4gICAgICAgIHN0cmljdEV4cG9ydFByZXNlbmNlOiBkZXBlbmRlbmN5LnN0cmljdEV4cG9ydFByZXNlbmNlLFxuICAgICAgfTtcbiAgICB9LFxuICAgIHRoYXcodGhhd2VkLCBmcm96ZW4sIGV4dHJhLCBtZXRob2RzKSB7XG4gICAgICBleHRyYS5zdGF0ZS5oYXJtb255UGFyc2VyU2NvcGUgPSBleHRyYS5zdGF0ZS5oYXJtb255UGFyc2VyU2NvcGUgfHwge307XG4gICAgICBleHRyYS5zdGF0ZS5hY3RpdmVFeHBvcnRzID0gZXh0cmEuc3RhdGUuYWN0aXZlRXhwb3J0cyB8fCBuZXcgU2V0KCk7XG4gICAgICBpZiAoZnJvemVuLm5hbWUpIHtcbiAgICAgICAgZXh0cmEuc3RhdGUuYWN0aXZlRXhwb3J0cy5hZGQoZnJvemVuLm5hbWUpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIG5ldyBIYXJtb255RXhwb3J0SW1wb3J0ZWRTcGVjaWZpZXJEZXBlbmRlbmN5KFxuICAgICAgICBmcm96ZW4ucmVxdWVzdCxcbiAgICAgICAgZXh0cmEubW9kdWxlLFxuICAgICAgICBmcm96ZW4uc291cmNlT3JkZXIsXG4gICAgICAgIGV4dHJhLnN0YXRlLmhhcm1vbnlQYXJzZXJTY29wZSxcbiAgICAgICAgZnJvemVuLmlkLFxuICAgICAgICBmcm96ZW4ubmFtZSxcbiAgICAgICAgZXh0cmEuc3RhdGUuYWN0aXZlRXhwb3J0cyxcbiAgICAgICAgZnJvemVuLm90aGVyU3RhckV4cG9ydHMgPT09ICdzdGFyJyA/XG4gICAgICAgICAgKGV4dHJhLnN0YXRlLm90aGVyU3RhckV4cG9ydHMgfHwgW10pIDpcbiAgICAgICAgICBudWxsLFxuICAgICAgICBmcm96ZW4uc3RyaWN0RXhwb3J0UHJlc2VuY2UsXG4gICAgICApO1xuICAgIH0sXG4gIH0sXG5cbiAgb3B0aW9uYWwsXG5cbiAgd2FybmluZ3MsXG5cbiAgZXhwb3J0SW1wb3J0ZWREZXBlbmRlbmN5OiB7XG4gICAgZnJlZXplKGZyb3plbikge30sXG4gICAgdGhhdyh0aGF3ZWQsIGZyb3plbiwgZXh0cmEpIHtcbiAgICAgIGlmICh0aGF3ZWQub3RoZXJTdGFyRXhwb3J0cykge1xuICAgICAgICBleHRyYS5zdGF0ZS5vdGhlclN0YXJFeHBvcnRzID0gKFxuICAgICAgICAgIGV4dHJhLnN0YXRlLm90aGVyU3RhckV4cG9ydHMgfHwgW11cbiAgICAgICAgKS5jb25jYXQodGhhd2VkKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiB0aGF3ZWQ7XG4gICAgfSxcbiAgfSxcbn0pO1xuXG5jb25zdCBIYXJtb255RXhwb3J0U3BlY2lmaWVyRGVwZW5kZW5jeSA9IHJlcXVpcmUoJ3dlYnBhY2svbGliL2RlcGVuZGVuY2llcy9IYXJtb255RXhwb3J0U3BlY2lmaWVyRGVwZW5kZW5jeScpO1xuY29uc3QgSGFybW9ueUV4cG9ydFNwZWNpZmllckRlcGVuZGVuY3lTZXJpYWwgPSBzZXJpYWwuc2VyaWFsKCdIYXJtb255RXhwb3J0U3BlY2lmaWVyRGVwZW5kZW5jeScsIHtcbiAgY29uc3RydWN0b3I6IHtcbiAgICBmcmVlemUoXywgZGVwZW5kZW5jeSwgZXh0cmEsIG1ldGhvZHMpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIG9yaWdpbk1vZHVsZTogbnVsbCxcbiAgICAgICAgaWQ6IGRlcGVuZGVuY3kuaWQsXG4gICAgICAgIG5hbWU6IGRlcGVuZGVuY3kubmFtZSxcbiAgICAgIH07XG4gICAgfSxcbiAgICB0aGF3KHRoYXdlZCwgZnJvemVuLCBleHRyYSwgbWV0aG9kcykge1xuICAgICAgcmV0dXJuIG5ldyBIYXJtb255RXhwb3J0U3BlY2lmaWVyRGVwZW5kZW5jeShcbiAgICAgICAgZXh0cmEubW9kdWxlLFxuICAgICAgICBmcm96ZW4uaWQsXG4gICAgICAgIGZyb3plbi5uYW1lLFxuICAgICAgKTtcbiAgICB9LFxuICB9LFxuXG4gIG9wdGlvbmFsLFxuXG4gIHdhcm5pbmdzLFxufSk7XG5cbmNvbnN0IEhhcm1vbnlJbXBvcnREZXBlbmRlbmN5ID0gcmVxdWlyZSgnd2VicGFjay9saWIvZGVwZW5kZW5jaWVzL0hhcm1vbnlJbXBvcnREZXBlbmRlbmN5Jyk7XG5jb25zdCBIYXJtb255SW1wb3J0RGVwZW5kZW5jeVNlcmlhbCA9IHNlcmlhbC5zZXJpYWwoJ0hhcm1vbnlJbXBvcnREZXBlbmRlbmN5Jywge1xuICBjb25zdHJ1Y3Rvcjoge1xuICAgIGZyZWV6ZShfLCBkZXBlbmRlbmN5LCBleHRyYSwgbWV0aG9kcykge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgcmVxdWVzdDogcmVsYXRlQ29udGV4dC5yZWxhdGVBYnNvbHV0ZVJlcXVlc3QoZXh0cmEubW9kdWxlLmNvbnRleHQsIGRlcGVuZGVuY3kucmVxdWVzdCksXG4gICAgICAgIG9yaWdpbk1vZHVsZTogbnVsbCxcbiAgICAgICAgc291cmNlT3JkZXI6IGRlcGVuZGVuY3kuc291cmNlT3JkZXIsXG4gICAgICAgIHBhcnNlclNjb3BlOiBudWxsLFxuICAgICAgfTtcbiAgICB9LFxuICAgIHRoYXcodGhhd2VkLCBmcm96ZW4sIGV4dHJhLCBtZXRob2RzKSB7XG4gICAgICBleHRyYS5zdGF0ZS5oYXJtb255UGFyc2VyU2NvcGUgPSBleHRyYS5zdGF0ZS5oYXJtb255UGFyc2VyU2NvcGUgfHwge307XG4gICAgICByZXR1cm4gbmV3IEhhcm1vbnlJbXBvcnREZXBlbmRlbmN5KFxuICAgICAgICBmcm96ZW4ucmVxdWVzdCxcbiAgICAgICAgZXh0cmEubW9kdWxlLFxuICAgICAgICBmcm96ZW4uc291cmNlT3JkZXIsXG4gICAgICAgIGV4dHJhLnN0YXRlLmhhcm1vbnlQYXJzZXJTY29wZSxcbiAgICAgICk7XG4gICAgfSxcbiAgfSxcblxuICBvcHRpb25hbCxcblxuICB3YXJuaW5ncyxcblxuICBpbXBvcnREZXBlbmRlbmN5OiB7XG4gICAgZnJlZXplKGZyb3plbikge1xuICAgICAgcmV0dXJuIGZyb3plbjtcbiAgICB9LFxuICAgIHRoYXcodGhhd2VkLCBmcm96ZW4sIGV4dHJhKSB7XG4gICAgICBjb25zdCBzdGF0ZSA9IGV4dHJhLnN0YXRlO1xuICAgICAgY29uc3QgcmVmID0gZnJvemVuLnJhbmdlLnRvU3RyaW5nKCk7XG4gICAgICBpZiAoc3RhdGUuaW1wb3J0c1tyZWZdKSB7XG4gICAgICAgIHJldHVybiBzdGF0ZS5pbXBvcnRzW3JlZl07XG4gICAgICB9XG4gICAgICBzdGF0ZS5pbXBvcnRzW3JlZl0gPSB0aGF3ZWQ7XG4gICAgICByZXR1cm4gdGhhd2VkO1xuICAgIH0sXG4gIH0sXG59KTtcblxuY29uc3QgSGFybW9ueUltcG9ydFNpZGVFZmZlY3REZXBlbmRlbmN5ID0gcmVxdWlyZSgnd2VicGFjay9saWIvZGVwZW5kZW5jaWVzL0hhcm1vbnlJbXBvcnRTaWRlRWZmZWN0RGVwZW5kZW5jeScpO1xuY29uc3QgSGFybW9ueUltcG9ydFNpZGVFZmZlY3REZXBlbmRlbmN5U2VyaWFsID0gc2VyaWFsLnNlcmlhbCgnSGFybW9ueUltcG9ydFNpZGVFZmZlY3REZXBlbmRlbmN5Jywge1xuICBjb25zdHJ1Y3Rvcjoge1xuICAgIGZyZWV6ZShfLCBkZXBlbmRlbmN5LCBleHRyYSwgbWV0aG9kcykge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgcmVxdWVzdDogcmVsYXRlQ29udGV4dC5yZWxhdGVBYnNvbHV0ZVJlcXVlc3QoZXh0cmEubW9kdWxlLmNvbnRleHQsIGRlcGVuZGVuY3kucmVxdWVzdCksXG4gICAgICAgIG9yaWdpbk1vZHVsZTogbnVsbCxcbiAgICAgICAgc291cmNlT3JkZXI6IGRlcGVuZGVuY3kuc291cmNlT3JkZXIsXG4gICAgICAgIHBhcnNlclNjb3BlOiBudWxsLFxuICAgICAgfTtcbiAgICB9LFxuICAgIHRoYXcodGhhd2VkLCBmcm96ZW4sIGV4dHJhLCBtZXRob2RzKSB7XG4gICAgICBleHRyYS5zdGF0ZS5oYXJtb255UGFyc2VyU2NvcGUgPSBleHRyYS5zdGF0ZS5oYXJtb255UGFyc2VyU2NvcGUgfHwge307XG4gICAgICByZXR1cm4gbmV3IEhhcm1vbnlJbXBvcnRTaWRlRWZmZWN0RGVwZW5kZW5jeShcbiAgICAgICAgZnJvemVuLnJlcXVlc3QsXG4gICAgICAgIGV4dHJhLm1vZHVsZSxcbiAgICAgICAgZnJvemVuLnNvdXJjZU9yZGVyLFxuICAgICAgICBleHRyYS5zdGF0ZS5oYXJtb255UGFyc2VyU2NvcGUsXG4gICAgICApO1xuICAgIH0sXG4gIH0sXG5cbiAgb3B0aW9uYWwsXG5cbiAgd2FybmluZ3MsXG59KTtcblxuY29uc3QgSGFybW9ueUltcG9ydFNwZWNpZmllckRlcGVuZGVuY3kgPSByZXF1aXJlKCd3ZWJwYWNrL2xpYi9kZXBlbmRlbmNpZXMvSGFybW9ueUltcG9ydFNwZWNpZmllckRlcGVuZGVuY3knKTtcbmNvbnN0IEhhcm1vbnlJbXBvcnRTcGVjaWZpZXJEZXBlbmRlbmN5U2VyaWFsID0gc2VyaWFsLnNlcmlhbCgnSGFybW9ueUltcG9ydFNwZWNpZmllckRlcGVuZGVuY3knLCB7XG4gIGNvbnN0cnVjdG9yOiB7XG4gICAgZnJlZXplKF8sIGRlcGVuZGVuY3ksIGV4dHJhLCBtZXRob2RzKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICByZXF1ZXN0OiByZWxhdGVDb250ZXh0LnJlbGF0ZUFic29sdXRlUmVxdWVzdChleHRyYS5tb2R1bGUuY29udGV4dCwgZGVwZW5kZW5jeS5yZXF1ZXN0KSxcbiAgICAgICAgb3JpZ2luTW9kdWxlOiBudWxsLFxuICAgICAgICBzb3VyY2VPcmRlcjogZGVwZW5kZW5jeS5zb3VyY2VPcmRlcixcbiAgICAgICAgcGFyc2VyU2NvcGU6IG51bGwsXG4gICAgICAgIGlkOiBkZXBlbmRlbmN5LmlkLFxuICAgICAgICBuYW1lOiBkZXBlbmRlbmN5Lm5hbWUsXG4gICAgICAgIHJhbmdlOiBkZXBlbmRlbmN5LnJhbmdlLFxuICAgICAgICBzdHJpY3RFeHBvcnRQcmVzZW5jZTogZGVwZW5kZW5jeS5zdHJpY3RFeHBvcnRQcmVzZW5jZSxcbiAgICAgIH07XG4gICAgfSxcbiAgICB0aGF3KHRoYXdlZCwgZnJvemVuLCBleHRyYSwgbWV0aG9kcykge1xuICAgICAgZXh0cmEuc3RhdGUuaGFybW9ueVBhcnNlclNjb3BlID0gZXh0cmEuc3RhdGUuaGFybW9ueVBhcnNlclNjb3BlIHx8IHt9O1xuICAgICAgcmV0dXJuIG5ldyBIYXJtb255SW1wb3J0U3BlY2lmaWVyRGVwZW5kZW5jeShcbiAgICAgICAgZnJvemVuLnJlcXVlc3QsXG4gICAgICAgIGV4dHJhLm1vZHVsZSxcbiAgICAgICAgZnJvemVuLnNvdXJjZU9yZGVyLFxuICAgICAgICBleHRyYS5zdGF0ZS5oYXJtb255UGFyc2VyU2NvcGUsXG4gICAgICAgIGZyb3plbi5pZCxcbiAgICAgICAgZnJvemVuLm5hbWUsXG4gICAgICAgIGZyb3plbi5yYW5nZSxcbiAgICAgICAgZnJvemVuLnN0cmljdEV4cG9ydFByZXNlbmNlLFxuICAgICAgKTtcbiAgICB9LFxuICB9LFxuXG4gIG9wdGlvbmFsLFxuXG4gIHdhcm5pbmdzLFxufSk7XG5cbmNvbnN0IEhhcm1vbnlJbml0RGVwZW5kZW5jeSA9IHJlcXVpcmUoJ3dlYnBhY2svbGliL2RlcGVuZGVuY2llcy9IYXJtb255SW5pdERlcGVuZGVuY3knKTtcbmNvbnN0IEhhcm1vbnlJbml0RGVwZW5kZW5jeVNlcmlhbCA9IHNlcmlhbC5zZXJpYWwoJ0hhcm1vbnlJbml0RGVwZW5kZW5jeScsIHtcbiAgY29uc3RydWN0b3I6IHtcbiAgICBmcmVlemUoXywgZGVwZW5kZW5jeSwgZXh0cmEsIG1ldGhvZHMpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIG9yaWdpbk1vZHVsZTogbnVsbCxcbiAgICAgIH07XG4gICAgfSxcbiAgICB0aGF3KHRoYXdlZCwgZnJvemVuLCBleHRyYSwgbWV0aG9kcykge1xuICAgICAgcmV0dXJuIG5ldyBIYXJtb255SW5pdERlcGVuZGVuY3koXG4gICAgICAgIGV4dHJhLm1vZHVsZSxcbiAgICAgICk7XG4gICAgfSxcbiAgfSxcblxuICBvcHRpb25hbCxcblxuICB3YXJuaW5ncyxcbn0pO1xuXG5jb25zdCBJbXBvcnRDb250ZXh0RGVwZW5kZW5jeSA9IHJlcXVpcmUoJ3dlYnBhY2svbGliL2RlcGVuZGVuY2llcy9JbXBvcnRDb250ZXh0RGVwZW5kZW5jeScpO1xuY29uc3QgSW1wb3J0Q29udGV4dERlcGVuZGVuY3lTZXJpYWwgPSBzZXJpYWwuc2VyaWFsKCdJbXBvcnRDb250ZXh0RGVwZW5kZW5jeScsIHtcbiAgY29uc3RydWN0b3I6IHtcbiAgICBmcmVlemUoXywgZGVwZW5kZW5jeSwgZXh0cmEsIG1ldGhvZHMpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIG9wdGlvbnM6IGRlcGVuZGVuY3kub3B0aW9ucy5yZWdFeHAgP1xuICAgICAgICAgIE9iamVjdC5hc3NpZ24oe30sIGRlcGVuZGVuY3kub3B0aW9ucywge1xuICAgICAgICAgICAgcmVnRXhwOiBkZXBlbmRlbmN5Lm9wdGlvbnMucmVnRXhwLnNvdXJjZSxcbiAgICAgICAgICB9KSA6XG4gICAgICAgICAgZGVwZW5kZW5jeS5vcHRpb25zLFxuICAgICAgICByYW5nZTogZGVwZW5kZW5jeS5yYW5nZSxcbiAgICAgICAgdmFsdWVSYW5nZTogZGVwZW5kZW5jeS52YWx1ZVJhbmdlLFxuICAgICAgfTtcbiAgICB9LFxuICAgIHRoYXcodGhhd2VkLCBmcm96ZW4sIGV4dHJhLCBtZXRob2RzKSB7XG4gICAgICByZXR1cm4gbmV3IEltcG9ydENvbnRleHREZXBlbmRlbmN5KFxuICAgICAgICBmcm96ZW4ub3B0aW9ucy5yZWdFeHAgP1xuICAgICAgICAgIE9iamVjdC5hc3NpZ24oe30sIGZyb3plbi5vcHRpb25zLCB7XG4gICAgICAgICAgICByZWdFeHA6IG5ldyBSZWdFeHAoZnJvemVuLm9wdGlvbnMucmVnRXhwKSxcbiAgICAgICAgICB9KSA6XG4gICAgICAgICAgZnJvemVuLm9wdGlvbnMsXG4gICAgICAgIGZyb3plbi5yYW5nZSxcbiAgICAgICAgZnJvemVuLnZhbHVlUmFuZ2UsXG4gICAgICApO1xuICAgIH0sXG4gIH0sXG5cbiAgb3B0aW9uYWwsXG5cbiAgd2FybmluZ3MsXG59KTtcblxuY29uc3QgSW1wb3J0RGVwZW5kZW5jeSA9IHJlcXVpcmUoJ3dlYnBhY2svbGliL2RlcGVuZGVuY2llcy9JbXBvcnREZXBlbmRlbmN5Jyk7XG5jb25zdCBJbXBvcnREZXBlbmRlbmN5U2VyaWFsID0gc2VyaWFsLnNlcmlhbCgnSW1wb3J0RGVwZW5kZW5jeScsIHtcbiAgY29uc3RydWN0b3I6IHtcbiAgICBmcmVlemUoXywgZGVwZW5kZW5jeSwgZXh0cmEsIG1ldGhvZHMpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHJlcXVlc3Q6IHJlbGF0ZUNvbnRleHQucmVsYXRlQWJzb2x1dGVSZXF1ZXN0KGV4dHJhLm1vZHVsZS5jb250ZXh0LCBkZXBlbmRlbmN5LnJlcXVlc3QpLFxuICAgICAgICBvcmlnaW5Nb2R1bGU6IG51bGwsXG4gICAgICAgIGJsb2NrOiAhZGVwZW5kZW5jeS5ibG9jay5kZXBlbmRlbmNpZXMuaW5jbHVkZXMoZGVwZW5kZW5jeSkgP1xuICAgICAgICAgIG1ldGhvZHMuZnJlZXplKCdEZXBlbmRlbmN5QmxvY2snLCBudWxsLCBkZXBlbmRlbmN5LmJsb2NrLCBleHRyYSkgOlxuICAgICAgICAgIHVuZGVmaW5lZCxcbiAgICAgIH07XG4gICAgfSxcbiAgICB0aGF3KHRoYXdlZCwgZnJvemVuLCBleHRyYSwgbWV0aG9kcykge1xuICAgICAgcmV0dXJuIG5ldyBJbXBvcnREZXBlbmRlbmN5KFxuICAgICAgICBmcm96ZW4ucmVxdWVzdCxcbiAgICAgICAgZXh0cmEubW9kdWxlLFxuICAgICAgICAhZnJvemVuLmJsb2NrID8gZXh0cmEucGFyZW50IDogbWV0aG9kcy50aGF3KCdEZXBlbmRlbmN5QmxvY2snLCBudWxsLCBmcm96ZW4uYmxvY2ssIGV4dHJhKSxcbiAgICAgICk7XG4gICAgfSxcbiAgfSxcblxuICBvcHRpb25hbCxcblxuICB3YXJuaW5ncyxcbn0pO1xuXG5jb25zdCBJbXBvcnRFYWdlckRlcGVuZGVuY3kgPSByZXF1aXJlKCd3ZWJwYWNrL2xpYi9kZXBlbmRlbmNpZXMvSW1wb3J0RWFnZXJEZXBlbmRlbmN5Jyk7XG5jb25zdCBJbXBvcnRFYWdlckRlcGVuZGVuY3lTZXJpYWwgPSBzZXJpYWwuc2VyaWFsKCdJbXBvcnRFYWdlckRlcGVuZGVuY3knLCB7XG4gIGNvbnN0cnVjdG9yOiB7XG4gICAgZnJlZXplKF8sIGRlcGVuZGVuY3ksIGV4dHJhLCBtZXRob2RzKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICByZXF1ZXN0OiByZWxhdGVDb250ZXh0LnJlbGF0ZUFic29sdXRlUmVxdWVzdChleHRyYS5tb2R1bGUuY29udGV4dCwgZGVwZW5kZW5jeS5yZXF1ZXN0KSxcbiAgICAgICAgb3JpZ2luTW9kdWxlOiBudWxsLFxuICAgICAgICByYW5nZTogZGVwZW5kZW5jeS5yYW5nZSxcbiAgICAgIH07XG4gICAgfSxcbiAgICB0aGF3KHRoYXdlZCwgZnJvemVuLCBleHRyYSwgbWV0aG9kcykge1xuICAgICAgcmV0dXJuIG5ldyBJbXBvcnRFYWdlckRlcGVuZGVuY3koXG4gICAgICAgIGZyb3plbi5yZXF1ZXN0LFxuICAgICAgICBleHRyYS5tb2R1bGUsXG4gICAgICAgIGZyb3plbi5yYW5nZSxcbiAgICAgICk7XG4gICAgfSxcbiAgfSxcblxuICBvcHRpb25hbCxcblxuICB3YXJuaW5ncyxcbn0pO1xuXG5jb25zdCBJbXBvcnRXZWFrRGVwZW5kZW5jeSA9IHJlcXVpcmUoJ3dlYnBhY2svbGliL2RlcGVuZGVuY2llcy9JbXBvcnRXZWFrRGVwZW5kZW5jeScpO1xuY29uc3QgSW1wb3J0V2Vha0RlcGVuZGVuY3lTZXJpYWwgPSBzZXJpYWwuc2VyaWFsKCdJbXBvcnRXZWFrRGVwZW5kZW5jeScsIHtcbiAgY29uc3RydWN0b3I6IHtcbiAgICBmcmVlemUoXywgZGVwZW5kZW5jeSwgZXh0cmEsIG1ldGhvZHMpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHJlcXVlc3Q6IHJlbGF0ZUNvbnRleHQucmVsYXRlQWJzb2x1dGVSZXF1ZXN0KGV4dHJhLm1vZHVsZS5jb250ZXh0LCBkZXBlbmRlbmN5LnJlcXVlc3QpLFxuICAgICAgICBvcmlnaW5Nb2R1bGU6IG51bGwsXG4gICAgICAgIHJhbmdlOiBkZXBlbmRlbmN5LnJhbmdlLFxuICAgICAgfTtcbiAgICB9LFxuICAgIHRoYXcodGhhd2VkLCBmcm96ZW4sIGV4dHJhLCBtZXRob2RzKSB7XG4gICAgICByZXR1cm4gbmV3IEltcG9ydFdlYWtEZXBlbmRlbmN5KFxuICAgICAgICBmcm96ZW4ucmVxdWVzdCxcbiAgICAgICAgZXh0cmEubW9kdWxlLFxuICAgICAgICBmcm96ZW4ucmFuZ2UsXG4gICAgICApO1xuICAgIH0sXG4gIH0sXG5cbiAgb3B0aW9uYWwsXG5cbiAgd2FybmluZ3MsXG59KTtcblxuY29uc3QgSnNvbkV4cG9ydHNEZXBlbmRlbmN5ID0gcmVxdWlyZSgnd2VicGFjay9saWIvZGVwZW5kZW5jaWVzL0pzb25FeHBvcnRzRGVwZW5kZW5jeScpO1xuY29uc3QgSnNvbkV4cG9ydHNEZXBlbmRlbmN5U2VyaWFsID0gc2VyaWFsLnNlcmlhbCgnSnNvbkV4cG9ydHNEZXBlbmRlbmN5Jywge1xuICBjb25zdHJ1Y3Rvcjoge1xuICAgIGZyZWV6ZShfLCBkZXBlbmRlbmN5LCBleHRyYSwgbWV0aG9kcykge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgZXhwb3J0czogZGVwZW5kZW5jeS5leHBvcnRzLFxuICAgICAgfTtcbiAgICB9LFxuICAgIHRoYXcodGhhd2VkLCBmcm96ZW4sIGV4dHJhLCBtZXRob2RzKSB7XG4gICAgICByZXR1cm4gbmV3IEpzb25FeHBvcnRzRGVwZW5kZW5jeShcbiAgICAgICAgZnJvemVuLmV4cG9ydHMsXG4gICAgICApO1xuICAgIH0sXG4gIH0sXG5cbiAgb3B0aW9uYWwsXG5cbiAgd2FybmluZ3MsXG59KTtcblxuY29uc3QgTG9hZGVyRGVwZW5kZW5jeSA9IHJlcXVpcmUoJ3dlYnBhY2svbGliL2RlcGVuZGVuY2llcy9Mb2FkZXJEZXBlbmRlbmN5Jyk7XG5jb25zdCBMb2FkZXJEZXBlbmRlbmN5U2VyaWFsID0gc2VyaWFsLnNlcmlhbCgnTG9hZGVyRGVwZW5kZW5jeScsIHtcbiAgY29uc3RydWN0b3I6IHtcbiAgICBmcmVlemUoXywgZGVwZW5kZW5jeSwgZXh0cmEsIG1ldGhvZHMpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHJlcXVlc3Q6IHJlbGF0ZUNvbnRleHQucmVsYXRlQWJzb2x1dGVSZXF1ZXN0KGV4dHJhLm1vZHVsZS5jb250ZXh0LCBkZXBlbmRlbmN5LnJlcXVlc3QpLFxuICAgICAgfTtcbiAgICB9LFxuICAgIHRoYXcodGhhd2VkLCBmcm96ZW4sIGV4dHJhLCBtZXRob2RzKSB7XG4gICAgICByZXR1cm4gbmV3IExvYWRlckRlcGVuZGVuY3koXG4gICAgICAgIGZyb3plbi5yZXF1ZXN0LFxuICAgICAgKTtcbiAgICB9LFxuICB9LFxuXG4gIG9wdGlvbmFsLFxuXG4gIHdhcm5pbmdzLFxufSk7XG5cbmNvbnN0IExvY2FsTW9kdWxlRGVwZW5kZW5jeSA9IHJlcXVpcmUoJ3dlYnBhY2svbGliL2RlcGVuZGVuY2llcy9Mb2NhbE1vZHVsZURlcGVuZGVuY3knKTtcbmNvbnN0IExvY2FsTW9kdWxlRGVwZW5kZW5jeVNlcmlhbCA9IHNlcmlhbC5zZXJpYWwoJ0xvY2FsTW9kdWxlRGVwZW5kZW5jeScsIHtcbiAgY29uc3RydWN0b3I6IHtcbiAgICBmcmVlemUoXywgZGVwZW5kZW5jeSwgZXh0cmEsIG1ldGhvZHMpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIGxvY2FsTW9kdWxlOiB7XG4gICAgICAgICAgbmFtZTogZGVwZW5kZW5jeS5sb2NhbE1vZHVsZS5uYW1lLFxuICAgICAgICAgIG5hbWU6IGRlcGVuZGVuY3kubG9jYWxNb2R1bGUuaWR4LFxuICAgICAgICB9LFxuICAgICAgICByYW5nZTogZGVwZW5kZW5jeS5yYW5nZSxcbiAgICAgICAgY2FsbE5ldzogZGVwZW5kZW5jeS5jYWxsTmV3LFxuICAgICAgfTtcbiAgICB9LFxuICAgIHRoYXcodGhhd2VkLCBmcm96ZW4sIGV4dHJhLCBtZXRob2RzKSB7XG4gICAgICBpZiAoIWV4dHJhLnN0YXRlLmxvY2FsTW9kdWxlcykge1xuICAgICAgICBleHRyYS5zdGF0ZS5sb2NhbE1vZHVsZXMgPSBbXTtcbiAgICAgIH1cbiAgICAgIGlmICghZXh0cmEuc3RhdGUubG9jYWxNb2R1bGVzW2Zyb3plbi5sb2NhbE1vZHVsZS5pZHhdKSB7XG4gICAgICAgIGV4dHJhLnN0YXRlLmxvY2FsTW9kdWxlc1tmcm96ZW4ubG9jYWxNb2R1bGUuaWR4XSA9IG5ldyBMb2NhbE1vZHVsZShleHRyYS5tb2R1bGUsIGZyb3plbi5sb2NhbE1vZHVsZS5uYW1lLCBmcm96ZW4ubG9jYWxNb2R1bGUuaWR4KTtcbiAgICAgICAgZXh0cmEuc3RhdGUubG9jYWxNb2R1bGVzW2Zyb3plbi5sb2NhbE1vZHVsZS5pZHhdLnVzZWQgPSBmcm96ZW4ubG9jYWxNb2R1bGUudXNlZDtcbiAgICAgIH1cbiAgICAgIHJldHVybiBuZXcgTG9jYWxNb2R1bGVEZXBlbmRlbmN5KFxuICAgICAgICBleHRyYS5zdGF0ZS5sb2NhbE1vZHVsZXNbZnJvemVuLmxvY2FsTW9kdWxlLmlkeF0sXG4gICAgICAgIGZyb3plbi5yYW5nZSxcbiAgICAgICAgZnJvemVuLmNhbGxOZXcsXG4gICAgICApO1xuICAgIH0sXG4gIH0sXG5cbiAgb3B0aW9uYWwsXG5cbiAgbG9jYWxNb2R1bGVBc3NpZ25lZCxcblxuICB3YXJuaW5ncyxcbn0pO1xuXG5jb25zdCBNb2R1bGVEZXBlbmRlbmN5ID0gcmVxdWlyZSgnd2VicGFjay9saWIvZGVwZW5kZW5jaWVzL01vZHVsZURlcGVuZGVuY3knKTtcbmNvbnN0IE1vZHVsZURlcGVuZGVuY3lTZXJpYWwgPSBzZXJpYWwuc2VyaWFsKCdNb2R1bGVEZXBlbmRlbmN5Jywge1xuICBjb25zdHJ1Y3Rvcjoge1xuICAgIGZyZWV6ZShfLCBkZXBlbmRlbmN5LCBleHRyYSwgbWV0aG9kcykge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgcmVxdWVzdDogcmVsYXRlQ29udGV4dC5yZWxhdGVBYnNvbHV0ZVJlcXVlc3QoZXh0cmEubW9kdWxlLmNvbnRleHQsIGRlcGVuZGVuY3kucmVxdWVzdCksXG4gICAgICB9O1xuICAgIH0sXG4gICAgdGhhdyh0aGF3ZWQsIGZyb3plbiwgZXh0cmEsIG1ldGhvZHMpIHtcbiAgICAgIHJldHVybiBuZXcgTW9kdWxlRGVwZW5kZW5jeShcbiAgICAgICAgZnJvemVuLnJlcXVlc3QsXG4gICAgICApO1xuICAgIH0sXG4gIH0sXG5cbiAgb3B0aW9uYWwsXG5cbiAgd2FybmluZ3MsXG59KTtcblxuY29uc3QgTW9kdWxlSG90QWNjZXB0RGVwZW5kZW5jeSA9IHJlcXVpcmUoJ3dlYnBhY2svbGliL2RlcGVuZGVuY2llcy9Nb2R1bGVIb3RBY2NlcHREZXBlbmRlbmN5Jyk7XG5jb25zdCBNb2R1bGVIb3RBY2NlcHREZXBlbmRlbmN5U2VyaWFsID0gc2VyaWFsLnNlcmlhbCgnTW9kdWxlSG90QWNjZXB0RGVwZW5kZW5jeScsIHtcbiAgY29uc3RydWN0b3I6IHtcbiAgICBmcmVlemUoXywgZGVwZW5kZW5jeSwgZXh0cmEsIG1ldGhvZHMpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHJlcXVlc3Q6IHJlbGF0ZUNvbnRleHQucmVsYXRlQWJzb2x1dGVSZXF1ZXN0KGV4dHJhLm1vZHVsZS5jb250ZXh0LCBkZXBlbmRlbmN5LnJlcXVlc3QpLFxuICAgICAgICByYW5nZTogZGVwZW5kZW5jeS5yYW5nZSxcbiAgICAgIH07XG4gICAgfSxcbiAgICB0aGF3KHRoYXdlZCwgZnJvemVuLCBleHRyYSwgbWV0aG9kcykge1xuICAgICAgcmV0dXJuIG5ldyBNb2R1bGVIb3RBY2NlcHREZXBlbmRlbmN5KFxuICAgICAgICBmcm96ZW4ucmVxdWVzdCxcbiAgICAgICAgZnJvemVuLnJhbmdlLFxuICAgICAgKTtcbiAgICB9LFxuICB9LFxuXG4gIG9wdGlvbmFsLFxuXG4gIHdhcm5pbmdzLFxufSk7XG5cbmNvbnN0IE1vZHVsZUhvdERlY2xpbmVEZXBlbmRlbmN5ID0gcmVxdWlyZSgnd2VicGFjay9saWIvZGVwZW5kZW5jaWVzL01vZHVsZUhvdERlY2xpbmVEZXBlbmRlbmN5Jyk7XG5jb25zdCBNb2R1bGVIb3REZWNsaW5lRGVwZW5kZW5jeVNlcmlhbCA9IHNlcmlhbC5zZXJpYWwoJ01vZHVsZUhvdERlY2xpbmVEZXBlbmRlbmN5Jywge1xuICBjb25zdHJ1Y3Rvcjoge1xuICAgIGZyZWV6ZShfLCBkZXBlbmRlbmN5LCBleHRyYSwgbWV0aG9kcykge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgcmVxdWVzdDogcmVsYXRlQ29udGV4dC5yZWxhdGVBYnNvbHV0ZVJlcXVlc3QoZXh0cmEubW9kdWxlLmNvbnRleHQsIGRlcGVuZGVuY3kucmVxdWVzdCksXG4gICAgICAgIHJhbmdlOiBkZXBlbmRlbmN5LnJhbmdlLFxuICAgICAgfTtcbiAgICB9LFxuICAgIHRoYXcodGhhd2VkLCBmcm96ZW4sIGV4dHJhLCBtZXRob2RzKSB7XG4gICAgICByZXR1cm4gbmV3IE1vZHVsZUhvdERlY2xpbmVEZXBlbmRlbmN5KFxuICAgICAgICBmcm96ZW4ucmVxdWVzdCxcbiAgICAgICAgZnJvemVuLnJhbmdlLFxuICAgICAgKTtcbiAgICB9LFxuICB9LFxuXG4gIG9wdGlvbmFsLFxuXG4gIHdhcm5pbmdzLFxufSk7XG5cbmNvbnN0IE11bHRpRW50cnlEZXBlbmRlbmN5ID0gcmVxdWlyZSgnd2VicGFjay9saWIvZGVwZW5kZW5jaWVzL011bHRpRW50cnlEZXBlbmRlbmN5Jyk7XG5jb25zdCBNdWx0aUVudHJ5RGVwZW5kZW5jeVNlcmlhbCA9IHNlcmlhbC5zZXJpYWwoJ011bHRpRW50cnlEZXBlbmRlbmN5Jywge1xuICBjb25zdHJ1Y3Rvcjoge1xuICAgIGZyZWV6ZShfLCBkZXBlbmRlbmN5LCBleHRyYSwgbWV0aG9kcykge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgZGVwZW5kZW5jaWVzOiBtZXRob2RzLm1hcEZyZWV6ZSgnRGVwZW5kZW5jeScsIG51bGwsIGRlcGVuZGVuY3kuZGVwZW5kZW5jaWVzLCBleHRyYSksXG4gICAgICAgIG5hbWU6IGRlcGVuZGVuY3kubmFtZSxcbiAgICAgIH07XG4gICAgfSxcbiAgICB0aGF3KHRoYXdlZCwgZnJvemVuLCBleHRyYSwgbWV0aG9kcykge1xuICAgICAgcmV0dXJuIG5ldyBNdWx0aUVudHJ5RGVwZW5kZW5jeShcbiAgICAgICAgbWV0aG9kcy5tYXBUaGF3KCdEZXBlbmRlbmN5JywgbnVsbCwgZnJvemVuLmRlcGVuZGVuY2llcywgZXh0cmEpLFxuICAgICAgICBmcm96ZW4ubmFtZSxcbiAgICAgICk7XG4gICAgfSxcbiAgfSxcblxuICBvcHRpb25hbCxcblxuICB3YXJuaW5ncyxcbn0pO1xuXG5jb25zdCBOdWxsRGVwZW5kZW5jeSA9IHJlcXVpcmUoJ3dlYnBhY2svbGliL2RlcGVuZGVuY2llcy9OdWxsRGVwZW5kZW5jeScpO1xuY29uc3QgTnVsbERlcGVuZGVuY3lTZXJpYWwgPSBzZXJpYWwuc2VyaWFsKCdOdWxsRGVwZW5kZW5jeScsIHtcbiAgY29uc3RydWN0b3I6IHtcbiAgICBmcmVlemUoXywgZGVwZW5kZW5jeSwgZXh0cmEsIG1ldGhvZHMpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICB9O1xuICAgIH0sXG4gICAgdGhhdyh0aGF3ZWQsIGZyb3plbiwgZXh0cmEsIG1ldGhvZHMpIHtcbiAgICAgIHJldHVybiBuZXcgTnVsbERlcGVuZGVuY3koXG4gICAgICApO1xuICAgIH0sXG4gIH0sXG5cbiAgb3B0aW9uYWwsXG5cbiAgd2FybmluZ3MsXG59KTtcblxuY29uc3QgUHJlZmV0Y2hEZXBlbmRlbmN5ID0gcmVxdWlyZSgnd2VicGFjay9saWIvZGVwZW5kZW5jaWVzL1ByZWZldGNoRGVwZW5kZW5jeScpO1xuY29uc3QgUHJlZmV0Y2hEZXBlbmRlbmN5U2VyaWFsID0gc2VyaWFsLnNlcmlhbCgnUHJlZmV0Y2hEZXBlbmRlbmN5Jywge1xuICBjb25zdHJ1Y3Rvcjoge1xuICAgIGZyZWV6ZShfLCBkZXBlbmRlbmN5LCBleHRyYSwgbWV0aG9kcykge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgcmVxdWVzdDogcmVsYXRlQ29udGV4dC5yZWxhdGVBYnNvbHV0ZVJlcXVlc3QoZXh0cmEubW9kdWxlLmNvbnRleHQsIGRlcGVuZGVuY3kucmVxdWVzdCksXG4gICAgICB9O1xuICAgIH0sXG4gICAgdGhhdyh0aGF3ZWQsIGZyb3plbiwgZXh0cmEsIG1ldGhvZHMpIHtcbiAgICAgIHJldHVybiBuZXcgUHJlZmV0Y2hEZXBlbmRlbmN5KFxuICAgICAgICBmcm96ZW4ucmVxdWVzdCxcbiAgICAgICk7XG4gICAgfSxcbiAgfSxcblxuICBvcHRpb25hbCxcblxuICB3YXJuaW5ncyxcbn0pO1xuXG5jb25zdCBSZXF1aXJlQ29udGV4dERlcGVuZGVuY3kgPSByZXF1aXJlKCd3ZWJwYWNrL2xpYi9kZXBlbmRlbmNpZXMvUmVxdWlyZUNvbnRleHREZXBlbmRlbmN5Jyk7XG5jb25zdCBSZXF1aXJlQ29udGV4dERlcGVuZGVuY3lTZXJpYWwgPSBzZXJpYWwuc2VyaWFsKCdSZXF1aXJlQ29udGV4dERlcGVuZGVuY3knLCB7XG4gIGNvbnN0cnVjdG9yOiB7XG4gICAgZnJlZXplKF8sIGRlcGVuZGVuY3ksIGV4dHJhLCBtZXRob2RzKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBvcHRpb25zOiBkZXBlbmRlbmN5Lm9wdGlvbnMucmVnRXhwID9cbiAgICAgICAgICBPYmplY3QuYXNzaWduKHt9LCBkZXBlbmRlbmN5Lm9wdGlvbnMsIHtcbiAgICAgICAgICAgIHJlZ0V4cDogZGVwZW5kZW5jeS5vcHRpb25zLnJlZ0V4cC5zb3VyY2UsXG4gICAgICAgICAgfSkgOlxuICAgICAgICAgIGRlcGVuZGVuY3kub3B0aW9ucyxcbiAgICAgICAgcmFuZ2U6IGRlcGVuZGVuY3kucmFuZ2UsXG4gICAgICB9O1xuICAgIH0sXG4gICAgdGhhdyh0aGF3ZWQsIGZyb3plbiwgZXh0cmEsIG1ldGhvZHMpIHtcbiAgICAgIHJldHVybiBuZXcgUmVxdWlyZUNvbnRleHREZXBlbmRlbmN5KFxuICAgICAgICBmcm96ZW4ub3B0aW9ucy5yZWdFeHAgP1xuICAgICAgICAgIE9iamVjdC5hc3NpZ24oe30sIGZyb3plbi5vcHRpb25zLCB7XG4gICAgICAgICAgICByZWdFeHA6IG5ldyBSZWdFeHAoZnJvemVuLm9wdGlvbnMucmVnRXhwKSxcbiAgICAgICAgICB9KSA6XG4gICAgICAgICAgZnJvemVuLm9wdGlvbnMsXG4gICAgICAgIGZyb3plbi5yYW5nZSxcbiAgICAgICk7XG4gICAgfSxcbiAgfSxcblxuICBvcHRpb25hbCxcblxuICB3YXJuaW5ncyxcbn0pO1xuXG5jb25zdCBSZXF1aXJlRW5zdXJlRGVwZW5kZW5jeSA9IHJlcXVpcmUoJ3dlYnBhY2svbGliL2RlcGVuZGVuY2llcy9SZXF1aXJlRW5zdXJlRGVwZW5kZW5jeScpO1xuY29uc3QgUmVxdWlyZUVuc3VyZURlcGVuZGVuY3lTZXJpYWwgPSBzZXJpYWwuc2VyaWFsKCdSZXF1aXJlRW5zdXJlRGVwZW5kZW5jeScsIHtcbiAgY29uc3RydWN0b3I6IHtcbiAgICBmcmVlemUoXywgZGVwZW5kZW5jeSwgZXh0cmEsIG1ldGhvZHMpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIGJsb2NrOiAhZGVwZW5kZW5jeS5ibG9jay5kZXBlbmRlbmNpZXMuaW5jbHVkZXMoZGVwZW5kZW5jeSkgP1xuICAgICAgICAgIG1ldGhvZHMuZnJlZXplKCdEZXBlbmRlbmN5QmxvY2snLCBudWxsLCBkZXBlbmRlbmN5LmJsb2NrLCBleHRyYSkgOlxuICAgICAgICAgIHVuZGVmaW5lZCxcbiAgICAgIH07XG4gICAgfSxcbiAgICB0aGF3KHRoYXdlZCwgZnJvemVuLCBleHRyYSwgbWV0aG9kcykge1xuICAgICAgcmV0dXJuIG5ldyBSZXF1aXJlRW5zdXJlRGVwZW5kZW5jeShcbiAgICAgICAgIWZyb3plbi5ibG9jayA/IGV4dHJhLnBhcmVudCA6IG1ldGhvZHMudGhhdygnRGVwZW5kZW5jeUJsb2NrJywgbnVsbCwgZnJvemVuLmJsb2NrLCBleHRyYSksXG4gICAgICApO1xuICAgIH0sXG4gIH0sXG5cbiAgb3B0aW9uYWwsXG5cbiAgd2FybmluZ3MsXG59KTtcblxuY29uc3QgUmVxdWlyZUVuc3VyZUl0ZW1EZXBlbmRlbmN5ID0gcmVxdWlyZSgnd2VicGFjay9saWIvZGVwZW5kZW5jaWVzL1JlcXVpcmVFbnN1cmVJdGVtRGVwZW5kZW5jeScpO1xuY29uc3QgUmVxdWlyZUVuc3VyZUl0ZW1EZXBlbmRlbmN5U2VyaWFsID0gc2VyaWFsLnNlcmlhbCgnUmVxdWlyZUVuc3VyZUl0ZW1EZXBlbmRlbmN5Jywge1xuICBjb25zdHJ1Y3Rvcjoge1xuICAgIGZyZWV6ZShfLCBkZXBlbmRlbmN5LCBleHRyYSwgbWV0aG9kcykge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgcmVxdWVzdDogcmVsYXRlQ29udGV4dC5yZWxhdGVBYnNvbHV0ZVJlcXVlc3QoZXh0cmEubW9kdWxlLmNvbnRleHQsIGRlcGVuZGVuY3kucmVxdWVzdCksXG4gICAgICB9O1xuICAgIH0sXG4gICAgdGhhdyh0aGF3ZWQsIGZyb3plbiwgZXh0cmEsIG1ldGhvZHMpIHtcbiAgICAgIHJldHVybiBuZXcgUmVxdWlyZUVuc3VyZUl0ZW1EZXBlbmRlbmN5KFxuICAgICAgICBmcm96ZW4ucmVxdWVzdCxcbiAgICAgICk7XG4gICAgfSxcbiAgfSxcblxuICBvcHRpb25hbCxcblxuICB3YXJuaW5ncyxcbn0pO1xuXG5jb25zdCBSZXF1aXJlSGVhZGVyRGVwZW5kZW5jeSA9IHJlcXVpcmUoJ3dlYnBhY2svbGliL2RlcGVuZGVuY2llcy9SZXF1aXJlSGVhZGVyRGVwZW5kZW5jeScpO1xuY29uc3QgUmVxdWlyZUhlYWRlckRlcGVuZGVuY3lTZXJpYWwgPSBzZXJpYWwuc2VyaWFsKCdSZXF1aXJlSGVhZGVyRGVwZW5kZW5jeScsIHtcbiAgY29uc3RydWN0b3I6IHtcbiAgICBmcmVlemUoXywgZGVwZW5kZW5jeSwgZXh0cmEsIG1ldGhvZHMpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHJhbmdlOiBkZXBlbmRlbmN5LnJhbmdlLFxuICAgICAgfTtcbiAgICB9LFxuICAgIHRoYXcodGhhd2VkLCBmcm96ZW4sIGV4dHJhLCBtZXRob2RzKSB7XG4gICAgICByZXR1cm4gbmV3IFJlcXVpcmVIZWFkZXJEZXBlbmRlbmN5KFxuICAgICAgICBmcm96ZW4ucmFuZ2UsXG4gICAgICApO1xuICAgIH0sXG4gIH0sXG5cbiAgb3B0aW9uYWwsXG5cbiAgd2FybmluZ3MsXG59KTtcblxuY29uc3QgUmVxdWlyZUluY2x1ZGVEZXBlbmRlbmN5ID0gcmVxdWlyZSgnd2VicGFjay9saWIvZGVwZW5kZW5jaWVzL1JlcXVpcmVJbmNsdWRlRGVwZW5kZW5jeScpO1xuY29uc3QgUmVxdWlyZUluY2x1ZGVEZXBlbmRlbmN5U2VyaWFsID0gc2VyaWFsLnNlcmlhbCgnUmVxdWlyZUluY2x1ZGVEZXBlbmRlbmN5Jywge1xuICBjb25zdHJ1Y3Rvcjoge1xuICAgIGZyZWV6ZShfLCBkZXBlbmRlbmN5LCBleHRyYSwgbWV0aG9kcykge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgcmVxdWVzdDogcmVsYXRlQ29udGV4dC5yZWxhdGVBYnNvbHV0ZVJlcXVlc3QoZXh0cmEubW9kdWxlLmNvbnRleHQsIGRlcGVuZGVuY3kucmVxdWVzdCksXG4gICAgICAgIHJhbmdlOiBkZXBlbmRlbmN5LnJhbmdlLFxuICAgICAgfTtcbiAgICB9LFxuICAgIHRoYXcodGhhd2VkLCBmcm96ZW4sIGV4dHJhLCBtZXRob2RzKSB7XG4gICAgICByZXR1cm4gbmV3IFJlcXVpcmVJbmNsdWRlRGVwZW5kZW5jeShcbiAgICAgICAgZnJvemVuLnJlcXVlc3QsXG4gICAgICAgIGZyb3plbi5yYW5nZSxcbiAgICAgICk7XG4gICAgfSxcbiAgfSxcblxuICBvcHRpb25hbCxcblxuICB3YXJuaW5ncyxcbn0pO1xuXG5jb25zdCBSZXF1aXJlUmVzb2x2ZUNvbnRleHREZXBlbmRlbmN5ID0gcmVxdWlyZSgnd2VicGFjay9saWIvZGVwZW5kZW5jaWVzL1JlcXVpcmVSZXNvbHZlQ29udGV4dERlcGVuZGVuY3knKTtcbmNvbnN0IFJlcXVpcmVSZXNvbHZlQ29udGV4dERlcGVuZGVuY3lTZXJpYWwgPSBzZXJpYWwuc2VyaWFsKCdSZXF1aXJlUmVzb2x2ZUNvbnRleHREZXBlbmRlbmN5Jywge1xuICBjb25zdHJ1Y3Rvcjoge1xuICAgIGZyZWV6ZShfLCBkZXBlbmRlbmN5LCBleHRyYSwgbWV0aG9kcykge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgb3B0aW9uczogZGVwZW5kZW5jeS5vcHRpb25zLnJlZ0V4cCA/XG4gICAgICAgICAgT2JqZWN0LmFzc2lnbih7fSwgZGVwZW5kZW5jeS5vcHRpb25zLCB7XG4gICAgICAgICAgICByZWdFeHA6IGRlcGVuZGVuY3kub3B0aW9ucy5yZWdFeHAuc291cmNlLFxuICAgICAgICAgIH0pIDpcbiAgICAgICAgICBkZXBlbmRlbmN5Lm9wdGlvbnMsXG4gICAgICAgIHJhbmdlOiBkZXBlbmRlbmN5LnJhbmdlLFxuICAgICAgICB2YWx1ZVJhbmdlOiBkZXBlbmRlbmN5LnZhbHVlUmFuZ2UsXG4gICAgICB9O1xuICAgIH0sXG4gICAgdGhhdyh0aGF3ZWQsIGZyb3plbiwgZXh0cmEsIG1ldGhvZHMpIHtcbiAgICAgIHJldHVybiBuZXcgUmVxdWlyZVJlc29sdmVDb250ZXh0RGVwZW5kZW5jeShcbiAgICAgICAgZnJvemVuLm9wdGlvbnMucmVnRXhwID9cbiAgICAgICAgICBPYmplY3QuYXNzaWduKHt9LCBmcm96ZW4ub3B0aW9ucywge1xuICAgICAgICAgICAgcmVnRXhwOiBuZXcgUmVnRXhwKGZyb3plbi5vcHRpb25zLnJlZ0V4cCksXG4gICAgICAgICAgfSkgOlxuICAgICAgICAgIGZyb3plbi5vcHRpb25zLFxuICAgICAgICBmcm96ZW4ucmFuZ2UsXG4gICAgICAgIGZyb3plbi52YWx1ZVJhbmdlLFxuICAgICAgKTtcbiAgICB9LFxuICB9LFxuXG4gIG9wdGlvbmFsLFxuXG4gIHdhcm5pbmdzLFxufSk7XG5cbmNvbnN0IFJlcXVpcmVSZXNvbHZlRGVwZW5kZW5jeSA9IHJlcXVpcmUoJ3dlYnBhY2svbGliL2RlcGVuZGVuY2llcy9SZXF1aXJlUmVzb2x2ZURlcGVuZGVuY3knKTtcbmNvbnN0IFJlcXVpcmVSZXNvbHZlRGVwZW5kZW5jeVNlcmlhbCA9IHNlcmlhbC5zZXJpYWwoJ1JlcXVpcmVSZXNvbHZlRGVwZW5kZW5jeScsIHtcbiAgY29uc3RydWN0b3I6IHtcbiAgICBmcmVlemUoXywgZGVwZW5kZW5jeSwgZXh0cmEsIG1ldGhvZHMpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHJlcXVlc3Q6IHJlbGF0ZUNvbnRleHQucmVsYXRlQWJzb2x1dGVSZXF1ZXN0KGV4dHJhLm1vZHVsZS5jb250ZXh0LCBkZXBlbmRlbmN5LnJlcXVlc3QpLFxuICAgICAgICByYW5nZTogZGVwZW5kZW5jeS5yYW5nZSxcbiAgICAgIH07XG4gICAgfSxcbiAgICB0aGF3KHRoYXdlZCwgZnJvemVuLCBleHRyYSwgbWV0aG9kcykge1xuICAgICAgcmV0dXJuIG5ldyBSZXF1aXJlUmVzb2x2ZURlcGVuZGVuY3koXG4gICAgICAgIGZyb3plbi5yZXF1ZXN0LFxuICAgICAgICBmcm96ZW4ucmFuZ2UsXG4gICAgICApO1xuICAgIH0sXG4gIH0sXG5cbiAgb3B0aW9uYWwsXG5cbiAgd2FybmluZ3MsXG59KTtcblxuY29uc3QgUmVxdWlyZVJlc29sdmVIZWFkZXJEZXBlbmRlbmN5ID0gcmVxdWlyZSgnd2VicGFjay9saWIvZGVwZW5kZW5jaWVzL1JlcXVpcmVSZXNvbHZlSGVhZGVyRGVwZW5kZW5jeScpO1xuY29uc3QgUmVxdWlyZVJlc29sdmVIZWFkZXJEZXBlbmRlbmN5U2VyaWFsID0gc2VyaWFsLnNlcmlhbCgnUmVxdWlyZVJlc29sdmVIZWFkZXJEZXBlbmRlbmN5Jywge1xuICBjb25zdHJ1Y3Rvcjoge1xuICAgIGZyZWV6ZShfLCBkZXBlbmRlbmN5LCBleHRyYSwgbWV0aG9kcykge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgcmFuZ2U6IGRlcGVuZGVuY3kucmFuZ2UsXG4gICAgICB9O1xuICAgIH0sXG4gICAgdGhhdyh0aGF3ZWQsIGZyb3plbiwgZXh0cmEsIG1ldGhvZHMpIHtcbiAgICAgIHJldHVybiBuZXcgUmVxdWlyZVJlc29sdmVIZWFkZXJEZXBlbmRlbmN5KFxuICAgICAgICBmcm96ZW4ucmFuZ2UsXG4gICAgICApO1xuICAgIH0sXG4gIH0sXG5cbiAgb3B0aW9uYWwsXG5cbiAgd2FybmluZ3MsXG59KTtcblxuY29uc3QgU2luZ2xlRW50cnlEZXBlbmRlbmN5ID0gcmVxdWlyZSgnd2VicGFjay9saWIvZGVwZW5kZW5jaWVzL1NpbmdsZUVudHJ5RGVwZW5kZW5jeScpO1xuY29uc3QgU2luZ2xlRW50cnlEZXBlbmRlbmN5U2VyaWFsID0gc2VyaWFsLnNlcmlhbCgnU2luZ2xlRW50cnlEZXBlbmRlbmN5Jywge1xuICBjb25zdHJ1Y3Rvcjoge1xuICAgIGZyZWV6ZShfLCBkZXBlbmRlbmN5LCBleHRyYSwgbWV0aG9kcykge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgcmVxdWVzdDogcmVsYXRlQ29udGV4dC5yZWxhdGVBYnNvbHV0ZVJlcXVlc3QoZXh0cmEubW9kdWxlLmNvbnRleHQsIGRlcGVuZGVuY3kucmVxdWVzdCksXG4gICAgICB9O1xuICAgIH0sXG4gICAgdGhhdyh0aGF3ZWQsIGZyb3plbiwgZXh0cmEsIG1ldGhvZHMpIHtcbiAgICAgIHJldHVybiBuZXcgU2luZ2xlRW50cnlEZXBlbmRlbmN5KFxuICAgICAgICBmcm96ZW4ucmVxdWVzdCxcbiAgICAgICk7XG4gICAgfSxcbiAgfSxcblxuICBvcHRpb25hbCxcblxuICB3YXJuaW5ncyxcbn0pO1xuXG5jb25zdCBVbnN1cHBvcnRlZERlcGVuZGVuY3kgPSByZXF1aXJlKCd3ZWJwYWNrL2xpYi9kZXBlbmRlbmNpZXMvVW5zdXBwb3J0ZWREZXBlbmRlbmN5Jyk7XG5jb25zdCBVbnN1cHBvcnRlZERlcGVuZGVuY3lTZXJpYWwgPSBzZXJpYWwuc2VyaWFsKCdVbnN1cHBvcnRlZERlcGVuZGVuY3knLCB7XG4gIGNvbnN0cnVjdG9yOiB7XG4gICAgZnJlZXplKF8sIGRlcGVuZGVuY3ksIGV4dHJhLCBtZXRob2RzKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICByZXF1ZXN0OiByZWxhdGVDb250ZXh0LnJlbGF0ZUFic29sdXRlUmVxdWVzdChleHRyYS5tb2R1bGUuY29udGV4dCwgZGVwZW5kZW5jeS5yZXF1ZXN0KSxcbiAgICAgICAgcmFuZ2U6IGRlcGVuZGVuY3kucmFuZ2UsXG4gICAgICB9O1xuICAgIH0sXG4gICAgdGhhdyh0aGF3ZWQsIGZyb3plbiwgZXh0cmEsIG1ldGhvZHMpIHtcbiAgICAgIHJldHVybiBuZXcgVW5zdXBwb3J0ZWREZXBlbmRlbmN5KFxuICAgICAgICBmcm96ZW4ucmVxdWVzdCxcbiAgICAgICAgZnJvemVuLnJhbmdlLFxuICAgICAgKTtcbiAgICB9LFxuICB9LFxuXG4gIG9wdGlvbmFsLFxuXG4gIHdhcm5pbmdzLFxufSk7XG5cbmNvbnN0IFdlYkFzc2VtYmx5SW1wb3J0RGVwZW5kZW5jeSA9IHJlcXVpcmUoJ3dlYnBhY2svbGliL2RlcGVuZGVuY2llcy9XZWJBc3NlbWJseUltcG9ydERlcGVuZGVuY3knKTtcbmNvbnN0IFdlYkFzc2VtYmx5SW1wb3J0RGVwZW5kZW5jeVNlcmlhbCA9IHNlcmlhbC5zZXJpYWwoJ1dlYkFzc2VtYmx5SW1wb3J0RGVwZW5kZW5jeScsIHtcbiAgY29uc3RydWN0b3I6IHtcbiAgICBmcmVlemUoXywgZGVwZW5kZW5jeSwgZXh0cmEsIG1ldGhvZHMpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHJlcXVlc3Q6IHJlbGF0ZUNvbnRleHQucmVsYXRlQWJzb2x1dGVSZXF1ZXN0KGV4dHJhLm1vZHVsZS5jb250ZXh0LCBkZXBlbmRlbmN5LnJlcXVlc3QpLFxuICAgICAgICBuYW1lOiBkZXBlbmRlbmN5Lm5hbWUsXG4gICAgICAgIGRlc2NyaXB0aW9uOiBkZXBlbmRlbmN5LmRlc2NyaXB0aW9uLFxuICAgICAgICBvbmx5RGlyZWN0SW1wb3J0OiBkZXBlbmRlbmN5Lm9ubHlEaXJlY3RJbXBvcnQsXG4gICAgICB9O1xuICAgIH0sXG4gICAgdGhhdyh0aGF3ZWQsIGZyb3plbiwgZXh0cmEsIG1ldGhvZHMpIHtcbiAgICAgIHJldHVybiBuZXcgV2ViQXNzZW1ibHlJbXBvcnREZXBlbmRlbmN5KFxuICAgICAgICBmcm96ZW4ucmVxdWVzdCxcbiAgICAgICAgZnJvemVuLm5hbWUsXG4gICAgICAgIGZyb3plbi5kZXNjcmlwdGlvbixcbiAgICAgICAgZnJvemVuLm9ubHlEaXJlY3RJbXBvcnQsXG4gICAgICApO1xuICAgIH0sXG4gIH0sXG5cbiAgb3B0aW9uYWwsXG5cbiAgd2FybmluZ3MsXG59KTtcblxuZXhwb3J0cy5tYXAgPSBuZXcgTWFwKCk7XG5leHBvcnRzLkFNRERlZmluZURlcGVuZGVuY3kgPSBBTUREZWZpbmVEZXBlbmRlbmN5U2VyaWFsO1xuZXhwb3J0cy5tYXAuc2V0KEFNRERlZmluZURlcGVuZGVuY3ksIEFNRERlZmluZURlcGVuZGVuY3lTZXJpYWwpO1xuZXhwb3J0cy5BTURSZXF1aXJlQXJyYXlEZXBlbmRlbmN5ID0gQU1EUmVxdWlyZUFycmF5RGVwZW5kZW5jeVNlcmlhbDtcbmV4cG9ydHMubWFwLnNldChBTURSZXF1aXJlQXJyYXlEZXBlbmRlbmN5LCBBTURSZXF1aXJlQXJyYXlEZXBlbmRlbmN5U2VyaWFsKTtcbmV4cG9ydHMuQU1EUmVxdWlyZUNvbnRleHREZXBlbmRlbmN5ID0gQU1EUmVxdWlyZUNvbnRleHREZXBlbmRlbmN5U2VyaWFsO1xuZXhwb3J0cy5tYXAuc2V0KEFNRFJlcXVpcmVDb250ZXh0RGVwZW5kZW5jeSwgQU1EUmVxdWlyZUNvbnRleHREZXBlbmRlbmN5U2VyaWFsKTtcbmV4cG9ydHMuQU1EUmVxdWlyZURlcGVuZGVuY3kgPSBBTURSZXF1aXJlRGVwZW5kZW5jeVNlcmlhbDtcbmV4cG9ydHMubWFwLnNldChBTURSZXF1aXJlRGVwZW5kZW5jeSwgQU1EUmVxdWlyZURlcGVuZGVuY3lTZXJpYWwpO1xuZXhwb3J0cy5BTURSZXF1aXJlSXRlbURlcGVuZGVuY3kgPSBBTURSZXF1aXJlSXRlbURlcGVuZGVuY3lTZXJpYWw7XG5leHBvcnRzLm1hcC5zZXQoQU1EUmVxdWlyZUl0ZW1EZXBlbmRlbmN5LCBBTURSZXF1aXJlSXRlbURlcGVuZGVuY3lTZXJpYWwpO1xuZXhwb3J0cy5Db21tb25Kc1JlcXVpcmVDb250ZXh0RGVwZW5kZW5jeSA9IENvbW1vbkpzUmVxdWlyZUNvbnRleHREZXBlbmRlbmN5U2VyaWFsO1xuZXhwb3J0cy5tYXAuc2V0KENvbW1vbkpzUmVxdWlyZUNvbnRleHREZXBlbmRlbmN5LCBDb21tb25Kc1JlcXVpcmVDb250ZXh0RGVwZW5kZW5jeVNlcmlhbCk7XG5leHBvcnRzLkNvbW1vbkpzUmVxdWlyZURlcGVuZGVuY3kgPSBDb21tb25Kc1JlcXVpcmVEZXBlbmRlbmN5U2VyaWFsO1xuZXhwb3J0cy5tYXAuc2V0KENvbW1vbkpzUmVxdWlyZURlcGVuZGVuY3ksIENvbW1vbkpzUmVxdWlyZURlcGVuZGVuY3lTZXJpYWwpO1xuZXhwb3J0cy5Db25zdERlcGVuZGVuY3kgPSBDb25zdERlcGVuZGVuY3lTZXJpYWw7XG5leHBvcnRzLm1hcC5zZXQoQ29uc3REZXBlbmRlbmN5LCBDb25zdERlcGVuZGVuY3lTZXJpYWwpO1xuZXhwb3J0cy5Db250ZXh0RGVwZW5kZW5jeSA9IENvbnRleHREZXBlbmRlbmN5U2VyaWFsO1xuZXhwb3J0cy5tYXAuc2V0KENvbnRleHREZXBlbmRlbmN5LCBDb250ZXh0RGVwZW5kZW5jeVNlcmlhbCk7XG5leHBvcnRzLkNvbnRleHRFbGVtZW50RGVwZW5kZW5jeSA9IENvbnRleHRFbGVtZW50RGVwZW5kZW5jeVNlcmlhbDtcbmV4cG9ydHMubWFwLnNldChDb250ZXh0RWxlbWVudERlcGVuZGVuY3ksIENvbnRleHRFbGVtZW50RGVwZW5kZW5jeVNlcmlhbCk7XG5leHBvcnRzLkNyaXRpY2FsRGVwZW5kZW5jeVdhcm5pbmcgPSBDcml0aWNhbERlcGVuZGVuY3lXYXJuaW5nU2VyaWFsO1xuZXhwb3J0cy5tYXAuc2V0KENyaXRpY2FsRGVwZW5kZW5jeVdhcm5pbmcsIENyaXRpY2FsRGVwZW5kZW5jeVdhcm5pbmdTZXJpYWwpO1xuZXhwb3J0cy5EZWxlZ2F0ZWRFeHBvcnRzRGVwZW5kZW5jeSA9IERlbGVnYXRlZEV4cG9ydHNEZXBlbmRlbmN5U2VyaWFsO1xuZXhwb3J0cy5tYXAuc2V0KERlbGVnYXRlZEV4cG9ydHNEZXBlbmRlbmN5LCBEZWxlZ2F0ZWRFeHBvcnRzRGVwZW5kZW5jeVNlcmlhbCk7XG5leHBvcnRzLkRlbGVnYXRlZFNvdXJjZURlcGVuZGVuY3kgPSBEZWxlZ2F0ZWRTb3VyY2VEZXBlbmRlbmN5U2VyaWFsO1xuZXhwb3J0cy5tYXAuc2V0KERlbGVnYXRlZFNvdXJjZURlcGVuZGVuY3ksIERlbGVnYXRlZFNvdXJjZURlcGVuZGVuY3lTZXJpYWwpO1xuZXhwb3J0cy5EbGxFbnRyeURlcGVuZGVuY3kgPSBEbGxFbnRyeURlcGVuZGVuY3lTZXJpYWw7XG5leHBvcnRzLm1hcC5zZXQoRGxsRW50cnlEZXBlbmRlbmN5LCBEbGxFbnRyeURlcGVuZGVuY3lTZXJpYWwpO1xuZXhwb3J0cy5IYXJtb255QWNjZXB0RGVwZW5kZW5jeSA9IEhhcm1vbnlBY2NlcHREZXBlbmRlbmN5U2VyaWFsO1xuZXhwb3J0cy5tYXAuc2V0KEhhcm1vbnlBY2NlcHREZXBlbmRlbmN5LCBIYXJtb255QWNjZXB0RGVwZW5kZW5jeVNlcmlhbCk7XG5leHBvcnRzLkhhcm1vbnlBY2NlcHRJbXBvcnREZXBlbmRlbmN5ID0gSGFybW9ueUFjY2VwdEltcG9ydERlcGVuZGVuY3lTZXJpYWw7XG5leHBvcnRzLm1hcC5zZXQoSGFybW9ueUFjY2VwdEltcG9ydERlcGVuZGVuY3ksIEhhcm1vbnlBY2NlcHRJbXBvcnREZXBlbmRlbmN5U2VyaWFsKTtcbmV4cG9ydHMuSGFybW9ueUNvbXBhdGliaWxpdHlEZXBlbmRlbmN5ID0gSGFybW9ueUNvbXBhdGliaWxpdHlEZXBlbmRlbmN5U2VyaWFsO1xuZXhwb3J0cy5tYXAuc2V0KEhhcm1vbnlDb21wYXRpYmlsaXR5RGVwZW5kZW5jeSwgSGFybW9ueUNvbXBhdGliaWxpdHlEZXBlbmRlbmN5U2VyaWFsKTtcbmV4cG9ydHMuSGFybW9ueUV4cG9ydEV4cHJlc3Npb25EZXBlbmRlbmN5ID0gSGFybW9ueUV4cG9ydEV4cHJlc3Npb25EZXBlbmRlbmN5U2VyaWFsO1xuZXhwb3J0cy5tYXAuc2V0KEhhcm1vbnlFeHBvcnRFeHByZXNzaW9uRGVwZW5kZW5jeSwgSGFybW9ueUV4cG9ydEV4cHJlc3Npb25EZXBlbmRlbmN5U2VyaWFsKTtcbmV4cG9ydHMuSGFybW9ueUV4cG9ydEhlYWRlckRlcGVuZGVuY3kgPSBIYXJtb255RXhwb3J0SGVhZGVyRGVwZW5kZW5jeVNlcmlhbDtcbmV4cG9ydHMubWFwLnNldChIYXJtb255RXhwb3J0SGVhZGVyRGVwZW5kZW5jeSwgSGFybW9ueUV4cG9ydEhlYWRlckRlcGVuZGVuY3lTZXJpYWwpO1xuZXhwb3J0cy5IYXJtb255RXhwb3J0SW1wb3J0ZWRTcGVjaWZpZXJEZXBlbmRlbmN5ID0gSGFybW9ueUV4cG9ydEltcG9ydGVkU3BlY2lmaWVyRGVwZW5kZW5jeVNlcmlhbDtcbmV4cG9ydHMubWFwLnNldChIYXJtb255RXhwb3J0SW1wb3J0ZWRTcGVjaWZpZXJEZXBlbmRlbmN5LCBIYXJtb255RXhwb3J0SW1wb3J0ZWRTcGVjaWZpZXJEZXBlbmRlbmN5U2VyaWFsKTtcbmV4cG9ydHMuSGFybW9ueUV4cG9ydFNwZWNpZmllckRlcGVuZGVuY3kgPSBIYXJtb255RXhwb3J0U3BlY2lmaWVyRGVwZW5kZW5jeVNlcmlhbDtcbmV4cG9ydHMubWFwLnNldChIYXJtb255RXhwb3J0U3BlY2lmaWVyRGVwZW5kZW5jeSwgSGFybW9ueUV4cG9ydFNwZWNpZmllckRlcGVuZGVuY3lTZXJpYWwpO1xuZXhwb3J0cy5IYXJtb255SW1wb3J0RGVwZW5kZW5jeSA9IEhhcm1vbnlJbXBvcnREZXBlbmRlbmN5U2VyaWFsO1xuZXhwb3J0cy5tYXAuc2V0KEhhcm1vbnlJbXBvcnREZXBlbmRlbmN5LCBIYXJtb255SW1wb3J0RGVwZW5kZW5jeVNlcmlhbCk7XG5leHBvcnRzLkhhcm1vbnlJbXBvcnRTaWRlRWZmZWN0RGVwZW5kZW5jeSA9IEhhcm1vbnlJbXBvcnRTaWRlRWZmZWN0RGVwZW5kZW5jeVNlcmlhbDtcbmV4cG9ydHMubWFwLnNldChIYXJtb255SW1wb3J0U2lkZUVmZmVjdERlcGVuZGVuY3ksIEhhcm1vbnlJbXBvcnRTaWRlRWZmZWN0RGVwZW5kZW5jeVNlcmlhbCk7XG5leHBvcnRzLkhhcm1vbnlJbXBvcnRTcGVjaWZpZXJEZXBlbmRlbmN5ID0gSGFybW9ueUltcG9ydFNwZWNpZmllckRlcGVuZGVuY3lTZXJpYWw7XG5leHBvcnRzLm1hcC5zZXQoSGFybW9ueUltcG9ydFNwZWNpZmllckRlcGVuZGVuY3ksIEhhcm1vbnlJbXBvcnRTcGVjaWZpZXJEZXBlbmRlbmN5U2VyaWFsKTtcbmV4cG9ydHMuSGFybW9ueUluaXREZXBlbmRlbmN5ID0gSGFybW9ueUluaXREZXBlbmRlbmN5U2VyaWFsO1xuZXhwb3J0cy5tYXAuc2V0KEhhcm1vbnlJbml0RGVwZW5kZW5jeSwgSGFybW9ueUluaXREZXBlbmRlbmN5U2VyaWFsKTtcbmV4cG9ydHMuSW1wb3J0Q29udGV4dERlcGVuZGVuY3kgPSBJbXBvcnRDb250ZXh0RGVwZW5kZW5jeVNlcmlhbDtcbmV4cG9ydHMubWFwLnNldChJbXBvcnRDb250ZXh0RGVwZW5kZW5jeSwgSW1wb3J0Q29udGV4dERlcGVuZGVuY3lTZXJpYWwpO1xuZXhwb3J0cy5JbXBvcnREZXBlbmRlbmN5ID0gSW1wb3J0RGVwZW5kZW5jeVNlcmlhbDtcbmV4cG9ydHMubWFwLnNldChJbXBvcnREZXBlbmRlbmN5LCBJbXBvcnREZXBlbmRlbmN5U2VyaWFsKTtcbmV4cG9ydHMuSW1wb3J0RWFnZXJEZXBlbmRlbmN5ID0gSW1wb3J0RWFnZXJEZXBlbmRlbmN5U2VyaWFsO1xuZXhwb3J0cy5tYXAuc2V0KEltcG9ydEVhZ2VyRGVwZW5kZW5jeSwgSW1wb3J0RWFnZXJEZXBlbmRlbmN5U2VyaWFsKTtcbmV4cG9ydHMuSW1wb3J0V2Vha0RlcGVuZGVuY3kgPSBJbXBvcnRXZWFrRGVwZW5kZW5jeVNlcmlhbDtcbmV4cG9ydHMubWFwLnNldChJbXBvcnRXZWFrRGVwZW5kZW5jeSwgSW1wb3J0V2Vha0RlcGVuZGVuY3lTZXJpYWwpO1xuZXhwb3J0cy5Kc29uRXhwb3J0c0RlcGVuZGVuY3kgPSBKc29uRXhwb3J0c0RlcGVuZGVuY3lTZXJpYWw7XG5leHBvcnRzLm1hcC5zZXQoSnNvbkV4cG9ydHNEZXBlbmRlbmN5LCBKc29uRXhwb3J0c0RlcGVuZGVuY3lTZXJpYWwpO1xuZXhwb3J0cy5Mb2FkZXJEZXBlbmRlbmN5ID0gTG9hZGVyRGVwZW5kZW5jeVNlcmlhbDtcbmV4cG9ydHMubWFwLnNldChMb2FkZXJEZXBlbmRlbmN5LCBMb2FkZXJEZXBlbmRlbmN5U2VyaWFsKTtcbmV4cG9ydHMuTG9jYWxNb2R1bGVEZXBlbmRlbmN5ID0gTG9jYWxNb2R1bGVEZXBlbmRlbmN5U2VyaWFsO1xuZXhwb3J0cy5tYXAuc2V0KExvY2FsTW9kdWxlRGVwZW5kZW5jeSwgTG9jYWxNb2R1bGVEZXBlbmRlbmN5U2VyaWFsKTtcbmV4cG9ydHMuTW9kdWxlRGVwZW5kZW5jeSA9IE1vZHVsZURlcGVuZGVuY3lTZXJpYWw7XG5leHBvcnRzLm1hcC5zZXQoTW9kdWxlRGVwZW5kZW5jeSwgTW9kdWxlRGVwZW5kZW5jeVNlcmlhbCk7XG5leHBvcnRzLk1vZHVsZUhvdEFjY2VwdERlcGVuZGVuY3kgPSBNb2R1bGVIb3RBY2NlcHREZXBlbmRlbmN5U2VyaWFsO1xuZXhwb3J0cy5tYXAuc2V0KE1vZHVsZUhvdEFjY2VwdERlcGVuZGVuY3ksIE1vZHVsZUhvdEFjY2VwdERlcGVuZGVuY3lTZXJpYWwpO1xuZXhwb3J0cy5Nb2R1bGVIb3REZWNsaW5lRGVwZW5kZW5jeSA9IE1vZHVsZUhvdERlY2xpbmVEZXBlbmRlbmN5U2VyaWFsO1xuZXhwb3J0cy5tYXAuc2V0KE1vZHVsZUhvdERlY2xpbmVEZXBlbmRlbmN5LCBNb2R1bGVIb3REZWNsaW5lRGVwZW5kZW5jeVNlcmlhbCk7XG5leHBvcnRzLk11bHRpRW50cnlEZXBlbmRlbmN5ID0gTXVsdGlFbnRyeURlcGVuZGVuY3lTZXJpYWw7XG5leHBvcnRzLm1hcC5zZXQoTXVsdGlFbnRyeURlcGVuZGVuY3ksIE11bHRpRW50cnlEZXBlbmRlbmN5U2VyaWFsKTtcbmV4cG9ydHMuTnVsbERlcGVuZGVuY3kgPSBOdWxsRGVwZW5kZW5jeVNlcmlhbDtcbmV4cG9ydHMubWFwLnNldChOdWxsRGVwZW5kZW5jeSwgTnVsbERlcGVuZGVuY3lTZXJpYWwpO1xuZXhwb3J0cy5QcmVmZXRjaERlcGVuZGVuY3kgPSBQcmVmZXRjaERlcGVuZGVuY3lTZXJpYWw7XG5leHBvcnRzLm1hcC5zZXQoUHJlZmV0Y2hEZXBlbmRlbmN5LCBQcmVmZXRjaERlcGVuZGVuY3lTZXJpYWwpO1xuZXhwb3J0cy5SZXF1aXJlQ29udGV4dERlcGVuZGVuY3kgPSBSZXF1aXJlQ29udGV4dERlcGVuZGVuY3lTZXJpYWw7XG5leHBvcnRzLm1hcC5zZXQoUmVxdWlyZUNvbnRleHREZXBlbmRlbmN5LCBSZXF1aXJlQ29udGV4dERlcGVuZGVuY3lTZXJpYWwpO1xuZXhwb3J0cy5SZXF1aXJlRW5zdXJlRGVwZW5kZW5jeSA9IFJlcXVpcmVFbnN1cmVEZXBlbmRlbmN5U2VyaWFsO1xuZXhwb3J0cy5tYXAuc2V0KFJlcXVpcmVFbnN1cmVEZXBlbmRlbmN5LCBSZXF1aXJlRW5zdXJlRGVwZW5kZW5jeVNlcmlhbCk7XG5leHBvcnRzLlJlcXVpcmVFbnN1cmVJdGVtRGVwZW5kZW5jeSA9IFJlcXVpcmVFbnN1cmVJdGVtRGVwZW5kZW5jeVNlcmlhbDtcbmV4cG9ydHMubWFwLnNldChSZXF1aXJlRW5zdXJlSXRlbURlcGVuZGVuY3ksIFJlcXVpcmVFbnN1cmVJdGVtRGVwZW5kZW5jeVNlcmlhbCk7XG5leHBvcnRzLlJlcXVpcmVIZWFkZXJEZXBlbmRlbmN5ID0gUmVxdWlyZUhlYWRlckRlcGVuZGVuY3lTZXJpYWw7XG5leHBvcnRzLm1hcC5zZXQoUmVxdWlyZUhlYWRlckRlcGVuZGVuY3ksIFJlcXVpcmVIZWFkZXJEZXBlbmRlbmN5U2VyaWFsKTtcbmV4cG9ydHMuUmVxdWlyZUluY2x1ZGVEZXBlbmRlbmN5ID0gUmVxdWlyZUluY2x1ZGVEZXBlbmRlbmN5U2VyaWFsO1xuZXhwb3J0cy5tYXAuc2V0KFJlcXVpcmVJbmNsdWRlRGVwZW5kZW5jeSwgUmVxdWlyZUluY2x1ZGVEZXBlbmRlbmN5U2VyaWFsKTtcbmV4cG9ydHMuUmVxdWlyZVJlc29sdmVDb250ZXh0RGVwZW5kZW5jeSA9IFJlcXVpcmVSZXNvbHZlQ29udGV4dERlcGVuZGVuY3lTZXJpYWw7XG5leHBvcnRzLm1hcC5zZXQoUmVxdWlyZVJlc29sdmVDb250ZXh0RGVwZW5kZW5jeSwgUmVxdWlyZVJlc29sdmVDb250ZXh0RGVwZW5kZW5jeVNlcmlhbCk7XG5leHBvcnRzLlJlcXVpcmVSZXNvbHZlRGVwZW5kZW5jeSA9IFJlcXVpcmVSZXNvbHZlRGVwZW5kZW5jeVNlcmlhbDtcbmV4cG9ydHMubWFwLnNldChSZXF1aXJlUmVzb2x2ZURlcGVuZGVuY3ksIFJlcXVpcmVSZXNvbHZlRGVwZW5kZW5jeVNlcmlhbCk7XG5leHBvcnRzLlJlcXVpcmVSZXNvbHZlSGVhZGVyRGVwZW5kZW5jeSA9IFJlcXVpcmVSZXNvbHZlSGVhZGVyRGVwZW5kZW5jeVNlcmlhbDtcbmV4cG9ydHMubWFwLnNldChSZXF1aXJlUmVzb2x2ZUhlYWRlckRlcGVuZGVuY3ksIFJlcXVpcmVSZXNvbHZlSGVhZGVyRGVwZW5kZW5jeVNlcmlhbCk7XG5leHBvcnRzLlNpbmdsZUVudHJ5RGVwZW5kZW5jeSA9IFNpbmdsZUVudHJ5RGVwZW5kZW5jeVNlcmlhbDtcbmV4cG9ydHMubWFwLnNldChTaW5nbGVFbnRyeURlcGVuZGVuY3ksIFNpbmdsZUVudHJ5RGVwZW5kZW5jeVNlcmlhbCk7XG5leHBvcnRzLlVuc3VwcG9ydGVkRGVwZW5kZW5jeSA9IFVuc3VwcG9ydGVkRGVwZW5kZW5jeVNlcmlhbDtcbmV4cG9ydHMubWFwLnNldChVbnN1cHBvcnRlZERlcGVuZGVuY3ksIFVuc3VwcG9ydGVkRGVwZW5kZW5jeVNlcmlhbCk7XG5leHBvcnRzLldlYkFzc2VtYmx5SW1wb3J0RGVwZW5kZW5jeSA9IFdlYkFzc2VtYmx5SW1wb3J0RGVwZW5kZW5jeVNlcmlhbDtcbmV4cG9ydHMubWFwLnNldChXZWJBc3NlbWJseUltcG9ydERlcGVuZGVuY3ksIFdlYkFzc2VtYmx5SW1wb3J0RGVwZW5kZW5jeVNlcmlhbCk7XG4iXSwic291cmNlUm9vdCI6Ii9Vc2Vycy90eWxlcmFyYnVzL2Rldi9wcm92aWRlci9zcmMifQ==

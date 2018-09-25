'use strict';

const NormalModule = require('webpack/lib/NormalModule');
const Module = require('webpack/lib/Module');

const nodeObjectHash = require('node-object-hash');

const logMessages = require('./util/log-messages');
const {
  relateNormalPath,
  relateNormalRequest,
  relateNormalPathSet,
  relateNormalLoaders
} = require('./util/relate-context');
const pluginCompat = require('./util/plugin-compat');
const serial = require('./util/serial');

const serialResolveRequest = serial.created({
  context: serial.path,
  request: serial.request
});

const serialResolved = serial.created({
  // context: serial.path,
  // request: serial.request,
  // userRequest: serial.request,
  // rawRequest: serial.request,
  resource: serial.request,
  resolveOptions: serial.identity
  // loaders: serial.loaders,
});

const serialJson = {
  freeze(arg, value, extra) {
    return JSON.parse(arg);
  },
  thaw(arg, frozen, extra) {
    return JSON.stringify(arg);
  }
};

const serialMap = serial.map;

const serialResolvedMap = serial.map(serial.pipe({ freeze: serialJson.freeze, thaw: serial.identity.thaw }, serialResolveRequest, { freeze: serial.identity.freeze, thaw: serialJson.thaw }), serialResolved);

const serialResourceHashMap = serial.map(serial.request, serial.identity);

const serialNormalConstructor4 = serial.constructed(NormalModule, {
  data: serial.pipe({ freeze: (arg, module) => module, thaw: arg => arg }, serial.created({
    type: serial.identity,
    request: serial.request,
    userRequest: serial.request,
    rawRequest: serial.request,
    loaders: serial.loaders,
    resource: serial.path,
    parser: serial.parser,
    generator: serial.generator,
    resolveOptions: serial.identity
  }))
});

const serialNormalModuleExtra4 = {
  freeze() {},
  thaw(arg, frozen, extra, methods) {
    extra.module = arg;
    return arg;
  }
};

const serialNormalIdentifier4 = {
  freeze(arg, module, extra, methods) {
    return serial.request.freeze(module.identifier(), null, extra, methods);
  },
  thaw(arg) {
    return arg;
  }
};

const serialNormalAssigned4 = serial.assigned({
  factoryMeta: serial.identity,
  issuer: serial.pipe({
    freeze(arg, { issuer }) {
      return issuer && typeof issuer === 'object' ? issuer.identifier() : issuer;
    },
    thaw(arg, frozen, extra) {
      return arg;
    }
  }, serial.request, {
    freeze(arg) {
      return arg;
    },
    thaw(arg, frozen, { compilation }) {
      if (compilation.modules) {
        for (const module of compilation.modules) {
          if (module && typeof module.identifier === 'function' && module.identifier() === arg) {
            return module;
          }
        }
        for (const cacheId in compilation.cache) {
          const module = compilation.cache[cacheId];
          if (module && typeof module.identifier === 'function' && module.identifier() === arg) {
            return module;
          }
        }
      }
      return arg;
    }
  }),
  useSourceMap: serial.identity,
  lineToLine: serial.identity
});

const serialNormalOriginExtra4 = {
  freeze() {},
  thaw(arg, frozen, extra) {
    if (typeof arg.issuer === 'object') {
      extra.origin = arg.issuer;
    }
    return arg;
  }
};

const serialNormalBuild4 = serial.assigned({
  built: serial.identity,
  buildTimestamp: serial.identity,
  buildMeta: serial.identity,
  buildInfo: serial.created({
    assets: serial.moduleAssets,
    cacheable: serial.identity,
    contextDependencies: serial.pathSet,
    exportsArgument: serial.identity,
    fileDependencies: serial.pathSet,
    harmonyModule: serial.identity,
    jsonData: serial.identity,
    strict: serial.identity
  }),
  warnings: serial.moduleWarning,
  errors: serial.moduleError,
  _source: serial.source,
  _buildHash: serial.identity,
  hash: serial.identity,
  _lastSuccessfulBuildMeta: serial.identity,

  __hardSource_resolved: serialResolvedMap,
  __hardSource_oldHashes: serial.pipe({
    freeze(arg, module, extra) {
      const obj = {};
      const cachedMd5s = extra.compilation.__hardSourceFileMd5s;

      for (const file of module.buildInfo.fileDependencies) {
        obj[file] = cachedMd5s[file];
      }
      for (const dir of module.buildInfo.contextDependencies) {
        obj[dir] = cachedMd5s[dir];
      }

      return obj;
    },
    thaw: serial.identity.thaw
  }, serialResourceHashMap)
});

const serialNormalError4 = {
  freeze() {},
  thaw(arg, module, extra) {
    arg.error = arg.errors[0] || null;
    return arg;
  }
};

const serialNormalSourceExtra4 = {
  freeze() {},
  thaw(arg, module, extra) {
    extra.source = arg._source;
    return arg;
  }
};

const serialNormalSource4 = serial.assigned({
  _cachedSource: serial.source,
  _cachedSourceHash: serial.identity,
  renderedHash: serial.identity
});

const serialNormalModule4PreBuild = serial.serial('NormalModule', {
  constructor: serialNormalConstructor4,
  setModuleExtra: serialNormalModuleExtra4,
  identifier: serialNormalIdentifier4,
  assigned: serialNormalAssigned4,
  setOriginExtra: serialNormalOriginExtra4
});

const serialNormalModule4PostBuild = serial.serial('NormalModule', {
  build: serialNormalBuild4,
  dependencyBlock: serial.dependencyBlock,
  setError: serialNormalError4,
  setSourceExtra: serialNormalSourceExtra4,
  source: serialNormalSource4
});

const serialNormalModule4 = serial.serial('NormalModule', {
  constructor: serialNormalConstructor4,
  setModuleExtra: serialNormalModuleExtra4,
  identifier: serialNormalIdentifier4,
  assigned: serialNormalAssigned4,
  setOriginExtra: serialNormalOriginExtra4,
  build: serialNormalBuild4,
  dependencyBlock: serial.dependencyBlock,
  setError: serialNormalError4,
  setSourceExtra: serialNormalSourceExtra4,
  source: serialNormalSource4
});

const needRebuild4 = function () {
  if (this.error) {
    this.cacheItem.invalid = true;
    this.cacheItem.invalidReason = 'error building';
    return true;
  }
  const fileHashes = this.__hardSourceFileMd5s;
  const cachedHashes = this.__hardSourceCachedMd5s;
  const resolvedLast = this.__hardSource_resolved;
  const missingCache = this.__hardSource_missingCache;

  for (const file of this.buildInfo.fileDependencies) {
    if (!cachedHashes[file] || fileHashes[file] !== cachedHashes[file]) {
      this.cacheItem.invalid = true;
      this.cacheItem.invalidReason = 'md5 mismatch';
      return true;
    }
  }
  for (const dir of this.buildInfo.contextDependencies) {
    if (!cachedHashes[dir] || fileHashes[dir] !== cachedHashes[dir]) {
      this.cacheItem.invalid = true;
      this.cacheItem.invalidReason = 'md5 mismatch';
      return true;
    }
  }

  let resolvedNeedRebuild = false;
  for (const _resolveKey in resolvedLast) {
    const resolveKey = JSON.parse(_resolveKey);
    const resolved = resolvedLast[_resolveKey];
    let normalId = 'normal';
    if (resolved.resolveOptions) {
      normalId = `normal-${new nodeObjectHash({ sort: false }).hash(resolved.resolveOptions)}`;
    }
    const resolvedMissing = missingCache[normalId] && missingCache[normalId][JSON.stringify([resolveKey.context, resolved.resource.split('?')[0]])];
    if (!resolvedMissing || resolvedMissing.invalid) {
      resolved.invalid = true;
      resolved.invalidReason = `resolved normal invalid${resolvedMissing ? ` ${resolvedMissing.invalidReason}` : ': resolve entry not in cache'}`;
      resolvedNeedRebuild = true;
    }
  }
  return resolvedNeedRebuild;
};

const serialNormalModule3 = serial.serial('NormalModule', {
  constructor: serial.constructed(NormalModule, {
    request: serial.request,
    userRequest: serial.request,
    rawRequest: serial.request,
    loaders: serial.loaders,
    resource: serial.path,
    parser: serial.parser
  }),

  setModuleExtra: serialNormalModuleExtra4,
  // Used internally by HardSource
  identifier: serialNormalIdentifier4,

  assigned: serial.assigned({
    issuer: serial.pipe({
      freeze(arg, { issuer }) {
        return issuer && typeof issuer === 'object' ? issuer.identifier() : issuer;
      },
      thaw(arg, frozen, extra) {
        return arg;
      }
    }, serial.request, {
      freeze(arg) {
        return arg;
      },
      thaw(arg, frozen, { compilation }) {
        if (compilation.modules) {
          for (const module of compilation.modules) {
            if (module && typeof module.identifier === 'function' && module.identifier() === arg) {
              return module;
            }
          }
          for (const cacheId in compilation.cache) {
            const module = compilation.cache[cacheId];
            if (module && typeof module.identifier === 'function' && module.identifier() === arg) {
              return module;
            }
          }
        }
        return arg;
      }
    }),
    useSourceMap: serial.identity,
    lineToLine: serial.identity
  }),

  setOriginExtra: {
    freeze() {},
    thaw(arg, frozen, extra) {
      if (typeof arg.issuer === 'object') {
        extra.origin = arg.issuer;
      }
      return arg;
    }
  },

  build: serial.assigned({
    built: serial.identity,
    buildTimestamp: serial.identity,
    cacheable: serial.identity,
    meta: serial.identity,
    assets: serial.moduleAssets,
    fileDependencies: serial.pathArray,
    contextDependencies: serial.pathArray,
    harmonyModule: serial.identity,
    strict: serial.identity,
    exportsArgument: serial.identity,
    warnings: serial.moduleWarning,
    errors: serial.moduleError,
    _source: serial.source,

    __hardSource_resolved: serialResolvedMap,
    __hardSource_oldHashes: serial.pipe({
      freeze(arg, module, extra) {
        const obj = {};
        const cachedMd5s = extra.compilation.__hardSourceCachedMd5s;

        for (const file of module.fileDependencies) {
          obj[file] = cachedMd5s[file];
        }
        for (const dir of module.contextDependencies) {
          obj[dir] = cachedMd5s[dir];
        }

        return obj;
      },
      thaw: serial.identity.thaw
    }, serialResourceHashMap)
  }),

  hash: {
    freeze(arg, module, { compilation }, methods) {
      return module.getHashDigest(compilation.dependencyTemplates);
    },
    thaw(arg) {
      return arg;
    }
  },

  dependencyBlock: serial.dependencyBlock,

  setError: {
    freeze() {},
    thaw(arg, module, extra) {
      arg.error = arg.errors[0] || null;
      return arg;
    }
  },

  setSourceExtra: {
    freeze() {},
    thaw(arg, module, extra) {
      extra.source = arg._source;
      return arg;
    }
  },

  source: serial.assigned({
    _cachedSource: serial.created({
      source: serial.source,
      hash: serial.identity
    })
  })
});

const needRebuild3 = function () {
  if (this.error) {
    this.cacheItem.invalid = true;
    this.cacheItem.invalidReason = 'error building';
    return true;
  }
  const fileHashes = this.__hardSourceFileMd5s;
  const cachedHashes = this.__hardSourceCachedMd5s;
  const resolvedLast = this.__hardSource_resolved;
  const missingCache = this.__hardSource_missingCache;

  for (const file of this.fileDependencies) {
    if (!cachedHashes[file] || fileHashes[file] !== cachedHashes[file]) {
      this.cacheItem.invalid = true;
      this.cacheItem.invalidReason = 'md5 mismatch';
      return true;
    }
  }
  for (const dir of this.contextDependencies) {
    if (!cachedHashes[dir] || fileHashes[dir] !== cachedHashes[dir]) {
      this.cacheItem.invalid = true;
      this.cacheItem.invalidReason = 'md5 mismatch';
      return true;
    }
  }

  let resolvedNeedRebuild = false;
  for (const _resolveKey in resolvedLast) {
    const resolveKey = JSON.parse(_resolveKey);
    const resolved = resolvedLast[_resolveKey];
    let normalId = 'normal';
    if (resolved.resolveOptions) {
      normalId = `normal-${new nodeObjectHash({ sort: false }).hash(resolved.resolveOptions)}`;
    }
    const resolvedMissing = missingCache[normalId] && missingCache[normalId][JSON.stringify([resolveKey.context, resolved.resource.split('?')[0]])];
    if (!resolvedMissing || resolvedMissing.invalid) {
      resolved.invalid = true;
      resolved.invalidReason = `resolved normal invalid${resolvedMissing ? ` ${resolvedMissing.invalidReason}` : ': resolve entry not in cache'}`;
      resolvedNeedRebuild = true;
    }
  }

  return resolvedNeedRebuild;
};

const cacheable = module => module.buildInfo ? module.buildInfo.cacheable : module.cacheable;

class TransformNormalModulePlugin {
  constructor(options) {
    this.options = options || {};
  }

  apply(compiler) {
    const schema = this.options.schema;

    let serialNormalModule = serialNormalModule4;
    let needRebuild = needRebuild4;
    if (schema < 4) {
      serialNormalModule = serialNormalModule3;
      needRebuild = needRebuild3;
    }

    let createHash;
    if (schema >= 4) {
      createHash = require('webpack/lib/util/createHash');
    }

    let freeze;
    let mapFreeze;
    let _methods;

    pluginCompat.tap(compiler, '_hardSourceMethods', 'TransformNormalModulePlugin', methods => {
      _methods = methods;

      // store = methods.store;
      // fetch = methods.fetch;
      freeze = methods.freeze;
      // thaw = methods.thaw;
      mapFreeze = methods.mapFreeze;
      // mapThaw = methods.mapThaw;
    });

    pluginCompat.tap(compiler, 'compilation', 'TransformNormalModulePlugin', compilation => {
      pluginCompat.tap(compilation, 'succeedModule', 'TransformNormalModulePlugin', module => {
        if (module instanceof NormalModule) {
          try {
            module._dependencyBlock = freeze('DependencyBlock', null, module, {
              module,
              parent: module,
              compilation
            });
          } catch (e) {
            logMessages.moduleFreezeError(compilation, module, e);
          }
        }
      });
    });

    pluginCompat.tap(compiler, '_hardSourceFreezeModule', 'TransformNormalModulePlugin', (frozen, module, extra) => {
      // Set hash if it was not set.
      if (schema === 4 && module instanceof NormalModule && module.buildTimestamp && !module.hash) {
        const outputOptions = extra.compilation.outputOptions;
        const hashFunction = outputOptions.hashFunction;
        const hashDigest = outputOptions.hashDigest;
        const hashDigestLength = outputOptions.hashDigestLength;

        if (module.buildInfo && module._initBuildHash) {
          module._initBuildHash(extra.compilation);
        }

        const moduleHash = createHash(hashFunction);
        module.updateHash(moduleHash);
        module.hash = moduleHash.digest(hashDigest);
        module.renderedHash = module.hash.substr(0, hashDigestLength);
        if (module._cachedSource) {
          module._cachedSourceHash = module.getHashDigest(extra.compilation.dependencyTemplates);
        }
      }

      if (module.request && (cacheable(module) || !module.built) && module instanceof NormalModule && (!frozen || schema >= 4 && module.hash !== frozen.build.hash || schema < 4 && module.getHashDigest(extra.compilation.dependencyTemplates) !== frozen.hash)) {
        const compilation = extra.compilation;

        if (module.cacheItem) {
          module.cacheItem.invalid = false;
          module.cacheItem.invalidReason = null;
        }

        let serialModule = serialNormalModule;
        if (!module.built) {
          serialModule = serialNormalModule4PreBuild;
        }
        const f = serialModule.freeze(null, module, {
          module,
          compilation
        }, _methods);
        // The saved dependencies may not be the ones derived in the hash. This is
        // alright, in such a case the dependencies were altered before the source
        // was rendered. The dependencies should be modified a second time, if
        // they are in the same way they'll match. If they are not modified in the
        // same way, then it'll correctly rerender.
        if (module._dependencyBlock) {
          f.dependencyBlock = module._dependencyBlock;
        }
        return f;
      }

      return frozen;
    });

    pluginCompat.tap(compiler, '_hardSourceThawModule', 'TransformNormalModulePlugin thaw', (module, frozen, { compilation, normalModuleFactory }) => {
      if (frozen.type === 'NormalModule') {
        let m;
        if (module === null) {
          let serialModule = serialNormalModule;
          if (!frozen.build || !frozen.build.built) {
            serialModule = serialNormalModule4PreBuild;
          }
          m = serialModule.thaw(null, frozen, {
            state: { imports: {} },
            compilation: compilation,
            normalModuleFactory: normalModuleFactory
          }, _methods);
        } else {
          m = serialNormalModule4PostBuild.thaw(module, frozen, {
            state: { imports: {} },
            compilation: compilation,
            normalModuleFactory: normalModuleFactory
          }, _methods);
        }

        m.cacheItem = frozen;
        m.__hardSourceFileMd5s = compilation.__hardSourceFileMd5s;
        m.__hardSourceCachedMd5s = compilation.__hardSourceCachedMd5s;
        m.__hardSource_missingCache = compiler.__hardSource_missingCache;
        m.needRebuild = needRebuild;

        // Unbuild if there is no cache. The module will be rebuilt. Not
        // unbuilding will lead to double dependencies.
        if (m.built && schema === 4 && !compilation.cache) {
          m.unbuild();
        }
        // Side load into the cache if something for this identifier isn't already
        // there.
        else if (m.built && compilation.cache && !compilation.cache[`m${m.identifier()}`]) {
            compilation.cache[`m${m.identifier()}`] = m;
          }

        return m;
      }
      return module;
    });
  }
}

module.exports = TransformNormalModulePlugin;
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImhhcmQtc291cmNlLXdlYnBhY2stcGx1Z2luL2xpYi9UcmFuc2Zvcm1Ob3JtYWxNb2R1bGVQbHVnaW4uanMiXSwibmFtZXMiOlsiTm9ybWFsTW9kdWxlIiwicmVxdWlyZSIsIk1vZHVsZSIsIm5vZGVPYmplY3RIYXNoIiwibG9nTWVzc2FnZXMiLCJyZWxhdGVOb3JtYWxQYXRoIiwicmVsYXRlTm9ybWFsUmVxdWVzdCIsInJlbGF0ZU5vcm1hbFBhdGhTZXQiLCJyZWxhdGVOb3JtYWxMb2FkZXJzIiwicGx1Z2luQ29tcGF0Iiwic2VyaWFsIiwic2VyaWFsUmVzb2x2ZVJlcXVlc3QiLCJjcmVhdGVkIiwiY29udGV4dCIsInBhdGgiLCJyZXF1ZXN0Iiwic2VyaWFsUmVzb2x2ZWQiLCJyZXNvdXJjZSIsInJlc29sdmVPcHRpb25zIiwiaWRlbnRpdHkiLCJzZXJpYWxKc29uIiwiZnJlZXplIiwiYXJnIiwidmFsdWUiLCJleHRyYSIsIkpTT04iLCJwYXJzZSIsInRoYXciLCJmcm96ZW4iLCJzdHJpbmdpZnkiLCJzZXJpYWxNYXAiLCJtYXAiLCJzZXJpYWxSZXNvbHZlZE1hcCIsInBpcGUiLCJzZXJpYWxSZXNvdXJjZUhhc2hNYXAiLCJzZXJpYWxOb3JtYWxDb25zdHJ1Y3RvcjQiLCJjb25zdHJ1Y3RlZCIsImRhdGEiLCJtb2R1bGUiLCJ0eXBlIiwidXNlclJlcXVlc3QiLCJyYXdSZXF1ZXN0IiwibG9hZGVycyIsInBhcnNlciIsImdlbmVyYXRvciIsInNlcmlhbE5vcm1hbE1vZHVsZUV4dHJhNCIsIm1ldGhvZHMiLCJzZXJpYWxOb3JtYWxJZGVudGlmaWVyNCIsImlkZW50aWZpZXIiLCJzZXJpYWxOb3JtYWxBc3NpZ25lZDQiLCJhc3NpZ25lZCIsImZhY3RvcnlNZXRhIiwiaXNzdWVyIiwiY29tcGlsYXRpb24iLCJtb2R1bGVzIiwiY2FjaGVJZCIsImNhY2hlIiwidXNlU291cmNlTWFwIiwibGluZVRvTGluZSIsInNlcmlhbE5vcm1hbE9yaWdpbkV4dHJhNCIsIm9yaWdpbiIsInNlcmlhbE5vcm1hbEJ1aWxkNCIsImJ1aWx0IiwiYnVpbGRUaW1lc3RhbXAiLCJidWlsZE1ldGEiLCJidWlsZEluZm8iLCJhc3NldHMiLCJtb2R1bGVBc3NldHMiLCJjYWNoZWFibGUiLCJjb250ZXh0RGVwZW5kZW5jaWVzIiwicGF0aFNldCIsImV4cG9ydHNBcmd1bWVudCIsImZpbGVEZXBlbmRlbmNpZXMiLCJoYXJtb255TW9kdWxlIiwianNvbkRhdGEiLCJzdHJpY3QiLCJ3YXJuaW5ncyIsIm1vZHVsZVdhcm5pbmciLCJlcnJvcnMiLCJtb2R1bGVFcnJvciIsIl9zb3VyY2UiLCJzb3VyY2UiLCJfYnVpbGRIYXNoIiwiaGFzaCIsIl9sYXN0U3VjY2Vzc2Z1bEJ1aWxkTWV0YSIsIl9faGFyZFNvdXJjZV9yZXNvbHZlZCIsIl9faGFyZFNvdXJjZV9vbGRIYXNoZXMiLCJvYmoiLCJjYWNoZWRNZDVzIiwiX19oYXJkU291cmNlRmlsZU1kNXMiLCJmaWxlIiwiZGlyIiwic2VyaWFsTm9ybWFsRXJyb3I0IiwiZXJyb3IiLCJzZXJpYWxOb3JtYWxTb3VyY2VFeHRyYTQiLCJzZXJpYWxOb3JtYWxTb3VyY2U0IiwiX2NhY2hlZFNvdXJjZSIsIl9jYWNoZWRTb3VyY2VIYXNoIiwicmVuZGVyZWRIYXNoIiwic2VyaWFsTm9ybWFsTW9kdWxlNFByZUJ1aWxkIiwiY29uc3RydWN0b3IiLCJzZXRNb2R1bGVFeHRyYSIsInNldE9yaWdpbkV4dHJhIiwic2VyaWFsTm9ybWFsTW9kdWxlNFBvc3RCdWlsZCIsImJ1aWxkIiwiZGVwZW5kZW5jeUJsb2NrIiwic2V0RXJyb3IiLCJzZXRTb3VyY2VFeHRyYSIsInNlcmlhbE5vcm1hbE1vZHVsZTQiLCJuZWVkUmVidWlsZDQiLCJjYWNoZUl0ZW0iLCJpbnZhbGlkIiwiaW52YWxpZFJlYXNvbiIsImZpbGVIYXNoZXMiLCJjYWNoZWRIYXNoZXMiLCJfX2hhcmRTb3VyY2VDYWNoZWRNZDVzIiwicmVzb2x2ZWRMYXN0IiwibWlzc2luZ0NhY2hlIiwiX19oYXJkU291cmNlX21pc3NpbmdDYWNoZSIsInJlc29sdmVkTmVlZFJlYnVpbGQiLCJfcmVzb2x2ZUtleSIsInJlc29sdmVLZXkiLCJyZXNvbHZlZCIsIm5vcm1hbElkIiwic29ydCIsInJlc29sdmVkTWlzc2luZyIsInNwbGl0Iiwic2VyaWFsTm9ybWFsTW9kdWxlMyIsIm1ldGEiLCJwYXRoQXJyYXkiLCJnZXRIYXNoRGlnZXN0IiwiZGVwZW5kZW5jeVRlbXBsYXRlcyIsIm5lZWRSZWJ1aWxkMyIsIlRyYW5zZm9ybU5vcm1hbE1vZHVsZVBsdWdpbiIsIm9wdGlvbnMiLCJhcHBseSIsImNvbXBpbGVyIiwic2NoZW1hIiwic2VyaWFsTm9ybWFsTW9kdWxlIiwibmVlZFJlYnVpbGQiLCJjcmVhdGVIYXNoIiwibWFwRnJlZXplIiwiX21ldGhvZHMiLCJ0YXAiLCJfZGVwZW5kZW5jeUJsb2NrIiwicGFyZW50IiwiZSIsIm1vZHVsZUZyZWV6ZUVycm9yIiwib3V0cHV0T3B0aW9ucyIsImhhc2hGdW5jdGlvbiIsImhhc2hEaWdlc3QiLCJoYXNoRGlnZXN0TGVuZ3RoIiwiX2luaXRCdWlsZEhhc2giLCJtb2R1bGVIYXNoIiwidXBkYXRlSGFzaCIsImRpZ2VzdCIsInN1YnN0ciIsInNlcmlhbE1vZHVsZSIsImYiLCJub3JtYWxNb2R1bGVGYWN0b3J5IiwibSIsInN0YXRlIiwiaW1wb3J0cyIsInVuYnVpbGQiLCJleHBvcnRzIl0sIm1hcHBpbmdzIjoiOztBQUFBLE1BQU1BLGVBQWVDLFFBQVEsMEJBQVIsQ0FBckI7QUFDQSxNQUFNQyxTQUFTRCxRQUFRLG9CQUFSLENBQWY7O0FBRUEsTUFBTUUsaUJBQWlCRixRQUFRLGtCQUFSLENBQXZCOztBQUVBLE1BQU1HLGNBQWNILDhCQUFwQjtBQUNBLE1BQU07QUFDSkksa0JBREk7QUFFSkMscUJBRkk7QUFHSkMscUJBSEk7QUFJSkM7QUFKSSxJQUtGUCxnQ0FMSjtBQU1BLE1BQU1RLGVBQWVSLCtCQUFyQjtBQUNBLE1BQU1TLFNBQVNULHdCQUFmOztBQUVBLE1BQU1VLHVCQUF1QkQsT0FB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QUFDQSxZQUFJcUIsRUFBRWxHLEtBQUYsSUFBVzJFLFdBQVcsQ0FBdEIsSUFBMkIsQ0FBQ3BGLFlBQVlHLEtBQTVDLEVBQW1EO0FBQ2pEd0csWUFBRUcsT0FBRjtBQUNEO0FBQ0Q7QUFDQTtBQUpBLGFBS0ssSUFDSEgsRUFBRWxHLEtBQUYsSUFDQVQsWUFBWUcsS0FEWixJQUVBLENBQUNILFlBQVlHLEtBQVosQ0FBbUIsSUFBR3dHLEVBQUVoSCxVQUFGLEVBQWUsRUFBckMsQ0FIRSxFQUlIO0FBQ0FLLHdCQUFZRyxLQUFaLENBQW1CLElBQUd3RyxFQUFFaEgsVUFBRixFQUFlLEVBQXJDLElBQTBDZ0gsQ0FBMUM7QUFDRDs7QUFFRCxlQUFPQSxDQUFQO0FBQ0Q7QUFDRCxhQUFPMUgsTUFBUDtBQUNELEtBM0RIO0FBNkREO0FBak4rQjs7QUFvTmxDQSxPQUFPOEgsT0FBUCxHQUFpQi9CLDJCQUFqQiIsImZpbGUiOiJoYXJkLXNvdXJjZS13ZWJwYWNrLXBsdWdpbi9saWIvVHJhbnNmb3JtTm9ybWFsTW9kdWxlUGx1Z2luLmpzIiwic291cmNlc0NvbnRlbnQiOlsiY29uc3QgTm9ybWFsTW9kdWxlID0gcmVxdWlyZSgnd2VicGFjay9saWIvTm9ybWFsTW9kdWxlJyk7XG5jb25zdCBNb2R1bGUgPSByZXF1aXJlKCd3ZWJwYWNrL2xpYi9Nb2R1bGUnKTtcblxuY29uc3Qgbm9kZU9iamVjdEhhc2ggPSByZXF1aXJlKCdub2RlLW9iamVjdC1oYXNoJyk7XG5cbmNvbnN0IGxvZ01lc3NhZ2VzID0gcmVxdWlyZSgnLi91dGlsL2xvZy1tZXNzYWdlcycpO1xuY29uc3Qge1xuICByZWxhdGVOb3JtYWxQYXRoLFxuICByZWxhdGVOb3JtYWxSZXF1ZXN0LFxuICByZWxhdGVOb3JtYWxQYXRoU2V0LFxuICByZWxhdGVOb3JtYWxMb2FkZXJzLFxufSA9IHJlcXVpcmUoJy4vdXRpbC9yZWxhdGUtY29udGV4dCcpO1xuY29uc3QgcGx1Z2luQ29tcGF0ID0gcmVxdWlyZSgnLi91dGlsL3BsdWdpbi1jb21wYXQnKTtcbmNvbnN0IHNlcmlhbCA9IHJlcXVpcmUoJy4vdXRpbC9zZXJpYWwnKTtcblxuY29uc3Qgc2VyaWFsUmVzb2x2ZVJlcXVlc3QgPSBzZXJpYWwuY3JlYXRlZCh7XG4gIGNvbnRleHQ6IHNlcmlhbC5wYXRoLFxuICByZXF1ZXN0OiBzZXJpYWwucmVxdWVzdCxcbn0pO1xuXG5jb25zdCBzZXJpYWxSZXNvbHZlZCA9IHNlcmlhbC5jcmVhdGVkKHtcbiAgLy8gY29udGV4dDogc2VyaWFsLnBhdGgsXG4gIC8vIHJlcXVlc3Q6IHNlcmlhbC5yZXF1ZXN0LFxuICAvLyB1c2VyUmVxdWVzdDogc2VyaWFsLnJlcXVlc3QsXG4gIC8vIHJhd1JlcXVlc3Q6IHNlcmlhbC5yZXF1ZXN0LFxuICByZXNvdXJjZTogc2VyaWFsLnJlcXVlc3QsXG4gIHJlc29sdmVPcHRpb25zOiBzZXJpYWwuaWRlbnRpdHksXG4gIC8vIGxvYWRlcnM6IHNlcmlhbC5sb2FkZXJzLFxufSk7XG5cbmNvbnN0IHNlcmlhbEpzb24gPSB7XG4gIGZyZWV6ZShhcmcsIHZhbHVlLCBleHRyYSkge1xuICAgIHJldHVybiBKU09OLnBhcnNlKGFyZyk7XG4gIH0sXG4gIHRoYXcoYXJnLCBmcm96ZW4sIGV4dHJhKSB7XG4gICAgcmV0dXJuIEpTT04uc3RyaW5naWZ5KGFyZyk7XG4gIH0sXG59O1xuXG5jb25zdCBzZXJpYWxNYXAgPSBzZXJpYWwubWFwO1xuXG5jb25zdCBzZXJpYWxSZXNvbHZlZE1hcCA9IHNlcmlhbC5tYXAoXG4gIHNlcmlhbC5waXBlKFxuICAgIHsgZnJlZXplOiBzZXJpYWxKc29uLmZyZWV6ZSwgdGhhdzogc2VyaWFsLmlkZW50aXR5LnRoYXcgfSxcbiAgICBzZXJpYWxSZXNvbHZlUmVxdWVzdCxcbiAgICB7IGZyZWV6ZTogc2VyaWFsLmlkZW50aXR5LmZyZWV6ZSwgdGhhdzogc2VyaWFsSnNvbi50aGF3IH0sXG4gICksXG4gIHNlcmlhbFJlc29sdmVkLFxuKTtcblxuY29uc3Qgc2VyaWFsUmVzb3VyY2VIYXNoTWFwID0gc2VyaWFsLm1hcChzZXJpYWwucmVxdWVzdCwgc2VyaWFsLmlkZW50aXR5KTtcblxuY29uc3Qgc2VyaWFsTm9ybWFsQ29uc3RydWN0b3I0ID0gc2VyaWFsLmNvbnN0cnVjdGVkKE5vcm1hbE1vZHVsZSwge1xuICBkYXRhOiBzZXJpYWwucGlwZShcbiAgICB7IGZyZWV6ZTogKGFyZywgbW9kdWxlKSA9PiBtb2R1bGUsIHRoYXc6IGFyZyA9PiBhcmcgfSxcbiAgICBzZXJpYWwuY3JlYXRlZCh7XG4gICAgICB0eXBlOiBzZXJpYWwuaWRlbnRpdHksXG4gICAgICByZXF1ZXN0OiBzZXJpYWwucmVxdWVzdCxcbiAgICAgIHVzZXJSZXF1ZXN0OiBzZXJpYWwucmVxdWVzdCxcbiAgICAgIHJhd1JlcXVlc3Q6IHNlcmlhbC5yZXF1ZXN0LFxuICAgICAgbG9hZGVyczogc2VyaWFsLmxvYWRlcnMsXG4gICAgICByZXNvdXJjZTogc2VyaWFsLnBhdGgsXG4gICAgICBwYXJzZXI6IHNlcmlhbC5wYXJzZXIsXG4gICAgICBnZW5lcmF0b3I6IHNlcmlhbC5nZW5lcmF0b3IsXG4gICAgICByZXNvbHZlT3B0aW9uczogc2VyaWFsLmlkZW50aXR5LFxuICAgIH0pLFxuICApLFxufSk7XG5cbmNvbnN0IHNlcmlhbE5vcm1hbE1vZHVsZUV4dHJhNCA9IHtcbiAgZnJlZXplKCkge30sXG4gIHRoYXcoYXJnLCBmcm96ZW4sIGV4dHJhLCBtZXRob2RzKSB7XG4gICAgZXh0cmEubW9kdWxlID0gYXJnO1xuICAgIHJldHVybiBhcmc7XG4gIH0sXG59O1xuXG5jb25zdCBzZXJpYWxOb3JtYWxJZGVudGlmaWVyNCA9IHtcbiAgZnJlZXplKGFyZywgbW9kdWxlLCBleHRyYSwgbWV0aG9kcykge1xuICAgIHJldHVybiBzZXJpYWwucmVxdWVzdC5mcmVlemUobW9kdWxlLmlkZW50aWZpZXIoKSwgbnVsbCwgZXh0cmEsIG1ldGhvZHMpO1xuICB9LFxuICB0aGF3KGFyZykge1xuICAgIHJldHVybiBhcmc7XG4gIH0sXG59O1xuXG5jb25zdCBzZXJpYWxOb3JtYWxBc3NpZ25lZDQgPSBzZXJpYWwuYXNzaWduZWQoe1xuICBmYWN0b3J5TWV0YTogc2VyaWFsLmlkZW50aXR5LFxuICBpc3N1ZXI6IHNlcmlhbC5waXBlKFxuICAgIHtcbiAgICAgIGZyZWV6ZShhcmcsIHsgaXNzdWVyIH0pIHtcbiAgICAgICAgcmV0dXJuIGlzc3VlciAmJiB0eXBlb2YgaXNzdWVyID09PSAnb2JqZWN0J1xuICAgICAgICAgID8gaXNzdWVyLmlkZW50aWZpZXIoKVxuICAgICAgICAgIDogaXNzdWVyO1xuICAgICAgfSxcbiAgICAgIHRoYXcoYXJnLCBmcm96ZW4sIGV4dHJhKSB7XG4gICAgICAgIHJldHVybiBhcmc7XG4gICAgICB9LFxuICAgIH0sXG4gICAgc2VyaWFsLnJlcXVlc3QsXG4gICAge1xuICAgICAgZnJlZXplKGFyZykge1xuICAgICAgICByZXR1cm4gYXJnO1xuICAgICAgfSxcbiAgICAgIHRoYXcoYXJnLCBmcm96ZW4sIHsgY29tcGlsYXRpb24gfSkge1xuICAgICAgICBpZiAoY29tcGlsYXRpb24ubW9kdWxlcykge1xuICAgICAgICAgIGZvciAoY29uc3QgbW9kdWxlIG9mIGNvbXBpbGF0aW9uLm1vZHVsZXMpIHtcbiAgICAgICAgICAgIGlmIChcbiAgICAgICAgICAgICAgbW9kdWxlICYmXG4gICAgICAgICAgICAgIHR5cGVvZiBtb2R1bGUuaWRlbnRpZmllciA9PT0gJ2Z1bmN0aW9uJyAmJlxuICAgICAgICAgICAgICBtb2R1bGUuaWRlbnRpZmllcigpID09PSBhcmdcbiAgICAgICAgICAgICkge1xuICAgICAgICAgICAgICByZXR1cm4gbW9kdWxlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBmb3IgKGNvbnN0IGNhY2hlSWQgaW4gY29tcGlsYXRpb24uY2FjaGUpIHtcbiAgICAgICAgICAgIGNvbnN0IG1vZHVsZSA9IGNvbXBpbGF0aW9uLmNhY2hlW2NhY2hlSWRdO1xuICAgICAgICAgICAgaWYgKFxuICAgICAgICAgICAgICBtb2R1bGUgJiZcbiAgICAgICAgICAgICAgdHlwZW9mIG1vZHVsZS5pZGVudGlmaWVyID09PSAnZnVuY3Rpb24nICYmXG4gICAgICAgICAgICAgIG1vZHVsZS5pZGVudGlmaWVyKCkgPT09IGFyZ1xuICAgICAgICAgICAgKSB7XG4gICAgICAgICAgICAgIHJldHVybiBtb2R1bGU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBhcmc7XG4gICAgICB9LFxuICAgIH0sXG4gICksXG4gIHVzZVNvdXJjZU1hcDogc2VyaWFsLmlkZW50aXR5LFxuICBsaW5lVG9MaW5lOiBzZXJpYWwuaWRlbnRpdHksXG59KTtcblxuY29uc3Qgc2VyaWFsTm9ybWFsT3JpZ2luRXh0cmE0ID0ge1xuICBmcmVlemUoKSB7fSxcbiAgdGhhdyhhcmcsIGZyb3plbiwgZXh0cmEpIHtcbiAgICBpZiAodHlwZW9mIGFyZy5pc3N1ZXIgPT09ICdvYmplY3QnKSB7XG4gICAgICBleHRyYS5vcmlnaW4gPSBhcmcuaXNzdWVyO1xuICAgIH1cbiAgICByZXR1cm4gYXJnO1xuICB9LFxufTtcblxuY29uc3Qgc2VyaWFsTm9ybWFsQnVpbGQ0ID0gc2VyaWFsLmFzc2lnbmVkKHtcbiAgYnVpbHQ6IHNlcmlhbC5pZGVudGl0eSxcbiAgYnVpbGRUaW1lc3RhbXA6IHNlcmlhbC5pZGVudGl0eSxcbiAgYnVpbGRNZXRhOiBzZXJpYWwuaWRlbnRpdHksXG4gIGJ1aWxkSW5mbzogc2VyaWFsLmNyZWF0ZWQoe1xuICAgIGFzc2V0czogc2VyaWFsLm1vZHVsZUFzc2V0cyxcbiAgICBjYWNoZWFibGU6IHNlcmlhbC5pZGVudGl0eSxcbiAgICBjb250ZXh0RGVwZW5kZW5jaWVzOiBzZXJpYWwucGF0aFNldCxcbiAgICBleHBvcnRzQXJndW1lbnQ6IHNlcmlhbC5pZGVudGl0eSxcbiAgICBmaWxlRGVwZW5kZW5jaWVzOiBzZXJpYWwucGF0aFNldCxcbiAgICBoYXJtb255TW9kdWxlOiBzZXJpYWwuaWRlbnRpdHksXG4gICAganNvbkRhdGE6IHNlcmlhbC5pZGVudGl0eSxcbiAgICBzdHJpY3Q6IHNlcmlhbC5pZGVudGl0eSxcbiAgfSksXG4gIHdhcm5pbmdzOiBzZXJpYWwubW9kdWxlV2FybmluZyxcbiAgZXJyb3JzOiBzZXJpYWwubW9kdWxlRXJyb3IsXG4gIF9zb3VyY2U6IHNlcmlhbC5zb3VyY2UsXG4gIF9idWlsZEhhc2g6IHNlcmlhbC5pZGVudGl0eSxcbiAgaGFzaDogc2VyaWFsLmlkZW50aXR5LFxuICBfbGFzdFN1Y2Nlc3NmdWxCdWlsZE1ldGE6IHNlcmlhbC5pZGVudGl0eSxcblxuICBfX2hhcmRTb3VyY2VfcmVzb2x2ZWQ6IHNlcmlhbFJlc29sdmVkTWFwLFxuICBfX2hhcmRTb3VyY2Vfb2xkSGFzaGVzOiBzZXJpYWwucGlwZShcbiAgICB7XG4gICAgICBmcmVlemUoYXJnLCBtb2R1bGUsIGV4dHJhKSB7XG4gICAgICAgIGNvbnN0IG9iaiA9IHt9O1xuICAgICAgICBjb25zdCBjYWNoZWRNZDVzID0gZXh0cmEuY29tcGlsYXRpb24uX19oYXJkU291cmNlRmlsZU1kNXM7XG5cbiAgICAgICAgZm9yIChjb25zdCBmaWxlIG9mIG1vZHVsZS5idWlsZEluZm8uZmlsZURlcGVuZGVuY2llcykge1xuICAgICAgICAgIG9ialtmaWxlXSA9IGNhY2hlZE1kNXNbZmlsZV07XG4gICAgICAgIH1cbiAgICAgICAgZm9yIChjb25zdCBkaXIgb2YgbW9kdWxlLmJ1aWxkSW5mby5jb250ZXh0RGVwZW5kZW5jaWVzKSB7XG4gICAgICAgICAgb2JqW2Rpcl0gPSBjYWNoZWRNZDVzW2Rpcl07XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gb2JqO1xuICAgICAgfSxcbiAgICAgIHRoYXc6IHNlcmlhbC5pZGVudGl0eS50aGF3LFxuICAgIH0sXG4gICAgc2VyaWFsUmVzb3VyY2VIYXNoTWFwLFxuICApLFxufSk7XG5cbmNvbnN0IHNlcmlhbE5vcm1hbEVycm9yNCA9IHtcbiAgZnJlZXplKCkge30sXG4gIHRoYXcoYXJnLCBtb2R1bGUsIGV4dHJhKSB7XG4gICAgYXJnLmVycm9yID0gYXJnLmVycm9yc1swXSB8fCBudWxsO1xuICAgIHJldHVybiBhcmc7XG4gIH0sXG59O1xuXG5jb25zdCBzZXJpYWxOb3JtYWxTb3VyY2VFeHRyYTQgPSB7XG4gIGZyZWV6ZSgpIHt9LFxuICB0aGF3KGFyZywgbW9kdWxlLCBleHRyYSkge1xuICAgIGV4dHJhLnNvdXJjZSA9IGFyZy5fc291cmNlO1xuICAgIHJldHVybiBhcmc7XG4gIH0sXG59O1xuXG5jb25zdCBzZXJpYWxOb3JtYWxTb3VyY2U0ID0gc2VyaWFsLmFzc2lnbmVkKHtcbiAgX2NhY2hlZFNvdXJjZTogc2VyaWFsLnNvdXJjZSxcbiAgX2NhY2hlZFNvdXJjZUhhc2g6IHNlcmlhbC5pZGVudGl0eSxcbiAgcmVuZGVyZWRIYXNoOiBzZXJpYWwuaWRlbnRpdHksXG59KTtcblxuY29uc3Qgc2VyaWFsTm9ybWFsTW9kdWxlNFByZUJ1aWxkID0gc2VyaWFsLnNlcmlhbCgnTm9ybWFsTW9kdWxlJywge1xuICBjb25zdHJ1Y3Rvcjogc2VyaWFsTm9ybWFsQ29uc3RydWN0b3I0LFxuICBzZXRNb2R1bGVFeHRyYTogc2VyaWFsTm9ybWFsTW9kdWxlRXh0cmE0LFxuICBpZGVudGlmaWVyOiBzZXJpYWxOb3JtYWxJZGVudGlmaWVyNCxcbiAgYXNzaWduZWQ6IHNlcmlhbE5vcm1hbEFzc2lnbmVkNCxcbiAgc2V0T3JpZ2luRXh0cmE6IHNlcmlhbE5vcm1hbE9yaWdpbkV4dHJhNCxcbn0pO1xuXG5jb25zdCBzZXJpYWxOb3JtYWxNb2R1bGU0UG9zdEJ1aWxkID0gc2VyaWFsLnNlcmlhbCgnTm9ybWFsTW9kdWxlJywge1xuICBidWlsZDogc2VyaWFsTm9ybWFsQnVpbGQ0LFxuICBkZXBlbmRlbmN5QmxvY2s6IHNlcmlhbC5kZXBlbmRlbmN5QmxvY2ssXG4gIHNldEVycm9yOiBzZXJpYWxOb3JtYWxFcnJvcjQsXG4gIHNldFNvdXJjZUV4dHJhOiBzZXJpYWxOb3JtYWxTb3VyY2VFeHRyYTQsXG4gIHNvdXJjZTogc2VyaWFsTm9ybWFsU291cmNlNCxcbn0pO1xuXG5jb25zdCBzZXJpYWxOb3JtYWxNb2R1bGU0ID0gc2VyaWFsLnNlcmlhbCgnTm9ybWFsTW9kdWxlJywge1xuICBjb25zdHJ1Y3Rvcjogc2VyaWFsTm9ybWFsQ29uc3RydWN0b3I0LFxuICBzZXRNb2R1bGVFeHRyYTogc2VyaWFsTm9ybWFsTW9kdWxlRXh0cmE0LFxuICBpZGVudGlmaWVyOiBzZXJpYWxOb3JtYWxJZGVudGlmaWVyNCxcbiAgYXNzaWduZWQ6IHNlcmlhbE5vcm1hbEFzc2lnbmVkNCxcbiAgc2V0T3JpZ2luRXh0cmE6IHNlcmlhbE5vcm1hbE9yaWdpbkV4dHJhNCxcbiAgYnVpbGQ6IHNlcmlhbE5vcm1hbEJ1aWxkNCxcbiAgZGVwZW5kZW5jeUJsb2NrOiBzZXJpYWwuZGVwZW5kZW5jeUJsb2NrLFxuICBzZXRFcnJvcjogc2VyaWFsTm9ybWFsRXJyb3I0LFxuICBzZXRTb3VyY2VFeHRyYTogc2VyaWFsTm9ybWFsU291cmNlRXh0cmE0LFxuICBzb3VyY2U6IHNlcmlhbE5vcm1hbFNvdXJjZTQsXG59KTtcblxuY29uc3QgbmVlZFJlYnVpbGQ0ID0gZnVuY3Rpb24oKSB7XG4gIGlmICh0aGlzLmVycm9yKSB7XG4gICAgdGhpcy5jYWNoZUl0ZW0uaW52YWxpZCA9IHRydWU7XG4gICAgdGhpcy5jYWNoZUl0ZW0uaW52YWxpZFJlYXNvbiA9ICdlcnJvciBidWlsZGluZyc7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cbiAgY29uc3QgZmlsZUhhc2hlcyA9IHRoaXMuX19oYXJkU291cmNlRmlsZU1kNXM7XG4gIGNvbnN0IGNhY2hlZEhhc2hlcyA9IHRoaXMuX19oYXJkU291cmNlQ2FjaGVkTWQ1cztcbiAgY29uc3QgcmVzb2x2ZWRMYXN0ID0gdGhpcy5fX2hhcmRTb3VyY2VfcmVzb2x2ZWQ7XG4gIGNvbnN0IG1pc3NpbmdDYWNoZSA9IHRoaXMuX19oYXJkU291cmNlX21pc3NpbmdDYWNoZTtcblxuICBmb3IgKGNvbnN0IGZpbGUgb2YgdGhpcy5idWlsZEluZm8uZmlsZURlcGVuZGVuY2llcykge1xuICAgIGlmICghY2FjaGVkSGFzaGVzW2ZpbGVdIHx8IGZpbGVIYXNoZXNbZmlsZV0gIT09IGNhY2hlZEhhc2hlc1tmaWxlXSkge1xuICAgICAgdGhpcy5jYWNoZUl0ZW0uaW52YWxpZCA9IHRydWU7XG4gICAgICB0aGlzLmNhY2hlSXRlbS5pbnZhbGlkUmVhc29uID0gJ21kNSBtaXNtYXRjaCc7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gIH1cbiAgZm9yIChjb25zdCBkaXIgb2YgdGhpcy5idWlsZEluZm8uY29udGV4dERlcGVuZGVuY2llcykge1xuICAgIGlmICghY2FjaGVkSGFzaGVzW2Rpcl0gfHwgZmlsZUhhc2hlc1tkaXJdICE9PSBjYWNoZWRIYXNoZXNbZGlyXSkge1xuICAgICAgdGhpcy5jYWNoZUl0ZW0uaW52YWxpZCA9IHRydWU7XG4gICAgICB0aGlzLmNhY2hlSXRlbS5pbnZhbGlkUmVhc29uID0gJ21kNSBtaXNtYXRjaCc7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gIH1cblxuICBsZXQgcmVzb2x2ZWROZWVkUmVidWlsZCA9IGZhbHNlO1xuICBmb3IgKGNvbnN0IF9yZXNvbHZlS2V5IGluIHJlc29sdmVkTGFzdCkge1xuICAgIGNvbnN0IHJlc29sdmVLZXkgPSBKU09OLnBhcnNlKF9yZXNvbHZlS2V5KTtcbiAgICBjb25zdCByZXNvbHZlZCA9IHJlc29sdmVkTGFzdFtfcmVzb2x2ZUtleV07XG4gICAgbGV0IG5vcm1hbElkID0gJ25vcm1hbCc7XG4gICAgaWYgKHJlc29sdmVkLnJlc29sdmVPcHRpb25zKSB7XG4gICAgICBub3JtYWxJZCA9IGBub3JtYWwtJHtuZXcgbm9kZU9iamVjdEhhc2goeyBzb3J0OiBmYWxzZSB9KS5oYXNoKFxuICAgICAgICByZXNvbHZlZC5yZXNvbHZlT3B0aW9ucyxcbiAgICAgICl9YDtcbiAgICB9XG4gICAgY29uc3QgcmVzb2x2ZWRNaXNzaW5nID1cbiAgICAgIG1pc3NpbmdDYWNoZVtub3JtYWxJZF0gJiZcbiAgICAgIG1pc3NpbmdDYWNoZVtub3JtYWxJZF1bXG4gICAgICAgIEpTT04uc3RyaW5naWZ5KFtyZXNvbHZlS2V5LmNvbnRleHQsIHJlc29sdmVkLnJlc291cmNlLnNwbGl0KCc/JylbMF1dKVxuICAgICAgXTtcbiAgICBpZiAoIXJlc29sdmVkTWlzc2luZyB8fCByZXNvbHZlZE1pc3NpbmcuaW52YWxpZCkge1xuICAgICAgcmVzb2x2ZWQuaW52YWxpZCA9IHRydWU7XG4gICAgICByZXNvbHZlZC5pbnZhbGlkUmVhc29uID0gYHJlc29sdmVkIG5vcm1hbCBpbnZhbGlkJHtcbiAgICAgICAgcmVzb2x2ZWRNaXNzaW5nXG4gICAgICAgICAgPyBgICR7cmVzb2x2ZWRNaXNzaW5nLmludmFsaWRSZWFzb259YFxuICAgICAgICAgIDogJzogcmVzb2x2ZSBlbnRyeSBub3QgaW4gY2FjaGUnXG4gICAgICB9YDtcbiAgICAgIHJlc29sdmVkTmVlZFJlYnVpbGQgPSB0cnVlO1xuICAgIH1cbiAgfVxuICByZXR1cm4gcmVzb2x2ZWROZWVkUmVidWlsZDtcbn07XG5cbmNvbnN0IHNlcmlhbE5vcm1hbE1vZHVsZTMgPSBzZXJpYWwuc2VyaWFsKCdOb3JtYWxNb2R1bGUnLCB7XG4gIGNvbnN0cnVjdG9yOiBzZXJpYWwuY29uc3RydWN0ZWQoTm9ybWFsTW9kdWxlLCB7XG4gICAgcmVxdWVzdDogc2VyaWFsLnJlcXVlc3QsXG4gICAgdXNlclJlcXVlc3Q6IHNlcmlhbC5yZXF1ZXN0LFxuICAgIHJhd1JlcXVlc3Q6IHNlcmlhbC5yZXF1ZXN0LFxuICAgIGxvYWRlcnM6IHNlcmlhbC5sb2FkZXJzLFxuICAgIHJlc291cmNlOiBzZXJpYWwucGF0aCxcbiAgICBwYXJzZXI6IHNlcmlhbC5wYXJzZXIsXG4gIH0pLFxuXG4gIHNldE1vZHVsZUV4dHJhOiBzZXJpYWxOb3JtYWxNb2R1bGVFeHRyYTQsXG4gIC8vIFVzZWQgaW50ZXJuYWxseSBieSBIYXJkU291cmNlXG4gIGlkZW50aWZpZXI6IHNlcmlhbE5vcm1hbElkZW50aWZpZXI0LFxuXG4gIGFzc2lnbmVkOiBzZXJpYWwuYXNzaWduZWQoe1xuICAgIGlzc3Vlcjogc2VyaWFsLnBpcGUoXG4gICAgICB7XG4gICAgICAgIGZyZWV6ZShhcmcsIHsgaXNzdWVyIH0pIHtcbiAgICAgICAgICByZXR1cm4gaXNzdWVyICYmIHR5cGVvZiBpc3N1ZXIgPT09ICdvYmplY3QnXG4gICAgICAgICAgICA/IGlzc3Vlci5pZGVudGlmaWVyKClcbiAgICAgICAgICAgIDogaXNzdWVyO1xuICAgICAgICB9LFxuICAgICAgICB0aGF3KGFyZywgZnJvemVuLCBleHRyYSkge1xuICAgICAgICAgIHJldHVybiBhcmc7XG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgICAgc2VyaWFsLnJlcXVlc3QsXG4gICAgICB7XG4gICAgICAgIGZyZWV6ZShhcmcpIHtcbiAgICAgICAgICByZXR1cm4gYXJnO1xuICAgICAgICB9LFxuICAgICAgICB0aGF3KGFyZywgZnJvemVuLCB7IGNvbXBpbGF0aW9uIH0pIHtcbiAgICAgICAgICBpZiAoY29tcGlsYXRpb24ubW9kdWxlcykge1xuICAgICAgICAgICAgZm9yIChjb25zdCBtb2R1bGUgb2YgY29tcGlsYXRpb24ubW9kdWxlcykge1xuICAgICAgICAgICAgICBpZiAoXG4gICAgICAgICAgICAgICAgbW9kdWxlICYmXG4gICAgICAgICAgICAgICAgdHlwZW9mIG1vZHVsZS5pZGVudGlmaWVyID09PSAnZnVuY3Rpb24nICYmXG4gICAgICAgICAgICAgICAgbW9kdWxlLmlkZW50aWZpZXIoKSA9PT0gYXJnXG4gICAgICAgICAgICAgICkge1xuICAgICAgICAgICAgICAgIHJldHVybiBtb2R1bGU7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGZvciAoY29uc3QgY2FjaGVJZCBpbiBjb21waWxhdGlvbi5jYWNoZSkge1xuICAgICAgICAgICAgICBjb25zdCBtb2R1bGUgPSBjb21waWxhdGlvbi5jYWNoZVtjYWNoZUlkXTtcbiAgICAgICAgICAgICAgaWYgKFxuICAgICAgICAgICAgICAgIG1vZHVsZSAmJlxuICAgICAgICAgICAgICAgIHR5cGVvZiBtb2R1bGUuaWRlbnRpZmllciA9PT0gJ2Z1bmN0aW9uJyAmJlxuICAgICAgICAgICAgICAgIG1vZHVsZS5pZGVudGlmaWVyKCkgPT09IGFyZ1xuICAgICAgICAgICAgICApIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbW9kdWxlO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiBhcmc7XG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgICksXG4gICAgdXNlU291cmNlTWFwOiBzZXJpYWwuaWRlbnRpdHksXG4gICAgbGluZVRvTGluZTogc2VyaWFsLmlkZW50aXR5LFxuICB9KSxcblxuICBzZXRPcmlnaW5FeHRyYToge1xuICAgIGZyZWV6ZSgpIHt9LFxuICAgIHRoYXcoYXJnLCBmcm96ZW4sIGV4dHJhKSB7XG4gICAgICBpZiAodHlwZW9mIGFyZy5pc3N1ZXIgPT09ICdvYmplY3QnKSB7XG4gICAgICAgIGV4dHJhLm9yaWdpbiA9IGFyZy5pc3N1ZXI7XG4gICAgICB9XG4gICAgICByZXR1cm4gYXJnO1xuICAgIH0sXG4gIH0sXG5cbiAgYnVpbGQ6IHNlcmlhbC5hc3NpZ25lZCh7XG4gICAgYnVpbHQ6IHNlcmlhbC5pZGVudGl0eSxcbiAgICBidWlsZFRpbWVzdGFtcDogc2VyaWFsLmlkZW50aXR5LFxuICAgIGNhY2hlYWJsZTogc2VyaWFsLmlkZW50aXR5LFxuICAgIG1ldGE6IHNlcmlhbC5pZGVudGl0eSxcbiAgICBhc3NldHM6IHNlcmlhbC5tb2R1bGVBc3NldHMsXG4gICAgZmlsZURlcGVuZGVuY2llczogc2VyaWFsLnBhdGhBcnJheSxcbiAgICBjb250ZXh0RGVwZW5kZW5jaWVzOiBzZXJpYWwucGF0aEFycmF5LFxuICAgIGhhcm1vbnlNb2R1bGU6IHNlcmlhbC5pZGVudGl0eSxcbiAgICBzdHJpY3Q6IHNlcmlhbC5pZGVudGl0eSxcbiAgICBleHBvcnRzQXJndW1lbnQ6IHNlcmlhbC5pZGVudGl0eSxcbiAgICB3YXJuaW5nczogc2VyaWFsLm1vZHVsZVdhcm5pbmcsXG4gICAgZXJyb3JzOiBzZXJpYWwubW9kdWxlRXJyb3IsXG4gICAgX3NvdXJjZTogc2VyaWFsLnNvdXJjZSxcblxuICAgIF9faGFyZFNvdXJjZV9yZXNvbHZlZDogc2VyaWFsUmVzb2x2ZWRNYXAsXG4gICAgX19oYXJkU291cmNlX29sZEhhc2hlczogc2VyaWFsLnBpcGUoXG4gICAgICB7XG4gICAgICAgIGZyZWV6ZShhcmcsIG1vZHVsZSwgZXh0cmEpIHtcbiAgICAgICAgICBjb25zdCBvYmogPSB7fTtcbiAgICAgICAgICBjb25zdCBjYWNoZWRNZDVzID0gZXh0cmEuY29tcGlsYXRpb24uX19oYXJkU291cmNlQ2FjaGVkTWQ1cztcblxuICAgICAgICAgIGZvciAoY29uc3QgZmlsZSBvZiBtb2R1bGUuZmlsZURlcGVuZGVuY2llcykge1xuICAgICAgICAgICAgb2JqW2ZpbGVdID0gY2FjaGVkTWQ1c1tmaWxlXTtcbiAgICAgICAgICB9XG4gICAgICAgICAgZm9yIChjb25zdCBkaXIgb2YgbW9kdWxlLmNvbnRleHREZXBlbmRlbmNpZXMpIHtcbiAgICAgICAgICAgIG9ialtkaXJdID0gY2FjaGVkTWQ1c1tkaXJdO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHJldHVybiBvYmo7XG4gICAgICAgIH0sXG4gICAgICAgIHRoYXc6IHNlcmlhbC5pZGVudGl0eS50aGF3LFxuICAgICAgfSxcbiAgICAgIHNlcmlhbFJlc291cmNlSGFzaE1hcCxcbiAgICApLFxuICB9KSxcblxuICBoYXNoOiB7XG4gICAgZnJlZXplKGFyZywgbW9kdWxlLCB7IGNvbXBpbGF0aW9uIH0sIG1ldGhvZHMpIHtcbiAgICAgIHJldHVybiBtb2R1bGUuZ2V0SGFzaERpZ2VzdChjb21waWxhdGlvbi5kZXBlbmRlbmN5VGVtcGxhdGVzKTtcbiAgICB9LFxuICAgIHRoYXcoYXJnKSB7XG4gICAgICByZXR1cm4gYXJnO1xuICAgIH0sXG4gIH0sXG5cbiAgZGVwZW5kZW5jeUJsb2NrOiBzZXJpYWwuZGVwZW5kZW5jeUJsb2NrLFxuXG4gIHNldEVycm9yOiB7XG4gICAgZnJlZXplKCkge30sXG4gICAgdGhhdyhhcmcsIG1vZHVsZSwgZXh0cmEpIHtcbiAgICAgIGFyZy5lcnJvciA9IGFyZy5lcnJvcnNbMF0gfHwgbnVsbDtcbiAgICAgIHJldHVybiBhcmc7XG4gICAgfSxcbiAgfSxcblxuICBzZXRTb3VyY2VFeHRyYToge1xuICAgIGZyZWV6ZSgpIHt9LFxuICAgIHRoYXcoYXJnLCBtb2R1bGUsIGV4dHJhKSB7XG4gICAgICBleHRyYS5zb3VyY2UgPSBhcmcuX3NvdXJjZTtcbiAgICAgIHJldHVybiBhcmc7XG4gICAgfSxcbiAgfSxcblxuICBzb3VyY2U6IHNlcmlhbC5hc3NpZ25lZCh7XG4gICAgX2NhY2hlZFNvdXJjZTogc2VyaWFsLmNyZWF0ZWQoe1xuICAgICAgc291cmNlOiBzZXJpYWwuc291cmNlLFxuICAgICAgaGFzaDogc2VyaWFsLmlkZW50aXR5LFxuICAgIH0pLFxuICB9KSxcbn0pO1xuXG5jb25zdCBuZWVkUmVidWlsZDMgPSBmdW5jdGlvbigpIHtcbiAgaWYgKHRoaXMuZXJyb3IpIHtcbiAgICB0aGlzLmNhY2hlSXRlbS5pbnZhbGlkID0gdHJ1ZTtcbiAgICB0aGlzLmNhY2hlSXRlbS5pbnZhbGlkUmVhc29uID0gJ2Vycm9yIGJ1aWxkaW5nJztcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuICBjb25zdCBmaWxlSGFzaGVzID0gdGhpcy5fX2hhcmRTb3VyY2VGaWxlTWQ1cztcbiAgY29uc3QgY2FjaGVkSGFzaGVzID0gdGhpcy5fX2hhcmRTb3VyY2VDYWNoZWRNZDVzO1xuICBjb25zdCByZXNvbHZlZExhc3QgPSB0aGlzLl9faGFyZFNvdXJjZV9yZXNvbHZlZDtcbiAgY29uc3QgbWlzc2luZ0NhY2hlID0gdGhpcy5fX2hhcmRTb3VyY2VfbWlzc2luZ0NhY2hlO1xuXG4gIGZvciAoY29uc3QgZmlsZSBvZiB0aGlzLmZpbGVEZXBlbmRlbmNpZXMpIHtcbiAgICBpZiAoIWNhY2hlZEhhc2hlc1tmaWxlXSB8fCBmaWxlSGFzaGVzW2ZpbGVdICE9PSBjYWNoZWRIYXNoZXNbZmlsZV0pIHtcbiAgICAgIHRoaXMuY2FjaGVJdGVtLmludmFsaWQgPSB0cnVlO1xuICAgICAgdGhpcy5jYWNoZUl0ZW0uaW52YWxpZFJlYXNvbiA9ICdtZDUgbWlzbWF0Y2gnO1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICB9XG4gIGZvciAoY29uc3QgZGlyIG9mIHRoaXMuY29udGV4dERlcGVuZGVuY2llcykge1xuICAgIGlmICghY2FjaGVkSGFzaGVzW2Rpcl0gfHwgZmlsZUhhc2hlc1tkaXJdICE9PSBjYWNoZWRIYXNoZXNbZGlyXSkge1xuICAgICAgdGhpcy5jYWNoZUl0ZW0uaW52YWxpZCA9IHRydWU7XG4gICAgICB0aGlzLmNhY2hlSXRlbS5pbnZhbGlkUmVhc29uID0gJ21kNSBtaXNtYXRjaCc7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gIH1cblxuICBsZXQgcmVzb2x2ZWROZWVkUmVidWlsZCA9IGZhbHNlO1xuICBmb3IgKGNvbnN0IF9yZXNvbHZlS2V5IGluIHJlc29sdmVkTGFzdCkge1xuICAgIGNvbnN0IHJlc29sdmVLZXkgPSBKU09OLnBhcnNlKF9yZXNvbHZlS2V5KTtcbiAgICBjb25zdCByZXNvbHZlZCA9IHJlc29sdmVkTGFzdFtfcmVzb2x2ZUtleV07XG4gICAgbGV0IG5vcm1hbElkID0gJ25vcm1hbCc7XG4gICAgaWYgKHJlc29sdmVkLnJlc29sdmVPcHRpb25zKSB7XG4gICAgICBub3JtYWxJZCA9IGBub3JtYWwtJHtuZXcgbm9kZU9iamVjdEhhc2goeyBzb3J0OiBmYWxzZSB9KS5oYXNoKFxuICAgICAgICByZXNvbHZlZC5yZXNvbHZlT3B0aW9ucyxcbiAgICAgICl9YDtcbiAgICB9XG4gICAgY29uc3QgcmVzb2x2ZWRNaXNzaW5nID1cbiAgICAgIG1pc3NpbmdDYWNoZVtub3JtYWxJZF0gJiZcbiAgICAgIG1pc3NpbmdDYWNoZVtub3JtYWxJZF1bXG4gICAgICAgIEpTT04uc3RyaW5naWZ5KFtyZXNvbHZlS2V5LmNvbnRleHQsIHJlc29sdmVkLnJlc291cmNlLnNwbGl0KCc/JylbMF1dKVxuICAgICAgXTtcbiAgICBpZiAoIXJlc29sdmVkTWlzc2luZyB8fCByZXNvbHZlZE1pc3NpbmcuaW52YWxpZCkge1xuICAgICAgcmVzb2x2ZWQuaW52YWxpZCA9IHRydWU7XG4gICAgICByZXNvbHZlZC5pbnZhbGlkUmVhc29uID0gYHJlc29sdmVkIG5vcm1hbCBpbnZhbGlkJHtcbiAgICAgICAgcmVzb2x2ZWRNaXNzaW5nXG4gICAgICAgICAgPyBgICR7cmVzb2x2ZWRNaXNzaW5nLmludmFsaWRSZWFzb259YFxuICAgICAgICAgIDogJzogcmVzb2x2ZSBlbnRyeSBub3QgaW4gY2FjaGUnXG4gICAgICB9YDtcbiAgICAgIHJlc29sdmVkTmVlZFJlYnVpbGQgPSB0cnVlO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiByZXNvbHZlZE5lZWRSZWJ1aWxkO1xufTtcblxuY29uc3QgY2FjaGVhYmxlID0gbW9kdWxlID0+XG4gIG1vZHVsZS5idWlsZEluZm8gPyBtb2R1bGUuYnVpbGRJbmZvLmNhY2hlYWJsZSA6IG1vZHVsZS5jYWNoZWFibGU7XG5cbmNsYXNzIFRyYW5zZm9ybU5vcm1hbE1vZHVsZVBsdWdpbiB7XG4gIGNvbnN0cnVjdG9yKG9wdGlvbnMpIHtcbiAgICB0aGlzLm9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICB9XG5cbiAgYXBwbHkoY29tcGlsZXIpIHtcbiAgICBjb25zdCBzY2hlbWEgPSB0aGlzLm9wdGlvbnMuc2NoZW1hO1xuXG4gICAgbGV0IHNlcmlhbE5vcm1hbE1vZHVsZSA9IHNlcmlhbE5vcm1hbE1vZHVsZTQ7XG4gICAgbGV0IG5lZWRSZWJ1aWxkID0gbmVlZFJlYnVpbGQ0O1xuICAgIGlmIChzY2hlbWEgPCA0KSB7XG4gICAgICBzZXJpYWxOb3JtYWxNb2R1bGUgPSBzZXJpYWxOb3JtYWxNb2R1bGUzO1xuICAgICAgbmVlZFJlYnVpbGQgPSBuZWVkUmVidWlsZDM7XG4gICAgfVxuXG4gICAgbGV0IGNyZWF0ZUhhc2g7XG4gICAgaWYgKHNjaGVtYSA+PSA0KSB7XG4gICAgICBjcmVhdGVIYXNoID0gcmVxdWlyZSgnd2VicGFjay9saWIvdXRpbC9jcmVhdGVIYXNoJyk7XG4gICAgfVxuXG4gICAgbGV0IGZyZWV6ZTtcbiAgICBsZXQgbWFwRnJlZXplO1xuICAgIGxldCBfbWV0aG9kcztcblxuICAgIHBsdWdpbkNvbXBhdC50YXAoXG4gICAgICBjb21waWxlcixcbiAgICAgICdfaGFyZFNvdXJjZU1ldGhvZHMnLFxuICAgICAgJ1RyYW5zZm9ybU5vcm1hbE1vZHVsZVBsdWdpbicsXG4gICAgICBtZXRob2RzID0+IHtcbiAgICAgICAgX21ldGhvZHMgPSBtZXRob2RzO1xuXG4gICAgICAgIC8vIHN0b3JlID0gbWV0aG9kcy5zdG9yZTtcbiAgICAgICAgLy8gZmV0Y2ggPSBtZXRob2RzLmZldGNoO1xuICAgICAgICBmcmVlemUgPSBtZXRob2RzLmZyZWV6ZTtcbiAgICAgICAgLy8gdGhhdyA9IG1ldGhvZHMudGhhdztcbiAgICAgICAgbWFwRnJlZXplID0gbWV0aG9kcy5tYXBGcmVlemU7XG4gICAgICAgIC8vIG1hcFRoYXcgPSBtZXRob2RzLm1hcFRoYXc7XG4gICAgICB9LFxuICAgICk7XG5cbiAgICBwbHVnaW5Db21wYXQudGFwKFxuICAgICAgY29tcGlsZXIsXG4gICAgICAnY29tcGlsYXRpb24nLFxuICAgICAgJ1RyYW5zZm9ybU5vcm1hbE1vZHVsZVBsdWdpbicsXG4gICAgICBjb21waWxhdGlvbiA9PiB7XG4gICAgICAgIHBsdWdpbkNvbXBhdC50YXAoXG4gICAgICAgICAgY29tcGlsYXRpb24sXG4gICAgICAgICAgJ3N1Y2NlZWRNb2R1bGUnLFxuICAgICAgICAgICdUcmFuc2Zvcm1Ob3JtYWxNb2R1bGVQbHVnaW4nLFxuICAgICAgICAgIG1vZHVsZSA9PiB7XG4gICAgICAgICAgICBpZiAobW9kdWxlIGluc3RhbmNlb2YgTm9ybWFsTW9kdWxlKSB7XG4gICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgbW9kdWxlLl9kZXBlbmRlbmN5QmxvY2sgPSBmcmVlemUoXG4gICAgICAgICAgICAgICAgICAnRGVwZW5kZW5jeUJsb2NrJyxcbiAgICAgICAgICAgICAgICAgIG51bGwsXG4gICAgICAgICAgICAgICAgICBtb2R1bGUsXG4gICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIG1vZHVsZSxcbiAgICAgICAgICAgICAgICAgICAgcGFyZW50OiBtb2R1bGUsXG4gICAgICAgICAgICAgICAgICAgIGNvbXBpbGF0aW9uLFxuICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgbG9nTWVzc2FnZXMubW9kdWxlRnJlZXplRXJyb3IoY29tcGlsYXRpb24sIG1vZHVsZSwgZSk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9LFxuICAgICAgICApO1xuICAgICAgfSxcbiAgICApO1xuXG4gICAgcGx1Z2luQ29tcGF0LnRhcChcbiAgICAgIGNvbXBpbGVyLFxuICAgICAgJ19oYXJkU291cmNlRnJlZXplTW9kdWxlJyxcbiAgICAgICdUcmFuc2Zvcm1Ob3JtYWxNb2R1bGVQbHVnaW4nLFxuICAgICAgKGZyb3plbiwgbW9kdWxlLCBleHRyYSkgPT4ge1xuICAgICAgICAvLyBTZXQgaGFzaCBpZiBpdCB3YXMgbm90IHNldC5cbiAgICAgICAgaWYgKFxuICAgICAgICAgIHNjaGVtYSA9PT0gNCAmJlxuICAgICAgICAgIG1vZHVsZSBpbnN0YW5jZW9mIE5vcm1hbE1vZHVsZSAmJlxuICAgICAgICAgIG1vZHVsZS5idWlsZFRpbWVzdGFtcCAmJlxuICAgICAgICAgICFtb2R1bGUuaGFzaFxuICAgICAgICApIHtcbiAgICAgICAgICBjb25zdCBvdXRwdXRPcHRpb25zID0gZXh0cmEuY29tcGlsYXRpb24ub3V0cHV0T3B0aW9ucztcbiAgICAgICAgICBjb25zdCBoYXNoRnVuY3Rpb24gPSBvdXRwdXRPcHRpb25zLmhhc2hGdW5jdGlvbjtcbiAgICAgICAgICBjb25zdCBoYXNoRGlnZXN0ID0gb3V0cHV0T3B0aW9ucy5oYXNoRGlnZXN0O1xuICAgICAgICAgIGNvbnN0IGhhc2hEaWdlc3RMZW5ndGggPSBvdXRwdXRPcHRpb25zLmhhc2hEaWdlc3RMZW5ndGg7XG5cbiAgICAgICAgICBpZiAobW9kdWxlLmJ1aWxkSW5mbyAmJiBtb2R1bGUuX2luaXRCdWlsZEhhc2gpIHtcbiAgICAgICAgICAgIG1vZHVsZS5faW5pdEJ1aWxkSGFzaChleHRyYS5jb21waWxhdGlvbik7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgY29uc3QgbW9kdWxlSGFzaCA9IGNyZWF0ZUhhc2goaGFzaEZ1bmN0aW9uKTtcbiAgICAgICAgICBtb2R1bGUudXBkYXRlSGFzaChtb2R1bGVIYXNoKTtcbiAgICAgICAgICBtb2R1bGUuaGFzaCA9IG1vZHVsZUhhc2guZGlnZXN0KGhhc2hEaWdlc3QpO1xuICAgICAgICAgIG1vZHVsZS5yZW5kZXJlZEhhc2ggPSBtb2R1bGUuaGFzaC5zdWJzdHIoMCwgaGFzaERpZ2VzdExlbmd0aCk7XG4gICAgICAgICAgaWYgKG1vZHVsZS5fY2FjaGVkU291cmNlKSB7XG4gICAgICAgICAgICBtb2R1bGUuX2NhY2hlZFNvdXJjZUhhc2ggPSBtb2R1bGUuZ2V0SGFzaERpZ2VzdChcbiAgICAgICAgICAgICAgZXh0cmEuY29tcGlsYXRpb24uZGVwZW5kZW5jeVRlbXBsYXRlcyxcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKFxuICAgICAgICAgIG1vZHVsZS5yZXF1ZXN0ICYmXG4gICAgICAgICAgKGNhY2hlYWJsZShtb2R1bGUpIHx8ICFtb2R1bGUuYnVpbHQpICYmXG4gICAgICAgICAgbW9kdWxlIGluc3RhbmNlb2YgTm9ybWFsTW9kdWxlICYmXG4gICAgICAgICAgKCFmcm96ZW4gfHxcbiAgICAgICAgICAgIChzY2hlbWEgPj0gNCAmJiBtb2R1bGUuaGFzaCAhPT0gZnJvemVuLmJ1aWxkLmhhc2gpIHx8XG4gICAgICAgICAgICAoc2NoZW1hIDwgNCAmJlxuICAgICAgICAgICAgICBtb2R1bGUuZ2V0SGFzaERpZ2VzdChleHRyYS5jb21waWxhdGlvbi5kZXBlbmRlbmN5VGVtcGxhdGVzKSAhPT1cbiAgICAgICAgICAgICAgICBmcm96ZW4uaGFzaCkpXG4gICAgICAgICkge1xuICAgICAgICAgIGNvbnN0IGNvbXBpbGF0aW9uID0gZXh0cmEuY29tcGlsYXRpb247XG5cbiAgICAgICAgICBpZiAobW9kdWxlLmNhY2hlSXRlbSkge1xuICAgICAgICAgICAgbW9kdWxlLmNhY2hlSXRlbS5pbnZhbGlkID0gZmFsc2U7XG4gICAgICAgICAgICBtb2R1bGUuY2FjaGVJdGVtLmludmFsaWRSZWFzb24gPSBudWxsO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGxldCBzZXJpYWxNb2R1bGUgPSBzZXJpYWxOb3JtYWxNb2R1bGU7XG4gICAgICAgICAgaWYgKCFtb2R1bGUuYnVpbHQpIHtcbiAgICAgICAgICAgIHNlcmlhbE1vZHVsZSA9IHNlcmlhbE5vcm1hbE1vZHVsZTRQcmVCdWlsZDtcbiAgICAgICAgICB9XG4gICAgICAgICAgY29uc3QgZiA9IHNlcmlhbE1vZHVsZS5mcmVlemUoXG4gICAgICAgICAgICBudWxsLFxuICAgICAgICAgICAgbW9kdWxlLFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBtb2R1bGUsXG4gICAgICAgICAgICAgIGNvbXBpbGF0aW9uLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF9tZXRob2RzLFxuICAgICAgICAgICk7XG4gICAgICAgICAgLy8gVGhlIHNhdmVkIGRlcGVuZGVuY2llcyBtYXkgbm90IGJlIHRoZSBvbmVzIGRlcml2ZWQgaW4gdGhlIGhhc2guIFRoaXMgaXNcbiAgICAgICAgICAvLyBhbHJpZ2h0LCBpbiBzdWNoIGEgY2FzZSB0aGUgZGVwZW5kZW5jaWVzIHdlcmUgYWx0ZXJlZCBiZWZvcmUgdGhlIHNvdXJjZVxuICAgICAgICAgIC8vIHdhcyByZW5kZXJlZC4gVGhlIGRlcGVuZGVuY2llcyBzaG91bGQgYmUgbW9kaWZpZWQgYSBzZWNvbmQgdGltZSwgaWZcbiAgICAgICAgICAvLyB0aGV5IGFyZSBpbiB0aGUgc2FtZSB3YXkgdGhleSdsbCBtYXRjaC4gSWYgdGhleSBhcmUgbm90IG1vZGlmaWVkIGluIHRoZVxuICAgICAgICAgIC8vIHNhbWUgd2F5LCB0aGVuIGl0J2xsIGNvcnJlY3RseSByZXJlbmRlci5cbiAgICAgICAgICBpZiAobW9kdWxlLl9kZXBlbmRlbmN5QmxvY2spIHtcbiAgICAgICAgICAgIGYuZGVwZW5kZW5jeUJsb2NrID0gbW9kdWxlLl9kZXBlbmRlbmN5QmxvY2s7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiBmO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGZyb3plbjtcbiAgICAgIH0sXG4gICAgKTtcblxuICAgIHBsdWdpbkNvbXBhdC50YXAoXG4gICAgICBjb21waWxlcixcbiAgICAgICdfaGFyZFNvdXJjZVRoYXdNb2R1bGUnLFxuICAgICAgJ1RyYW5zZm9ybU5vcm1hbE1vZHVsZVBsdWdpbiB0aGF3JyxcbiAgICAgIChtb2R1bGUsIGZyb3plbiwgeyBjb21waWxhdGlvbiwgbm9ybWFsTW9kdWxlRmFjdG9yeSB9KSA9PiB7XG4gICAgICAgIGlmIChmcm96ZW4udHlwZSA9PT0gJ05vcm1hbE1vZHVsZScpIHtcbiAgICAgICAgICBsZXQgbTtcbiAgICAgICAgICBpZiAobW9kdWxlID09PSBudWxsKSB7XG4gICAgICAgICAgICBsZXQgc2VyaWFsTW9kdWxlID0gc2VyaWFsTm9ybWFsTW9kdWxlO1xuICAgICAgICAgICAgaWYgKCFmcm96ZW4uYnVpbGQgfHwgIWZyb3plbi5idWlsZC5idWlsdCkge1xuICAgICAgICAgICAgICBzZXJpYWxNb2R1bGUgPSBzZXJpYWxOb3JtYWxNb2R1bGU0UHJlQnVpbGQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBtID0gc2VyaWFsTW9kdWxlLnRoYXcoXG4gICAgICAgICAgICAgIG51bGwsXG4gICAgICAgICAgICAgIGZyb3plbixcbiAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIHN0YXRlOiB7IGltcG9ydHM6IHt9IH0sXG4gICAgICAgICAgICAgICAgY29tcGlsYXRpb246IGNvbXBpbGF0aW9uLFxuICAgICAgICAgICAgICAgIG5vcm1hbE1vZHVsZUZhY3Rvcnk6IG5vcm1hbE1vZHVsZUZhY3RvcnksXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIF9tZXRob2RzLFxuICAgICAgICAgICAgKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgbSA9IHNlcmlhbE5vcm1hbE1vZHVsZTRQb3N0QnVpbGQudGhhdyhcbiAgICAgICAgICAgICAgbW9kdWxlLFxuICAgICAgICAgICAgICBmcm96ZW4sXG4gICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBzdGF0ZTogeyBpbXBvcnRzOiB7fSB9LFxuICAgICAgICAgICAgICAgIGNvbXBpbGF0aW9uOiBjb21waWxhdGlvbixcbiAgICAgICAgICAgICAgICBub3JtYWxNb2R1bGVGYWN0b3J5OiBub3JtYWxNb2R1bGVGYWN0b3J5LFxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICBfbWV0aG9kcyxcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgbS5jYWNoZUl0ZW0gPSBmcm96ZW47XG4gICAgICAgICAgbS5fX2hhcmRTb3VyY2VGaWxlTWQ1cyA9IGNvbXBpbGF0aW9uLl9faGFyZFNvdXJjZUZpbGVNZDVzO1xuICAgICAgICAgIG0uX19oYXJkU291cmNlQ2FjaGVkTWQ1cyA9IGNvbXBpbGF0aW9uLl9faGFyZFNvdXJjZUNhY2hlZE1kNXM7XG4gICAgICAgICAgbS5fX2hhcmRTb3VyY2VfbWlzc2luZ0NhY2hlID0gY29tcGlsZXIuX19oYXJkU291cmNlX21pc3NpbmdDYWNoZTtcbiAgICAgICAgICBtLm5lZWRSZWJ1aWxkID0gbmVlZFJlYnVpbGQ7XG5cbiAgICAgICAgICAvLyBVbmJ1aWxkIGlmIHRoZXJlIGlzIG5vIGNhY2hlLiBUaGUgbW9kdWxlIHdpbGwgYmUgcmVidWlsdC4gTm90XG4gICAgICAgICAgLy8gdW5idWlsZGluZyB3aWxsIGxlYWQgdG8gZG91YmxlIGRlcGVuZGVuY2llcy5cbiAgICAgICAgICBpZiAobS5idWlsdCAmJiBzY2hlbWEgPT09IDQgJiYgIWNvbXBpbGF0aW9uLmNhY2hlKSB7XG4gICAgICAgICAgICBtLnVuYnVpbGQoKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgLy8gU2lkZSBsb2FkIGludG8gdGhlIGNhY2hlIGlmIHNvbWV0aGluZyBmb3IgdGhpcyBpZGVudGlmaWVyIGlzbid0IGFscmVhZHlcbiAgICAgICAgICAvLyB0aGVyZS5cbiAgICAgICAgICBlbHNlIGlmIChcbiAgICAgICAgICAgIG0uYnVpbHQgJiZcbiAgICAgICAgICAgIGNvbXBpbGF0aW9uLmNhY2hlICYmXG4gICAgICAgICAgICAhY29tcGlsYXRpb24uY2FjaGVbYG0ke20uaWRlbnRpZmllcigpfWBdXG4gICAgICAgICAgKSB7XG4gICAgICAgICAgICBjb21waWxhdGlvbi5jYWNoZVtgbSR7bS5pZGVudGlmaWVyKCl9YF0gPSBtO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHJldHVybiBtO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBtb2R1bGU7XG4gICAgICB9LFxuICAgICk7XG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBUcmFuc2Zvcm1Ob3JtYWxNb2R1bGVQbHVnaW47XG4iXSwic291cmNlUm9vdCI6Ii9Vc2Vycy90eWxlcmFyYnVzL2Rldi9wcm92aWRlci9zcmMifQ==

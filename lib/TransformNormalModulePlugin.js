'use strict';

require('source-map-support/register');

const NormalModule = require('webpack/lib/NormalModule');
const Module = require('webpack/lib/Module');

const logMessages = require('./util/log-messages');
const {
  relateNormalPath,
  relateNormalRequest,
  relateNormalPathSet,
  relateNormalLoaders
} = require('./util/relate-context');
const pluginCompat = require('./util/plugin-compat');
const serial = require('./util/serial');

const serialNormalModule4 = serial.serial('NormalModule', {
  constructor: serial.constructed(NormalModule, {
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
  }),

  setModuleExtra: {
    freeze() {},
    thaw(arg, frozen, extra, methods) {
      extra.module = arg;
      return arg;
    }
  },

  identifier: {
    freeze(arg, module, extra, methods) {
      return serial.request.freeze(module.identifier(), null, extra, methods);
    },
    thaw(arg) {
      return arg;
    }
  },

  assigned: serial.assigned({
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
    _lastSuccessfulBuildMeta: serial.identity
  }),

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
    _cachedSource: serial.source,
    _cachedSourceHash: serial.identity,
    renderedHash: serial.identity
  })
});

const needRebuild4 = function () {
  if (this.error) {
    this.cacheItem.invalid = true;
    this.cacheItem.invalidReason = 'error building';
    return true;
  }
  const fileHashes = this.__hardSourceFileMd5s;
  const cachedHashes = this.__hardSourceCachedMd5s;
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
  return false;
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

  setModuleExtra: {
    freeze() {},
    thaw(arg, frozen, extra, methods) {
      extra.module = arg;
      return arg;
    }
  },

  // Used internally by HardSource
  identifier: {
    freeze(arg, module, extra, methods) {
      return serial.request.freeze(module.identifier(), null, extra, methods);
    },
    thaw(arg) {
      return arg;
    }
  },

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
    _source: serial.source
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
  return false;
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
      if (schema === 4 && module instanceof NormalModule && !module.hash) {
        const outputOptions = extra.compilation.outputOptions;
        const hashFunction = outputOptions.hashFunction;
        const hashDigest = outputOptions.hashDigest;
        const hashDigestLength = outputOptions.hashDigestLength;

        if (module._initBuildHash) {
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

      if (module.request && cacheable(module) && module instanceof NormalModule && (!frozen || schema >= 4 && module.hash !== frozen.build.hash || schema < 4 && module.getHashDigest(extra.compilation.dependencyTemplates) !== frozen.hash)) {
        const compilation = extra.compilation;

        if (module.cacheItem) {
          module.cacheItem.invalid = false;
          module.cacheItem.invalidReason = null;
        }
        const f = serialNormalModule.freeze(null, module, {
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
        const m = serialNormalModule.thaw(null, frozen, {
          state: { imports: {} },
          compilation: compilation,
          normalModuleFactory: normalModuleFactory
        }, _methods);

        m.cacheItem = frozen;
        m.__hardSourceFileMd5s = compilation.__hardSourceFileMd5s;
        m.__hardSourceCachedMd5s = compilation.__hardSourceCachedMd5s;
        m.needRebuild = needRebuild;

        // Unbuild if there is no cache. The module will be rebuilt. Not
        // unbuilding will lead to double dependencies.
        if (schema === 4 && !compilation.cache) {
          m.unbuild();
        }
        // Side load into the cache if something for this identifier isn't already
        // there.
        else if (compilation.cache && !compilation.cache[`m${m.identifier()}`]) {
            compilation.cache[`m${m.identifier()}`] = m;
          }

        return m;
      }
      return module;
    });
  }
}

module.exports = TransformNormalModulePlugin;
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImhhcmQtc291cmNlLXdlYnBhY2stcGx1Z2luL2xpYi9UcmFuc2Zvcm1Ob3JtYWxNb2R1bGVQbHVnaW4uanMiXSwibmFtZXMiOlsiTm9ybWFsTW9kdWxlIiwicmVxdWlyZSIsIk1vZHVsZSIsImxvZ01lc3NhZ2VzIiwicmVsYXRlTm9ybWFsUGF0aCIsInJlbGF0ZU5vcm1hbFJlcXVlc3QiLCJyZWxhdGVOb3JtYWxQYXRoU2V0IiwicmVsYXRlTm9ybWFsTG9hZGVycyIsInBsdWdpbkNvbXBhdCIsInNlcmlhbCIsInNlcmlhbE5vcm1hbE1vZHVsZTQiLCJjb25zdHJ1Y3RvciIsImNvbnN0cnVjdGVkIiwiZGF0YSIsInBpcGUiLCJmcmVlemUiLCJhcmciLCJtb2R1bGUiLCJ0aGF3IiwiY3JlYXRlZCIsInR5cGUiLCJpZGVudGl0eSIsInJlcXVlc3QiLCJ1c2VyUmVxdWVzdCIsInJhd1JlcXVlc3QiLCJsb2FkZXJzIiwicmVzb3VyY2UiLCJwYXRoIiwicGFyc2VyIiwiZ2VuZXJhdG9yIiwicmVzb2x2ZU9wdGlvbnMiLCJzZXRNb2R1bGVFeHRyYSIsImZyb3plbiIsImV4dHJhIiwibWV0aG9kcyIsImlkZW50aWZpZXIiLCJhc3NpZ25lZCIsImZhY3RvcnlNZXRhIiwiaXNzdWVyIiwiY29tcGlsYXRpb24iLCJtb2R1bGVzIiwiY2FjaGVJZCIsImNhY2hlIiwidXNlU291cmNlTWFwIiwibGluZVRvTGluZSIsInNldE9yaWdpbkV4dHJhIiwib3JpZ2luIiwiYnVpbGQiLCJidWlsdCIsImJ1aWxkVGltZXN0YW1wIiwiYnVpbGRNZXRhIiwiYnVpbGRJbmZvIiwiYXNzZXRzIiwibW9kdWxlQXNzZXRzIiwiY2FjaGVhYmxlIiwiY29udGV4dERlcGVuZGVuY2llcyIsInBhdGhTZXQiLCJleHBvcnRzQXJndW1lbnQiLCJmaWxlRGVwZW5kZW5jaWVzIiwiaGFybW9ueU1vZHVsZSIsImpzb25EYXRhIiwic3RyaWN0Iiwid2FybmluZ3MiLCJtb2R1bGVXYXJuaW5nIiwiZXJyb3JzIiwibW9kdWxlRXJyb3IiLCJfc291cmNlIiwic291cmNlIiwiX2J1aWxkSGFzaCIsImhhc2giLCJfbGFzdFN1Y2Nlc3NmdWxCdWlsZE1ldGEiLCJkZXBlbmRlbmN5QmxvY2siLCJzZXRFcnJvciIsImVycm9yIiwic2V0U291cmNlRXh0cmEiLCJfY2FjaGVkU291cmNlIiwiX2NhY2hlZFNvdXJjZUhhc2giLCJyZW5kZXJlZEhhc2giLCJuZWVkUmVidWlsZDQiLCJjYWNoZUl0ZW0iLCJpbnZhbGlkIiwiaW52YWxpZFJlYXNvbiIsImZpbGVIYXNoZXMiLCJfX2hhcmRTb3VyY2VGaWxlTWQ1cyIsImNhY2hlZEhhc2hlcyIsIl9faGFyZFNvdXJjZUNhY2hlZE1kNXMiLCJmaWxlIiwiZGlyIiwic2VyaWFsTm9ybWFsTW9kdWxlMyIsIm1ldGEiLCJwYXRoQXJyYXkiLCJnZXRIYXNoRGlnZXN0IiwiZGVwZW5kZW5jeVRlbXBsYXRlcyIsIm5lZWRSZWJ1aWxkMyIsIlRyYW5zZm9ybU5vcm1hbE1vZHVsZVBsdWdpbiIsIm9wdGlvbnMiLCJhcHBseSIsImNvbXBpbGVyIiwic2NoZW1hIiwic2VyaWFsTm9ybWFsTW9kdWxlIiwibmVlZFJlYnVpbGQiLCJjcmVhdGVIYXNoIiwibWFwRnJlZXplIiwiX21ldGhvZHMiLCJ0YXAiLCJfZGVwZW5kZW5jeUJsb2NrIiwicGFyZW50IiwiZSIsIm1vZHVsZUZyZWV6ZUVycm9yIiwib3V0cHV0T3B0aW9ucyIsImhhc2hGdW5jdGlvbiIsImhhc2hEaWdlc3QiLCJoYXNoRGlnZXN0TGVuZ3RoIiwiX2luaXRCdWlsZEhhc2giLCJtb2R1bGVIYXNoIiwidXBkYXRlSGFzaCIsImRpZ2VzdCIsInN1YnN0ciIsImYiLCJub3JtYWxNb2R1bGVGYWN0b3J5IiwibSIsInN0YXRlIiwiaW1wb3J0cyIsInVuYnVpbGQiLCJleHBvcnRzIl0sIm1hcHBpbmdzIjoiOzs7O0FBQUEsTUFBTUEsZUFBZUMsUUFBUSwwQkFBUixDQUFyQjtBQUNBLE1BQU1DLFNBQVNELFFBQVEsb0JBQVIsQ0FBZjs7QUFF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Q0FJLHdCQUFZRyxLQUFaLENBQW1CLElBQUc4RSxFQUFFckYsVUFBRixFQUFlLEVBQXJDLElBQTBDcUYsQ0FBMUM7QUFDRDs7QUFFRCxlQUFPQSxDQUFQO0FBQ0Q7QUFDRCxhQUFPdkcsTUFBUDtBQUNELEtBdkNIO0FBeUNEO0FBbkwrQjs7QUFzTGxDQSxPQUFPMkcsT0FBUCxHQUFpQjlCLDJCQUFqQiIsImZpbGUiOiJoYXJkLXNvdXJjZS13ZWJwYWNrLXBsdWdpbi9saWIvVHJhbnNmb3JtTm9ybWFsTW9kdWxlUGx1Z2luLmpzIiwic291cmNlc0NvbnRlbnQiOlsiY29uc3QgTm9ybWFsTW9kdWxlID0gcmVxdWlyZSgnd2VicGFjay9saWIvTm9ybWFsTW9kdWxlJyk7XG5jb25zdCBNb2R1bGUgPSByZXF1aXJlKCd3ZWJwYWNrL2xpYi9Nb2R1bGUnKTtcblxuY29uc3QgbG9nTWVzc2FnZXMgPSByZXF1aXJlKCcuL3V0aWwvbG9nLW1lc3NhZ2VzJyk7XG5jb25zdCB7XG4gIHJlbGF0ZU5vcm1hbFBhdGgsXG4gIHJlbGF0ZU5vcm1hbFJlcXVlc3QsXG4gIHJlbGF0ZU5vcm1hbFBhdGhTZXQsXG4gIHJlbGF0ZU5vcm1hbExvYWRlcnMsXG59ID0gcmVxdWlyZSgnLi91dGlsL3JlbGF0ZS1jb250ZXh0Jyk7XG5jb25zdCBwbHVnaW5Db21wYXQgPSByZXF1aXJlKCcuL3V0aWwvcGx1Z2luLWNvbXBhdCcpO1xuY29uc3Qgc2VyaWFsID0gcmVxdWlyZSgnLi91dGlsL3NlcmlhbCcpO1xuXG5jb25zdCBzZXJpYWxOb3JtYWxNb2R1bGU0ID0gc2VyaWFsLnNlcmlhbCgnTm9ybWFsTW9kdWxlJywge1xuICBjb25zdHJ1Y3Rvcjogc2VyaWFsLmNvbnN0cnVjdGVkKE5vcm1hbE1vZHVsZSwge1xuICAgIGRhdGE6IHNlcmlhbC5waXBlKFxuICAgICAgeyBmcmVlemU6IChhcmcsIG1vZHVsZSkgPT4gbW9kdWxlLCB0aGF3OiBhcmcgPT4gYXJnIH0sXG4gICAgICBzZXJpYWwuY3JlYXRlZCh7XG4gICAgICAgIHR5cGU6IHNlcmlhbC5pZGVudGl0eSxcbiAgICAgICAgcmVxdWVzdDogc2VyaWFsLnJlcXVlc3QsXG4gICAgICAgIHVzZXJSZXF1ZXN0OiBzZXJpYWwucmVxdWVzdCxcbiAgICAgICAgcmF3UmVxdWVzdDogc2VyaWFsLnJlcXVlc3QsXG4gICAgICAgIGxvYWRlcnM6IHNlcmlhbC5sb2FkZXJzLFxuICAgICAgICByZXNvdXJjZTogc2VyaWFsLnBhdGgsXG4gICAgICAgIHBhcnNlcjogc2VyaWFsLnBhcnNlcixcbiAgICAgICAgZ2VuZXJhdG9yOiBzZXJpYWwuZ2VuZXJhdG9yLFxuICAgICAgICByZXNvbHZlT3B0aW9uczogc2VyaWFsLmlkZW50aXR5LFxuICAgICAgfSksXG4gICAgKSxcbiAgfSksXG5cbiAgc2V0TW9kdWxlRXh0cmE6IHtcbiAgICBmcmVlemUoKSB7fSxcbiAgICB0aGF3KGFyZywgZnJvemVuLCBleHRyYSwgbWV0aG9kcykge1xuICAgICAgZXh0cmEubW9kdWxlID0gYXJnO1xuICAgICAgcmV0dXJuIGFyZztcbiAgICB9LFxuICB9LFxuXG4gIGlkZW50aWZpZXI6IHtcbiAgICBmcmVlemUoYXJnLCBtb2R1bGUsIGV4dHJhLCBtZXRob2RzKSB7XG4gICAgICByZXR1cm4gc2VyaWFsLnJlcXVlc3QuZnJlZXplKG1vZHVsZS5pZGVudGlmaWVyKCksIG51bGwsIGV4dHJhLCBtZXRob2RzKTtcbiAgICB9LFxuICAgIHRoYXcoYXJnKSB7XG4gICAgICByZXR1cm4gYXJnO1xuICAgIH0sXG4gIH0sXG5cbiAgYXNzaWduZWQ6IHNlcmlhbC5hc3NpZ25lZCh7XG4gICAgZmFjdG9yeU1ldGE6IHNlcmlhbC5pZGVudGl0eSxcbiAgICBpc3N1ZXI6IHNlcmlhbC5waXBlKFxuICAgICAge1xuICAgICAgICBmcmVlemUoYXJnLCB7IGlzc3VlciB9KSB7XG4gICAgICAgICAgcmV0dXJuIGlzc3VlciAmJiB0eXBlb2YgaXNzdWVyID09PSAnb2JqZWN0J1xuICAgICAgICAgICAgPyBpc3N1ZXIuaWRlbnRpZmllcigpXG4gICAgICAgICAgICA6IGlzc3VlcjtcbiAgICAgICAgfSxcbiAgICAgICAgdGhhdyhhcmcsIGZyb3plbiwgZXh0cmEpIHtcbiAgICAgICAgICByZXR1cm4gYXJnO1xuICAgICAgICB9LFxuICAgICAgfSxcbiAgICAgIHNlcmlhbC5yZXF1ZXN0LFxuICAgICAge1xuICAgICAgICBmcmVlemUoYXJnKSB7XG4gICAgICAgICAgcmV0dXJuIGFyZztcbiAgICAgICAgfSxcbiAgICAgICAgdGhhdyhhcmcsIGZyb3plbiwgeyBjb21waWxhdGlvbiB9KSB7XG4gICAgICAgICAgaWYgKGNvbXBpbGF0aW9uLm1vZHVsZXMpIHtcbiAgICAgICAgICAgIGZvciAoY29uc3QgbW9kdWxlIG9mIGNvbXBpbGF0aW9uLm1vZHVsZXMpIHtcbiAgICAgICAgICAgICAgaWYgKFxuICAgICAgICAgICAgICAgIG1vZHVsZSAmJlxuICAgICAgICAgICAgICAgIHR5cGVvZiBtb2R1bGUuaWRlbnRpZmllciA9PT0gJ2Z1bmN0aW9uJyAmJlxuICAgICAgICAgICAgICAgIG1vZHVsZS5pZGVudGlmaWVyKCkgPT09IGFyZ1xuICAgICAgICAgICAgICApIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbW9kdWxlO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGNhY2hlSWQgaW4gY29tcGlsYXRpb24uY2FjaGUpIHtcbiAgICAgICAgICAgICAgY29uc3QgbW9kdWxlID0gY29tcGlsYXRpb24uY2FjaGVbY2FjaGVJZF07XG4gICAgICAgICAgICAgIGlmIChcbiAgICAgICAgICAgICAgICBtb2R1bGUgJiZcbiAgICAgICAgICAgICAgICB0eXBlb2YgbW9kdWxlLmlkZW50aWZpZXIgPT09ICdmdW5jdGlvbicgJiZcbiAgICAgICAgICAgICAgICBtb2R1bGUuaWRlbnRpZmllcigpID09PSBhcmdcbiAgICAgICAgICAgICAgKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG1vZHVsZTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gYXJnO1xuICAgICAgICB9LFxuICAgICAgfSxcbiAgICApLFxuICAgIHVzZVNvdXJjZU1hcDogc2VyaWFsLmlkZW50aXR5LFxuICAgIGxpbmVUb0xpbmU6IHNlcmlhbC5pZGVudGl0eSxcbiAgfSksXG5cbiAgc2V0T3JpZ2luRXh0cmE6IHtcbiAgICBmcmVlemUoKSB7fSxcbiAgICB0aGF3KGFyZywgZnJvemVuLCBleHRyYSkge1xuICAgICAgaWYgKHR5cGVvZiBhcmcuaXNzdWVyID09PSAnb2JqZWN0Jykge1xuICAgICAgICBleHRyYS5vcmlnaW4gPSBhcmcuaXNzdWVyO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGFyZztcbiAgICB9LFxuICB9LFxuXG4gIGJ1aWxkOiBzZXJpYWwuYXNzaWduZWQoe1xuICAgIGJ1aWx0OiBzZXJpYWwuaWRlbnRpdHksXG4gICAgYnVpbGRUaW1lc3RhbXA6IHNlcmlhbC5pZGVudGl0eSxcbiAgICBidWlsZE1ldGE6IHNlcmlhbC5pZGVudGl0eSxcbiAgICBidWlsZEluZm86IHNlcmlhbC5jcmVhdGVkKHtcbiAgICAgIGFzc2V0czogc2VyaWFsLm1vZHVsZUFzc2V0cyxcbiAgICAgIGNhY2hlYWJsZTogc2VyaWFsLmlkZW50aXR5LFxuICAgICAgY29udGV4dERlcGVuZGVuY2llczogc2VyaWFsLnBhdGhTZXQsXG4gICAgICBleHBvcnRzQXJndW1lbnQ6IHNlcmlhbC5pZGVudGl0eSxcbiAgICAgIGZpbGVEZXBlbmRlbmNpZXM6IHNlcmlhbC5wYXRoU2V0LFxuICAgICAgaGFybW9ueU1vZHVsZTogc2VyaWFsLmlkZW50aXR5LFxuICAgICAganNvbkRhdGE6IHNlcmlhbC5pZGVudGl0eSxcbiAgICAgIHN0cmljdDogc2VyaWFsLmlkZW50aXR5LFxuICAgIH0pLFxuICAgIHdhcm5pbmdzOiBzZXJpYWwubW9kdWxlV2FybmluZyxcbiAgICBlcnJvcnM6IHNlcmlhbC5tb2R1bGVFcnJvcixcbiAgICBfc291cmNlOiBzZXJpYWwuc291cmNlLFxuICAgIF9idWlsZEhhc2g6IHNlcmlhbC5pZGVudGl0eSxcbiAgICBoYXNoOiBzZXJpYWwuaWRlbnRpdHksXG4gICAgX2xhc3RTdWNjZXNzZnVsQnVpbGRNZXRhOiBzZXJpYWwuaWRlbnRpdHksXG4gIH0pLFxuXG4gIGRlcGVuZGVuY3lCbG9jazogc2VyaWFsLmRlcGVuZGVuY3lCbG9jayxcblxuICBzZXRFcnJvcjoge1xuICAgIGZyZWV6ZSgpIHt9LFxuICAgIHRoYXcoYXJnLCBtb2R1bGUsIGV4dHJhKSB7XG4gICAgICBhcmcuZXJyb3IgPSBhcmcuZXJyb3JzWzBdIHx8IG51bGw7XG4gICAgICByZXR1cm4gYXJnO1xuICAgIH0sXG4gIH0sXG5cbiAgc2V0U291cmNlRXh0cmE6IHtcbiAgICBmcmVlemUoKSB7fSxcbiAgICB0aGF3KGFyZywgbW9kdWxlLCBleHRyYSkge1xuICAgICAgZXh0cmEuc291cmNlID0gYXJnLl9zb3VyY2U7XG4gICAgICByZXR1cm4gYXJnO1xuICAgIH0sXG4gIH0sXG5cbiAgc291cmNlOiBzZXJpYWwuYXNzaWduZWQoe1xuICAgIF9jYWNoZWRTb3VyY2U6IHNlcmlhbC5zb3VyY2UsXG4gICAgX2NhY2hlZFNvdXJjZUhhc2g6IHNlcmlhbC5pZGVudGl0eSxcbiAgICByZW5kZXJlZEhhc2g6IHNlcmlhbC5pZGVudGl0eSxcbiAgfSksXG59KTtcblxuY29uc3QgbmVlZFJlYnVpbGQ0ID0gZnVuY3Rpb24oKSB7XG4gIGlmICh0aGlzLmVycm9yKSB7XG4gICAgdGhpcy5jYWNoZUl0ZW0uaW52YWxpZCA9IHRydWU7XG4gICAgdGhpcy5jYWNoZUl0ZW0uaW52YWxpZFJlYXNvbiA9ICdlcnJvciBidWlsZGluZyc7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cbiAgY29uc3QgZmlsZUhhc2hlcyA9IHRoaXMuX19oYXJkU291cmNlRmlsZU1kNXM7XG4gIGNvbnN0IGNhY2hlZEhhc2hlcyA9IHRoaXMuX19oYXJkU291cmNlQ2FjaGVkTWQ1cztcbiAgZm9yIChjb25zdCBmaWxlIG9mIHRoaXMuYnVpbGRJbmZvLmZpbGVEZXBlbmRlbmNpZXMpIHtcbiAgICBpZiAoIWNhY2hlZEhhc2hlc1tmaWxlXSB8fCBmaWxlSGFzaGVzW2ZpbGVdICE9PSBjYWNoZWRIYXNoZXNbZmlsZV0pIHtcbiAgICAgIHRoaXMuY2FjaGVJdGVtLmludmFsaWQgPSB0cnVlO1xuICAgICAgdGhpcy5jYWNoZUl0ZW0uaW52YWxpZFJlYXNvbiA9ICdtZDUgbWlzbWF0Y2gnO1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICB9XG4gIGZvciAoY29uc3QgZGlyIG9mIHRoaXMuYnVpbGRJbmZvLmNvbnRleHREZXBlbmRlbmNpZXMpIHtcbiAgICBpZiAoIWNhY2hlZEhhc2hlc1tkaXJdIHx8IGZpbGVIYXNoZXNbZGlyXSAhPT0gY2FjaGVkSGFzaGVzW2Rpcl0pIHtcbiAgICAgIHRoaXMuY2FjaGVJdGVtLmludmFsaWQgPSB0cnVlO1xuICAgICAgdGhpcy5jYWNoZUl0ZW0uaW52YWxpZFJlYXNvbiA9ICdtZDUgbWlzbWF0Y2gnO1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICB9XG4gIHJldHVybiBmYWxzZTtcbn07XG5cbmNvbnN0IHNlcmlhbE5vcm1hbE1vZHVsZTMgPSBzZXJpYWwuc2VyaWFsKCdOb3JtYWxNb2R1bGUnLCB7XG4gIGNvbnN0cnVjdG9yOiBzZXJpYWwuY29uc3RydWN0ZWQoTm9ybWFsTW9kdWxlLCB7XG4gICAgcmVxdWVzdDogc2VyaWFsLnJlcXVlc3QsXG4gICAgdXNlclJlcXVlc3Q6IHNlcmlhbC5yZXF1ZXN0LFxuICAgIHJhd1JlcXVlc3Q6IHNlcmlhbC5yZXF1ZXN0LFxuICAgIGxvYWRlcnM6IHNlcmlhbC5sb2FkZXJzLFxuICAgIHJlc291cmNlOiBzZXJpYWwucGF0aCxcbiAgICBwYXJzZXI6IHNlcmlhbC5wYXJzZXIsXG4gIH0pLFxuXG4gIHNldE1vZHVsZUV4dHJhOiB7XG4gICAgZnJlZXplKCkge30sXG4gICAgdGhhdyhhcmcsIGZyb3plbiwgZXh0cmEsIG1ldGhvZHMpIHtcbiAgICAgIGV4dHJhLm1vZHVsZSA9IGFyZztcbiAgICAgIHJldHVybiBhcmc7XG4gICAgfSxcbiAgfSxcblxuICAvLyBVc2VkIGludGVybmFsbHkgYnkgSGFyZFNvdXJjZVxuICBpZGVudGlmaWVyOiB7XG4gICAgZnJlZXplKGFyZywgbW9kdWxlLCBleHRyYSwgbWV0aG9kcykge1xuICAgICAgcmV0dXJuIHNlcmlhbC5yZXF1ZXN0LmZyZWV6ZShtb2R1bGUuaWRlbnRpZmllcigpLCBudWxsLCBleHRyYSwgbWV0aG9kcyk7XG4gICAgfSxcbiAgICB0aGF3KGFyZykge1xuICAgICAgcmV0dXJuIGFyZztcbiAgICB9LFxuICB9LFxuXG4gIGFzc2lnbmVkOiBzZXJpYWwuYXNzaWduZWQoe1xuICAgIGlzc3Vlcjogc2VyaWFsLnBpcGUoXG4gICAgICB7XG4gICAgICAgIGZyZWV6ZShhcmcsIHsgaXNzdWVyIH0pIHtcbiAgICAgICAgICByZXR1cm4gaXNzdWVyICYmIHR5cGVvZiBpc3N1ZXIgPT09ICdvYmplY3QnXG4gICAgICAgICAgICA/IGlzc3Vlci5pZGVudGlmaWVyKClcbiAgICAgICAgICAgIDogaXNzdWVyO1xuICAgICAgICB9LFxuICAgICAgICB0aGF3KGFyZywgZnJvemVuLCBleHRyYSkge1xuICAgICAgICAgIHJldHVybiBhcmc7XG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgICAgc2VyaWFsLnJlcXVlc3QsXG4gICAgICB7XG4gICAgICAgIGZyZWV6ZShhcmcpIHtcbiAgICAgICAgICByZXR1cm4gYXJnO1xuICAgICAgICB9LFxuICAgICAgICB0aGF3KGFyZywgZnJvemVuLCB7IGNvbXBpbGF0aW9uIH0pIHtcbiAgICAgICAgICBpZiAoY29tcGlsYXRpb24ubW9kdWxlcykge1xuICAgICAgICAgICAgZm9yIChjb25zdCBtb2R1bGUgb2YgY29tcGlsYXRpb24ubW9kdWxlcykge1xuICAgICAgICAgICAgICBpZiAoXG4gICAgICAgICAgICAgICAgbW9kdWxlICYmXG4gICAgICAgICAgICAgICAgdHlwZW9mIG1vZHVsZS5pZGVudGlmaWVyID09PSAnZnVuY3Rpb24nICYmXG4gICAgICAgICAgICAgICAgbW9kdWxlLmlkZW50aWZpZXIoKSA9PT0gYXJnXG4gICAgICAgICAgICAgICkge1xuICAgICAgICAgICAgICAgIHJldHVybiBtb2R1bGU7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGZvciAoY29uc3QgY2FjaGVJZCBpbiBjb21waWxhdGlvbi5jYWNoZSkge1xuICAgICAgICAgICAgICBjb25zdCBtb2R1bGUgPSBjb21waWxhdGlvbi5jYWNoZVtjYWNoZUlkXTtcbiAgICAgICAgICAgICAgaWYgKFxuICAgICAgICAgICAgICAgIG1vZHVsZSAmJlxuICAgICAgICAgICAgICAgIHR5cGVvZiBtb2R1bGUuaWRlbnRpZmllciA9PT0gJ2Z1bmN0aW9uJyAmJlxuICAgICAgICAgICAgICAgIG1vZHVsZS5pZGVudGlmaWVyKCkgPT09IGFyZ1xuICAgICAgICAgICAgICApIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbW9kdWxlO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiBhcmc7XG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgICksXG4gICAgdXNlU291cmNlTWFwOiBzZXJpYWwuaWRlbnRpdHksXG4gICAgbGluZVRvTGluZTogc2VyaWFsLmlkZW50aXR5LFxuICB9KSxcblxuICBzZXRPcmlnaW5FeHRyYToge1xuICAgIGZyZWV6ZSgpIHt9LFxuICAgIHRoYXcoYXJnLCBmcm96ZW4sIGV4dHJhKSB7XG4gICAgICBpZiAodHlwZW9mIGFyZy5pc3N1ZXIgPT09ICdvYmplY3QnKSB7XG4gICAgICAgIGV4dHJhLm9yaWdpbiA9IGFyZy5pc3N1ZXI7XG4gICAgICB9XG4gICAgICByZXR1cm4gYXJnO1xuICAgIH0sXG4gIH0sXG5cbiAgYnVpbGQ6IHNlcmlhbC5hc3NpZ25lZCh7XG4gICAgYnVpbHQ6IHNlcmlhbC5pZGVudGl0eSxcbiAgICBidWlsZFRpbWVzdGFtcDogc2VyaWFsLmlkZW50aXR5LFxuICAgIGNhY2hlYWJsZTogc2VyaWFsLmlkZW50aXR5LFxuICAgIG1ldGE6IHNlcmlhbC5pZGVudGl0eSxcbiAgICBhc3NldHM6IHNlcmlhbC5tb2R1bGVBc3NldHMsXG4gICAgZmlsZURlcGVuZGVuY2llczogc2VyaWFsLnBhdGhBcnJheSxcbiAgICBjb250ZXh0RGVwZW5kZW5jaWVzOiBzZXJpYWwucGF0aEFycmF5LFxuICAgIGhhcm1vbnlNb2R1bGU6IHNlcmlhbC5pZGVudGl0eSxcbiAgICBzdHJpY3Q6IHNlcmlhbC5pZGVudGl0eSxcbiAgICBleHBvcnRzQXJndW1lbnQ6IHNlcmlhbC5pZGVudGl0eSxcbiAgICB3YXJuaW5nczogc2VyaWFsLm1vZHVsZVdhcm5pbmcsXG4gICAgZXJyb3JzOiBzZXJpYWwubW9kdWxlRXJyb3IsXG4gICAgX3NvdXJjZTogc2VyaWFsLnNvdXJjZSxcbiAgfSksXG5cbiAgaGFzaDoge1xuICAgIGZyZWV6ZShhcmcsIG1vZHVsZSwgeyBjb21waWxhdGlvbiB9LCBtZXRob2RzKSB7XG4gICAgICByZXR1cm4gbW9kdWxlLmdldEhhc2hEaWdlc3QoY29tcGlsYXRpb24uZGVwZW5kZW5jeVRlbXBsYXRlcyk7XG4gICAgfSxcbiAgICB0aGF3KGFyZykge1xuICAgICAgcmV0dXJuIGFyZztcbiAgICB9LFxuICB9LFxuXG4gIGRlcGVuZGVuY3lCbG9jazogc2VyaWFsLmRlcGVuZGVuY3lCbG9jayxcblxuICBzZXRFcnJvcjoge1xuICAgIGZyZWV6ZSgpIHt9LFxuICAgIHRoYXcoYXJnLCBtb2R1bGUsIGV4dHJhKSB7XG4gICAgICBhcmcuZXJyb3IgPSBhcmcuZXJyb3JzWzBdIHx8IG51bGw7XG4gICAgICByZXR1cm4gYXJnO1xuICAgIH0sXG4gIH0sXG5cbiAgc2V0U291cmNlRXh0cmE6IHtcbiAgICBmcmVlemUoKSB7fSxcbiAgICB0aGF3KGFyZywgbW9kdWxlLCBleHRyYSkge1xuICAgICAgZXh0cmEuc291cmNlID0gYXJnLl9zb3VyY2U7XG4gICAgICByZXR1cm4gYXJnO1xuICAgIH0sXG4gIH0sXG5cbiAgc291cmNlOiBzZXJpYWwuYXNzaWduZWQoe1xuICAgIF9jYWNoZWRTb3VyY2U6IHNlcmlhbC5jcmVhdGVkKHtcbiAgICAgIHNvdXJjZTogc2VyaWFsLnNvdXJjZSxcbiAgICAgIGhhc2g6IHNlcmlhbC5pZGVudGl0eSxcbiAgICB9KSxcbiAgfSksXG59KTtcblxuY29uc3QgbmVlZFJlYnVpbGQzID0gZnVuY3Rpb24oKSB7XG4gIGlmICh0aGlzLmVycm9yKSB7XG4gICAgdGhpcy5jYWNoZUl0ZW0uaW52YWxpZCA9IHRydWU7XG4gICAgdGhpcy5jYWNoZUl0ZW0uaW52YWxpZFJlYXNvbiA9ICdlcnJvciBidWlsZGluZyc7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cbiAgY29uc3QgZmlsZUhhc2hlcyA9IHRoaXMuX19oYXJkU291cmNlRmlsZU1kNXM7XG4gIGNvbnN0IGNhY2hlZEhhc2hlcyA9IHRoaXMuX19oYXJkU291cmNlQ2FjaGVkTWQ1cztcbiAgZm9yIChjb25zdCBmaWxlIG9mIHRoaXMuZmlsZURlcGVuZGVuY2llcykge1xuICAgIGlmICghY2FjaGVkSGFzaGVzW2ZpbGVdIHx8IGZpbGVIYXNoZXNbZmlsZV0gIT09IGNhY2hlZEhhc2hlc1tmaWxlXSkge1xuICAgICAgdGhpcy5jYWNoZUl0ZW0uaW52YWxpZCA9IHRydWU7XG4gICAgICB0aGlzLmNhY2hlSXRlbS5pbnZhbGlkUmVhc29uID0gJ21kNSBtaXNtYXRjaCc7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gIH1cbiAgZm9yIChjb25zdCBkaXIgb2YgdGhpcy5jb250ZXh0RGVwZW5kZW5jaWVzKSB7XG4gICAgaWYgKCFjYWNoZWRIYXNoZXNbZGlyXSB8fCBmaWxlSGFzaGVzW2Rpcl0gIT09IGNhY2hlZEhhc2hlc1tkaXJdKSB7XG4gICAgICB0aGlzLmNhY2hlSXRlbS5pbnZhbGlkID0gdHJ1ZTtcbiAgICAgIHRoaXMuY2FjaGVJdGVtLmludmFsaWRSZWFzb24gPSAnbWQ1IG1pc21hdGNoJztcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgfVxuICByZXR1cm4gZmFsc2U7XG59O1xuXG5jb25zdCBjYWNoZWFibGUgPSBtb2R1bGUgPT5cbiAgbW9kdWxlLmJ1aWxkSW5mbyA/IG1vZHVsZS5idWlsZEluZm8uY2FjaGVhYmxlIDogbW9kdWxlLmNhY2hlYWJsZTtcblxuY2xhc3MgVHJhbnNmb3JtTm9ybWFsTW9kdWxlUGx1Z2luIHtcbiAgY29uc3RydWN0b3Iob3B0aW9ucykge1xuICAgIHRoaXMub3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gIH1cblxuICBhcHBseShjb21waWxlcikge1xuICAgIGNvbnN0IHNjaGVtYSA9IHRoaXMub3B0aW9ucy5zY2hlbWE7XG5cbiAgICBsZXQgc2VyaWFsTm9ybWFsTW9kdWxlID0gc2VyaWFsTm9ybWFsTW9kdWxlNDtcbiAgICBsZXQgbmVlZFJlYnVpbGQgPSBuZWVkUmVidWlsZDQ7XG4gICAgaWYgKHNjaGVtYSA8IDQpIHtcbiAgICAgIHNlcmlhbE5vcm1hbE1vZHVsZSA9IHNlcmlhbE5vcm1hbE1vZHVsZTM7XG4gICAgICBuZWVkUmVidWlsZCA9IG5lZWRSZWJ1aWxkMztcbiAgICB9XG5cbiAgICBsZXQgY3JlYXRlSGFzaDtcbiAgICBpZiAoc2NoZW1hID49IDQpIHtcbiAgICAgIGNyZWF0ZUhhc2ggPSByZXF1aXJlKCd3ZWJwYWNrL2xpYi91dGlsL2NyZWF0ZUhhc2gnKTtcbiAgICB9XG5cbiAgICBsZXQgZnJlZXplO1xuICAgIGxldCBtYXBGcmVlemU7XG4gICAgbGV0IF9tZXRob2RzO1xuXG4gICAgcGx1Z2luQ29tcGF0LnRhcChcbiAgICAgIGNvbXBpbGVyLFxuICAgICAgJ19oYXJkU291cmNlTWV0aG9kcycsXG4gICAgICAnVHJhbnNmb3JtTm9ybWFsTW9kdWxlUGx1Z2luJyxcbiAgICAgIG1ldGhvZHMgPT4ge1xuICAgICAgICBfbWV0aG9kcyA9IG1ldGhvZHM7XG5cbiAgICAgICAgLy8gc3RvcmUgPSBtZXRob2RzLnN0b3JlO1xuICAgICAgICAvLyBmZXRjaCA9IG1ldGhvZHMuZmV0Y2g7XG4gICAgICAgIGZyZWV6ZSA9IG1ldGhvZHMuZnJlZXplO1xuICAgICAgICAvLyB0aGF3ID0gbWV0aG9kcy50aGF3O1xuICAgICAgICBtYXBGcmVlemUgPSBtZXRob2RzLm1hcEZyZWV6ZTtcbiAgICAgICAgLy8gbWFwVGhhdyA9IG1ldGhvZHMubWFwVGhhdztcbiAgICAgIH0sXG4gICAgKTtcblxuICAgIHBsdWdpbkNvbXBhdC50YXAoXG4gICAgICBjb21waWxlcixcbiAgICAgICdjb21waWxhdGlvbicsXG4gICAgICAnVHJhbnNmb3JtTm9ybWFsTW9kdWxlUGx1Z2luJyxcbiAgICAgIGNvbXBpbGF0aW9uID0+IHtcbiAgICAgICAgcGx1Z2luQ29tcGF0LnRhcChcbiAgICAgICAgICBjb21waWxhdGlvbixcbiAgICAgICAgICAnc3VjY2VlZE1vZHVsZScsXG4gICAgICAgICAgJ1RyYW5zZm9ybU5vcm1hbE1vZHVsZVBsdWdpbicsXG4gICAgICAgICAgbW9kdWxlID0+IHtcbiAgICAgICAgICAgIGlmIChtb2R1bGUgaW5zdGFuY2VvZiBOb3JtYWxNb2R1bGUpIHtcbiAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBtb2R1bGUuX2RlcGVuZGVuY3lCbG9jayA9IGZyZWV6ZShcbiAgICAgICAgICAgICAgICAgICdEZXBlbmRlbmN5QmxvY2snLFxuICAgICAgICAgICAgICAgICAgbnVsbCxcbiAgICAgICAgICAgICAgICAgIG1vZHVsZSxcbiAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgbW9kdWxlLFxuICAgICAgICAgICAgICAgICAgICBwYXJlbnQ6IG1vZHVsZSxcbiAgICAgICAgICAgICAgICAgICAgY29tcGlsYXRpb24sXG4gICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICBsb2dNZXNzYWdlcy5tb2R1bGVGcmVlemVFcnJvcihjb21waWxhdGlvbiwgbW9kdWxlLCBlKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH0sXG4gICAgICAgICk7XG4gICAgICB9LFxuICAgICk7XG5cbiAgICBwbHVnaW5Db21wYXQudGFwKFxuICAgICAgY29tcGlsZXIsXG4gICAgICAnX2hhcmRTb3VyY2VGcmVlemVNb2R1bGUnLFxuICAgICAgJ1RyYW5zZm9ybU5vcm1hbE1vZHVsZVBsdWdpbicsXG4gICAgICAoZnJvemVuLCBtb2R1bGUsIGV4dHJhKSA9PiB7XG4gICAgICAgIC8vIFNldCBoYXNoIGlmIGl0IHdhcyBub3Qgc2V0LlxuICAgICAgICBpZiAoc2NoZW1hID09PSA0ICYmIG1vZHVsZSBpbnN0YW5jZW9mIE5vcm1hbE1vZHVsZSAmJiAhbW9kdWxlLmhhc2gpIHtcbiAgICAgICAgICBjb25zdCBvdXRwdXRPcHRpb25zID0gZXh0cmEuY29tcGlsYXRpb24ub3V0cHV0T3B0aW9ucztcbiAgICAgICAgICBjb25zdCBoYXNoRnVuY3Rpb24gPSBvdXRwdXRPcHRpb25zLmhhc2hGdW5jdGlvbjtcbiAgICAgICAgICBjb25zdCBoYXNoRGlnZXN0ID0gb3V0cHV0T3B0aW9ucy5oYXNoRGlnZXN0O1xuICAgICAgICAgIGNvbnN0IGhhc2hEaWdlc3RMZW5ndGggPSBvdXRwdXRPcHRpb25zLmhhc2hEaWdlc3RMZW5ndGg7XG5cbiAgICAgICAgICBpZiAobW9kdWxlLl9pbml0QnVpbGRIYXNoKSB7XG4gICAgICAgICAgICBtb2R1bGUuX2luaXRCdWlsZEhhc2goZXh0cmEuY29tcGlsYXRpb24pO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGNvbnN0IG1vZHVsZUhhc2ggPSBjcmVhdGVIYXNoKGhhc2hGdW5jdGlvbik7XG4gICAgICAgICAgbW9kdWxlLnVwZGF0ZUhhc2gobW9kdWxlSGFzaCk7XG4gICAgICAgICAgbW9kdWxlLmhhc2ggPSBtb2R1bGVIYXNoLmRpZ2VzdChoYXNoRGlnZXN0KTtcbiAgICAgICAgICBtb2R1bGUucmVuZGVyZWRIYXNoID0gbW9kdWxlLmhhc2guc3Vic3RyKDAsIGhhc2hEaWdlc3RMZW5ndGgpO1xuICAgICAgICAgIGlmIChtb2R1bGUuX2NhY2hlZFNvdXJjZSkge1xuICAgICAgICAgICAgbW9kdWxlLl9jYWNoZWRTb3VyY2VIYXNoID0gbW9kdWxlLmdldEhhc2hEaWdlc3QoXG4gICAgICAgICAgICAgIGV4dHJhLmNvbXBpbGF0aW9uLmRlcGVuZGVuY3lUZW1wbGF0ZXMsXG4gICAgICAgICAgICApO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChcbiAgICAgICAgICBtb2R1bGUucmVxdWVzdCAmJlxuICAgICAgICAgIGNhY2hlYWJsZShtb2R1bGUpICYmXG4gICAgICAgICAgbW9kdWxlIGluc3RhbmNlb2YgTm9ybWFsTW9kdWxlICYmXG4gICAgICAgICAgKCFmcm96ZW4gfHxcbiAgICAgICAgICAgIChzY2hlbWEgPj0gNCAmJiBtb2R1bGUuaGFzaCAhPT0gZnJvemVuLmJ1aWxkLmhhc2gpIHx8XG4gICAgICAgICAgICAoc2NoZW1hIDwgNCAmJlxuICAgICAgICAgICAgICBtb2R1bGUuZ2V0SGFzaERpZ2VzdChleHRyYS5jb21waWxhdGlvbi5kZXBlbmRlbmN5VGVtcGxhdGVzKSAhPT1cbiAgICAgICAgICAgICAgICBmcm96ZW4uaGFzaCkpXG4gICAgICAgICkge1xuICAgICAgICAgIGNvbnN0IGNvbXBpbGF0aW9uID0gZXh0cmEuY29tcGlsYXRpb247XG5cbiAgICAgICAgICBpZiAobW9kdWxlLmNhY2hlSXRlbSkge1xuICAgICAgICAgICAgbW9kdWxlLmNhY2hlSXRlbS5pbnZhbGlkID0gZmFsc2U7XG4gICAgICAgICAgICBtb2R1bGUuY2FjaGVJdGVtLmludmFsaWRSZWFzb24gPSBudWxsO1xuICAgICAgICAgIH1cbiAgICAgICAgICBjb25zdCBmID0gc2VyaWFsTm9ybWFsTW9kdWxlLmZyZWV6ZShcbiAgICAgICAgICAgIG51bGwsXG4gICAgICAgICAgICBtb2R1bGUsXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIG1vZHVsZSxcbiAgICAgICAgICAgICAgY29tcGlsYXRpb24sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgX21ldGhvZHMsXG4gICAgICAgICAgKTtcbiAgICAgICAgICAvLyBUaGUgc2F2ZWQgZGVwZW5kZW5jaWVzIG1heSBub3QgYmUgdGhlIG9uZXMgZGVyaXZlZCBpbiB0aGUgaGFzaC4gVGhpcyBpc1xuICAgICAgICAgIC8vIGFscmlnaHQsIGluIHN1Y2ggYSBjYXNlIHRoZSBkZXBlbmRlbmNpZXMgd2VyZSBhbHRlcmVkIGJlZm9yZSB0aGUgc291cmNlXG4gICAgICAgICAgLy8gd2FzIHJlbmRlcmVkLiBUaGUgZGVwZW5kZW5jaWVzIHNob3VsZCBiZSBtb2RpZmllZCBhIHNlY29uZCB0aW1lLCBpZlxuICAgICAgICAgIC8vIHRoZXkgYXJlIGluIHRoZSBzYW1lIHdheSB0aGV5J2xsIG1hdGNoLiBJZiB0aGV5IGFyZSBub3QgbW9kaWZpZWQgaW4gdGhlXG4gICAgICAgICAgLy8gc2FtZSB3YXksIHRoZW4gaXQnbGwgY29ycmVjdGx5IHJlcmVuZGVyLlxuICAgICAgICAgIGlmIChtb2R1bGUuX2RlcGVuZGVuY3lCbG9jaykge1xuICAgICAgICAgICAgZi5kZXBlbmRlbmN5QmxvY2sgPSBtb2R1bGUuX2RlcGVuZGVuY3lCbG9jaztcbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIGY7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gZnJvemVuO1xuICAgICAgfSxcbiAgICApO1xuXG4gICAgcGx1Z2luQ29tcGF0LnRhcChcbiAgICAgIGNvbXBpbGVyLFxuICAgICAgJ19oYXJkU291cmNlVGhhd01vZHVsZScsXG4gICAgICAnVHJhbnNmb3JtTm9ybWFsTW9kdWxlUGx1Z2luIHRoYXcnLFxuICAgICAgKG1vZHVsZSwgZnJvemVuLCB7IGNvbXBpbGF0aW9uLCBub3JtYWxNb2R1bGVGYWN0b3J5IH0pID0+IHtcbiAgICAgICAgaWYgKGZyb3plbi50eXBlID09PSAnTm9ybWFsTW9kdWxlJykge1xuICAgICAgICAgIGNvbnN0IG0gPSBzZXJpYWxOb3JtYWxNb2R1bGUudGhhdyhcbiAgICAgICAgICAgIG51bGwsXG4gICAgICAgICAgICBmcm96ZW4sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIHN0YXRlOiB7IGltcG9ydHM6IHt9IH0sXG4gICAgICAgICAgICAgIGNvbXBpbGF0aW9uOiBjb21waWxhdGlvbixcbiAgICAgICAgICAgICAgbm9ybWFsTW9kdWxlRmFjdG9yeTogbm9ybWFsTW9kdWxlRmFjdG9yeSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBfbWV0aG9kcyxcbiAgICAgICAgICApO1xuXG4gICAgICAgICAgbS5jYWNoZUl0ZW0gPSBmcm96ZW47XG4gICAgICAgICAgbS5fX2hhcmRTb3VyY2VGaWxlTWQ1cyA9IGNvbXBpbGF0aW9uLl9faGFyZFNvdXJjZUZpbGVNZDVzO1xuICAgICAgICAgIG0uX19oYXJkU291cmNlQ2FjaGVkTWQ1cyA9IGNvbXBpbGF0aW9uLl9faGFyZFNvdXJjZUNhY2hlZE1kNXM7XG4gICAgICAgICAgbS5uZWVkUmVidWlsZCA9IG5lZWRSZWJ1aWxkO1xuXG4gICAgICAgICAgLy8gVW5idWlsZCBpZiB0aGVyZSBpcyBubyBjYWNoZS4gVGhlIG1vZHVsZSB3aWxsIGJlIHJlYnVpbHQuIE5vdFxuICAgICAgICAgIC8vIHVuYnVpbGRpbmcgd2lsbCBsZWFkIHRvIGRvdWJsZSBkZXBlbmRlbmNpZXMuXG4gICAgICAgICAgaWYgKHNjaGVtYSA9PT0gNCAmJiAhY29tcGlsYXRpb24uY2FjaGUpIHtcbiAgICAgICAgICAgIG0udW5idWlsZCgpO1xuICAgICAgICAgIH1cbiAgICAgICAgICAvLyBTaWRlIGxvYWQgaW50byB0aGUgY2FjaGUgaWYgc29tZXRoaW5nIGZvciB0aGlzIGlkZW50aWZpZXIgaXNuJ3QgYWxyZWFkeVxuICAgICAgICAgIC8vIHRoZXJlLlxuICAgICAgICAgIGVsc2UgaWYgKFxuICAgICAgICAgICAgY29tcGlsYXRpb24uY2FjaGUgJiZcbiAgICAgICAgICAgICFjb21waWxhdGlvbi5jYWNoZVtgbSR7bS5pZGVudGlmaWVyKCl9YF1cbiAgICAgICAgICApIHtcbiAgICAgICAgICAgIGNvbXBpbGF0aW9uLmNhY2hlW2BtJHttLmlkZW50aWZpZXIoKX1gXSA9IG07XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgcmV0dXJuIG07XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG1vZHVsZTtcbiAgICAgIH0sXG4gICAgKTtcbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFRyYW5zZm9ybU5vcm1hbE1vZHVsZVBsdWdpbjtcbiJdLCJzb3VyY2VSb290IjoiL1VzZXJzL3R5bGVyYXJidXMvZGV2L3Byb3ZpZGVyL3NyYyJ9

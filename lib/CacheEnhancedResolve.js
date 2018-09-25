'use strict';

const path = require('path');

const lodash = require('lodash');
const nodeObjectHash = require('node-object-hash');

const pluginCompat = require('./util/plugin-compat');
const promisify = require('./util/promisify');
const relateContext = require('./util/relate-context');
const serial = require('./util/serial');
const values = require('./util/Object.values');
const bulkFsTask = require('./util/bulk-fs-task');
const { parityCacheFromCache, pushParityWriteOps } = require('./util/parity');
const parseJson = require('./util/parseJson');

const serialNormalResolved = serial.created({
  result: serial.path,
  resourceResolveData: serial.objectAssign({
    context: serial.created({
      issuer: serial.request,
      resolveOptions: serial.identity
    }),
    path: serial.path,
    descriptionFilePath: serial.path,
    descriptionFileRoot: serial.path
  })
});

class EnhancedResolveCache {
  apply(compiler) {
    let missingCacheSerializer;
    let resolverCacheSerializer;

    let missingCache = { normal: {}, loader: {}, context: {} };
    let resolverCache = { normal: {}, loader: {}, context: {} };
    let parityCache = {};

    const compilerHooks = pluginCompat.hooks(compiler);

    compilerHooks._hardSourceCreateSerializer.tap('HardSource - EnhancedResolveCache', (cacheSerializerFactory, cacheDirPath) => {
      missingCacheSerializer = cacheSerializerFactory.create({
        name: 'missing-resolve',
        type: 'data',
        autoParse: true,
        cacheDirPath
      });
      resolverCacheSerializer = cacheSerializerFactory.create({
        name: 'resolver',
        type: 'data',
        autoParse: true,
        cacheDirPath
      });
    });

    compilerHooks._hardSourceResetCache.tap('HardSource - EnhancedResolveCache', () => {
      missingCache = { normal: {}, loader: {}, context: {} };
      resolverCache = { normal: {}, loader: {}, context: {} };
      parityCache = {};

      compiler.__hardSource_missingCache = missingCache;
    });

    compilerHooks._hardSourceReadCache.tapPromise('HardSource - EnhancedResolveCache', ({ contextNormalPath, contextNormalRequest }) => {
      return Promise.all([missingCacheSerializer.read().then(_missingCache => {
        missingCache = { normal: {}, loader: {}, context: {} };

        compiler.__hardSource_missingCache = missingCache;

        function contextNormalMissingKey(compiler, key) {
          const parsed = parseJson(key);
          return JSON.stringify([contextNormalPath(compiler, parsed[0]), contextNormalPath(compiler, parsed[1])]);
        }

        function contextNormalMissing(compiler, missing) {
          return missing.map(missed => contextNormalRequest(compiler, missed));
        }

        Object.keys(_missingCache).forEach(key => {
          let item = _missingCache[key];
          if (typeof item === 'string') {
            item = parseJson(item);
          }
          const splitIndex = key.indexOf('/');
          const group = key.substring(0, splitIndex);
          const keyName = contextNormalMissingKey(compiler, key.substring(splitIndex + 1));
          missingCache[group] = missingCache[group] || {};
          missingCache[group][keyName] = contextNormalMissing(compiler, item);
        });
      }), resolverCacheSerializer.read().then(_resolverCache => {
        resolverCache = { normal: {}, loader: {}, context: {} };
        parityCache = {};

        function contextNormalResolvedKey(compiler, key) {
          const parsed = parseJson(key);
          return JSON.stringify([contextNormalPath(compiler, parsed[0]), parsed[1]]);
        }

        function contextNormalResolved(compiler, resolved) {
          return serialNormalResolved.thaw(resolved, resolved, {
            compiler
          });
        }

        Object.keys(_resolverCache).forEach(key => {
          let item = _resolverCache[key];
          if (typeof item === 'string') {
            item = parseJson(item);
          }
          if (key.startsWith('__hardSource_parityToken')) {
            parityCache[key] = item;
            return;
          }
          const splitIndex = key.indexOf('/');
          const group = key.substring(0, splitIndex);
          const keyName = contextNormalResolvedKey(compiler, key.substring(splitIndex + 1));
          resolverCache[group] = resolverCache[group] || {};
          resolverCache[group][keyName] = contextNormalResolved(compiler, item);
        });
      })]);
    });

    compilerHooks._hardSourceParityCache.tap('HardSource - EnhancedResolveCache', parityRoot => {
      parityCacheFromCache('EnhancedResolve', parityRoot, parityCache);
    });

    let missingVerifyResolve;
    compiler.__hardSource_missingVerify = new Promise(resolve => {
      missingVerifyResolve = resolve;
    });

    compilerHooks._hardSourceVerifyCache.tapPromise('HardSource - EnhancedResolveCache', () => (() => {
      compiler.__hardSource_missingVerify = new Promise(resolve => {
        missingVerifyResolve = resolve;
      });

      const bulk = lodash.flatten(Object.keys(missingCache).map(group => lodash.flatten(Object.keys(missingCache[group]).map(key => {
        const missingItem = missingCache[group][key];
        if (!missingItem) {
          return;
        }
        return missingItem.map((missed, index) => [group, key, missed, index]);
      }).filter(Boolean))));

      return bulkFsTask(bulk, (item, task) => {
        const group = item[0];
        const key = item[1];
        const missingItem = missingCache[group][key];
        const missed = item[2];
        const missedPath = missed.split('?')[0];
        const missedIndex = item[3];

        // The missed index is the resolved item. Invalidate if it does not
        // exist.
        if (missedIndex === missingItem.length - 1) {
          compiler.inputFileSystem.stat(missed, task((err, stat) => {
            if (err) {
              missingItem.invalid = true;
              missingItem.invalidReason = 'resolved now missing';
            }
          }));
        } else {
          compiler.inputFileSystem.stat(missed, task((err, stat) => {
            if (err) {
              return;
            }

            if (stat.isDirectory()) {
              if (group === 'context') {
                missingItem.invalid = true;
              }
            }
            if (stat.isFile()) {
              if (group === 'loader' || group.startsWith('normal')) {
                missingItem.invalid = true;
                missingItem.invalidReason = 'missing now found';
              }
            }
          }));
        }
      });
    })().then(missingVerifyResolve));

    function bindResolvers() {
      function configureMissing(key, resolver) {
        // missingCache[key] = missingCache[key] || {};
        // resolverCache[key] = resolverCache[key] || {};

        const _resolve = resolver.resolve;
        resolver.resolve = function (info, context, request, cb, cb2) {
          let numArgs = 4;
          if (!cb) {
            numArgs = 3;
            cb = request;
            request = context;
            context = info;
          }
          let resolveContext;
          if (cb2) {
            numArgs = 5;
            resolveContext = cb;
            cb = cb2;
          }

          if (info && info.resolveOptions) {
            key = `normal-${new nodeObjectHash({ sort: false }).hash(info.resolveOptions)}`;
            resolverCache[key] = resolverCache[key] || {};
            missingCache[key] = missingCache[key] || {};
          }

          const resolveId = JSON.stringify([context, request]);
          const absResolveId = JSON.stringify([context, relateContext.relateAbsolutePath(context, request)]);
          const resolve = resolverCache[key][resolveId] || resolverCache[key][absResolveId];
          if (resolve && !resolve.invalid) {
            const missingId = JSON.stringify([context, resolve.result]);
            const missing = missingCache[key][missingId];
            if (missing && !missing.invalid) {
              return cb(null, [resolve.result].concat(request.split('?').slice(1)).join('?'), resolve.resourceResolveData);
            } else {
              resolve.invalid = true;
              resolve.invalidReason = 'out of date';
            }
          }
          let localMissing = [];
          const callback = (err, result, result2) => {
            if (result) {
              const inverseId = JSON.stringify([context, result.split('?')[0]]);
              const resolveId = JSON.stringify([context, request]);

              // Skip recording missing for any dependency in node_modules.
              // Changes to them will be handled by the environment hash. If we
              // tracked the stuff in node_modules too, we'd be adding a whole
              // bunch of reduntant work.
              if (result.includes('node_modules')) {
                localMissing = localMissing.filter(missed => !missed.includes('node_modules'));
              }

              // In case of other cache layers, if we already have missing
              // recorded and we get a new empty array of missing, keep the old
              // value.
              if (localMissing.length === 0 && missingCache[key][inverseId]) {
                return cb(err, result, result2);
              }

              missingCache[key][inverseId] = localMissing.filter((missed, missedIndex) => {
                const index = localMissing.indexOf(missed);
                if (index === -1 || index < missedIndex) {
                  return false;
                }
                if (missed === result) {
                  return false;
                }
                return true;
              }).concat(result.split('?')[0]);
              missingCache[key][inverseId].new = true;
              resolverCache[key][resolveId] = {
                result: result.split('?')[0],
                resourceResolveData: result2,
                new: true
              };
            }
            cb(err, result, result2);
          };
          const _missing = cb.missing || resolveContext && resolveContext.missing;
          if (_missing) {
            callback.missing = {
              push(path) {
                localMissing.push(path);
                _missing.push(path);
              },
              add(path) {
                localMissing.push(path);
                _missing.add(path);
              }
            };
            if (resolveContext) {
              resolveContext.missing = callback.missing;
            }
          } else {
            callback.missing = Object.assign(localMissing, {
              add(path) {
                localMissing.push(path);
              }
            });
            if (resolveContext) {
              resolveContext.missing = callback.missing;
            }
          }

          if (numArgs === 3) {
            _resolve.call(this, context, request, callback);
          } else if (numArgs === 5) {
            _resolve.call(this, info, context, request, resolveContext, callback);
          } else {
            _resolve.call(this, info, context, request, callback);
          }
        };
      }

      if (compiler.resolverFactory) {
        compiler.resolverFactory.hooks.resolver.for('normal').tap('HardSource resolve cache', (resolver, options) => {
          const normalCacheId = `normal-${new nodeObjectHash({
            sort: false
          }).hash(Object.assign({}, options, { fileSystem: null }))}`;
          resolverCache[normalCacheId] = resolverCache[normalCacheId] || {};
          missingCache[normalCacheId] = missingCache[normalCacheId] || {};
          configureMissing(normalCacheId, resolver);
          return resolver;
        });
        compiler.resolverFactory.hooks.resolver.for('loader').tap('HardSource resolve cache', resolver => {
          configureMissing('loader', resolver);
          return resolver;
        });
        compiler.resolverFactory.hooks.resolver.for('context').tap('HardSource resolve cache', resolver => {
          configureMissing('context', resolver);
          return resolver;
        });
      } else {
        configureMissing('normal', compiler.resolvers.normal);
        configureMissing('loader', compiler.resolvers.loader);
        configureMissing('context', compiler.resolvers.context);
      }
    }

    compilerHooks.afterPlugins.tap('HardSource - EnhancedResolveCache', () => {
      if (compiler.resolvers.normal) {
        bindResolvers();
      } else {
        compilerHooks.afterResolvers.tap('HardSource - EnhancedResolveCache', bindResolvers);
      }
    });

    compilerHooks._hardSourceWriteCache.tapPromise('HardSource - EnhancedResolveCache', (compilation, { relateNormalPath, relateNormalRequest }) => {
      if (compilation.compiler.parentCompilation) {
        const resolverOps = [];
        pushParityWriteOps(compilation, resolverOps);

        return resolverCacheSerializer.write(resolverOps);
      }

      const missingOps = [];
      const resolverOps = [];

      function relateNormalMissingKey(compiler, key) {
        const parsed = parseJson(key);
        return JSON.stringify([relateNormalPath(compiler, parsed[0]), relateNormalPath(compiler, parsed[1])]);
      }

      function relateNormalMissing(compiler, missing) {
        return missing.map(missed => relateNormalRequest(compiler, missed));
      }

      Object.keys(missingCache).forEach(group => {
        Object.keys(missingCache[group]).forEach(key => {
          if (!missingCache[group][key]) {
            return;
          }
          if (missingCache[group][key].new) {
            missingCache[group][key].new = false;
            missingOps.push({
              key: `${group}/${relateNormalMissingKey(compiler, key)}`,
              value: JSON.stringify(relateNormalMissing(compiler, missingCache[group][key]))
            });
          } else if (missingCache[group][key].invalid) {
            missingCache[group][key] = null;
            missingOps.push({
              key: `${group}/${relateNormalMissingKey(compiler, key)}`,
              value: null
            });
          }
        });
      });

      function relateNormalResolvedKey(compiler, key) {
        const parsed = parseJson(key);
        return JSON.stringify([relateNormalPath(compiler, parsed[0]), relateContext.relateAbsolutePath(parsed[0], parsed[1])]);
      }

      function relateNormalResolved(compiler, resolved) {
        return serialNormalResolved.freeze(resolved, resolved, {
          compiler
        });
      }

      Object.keys(resolverCache).forEach(group => {
        Object.keys(resolverCache[group]).forEach(key => {
          if (!resolverCache[group][key]) {
            return;
          }
          if (resolverCache[group][key].new) {
            resolverCache[group][key].new = false;
            resolverOps.push({
              key: `${group}/${relateNormalResolvedKey(compiler, key)}`,
              value: JSON.stringify(relateNormalResolved(compiler, resolverCache[group][key]))
            });
          } else if (resolverCache[group][key].invalid) {
            resolverCache[group][key] = null;
            resolverOps.push({
              key: `${group}/${relateNormalResolvedKey(compiler, key)}`,
              value: null
            });
          }
        });
      });

      pushParityWriteOps(compilation, resolverOps);

      return Promise.all([missingCacheSerializer.write(missingOps), resolverCacheSerializer.write(resolverOps)]);
    });
  }
}

module.exports = EnhancedResolveCache;
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImhhcmQtc291cmNlLXdlYnBhY2stcGx1Z2luL2xpYi9DYWNoZUVuaGFuY2VkUmVzb2x2ZS5qcyJdLCJuYW1lcyI6WyJwYXRoIiwicmVxdWlyZSIsImxvZGFzaCIsIm5vZGVPYmplY3RIYXNoIiwicGx1Z2luQ29tcGF0IiwicHJvbWlzaWZ5IiwicmVsYXRlQ29udGV4dCIsInNlcmlhbCIsInZhbHVlcyIsImJ1bGtGc1Rhc2siLCJwYXJpdHlDYWNoZUZyb21DYWNoZSIsInB1c2hQYXJpdHlXcml0ZU9wcyIsInBhcnNlSnNvbiIsInNlcmlhbE5vcm1hbFJlc29sdmVkIiwiY3JlYXRlZCIsInJlc3VsdCIsInJlc291cmNlUmVzb2x2ZURhdGEiLCJvYmplY3RBc3NpZ24iLCJjb250ZXh0IiwiaXNzdWVyIiwicmVxdWVzdCIsInJlc29sdmVPcHRpb25zIiwiaWRlbnRpdHkiLCJkZXNjcmlwdGlvbkZpbGVQYXRoIiwiZGVzY3JpcHRpb25GaWxlUm9vdCIsIkVuaGFuY2VkUmVzb2x2ZUNhY2hlIiwiYXBwbHkiLCJjb21waWxlciIsIm1pc3NpbmdDYWNoZVNlcmlhbGl6ZXIiLCJyZXNvbHZlckNhY2hlU2VyaWFsaXplciIsIm1pc3NpbmdDYWNoZSIsIm5vcm1hbCIsImxvYWRlciIsInJlc29sdmVyQ2FjaGUiLCJwYXJpdHlDYWNoZSIsImNvbXBpbGVySG9va3MiLCJob29rcyIsIl9oYXJkU291cmNlQ3JlYXRlU2VyaWFsaXplciIsInRhcCIsImNhY2hlU2VyaWFsaXplckZhY3RvcnkiLCJjYWNoZURpclBhdGgiLCJjcmVhdGUiLCJuYW1lIiwidHlwZSIsImF1dG9QYXJzZSIsIl9oYXJkU291cmNlUmVzZXRDYWNoZSIsIl9faGFyZFNvdXJjZV9taXNzaW5nQ2FjaGUiLCJfaGFyZFNvdXJjZVJlYWRDYWNoZSIsInRhcFByb21pc2UiLCJjb250ZXh0Tm9ybWFsUGF0aCIsImNvbnRleHROb3JtYWxSZXF1ZXN0IiwiUHJvbWlzZSIsImFsbCIsInJlYWQiLCJ0aGVuIiwiX21pc3NpbmdDYWNoZSIsImNvbnRleHROb3JtYWxNaXNzaW5nS2V5Iiwia2V5IiwicGFyc2VkIiwiSlNPTiIsInN0cmluZ2lmeSIsImNvbnRleHROb3JtYWxNaXNzaW5nIiwibWlzc2luZyIsIm1hcCIsIm1pc3NlZCIsIk9iamVjdCIsImtleXMiLCJmb3JFYWNoIiwiaXRlbSIsInNwbGl0SW5kZXgiLCJpbmRleE9mIiwiZ3JvdXAiLCJzdWJzdHJpbmciLCJrZXlOYW1lIiwiX3Jlc29sdmVyQ2FjaGUiLCJjb250ZXh0Tm9ybWFsUmVzb2x2ZWRLZXkiLCJjb250ZXh0Tm9ybWFsUmVzb2x2ZWQiLCJyZXNvbHZlZCIsInRoYXciLCJzdGFydHNXaXRoIiwiX2hhcmRTb3VyY2VQYXJpdHlDYWNoZSIsInBhcml0eVJvb3QiLCJtaXNzaW5nVmVyaWZ5UmVzb2x2ZSIsIl9faGFyZFNvdXJjZV9taXNzaW5nVmVyaWZ5IiwicmVzb2x2ZSIsIl9oYXJkU291cmNlVmVyaWZ5Q2FjaGUiLCJidWxrIiwiZmxhdHRlbiIsIm1pc3NpbmdJdGVtIiwiaW5kZXgiLCJmaWx0ZXIiLCJCb29sZWFuIiwidGFzayIsIm1pc3NlZFBhdGgiLCJzcGxpdCIsIm1pc3NlZEluZGV4IiwibGVuZ3RoIiwiaW5wdXRGaWxlU3lzdGVtIiwic3RhdCIsImVyciIsImludmFsaWQiLCJpbnZhbGlkUmVhc29uIiwiaXNEaXJlY3RvcnkiLCJpc0ZpbGUiLCJiaW5kUmVzb2x2ZXJzIiwiY29uZmlndXJlTWlzc2luZyIsInJlc29sdmVyIiwiX3Jlc29sdmUiLCJpbmZvIiwiY2IiLCJjYjIiLCJudW1BcmdzIiwicmVzb2x2ZUNvbnRleHQiLCJzb3J0IiwiaGFzaCIsInJlc29sdmVJZCIsImFic1Jlc29sdmVJZCIsInJlbGF0ZUFic29sdXRlUGF0aCIsIm1pc3NpbmdJZCIsImNvbmNhdCIsInNsaWNlIiwiam9pbiIsImxvY2FsTWlzc2luZyIsImNhbGxiYWNrIiwicmVzdWx0MiIsImludmVyc2VJZCIsImluY2x1ZGVzIiwibmV3IiwiX21pc3NpbmciLCJwdXNoIiwiYWRkIiwiYXNzaWduIiwiY2FsbCIsInJlc29sdmVyRmFjdG9yeSIsImZvciIsIm9wdGlvbnMiLCJub3JtYWxDYWNoZUlkIiwiZmlsZVN5c3RlbSIsInJlc29sdmVycyIsImFmdGVyUGx1Z2lucyIsImFmdGVyUmVzb2x2ZXJzIiwiX2hhcmRTb3VyY2VXcml0ZUNhY2hlIiwiY29tcGlsYXRpb24iLCJyZWxhdGVOb3JtYWxQYXRoIiwicmVsYXRlTm9ybWFsUmVxdWVzdCIsInBhcmVudENvbXBpbGF0aW9uIiwicmVzb2x2ZXJPcHMiLCJ3cml0ZSIsIm1pc3NpbmdPcHMiLCJyZWxhdGVOb3JtYWxNaXNzaW5nS2V5IiwicmVsYXRlTm9ybWFsTWlzc2luZyIsInZhbHVlIiwicmVsYXRlTm9ybWFsUmVzb2x2ZWRLZXkiLCJyZWxhdGVOb3JtYWxSZXNvbHZlZCIsImZyZWV6ZSIsIm1vZHVsZSIsImV4cG9ydHMiXSwibWFwcGluZ3MiOiI7O0FBQUEsTUFBTUEsT0FBT0MsUUFBUSxNQUFSLENBQWI7O0FBRUEsTUFBTUMsU0FBU0QsUUFBUSxRQUFSLENBQWY7QUFDQSxNQUFNRSxpQkFBaUJGLFFBQVEsa0JBQVIsQ0FBdkI7O0FBRUEsTUFBTUcsZUFBZUgsK0JBQXJCO0FBQ0EsTUFBTUksWUFBWUosMkJBQWxCO0FBQ0EsTUFBTUssZ0JBQWdCTCxnQ0FBdEI7QUFDQSxNQUFNTSxTQUFTTix3QkFBZjtBQUNBLE1BQU1PLFNBQVNQLCtCQUFmO0FBQ0EsTUFBTVEsYUFBYVIsOEJBQW5CO0FBQ0EsTUFBTSxFQUFFUyxvQkFBRixFQUF3QkMsa0JBQXhCLEtBQStDVix3QkFBckQ7QUFDQSxNQUFNVyxZQUFZWCwyQkFBbEI7O0FBRUEsTUFBTVksdUJBQXVCTixPQUFPTyxPQUFQLENBQWU7QUFDMUNDLFVBQVFSLE9BQU9QLElBRDJCO0FBRTFDZ0IsdUJBQXFCVCxPQUFPVSxZQUFQLENBQW9CO0FBQ3ZDQyxhQUFTWCxPQUFPTyxPQUFQLENBQWU7QUFDdEJLLGNBQVFaLE9BQU9hLE9BRE87QUFFdEJDLHNCQUFnQmQsT0FBT2U7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O0FBRUEsYUFBTy9GLFFBQVFDLEdBQVIsQ0FBWSxDQUNqQnhCLHVCQUF1QnVILEtBQXZCLENBQTZCQyxVQUE3QixDQURpQixFQUVqQnZILHdCQUF3QnNILEtBQXhCLENBQThCRCxXQUE5QixDQUZpQixDQUFaLENBQVA7QUFJRCxLQTNGSDtBQTZGRDtBQXRld0I7O0FBeWUzQlMsT0FBT0MsT0FBUCxHQUFpQm5JLG9CQUFqQiIsImZpbGUiOiJoYXJkLXNvdXJjZS13ZWJwYWNrLXBsdWdpbi9saWIvQ2FjaGVFbmhhbmNlZFJlc29sdmUuanMiLCJzb3VyY2VzQ29udGVudCI6WyJjb25zdCBwYXRoID0gcmVxdWlyZSgncGF0aCcpO1xuXG5jb25zdCBsb2Rhc2ggPSByZXF1aXJlKCdsb2Rhc2gnKTtcbmNvbnN0IG5vZGVPYmplY3RIYXNoID0gcmVxdWlyZSgnbm9kZS1vYmplY3QtaGFzaCcpO1xuXG5jb25zdCBwbHVnaW5Db21wYXQgPSByZXF1aXJlKCcuL3V0aWwvcGx1Z2luLWNvbXBhdCcpO1xuY29uc3QgcHJvbWlzaWZ5ID0gcmVxdWlyZSgnLi91dGlsL3Byb21pc2lmeScpO1xuY29uc3QgcmVsYXRlQ29udGV4dCA9IHJlcXVpcmUoJy4vdXRpbC9yZWxhdGUtY29udGV4dCcpO1xuY29uc3Qgc2VyaWFsID0gcmVxdWlyZSgnLi91dGlsL3NlcmlhbCcpO1xuY29uc3QgdmFsdWVzID0gcmVxdWlyZSgnLi91dGlsL09iamVjdC52YWx1ZXMnKTtcbmNvbnN0IGJ1bGtGc1Rhc2sgPSByZXF1aXJlKCcuL3V0aWwvYnVsay1mcy10YXNrJyk7XG5jb25zdCB7IHBhcml0eUNhY2hlRnJvbUNhY2hlLCBwdXNoUGFyaXR5V3JpdGVPcHMgfSA9IHJlcXVpcmUoJy4vdXRpbC9wYXJpdHknKTtcbmNvbnN0IHBhcnNlSnNvbiA9IHJlcXVpcmUoJy4vdXRpbC9wYXJzZUpzb24nKTtcblxuY29uc3Qgc2VyaWFsTm9ybWFsUmVzb2x2ZWQgPSBzZXJpYWwuY3JlYXRlZCh7XG4gIHJlc3VsdDogc2VyaWFsLnBhdGgsXG4gIHJlc291cmNlUmVzb2x2ZURhdGE6IHNlcmlhbC5vYmplY3RBc3NpZ24oe1xuICAgIGNvbnRleHQ6IHNlcmlhbC5jcmVhdGVkKHtcbiAgICAgIGlzc3Vlcjogc2VyaWFsLnJlcXVlc3QsXG4gICAgICByZXNvbHZlT3B0aW9uczogc2VyaWFsLmlkZW50aXR5LFxuICAgIH0pLFxuICAgIHBhdGg6IHNlcmlhbC5wYXRoLFxuICAgIGRlc2NyaXB0aW9uRmlsZVBhdGg6IHNlcmlhbC5wYXRoLFxuICAgIGRlc2NyaXB0aW9uRmlsZVJvb3Q6IHNlcmlhbC5wYXRoLFxuICB9KSxcbn0pO1xuXG5jbGFzcyBFbmhhbmNlZFJlc29sdmVDYWNoZSB7XG4gIGFwcGx5KGNvbXBpbGVyKSB7XG4gICAgbGV0IG1pc3NpbmdDYWNoZVNlcmlhbGl6ZXI7XG4gICAgbGV0IHJlc29sdmVyQ2FjaGVTZXJpYWxpemVyO1xuXG4gICAgbGV0IG1pc3NpbmdDYWNoZSA9IHsgbm9ybWFsOiB7fSwgbG9hZGVyOiB7fSwgY29udGV4dDoge30gfTtcbiAgICBsZXQgcmVzb2x2ZXJDYWNoZSA9IHsgbm9ybWFsOiB7fSwgbG9hZGVyOiB7fSwgY29udGV4dDoge30gfTtcbiAgICBsZXQgcGFyaXR5Q2FjaGUgPSB7fTtcblxuICAgIGNvbnN0IGNvbXBpbGVySG9va3MgPSBwbHVnaW5Db21wYXQuaG9va3MoY29tcGlsZXIpO1xuXG4gICAgY29tcGlsZXJIb29rcy5faGFyZFNvdXJjZUNyZWF0ZVNlcmlhbGl6ZXIudGFwKFxuICAgICAgJ0hhcmRTb3VyY2UgLSBFbmhhbmNlZFJlc29sdmVDYWNoZScsXG4gICAgICAoY2FjaGVTZXJpYWxpemVyRmFjdG9yeSwgY2FjaGVEaXJQYXRoKSA9PiB7XG4gICAgICAgIG1pc3NpbmdDYWNoZVNlcmlhbGl6ZXIgPSBjYWNoZVNlcmlhbGl6ZXJGYWN0b3J5LmNyZWF0ZSh7XG4gICAgICAgICAgbmFtZTogJ21pc3NpbmctcmVzb2x2ZScsXG4gICAgICAgICAgdHlwZTogJ2RhdGEnLFxuICAgICAgICAgIGF1dG9QYXJzZTogdHJ1ZSxcbiAgICAgICAgICBjYWNoZURpclBhdGgsXG4gICAgICAgIH0pO1xuICAgICAgICByZXNvbHZlckNhY2hlU2VyaWFsaXplciA9IGNhY2hlU2VyaWFsaXplckZhY3RvcnkuY3JlYXRlKHtcbiAgICAgICAgICBuYW1lOiAncmVzb2x2ZXInLFxuICAgICAgICAgIHR5cGU6ICdkYXRhJyxcbiAgICAgICAgICBhdXRvUGFyc2U6IHRydWUsXG4gICAgICAgICAgY2FjaGVEaXJQYXRoLFxuICAgICAgICB9KTtcbiAgICAgIH0sXG4gICAgKTtcblxuICAgIGNvbXBpbGVySG9va3MuX2hhcmRTb3VyY2VSZXNldENhY2hlLnRhcChcbiAgICAgICdIYXJkU291cmNlIC0gRW5oYW5jZWRSZXNvbHZlQ2FjaGUnLFxuICAgICAgKCkgPT4ge1xuICAgICAgICBtaXNzaW5nQ2FjaGUgPSB7IG5vcm1hbDoge30sIGxvYWRlcjoge30sIGNvbnRleHQ6IHt9IH07XG4gICAgICAgIHJlc29sdmVyQ2FjaGUgPSB7IG5vcm1hbDoge30sIGxvYWRlcjoge30sIGNvbnRleHQ6IHt9IH07XG4gICAgICAgIHBhcml0eUNhY2hlID0ge307XG5cbiAgICAgICAgY29tcGlsZXIuX19oYXJkU291cmNlX21pc3NpbmdDYWNoZSA9IG1pc3NpbmdDYWNoZTtcbiAgICAgIH0sXG4gICAgKTtcblxuICAgIGNvbXBpbGVySG9va3MuX2hhcmRTb3VyY2VSZWFkQ2FjaGUudGFwUHJvbWlzZShcbiAgICAgICdIYXJkU291cmNlIC0gRW5oYW5jZWRSZXNvbHZlQ2FjaGUnLFxuICAgICAgKHsgY29udGV4dE5vcm1hbFBhdGgsIGNvbnRleHROb3JtYWxSZXF1ZXN0IH0pID0+IHtcbiAgICAgICAgcmV0dXJuIFByb21pc2UuYWxsKFtcbiAgICAgICAgICBtaXNzaW5nQ2FjaGVTZXJpYWxpemVyLnJlYWQoKS50aGVuKF9taXNzaW5nQ2FjaGUgPT4ge1xuICAgICAgICAgICAgbWlzc2luZ0NhY2hlID0geyBub3JtYWw6IHt9LCBsb2FkZXI6IHt9LCBjb250ZXh0OiB7fSB9O1xuXG4gICAgICAgICAgICBjb21waWxlci5fX2hhcmRTb3VyY2VfbWlzc2luZ0NhY2hlID0gbWlzc2luZ0NhY2hlO1xuXG4gICAgICAgICAgICBmdW5jdGlvbiBjb250ZXh0Tm9ybWFsTWlzc2luZ0tleShjb21waWxlciwga2V5KSB7XG4gICAgICAgICAgICAgIGNvbnN0IHBhcnNlZCA9IHBhcnNlSnNvbihrZXkpO1xuICAgICAgICAgICAgICByZXR1cm4gSlNPTi5zdHJpbmdpZnkoW1xuICAgICAgICAgICAgICAgIGNvbnRleHROb3JtYWxQYXRoKGNvbXBpbGVyLCBwYXJzZWRbMF0pLFxuICAgICAgICAgICAgICAgIGNvbnRleHROb3JtYWxQYXRoKGNvbXBpbGVyLCBwYXJzZWRbMV0pLFxuICAgICAgICAgICAgICBdKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgZnVuY3Rpb24gY29udGV4dE5vcm1hbE1pc3NpbmcoY29tcGlsZXIsIG1pc3NpbmcpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIG1pc3NpbmcubWFwKG1pc3NlZCA9PlxuICAgICAgICAgICAgICAgIGNvbnRleHROb3JtYWxSZXF1ZXN0KGNvbXBpbGVyLCBtaXNzZWQpLFxuICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBPYmplY3Qua2V5cyhfbWlzc2luZ0NhY2hlKS5mb3JFYWNoKGtleSA9PiB7XG4gICAgICAgICAgICAgIGxldCBpdGVtID0gX21pc3NpbmdDYWNoZVtrZXldO1xuICAgICAgICAgICAgICBpZiAodHlwZW9mIGl0ZW0gPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICAgICAgaXRlbSA9IHBhcnNlSnNvbihpdGVtKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBjb25zdCBzcGxpdEluZGV4ID0ga2V5LmluZGV4T2YoJy8nKTtcbiAgICAgICAgICAgICAgY29uc3QgZ3JvdXAgPSBrZXkuc3Vic3RyaW5nKDAsIHNwbGl0SW5kZXgpO1xuICAgICAgICAgICAgICBjb25zdCBrZXlOYW1lID0gY29udGV4dE5vcm1hbE1pc3NpbmdLZXkoXG4gICAgICAgICAgICAgICAgY29tcGlsZXIsXG4gICAgICAgICAgICAgICAga2V5LnN1YnN0cmluZyhzcGxpdEluZGV4ICsgMSksXG4gICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgIG1pc3NpbmdDYWNoZVtncm91cF0gPSBtaXNzaW5nQ2FjaGVbZ3JvdXBdIHx8IHt9O1xuICAgICAgICAgICAgICBtaXNzaW5nQ2FjaGVbZ3JvdXBdW2tleU5hbWVdID0gY29udGV4dE5vcm1hbE1pc3NpbmcoXG4gICAgICAgICAgICAgICAgY29tcGlsZXIsXG4gICAgICAgICAgICAgICAgaXRlbSxcbiAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH0pLFxuXG4gICAgICAgICAgcmVzb2x2ZXJDYWNoZVNlcmlhbGl6ZXIucmVhZCgpLnRoZW4oX3Jlc29sdmVyQ2FjaGUgPT4ge1xuICAgICAgICAgICAgcmVzb2x2ZXJDYWNoZSA9IHsgbm9ybWFsOiB7fSwgbG9hZGVyOiB7fSwgY29udGV4dDoge30gfTtcbiAgICAgICAgICAgIHBhcml0eUNhY2hlID0ge307XG5cbiAgICAgICAgICAgIGZ1bmN0aW9uIGNvbnRleHROb3JtYWxSZXNvbHZlZEtleShjb21waWxlciwga2V5KSB7XG4gICAgICAgICAgICAgIGNvbnN0IHBhcnNlZCA9IHBhcnNlSnNvbihrZXkpO1xuICAgICAgICAgICAgICByZXR1cm4gSlNPTi5zdHJpbmdpZnkoW1xuICAgICAgICAgICAgICAgIGNvbnRleHROb3JtYWxQYXRoKGNvbXBpbGVyLCBwYXJzZWRbMF0pLFxuICAgICAgICAgICAgICAgIHBhcnNlZFsxXSxcbiAgICAgICAgICAgICAgXSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGZ1bmN0aW9uIGNvbnRleHROb3JtYWxSZXNvbHZlZChjb21waWxlciwgcmVzb2x2ZWQpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIHNlcmlhbE5vcm1hbFJlc29sdmVkLnRoYXcocmVzb2x2ZWQsIHJlc29sdmVkLCB7XG4gICAgICAgICAgICAgICAgY29tcGlsZXIsXG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBPYmplY3Qua2V5cyhfcmVzb2x2ZXJDYWNoZSkuZm9yRWFjaChrZXkgPT4ge1xuICAgICAgICAgICAgICBsZXQgaXRlbSA9IF9yZXNvbHZlckNhY2hlW2tleV07XG4gICAgICAgICAgICAgIGlmICh0eXBlb2YgaXRlbSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgICAgICBpdGVtID0gcGFyc2VKc29uKGl0ZW0pO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGlmIChrZXkuc3RhcnRzV2l0aCgnX19oYXJkU291cmNlX3Bhcml0eVRva2VuJykpIHtcbiAgICAgICAgICAgICAgICBwYXJpdHlDYWNoZVtrZXldID0gaXRlbTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgY29uc3Qgc3BsaXRJbmRleCA9IGtleS5pbmRleE9mKCcvJyk7XG4gICAgICAgICAgICAgIGNvbnN0IGdyb3VwID0ga2V5LnN1YnN0cmluZygwLCBzcGxpdEluZGV4KTtcbiAgICAgICAgICAgICAgY29uc3Qga2V5TmFtZSA9IGNvbnRleHROb3JtYWxSZXNvbHZlZEtleShcbiAgICAgICAgICAgICAgICBjb21waWxlcixcbiAgICAgICAgICAgICAgICBrZXkuc3Vic3RyaW5nKHNwbGl0SW5kZXggKyAxKSxcbiAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgcmVzb2x2ZXJDYWNoZVtncm91cF0gPSByZXNvbHZlckNhY2hlW2dyb3VwXSB8fCB7fTtcbiAgICAgICAgICAgICAgcmVzb2x2ZXJDYWNoZVtncm91cF1ba2V5TmFtZV0gPSBjb250ZXh0Tm9ybWFsUmVzb2x2ZWQoXG4gICAgICAgICAgICAgICAgY29tcGlsZXIsXG4gICAgICAgICAgICAgICAgaXRlbSxcbiAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH0pLFxuICAgICAgICBdKTtcbiAgICAgIH0sXG4gICAgKTtcblxuICAgIGNvbXBpbGVySG9va3MuX2hhcmRTb3VyY2VQYXJpdHlDYWNoZS50YXAoXG4gICAgICAnSGFyZFNvdXJjZSAtIEVuaGFuY2VkUmVzb2x2ZUNhY2hlJyxcbiAgICAgIHBhcml0eVJvb3QgPT4ge1xuICAgICAgICBwYXJpdHlDYWNoZUZyb21DYWNoZSgnRW5oYW5jZWRSZXNvbHZlJywgcGFyaXR5Um9vdCwgcGFyaXR5Q2FjaGUpO1xuICAgICAgfSxcbiAgICApO1xuXG4gICAgbGV0IG1pc3NpbmdWZXJpZnlSZXNvbHZlO1xuICAgIGNvbXBpbGVyLl9faGFyZFNvdXJjZV9taXNzaW5nVmVyaWZ5ID0gbmV3IFByb21pc2UocmVzb2x2ZSA9PiB7XG4gICAgICBtaXNzaW5nVmVyaWZ5UmVzb2x2ZSA9IHJlc29sdmU7XG4gICAgfSk7XG5cbiAgICBjb21waWxlckhvb2tzLl9oYXJkU291cmNlVmVyaWZ5Q2FjaGUudGFwUHJvbWlzZShcbiAgICAgICdIYXJkU291cmNlIC0gRW5oYW5jZWRSZXNvbHZlQ2FjaGUnLFxuICAgICAgKCkgPT5cbiAgICAgICAgKCgpID0+IHtcbiAgICAgICAgICBjb21waWxlci5fX2hhcmRTb3VyY2VfbWlzc2luZ1ZlcmlmeSA9IG5ldyBQcm9taXNlKHJlc29sdmUgPT4ge1xuICAgICAgICAgICAgbWlzc2luZ1ZlcmlmeVJlc29sdmUgPSByZXNvbHZlO1xuICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgY29uc3QgYnVsayA9IGxvZGFzaC5mbGF0dGVuKFxuICAgICAgICAgICAgT2JqZWN0LmtleXMobWlzc2luZ0NhY2hlKS5tYXAoZ3JvdXAgPT5cbiAgICAgICAgICAgICAgbG9kYXNoLmZsYXR0ZW4oXG4gICAgICAgICAgICAgICAgT2JqZWN0LmtleXMobWlzc2luZ0NhY2hlW2dyb3VwXSlcbiAgICAgICAgICAgICAgICAgIC5tYXAoa2V5ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbWlzc2luZ0l0ZW0gPSBtaXNzaW5nQ2FjaGVbZ3JvdXBdW2tleV07XG4gICAgICAgICAgICAgICAgICAgIGlmICghbWlzc2luZ0l0ZW0pIHtcbiAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG1pc3NpbmdJdGVtLm1hcCgobWlzc2VkLCBpbmRleCkgPT4gW1xuICAgICAgICAgICAgICAgICAgICAgIGdyb3VwLFxuICAgICAgICAgICAgICAgICAgICAgIGtleSxcbiAgICAgICAgICAgICAgICAgICAgICBtaXNzZWQsXG4gICAgICAgICAgICAgICAgICAgICAgaW5kZXgsXG4gICAgICAgICAgICAgICAgICAgIF0pO1xuICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgIC5maWx0ZXIoQm9vbGVhbiksXG4gICAgICAgICAgICAgICksXG4gICAgICAgICAgICApLFxuICAgICAgICAgICk7XG5cbiAgICAgICAgICByZXR1cm4gYnVsa0ZzVGFzayhidWxrLCAoaXRlbSwgdGFzaykgPT4ge1xuICAgICAgICAgICAgY29uc3QgZ3JvdXAgPSBpdGVtWzBdO1xuICAgICAgICAgICAgY29uc3Qga2V5ID0gaXRlbVsxXTtcbiAgICAgICAgICAgIGNvbnN0IG1pc3NpbmdJdGVtID0gbWlzc2luZ0NhY2hlW2dyb3VwXVtrZXldO1xuICAgICAgICAgICAgY29uc3QgbWlzc2VkID0gaXRlbVsyXTtcbiAgICAgICAgICAgIGNvbnN0IG1pc3NlZFBhdGggPSBtaXNzZWQuc3BsaXQoJz8nKVswXTtcbiAgICAgICAgICAgIGNvbnN0IG1pc3NlZEluZGV4ID0gaXRlbVszXTtcblxuICAgICAgICAgICAgLy8gVGhlIG1pc3NlZCBpbmRleCBpcyB0aGUgcmVzb2x2ZWQgaXRlbS4gSW52YWxpZGF0ZSBpZiBpdCBkb2VzIG5vdFxuICAgICAgICAgICAgLy8gZXhpc3QuXG4gICAgICAgICAgICBpZiAobWlzc2VkSW5kZXggPT09IG1pc3NpbmdJdGVtLmxlbmd0aCAtIDEpIHtcbiAgICAgICAgICAgICAgY29tcGlsZXIuaW5wdXRGaWxlU3lzdGVtLnN0YXQoXG4gICAgICAgICAgICAgICAgbWlzc2VkLFxuICAgICAgICAgICAgICAgIHRhc2soKGVyciwgc3RhdCkgPT4ge1xuICAgICAgICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgICAgICBtaXNzaW5nSXRlbS5pbnZhbGlkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgbWlzc2luZ0l0ZW0uaW52YWxpZFJlYXNvbiA9ICdyZXNvbHZlZCBub3cgbWlzc2luZyc7XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSksXG4gICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBjb21waWxlci5pbnB1dEZpbGVTeXN0ZW0uc3RhdChcbiAgICAgICAgICAgICAgICBtaXNzZWQsXG4gICAgICAgICAgICAgICAgdGFzaygoZXJyLCBzdGF0KSA9PiB7XG4gICAgICAgICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgaWYgKHN0YXQuaXNEaXJlY3RvcnkoKSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoZ3JvdXAgPT09ICdjb250ZXh0Jykge1xuICAgICAgICAgICAgICAgICAgICAgIG1pc3NpbmdJdGVtLmludmFsaWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICBpZiAoc3RhdC5pc0ZpbGUoKSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoZ3JvdXAgPT09ICdsb2FkZXInIHx8IGdyb3VwLnN0YXJ0c1dpdGgoJ25vcm1hbCcpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgbWlzc2luZ0l0ZW0uaW52YWxpZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgbWlzc2luZ0l0ZW0uaW52YWxpZFJlYXNvbiA9ICdtaXNzaW5nIG5vdyBmb3VuZCc7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KSxcbiAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KTtcbiAgICAgICAgfSkoKS50aGVuKG1pc3NpbmdWZXJpZnlSZXNvbHZlKSxcbiAgICApO1xuXG4gICAgZnVuY3Rpb24gYmluZFJlc29sdmVycygpIHtcbiAgICAgIGZ1bmN0aW9uIGNvbmZpZ3VyZU1pc3Npbmcoa2V5LCByZXNvbHZlcikge1xuICAgICAgICAvLyBtaXNzaW5nQ2FjaGVba2V5XSA9IG1pc3NpbmdDYWNoZVtrZXldIHx8IHt9O1xuICAgICAgICAvLyByZXNvbHZlckNhY2hlW2tleV0gPSByZXNvbHZlckNhY2hlW2tleV0gfHwge307XG5cbiAgICAgICAgY29uc3QgX3Jlc29sdmUgPSByZXNvbHZlci5yZXNvbHZlO1xuICAgICAgICByZXNvbHZlci5yZXNvbHZlID0gZnVuY3Rpb24oaW5mbywgY29udGV4dCwgcmVxdWVzdCwgY2IsIGNiMikge1xuICAgICAgICAgIGxldCBudW1BcmdzID0gNDtcbiAgICAgICAgICBpZiAoIWNiKSB7XG4gICAgICAgICAgICBudW1BcmdzID0gMztcbiAgICAgICAgICAgIGNiID0gcmVxdWVzdDtcbiAgICAgICAgICAgIHJlcXVlc3QgPSBjb250ZXh0O1xuICAgICAgICAgICAgY29udGV4dCA9IGluZm87XG4gICAgICAgICAgfVxuICAgICAgICAgIGxldCByZXNvbHZlQ29udGV4dDtcbiAgICAgICAgICBpZiAoY2IyKSB7XG4gICAgICAgICAgICBudW1BcmdzID0gNTtcbiAgICAgICAgICAgIHJlc29sdmVDb250ZXh0ID0gY2I7XG4gICAgICAgICAgICBjYiA9IGNiMjtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpZiAoaW5mbyAmJiBpbmZvLnJlc29sdmVPcHRpb25zKSB7XG4gICAgICAgICAgICBrZXkgPSBgbm9ybWFsLSR7bmV3IG5vZGVPYmplY3RIYXNoKHsgc29ydDogZmFsc2UgfSkuaGFzaChcbiAgICAgICAgICAgICAgaW5mby5yZXNvbHZlT3B0aW9ucyxcbiAgICAgICAgICAgICl9YDtcbiAgICAgICAgICAgIHJlc29sdmVyQ2FjaGVba2V5XSA9IHJlc29sdmVyQ2FjaGVba2V5XSB8fCB7fTtcbiAgICAgICAgICAgIG1pc3NpbmdDYWNoZVtrZXldID0gbWlzc2luZ0NhY2hlW2tleV0gfHwge307XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgY29uc3QgcmVzb2x2ZUlkID0gSlNPTi5zdHJpbmdpZnkoW2NvbnRleHQsIHJlcXVlc3RdKTtcbiAgICAgICAgICBjb25zdCBhYnNSZXNvbHZlSWQgPSBKU09OLnN0cmluZ2lmeShbXG4gICAgICAgICAgICBjb250ZXh0LFxuICAgICAgICAgICAgcmVsYXRlQ29udGV4dC5yZWxhdGVBYnNvbHV0ZVBhdGgoY29udGV4dCwgcmVxdWVzdCksXG4gICAgICAgICAgXSk7XG4gICAgICAgICAgY29uc3QgcmVzb2x2ZSA9XG4gICAgICAgICAgICByZXNvbHZlckNhY2hlW2tleV1bcmVzb2x2ZUlkXSB8fCByZXNvbHZlckNhY2hlW2tleV1bYWJzUmVzb2x2ZUlkXTtcbiAgICAgICAgICBpZiAocmVzb2x2ZSAmJiAhcmVzb2x2ZS5pbnZhbGlkKSB7XG4gICAgICAgICAgICBjb25zdCBtaXNzaW5nSWQgPSBKU09OLnN0cmluZ2lmeShbY29udGV4dCwgcmVzb2x2ZS5yZXN1bHRdKTtcbiAgICAgICAgICAgIGNvbnN0IG1pc3NpbmcgPSBtaXNzaW5nQ2FjaGVba2V5XVttaXNzaW5nSWRdO1xuICAgICAgICAgICAgaWYgKG1pc3NpbmcgJiYgIW1pc3NpbmcuaW52YWxpZCkge1xuICAgICAgICAgICAgICByZXR1cm4gY2IoXG4gICAgICAgICAgICAgICAgbnVsbCxcbiAgICAgICAgICAgICAgICBbcmVzb2x2ZS5yZXN1bHRdLmNvbmNhdChyZXF1ZXN0LnNwbGl0KCc/Jykuc2xpY2UoMSkpLmpvaW4oJz8nKSxcbiAgICAgICAgICAgICAgICByZXNvbHZlLnJlc291cmNlUmVzb2x2ZURhdGEsXG4gICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICByZXNvbHZlLmludmFsaWQgPSB0cnVlO1xuICAgICAgICAgICAgICByZXNvbHZlLmludmFsaWRSZWFzb24gPSAnb3V0IG9mIGRhdGUnO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBsZXQgbG9jYWxNaXNzaW5nID0gW107XG4gICAgICAgICAgY29uc3QgY2FsbGJhY2sgPSAoZXJyLCByZXN1bHQsIHJlc3VsdDIpID0+IHtcbiAgICAgICAgICAgIGlmIChyZXN1bHQpIHtcbiAgICAgICAgICAgICAgY29uc3QgaW52ZXJzZUlkID0gSlNPTi5zdHJpbmdpZnkoW2NvbnRleHQsIHJlc3VsdC5zcGxpdCgnPycpWzBdXSk7XG4gICAgICAgICAgICAgIGNvbnN0IHJlc29sdmVJZCA9IEpTT04uc3RyaW5naWZ5KFtjb250ZXh0LCByZXF1ZXN0XSk7XG5cbiAgICAgICAgICAgICAgLy8gU2tpcCByZWNvcmRpbmcgbWlzc2luZyBmb3IgYW55IGRlcGVuZGVuY3kgaW4gbm9kZV9tb2R1bGVzLlxuICAgICAgICAgICAgICAvLyBDaGFuZ2VzIHRvIHRoZW0gd2lsbCBiZSBoYW5kbGVkIGJ5IHRoZSBlbnZpcm9ubWVudCBoYXNoLiBJZiB3ZVxuICAgICAgICAgICAgICAvLyB0cmFja2VkIHRoZSBzdHVmZiBpbiBub2RlX21vZHVsZXMgdG9vLCB3ZSdkIGJlIGFkZGluZyBhIHdob2xlXG4gICAgICAgICAgICAgIC8vIGJ1bmNoIG9mIHJlZHVudGFudCB3b3JrLlxuICAgICAgICAgICAgICBpZiAocmVzdWx0LmluY2x1ZGVzKCdub2RlX21vZHVsZXMnKSkge1xuICAgICAgICAgICAgICAgIGxvY2FsTWlzc2luZyA9IGxvY2FsTWlzc2luZy5maWx0ZXIoXG4gICAgICAgICAgICAgICAgICBtaXNzZWQgPT4gIW1pc3NlZC5pbmNsdWRlcygnbm9kZV9tb2R1bGVzJyksXG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgIC8vIEluIGNhc2Ugb2Ygb3RoZXIgY2FjaGUgbGF5ZXJzLCBpZiB3ZSBhbHJlYWR5IGhhdmUgbWlzc2luZ1xuICAgICAgICAgICAgICAvLyByZWNvcmRlZCBhbmQgd2UgZ2V0IGEgbmV3IGVtcHR5IGFycmF5IG9mIG1pc3NpbmcsIGtlZXAgdGhlIG9sZFxuICAgICAgICAgICAgICAvLyB2YWx1ZS5cbiAgICAgICAgICAgICAgaWYgKGxvY2FsTWlzc2luZy5sZW5ndGggPT09IDAgJiYgbWlzc2luZ0NhY2hlW2tleV1baW52ZXJzZUlkXSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBjYihlcnIsIHJlc3VsdCwgcmVzdWx0Mik7XG4gICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICBtaXNzaW5nQ2FjaGVba2V5XVtpbnZlcnNlSWRdID0gbG9jYWxNaXNzaW5nXG4gICAgICAgICAgICAgICAgLmZpbHRlcigobWlzc2VkLCBtaXNzZWRJbmRleCkgPT4ge1xuICAgICAgICAgICAgICAgICAgY29uc3QgaW5kZXggPSBsb2NhbE1pc3NpbmcuaW5kZXhPZihtaXNzZWQpO1xuICAgICAgICAgICAgICAgICAgaWYgKGluZGV4ID09PSAtMSB8fCBpbmRleCA8IG1pc3NlZEluZGV4KSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIGlmIChtaXNzZWQgPT09IHJlc3VsdCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIC5jb25jYXQocmVzdWx0LnNwbGl0KCc/JylbMF0pO1xuICAgICAgICAgICAgICBtaXNzaW5nQ2FjaGVba2V5XVtpbnZlcnNlSWRdLm5ldyA9IHRydWU7XG4gICAgICAgICAgICAgIHJlc29sdmVyQ2FjaGVba2V5XVtyZXNvbHZlSWRdID0ge1xuICAgICAgICAgICAgICAgIHJlc3VsdDogcmVzdWx0LnNwbGl0KCc/JylbMF0sXG4gICAgICAgICAgICAgICAgcmVzb3VyY2VSZXNvbHZlRGF0YTogcmVzdWx0MixcbiAgICAgICAgICAgICAgICBuZXc6IHRydWUsXG4gICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYihlcnIsIHJlc3VsdCwgcmVzdWx0Mik7XG4gICAgICAgICAgfTtcbiAgICAgICAgICBjb25zdCBfbWlzc2luZyA9XG4gICAgICAgICAgICBjYi5taXNzaW5nIHx8IChyZXNvbHZlQ29udGV4dCAmJiByZXNvbHZlQ29udGV4dC5taXNzaW5nKTtcbiAgICAgICAgICBpZiAoX21pc3NpbmcpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrLm1pc3NpbmcgPSB7XG4gICAgICAgICAgICAgIHB1c2gocGF0aCkge1xuICAgICAgICAgICAgICAgIGxvY2FsTWlzc2luZy5wdXNoKHBhdGgpO1xuICAgICAgICAgICAgICAgIF9taXNzaW5nLnB1c2gocGF0aCk7XG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIGFkZChwYXRoKSB7XG4gICAgICAgICAgICAgICAgbG9jYWxNaXNzaW5nLnB1c2gocGF0aCk7XG4gICAgICAgICAgICAgICAgX21pc3NpbmcuYWRkKHBhdGgpO1xuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIGlmIChyZXNvbHZlQ29udGV4dCkge1xuICAgICAgICAgICAgICByZXNvbHZlQ29udGV4dC5taXNzaW5nID0gY2FsbGJhY2subWlzc2luZztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY2FsbGJhY2subWlzc2luZyA9IE9iamVjdC5hc3NpZ24obG9jYWxNaXNzaW5nLCB7XG4gICAgICAgICAgICAgIGFkZChwYXRoKSB7XG4gICAgICAgICAgICAgICAgbG9jYWxNaXNzaW5nLnB1c2gocGF0aCk7XG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGlmIChyZXNvbHZlQ29udGV4dCkge1xuICAgICAgICAgICAgICByZXNvbHZlQ29udGV4dC5taXNzaW5nID0gY2FsbGJhY2subWlzc2luZztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpZiAobnVtQXJncyA9PT0gMykge1xuICAgICAgICAgICAgX3Jlc29sdmUuY2FsbCh0aGlzLCBjb250ZXh0LCByZXF1ZXN0LCBjYWxsYmFjayk7XG4gICAgICAgICAgfSBlbHNlIGlmIChudW1BcmdzID09PSA1KSB7XG4gICAgICAgICAgICBfcmVzb2x2ZS5jYWxsKFxuICAgICAgICAgICAgICB0aGlzLFxuICAgICAgICAgICAgICBpbmZvLFxuICAgICAgICAgICAgICBjb250ZXh0LFxuICAgICAgICAgICAgICByZXF1ZXN0LFxuICAgICAgICAgICAgICByZXNvbHZlQ29udGV4dCxcbiAgICAgICAgICAgICAgY2FsbGJhY2ssXG4gICAgICAgICAgICApO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBfcmVzb2x2ZS5jYWxsKHRoaXMsIGluZm8sIGNvbnRleHQsIHJlcXVlc3QsIGNhbGxiYWNrKTtcbiAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICB9XG5cbiAgICAgIGlmIChjb21waWxlci5yZXNvbHZlckZhY3RvcnkpIHtcbiAgICAgICAgY29tcGlsZXIucmVzb2x2ZXJGYWN0b3J5Lmhvb2tzLnJlc29sdmVyXG4gICAgICAgICAgLmZvcignbm9ybWFsJylcbiAgICAgICAgICAudGFwKCdIYXJkU291cmNlIHJlc29sdmUgY2FjaGUnLCAocmVzb2x2ZXIsIG9wdGlvbnMpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IG5vcm1hbENhY2hlSWQgPSBgbm9ybWFsLSR7bmV3IG5vZGVPYmplY3RIYXNoKHtcbiAgICAgICAgICAgICAgc29ydDogZmFsc2UsXG4gICAgICAgICAgICB9KS5oYXNoKE9iamVjdC5hc3NpZ24oe30sIG9wdGlvbnMsIHsgZmlsZVN5c3RlbTogbnVsbCB9KSl9YDtcbiAgICAgICAgICAgIHJlc29sdmVyQ2FjaGVbbm9ybWFsQ2FjaGVJZF0gPSByZXNvbHZlckNhY2hlW25vcm1hbENhY2hlSWRdIHx8IHt9O1xuICAgICAgICAgICAgbWlzc2luZ0NhY2hlW25vcm1hbENhY2hlSWRdID0gbWlzc2luZ0NhY2hlW25vcm1hbENhY2hlSWRdIHx8IHt9O1xuICAgICAgICAgICAgY29uZmlndXJlTWlzc2luZyhub3JtYWxDYWNoZUlkLCByZXNvbHZlcik7XG4gICAgICAgICAgICByZXR1cm4gcmVzb2x2ZXI7XG4gICAgICAgICAgfSk7XG4gICAgICAgIGNvbXBpbGVyLnJlc29sdmVyRmFjdG9yeS5ob29rcy5yZXNvbHZlclxuICAgICAgICAgIC5mb3IoJ2xvYWRlcicpXG4gICAgICAgICAgLnRhcCgnSGFyZFNvdXJjZSByZXNvbHZlIGNhY2hlJywgcmVzb2x2ZXIgPT4ge1xuICAgICAgICAgICAgY29uZmlndXJlTWlzc2luZygnbG9hZGVyJywgcmVzb2x2ZXIpO1xuICAgICAgICAgICAgcmV0dXJuIHJlc29sdmVyO1xuICAgICAgICAgIH0pO1xuICAgICAgICBjb21waWxlci5yZXNvbHZlckZhY3RvcnkuaG9va3MucmVzb2x2ZXJcbiAgICAgICAgICAuZm9yKCdjb250ZXh0JylcbiAgICAgICAgICAudGFwKCdIYXJkU291cmNlIHJlc29sdmUgY2FjaGUnLCByZXNvbHZlciA9PiB7XG4gICAgICAgICAgICBjb25maWd1cmVNaXNzaW5nKCdjb250ZXh0JywgcmVzb2x2ZXIpO1xuICAgICAgICAgICAgcmV0dXJuIHJlc29sdmVyO1xuICAgICAgICAgIH0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29uZmlndXJlTWlzc2luZygnbm9ybWFsJywgY29tcGlsZXIucmVzb2x2ZXJzLm5vcm1hbCk7XG4gICAgICAgIGNvbmZpZ3VyZU1pc3NpbmcoJ2xvYWRlcicsIGNvbXBpbGVyLnJlc29sdmVycy5sb2FkZXIpO1xuICAgICAgICBjb25maWd1cmVNaXNzaW5nKCdjb250ZXh0JywgY29tcGlsZXIucmVzb2x2ZXJzLmNvbnRleHQpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGNvbXBpbGVySG9va3MuYWZ0ZXJQbHVnaW5zLnRhcCgnSGFyZFNvdXJjZSAtIEVuaGFuY2VkUmVzb2x2ZUNhY2hlJywgKCkgPT4ge1xuICAgICAgaWYgKGNvbXBpbGVyLnJlc29sdmVycy5ub3JtYWwpIHtcbiAgICAgICAgYmluZFJlc29sdmVycygpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29tcGlsZXJIb29rcy5hZnRlclJlc29sdmVycy50YXAoXG4gICAgICAgICAgJ0hhcmRTb3VyY2UgLSBFbmhhbmNlZFJlc29sdmVDYWNoZScsXG4gICAgICAgICAgYmluZFJlc29sdmVycyxcbiAgICAgICAgKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIGNvbXBpbGVySG9va3MuX2hhcmRTb3VyY2VXcml0ZUNhY2hlLnRhcFByb21pc2UoXG4gICAgICAnSGFyZFNvdXJjZSAtIEVuaGFuY2VkUmVzb2x2ZUNhY2hlJyxcbiAgICAgIChjb21waWxhdGlvbiwgeyByZWxhdGVOb3JtYWxQYXRoLCByZWxhdGVOb3JtYWxSZXF1ZXN0IH0pID0+IHtcbiAgICAgICAgaWYgKGNvbXBpbGF0aW9uLmNvbXBpbGVyLnBhcmVudENvbXBpbGF0aW9uKSB7XG4gICAgICAgICAgY29uc3QgcmVzb2x2ZXJPcHMgPSBbXTtcbiAgICAgICAgICBwdXNoUGFyaXR5V3JpdGVPcHMoY29tcGlsYXRpb24sIHJlc29sdmVyT3BzKTtcblxuICAgICAgICAgIHJldHVybiByZXNvbHZlckNhY2hlU2VyaWFsaXplci53cml0ZShyZXNvbHZlck9wcyk7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBtaXNzaW5nT3BzID0gW107XG4gICAgICAgIGNvbnN0IHJlc29sdmVyT3BzID0gW107XG5cbiAgICAgICAgZnVuY3Rpb24gcmVsYXRlTm9ybWFsTWlzc2luZ0tleShjb21waWxlciwga2V5KSB7XG4gICAgICAgICAgY29uc3QgcGFyc2VkID0gcGFyc2VKc29uKGtleSk7XG4gICAgICAgICAgcmV0dXJuIEpTT04uc3RyaW5naWZ5KFtcbiAgICAgICAgICAgIHJlbGF0ZU5vcm1hbFBhdGgoY29tcGlsZXIsIHBhcnNlZFswXSksXG4gICAgICAgICAgICByZWxhdGVOb3JtYWxQYXRoKGNvbXBpbGVyLCBwYXJzZWRbMV0pLFxuICAgICAgICAgIF0pO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gcmVsYXRlTm9ybWFsTWlzc2luZyhjb21waWxlciwgbWlzc2luZykge1xuICAgICAgICAgIHJldHVybiBtaXNzaW5nLm1hcChtaXNzZWQgPT4gcmVsYXRlTm9ybWFsUmVxdWVzdChjb21waWxlciwgbWlzc2VkKSk7XG4gICAgICAgIH1cblxuICAgICAgICBPYmplY3Qua2V5cyhtaXNzaW5nQ2FjaGUpLmZvckVhY2goZ3JvdXAgPT4ge1xuICAgICAgICAgIE9iamVjdC5rZXlzKG1pc3NpbmdDYWNoZVtncm91cF0pLmZvckVhY2goa2V5ID0+IHtcbiAgICAgICAgICAgIGlmICghbWlzc2luZ0NhY2hlW2dyb3VwXVtrZXldKSB7XG4gICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChtaXNzaW5nQ2FjaGVbZ3JvdXBdW2tleV0ubmV3KSB7XG4gICAgICAgICAgICAgIG1pc3NpbmdDYWNoZVtncm91cF1ba2V5XS5uZXcgPSBmYWxzZTtcbiAgICAgICAgICAgICAgbWlzc2luZ09wcy5wdXNoKHtcbiAgICAgICAgICAgICAgICBrZXk6IGAke2dyb3VwfS8ke3JlbGF0ZU5vcm1hbE1pc3NpbmdLZXkoY29tcGlsZXIsIGtleSl9YCxcbiAgICAgICAgICAgICAgICB2YWx1ZTogSlNPTi5zdHJpbmdpZnkoXG4gICAgICAgICAgICAgICAgICByZWxhdGVOb3JtYWxNaXNzaW5nKGNvbXBpbGVyLCBtaXNzaW5nQ2FjaGVbZ3JvdXBdW2tleV0pLFxuICAgICAgICAgICAgICAgICksXG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChtaXNzaW5nQ2FjaGVbZ3JvdXBdW2tleV0uaW52YWxpZCkge1xuICAgICAgICAgICAgICBtaXNzaW5nQ2FjaGVbZ3JvdXBdW2tleV0gPSBudWxsO1xuICAgICAgICAgICAgICBtaXNzaW5nT3BzLnB1c2goe1xuICAgICAgICAgICAgICAgIGtleTogYCR7Z3JvdXB9LyR7cmVsYXRlTm9ybWFsTWlzc2luZ0tleShjb21waWxlciwga2V5KX1gLFxuICAgICAgICAgICAgICAgIHZhbHVlOiBudWxsLFxuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgZnVuY3Rpb24gcmVsYXRlTm9ybWFsUmVzb2x2ZWRLZXkoY29tcGlsZXIsIGtleSkge1xuICAgICAgICAgIGNvbnN0IHBhcnNlZCA9IHBhcnNlSnNvbihrZXkpO1xuICAgICAgICAgIHJldHVybiBKU09OLnN0cmluZ2lmeShbXG4gICAgICAgICAgICByZWxhdGVOb3JtYWxQYXRoKGNvbXBpbGVyLCBwYXJzZWRbMF0pLFxuICAgICAgICAgICAgcmVsYXRlQ29udGV4dC5yZWxhdGVBYnNvbHV0ZVBhdGgocGFyc2VkWzBdLCBwYXJzZWRbMV0pLFxuICAgICAgICAgIF0pO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gcmVsYXRlTm9ybWFsUmVzb2x2ZWQoY29tcGlsZXIsIHJlc29sdmVkKSB7XG4gICAgICAgICAgcmV0dXJuIHNlcmlhbE5vcm1hbFJlc29sdmVkLmZyZWV6ZShyZXNvbHZlZCwgcmVzb2x2ZWQsIHtcbiAgICAgICAgICAgIGNvbXBpbGVyLFxuICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgT2JqZWN0LmtleXMocmVzb2x2ZXJDYWNoZSkuZm9yRWFjaChncm91cCA9PiB7XG4gICAgICAgICAgT2JqZWN0LmtleXMocmVzb2x2ZXJDYWNoZVtncm91cF0pLmZvckVhY2goa2V5ID0+IHtcbiAgICAgICAgICAgIGlmICghcmVzb2x2ZXJDYWNoZVtncm91cF1ba2V5XSkge1xuICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAocmVzb2x2ZXJDYWNoZVtncm91cF1ba2V5XS5uZXcpIHtcbiAgICAgICAgICAgICAgcmVzb2x2ZXJDYWNoZVtncm91cF1ba2V5XS5uZXcgPSBmYWxzZTtcbiAgICAgICAgICAgICAgcmVzb2x2ZXJPcHMucHVzaCh7XG4gICAgICAgICAgICAgICAga2V5OiBgJHtncm91cH0vJHtyZWxhdGVOb3JtYWxSZXNvbHZlZEtleShjb21waWxlciwga2V5KX1gLFxuICAgICAgICAgICAgICAgIHZhbHVlOiBKU09OLnN0cmluZ2lmeShcbiAgICAgICAgICAgICAgICAgIHJlbGF0ZU5vcm1hbFJlc29sdmVkKGNvbXBpbGVyLCByZXNvbHZlckNhY2hlW2dyb3VwXVtrZXldKSxcbiAgICAgICAgICAgICAgICApLFxuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAocmVzb2x2ZXJDYWNoZVtncm91cF1ba2V5XS5pbnZhbGlkKSB7XG4gICAgICAgICAgICAgIHJlc29sdmVyQ2FjaGVbZ3JvdXBdW2tleV0gPSBudWxsO1xuICAgICAgICAgICAgICByZXNvbHZlck9wcy5wdXNoKHtcbiAgICAgICAgICAgICAgICBrZXk6IGAke2dyb3VwfS8ke3JlbGF0ZU5vcm1hbFJlc29sdmVkS2V5KGNvbXBpbGVyLCBrZXkpfWAsXG4gICAgICAgICAgICAgICAgdmFsdWU6IG51bGwsXG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcblxuICAgICAgICBwdXNoUGFyaXR5V3JpdGVPcHMoY29tcGlsYXRpb24sIHJlc29sdmVyT3BzKTtcblxuICAgICAgICByZXR1cm4gUHJvbWlzZS5hbGwoW1xuICAgICAgICAgIG1pc3NpbmdDYWNoZVNlcmlhbGl6ZXIud3JpdGUobWlzc2luZ09wcyksXG4gICAgICAgICAgcmVzb2x2ZXJDYWNoZVNlcmlhbGl6ZXIud3JpdGUocmVzb2x2ZXJPcHMpLFxuICAgICAgICBdKTtcbiAgICAgIH0sXG4gICAgKTtcbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IEVuaGFuY2VkUmVzb2x2ZUNhY2hlO1xuIl0sInNvdXJjZVJvb3QiOiIvVXNlcnMvdHlsZXJhcmJ1cy9kZXYvcHJvdmlkZXIvc3JjIn0=

'use strict';

require('source-map-support/register');

const path = require('path');

const lodash = require('lodash');
const nodeObjectHash = require('node-object-hash');

const pluginCompat = require('./util/plugin-compat');
const promisify = require('./util/promisify');
const relateContext = require('./util/relate-context');
const values = require('./util/Object.values');
const bulkFsTask = require('./util/bulk-fs-task');
const { parityCacheFromCache, pushParityWriteOps } = require('./util/parity');
const parseJson = require('./util/parseJson');

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
          return Object.assign({}, resolved, {
            result: contextNormalPath(compiler, resolved.result)
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
              return cb(null, [resolve.result].concat(request.split('?').slice(1)).join('?'));
            } else {
              resolve.invalid = true;
              resolve.invalidReason = 'out of date';
            }
          }
          let localMissing = [];
          const callback = (err, result) => {
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
                return cb(err, result);
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
                new: true
              };
            }
            cb(err, result);
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
        return Object.assign({}, resolved, {
          result: relateNormalPath(compiler, resolved.result)
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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImhhcmQtc291cmNlLXdlYnBhY2stcGx1Z2luL2xpYi9DYWNoZUVuaGFuY2VkUmVzb2x2ZS5qcyJdLCJuYW1lcyI6WyJwYXRoIiwicmVxdWlyZSIsImxvZGFzaCIsIm5vZGVPYmplY3RIYXNoIiwicGx1Z2luQ29tcGF0IiwicHJvbWlzaWZ5IiwicmVsYXRlQ29udGV4dCIsInZhbHVlcyIsImJ1bGtGc1Rhc2siLCJwYXJpdHlDYWNoZUZyb21DYWNoZSIsInB1c2hQYXJpdHlXcml0ZU9wcyIsInBhcnNlSnNvbiIsIkVuaGFuY2VkUmVzb2x2ZUNhY2hlIiwiYXBwbHkiLCJjb21waWxlciIsIm1pc3NpbmdDYWNoZVNlcmlhbGl6ZXIiLCJyZXNvbHZlckNhY2hlU2VyaWFsaXplciIsIm1pc3NpbmdDYWNoZSIsIm5vcm1hbCIsImxvYWRlciIsImNvbnRleHQiLCJyZXNvbHZlckNhY2hlIiwicGFyaXR5Q2FjaGUiLCJjb21waWxlckhvb2tzIiwiaG9va3MiLCJfaGFyZFNvdXJjZUNyZWF0ZVNlcmlhbGl6ZXIiLCJ0YXAiLCJjYWNoZVNlcmlhbGl6ZXJGYWN0b3J5IiwiY2FjaGVEaXJQYXRoIiwiY3JlYXRlIiwibmFtZSIsInR5cGUiLCJhdXRvUGFyc2UiLCJfaGFyZFNvdXJjZVJlc2V0Q2FjaGUiLCJfX2hhcmRTb3VyY2VfbWlzc2luZ0NhY2hlIiwiX2hhcmRTb3VyY2VSZWFkQ2FjaGUiLCJ0YXBQcm9taXNlIiwiY29udGV4dE5vcm1hbFBhdGgiLCJjb250ZXh0Tm9ybWFsUmVxdWVzdCIsIlByb21pc2UiLCJhbGwiLCJyZWFkIiwidGhlbiIsIl9taXNzaW5nQ2FjaGUiLCJjb250ZXh0Tm9ybWFsTWlzc2luZ0tleSIsImtleSIsInBhcnNlZCIsIkpTT04iLCJzdHJpbmdpZnkiLCJjb250ZXh0Tm9ybWFsTWlzc2luZyIsIm1pc3NpbmciLCJtYXAiLCJtaXNzZWQiLCJPYmplY3QiLCJrZXlzIiwiZm9yRWFjaCIsIml0ZW0iLCJzcGxpdEluZGV4IiwiaW5kZXhPZiIsImdyb3VwIiwic3Vic3RyaW5nIiwia2V5TmFtZSIsIl9yZXNvbHZlckNhY2hlIiwiY29udGV4dE5vcm1hbFJlc29sdmVkS2V5IiwiY29udGV4dE5vcm1hbFJlc29sdmVkIiwicmVzb2x2ZWQiLCJhc3NpZ24iLCJyZXN1bHQiLCJzdGFydHNXaXRoIiwiX2hhcmRTb3VyY2VQYXJpdHlDYWNoZSIsInBhcml0eVJvb3QiLCJtaXNzaW5nVmVyaWZ5UmVzb2x2ZSIsIl9faGFyZFNvdXJjZV9taXNzaW5nVmVyaWZ5IiwicmVzb2x2ZSIsIl9oYXJkU291cmNlVmVyaWZ5Q2FjaGUiLCJidWxrIiwiZmxhdHRlbiIsIm1pc3NpbmdJdGVtIiwiaW5kZXgiLCJmaWx0ZXIiLCJCb29sZWFuIiwidGFzayIsIm1pc3NlZFBhdGgiLCJzcGxpdCIsIm1pc3NlZEluZGV4IiwibGVuZ3RoIiwiaW5wdXRGaWxlU3lzdGVtIiwic3RhdCIsImVyciIsImludmFsaWQiLCJpbnZhbGlkUmVhc29uIiwiaXNEaXJlY3RvcnkiLCJpc0ZpbGUiLCJiaW5kUmVzb2x2ZXJzIiwiY29uZmlndXJlTWlzc2luZyIsInJlc29sdmVyIiwiX3Jlc29sdmUiLCJpbmZvIiwicmVxdWVzdCIsImNiIiwiY2IyIiwibnVtQXJncyIsInJlc29sdmVDb250ZXh0IiwicmVzb2x2ZU9wdGlvbnMiLCJzb3J0IiwiaGFzaCIsInJlc29sdmVJZCIsImFic1Jlc29sdmVJZCIsInJlbGF0ZUFic29sdXRlUGF0aCIsIm1pc3NpbmdJZCIsImNvbmNhdCIsInNsaWNlIiwiam9pbiIsImxvY2FsTWlzc2luZyIsImNhbGxiYWNrIiwiaW52ZXJzZUlkIiwiaW5jbHVkZXMiLCJuZXciLCJfbWlzc2luZyIsInB1c2giLCJhZGQiLCJjYWxsIiwicmVzb2x2ZXJGYWN0b3J5IiwiZm9yIiwib3B0aW9ucyIsIm5vcm1hbENhY2hlSWQiLCJmaWxlU3lzdGVtIiwicmVzb2x2ZXJzIiwiYWZ0ZXJQbHVnaW5zIiwiYWZ0ZXJSZXNvbHZlcnMiLCJfaGFyZFNvdXJjZVdyaXRlQ2FjaGUiLCJjb21waWxhdGlvbiIsInJlbGF0ZU5vcm1hbFBhdGgiLCJyZWxhdGVOb3JtYWxSZXF1ZXN0IiwicGFyZW50Q29tcGlsYXRpb24iLCJyZXNvbHZlck9wcyIsIndyaXRlIiwibWlzc2luZ09wcyIsInJlbGF0ZU5vcm1hbE1pc3NpbmdLZXkiLCJyZWxhdGVOb3JtYWxNaXNzaW5nIiwidmFsdWUiLCJyZWxhdGVOb3JtYWxSZXNvbHZlZEtleSIsInJlbGF0ZU5vcm1hbFJlc29sdmVkIiwibW9kdWxlIiwiZXhwb3J0cyJdLCJtYXBwaW5ncyI6Ijs7OztBQUFBLE1BQU1BLE9BQU9DLFFBQVEsTUFBUixDQUFiOztBQUVBLE1BQU1DLFNBQVNELFFBQVEsUUFBUixDQUFmO0FBQ0EsTUFBTUUsaUJBQWlCRixRQUFRLGtCQUFSLENBQXZCOztBQUVBLE1BQU1HLGVBQWVILFFBQVEsc0JBQVIsQ0FBckI7QUFDQSxNQUFNSSxZQUFZSixRQUFRLGtCQUFSLENBQWxCO0FBQ0EsTUFBTUssZ0JBQWdCTCxRQUFRLHVCQUFSLENBQXRCO0FBQ0EsTUFBTU0sU0FBU04sUUFBUSxzQkFBUixDQUFmO0FBQ0EsTUFBTU8sYUFBYVAsUUFBUSxxQkFBUixDQUFuQjtBQUNBLE1BQU0sRUFBRVEsb0JBQUYsRUFBd0JDLGtCQUF4QixLQUErQ1QsUUFBUSxlQUFSLENBQXJEO0FBQ0EsTUFBTVUsWUFBWVYsUUFBUSxrQkFBUixDQUFsQjs7QUFFQSxNQUFNVyxvQkFBTixDQUEyQjtBQUN6QkMsUUFBTUMsUUFBTixFQUFnQjtBQUNkLFFBQUlDLHNCQUFKO0FBQ0EsUUFBSUMsdUJBQUo7O0FBRUEsUUFBSUMsZUFBZSxFQUFFQyxRQUFRLEVBQVYsRUFBY0MsUUFBUSxFQUF0QixFQUEwQkMsU0FBUyxFQUFuQyxFQUFuQjtBQUNBLFFBQUlDLGdCQUFnQixFQUFFSCxRQUFRLEVBQVYsRUFBY0MsUUFBUSxFQUF0QixFQUEwQkMsU0FBUyxFQUFuQyxFQUFwQjtBQUNBLFFBQUlFLGNBQWMsRUFBbEI7O0FBRUEsVUFBTUMsZ0JBQWdCbkIsYUFBYW9CLEtBQWIsQ0FB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RSxtQkFBTSxHQUFFYyxLQUFNLElBQUdrRix3QkFBd0IvSCxRQUF4QixFQUFrQytCLEdBQWxDLENBQXVDLEVBRHpDO0FBRWYrRixxQkFBTzdGLEtBQUtDLFNBQUwsQ0FDTDhGLHFCQUFxQmhJLFFBQXJCLEVBQStCTyxjQUFjc0MsS0FBZCxFQUFxQmQsR0FBckIsQ0FBL0IsQ0FESztBQUZRLGFBQWpCO0FBTUQsV0FSRCxNQVFPLElBQUl4QixjQUFjc0MsS0FBZCxFQUFxQmQsR0FBckIsRUFBMEI0QyxPQUE5QixFQUF1QztBQUM1Q3BFLDBCQUFjc0MsS0FBZCxFQUFxQmQsR0FBckIsSUFBNEIsSUFBNUI7QUFDQTBGLHdCQUFZaEIsSUFBWixDQUFpQjtBQUNmMUUsbUJBQU0sR0FBRWMsS0FBTSxJQUFHa0Ysd0JBQXdCL0gsUUFBeEIsRUFBa0MrQixHQUFsQyxDQUF1QyxFQUR6QztBQUVmK0YscUJBQU87QUFGUSxhQUFqQjtBQUlEO0FBQ0YsU0FuQkQ7QUFvQkQsT0FyQkQ7O0FBdUJBbEkseUJBQW1CeUgsV0FBbkIsRUFBZ0NJLFdBQWhDOztBQUVBLGFBQU9oRyxRQUFRQyxHQUFSLENBQVksQ0FDakJ6Qix1QkFBdUJ5SCxLQUF2QixDQUE2QkMsVUFBN0IsQ0FEaUIsRUFFakJ6SCx3QkFBd0J3SCxLQUF4QixDQUE4QkQsV0FBOUIsQ0FGaUIsQ0FBWixDQUFQO0FBSUQsS0EzRkg7QUE2RkQ7QUFwZXdCOztBQXVlM0JRLE9BQU9DLE9BQVAsR0FBaUJwSSxvQkFBakIiLCJmaWxlIjoiaGFyZC1zb3VyY2Utd2VicGFjay1wbHVnaW4vbGliL0NhY2hlRW5oYW5jZWRSZXNvbHZlLmpzIiwic291cmNlc0NvbnRlbnQiOlsiY29uc3QgcGF0aCA9IHJlcXVpcmUoJ3BhdGgnKTtcblxuY29uc3QgbG9kYXNoID0gcmVxdWlyZSgnbG9kYXNoJyk7XG5jb25zdCBub2RlT2JqZWN0SGFzaCA9IHJlcXVpcmUoJ25vZGUtb2JqZWN0LWhhc2gnKTtcblxuY29uc3QgcGx1Z2luQ29tcGF0ID0gcmVxdWlyZSgnLi91dGlsL3BsdWdpbi1jb21wYXQnKTtcbmNvbnN0IHByb21pc2lmeSA9IHJlcXVpcmUoJy4vdXRpbC9wcm9taXNpZnknKTtcbmNvbnN0IHJlbGF0ZUNvbnRleHQgPSByZXF1aXJlKCcuL3V0aWwvcmVsYXRlLWNvbnRleHQnKTtcbmNvbnN0IHZhbHVlcyA9IHJlcXVpcmUoJy4vdXRpbC9PYmplY3QudmFsdWVzJyk7XG5jb25zdCBidWxrRnNUYXNrID0gcmVxdWlyZSgnLi91dGlsL2J1bGstZnMtdGFzaycpO1xuY29uc3QgeyBwYXJpdHlDYWNoZUZyb21DYWNoZSwgcHVzaFBhcml0eVdyaXRlT3BzIH0gPSByZXF1aXJlKCcuL3V0aWwvcGFyaXR5Jyk7XG5jb25zdCBwYXJzZUpzb24gPSByZXF1aXJlKCcuL3V0aWwvcGFyc2VKc29uJyk7XG5cbmNsYXNzIEVuaGFuY2VkUmVzb2x2ZUNhY2hlIHtcbiAgYXBwbHkoY29tcGlsZXIpIHtcbiAgICBsZXQgbWlzc2luZ0NhY2hlU2VyaWFsaXplcjtcbiAgICBsZXQgcmVzb2x2ZXJDYWNoZVNlcmlhbGl6ZXI7XG5cbiAgICBsZXQgbWlzc2luZ0NhY2hlID0geyBub3JtYWw6IHt9LCBsb2FkZXI6IHt9LCBjb250ZXh0OiB7fSB9O1xuICAgIGxldCByZXNvbHZlckNhY2hlID0geyBub3JtYWw6IHt9LCBsb2FkZXI6IHt9LCBjb250ZXh0OiB7fSB9O1xuICAgIGxldCBwYXJpdHlDYWNoZSA9IHt9O1xuXG4gICAgY29uc3QgY29tcGlsZXJIb29rcyA9IHBsdWdpbkNvbXBhdC5ob29rcyhjb21waWxlcik7XG5cbiAgICBjb21waWxlckhvb2tzLl9oYXJkU291cmNlQ3JlYXRlU2VyaWFsaXplci50YXAoXG4gICAgICAnSGFyZFNvdXJjZSAtIEVuaGFuY2VkUmVzb2x2ZUNhY2hlJyxcbiAgICAgIChjYWNoZVNlcmlhbGl6ZXJGYWN0b3J5LCBjYWNoZURpclBhdGgpID0+IHtcbiAgICAgICAgbWlzc2luZ0NhY2hlU2VyaWFsaXplciA9IGNhY2hlU2VyaWFsaXplckZhY3RvcnkuY3JlYXRlKHtcbiAgICAgICAgICBuYW1lOiAnbWlzc2luZy1yZXNvbHZlJyxcbiAgICAgICAgICB0eXBlOiAnZGF0YScsXG4gICAgICAgICAgYXV0b1BhcnNlOiB0cnVlLFxuICAgICAgICAgIGNhY2hlRGlyUGF0aCxcbiAgICAgICAgfSk7XG4gICAgICAgIHJlc29sdmVyQ2FjaGVTZXJpYWxpemVyID0gY2FjaGVTZXJpYWxpemVyRmFjdG9yeS5jcmVhdGUoe1xuICAgICAgICAgIG5hbWU6ICdyZXNvbHZlcicsXG4gICAgICAgICAgdHlwZTogJ2RhdGEnLFxuICAgICAgICAgIGF1dG9QYXJzZTogdHJ1ZSxcbiAgICAgICAgICBjYWNoZURpclBhdGgsXG4gICAgICAgIH0pO1xuICAgICAgfSxcbiAgICApO1xuXG4gICAgY29tcGlsZXJIb29rcy5faGFyZFNvdXJjZVJlc2V0Q2FjaGUudGFwKFxuICAgICAgJ0hhcmRTb3VyY2UgLSBFbmhhbmNlZFJlc29sdmVDYWNoZScsXG4gICAgICAoKSA9PiB7XG4gICAgICAgIG1pc3NpbmdDYWNoZSA9IHsgbm9ybWFsOiB7fSwgbG9hZGVyOiB7fSwgY29udGV4dDoge30gfTtcbiAgICAgICAgcmVzb2x2ZXJDYWNoZSA9IHsgbm9ybWFsOiB7fSwgbG9hZGVyOiB7fSwgY29udGV4dDoge30gfTtcbiAgICAgICAgcGFyaXR5Q2FjaGUgPSB7fTtcblxuICAgICAgICBjb21waWxlci5fX2hhcmRTb3VyY2VfbWlzc2luZ0NhY2hlID0gbWlzc2luZ0NhY2hlO1xuICAgICAgfSxcbiAgICApO1xuXG4gICAgY29tcGlsZXJIb29rcy5faGFyZFNvdXJjZVJlYWRDYWNoZS50YXBQcm9taXNlKFxuICAgICAgJ0hhcmRTb3VyY2UgLSBFbmhhbmNlZFJlc29sdmVDYWNoZScsXG4gICAgICAoeyBjb250ZXh0Tm9ybWFsUGF0aCwgY29udGV4dE5vcm1hbFJlcXVlc3QgfSkgPT4ge1xuICAgICAgICByZXR1cm4gUHJvbWlzZS5hbGwoW1xuICAgICAgICAgIG1pc3NpbmdDYWNoZVNlcmlhbGl6ZXIucmVhZCgpLnRoZW4oX21pc3NpbmdDYWNoZSA9PiB7XG4gICAgICAgICAgICBtaXNzaW5nQ2FjaGUgPSB7IG5vcm1hbDoge30sIGxvYWRlcjoge30sIGNvbnRleHQ6IHt9IH07XG5cbiAgICAgICAgICAgIGNvbXBpbGVyLl9faGFyZFNvdXJjZV9taXNzaW5nQ2FjaGUgPSBtaXNzaW5nQ2FjaGU7XG5cbiAgICAgICAgICAgIGZ1bmN0aW9uIGNvbnRleHROb3JtYWxNaXNzaW5nS2V5KGNvbXBpbGVyLCBrZXkpIHtcbiAgICAgICAgICAgICAgY29uc3QgcGFyc2VkID0gcGFyc2VKc29uKGtleSk7XG4gICAgICAgICAgICAgIHJldHVybiBKU09OLnN0cmluZ2lmeShbXG4gICAgICAgICAgICAgICAgY29udGV4dE5vcm1hbFBhdGgoY29tcGlsZXIsIHBhcnNlZFswXSksXG4gICAgICAgICAgICAgICAgY29udGV4dE5vcm1hbFBhdGgoY29tcGlsZXIsIHBhcnNlZFsxXSksXG4gICAgICAgICAgICAgIF0pO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBmdW5jdGlvbiBjb250ZXh0Tm9ybWFsTWlzc2luZyhjb21waWxlciwgbWlzc2luZykge1xuICAgICAgICAgICAgICByZXR1cm4gbWlzc2luZy5tYXAobWlzc2VkID0+XG4gICAgICAgICAgICAgICAgY29udGV4dE5vcm1hbFJlcXVlc3QoY29tcGlsZXIsIG1pc3NlZCksXG4gICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIE9iamVjdC5rZXlzKF9taXNzaW5nQ2FjaGUpLmZvckVhY2goa2V5ID0+IHtcbiAgICAgICAgICAgICAgbGV0IGl0ZW0gPSBfbWlzc2luZ0NhY2hlW2tleV07XG4gICAgICAgICAgICAgIGlmICh0eXBlb2YgaXRlbSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgICAgICBpdGVtID0gcGFyc2VKc29uKGl0ZW0pO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGNvbnN0IHNwbGl0SW5kZXggPSBrZXkuaW5kZXhPZignLycpO1xuICAgICAgICAgICAgICBjb25zdCBncm91cCA9IGtleS5zdWJzdHJpbmcoMCwgc3BsaXRJbmRleCk7XG4gICAgICAgICAgICAgIGNvbnN0IGtleU5hbWUgPSBjb250ZXh0Tm9ybWFsTWlzc2luZ0tleShcbiAgICAgICAgICAgICAgICBjb21waWxlcixcbiAgICAgICAgICAgICAgICBrZXkuc3Vic3RyaW5nKHNwbGl0SW5kZXggKyAxKSxcbiAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgbWlzc2luZ0NhY2hlW2dyb3VwXSA9IG1pc3NpbmdDYWNoZVtncm91cF0gfHwge307XG4gICAgICAgICAgICAgIG1pc3NpbmdDYWNoZVtncm91cF1ba2V5TmFtZV0gPSBjb250ZXh0Tm9ybWFsTWlzc2luZyhcbiAgICAgICAgICAgICAgICBjb21waWxlcixcbiAgICAgICAgICAgICAgICBpdGVtLFxuICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfSksXG5cbiAgICAgICAgICByZXNvbHZlckNhY2hlU2VyaWFsaXplci5yZWFkKCkudGhlbihfcmVzb2x2ZXJDYWNoZSA9PiB7XG4gICAgICAgICAgICByZXNvbHZlckNhY2hlID0geyBub3JtYWw6IHt9LCBsb2FkZXI6IHt9LCBjb250ZXh0OiB7fSB9O1xuICAgICAgICAgICAgcGFyaXR5Q2FjaGUgPSB7fTtcblxuICAgICAgICAgICAgZnVuY3Rpb24gY29udGV4dE5vcm1hbFJlc29sdmVkS2V5KGNvbXBpbGVyLCBrZXkpIHtcbiAgICAgICAgICAgICAgY29uc3QgcGFyc2VkID0gcGFyc2VKc29uKGtleSk7XG4gICAgICAgICAgICAgIHJldHVybiBKU09OLnN0cmluZ2lmeShbXG4gICAgICAgICAgICAgICAgY29udGV4dE5vcm1hbFBhdGgoY29tcGlsZXIsIHBhcnNlZFswXSksXG4gICAgICAgICAgICAgICAgcGFyc2VkWzFdLFxuICAgICAgICAgICAgICBdKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgZnVuY3Rpb24gY29udGV4dE5vcm1hbFJlc29sdmVkKGNvbXBpbGVyLCByZXNvbHZlZCkge1xuICAgICAgICAgICAgICByZXR1cm4gT2JqZWN0LmFzc2lnbih7fSwgcmVzb2x2ZWQsIHtcbiAgICAgICAgICAgICAgICByZXN1bHQ6IGNvbnRleHROb3JtYWxQYXRoKGNvbXBpbGVyLCByZXNvbHZlZC5yZXN1bHQpLFxuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgT2JqZWN0LmtleXMoX3Jlc29sdmVyQ2FjaGUpLmZvckVhY2goa2V5ID0+IHtcbiAgICAgICAgICAgICAgbGV0IGl0ZW0gPSBfcmVzb2x2ZXJDYWNoZVtrZXldO1xuICAgICAgICAgICAgICBpZiAodHlwZW9mIGl0ZW0gPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICAgICAgaXRlbSA9IHBhcnNlSnNvbihpdGVtKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBpZiAoa2V5LnN0YXJ0c1dpdGgoJ19faGFyZFNvdXJjZV9wYXJpdHlUb2tlbicpKSB7XG4gICAgICAgICAgICAgICAgcGFyaXR5Q2FjaGVba2V5XSA9IGl0ZW07XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGNvbnN0IHNwbGl0SW5kZXggPSBrZXkuaW5kZXhPZignLycpO1xuICAgICAgICAgICAgICBjb25zdCBncm91cCA9IGtleS5zdWJzdHJpbmcoMCwgc3BsaXRJbmRleCk7XG4gICAgICAgICAgICAgIGNvbnN0IGtleU5hbWUgPSBjb250ZXh0Tm9ybWFsUmVzb2x2ZWRLZXkoXG4gICAgICAgICAgICAgICAgY29tcGlsZXIsXG4gICAgICAgICAgICAgICAga2V5LnN1YnN0cmluZyhzcGxpdEluZGV4ICsgMSksXG4gICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgIHJlc29sdmVyQ2FjaGVbZ3JvdXBdID0gcmVzb2x2ZXJDYWNoZVtncm91cF0gfHwge307XG4gICAgICAgICAgICAgIHJlc29sdmVyQ2FjaGVbZ3JvdXBdW2tleU5hbWVdID0gY29udGV4dE5vcm1hbFJlc29sdmVkKFxuICAgICAgICAgICAgICAgIGNvbXBpbGVyLFxuICAgICAgICAgICAgICAgIGl0ZW0sXG4gICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9KSxcbiAgICAgICAgXSk7XG4gICAgICB9LFxuICAgICk7XG5cbiAgICBjb21waWxlckhvb2tzLl9oYXJkU291cmNlUGFyaXR5Q2FjaGUudGFwKFxuICAgICAgJ0hhcmRTb3VyY2UgLSBFbmhhbmNlZFJlc29sdmVDYWNoZScsXG4gICAgICBwYXJpdHlSb290ID0+IHtcbiAgICAgICAgcGFyaXR5Q2FjaGVGcm9tQ2FjaGUoJ0VuaGFuY2VkUmVzb2x2ZScsIHBhcml0eVJvb3QsIHBhcml0eUNhY2hlKTtcbiAgICAgIH0sXG4gICAgKTtcblxuICAgIGxldCBtaXNzaW5nVmVyaWZ5UmVzb2x2ZTtcbiAgICBjb21waWxlci5fX2hhcmRTb3VyY2VfbWlzc2luZ1ZlcmlmeSA9IG5ldyBQcm9taXNlKHJlc29sdmUgPT4ge1xuICAgICAgbWlzc2luZ1ZlcmlmeVJlc29sdmUgPSByZXNvbHZlO1xuICAgIH0pO1xuXG4gICAgY29tcGlsZXJIb29rcy5faGFyZFNvdXJjZVZlcmlmeUNhY2hlLnRhcFByb21pc2UoXG4gICAgICAnSGFyZFNvdXJjZSAtIEVuaGFuY2VkUmVzb2x2ZUNhY2hlJyxcbiAgICAgICgpID0+XG4gICAgICAgICgoKSA9PiB7XG4gICAgICAgICAgY29tcGlsZXIuX19oYXJkU291cmNlX21pc3NpbmdWZXJpZnkgPSBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHtcbiAgICAgICAgICAgIG1pc3NpbmdWZXJpZnlSZXNvbHZlID0gcmVzb2x2ZTtcbiAgICAgICAgICB9KTtcblxuICAgICAgICAgIGNvbnN0IGJ1bGsgPSBsb2Rhc2guZmxhdHRlbihcbiAgICAgICAgICAgIE9iamVjdC5rZXlzKG1pc3NpbmdDYWNoZSkubWFwKGdyb3VwID0+XG4gICAgICAgICAgICAgIGxvZGFzaC5mbGF0dGVuKFxuICAgICAgICAgICAgICAgIE9iamVjdC5rZXlzKG1pc3NpbmdDYWNoZVtncm91cF0pXG4gICAgICAgICAgICAgICAgICAubWFwKGtleSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG1pc3NpbmdJdGVtID0gbWlzc2luZ0NhY2hlW2dyb3VwXVtrZXldO1xuICAgICAgICAgICAgICAgICAgICBpZiAoIW1pc3NpbmdJdGVtKSB7XG4gICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBtaXNzaW5nSXRlbS5tYXAoKG1pc3NlZCwgaW5kZXgpID0+IFtcbiAgICAgICAgICAgICAgICAgICAgICBncm91cCxcbiAgICAgICAgICAgICAgICAgICAgICBrZXksXG4gICAgICAgICAgICAgICAgICAgICAgbWlzc2VkLFxuICAgICAgICAgICAgICAgICAgICAgIGluZGV4LFxuICAgICAgICAgICAgICAgICAgICBdKTtcbiAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAuZmlsdGVyKEJvb2xlYW4pLFxuICAgICAgICAgICAgICApLFxuICAgICAgICAgICAgKSxcbiAgICAgICAgICApO1xuXG4gICAgICAgICAgcmV0dXJuIGJ1bGtGc1Rhc2soYnVsaywgKGl0ZW0sIHRhc2spID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGdyb3VwID0gaXRlbVswXTtcbiAgICAgICAgICAgIGNvbnN0IGtleSA9IGl0ZW1bMV07XG4gICAgICAgICAgICBjb25zdCBtaXNzaW5nSXRlbSA9IG1pc3NpbmdDYWNoZVtncm91cF1ba2V5XTtcbiAgICAgICAgICAgIGNvbnN0IG1pc3NlZCA9IGl0ZW1bMl07XG4gICAgICAgICAgICBjb25zdCBtaXNzZWRQYXRoID0gbWlzc2VkLnNwbGl0KCc/JylbMF07XG4gICAgICAgICAgICBjb25zdCBtaXNzZWRJbmRleCA9IGl0ZW1bM107XG5cbiAgICAgICAgICAgIC8vIFRoZSBtaXNzZWQgaW5kZXggaXMgdGhlIHJlc29sdmVkIGl0ZW0uIEludmFsaWRhdGUgaWYgaXQgZG9lcyBub3RcbiAgICAgICAgICAgIC8vIGV4aXN0LlxuICAgICAgICAgICAgaWYgKG1pc3NlZEluZGV4ID09PSBtaXNzaW5nSXRlbS5sZW5ndGggLSAxKSB7XG4gICAgICAgICAgICAgIGNvbXBpbGVyLmlucHV0RmlsZVN5c3RlbS5zdGF0KFxuICAgICAgICAgICAgICAgIG1pc3NlZCxcbiAgICAgICAgICAgICAgICB0YXNrKChlcnIsIHN0YXQpID0+IHtcbiAgICAgICAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgbWlzc2luZ0l0ZW0uaW52YWxpZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIG1pc3NpbmdJdGVtLmludmFsaWRSZWFzb24gPSAncmVzb2x2ZWQgbm93IG1pc3NpbmcnO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pLFxuICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgY29tcGlsZXIuaW5wdXRGaWxlU3lzdGVtLnN0YXQoXG4gICAgICAgICAgICAgICAgbWlzc2VkLFxuICAgICAgICAgICAgICAgIHRhc2soKGVyciwgc3RhdCkgPT4ge1xuICAgICAgICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgIGlmIChzdGF0LmlzRGlyZWN0b3J5KCkpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGdyb3VwID09PSAnY29udGV4dCcpIHtcbiAgICAgICAgICAgICAgICAgICAgICBtaXNzaW5nSXRlbS5pbnZhbGlkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgaWYgKHN0YXQuaXNGaWxlKCkpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGdyb3VwID09PSAnbG9hZGVyJyB8fCBncm91cC5zdGFydHNXaXRoKCdub3JtYWwnKSkge1xuICAgICAgICAgICAgICAgICAgICAgIG1pc3NpbmdJdGVtLmludmFsaWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgIG1pc3NpbmdJdGVtLmludmFsaWRSZWFzb24gPSAnbWlzc2luZyBub3cgZm91bmQnO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSksXG4gICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pKCkudGhlbihtaXNzaW5nVmVyaWZ5UmVzb2x2ZSksXG4gICAgKTtcblxuICAgIGZ1bmN0aW9uIGJpbmRSZXNvbHZlcnMoKSB7XG4gICAgICBmdW5jdGlvbiBjb25maWd1cmVNaXNzaW5nKGtleSwgcmVzb2x2ZXIpIHtcbiAgICAgICAgLy8gbWlzc2luZ0NhY2hlW2tleV0gPSBtaXNzaW5nQ2FjaGVba2V5XSB8fCB7fTtcbiAgICAgICAgLy8gcmVzb2x2ZXJDYWNoZVtrZXldID0gcmVzb2x2ZXJDYWNoZVtrZXldIHx8IHt9O1xuXG4gICAgICAgIGNvbnN0IF9yZXNvbHZlID0gcmVzb2x2ZXIucmVzb2x2ZTtcbiAgICAgICAgcmVzb2x2ZXIucmVzb2x2ZSA9IGZ1bmN0aW9uKGluZm8sIGNvbnRleHQsIHJlcXVlc3QsIGNiLCBjYjIpIHtcbiAgICAgICAgICBsZXQgbnVtQXJncyA9IDQ7XG4gICAgICAgICAgaWYgKCFjYikge1xuICAgICAgICAgICAgbnVtQXJncyA9IDM7XG4gICAgICAgICAgICBjYiA9IHJlcXVlc3Q7XG4gICAgICAgICAgICByZXF1ZXN0ID0gY29udGV4dDtcbiAgICAgICAgICAgIGNvbnRleHQgPSBpbmZvO1xuICAgICAgICAgIH1cbiAgICAgICAgICBsZXQgcmVzb2x2ZUNvbnRleHQ7XG4gICAgICAgICAgaWYgKGNiMikge1xuICAgICAgICAgICAgbnVtQXJncyA9IDU7XG4gICAgICAgICAgICByZXNvbHZlQ29udGV4dCA9IGNiO1xuICAgICAgICAgICAgY2IgPSBjYjI7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgaWYgKGluZm8gJiYgaW5mby5yZXNvbHZlT3B0aW9ucykge1xuICAgICAgICAgICAga2V5ID0gYG5vcm1hbC0ke25ldyBub2RlT2JqZWN0SGFzaCh7IHNvcnQ6IGZhbHNlIH0pLmhhc2goXG4gICAgICAgICAgICAgIGluZm8ucmVzb2x2ZU9wdGlvbnMsXG4gICAgICAgICAgICApfWA7XG4gICAgICAgICAgICByZXNvbHZlckNhY2hlW2tleV0gPSByZXNvbHZlckNhY2hlW2tleV0gfHwge307XG4gICAgICAgICAgICBtaXNzaW5nQ2FjaGVba2V5XSA9IG1pc3NpbmdDYWNoZVtrZXldIHx8IHt9O1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGNvbnN0IHJlc29sdmVJZCA9IEpTT04uc3RyaW5naWZ5KFtjb250ZXh0LCByZXF1ZXN0XSk7XG4gICAgICAgICAgY29uc3QgYWJzUmVzb2x2ZUlkID0gSlNPTi5zdHJpbmdpZnkoW1xuICAgICAgICAgICAgY29udGV4dCxcbiAgICAgICAgICAgIHJlbGF0ZUNvbnRleHQucmVsYXRlQWJzb2x1dGVQYXRoKGNvbnRleHQsIHJlcXVlc3QpLFxuICAgICAgICAgIF0pO1xuICAgICAgICAgIGNvbnN0IHJlc29sdmUgPVxuICAgICAgICAgICAgcmVzb2x2ZXJDYWNoZVtrZXldW3Jlc29sdmVJZF0gfHwgcmVzb2x2ZXJDYWNoZVtrZXldW2Fic1Jlc29sdmVJZF07XG4gICAgICAgICAgaWYgKHJlc29sdmUgJiYgIXJlc29sdmUuaW52YWxpZCkge1xuICAgICAgICAgICAgY29uc3QgbWlzc2luZ0lkID0gSlNPTi5zdHJpbmdpZnkoW2NvbnRleHQsIHJlc29sdmUucmVzdWx0XSk7XG4gICAgICAgICAgICBjb25zdCBtaXNzaW5nID0gbWlzc2luZ0NhY2hlW2tleV1bbWlzc2luZ0lkXTtcbiAgICAgICAgICAgIGlmIChtaXNzaW5nICYmICFtaXNzaW5nLmludmFsaWQpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIGNiKFxuICAgICAgICAgICAgICAgIG51bGwsXG4gICAgICAgICAgICAgICAgW3Jlc29sdmUucmVzdWx0XS5jb25jYXQocmVxdWVzdC5zcGxpdCgnPycpLnNsaWNlKDEpKS5qb2luKCc/JyksXG4gICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICByZXNvbHZlLmludmFsaWQgPSB0cnVlO1xuICAgICAgICAgICAgICByZXNvbHZlLmludmFsaWRSZWFzb24gPSAnb3V0IG9mIGRhdGUnO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBsZXQgbG9jYWxNaXNzaW5nID0gW107XG4gICAgICAgICAgY29uc3QgY2FsbGJhY2sgPSAoZXJyLCByZXN1bHQpID0+IHtcbiAgICAgICAgICAgIGlmIChyZXN1bHQpIHtcbiAgICAgICAgICAgICAgY29uc3QgaW52ZXJzZUlkID0gSlNPTi5zdHJpbmdpZnkoW2NvbnRleHQsIHJlc3VsdC5zcGxpdCgnPycpWzBdXSk7XG4gICAgICAgICAgICAgIGNvbnN0IHJlc29sdmVJZCA9IEpTT04uc3RyaW5naWZ5KFtjb250ZXh0LCByZXF1ZXN0XSk7XG5cbiAgICAgICAgICAgICAgLy8gU2tpcCByZWNvcmRpbmcgbWlzc2luZyBmb3IgYW55IGRlcGVuZGVuY3kgaW4gbm9kZV9tb2R1bGVzLlxuICAgICAgICAgICAgICAvLyBDaGFuZ2VzIHRvIHRoZW0gd2lsbCBiZSBoYW5kbGVkIGJ5IHRoZSBlbnZpcm9ubWVudCBoYXNoLiBJZiB3ZVxuICAgICAgICAgICAgICAvLyB0cmFja2VkIHRoZSBzdHVmZiBpbiBub2RlX21vZHVsZXMgdG9vLCB3ZSdkIGJlIGFkZGluZyBhIHdob2xlXG4gICAgICAgICAgICAgIC8vIGJ1bmNoIG9mIHJlZHVudGFudCB3b3JrLlxuICAgICAgICAgICAgICBpZiAocmVzdWx0LmluY2x1ZGVzKCdub2RlX21vZHVsZXMnKSkge1xuICAgICAgICAgICAgICAgIGxvY2FsTWlzc2luZyA9IGxvY2FsTWlzc2luZy5maWx0ZXIoXG4gICAgICAgICAgICAgICAgICBtaXNzZWQgPT4gIW1pc3NlZC5pbmNsdWRlcygnbm9kZV9tb2R1bGVzJyksXG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgIC8vIEluIGNhc2Ugb2Ygb3RoZXIgY2FjaGUgbGF5ZXJzLCBpZiB3ZSBhbHJlYWR5IGhhdmUgbWlzc2luZ1xuICAgICAgICAgICAgICAvLyByZWNvcmRlZCBhbmQgd2UgZ2V0IGEgbmV3IGVtcHR5IGFycmF5IG9mIG1pc3NpbmcsIGtlZXAgdGhlIG9sZFxuICAgICAgICAgICAgICAvLyB2YWx1ZS5cbiAgICAgICAgICAgICAgaWYgKGxvY2FsTWlzc2luZy5sZW5ndGggPT09IDAgJiYgbWlzc2luZ0NhY2hlW2tleV1baW52ZXJzZUlkXSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBjYihlcnIsIHJlc3VsdCk7XG4gICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICBtaXNzaW5nQ2FjaGVba2V5XVtpbnZlcnNlSWRdID0gbG9jYWxNaXNzaW5nXG4gICAgICAgICAgICAgICAgLmZpbHRlcigobWlzc2VkLCBtaXNzZWRJbmRleCkgPT4ge1xuICAgICAgICAgICAgICAgICAgY29uc3QgaW5kZXggPSBsb2NhbE1pc3NpbmcuaW5kZXhPZihtaXNzZWQpO1xuICAgICAgICAgICAgICAgICAgaWYgKGluZGV4ID09PSAtMSB8fCBpbmRleCA8IG1pc3NlZEluZGV4KSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIGlmIChtaXNzZWQgPT09IHJlc3VsdCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIC5jb25jYXQocmVzdWx0LnNwbGl0KCc/JylbMF0pO1xuICAgICAgICAgICAgICBtaXNzaW5nQ2FjaGVba2V5XVtpbnZlcnNlSWRdLm5ldyA9IHRydWU7XG4gICAgICAgICAgICAgIHJlc29sdmVyQ2FjaGVba2V5XVtyZXNvbHZlSWRdID0ge1xuICAgICAgICAgICAgICAgIHJlc3VsdDogcmVzdWx0LnNwbGl0KCc/JylbMF0sXG4gICAgICAgICAgICAgICAgbmV3OiB0cnVlLFxuICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2IoZXJyLCByZXN1bHQpO1xuICAgICAgICAgIH07XG4gICAgICAgICAgY29uc3QgX21pc3NpbmcgPVxuICAgICAgICAgICAgY2IubWlzc2luZyB8fCAocmVzb2x2ZUNvbnRleHQgJiYgcmVzb2x2ZUNvbnRleHQubWlzc2luZyk7XG4gICAgICAgICAgaWYgKF9taXNzaW5nKSB7XG4gICAgICAgICAgICBjYWxsYmFjay5taXNzaW5nID0ge1xuICAgICAgICAgICAgICBwdXNoKHBhdGgpIHtcbiAgICAgICAgICAgICAgICBsb2NhbE1pc3NpbmcucHVzaChwYXRoKTtcbiAgICAgICAgICAgICAgICBfbWlzc2luZy5wdXNoKHBhdGgpO1xuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICBhZGQocGF0aCkge1xuICAgICAgICAgICAgICAgIGxvY2FsTWlzc2luZy5wdXNoKHBhdGgpO1xuICAgICAgICAgICAgICAgIF9taXNzaW5nLmFkZChwYXRoKTtcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBpZiAocmVzb2x2ZUNvbnRleHQpIHtcbiAgICAgICAgICAgICAgcmVzb2x2ZUNvbnRleHQubWlzc2luZyA9IGNhbGxiYWNrLm1pc3Npbmc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNhbGxiYWNrLm1pc3NpbmcgPSBPYmplY3QuYXNzaWduKGxvY2FsTWlzc2luZywge1xuICAgICAgICAgICAgICBhZGQocGF0aCkge1xuICAgICAgICAgICAgICAgIGxvY2FsTWlzc2luZy5wdXNoKHBhdGgpO1xuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBpZiAocmVzb2x2ZUNvbnRleHQpIHtcbiAgICAgICAgICAgICAgcmVzb2x2ZUNvbnRleHQubWlzc2luZyA9IGNhbGxiYWNrLm1pc3Npbmc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgaWYgKG51bUFyZ3MgPT09IDMpIHtcbiAgICAgICAgICAgIF9yZXNvbHZlLmNhbGwodGhpcywgY29udGV4dCwgcmVxdWVzdCwgY2FsbGJhY2spO1xuICAgICAgICAgIH0gZWxzZSBpZiAobnVtQXJncyA9PT0gNSkge1xuICAgICAgICAgICAgX3Jlc29sdmUuY2FsbChcbiAgICAgICAgICAgICAgdGhpcyxcbiAgICAgICAgICAgICAgaW5mbyxcbiAgICAgICAgICAgICAgY29udGV4dCxcbiAgICAgICAgICAgICAgcmVxdWVzdCxcbiAgICAgICAgICAgICAgcmVzb2x2ZUNvbnRleHQsXG4gICAgICAgICAgICAgIGNhbGxiYWNrLFxuICAgICAgICAgICAgKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgX3Jlc29sdmUuY2FsbCh0aGlzLCBpbmZvLCBjb250ZXh0LCByZXF1ZXN0LCBjYWxsYmFjayk7XG4gICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgfVxuXG4gICAgICBpZiAoY29tcGlsZXIucmVzb2x2ZXJGYWN0b3J5KSB7XG4gICAgICAgIGNvbXBpbGVyLnJlc29sdmVyRmFjdG9yeS5ob29rcy5yZXNvbHZlclxuICAgICAgICAgIC5mb3IoJ25vcm1hbCcpXG4gICAgICAgICAgLnRhcCgnSGFyZFNvdXJjZSByZXNvbHZlIGNhY2hlJywgKHJlc29sdmVyLCBvcHRpb25zKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBub3JtYWxDYWNoZUlkID0gYG5vcm1hbC0ke25ldyBub2RlT2JqZWN0SGFzaCh7XG4gICAgICAgICAgICAgIHNvcnQ6IGZhbHNlLFxuICAgICAgICAgICAgfSkuaGFzaChPYmplY3QuYXNzaWduKHt9LCBvcHRpb25zLCB7IGZpbGVTeXN0ZW06IG51bGwgfSkpfWA7XG4gICAgICAgICAgICByZXNvbHZlckNhY2hlW25vcm1hbENhY2hlSWRdID0gcmVzb2x2ZXJDYWNoZVtub3JtYWxDYWNoZUlkXSB8fCB7fTtcbiAgICAgICAgICAgIG1pc3NpbmdDYWNoZVtub3JtYWxDYWNoZUlkXSA9IG1pc3NpbmdDYWNoZVtub3JtYWxDYWNoZUlkXSB8fCB7fTtcbiAgICAgICAgICAgIGNvbmZpZ3VyZU1pc3Npbmcobm9ybWFsQ2FjaGVJZCwgcmVzb2x2ZXIpO1xuICAgICAgICAgICAgcmV0dXJuIHJlc29sdmVyO1xuICAgICAgICAgIH0pO1xuICAgICAgICBjb21waWxlci5yZXNvbHZlckZhY3RvcnkuaG9va3MucmVzb2x2ZXJcbiAgICAgICAgICAuZm9yKCdsb2FkZXInKVxuICAgICAgICAgIC50YXAoJ0hhcmRTb3VyY2UgcmVzb2x2ZSBjYWNoZScsIHJlc29sdmVyID0+IHtcbiAgICAgICAgICAgIGNvbmZpZ3VyZU1pc3NpbmcoJ2xvYWRlcicsIHJlc29sdmVyKTtcbiAgICAgICAgICAgIHJldHVybiByZXNvbHZlcjtcbiAgICAgICAgICB9KTtcbiAgICAgICAgY29tcGlsZXIucmVzb2x2ZXJGYWN0b3J5Lmhvb2tzLnJlc29sdmVyXG4gICAgICAgICAgLmZvcignY29udGV4dCcpXG4gICAgICAgICAgLnRhcCgnSGFyZFNvdXJjZSByZXNvbHZlIGNhY2hlJywgcmVzb2x2ZXIgPT4ge1xuICAgICAgICAgICAgY29uZmlndXJlTWlzc2luZygnY29udGV4dCcsIHJlc29sdmVyKTtcbiAgICAgICAgICAgIHJldHVybiByZXNvbHZlcjtcbiAgICAgICAgICB9KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbmZpZ3VyZU1pc3NpbmcoJ25vcm1hbCcsIGNvbXBpbGVyLnJlc29sdmVycy5ub3JtYWwpO1xuICAgICAgICBjb25maWd1cmVNaXNzaW5nKCdsb2FkZXInLCBjb21waWxlci5yZXNvbHZlcnMubG9hZGVyKTtcbiAgICAgICAgY29uZmlndXJlTWlzc2luZygnY29udGV4dCcsIGNvbXBpbGVyLnJlc29sdmVycy5jb250ZXh0KTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb21waWxlckhvb2tzLmFmdGVyUGx1Z2lucy50YXAoJ0hhcmRTb3VyY2UgLSBFbmhhbmNlZFJlc29sdmVDYWNoZScsICgpID0+IHtcbiAgICAgIGlmIChjb21waWxlci5yZXNvbHZlcnMubm9ybWFsKSB7XG4gICAgICAgIGJpbmRSZXNvbHZlcnMoKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbXBpbGVySG9va3MuYWZ0ZXJSZXNvbHZlcnMudGFwKFxuICAgICAgICAgICdIYXJkU291cmNlIC0gRW5oYW5jZWRSZXNvbHZlQ2FjaGUnLFxuICAgICAgICAgIGJpbmRSZXNvbHZlcnMsXG4gICAgICAgICk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICBjb21waWxlckhvb2tzLl9oYXJkU291cmNlV3JpdGVDYWNoZS50YXBQcm9taXNlKFxuICAgICAgJ0hhcmRTb3VyY2UgLSBFbmhhbmNlZFJlc29sdmVDYWNoZScsXG4gICAgICAoY29tcGlsYXRpb24sIHsgcmVsYXRlTm9ybWFsUGF0aCwgcmVsYXRlTm9ybWFsUmVxdWVzdCB9KSA9PiB7XG4gICAgICAgIGlmIChjb21waWxhdGlvbi5jb21waWxlci5wYXJlbnRDb21waWxhdGlvbikge1xuICAgICAgICAgIGNvbnN0IHJlc29sdmVyT3BzID0gW107XG4gICAgICAgICAgcHVzaFBhcml0eVdyaXRlT3BzKGNvbXBpbGF0aW9uLCByZXNvbHZlck9wcyk7XG5cbiAgICAgICAgICByZXR1cm4gcmVzb2x2ZXJDYWNoZVNlcmlhbGl6ZXIud3JpdGUocmVzb2x2ZXJPcHMpO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgbWlzc2luZ09wcyA9IFtdO1xuICAgICAgICBjb25zdCByZXNvbHZlck9wcyA9IFtdO1xuXG4gICAgICAgIGZ1bmN0aW9uIHJlbGF0ZU5vcm1hbE1pc3NpbmdLZXkoY29tcGlsZXIsIGtleSkge1xuICAgICAgICAgIGNvbnN0IHBhcnNlZCA9IHBhcnNlSnNvbihrZXkpO1xuICAgICAgICAgIHJldHVybiBKU09OLnN0cmluZ2lmeShbXG4gICAgICAgICAgICByZWxhdGVOb3JtYWxQYXRoKGNvbXBpbGVyLCBwYXJzZWRbMF0pLFxuICAgICAgICAgICAgcmVsYXRlTm9ybWFsUGF0aChjb21waWxlciwgcGFyc2VkWzFdKSxcbiAgICAgICAgICBdKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIHJlbGF0ZU5vcm1hbE1pc3NpbmcoY29tcGlsZXIsIG1pc3NpbmcpIHtcbiAgICAgICAgICByZXR1cm4gbWlzc2luZy5tYXAobWlzc2VkID0+IHJlbGF0ZU5vcm1hbFJlcXVlc3QoY29tcGlsZXIsIG1pc3NlZCkpO1xuICAgICAgICB9XG5cbiAgICAgICAgT2JqZWN0LmtleXMobWlzc2luZ0NhY2hlKS5mb3JFYWNoKGdyb3VwID0+IHtcbiAgICAgICAgICBPYmplY3Qua2V5cyhtaXNzaW5nQ2FjaGVbZ3JvdXBdKS5mb3JFYWNoKGtleSA9PiB7XG4gICAgICAgICAgICBpZiAoIW1pc3NpbmdDYWNoZVtncm91cF1ba2V5XSkge1xuICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAobWlzc2luZ0NhY2hlW2dyb3VwXVtrZXldLm5ldykge1xuICAgICAgICAgICAgICBtaXNzaW5nQ2FjaGVbZ3JvdXBdW2tleV0ubmV3ID0gZmFsc2U7XG4gICAgICAgICAgICAgIG1pc3NpbmdPcHMucHVzaCh7XG4gICAgICAgICAgICAgICAga2V5OiBgJHtncm91cH0vJHtyZWxhdGVOb3JtYWxNaXNzaW5nS2V5KGNvbXBpbGVyLCBrZXkpfWAsXG4gICAgICAgICAgICAgICAgdmFsdWU6IEpTT04uc3RyaW5naWZ5KFxuICAgICAgICAgICAgICAgICAgcmVsYXRlTm9ybWFsTWlzc2luZyhjb21waWxlciwgbWlzc2luZ0NhY2hlW2dyb3VwXVtrZXldKSxcbiAgICAgICAgICAgICAgICApLFxuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAobWlzc2luZ0NhY2hlW2dyb3VwXVtrZXldLmludmFsaWQpIHtcbiAgICAgICAgICAgICAgbWlzc2luZ0NhY2hlW2dyb3VwXVtrZXldID0gbnVsbDtcbiAgICAgICAgICAgICAgbWlzc2luZ09wcy5wdXNoKHtcbiAgICAgICAgICAgICAgICBrZXk6IGAke2dyb3VwfS8ke3JlbGF0ZU5vcm1hbE1pc3NpbmdLZXkoY29tcGlsZXIsIGtleSl9YCxcbiAgICAgICAgICAgICAgICB2YWx1ZTogbnVsbCxcbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGZ1bmN0aW9uIHJlbGF0ZU5vcm1hbFJlc29sdmVkS2V5KGNvbXBpbGVyLCBrZXkpIHtcbiAgICAgICAgICBjb25zdCBwYXJzZWQgPSBwYXJzZUpzb24oa2V5KTtcbiAgICAgICAgICByZXR1cm4gSlNPTi5zdHJpbmdpZnkoW1xuICAgICAgICAgICAgcmVsYXRlTm9ybWFsUGF0aChjb21waWxlciwgcGFyc2VkWzBdKSxcbiAgICAgICAgICAgIHJlbGF0ZUNvbnRleHQucmVsYXRlQWJzb2x1dGVQYXRoKHBhcnNlZFswXSwgcGFyc2VkWzFdKSxcbiAgICAgICAgICBdKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIHJlbGF0ZU5vcm1hbFJlc29sdmVkKGNvbXBpbGVyLCByZXNvbHZlZCkge1xuICAgICAgICAgIHJldHVybiBPYmplY3QuYXNzaWduKHt9LCByZXNvbHZlZCwge1xuICAgICAgICAgICAgcmVzdWx0OiByZWxhdGVOb3JtYWxQYXRoKGNvbXBpbGVyLCByZXNvbHZlZC5yZXN1bHQpLFxuICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgT2JqZWN0LmtleXMocmVzb2x2ZXJDYWNoZSkuZm9yRWFjaChncm91cCA9PiB7XG4gICAgICAgICAgT2JqZWN0LmtleXMocmVzb2x2ZXJDYWNoZVtncm91cF0pLmZvckVhY2goa2V5ID0+IHtcbiAgICAgICAgICAgIGlmICghcmVzb2x2ZXJDYWNoZVtncm91cF1ba2V5XSkge1xuICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAocmVzb2x2ZXJDYWNoZVtncm91cF1ba2V5XS5uZXcpIHtcbiAgICAgICAgICAgICAgcmVzb2x2ZXJDYWNoZVtncm91cF1ba2V5XS5uZXcgPSBmYWxzZTtcbiAgICAgICAgICAgICAgcmVzb2x2ZXJPcHMucHVzaCh7XG4gICAgICAgICAgICAgICAga2V5OiBgJHtncm91cH0vJHtyZWxhdGVOb3JtYWxSZXNvbHZlZEtleShjb21waWxlciwga2V5KX1gLFxuICAgICAgICAgICAgICAgIHZhbHVlOiBKU09OLnN0cmluZ2lmeShcbiAgICAgICAgICAgICAgICAgIHJlbGF0ZU5vcm1hbFJlc29sdmVkKGNvbXBpbGVyLCByZXNvbHZlckNhY2hlW2dyb3VwXVtrZXldKSxcbiAgICAgICAgICAgICAgICApLFxuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAocmVzb2x2ZXJDYWNoZVtncm91cF1ba2V5XS5pbnZhbGlkKSB7XG4gICAgICAgICAgICAgIHJlc29sdmVyQ2FjaGVbZ3JvdXBdW2tleV0gPSBudWxsO1xuICAgICAgICAgICAgICByZXNvbHZlck9wcy5wdXNoKHtcbiAgICAgICAgICAgICAgICBrZXk6IGAke2dyb3VwfS8ke3JlbGF0ZU5vcm1hbFJlc29sdmVkS2V5KGNvbXBpbGVyLCBrZXkpfWAsXG4gICAgICAgICAgICAgICAgdmFsdWU6IG51bGwsXG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcblxuICAgICAgICBwdXNoUGFyaXR5V3JpdGVPcHMoY29tcGlsYXRpb24sIHJlc29sdmVyT3BzKTtcblxuICAgICAgICByZXR1cm4gUHJvbWlzZS5hbGwoW1xuICAgICAgICAgIG1pc3NpbmdDYWNoZVNlcmlhbGl6ZXIud3JpdGUobWlzc2luZ09wcyksXG4gICAgICAgICAgcmVzb2x2ZXJDYWNoZVNlcmlhbGl6ZXIud3JpdGUocmVzb2x2ZXJPcHMpLFxuICAgICAgICBdKTtcbiAgICAgIH0sXG4gICAgKTtcbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IEVuaGFuY2VkUmVzb2x2ZUNhY2hlO1xuIl0sInNvdXJjZVJvb3QiOiIvVXNlcnMvdHlsZXJhcmJ1cy9kZXYvcHJvdmlkZXIvc3JjIn0=

'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const lodash = require('lodash');
const _mkdirp = require('mkdirp');
const _rimraf = require('rimraf');
const nodeObjectHash = require('node-object-hash');
const findCacheDir = require('find-cache-dir');

const envHash = require('./lib/envHash');
const defaultConfigHash = require('./lib/defaultConfigHash');
const promisify = require('./lib/util/promisify');
const relateContext = require('./lib/util/relate-context');
const pluginCompat = require('./lib/util/plugin-compat');
const logMessages = require('./lib/util/log-messages');

const LoggerFactory = require('./lib/loggerFactory');

const cachePrefix = require('./lib/util').cachePrefix;

const CacheSerializerFactory = require('./lib/CacheSerializerFactory');
const ExcludeModulePlugin = require('./lib/ExcludeModulePlugin');
const HardSourceLevelDbSerializerPlugin = require('./lib/SerializerLeveldbPlugin');
const SerializerAppend2Plugin = require('./lib/SerializerAppend2Plugin');
const SerializerAppendPlugin = require('./lib/SerializerAppendPlugin');
const SerializerCacachePlugin = require('./lib/SerializerCacachePlugin');
const SerializerJsonPlugin = require('./lib/SerializerJsonPlugin');

const hardSourceVersion = require('./package.json').version;

/*
 * Add a String.prototype.padStart polyfill for node 6 compatability
 * https://github.com/uxitten/polyfill/blob/master/string.polyfill.js
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/padStart
 */
if (!String.prototype.padStart) {
  String.prototype.padStart = function padStart(targetLength, padString) {
    targetLength = targetLength >> 0; //truncate if number or convert non-number to 0;
    padString = String(typeof padString !== 'undefined' ? padString : ' ');
    if (this.length > targetLength) {
      return String(this);
    } else {
      targetLength = targetLength - this.length;
      if (targetLength > padString.length) {
        padString += padString.repeat(targetLength / padString.length); //append to original to ensure we are longer than needed
      }
      return padString.slice(0, targetLength) + String(this);
    }
  };
}

function requestHash(request) {
  return crypto.createHash('sha1').update(request).digest().hexSlice();
}

const mkdirp = promisify(_mkdirp, { context: _mkdirp });
mkdirp.sync = _mkdirp.sync.bind(_mkdirp);
const rimraf = promisify(_rimraf);
rimraf.sync = _rimraf.sync.bind(_rimraf);
const fsReadFile = promisify(fs.readFile, { context: fs });
const fsWriteFile = promisify(fs.writeFile, { context: fs });

const bulkFsTask = (array, each) => new Promise((resolve, reject) => {
  let ops = 0;
  const out = [];
  array.forEach((item, i) => {
    out[i] = each(item, (back, callback) => {
      ops++;
      return (err, value) => {
        try {
          out[i] = back(err, value, out[i]);
        } catch (e) {
          return reject(e);
        }

        ops--;
        if (ops === 0) {
          resolve(out);
        }
      };
    });
  });
  if (ops === 0) {
    resolve(out);
  }
});

const compilerContext = relateContext.compilerContext;
const relateNormalPath = relateContext.relateNormalPath;
const contextNormalPath = relateContext.contextNormalPath;
const contextNormalPathSet = relateContext.contextNormalPathSet;

function relateNormalRequest(compiler, key) {
  return key.split('!').map(subkey => relateNormalPath(compiler, subkey)).join('!');
}

function relateNormalModuleId(compiler, id) {
  return id.substring(0, 24) + relateNormalRequest(compiler, id.substring(24));
}

function contextNormalRequest(compiler, key) {
  return key.split('!').map(subkey => contextNormalPath(compiler, subkey)).join('!');
}

function contextNormalModuleId(compiler, id) {
  return id.substring(0, 24) + contextNormalRequest(compiler, id.substring(24));
}

function contextNormalLoaders(compiler, loaders) {
  return loaders.map(loader => Object.assign({}, loader, {
    loader: contextNormalPath(compiler, loader.loader)
  }));
}

function contextNormalPathArray(compiler, paths) {
  return paths.map(subpath => contextNormalPath(compiler, subpath));
}

class HardSourceWebpackPlugin {
  constructor(options) {
    this.options = options || {};
  }

  getPath(dirName, suffix) {
    const confighashIndex = dirName.search(/\[confighash\]/);
    if (confighashIndex !== -1) {
      dirName = dirName.replace(/\[confighash\]/, this.configHash);
    }
    let cachePath = path.resolve(process.cwd(), this.compilerOutputOptions.path, dirName);
    if (suffix) {
      cachePath = path.join(cachePath, suffix);
    }
    return cachePath;
  }

  getCachePath(suffix) {
    return this.getPath(this.options.cacheDirectory, suffix);
  }

  apply(compiler) {
    const options = this.options;
    let active = true;

    const logger = new LoggerFactory(compiler).create();

    const loggerCore = logger.from('core');
    logger.lock();

    const compilerHooks = pluginCompat.hooks(compiler);

    if (!compiler.options.cache) {
      compiler.options.cache = true;
    }

    if (!options.cacheDirectory) {
      options.cacheDirectory = path.resolve(findCacheDir({
        name: 'hard-source',
        cwd: compiler.options.context || process.cwd()
      }), '[confighash]');
    }

    this.compilerOutputOptions = compiler.options.output;
    if (!options.configHash) {
      options.configHash = defaultConfigHash;
    }
    if (options.configHash) {
      if (typeof options.configHash === 'string') {
        this.configHash = options.configHash;
      } else if (typeof options.configHash === 'function') {
        this.configHash = options.configHash(compiler.options);
      }
      compiler.__hardSource_configHash = this.configHash;
      compiler.__hardSource_shortConfigHash = this.configHash.substring(0, 8);
    }
    const configHashInDirectory = options.cacheDirectory.search(/\[confighash\]/) !== -1;
    if (configHashInDirectory && !this.configHash) {
      logMessages.configHashSetButNotUsed(compiler, {
        cacheDirectory: options.cacheDirectory
      });
      active = false;

      function unlockLogger() {
        logger.unlock();
      }
      compilerHooks.watchRun.tap('HardSource - index', unlockLogger);
      compilerHooks.run.tap('HardSource - index', unlockLogger);
      return;
    }

    let environmentHasher = null;
    if (typeof options.environmentHash !== 'undefined') {
      if (options.environmentHash === false) {
        environmentHasher = () => Promise.resolve('');
      } else if (typeof options.environmentHash === 'string') {
        environmentHasher = () => Promise.resolve(options.environmentHash);
      } else if (typeof options.environmentHash === 'object') {
        environmentHasher = () => envHash(options.environmentHash);
        environmentHasher.inputs = () => envHash.inputs(options.environmentHash);
      } else if (typeof options.environmentHash === 'function') {
        environmentHasher = () => Promise.resolve(options.environmentHash());
        if (options.environmentHash.inputs) {
          environmentHasher.inputs = () => Promise.resolve(options.environmentHasher.inputs());
        }
      }
    }
    if (!environmentHasher) {
      environmentHasher = envHash;
    }

    const cacheDirPath = this.getCachePath();
    const cacheAssetDirPath = path.join(cacheDirPath, 'assets');
    const resolveCachePath = path.join(cacheDirPath, 'resolve.json');

    let currentStamp = '';

    const cacheSerializerFactory = new CacheSerializerFactory(compiler);
    let createSerializers = true;
    let cacheRead = false;

    const _this = this;

    pluginCompat.register(compiler, '_hardSourceCreateSerializer', 'sync', ['cacheSerializerFactory', 'cacheDirPath']);
    pluginCompat.register(compiler, '_hardSourceResetCache', 'sync', []);
    pluginCompat.register(compiler, '_hardSourceReadCache', 'asyncParallel', ['relativeHelpers']);
    pluginCompat.register(compiler, '_hardSourceVerifyCache', 'asyncParallel', []);
    pluginCompat.register(compiler, '_hardSourceWriteCache', 'asyncParallel', ['compilation', 'relativeHelpers']);

    if (configHashInDirectory) {
      const PruneCachesSystem = require('./lib/SystemPruneCaches');

      new PruneCachesSystem(path.dirname(cacheDirPath), options.cachePrune).apply(compiler);
    }

    function runReadOrReset(_compiler) {
      logger.unlock();

      if (!active) {
        return Promise.resolve();
      }

      try {
        fs.statSync(cacheAssetDirPath);
      } catch (_) {
        mkdirp.sync(cacheAssetDirPath);
        logMessages.configHashFirstBuild(compiler, {
          cacheDirPath,
          configHash: compiler.__hardSource_configHash
        });
      }
      const start = Date.now();

      if (createSerializers) {
        createSerializers = false;
        try {
          compilerHooks._hardSourceCreateSerializer.call(cacheSerializerFactory, cacheDirPath);
        } catch (err) {
          return Promise.reject(err);
        }
      }

      return Promise.all([fsReadFile(path.join(cacheDirPath, 'stamp'), 'utf8').catch(() => ''), environmentHasher(), fsReadFile(path.join(cacheDirPath, 'version'), 'utf8').catch(() => ''), environmentHasher.inputs ? environmentHasher.inputs() : null]).then(([stamp, hash, versionStamp, hashInputs]) => {
        if (!configHashInDirectory && options.configHash) {
          hash += `_${_this.configHash}`;
        }

        if (hashInputs && !cacheRead) {
          logMessages.environmentInputs(compiler, { inputs: hashInputs });
        }

        currentStamp = hash;
        if (!hash || hash !== stamp || hardSourceVersion !== versionStamp) {
          if (hash && stamp) {
            if (configHashInDirectory) {
              logMessages.environmentHashChanged(compiler);
            } else {
              logMessages.configHashChanged(compiler);
            }
          } else if (versionStamp && hardSourceVersion !== versionStamp) {
            logMessages.hardSourceVersionChanged(compiler);
          }

          // Reset the cache, we can't use it do to an environment change.
          pluginCompat.call(compiler, '_hardSourceResetCache', []);

          return rimraf(cacheDirPath);
        }

        if (cacheRead) {
          return Promise.resolve();
        }
        cacheRead = true;

        logMessages.configHashBuildWith(compiler, {
          cacheDirPath,
          configHash: compiler.__hardSource_configHash
        });

        function contextKeys(compiler, fn) {
          return source => {
            const dest = {};
            Object.keys(source).forEach(key => {
              dest[fn(compiler, key)] = source[key];
            });
            return dest;
          };
        }

        function contextValues(compiler, fn) {
          return source => {
            const dest = {};
            Object.keys(source).forEach(key => {
              const value = fn(compiler, source[key], key);
              if (value) {
                dest[key] = value;
              } else {
                delete dest[key];
              }
            });
            return dest;
          };
        }

        function copyWithDeser(dest, source) {
          Object.keys(source).forEach(key => {
            const item = source[key];
            dest[key] = typeof item === 'string' ? JSON.parse(item) : item;
          });
        }

        return Promise.all([compilerHooks._hardSourceReadCache.promise({
          contextKeys,
          contextValues,
          contextNormalPath,
          contextNormalRequest,
          contextNormalModuleId,
          copyWithDeser
        })]).catch(error => {
          logMessages.serialBadCache(compiler, error);

          return rimraf(cacheDirPath);
        }).then(() => {
          // console.log('cache in', Date.now() - start);
        });
      });
    }

    compilerHooks.watchRun.tapPromise('HardSource - index - readOrReset', runReadOrReset);
    compilerHooks.run.tapPromise('HardSource - index - readOrReset', runReadOrReset);

    const detectModule = path => {
      try {
        require(path);
        return true;
      } catch (_) {
        return false;
      }
    };

    const webpackFeatures = {
      concatenatedModule: detectModule('webpack/lib/optimize/ConcatenatedModule'),
      generator: detectModule('webpack/lib/JavascriptGenerator')
    };

    let schemasVersion = 2;
    if (webpackFeatures.concatenatedModule) {
      schemasVersion = 3;
    }
    if (webpackFeatures.generator) {
      schemasVersion = 4;
    }

    const ArchetypeSystem = require('./lib/SystemArchetype');
    const ParitySystem = require('./lib/SystemParity');

    const AssetCache = require('./lib/CacheAsset');
    const ModuleCache = require('./lib/CacheModule');

    const EnhancedResolveCache = require('./lib/CacheEnhancedResolve');
    const Md5Cache = require('./lib/CacheMd5');
    const ModuleResolverCache = require('./lib/CacheModuleResolver');

    const TransformCompilationPlugin = require('./lib/TransformCompilationPlugin');
    const TransformAssetPlugin = require('./lib/TransformAssetPlugin');
    let TransformConcatenationModulePlugin;
    if (webpackFeatures.concatenatedModule) {
      TransformConcatenationModulePlugin = require('./lib/TransformConcatenationModulePlugin');
    }
    const TransformNormalModulePlugin = require('./lib/TransformNormalModulePlugin');
    const TransformNormalModuleFactoryPlugin = require('./lib/TransformNormalModuleFactoryPlugin');
    const TransformModuleAssetsPlugin = require('./lib/TransformModuleAssetsPlugin');
    const TransformModuleErrorsPlugin = require('./lib/TransformModuleErrorsPlugin');
    const SupportExtractTextPlugin = require('./lib/SupportExtractTextPlugin');
    let SupportMiniCssExtractPlugin;
    let ExcludeMiniCssModulePlugin;
    if (webpackFeatures.generator) {
      SupportMiniCssExtractPlugin = require('./lib/SupportMiniCssExtractPlugin');
      ExcludeMiniCssModulePlugin = require('./lib/ExcludeMiniCssModulePlugin');
    }
    const TransformDependencyBlockPlugin = require('./lib/TransformDependencyBlockPlugin');
    const TransformBasicDependencyPlugin = require('./lib/TransformBasicDependencyPlugin');
    let HardHarmonyDependencyPlugin;
    const TransformSourcePlugin = require('./lib/TransformSourcePlugin');
    const TransformParserPlugin = require('./lib/TransformParserPlugin');
    let TransformGeneratorPlugin;
    if (webpackFeatures.generator) {
      TransformGeneratorPlugin = require('./lib/TransformGeneratorPlugin');
    }

    const ChalkLoggerPlugin = require('./lib/ChalkLoggerPlugin');

    new ArchetypeSystem().apply(compiler);
    new ParitySystem().apply(compiler);

    new AssetCache().apply(compiler);
    new ModuleCache().apply(compiler);

    new EnhancedResolveCache().apply(compiler);
    new Md5Cache().apply(compiler);
    new ModuleResolverCache().apply(compiler);

    new TransformCompilationPlugin().apply(compiler);

    new TransformAssetPlugin().apply(compiler);

    new TransformNormalModulePlugin({
      schema: schemasVersion
    }).apply(compiler);
    new TransformNormalModuleFactoryPlugin().apply(compiler);

    if (TransformConcatenationModulePlugin) {
      new TransformConcatenationModulePlugin().apply(compiler);
    }

    new TransformModuleAssetsPlugin().apply(compiler);
    new TransformModuleErrorsPlugin().apply(compiler);
    new SupportExtractTextPlugin().apply(compiler);

    if (SupportMiniCssExtractPlugin) {
      new SupportMiniCssExtractPlugin().apply(compiler);
      new ExcludeMiniCssModulePlugin().apply(compiler);
    }

    new TransformDependencyBlockPlugin({
      schema: schemasVersion
    }).apply(compiler);

    new TransformBasicDependencyPlugin({
      schema: schemasVersion
    }).apply(compiler);

    new TransformSourcePlugin({
      schema: schemasVersion
    }).apply(compiler);

    new TransformParserPlugin({
      schema: schemasVersion
    }).apply(compiler);

    if (TransformGeneratorPlugin) {
      new TransformGeneratorPlugin({
        schema: schemasVersion
      }).apply(compiler);
    }

    new ChalkLoggerPlugin(this.options.info).apply(compiler);

    function runVerify(_compiler) {
      if (!active) {
        return Promise.resolve();
      }

      const stats = {};
      return pluginCompat.promise(compiler, '_hardSourceVerifyCache', []);
    }

    compilerHooks.watchRun.tapPromise('HardSource - index - verify', runVerify);
    compilerHooks.run.tapPromise('HardSource - index - verify', runVerify);

    let freeze;

    compilerHooks._hardSourceMethods.tap('HardSource - index', methods => {
      freeze = methods.freeze;
    });

    compilerHooks.afterCompile.tapPromise('HardSource - index', compilation => {
      if (!active) {
        return Promise.resolve();
      }

      const startCacheTime = Date.now();

      const identifierPrefix = cachePrefix(compilation);
      if (identifierPrefix !== null) {
        freeze('Compilation', null, compilation, {
          compilation
        });
      }

      return Promise.all([mkdirp(cacheDirPath).then(() => Promise.all([fsWriteFile(path.join(cacheDirPath, 'stamp'), currentStamp, 'utf8'), fsWriteFile(path.join(cacheDirPath, 'version'), hardSourceVersion, 'utf8')])), pluginCompat.promise(compiler, '_hardSourceWriteCache', [compilation, {
        relateNormalPath,
        relateNormalRequest,
        relateNormalModuleId,

        contextNormalPath,
        contextNormalRequest,
        contextNormalModuleId
      }])]).then(() => {
        // console.log('cache out', Date.now() - startCacheTime);
      });
    });
  }
}

module.exports = HardSourceWebpackPlugin;

HardSourceWebpackPlugin.ExcludeModulePlugin = ExcludeModulePlugin;
HardSourceWebpackPlugin.HardSourceLevelDbSerializerPlugin = HardSourceLevelDbSerializerPlugin;
HardSourceWebpackPlugin.LevelDbSerializerPlugin = HardSourceLevelDbSerializerPlugin;
HardSourceWebpackPlugin.SerializerAppend2Plugin = SerializerAppend2Plugin;
HardSourceWebpackPlugin.SerializerAppendPlugin = SerializerAppendPlugin;
HardSourceWebpackPlugin.SerializerCacachePlugin = SerializerCacachePlugin;
HardSourceWebpackPlugin.SerializerJsonPlugin = SerializerJsonPlugin;

Object.defineProperty(HardSourceWebpackPlugin, 'ParallelModulePlugin', {
  get() {
    return require('./lib/ParallelModulePlugin');
  }
});
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImhhcmQtc291cmNlLXdlYnBhY2stcGx1Z2luL2luZGV4LmpzIl0sIm5hbWVzIjpbImNyeXB0byIsInJlcXVpcmUiLCJmcyIsInBhdGgiLCJsb2Rhc2giLCJfbWtkaXJwIiwiX3JpbXJhZiIsIm5vZGVPYmplY3RIYXNoIiwiZmluZENhY2hlRGlyIiwiZW52SGFzaCIsImRlZmF1bHRDb25maWdIYXNoIiwicHJvbWlzaWZ5IiwicmVsYXRlQ29udGV4dCIsInBsdWdpbkNvbXBhdCIsImxvZ01lc3NhZ2VzIiwiTG9nZ2VyRmFjdG9yeSIsImNhY2hlUHJlZml4IiwiQ2FjaGVTZXJpYWxpemVyRmFjdG9yeSIsIkV4Y2x1ZGVNb2R1bGVQbHVnaW4iLCJIYXJkU291cmNlTGV2ZWxEYlNlcmlhbGl6ZXJQbHVnaW4iLCJTZXJpYWxpemVyQXBwZW5kMlBsdWdpbiIsIlNlcmlhbGl6ZXJBcHBlbmRQbHVnaW4iLCJTZXJpYWxpemVyQ2FjYWNoZVBsdWdpbiIsIlNlcmlhbGl6ZXJKc29uUGx1Z2luIiwiaGFyZFNvdXJjZVZlcnNpb24iLCJ2ZXJzaW9uIiwiU3RyaW5nIiwicHJvdG90eXBlIiwicGFkU3RhcnQiLCJ0YXJnZXRMZW5ndGgiLCJwYWRTdHJpbmciLCJsZW5ndGgiLCJyZXBlYXQiLCJzbGljZSIsInJlcXVlc3RIYXNoIiwicmVxdWVzdCIsImNyZWF0ZUhhc2giLCJ1cGRhdGUiLCJkaWdlc3QiLCJoZXhTbGljZSIsIm1rZGlycCIsImNvbnRleHQiLCJzeW5jIiwiYmluZCIsInJpbXJhZiIsImZzUmVhZEZpbGUiLCJyZWFkRmlsZSIsImZzV3JpdGVGaWxlIiwid3JpdGVGaWxlIiwiYnVsa0ZzVGFzayIsImFycmF5IiwiZWFjaCIsIlByb21pc2UiLCJyZXNvbHZlIiwicmVqZWN0Iiwib3BzIiwib3V0IiwiZm9yRWFjaCIsIml0ZW0iLCJpIiwiYmFjayIsImNhbGxiYWNrIiwiZXJyIiwidmFsdWUiLCJlIiwiY29tcGlsZXJDb250ZXh0IiwicmVsYXRlTm9ybWFsUGF0aCIsImNvbnRleHROb3JtYWxQYXRoIiwiY29udGV4dE5vcm1hbFBhdGhTZXQiLCJyZWxhdGVOb3JtYWxSZXF1ZXN0IiwiY29tcGlsZXIiLCJrZXkiLCJzcGxpdCIsIm1hcCIsInN1YmtleSIsImpvaW4iLCJyZWxhdGVOb3JtYWxNb2R1bGVJZCIsImlkIiwic3Vic3RyaW5nIiwiY29udGV4dE5vcm1hbFJlcXVlc3QiLCJjb250ZXh0Tm9ybWFsTW9kdWxlSWQiLCJjb250ZXh0Tm9ybWFsTG9hZGVycyIsImxvYWRlcnMiLCJsb2FkZXIiLCJPYmplY3QiLCJhc3NpZ24iLCJjb250ZXh0Tm9ybWFsUGF0aEFycmF5IiwicGF0aHMiLCJzdWJwYXRoIiwiSGFyZFNvdXJjZVdlYnBhY2tQbHVnaW4iLCJjb25zdHJ1Y3RvciIsIm9wdGlvbnMiLCJnZXRQYXRoIiwiZGlyTmFtZSIsInN1ZmZpeCIsImNvbmZpZ2hhc2hJbmRleCIsInNlYXJjaCIsInJlcGxhY2UiLCJjb25maWdIYXNoIiwiY2FjaGVQYXRoIiwicHJvY2VzcyIsImN3ZCIsImNvbXBpbGVyT3V0cHV0T3B0aW9ucyIsImdldENhY2hlUGF0aCIsImNhY2hlRGlyZWN0b3J5IiwiYXBwbHkiLCJhY3RpdmUiLCJsb2dnZXIiLCJjcmVhdGUiLCJsb2dnZXJDb3JlIiwiZnJvbSIsImxvY2siLCJjb21waWxlckhvb2tzIiwiaG9va3MiLCJjYWNoZSIsIm5hbWUiLCJvdXRwdXQiLCJfX2hhcmRTb3VyY2VfY29uZmlnSGFzaCIsIl9faGFyZFNvdXJjZV9zaG9ydENvbmZpZ0hhc2giLCJjb25maWdIYXNoSW5EaXJlY3RvcnkiLCJjb25maWdIYXNoU2V0QnV0Tm90VXNlZCIsInVubG9ja0xvZ2dlciIsInVubG9jayIsIndhdGNoUnVuIiwidGFwIiwicnVuIiwiZW52aXJvbm1lbnRIYXNoZXIiLCJlbnZpcm9ubWVudEhhc2giLCJpbnB1dHMiLCJjYWNoZURpclBhdGgiLCJjYWNoZUFzc2V0RGlyUGF0aCIsInJlc29sdmVDYWNoZVBhdGgiLCJjdXJyZW50U3RhbXAiLCJjYWNoZVNlcmlhbGl6ZXJGYWN0b3J5IiwiY3JlYXRlU2VyaWFsaXplcnMiLCJjYWNoZVJlYWQiLCJfdGhpcyIsInJlZ2lzdGVyIiwiUHJ1bmVDYWNoZXNTeXN0ZW0iLCJkaXJuYW1lIiwiY2FjaGVQcnVuZSIsInJ1blJlYWRPclJlc2V0IiwiX2NvbXBpbGVyIiwic3RhdFN5bmMiLCJfIiwiY29uZmlnSGFzaEZpcnN0QnVpbGQiLCJzdGFydCIsIkRhdGUiLCJub3ciLCJfaGFyZFNvdXJjZUNyZWF0ZVNlcmlhbGl6ZXIiLCJjYWxsIiwiYWxsIiwiY2F0Y2giLCJ0aGVuIiwic3RhbXAiLCJoYXNoIiwidmVyc2lvblN0YW1wIiwiaGFzaElucHV0cyIsImVudmlyb25tZW50SW5wdXRzIiwiZW52aXJvbm1lbnRIYXNoQ2hhbmdlZCIsImNvbmZpZ0hhc2hDaGFuZ2VkIiwiaGFyZFNvdXJjZVZlcnNpb25DaGFuZ2VkIiwiY29uZmlnSGFzaEJ1aWxkV2l0aCIsImNvbnRleHRLZXlzIiwiZm4iLCJzb3VyY2UiLCJkZXN0Iiwia2V5cyIsImNvbnRleHRWYWx1ZXMiLCJjb3B5V2l0aERlc2VyIiwiSlNPTiIsInBhcnNlIiwiX2hhcmRTb3VyY2VSZWFkQ2FjaGUiLCJwcm9taXNlIiwiZXJyb3IiLCJzZXJpYWxCYWRDYWNoZSIsInRhcFByb21pc2UiLCJkZXRlY3RNb2R1bGUiLCJ3ZWJwYWNrRmVhdHVyZXMiLCJjb25jYXRlbmF0ZWRNb2R1bGUiLCJnZW5lcmF0b3IiLCJzY2hlbWFzVmVyc2lvbiIsIkFyY2hldHlwZVN5c3RlbSIsIlBhcml0eVN5c3RlbSIsIkFzc2V0Q2FjaGUiLCJNb2R1bGVDYWNoZSIsIkVuaGFuY2VkUmVzb2x2ZUNhY2hlIiwiTWQ1Q2FjaGUiLCJNb2R1bGVSZXNvbHZlckNhY2hlIiwiVHJhbnNmb3JtQ29tcGlsYXRpb25QbHVnaW4iLCJUcmFuc2Zvcm1Bc3NldFBsdWdpbiIsIlRyYW5zZm9ybUNvbmNhdGVuYXRpb25Nb2R1bGVQbHVnaW4iLCJUcmFuc2Zvcm1Ob3JtYWxNb2R1bGVQbHVnaW4iLCJUcmFuc2Zvcm1Ob3JtYWxNb2R1bGVGYWN0b3J5UGx1Z2luIiwiVHJhbnNmb3JtTW9kdWxlQXNzZXRzUGx1Z2luIiwiVHJhbnNmb3JtTW9kdWxlRXJyb3JzUGx1Z2luIiwiU3VwcG9ydEV4dHJhY3RUZXh0UGx1Z2luIiwiU3VwcG9ydE1pbmlDc3NFeHRyYWN0UGx1Z2luIiwiRXhjbHVkZU1pbmlDc3NNb2R1bGVQbHVnaW4iLCJUcmFuc2Zvcm1EZXBlbmRlbmN5QmxvY2tQbHVnaW4iLCJUcmFuc2Zvcm1CYXNpY0RlcGVuZGVuY3lQbHVnaW4iLCJIYXJkSGFybW9ueURlcGVuZGVuY3lQbHVnaW4iLCJUcmFuc2Zvcm1Tb3VyY2VQbHVnaW4iLCJUcmFuc2Zvcm1QYXJzZXJQbHVnaW4iLCJUcmFuc2Zvcm1HZW5lcmF0b3JQbHVnaW4iLCJDaGFsa0xvZ2dlclBsdWdpbiIsInNjaGVtYSIsImluZm8iLCJydW5WZXJpZnkiLCJzdGF0cyIsImZyZWV6ZSIsIl9oYXJkU291cmNlTWV0aG9kcyIsIm1ldGhvZHMiLCJhZnRlckNvbXBpbGUiLCJjb21waWxhdGlvbiIsInN0YXJ0Q2FjaGVUaW1lIiwiaWRlbnRpZmllclByZWZpeCIsIm1vZHVsZSIsImV4cG9ydHMiLCJMZXZlbERiU2VyaWFsaXplclBsdWdpbiIsImRlZmluZVByb3BlcnR5IiwiZ2V0Il0sIm1hcHBpbmdzIjoiOztBQUFBLE1BQU1BLFNBQVNDLFFBQVEsUUFBUixDQUFmO0FBQ0EsTUFBTUMsS0FBS0QsUUFBUSxJQUFSLENBQVg7QUFDQSxNQUFNRSxPQUFPRixRQUFRLE1BQVIsQ0FBYjs7QUFFQSxNQUFNRyxTQUFTSCxRQUFRLFFBQVIsQ0FBZjtBQUNBLE1BQU1JLFVBQVVKLFFBQVEsUUFBUixDQUFoQjtBQUNBLE1BQU1LLFVBQVVMLFFBQVEsUUFBUixDQUFoQjtBQUNBLE1BQU1NLGlCQUFpQk4sUUFBUSxrQkFBUixDQUF2QjtBQUNBLE1BQU1PLGVBQWVQLFFBQVEsZ0JBQVIsQ0FBckI7O0FBRUEsTUFBTVEsVUFBVVIsd0JBQWhCO0FBQ0EsTUFBTVMsb0JBQW9C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QixFQUErQix1QkFBL0IsRUFBd0QsQ0FDdERnSixXQURzRCxFQUV0RDtBQUNFcEosd0JBREY7QUFFRUcsMkJBRkY7QUFHRU8sNEJBSEY7O0FBS0VULHlCQUxGO0FBTUVZLDRCQU5GO0FBT0VDO0FBUEYsT0FGc0QsQ0FBeEQsQ0FYaUIsQ0FBWixFQXVCSnlFLElBdkJJLENBdUJDLE1BQU07QUFDWjtBQUNELE9BekJNLENBQVA7QUEwQkQsS0F4Q0Q7QUF5Q0Q7QUF4YzJCOztBQTJjOUJnRSxPQUFPQyxPQUFQLEdBQWlCakksdUJBQWpCOztBQUVBQSx3QkFBd0J2RSxtQkFBeEIsR0FBOENBLG1CQUE5QztBQUNBdUUsd0JBQXdCdEUsaUNBQXhCLEdBQTREQSxpQ0FBNUQ7QUFDQXNFLHdCQUF3QmtJLHVCQUF4QixHQUFrRHhNLGlDQUFsRDtBQUNBc0Usd0JBQXdCckUsdUJBQXhCLEdBQWtEQSx1QkFBbEQ7QUFDQXFFLHdCQUF3QnBFLHNCQUF4QixHQUFpREEsc0JBQWpEO0FBQ0FvRSx3QkFBd0JuRSx1QkFBeEIsR0FBa0RBLHVCQUFsRDtBQUNBbUUsd0JBQXdCbEUsb0JBQXhCLEdBQStDQSxvQkFBL0M7O0FBRUE2RCxPQUFPd0ksY0FBUCxDQUFzQm5JLHVCQUF0QixFQUErQyxzQkFBL0MsRUFBdUU7QUFDckVvSSxRQUFNO0FBQ0osV0FBTzVOLHFDQUFQO0FBQ0Q7QUFIb0UsQ0FBdkUiLCJmaWxlIjoiaGFyZC1zb3VyY2Utd2VicGFjay1wbHVnaW4vaW5kZXguanMiLCJzb3VyY2VzQ29udGVudCI6WyJjb25zdCBjcnlwdG8gPSByZXF1aXJlKCdjcnlwdG8nKTtcbmNvbnN0IGZzID0gcmVxdWlyZSgnZnMnKTtcbmNvbnN0IHBhdGggPSByZXF1aXJlKCdwYXRoJyk7XG5cbmNvbnN0IGxvZGFzaCA9IHJlcXVpcmUoJ2xvZGFzaCcpO1xuY29uc3QgX21rZGlycCA9IHJlcXVpcmUoJ21rZGlycCcpO1xuY29uc3QgX3JpbXJhZiA9IHJlcXVpcmUoJ3JpbXJhZicpO1xuY29uc3Qgbm9kZU9iamVjdEhhc2ggPSByZXF1aXJlKCdub2RlLW9iamVjdC1oYXNoJyk7XG5jb25zdCBmaW5kQ2FjaGVEaXIgPSByZXF1aXJlKCdmaW5kLWNhY2hlLWRpcicpO1xuXG5jb25zdCBlbnZIYXNoID0gcmVxdWlyZSgnLi9saWIvZW52SGFzaCcpO1xuY29uc3QgZGVmYXVsdENvbmZpZ0hhc2ggPSByZXF1aXJlKCcuL2xpYi9kZWZhdWx0Q29uZmlnSGFzaCcpO1xuY29uc3QgcHJvbWlzaWZ5ID0gcmVxdWlyZSgnLi9saWIvdXRpbC9wcm9taXNpZnknKTtcbmNvbnN0IHJlbGF0ZUNvbnRleHQgPSByZXF1aXJlKCcuL2xpYi91dGlsL3JlbGF0ZS1jb250ZXh0Jyk7XG5jb25zdCBwbHVnaW5Db21wYXQgPSByZXF1aXJlKCcuL2xpYi91dGlsL3BsdWdpbi1jb21wYXQnKTtcbmNvbnN0IGxvZ01lc3NhZ2VzID0gcmVxdWlyZSgnLi9saWIvdXRpbC9sb2ctbWVzc2FnZXMnKTtcblxuY29uc3QgTG9nZ2VyRmFjdG9yeSA9IHJlcXVpcmUoJy4vbGliL2xvZ2dlckZhY3RvcnknKTtcblxuY29uc3QgY2FjaGVQcmVmaXggPSByZXF1aXJlKCcuL2xpYi91dGlsJykuY2FjaGVQcmVmaXg7XG5cbmNvbnN0IENhY2hlU2VyaWFsaXplckZhY3RvcnkgPSByZXF1aXJlKCcuL2xpYi9DYWNoZVNlcmlhbGl6ZXJGYWN0b3J5Jyk7XG5jb25zdCBFeGNsdWRlTW9kdWxlUGx1Z2luID0gcmVxdWlyZSgnLi9saWIvRXhjbHVkZU1vZHVsZVBsdWdpbicpO1xuY29uc3QgSGFyZFNvdXJjZUxldmVsRGJTZXJpYWxpemVyUGx1Z2luID0gcmVxdWlyZSgnLi9saWIvU2VyaWFsaXplckxldmVsZGJQbHVnaW4nKTtcbmNvbnN0IFNlcmlhbGl6ZXJBcHBlbmQyUGx1Z2luID0gcmVxdWlyZSgnLi9saWIvU2VyaWFsaXplckFwcGVuZDJQbHVnaW4nKTtcbmNvbnN0IFNlcmlhbGl6ZXJBcHBlbmRQbHVnaW4gPSByZXF1aXJlKCcuL2xpYi9TZXJpYWxpemVyQXBwZW5kUGx1Z2luJyk7XG5jb25zdCBTZXJpYWxpemVyQ2FjYWNoZVBsdWdpbiA9IHJlcXVpcmUoJy4vbGliL1NlcmlhbGl6ZXJDYWNhY2hlUGx1Z2luJyk7XG5jb25zdCBTZXJpYWxpemVySnNvblBsdWdpbiA9IHJlcXVpcmUoJy4vbGliL1NlcmlhbGl6ZXJKc29uUGx1Z2luJyk7XG5cbmNvbnN0IGhhcmRTb3VyY2VWZXJzaW9uID0gcmVxdWlyZSgnLi9wYWNrYWdlLmpzb24nKS52ZXJzaW9uO1xuXG5cbi8qXG4gKiBBZGQgYSBTdHJpbmcucHJvdG90eXBlLnBhZFN0YXJ0IHBvbHlmaWxsIGZvciBub2RlIDYgY29tcGF0YWJpbGl0eVxuICogaHR0cHM6Ly9naXRodWIuY29tL3V4aXR0ZW4vcG9seWZpbGwvYmxvYi9tYXN0ZXIvc3RyaW5nLnBvbHlmaWxsLmpzXG4gKiBodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi1VUy9kb2NzL1dlYi9KYXZhU2NyaXB0L1JlZmVyZW5jZS9HbG9iYWxfT2JqZWN0cy9TdHJpbmcvcGFkU3RhcnRcbiAqL1xuaWYgKCFTdHJpbmcucHJvdG90eXBlLnBhZFN0YXJ0KSB7XG4gIFN0cmluZy5wcm90b3R5cGUucGFkU3RhcnQgPSBmdW5jdGlvbiBwYWRTdGFydCh0YXJnZXRMZW5ndGgscGFkU3RyaW5nKSB7XG4gICAgdGFyZ2V0TGVuZ3RoID0gdGFyZ2V0TGVuZ3RoPj4wOyAvL3RydW5jYXRlIGlmIG51bWJlciBvciBjb252ZXJ0IG5vbi1udW1iZXIgdG8gMDtcbiAgICBwYWRTdHJpbmcgPSBTdHJpbmcoKHR5cGVvZiBwYWRTdHJpbmcgIT09ICd1bmRlZmluZWQnID8gcGFkU3RyaW5nIDogJyAnKSk7XG4gICAgaWYgKHRoaXMubGVuZ3RoID4gdGFyZ2V0TGVuZ3RoKSB7XG4gICAgICByZXR1cm4gU3RyaW5nKHRoaXMpO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIHRhcmdldExlbmd0aCA9IHRhcmdldExlbmd0aC10aGlzLmxlbmd0aDtcbiAgICAgIGlmICh0YXJnZXRMZW5ndGggPiBwYWRTdHJpbmcubGVuZ3RoKSB7XG4gICAgICAgIHBhZFN0cmluZyArPSBwYWRTdHJpbmcucmVwZWF0KHRhcmdldExlbmd0aC9wYWRTdHJpbmcubGVuZ3RoKTsgLy9hcHBlbmQgdG8gb3JpZ2luYWwgdG8gZW5zdXJlIHdlIGFyZSBsb25nZXIgdGhhbiBuZWVkZWRcbiAgICAgIH1cbiAgICAgIHJldHVybiBwYWRTdHJpbmcuc2xpY2UoMCx0YXJnZXRMZW5ndGgpICsgU3RyaW5nKHRoaXMpO1xuICAgIH1cbiAgfTtcbn1cblxuZnVuY3Rpb24gcmVxdWVzdEhhc2gocmVxdWVzdCkge1xuICByZXR1cm4gY3J5cHRvXG4gICAgLmNyZWF0ZUhhc2goJ3NoYTEnKVxuICAgIC51cGRhdGUocmVxdWVzdClcbiAgICAuZGlnZXN0KClcbiAgICAuaGV4U2xpY2UoKTtcbn1cblxuY29uc3QgbWtkaXJwID0gcHJvbWlzaWZ5KF9ta2RpcnAsIHsgY29udGV4dDogX21rZGlycCB9KTtcbm1rZGlycC5zeW5jID0gX21rZGlycC5zeW5jLmJpbmQoX21rZGlycCk7XG5jb25zdCByaW1yYWYgPSBwcm9taXNpZnkoX3JpbXJhZik7XG5yaW1yYWYuc3luYyA9IF9yaW1yYWYuc3luYy5iaW5kKF9yaW1yYWYpO1xuY29uc3QgZnNSZWFkRmlsZSA9IHByb21pc2lmeShmcy5yZWFkRmlsZSwgeyBjb250ZXh0OiBmcyB9KTtcbmNvbnN0IGZzV3JpdGVGaWxlID0gcHJvbWlzaWZ5KGZzLndyaXRlRmlsZSwgeyBjb250ZXh0OiBmcyB9KTtcblxuY29uc3QgYnVsa0ZzVGFzayA9IChhcnJheSwgZWFjaCkgPT5cbiAgbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgIGxldCBvcHMgPSAwO1xuICAgIGNvbnN0IG91dCA9IFtdO1xuICAgIGFycmF5LmZvckVhY2goKGl0ZW0sIGkpID0+IHtcbiAgICAgIG91dFtpXSA9IGVhY2goaXRlbSwgKGJhY2ssIGNhbGxiYWNrKSA9PiB7XG4gICAgICAgIG9wcysrO1xuICAgICAgICByZXR1cm4gKGVyciwgdmFsdWUpID0+IHtcbiAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgb3V0W2ldID0gYmFjayhlcnIsIHZhbHVlLCBvdXRbaV0pO1xuICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIHJldHVybiByZWplY3QoZSk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgb3BzLS07XG4gICAgICAgICAgaWYgKG9wcyA9PT0gMCkge1xuICAgICAgICAgICAgcmVzb2x2ZShvdXQpO1xuICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgIH0pO1xuICAgIH0pO1xuICAgIGlmIChvcHMgPT09IDApIHtcbiAgICAgIHJlc29sdmUob3V0KTtcbiAgICB9XG4gIH0pO1xuXG5jb25zdCBjb21waWxlckNvbnRleHQgPSByZWxhdGVDb250ZXh0LmNvbXBpbGVyQ29udGV4dDtcbmNvbnN0IHJlbGF0ZU5vcm1hbFBhdGggPSByZWxhdGVDb250ZXh0LnJlbGF0ZU5vcm1hbFBhdGg7XG5jb25zdCBjb250ZXh0Tm9ybWFsUGF0aCA9IHJlbGF0ZUNvbnRleHQuY29udGV4dE5vcm1hbFBhdGg7XG5jb25zdCBjb250ZXh0Tm9ybWFsUGF0aFNldCA9IHJlbGF0ZUNvbnRleHQuY29udGV4dE5vcm1hbFBhdGhTZXQ7XG5cbmZ1bmN0aW9uIHJlbGF0ZU5vcm1hbFJlcXVlc3QoY29tcGlsZXIsIGtleSkge1xuICByZXR1cm4ga2V5XG4gICAgLnNwbGl0KCchJylcbiAgICAubWFwKHN1YmtleSA9PiByZWxhdGVOb3JtYWxQYXRoKGNvbXBpbGVyLCBzdWJrZXkpKVxuICAgIC5qb2luKCchJyk7XG59XG5cbmZ1bmN0aW9uIHJlbGF0ZU5vcm1hbE1vZHVsZUlkKGNvbXBpbGVyLCBpZCkge1xuICByZXR1cm4gaWQuc3Vic3RyaW5nKDAsIDI0KSArIHJlbGF0ZU5vcm1hbFJlcXVlc3QoY29tcGlsZXIsIGlkLnN1YnN0cmluZygyNCkpO1xufVxuXG5mdW5jdGlvbiBjb250ZXh0Tm9ybWFsUmVxdWVzdChjb21waWxlciwga2V5KSB7XG4gIHJldHVybiBrZXlcbiAgICAuc3BsaXQoJyEnKVxuICAgIC5tYXAoc3Via2V5ID0+IGNvbnRleHROb3JtYWxQYXRoKGNvbXBpbGVyLCBzdWJrZXkpKVxuICAgIC5qb2luKCchJyk7XG59XG5cbmZ1bmN0aW9uIGNvbnRleHROb3JtYWxNb2R1bGVJZChjb21waWxlciwgaWQpIHtcbiAgcmV0dXJuIGlkLnN1YnN0cmluZygwLCAyNCkgKyBjb250ZXh0Tm9ybWFsUmVxdWVzdChjb21waWxlciwgaWQuc3Vic3RyaW5nKDI0KSk7XG59XG5cbmZ1bmN0aW9uIGNvbnRleHROb3JtYWxMb2FkZXJzKGNvbXBpbGVyLCBsb2FkZXJzKSB7XG4gIHJldHVybiBsb2FkZXJzLm1hcChsb2FkZXIgPT5cbiAgICBPYmplY3QuYXNzaWduKHt9LCBsb2FkZXIsIHtcbiAgICAgIGxvYWRlcjogY29udGV4dE5vcm1hbFBhdGgoY29tcGlsZXIsIGxvYWRlci5sb2FkZXIpLFxuICAgIH0pLFxuICApO1xufVxuXG5mdW5jdGlvbiBjb250ZXh0Tm9ybWFsUGF0aEFycmF5KGNvbXBpbGVyLCBwYXRocykge1xuICByZXR1cm4gcGF0aHMubWFwKHN1YnBhdGggPT4gY29udGV4dE5vcm1hbFBhdGgoY29tcGlsZXIsIHN1YnBhdGgpKTtcbn1cblxuY2xhc3MgSGFyZFNvdXJjZVdlYnBhY2tQbHVnaW4ge1xuICBjb25zdHJ1Y3RvcihvcHRpb25zKSB7XG4gICAgdGhpcy5vcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgfVxuXG4gIGdldFBhdGgoZGlyTmFtZSwgc3VmZml4KSB7XG4gICAgY29uc3QgY29uZmlnaGFzaEluZGV4ID0gZGlyTmFtZS5zZWFyY2goL1xcW2NvbmZpZ2hhc2hcXF0vKTtcbiAgICBpZiAoY29uZmlnaGFzaEluZGV4ICE9PSAtMSkge1xuICAgICAgZGlyTmFtZSA9IGRpck5hbWUucmVwbGFjZSgvXFxbY29uZmlnaGFzaFxcXS8sIHRoaXMuY29uZmlnSGFzaCk7XG4gICAgfVxuICAgIGxldCBjYWNoZVBhdGggPSBwYXRoLnJlc29sdmUoXG4gICAgICBwcm9jZXNzLmN3ZCgpLFxuICAgICAgdGhpcy5jb21waWxlck91dHB1dE9wdGlvbnMucGF0aCxcbiAgICAgIGRpck5hbWUsXG4gICAgKTtcbiAgICBpZiAoc3VmZml4KSB7XG4gICAgICBjYWNoZVBhdGggPSBwYXRoLmpvaW4oY2FjaGVQYXRoLCBzdWZmaXgpO1xuICAgIH1cbiAgICByZXR1cm4gY2FjaGVQYXRoO1xuICB9XG5cbiAgZ2V0Q2FjaGVQYXRoKHN1ZmZpeCkge1xuICAgIHJldHVybiB0aGlzLmdldFBhdGgodGhpcy5vcHRpb25zLmNhY2hlRGlyZWN0b3J5LCBzdWZmaXgpO1xuICB9XG5cbiAgYXBwbHkoY29tcGlsZXIpIHtcbiAgICBjb25zdCBvcHRpb25zID0gdGhpcy5vcHRpb25zO1xuICAgIGxldCBhY3RpdmUgPSB0cnVlO1xuXG4gICAgY29uc3QgbG9nZ2VyID0gbmV3IExvZ2dlckZhY3RvcnkoY29tcGlsZXIpLmNyZWF0ZSgpO1xuXG4gICAgY29uc3QgbG9nZ2VyQ29yZSA9IGxvZ2dlci5mcm9tKCdjb3JlJyk7XG4gICAgbG9nZ2VyLmxvY2soKTtcblxuICAgIGNvbnN0IGNvbXBpbGVySG9va3MgPSBwbHVnaW5Db21wYXQuaG9va3MoY29tcGlsZXIpO1xuXG4gICAgaWYgKCFjb21waWxlci5vcHRpb25zLmNhY2hlKSB7XG4gICAgICBjb21waWxlci5vcHRpb25zLmNhY2hlID0gdHJ1ZTtcbiAgICB9XG5cbiAgICBpZiAoIW9wdGlvbnMuY2FjaGVEaXJlY3RvcnkpIHtcbiAgICAgIG9wdGlvbnMuY2FjaGVEaXJlY3RvcnkgPSBwYXRoLnJlc29sdmUoXG4gICAgICAgIGZpbmRDYWNoZURpcih7XG4gICAgICAgICAgbmFtZTogJ2hhcmQtc291cmNlJyxcbiAgICAgICAgICBjd2Q6IGNvbXBpbGVyLm9wdGlvbnMuY29udGV4dCB8fCBwcm9jZXNzLmN3ZCgpLFxuICAgICAgICB9KSxcbiAgICAgICAgJ1tjb25maWdoYXNoXScsXG4gICAgICApO1xuICAgIH1cblxuICAgIHRoaXMuY29tcGlsZXJPdXRwdXRPcHRpb25zID0gY29tcGlsZXIub3B0aW9ucy5vdXRwdXQ7XG4gICAgaWYgKCFvcHRpb25zLmNvbmZpZ0hhc2gpIHtcbiAgICAgIG9wdGlvbnMuY29uZmlnSGFzaCA9IGRlZmF1bHRDb25maWdIYXNoO1xuICAgIH1cbiAgICBpZiAob3B0aW9ucy5jb25maWdIYXNoKSB7XG4gICAgICBpZiAodHlwZW9mIG9wdGlvbnMuY29uZmlnSGFzaCA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgdGhpcy5jb25maWdIYXNoID0gb3B0aW9ucy5jb25maWdIYXNoO1xuICAgICAgfSBlbHNlIGlmICh0eXBlb2Ygb3B0aW9ucy5jb25maWdIYXNoID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIHRoaXMuY29uZmlnSGFzaCA9IG9wdGlvbnMuY29uZmlnSGFzaChjb21waWxlci5vcHRpb25zKTtcbiAgICAgIH1cbiAgICAgIGNvbXBpbGVyLl9faGFyZFNvdXJjZV9jb25maWdIYXNoID0gdGhpcy5jb25maWdIYXNoO1xuICAgICAgY29tcGlsZXIuX19oYXJkU291cmNlX3Nob3J0Q29uZmlnSGFzaCA9IHRoaXMuY29uZmlnSGFzaC5zdWJzdHJpbmcoMCwgOCk7XG4gICAgfVxuICAgIGNvbnN0IGNvbmZpZ0hhc2hJbkRpcmVjdG9yeSA9XG4gICAgICBvcHRpb25zLmNhY2hlRGlyZWN0b3J5LnNlYXJjaCgvXFxbY29uZmlnaGFzaFxcXS8pICE9PSAtMTtcbiAgICBpZiAoY29uZmlnSGFzaEluRGlyZWN0b3J5ICYmICF0aGlzLmNvbmZpZ0hhc2gpIHtcbiAgICAgIGxvZ01lc3NhZ2VzLmNvbmZpZ0hhc2hTZXRCdXROb3RVc2VkKGNvbXBpbGVyLCB7XG4gICAgICAgIGNhY2hlRGlyZWN0b3J5OiBvcHRpb25zLmNhY2hlRGlyZWN0b3J5LFxuICAgICAgfSk7XG4gICAgICBhY3RpdmUgPSBmYWxzZTtcblxuICAgICAgZnVuY3Rpb24gdW5sb2NrTG9nZ2VyKCkge1xuICAgICAgICBsb2dnZXIudW5sb2NrKCk7XG4gICAgICB9XG4gICAgICBjb21waWxlckhvb2tzLndhdGNoUnVuLnRhcCgnSGFyZFNvdXJjZSAtIGluZGV4JywgdW5sb2NrTG9nZ2VyKTtcbiAgICAgIGNvbXBpbGVySG9va3MucnVuLnRhcCgnSGFyZFNvdXJjZSAtIGluZGV4JywgdW5sb2NrTG9nZ2VyKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBsZXQgZW52aXJvbm1lbnRIYXNoZXIgPSBudWxsO1xuICAgIGlmICh0eXBlb2Ygb3B0aW9ucy5lbnZpcm9ubWVudEhhc2ggIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICBpZiAob3B0aW9ucy5lbnZpcm9ubWVudEhhc2ggPT09IGZhbHNlKSB7XG4gICAgICAgIGVudmlyb25tZW50SGFzaGVyID0gKCkgPT4gUHJvbWlzZS5yZXNvbHZlKCcnKTtcbiAgICAgIH0gZWxzZSBpZiAodHlwZW9mIG9wdGlvbnMuZW52aXJvbm1lbnRIYXNoID09PSAnc3RyaW5nJykge1xuICAgICAgICBlbnZpcm9ubWVudEhhc2hlciA9ICgpID0+IFByb21pc2UucmVzb2x2ZShvcHRpb25zLmVudmlyb25tZW50SGFzaCk7XG4gICAgICB9IGVsc2UgaWYgKHR5cGVvZiBvcHRpb25zLmVudmlyb25tZW50SGFzaCA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgZW52aXJvbm1lbnRIYXNoZXIgPSAoKSA9PiBlbnZIYXNoKG9wdGlvbnMuZW52aXJvbm1lbnRIYXNoKTtcbiAgICAgICAgZW52aXJvbm1lbnRIYXNoZXIuaW5wdXRzID0gKCkgPT5cbiAgICAgICAgICBlbnZIYXNoLmlucHV0cyhvcHRpb25zLmVudmlyb25tZW50SGFzaCk7XG4gICAgICB9IGVsc2UgaWYgKHR5cGVvZiBvcHRpb25zLmVudmlyb25tZW50SGFzaCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICBlbnZpcm9ubWVudEhhc2hlciA9ICgpID0+IFByb21pc2UucmVzb2x2ZShvcHRpb25zLmVudmlyb25tZW50SGFzaCgpKTtcbiAgICAgICAgaWYgKG9wdGlvbnMuZW52aXJvbm1lbnRIYXNoLmlucHV0cykge1xuICAgICAgICAgIGVudmlyb25tZW50SGFzaGVyLmlucHV0cyA9ICgpID0+XG4gICAgICAgICAgICBQcm9taXNlLnJlc29sdmUob3B0aW9ucy5lbnZpcm9ubWVudEhhc2hlci5pbnB1dHMoKSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKCFlbnZpcm9ubWVudEhhc2hlcikge1xuICAgICAgZW52aXJvbm1lbnRIYXNoZXIgPSBlbnZIYXNoO1xuICAgIH1cblxuICAgIGNvbnN0IGNhY2hlRGlyUGF0aCA9IHRoaXMuZ2V0Q2FjaGVQYXRoKCk7XG4gICAgY29uc3QgY2FjaGVBc3NldERpclBhdGggPSBwYXRoLmpvaW4oY2FjaGVEaXJQYXRoLCAnYXNzZXRzJyk7XG4gICAgY29uc3QgcmVzb2x2ZUNhY2hlUGF0aCA9IHBhdGguam9pbihjYWNoZURpclBhdGgsICdyZXNvbHZlLmpzb24nKTtcblxuICAgIGxldCBjdXJyZW50U3RhbXAgPSAnJztcblxuICAgIGNvbnN0IGNhY2hlU2VyaWFsaXplckZhY3RvcnkgPSBuZXcgQ2FjaGVTZXJpYWxpemVyRmFjdG9yeShjb21waWxlcik7XG4gICAgbGV0IGNyZWF0ZVNlcmlhbGl6ZXJzID0gdHJ1ZTtcbiAgICBsZXQgY2FjaGVSZWFkID0gZmFsc2U7XG5cbiAgICBjb25zdCBfdGhpcyA9IHRoaXM7XG5cbiAgICBwbHVnaW5Db21wYXQucmVnaXN0ZXIoY29tcGlsZXIsICdfaGFyZFNvdXJjZUNyZWF0ZVNlcmlhbGl6ZXInLCAnc3luYycsIFtcbiAgICAgICdjYWNoZVNlcmlhbGl6ZXJGYWN0b3J5JyxcbiAgICAgICdjYWNoZURpclBhdGgnLFxuICAgIF0pO1xuICAgIHBsdWdpbkNvbXBhdC5yZWdpc3Rlcihjb21waWxlciwgJ19oYXJkU291cmNlUmVzZXRDYWNoZScsICdzeW5jJywgW10pO1xuICAgIHBsdWdpbkNvbXBhdC5yZWdpc3Rlcihjb21waWxlciwgJ19oYXJkU291cmNlUmVhZENhY2hlJywgJ2FzeW5jUGFyYWxsZWwnLCBbXG4gICAgICAncmVsYXRpdmVIZWxwZXJzJyxcbiAgICBdKTtcbiAgICBwbHVnaW5Db21wYXQucmVnaXN0ZXIoXG4gICAgICBjb21waWxlcixcbiAgICAgICdfaGFyZFNvdXJjZVZlcmlmeUNhY2hlJyxcbiAgICAgICdhc3luY1BhcmFsbGVsJyxcbiAgICAgIFtdLFxuICAgICk7XG4gICAgcGx1Z2luQ29tcGF0LnJlZ2lzdGVyKGNvbXBpbGVyLCAnX2hhcmRTb3VyY2VXcml0ZUNhY2hlJywgJ2FzeW5jUGFyYWxsZWwnLCBbXG4gICAgICAnY29tcGlsYXRpb24nLFxuICAgICAgJ3JlbGF0aXZlSGVscGVycycsXG4gICAgXSk7XG5cbiAgICBpZiAoY29uZmlnSGFzaEluRGlyZWN0b3J5KSB7XG4gICAgICBjb25zdCBQcnVuZUNhY2hlc1N5c3RlbSA9IHJlcXVpcmUoJy4vbGliL1N5c3RlbVBydW5lQ2FjaGVzJyk7XG5cbiAgICAgIG5ldyBQcnVuZUNhY2hlc1N5c3RlbShcbiAgICAgICAgcGF0aC5kaXJuYW1lKGNhY2hlRGlyUGF0aCksXG4gICAgICAgIG9wdGlvbnMuY2FjaGVQcnVuZSxcbiAgICAgICkuYXBwbHkoY29tcGlsZXIpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHJ1blJlYWRPclJlc2V0KF9jb21waWxlcikge1xuICAgICAgbG9nZ2VyLnVubG9jaygpO1xuXG4gICAgICBpZiAoIWFjdGl2ZSkge1xuICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCk7XG4gICAgICB9XG5cbiAgICAgIHRyeSB7XG4gICAgICAgIGZzLnN0YXRTeW5jKGNhY2hlQXNzZXREaXJQYXRoKTtcbiAgICAgIH0gY2F0Y2ggKF8pIHtcbiAgICAgICAgbWtkaXJwLnN5bmMoY2FjaGVBc3NldERpclBhdGgpO1xuICAgICAgICBsb2dNZXNzYWdlcy5jb25maWdIYXNoRmlyc3RCdWlsZChjb21waWxlciwge1xuICAgICAgICAgIGNhY2hlRGlyUGF0aCxcbiAgICAgICAgICBjb25maWdIYXNoOiBjb21waWxlci5fX2hhcmRTb3VyY2VfY29uZmlnSGFzaCxcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgICBjb25zdCBzdGFydCA9IERhdGUubm93KCk7XG5cbiAgICAgIGlmIChjcmVhdGVTZXJpYWxpemVycykge1xuICAgICAgICBjcmVhdGVTZXJpYWxpemVycyA9IGZhbHNlO1xuICAgICAgICB0cnkge1xuICAgICAgICAgIGNvbXBpbGVySG9va3MuX2hhcmRTb3VyY2VDcmVhdGVTZXJpYWxpemVyLmNhbGwoXG4gICAgICAgICAgICBjYWNoZVNlcmlhbGl6ZXJGYWN0b3J5LFxuICAgICAgICAgICAgY2FjaGVEaXJQYXRoLFxuICAgICAgICAgICk7XG4gICAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICAgIHJldHVybiBQcm9taXNlLnJlamVjdChlcnIpO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBQcm9taXNlLmFsbChbXG4gICAgICAgIGZzUmVhZEZpbGUocGF0aC5qb2luKGNhY2hlRGlyUGF0aCwgJ3N0YW1wJyksICd1dGY4JykuY2F0Y2goKCkgPT4gJycpLFxuXG4gICAgICAgIGVudmlyb25tZW50SGFzaGVyKCksXG5cbiAgICAgICAgZnNSZWFkRmlsZShwYXRoLmpvaW4oY2FjaGVEaXJQYXRoLCAndmVyc2lvbicpLCAndXRmOCcpLmNhdGNoKCgpID0+ICcnKSxcblxuICAgICAgICBlbnZpcm9ubWVudEhhc2hlci5pbnB1dHMgPyBlbnZpcm9ubWVudEhhc2hlci5pbnB1dHMoKSA6IG51bGwsXG4gICAgICBdKS50aGVuKChbc3RhbXAsIGhhc2gsIHZlcnNpb25TdGFtcCwgaGFzaElucHV0c10pID0+IHtcbiAgICAgICAgaWYgKCFjb25maWdIYXNoSW5EaXJlY3RvcnkgJiYgb3B0aW9ucy5jb25maWdIYXNoKSB7XG4gICAgICAgICAgaGFzaCArPSBgXyR7X3RoaXMuY29uZmlnSGFzaH1gO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGhhc2hJbnB1dHMgJiYgIWNhY2hlUmVhZCkge1xuICAgICAgICAgIGxvZ01lc3NhZ2VzLmVudmlyb25tZW50SW5wdXRzKGNvbXBpbGVyLCB7IGlucHV0czogaGFzaElucHV0cyB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGN1cnJlbnRTdGFtcCA9IGhhc2g7XG4gICAgICAgIGlmICghaGFzaCB8fCBoYXNoICE9PSBzdGFtcCB8fCBoYXJkU291cmNlVmVyc2lvbiAhPT0gdmVyc2lvblN0YW1wKSB7XG4gICAgICAgICAgaWYgKGhhc2ggJiYgc3RhbXApIHtcbiAgICAgICAgICAgIGlmIChjb25maWdIYXNoSW5EaXJlY3RvcnkpIHtcbiAgICAgICAgICAgICAgbG9nTWVzc2FnZXMuZW52aXJvbm1lbnRIYXNoQ2hhbmdlZChjb21waWxlcik7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBsb2dNZXNzYWdlcy5jb25maWdIYXNoQ2hhbmdlZChjb21waWxlcik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSBlbHNlIGlmICh2ZXJzaW9uU3RhbXAgJiYgaGFyZFNvdXJjZVZlcnNpb24gIT09IHZlcnNpb25TdGFtcCkge1xuICAgICAgICAgICAgbG9nTWVzc2FnZXMuaGFyZFNvdXJjZVZlcnNpb25DaGFuZ2VkKGNvbXBpbGVyKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICAvLyBSZXNldCB0aGUgY2FjaGUsIHdlIGNhbid0IHVzZSBpdCBkbyB0byBhbiBlbnZpcm9ubWVudCBjaGFuZ2UuXG4gICAgICAgICAgcGx1Z2luQ29tcGF0LmNhbGwoY29tcGlsZXIsICdfaGFyZFNvdXJjZVJlc2V0Q2FjaGUnLCBbXSk7XG5cbiAgICAgICAgICByZXR1cm4gcmltcmFmKGNhY2hlRGlyUGF0aCk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoY2FjaGVSZWFkKSB7XG4gICAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpO1xuICAgICAgICB9XG4gICAgICAgIGNhY2hlUmVhZCA9IHRydWU7XG5cbiAgICAgICAgbG9nTWVzc2FnZXMuY29uZmlnSGFzaEJ1aWxkV2l0aChjb21waWxlciwge1xuICAgICAgICAgIGNhY2hlRGlyUGF0aCxcbiAgICAgICAgICBjb25maWdIYXNoOiBjb21waWxlci5fX2hhcmRTb3VyY2VfY29uZmlnSGFzaCxcbiAgICAgICAgfSk7XG5cbiAgICAgICAgZnVuY3Rpb24gY29udGV4dEtleXMoY29tcGlsZXIsIGZuKSB7XG4gICAgICAgICAgcmV0dXJuIHNvdXJjZSA9PiB7XG4gICAgICAgICAgICBjb25zdCBkZXN0ID0ge307XG4gICAgICAgICAgICBPYmplY3Qua2V5cyhzb3VyY2UpLmZvckVhY2goa2V5ID0+IHtcbiAgICAgICAgICAgICAgZGVzdFtmbihjb21waWxlciwga2V5KV0gPSBzb3VyY2Vba2V5XTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgcmV0dXJuIGRlc3Q7XG4gICAgICAgICAgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGNvbnRleHRWYWx1ZXMoY29tcGlsZXIsIGZuKSB7XG4gICAgICAgICAgcmV0dXJuIHNvdXJjZSA9PiB7XG4gICAgICAgICAgICBjb25zdCBkZXN0ID0ge307XG4gICAgICAgICAgICBPYmplY3Qua2V5cyhzb3VyY2UpLmZvckVhY2goa2V5ID0+IHtcbiAgICAgICAgICAgICAgY29uc3QgdmFsdWUgPSBmbihjb21waWxlciwgc291cmNlW2tleV0sIGtleSk7XG4gICAgICAgICAgICAgIGlmICh2YWx1ZSkge1xuICAgICAgICAgICAgICAgIGRlc3Rba2V5XSA9IHZhbHVlO1xuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGRlbGV0ZSBkZXN0W2tleV07XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgcmV0dXJuIGRlc3Q7XG4gICAgICAgICAgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGNvcHlXaXRoRGVzZXIoZGVzdCwgc291cmNlKSB7XG4gICAgICAgICAgT2JqZWN0LmtleXMoc291cmNlKS5mb3JFYWNoKGtleSA9PiB7XG4gICAgICAgICAgICBjb25zdCBpdGVtID0gc291cmNlW2tleV07XG4gICAgICAgICAgICBkZXN0W2tleV0gPSB0eXBlb2YgaXRlbSA9PT0gJ3N0cmluZycgPyBKU09OLnBhcnNlKGl0ZW0pIDogaXRlbTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBQcm9taXNlLmFsbChbXG4gICAgICAgICAgY29tcGlsZXJIb29rcy5faGFyZFNvdXJjZVJlYWRDYWNoZS5wcm9taXNlKHtcbiAgICAgICAgICAgIGNvbnRleHRLZXlzLFxuICAgICAgICAgICAgY29udGV4dFZhbHVlcyxcbiAgICAgICAgICAgIGNvbnRleHROb3JtYWxQYXRoLFxuICAgICAgICAgICAgY29udGV4dE5vcm1hbFJlcXVlc3QsXG4gICAgICAgICAgICBjb250ZXh0Tm9ybWFsTW9kdWxlSWQsXG4gICAgICAgICAgICBjb3B5V2l0aERlc2VyLFxuICAgICAgICAgIH0pLFxuICAgICAgICBdKVxuICAgICAgICAgIC5jYXRjaChlcnJvciA9PiB7XG4gICAgICAgICAgICBsb2dNZXNzYWdlcy5zZXJpYWxCYWRDYWNoZShjb21waWxlciwgZXJyb3IpO1xuXG4gICAgICAgICAgICByZXR1cm4gcmltcmFmKGNhY2hlRGlyUGF0aCk7XG4gICAgICAgICAgfSlcbiAgICAgICAgICAudGhlbigoKSA9PiB7XG4gICAgICAgICAgICAvLyBjb25zb2xlLmxvZygnY2FjaGUgaW4nLCBEYXRlLm5vdygpIC0gc3RhcnQpO1xuICAgICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgY29tcGlsZXJIb29rcy53YXRjaFJ1bi50YXBQcm9taXNlKFxuICAgICAgJ0hhcmRTb3VyY2UgLSBpbmRleCAtIHJlYWRPclJlc2V0JyxcbiAgICAgIHJ1blJlYWRPclJlc2V0LFxuICAgICk7XG4gICAgY29tcGlsZXJIb29rcy5ydW4udGFwUHJvbWlzZShcbiAgICAgICdIYXJkU291cmNlIC0gaW5kZXggLSByZWFkT3JSZXNldCcsXG4gICAgICBydW5SZWFkT3JSZXNldCxcbiAgICApO1xuXG4gICAgY29uc3QgZGV0ZWN0TW9kdWxlID0gcGF0aCA9PiB7XG4gICAgICB0cnkge1xuICAgICAgICByZXF1aXJlKHBhdGgpO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH0gY2F0Y2ggKF8pIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgIH07XG5cbiAgICBjb25zdCB3ZWJwYWNrRmVhdHVyZXMgPSB7XG4gICAgICBjb25jYXRlbmF0ZWRNb2R1bGU6IGRldGVjdE1vZHVsZShcbiAgICAgICAgJ3dlYnBhY2svbGliL29wdGltaXplL0NvbmNhdGVuYXRlZE1vZHVsZScsXG4gICAgICApLFxuICAgICAgZ2VuZXJhdG9yOiBkZXRlY3RNb2R1bGUoJ3dlYnBhY2svbGliL0phdmFzY3JpcHRHZW5lcmF0b3InKSxcbiAgICB9O1xuXG4gICAgbGV0IHNjaGVtYXNWZXJzaW9uID0gMjtcbiAgICBpZiAod2VicGFja0ZlYXR1cmVzLmNvbmNhdGVuYXRlZE1vZHVsZSkge1xuICAgICAgc2NoZW1hc1ZlcnNpb24gPSAzO1xuICAgIH1cbiAgICBpZiAod2VicGFja0ZlYXR1cmVzLmdlbmVyYXRvcikge1xuICAgICAgc2NoZW1hc1ZlcnNpb24gPSA0O1xuICAgIH1cblxuICAgIGNvbnN0IEFyY2hldHlwZVN5c3RlbSA9IHJlcXVpcmUoJy4vbGliL1N5c3RlbUFyY2hldHlwZScpO1xuICAgIGNvbnN0IFBhcml0eVN5c3RlbSA9IHJlcXVpcmUoJy4vbGliL1N5c3RlbVBhcml0eScpO1xuXG4gICAgY29uc3QgQXNzZXRDYWNoZSA9IHJlcXVpcmUoJy4vbGliL0NhY2hlQXNzZXQnKTtcbiAgICBjb25zdCBNb2R1bGVDYWNoZSA9IHJlcXVpcmUoJy4vbGliL0NhY2hlTW9kdWxlJyk7XG5cbiAgICBjb25zdCBFbmhhbmNlZFJlc29sdmVDYWNoZSA9IHJlcXVpcmUoJy4vbGliL0NhY2hlRW5oYW5jZWRSZXNvbHZlJyk7XG4gICAgY29uc3QgTWQ1Q2FjaGUgPSByZXF1aXJlKCcuL2xpYi9DYWNoZU1kNScpO1xuICAgIGNvbnN0IE1vZHVsZVJlc29sdmVyQ2FjaGUgPSByZXF1aXJlKCcuL2xpYi9DYWNoZU1vZHVsZVJlc29sdmVyJyk7XG5cbiAgICBjb25zdCBUcmFuc2Zvcm1Db21waWxhdGlvblBsdWdpbiA9IHJlcXVpcmUoJy4vbGliL1RyYW5zZm9ybUNvbXBpbGF0aW9uUGx1Z2luJyk7XG4gICAgY29uc3QgVHJhbnNmb3JtQXNzZXRQbHVnaW4gPSByZXF1aXJlKCcuL2xpYi9UcmFuc2Zvcm1Bc3NldFBsdWdpbicpO1xuICAgIGxldCBUcmFuc2Zvcm1Db25jYXRlbmF0aW9uTW9kdWxlUGx1Z2luO1xuICAgIGlmICh3ZWJwYWNrRmVhdHVyZXMuY29uY2F0ZW5hdGVkTW9kdWxlKSB7XG4gICAgICBUcmFuc2Zvcm1Db25jYXRlbmF0aW9uTW9kdWxlUGx1Z2luID0gcmVxdWlyZSgnLi9saWIvVHJhbnNmb3JtQ29uY2F0ZW5hdGlvbk1vZHVsZVBsdWdpbicpO1xuICAgIH1cbiAgICBjb25zdCBUcmFuc2Zvcm1Ob3JtYWxNb2R1bGVQbHVnaW4gPSByZXF1aXJlKCcuL2xpYi9UcmFuc2Zvcm1Ob3JtYWxNb2R1bGVQbHVnaW4nKTtcbiAgICBjb25zdCBUcmFuc2Zvcm1Ob3JtYWxNb2R1bGVGYWN0b3J5UGx1Z2luID0gcmVxdWlyZSgnLi9saWIvVHJhbnNmb3JtTm9ybWFsTW9kdWxlRmFjdG9yeVBsdWdpbicpO1xuICAgIGNvbnN0IFRyYW5zZm9ybU1vZHVsZUFzc2V0c1BsdWdpbiA9IHJlcXVpcmUoJy4vbGliL1RyYW5zZm9ybU1vZHVsZUFzc2V0c1BsdWdpbicpO1xuICAgIGNvbnN0IFRyYW5zZm9ybU1vZHVsZUVycm9yc1BsdWdpbiA9IHJlcXVpcmUoJy4vbGliL1RyYW5zZm9ybU1vZHVsZUVycm9yc1BsdWdpbicpO1xuICAgIGNvbnN0IFN1cHBvcnRFeHRyYWN0VGV4dFBsdWdpbiA9IHJlcXVpcmUoJy4vbGliL1N1cHBvcnRFeHRyYWN0VGV4dFBsdWdpbicpO1xuICAgIGxldCBTdXBwb3J0TWluaUNzc0V4dHJhY3RQbHVnaW47XG4gICAgbGV0IEV4Y2x1ZGVNaW5pQ3NzTW9kdWxlUGx1Z2luO1xuICAgIGlmICh3ZWJwYWNrRmVhdHVyZXMuZ2VuZXJhdG9yKSB7XG4gICAgICBTdXBwb3J0TWluaUNzc0V4dHJhY3RQbHVnaW4gPSByZXF1aXJlKCcuL2xpYi9TdXBwb3J0TWluaUNzc0V4dHJhY3RQbHVnaW4nKTtcbiAgICAgIEV4Y2x1ZGVNaW5pQ3NzTW9kdWxlUGx1Z2luID0gcmVxdWlyZSgnLi9saWIvRXhjbHVkZU1pbmlDc3NNb2R1bGVQbHVnaW4nKTtcbiAgICB9XG4gICAgY29uc3QgVHJhbnNmb3JtRGVwZW5kZW5jeUJsb2NrUGx1Z2luID0gcmVxdWlyZSgnLi9saWIvVHJhbnNmb3JtRGVwZW5kZW5jeUJsb2NrUGx1Z2luJyk7XG4gICAgY29uc3QgVHJhbnNmb3JtQmFzaWNEZXBlbmRlbmN5UGx1Z2luID0gcmVxdWlyZSgnLi9saWIvVHJhbnNmb3JtQmFzaWNEZXBlbmRlbmN5UGx1Z2luJyk7XG4gICAgbGV0IEhhcmRIYXJtb255RGVwZW5kZW5jeVBsdWdpbjtcbiAgICBjb25zdCBUcmFuc2Zvcm1Tb3VyY2VQbHVnaW4gPSByZXF1aXJlKCcuL2xpYi9UcmFuc2Zvcm1Tb3VyY2VQbHVnaW4nKTtcbiAgICBjb25zdCBUcmFuc2Zvcm1QYXJzZXJQbHVnaW4gPSByZXF1aXJlKCcuL2xpYi9UcmFuc2Zvcm1QYXJzZXJQbHVnaW4nKTtcbiAgICBsZXQgVHJhbnNmb3JtR2VuZXJhdG9yUGx1Z2luO1xuICAgIGlmICh3ZWJwYWNrRmVhdHVyZXMuZ2VuZXJhdG9yKSB7XG4gICAgICBUcmFuc2Zvcm1HZW5lcmF0b3JQbHVnaW4gPSByZXF1aXJlKCcuL2xpYi9UcmFuc2Zvcm1HZW5lcmF0b3JQbHVnaW4nKTtcbiAgICB9XG5cbiAgICBjb25zdCBDaGFsa0xvZ2dlclBsdWdpbiA9IHJlcXVpcmUoJy4vbGliL0NoYWxrTG9nZ2VyUGx1Z2luJyk7XG5cbiAgICBuZXcgQXJjaGV0eXBlU3lzdGVtKCkuYXBwbHkoY29tcGlsZXIpO1xuICAgIG5ldyBQYXJpdHlTeXN0ZW0oKS5hcHBseShjb21waWxlcik7XG5cbiAgICBuZXcgQXNzZXRDYWNoZSgpLmFwcGx5KGNvbXBpbGVyKTtcbiAgICBuZXcgTW9kdWxlQ2FjaGUoKS5hcHBseShjb21waWxlcik7XG5cbiAgICBuZXcgRW5oYW5jZWRSZXNvbHZlQ2FjaGUoKS5hcHBseShjb21waWxlcik7XG4gICAgbmV3IE1kNUNhY2hlKCkuYXBwbHkoY29tcGlsZXIpO1xuICAgIG5ldyBNb2R1bGVSZXNvbHZlckNhY2hlKCkuYXBwbHkoY29tcGlsZXIpO1xuXG4gICAgbmV3IFRyYW5zZm9ybUNvbXBpbGF0aW9uUGx1Z2luKCkuYXBwbHkoY29tcGlsZXIpO1xuXG4gICAgbmV3IFRyYW5zZm9ybUFzc2V0UGx1Z2luKCkuYXBwbHkoY29tcGlsZXIpO1xuXG4gICAgbmV3IFRyYW5zZm9ybU5vcm1hbE1vZHVsZVBsdWdpbih7XG4gICAgICBzY2hlbWE6IHNjaGVtYXNWZXJzaW9uLFxuICAgIH0pLmFwcGx5KGNvbXBpbGVyKTtcbiAgICBuZXcgVHJhbnNmb3JtTm9ybWFsTW9kdWxlRmFjdG9yeVBsdWdpbigpLmFwcGx5KGNvbXBpbGVyKTtcblxuICAgIGlmIChUcmFuc2Zvcm1Db25jYXRlbmF0aW9uTW9kdWxlUGx1Z2luKSB7XG4gICAgICBuZXcgVHJhbnNmb3JtQ29uY2F0ZW5hdGlvbk1vZHVsZVBsdWdpbigpLmFwcGx5KGNvbXBpbGVyKTtcbiAgICB9XG5cbiAgICBuZXcgVHJhbnNmb3JtTW9kdWxlQXNzZXRzUGx1Z2luKCkuYXBwbHkoY29tcGlsZXIpO1xuICAgIG5ldyBUcmFuc2Zvcm1Nb2R1bGVFcnJvcnNQbHVnaW4oKS5hcHBseShjb21waWxlcik7XG4gICAgbmV3IFN1cHBvcnRFeHRyYWN0VGV4dFBsdWdpbigpLmFwcGx5KGNvbXBpbGVyKTtcblxuICAgIGlmIChTdXBwb3J0TWluaUNzc0V4dHJhY3RQbHVnaW4pIHtcbiAgICAgIG5ldyBTdXBwb3J0TWluaUNzc0V4dHJhY3RQbHVnaW4oKS5hcHBseShjb21waWxlcik7XG4gICAgICBuZXcgRXhjbHVkZU1pbmlDc3NNb2R1bGVQbHVnaW4oKS5hcHBseShjb21waWxlcik7XG4gICAgfVxuXG4gICAgbmV3IFRyYW5zZm9ybURlcGVuZGVuY3lCbG9ja1BsdWdpbih7XG4gICAgICBzY2hlbWE6IHNjaGVtYXNWZXJzaW9uLFxuICAgIH0pLmFwcGx5KGNvbXBpbGVyKTtcblxuICAgIG5ldyBUcmFuc2Zvcm1CYXNpY0RlcGVuZGVuY3lQbHVnaW4oe1xuICAgICAgc2NoZW1hOiBzY2hlbWFzVmVyc2lvbixcbiAgICB9KS5hcHBseShjb21waWxlcik7XG5cbiAgICBuZXcgVHJhbnNmb3JtU291cmNlUGx1Z2luKHtcbiAgICAgIHNjaGVtYTogc2NoZW1hc1ZlcnNpb24sXG4gICAgfSkuYXBwbHkoY29tcGlsZXIpO1xuXG4gICAgbmV3IFRyYW5zZm9ybVBhcnNlclBsdWdpbih7XG4gICAgICBzY2hlbWE6IHNjaGVtYXNWZXJzaW9uLFxuICAgIH0pLmFwcGx5KGNvbXBpbGVyKTtcblxuICAgIGlmIChUcmFuc2Zvcm1HZW5lcmF0b3JQbHVnaW4pIHtcbiAgICAgIG5ldyBUcmFuc2Zvcm1HZW5lcmF0b3JQbHVnaW4oe1xuICAgICAgICBzY2hlbWE6IHNjaGVtYXNWZXJzaW9uLFxuICAgICAgfSkuYXBwbHkoY29tcGlsZXIpO1xuICAgIH1cblxuICAgIG5ldyBDaGFsa0xvZ2dlclBsdWdpbih0aGlzLm9wdGlvbnMuaW5mbykuYXBwbHkoY29tcGlsZXIpO1xuXG4gICAgZnVuY3Rpb24gcnVuVmVyaWZ5KF9jb21waWxlcikge1xuICAgICAgaWYgKCFhY3RpdmUpIHtcbiAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBzdGF0cyA9IHt9O1xuICAgICAgcmV0dXJuIHBsdWdpbkNvbXBhdC5wcm9taXNlKGNvbXBpbGVyLCAnX2hhcmRTb3VyY2VWZXJpZnlDYWNoZScsIFtdKTtcbiAgICB9XG5cbiAgICBjb21waWxlckhvb2tzLndhdGNoUnVuLnRhcFByb21pc2UoJ0hhcmRTb3VyY2UgLSBpbmRleCAtIHZlcmlmeScsIHJ1blZlcmlmeSk7XG4gICAgY29tcGlsZXJIb29rcy5ydW4udGFwUHJvbWlzZSgnSGFyZFNvdXJjZSAtIGluZGV4IC0gdmVyaWZ5JywgcnVuVmVyaWZ5KTtcblxuICAgIGxldCBmcmVlemU7XG5cbiAgICBjb21waWxlckhvb2tzLl9oYXJkU291cmNlTWV0aG9kcy50YXAoJ0hhcmRTb3VyY2UgLSBpbmRleCcsIG1ldGhvZHMgPT4ge1xuICAgICAgZnJlZXplID0gbWV0aG9kcy5mcmVlemU7XG4gICAgfSk7XG5cbiAgICBjb21waWxlckhvb2tzLmFmdGVyQ29tcGlsZS50YXBQcm9taXNlKCdIYXJkU291cmNlIC0gaW5kZXgnLCBjb21waWxhdGlvbiA9PiB7XG4gICAgICBpZiAoIWFjdGl2ZSkge1xuICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCk7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IHN0YXJ0Q2FjaGVUaW1lID0gRGF0ZS5ub3coKTtcblxuICAgICAgY29uc3QgaWRlbnRpZmllclByZWZpeCA9IGNhY2hlUHJlZml4KGNvbXBpbGF0aW9uKTtcbiAgICAgIGlmIChpZGVudGlmaWVyUHJlZml4ICE9PSBudWxsKSB7XG4gICAgICAgIGZyZWV6ZSgnQ29tcGlsYXRpb24nLCBudWxsLCBjb21waWxhdGlvbiwge1xuICAgICAgICAgIGNvbXBpbGF0aW9uLFxuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIFByb21pc2UuYWxsKFtcbiAgICAgICAgbWtkaXJwKGNhY2hlRGlyUGF0aCkudGhlbigoKSA9PlxuICAgICAgICAgIFByb21pc2UuYWxsKFtcbiAgICAgICAgICAgIGZzV3JpdGVGaWxlKHBhdGguam9pbihjYWNoZURpclBhdGgsICdzdGFtcCcpLCBjdXJyZW50U3RhbXAsICd1dGY4JyksXG4gICAgICAgICAgICBmc1dyaXRlRmlsZShcbiAgICAgICAgICAgICAgcGF0aC5qb2luKGNhY2hlRGlyUGF0aCwgJ3ZlcnNpb24nKSxcbiAgICAgICAgICAgICAgaGFyZFNvdXJjZVZlcnNpb24sXG4gICAgICAgICAgICAgICd1dGY4JyxcbiAgICAgICAgICAgICksXG4gICAgICAgICAgXSksXG4gICAgICAgICksXG4gICAgICAgIHBsdWdpbkNvbXBhdC5wcm9taXNlKGNvbXBpbGVyLCAnX2hhcmRTb3VyY2VXcml0ZUNhY2hlJywgW1xuICAgICAgICAgIGNvbXBpbGF0aW9uLFxuICAgICAgICAgIHtcbiAgICAgICAgICAgIHJlbGF0ZU5vcm1hbFBhdGgsXG4gICAgICAgICAgICByZWxhdGVOb3JtYWxSZXF1ZXN0LFxuICAgICAgICAgICAgcmVsYXRlTm9ybWFsTW9kdWxlSWQsXG5cbiAgICAgICAgICAgIGNvbnRleHROb3JtYWxQYXRoLFxuICAgICAgICAgICAgY29udGV4dE5vcm1hbFJlcXVlc3QsXG4gICAgICAgICAgICBjb250ZXh0Tm9ybWFsTW9kdWxlSWQsXG4gICAgICAgICAgfSxcbiAgICAgICAgXSksXG4gICAgICBdKS50aGVuKCgpID0+IHtcbiAgICAgICAgLy8gY29uc29sZS5sb2coJ2NhY2hlIG91dCcsIERhdGUubm93KCkgLSBzdGFydENhY2hlVGltZSk7XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IEhhcmRTb3VyY2VXZWJwYWNrUGx1Z2luO1xuXG5IYXJkU291cmNlV2VicGFja1BsdWdpbi5FeGNsdWRlTW9kdWxlUGx1Z2luID0gRXhjbHVkZU1vZHVsZVBsdWdpbjtcbkhhcmRTb3VyY2VXZWJwYWNrUGx1Z2luLkhhcmRTb3VyY2VMZXZlbERiU2VyaWFsaXplclBsdWdpbiA9IEhhcmRTb3VyY2VMZXZlbERiU2VyaWFsaXplclBsdWdpbjtcbkhhcmRTb3VyY2VXZWJwYWNrUGx1Z2luLkxldmVsRGJTZXJpYWxpemVyUGx1Z2luID0gSGFyZFNvdXJjZUxldmVsRGJTZXJpYWxpemVyUGx1Z2luO1xuSGFyZFNvdXJjZVdlYnBhY2tQbHVnaW4uU2VyaWFsaXplckFwcGVuZDJQbHVnaW4gPSBTZXJpYWxpemVyQXBwZW5kMlBsdWdpbjtcbkhhcmRTb3VyY2VXZWJwYWNrUGx1Z2luLlNlcmlhbGl6ZXJBcHBlbmRQbHVnaW4gPSBTZXJpYWxpemVyQXBwZW5kUGx1Z2luO1xuSGFyZFNvdXJjZVdlYnBhY2tQbHVnaW4uU2VyaWFsaXplckNhY2FjaGVQbHVnaW4gPSBTZXJpYWxpemVyQ2FjYWNoZVBsdWdpbjtcbkhhcmRTb3VyY2VXZWJwYWNrUGx1Z2luLlNlcmlhbGl6ZXJKc29uUGx1Z2luID0gU2VyaWFsaXplckpzb25QbHVnaW47XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShIYXJkU291cmNlV2VicGFja1BsdWdpbiwgJ1BhcmFsbGVsTW9kdWxlUGx1Z2luJywge1xuICBnZXQoKSB7XG4gICAgcmV0dXJuIHJlcXVpcmUoJy4vbGliL1BhcmFsbGVsTW9kdWxlUGx1Z2luJyk7XG4gIH0sXG59KTtcbiJdLCJzb3VyY2VSb290IjoiL1VzZXJzL3R5bGVyYXJidXMvZGV2L3Byb3ZpZGVyL3NyYyJ9

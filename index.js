'use strict';

require('source-map-support/register');

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

    function runVerify(_compiler) {
      if (!active) {
        return Promise.resolve();
      }

      const stats = {};
      return pluginCompat.promise(compiler, '_hardSourceVerifyCache', []);
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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImhhcmQtc291cmNlLXdlYnBhY2stcGx1Z2luL2luZGV4LmpzIl0sIm5hbWVzIjpbImNyeXB0byIsInJlcXVpcmUiLCJmcyIsInBhdGgiLCJsb2Rhc2giLCJfbWtkaXJwIiwiX3JpbXJhZiIsIm5vZGVPYmplY3RIYXNoIiwiZmluZENhY2hlRGlyIiwiZW52SGFzaCIsImRlZmF1bHRDb25maWdIYXNoIiwicHJvbWlzaWZ5IiwicmVsYXRlQ29udGV4dCIsInBsdWdpbkNvbXBhdCIsImxvZ01lc3NhZ2VzIiwiTG9nZ2VyRmFjdG9yeSIsImNhY2hlUHJlZml4IiwiQ2FjaGVTZXJpYWxpemVyRmFjdG9yeSIsIkV4Y2x1ZGVNb2R1bGVQbHVnaW4iLCJIYXJkU291cmNlTGV2ZWxEYlNlcmlhbGl6ZXJQbHVnaW4iLCJTZXJpYWxpemVyQXBwZW5kMlBsdWdpbiIsIlNlcmlhbGl6ZXJBcHBlbmRQbHVnaW4iLCJTZXJpYWxpemVyQ2FjYWNoZVBsdWdpbiIsIlNlcmlhbGl6ZXJKc29uUGx1Z2luIiwiaGFyZFNvdXJjZVZlcnNpb24iLCJ2ZXJzaW9uIiwiU3RyaW5nIiwicHJvdG90eXBlIiwicGFkU3RhcnQiLCJ0YXJnZXRMZW5ndGgiLCJwYWRTdHJpbmciLCJsZW5ndGgiLCJyZXBlYXQiLCJzbGljZSIsInJlcXVlc3RIYXNoIiwicmVxdWVzdCIsImNyZWF0ZUhhc2giLCJ1cGRhdGUiLCJkaWdlc3QiLCJoZXhTbGljZSIsIm1rZGlycCIsImNvbnRleHQiLCJzeW5jIiwiYmluZCIsInJpbXJhZiIsImZzUmVhZEZpbGUiLCJyZWFkRmlsZSIsImZzV3JpdGVGaWxlIiwid3JpdGVGaWxlIiwiYnVsa0ZzVGFzayIsImFycmF5IiwiZWFjaCIsIlByb21pc2UiLCJyZXNvbHZlIiwicmVqZWN0Iiwib3BzIiwib3V0IiwiZm9yRWFjaCIsIml0ZW0iLCJpIiwiYmFjayIsImNhbGxiYWNrIiwiZXJyIiwidmFsdWUiLCJlIiwiY29tcGlsZXJDb250ZXh0IiwicmVsYXRlTm9ybWFsUGF0aCIsImNvbnRleHROb3JtYWxQYXRoIiwiY29udGV4dE5vcm1hbFBhdGhTZXQiLCJyZWxhdGVOb3JtYWxSZXF1ZXN0IiwiY29tcGlsZXIiLCJrZXkiLCJzcGxpdCIsIm1hcCIsInN1YmtleSIsImpvaW4iLCJyZWxhdGVOb3JtYWxNb2R1bGVJZCIsImlkIiwic3Vic3RyaW5nIiwiY29udGV4dE5vcm1hbFJlcXVlc3QiLCJjb250ZXh0Tm9ybWFsTW9kdWxlSWQiLCJjb250ZXh0Tm9ybWFsTG9hZGVycyIsImxvYWRlcnMiLCJsb2FkZXIiLCJPYmplY3QiLCJhc3NpZ24iLCJjb250ZXh0Tm9ybWFsUGF0aEFycmF5IiwicGF0aHMiLCJzdWJwYXRoIiwiSGFyZFNvdXJjZVdlYnBhY2tQbHVnaW4iLCJjb25zdHJ1Y3RvciIsIm9wdGlvbnMiLCJnZXRQYXRoIiwiZGlyTmFtZSIsInN1ZmZpeCIsImNvbmZpZ2hhc2hJbmRleCIsInNlYXJjaCIsInJlcGxhY2UiLCJjb25maWdIYXNoIiwiY2FjaGVQYXRoIiwicHJvY2VzcyIsImN3ZCIsImNvbXBpbGVyT3V0cHV0T3B0aW9ucyIsImdldENhY2hlUGF0aCIsImNhY2hlRGlyZWN0b3J5IiwiYXBwbHkiLCJhY3RpdmUiLCJsb2dnZXIiLCJjcmVhdGUiLCJsb2dnZXJDb3JlIiwiZnJvbSIsImxvY2siLCJjb21waWxlckhvb2tzIiwiaG9va3MiLCJjYWNoZSIsIm5hbWUiLCJvdXRwdXQiLCJfX2hhcmRTb3VyY2VfY29uZmlnSGFzaCIsIl9faGFyZFNvdXJjZV9zaG9ydENvbmZpZ0hhc2giLCJjb25maWdIYXNoSW5EaXJlY3RvcnkiLCJjb25maWdIYXNoU2V0QnV0Tm90VXNlZCIsInVubG9ja0xvZ2dlciIsInVubG9jayIsIndhdGNoUnVuIiwidGFwIiwicnVuIiwiZW52aXJvbm1lbnRIYXNoZXIiLCJlbnZpcm9ubWVudEhhc2giLCJpbnB1dHMiLCJjYWNoZURpclBhdGgiLCJjYWNoZUFzc2V0RGlyUGF0aCIsInJlc29sdmVDYWNoZVBhdGgiLCJjdXJyZW50U3RhbXAiLCJjYWNoZVNlcmlhbGl6ZXJGYWN0b3J5IiwiY3JlYXRlU2VyaWFsaXplcnMiLCJjYWNoZVJlYWQiLCJfdGhpcyIsInJlZ2lzdGVyIiwicnVuUmVhZE9yUmVzZXQiLCJfY29tcGlsZXIiLCJzdGF0U3luYyIsIl8iLCJjb25maWdIYXNoRmlyc3RCdWlsZCIsInN0YXJ0IiwiRGF0ZSIsIm5vdyIsIl9oYXJkU291cmNlQ3JlYXRlU2VyaWFsaXplciIsImNhbGwiLCJhbGwiLCJjYXRjaCIsInRoZW4iLCJzdGFtcCIsImhhc2giLCJ2ZXJzaW9uU3RhbXAiLCJoYXNoSW5wdXRzIiwiZW52aXJvbm1lbnRJbnB1dHMiLCJlbnZpcm9ubWVudEhhc2hDaGFuZ2VkIiwiY29uZmlnSGFzaENoYW5nZWQiLCJoYXJkU291cmNlVmVyc2lvbkNoYW5nZWQiLCJjb25maWdIYXNoQnVpbGRXaXRoIiwiY29udGV4dEtleXMiLCJmbiIsInNvdXJjZSIsImRlc3QiLCJrZXlzIiwiY29udGV4dFZhbHVlcyIsImNvcHlXaXRoRGVzZXIiLCJKU09OIiwicGFyc2UiLCJfaGFyZFNvdXJjZVJlYWRDYWNoZSIsInByb21pc2UiLCJlcnJvciIsInNlcmlhbEJhZENhY2hlIiwicnVuVmVyaWZ5Iiwic3RhdHMiLCJ0YXBQcm9taXNlIiwiZGV0ZWN0TW9kdWxlIiwid2VicGFja0ZlYXR1cmVzIiwiY29uY2F0ZW5hdGVkTW9kdWxlIiwiZ2VuZXJhdG9yIiwic2NoZW1hc1ZlcnNpb24iLCJBcmNoZXR5cGVTeXN0ZW0iLCJQYXJpdHlTeXN0ZW0iLCJBc3NldENhY2hlIiwiTW9kdWxlQ2FjaGUiLCJFbmhhbmNlZFJlc29sdmVDYWNoZSIsIk1kNUNhY2hlIiwiTW9kdWxlUmVzb2x2ZXJDYWNoZSIsIlRyYW5zZm9ybUNvbXBpbGF0aW9uUGx1Z2luIiwiVHJhbnNmb3JtQXNzZXRQbHVnaW4iLCJUcmFuc2Zvcm1Db25jYXRlbmF0aW9uTW9kdWxlUGx1Z2luIiwiVHJhbnNmb3JtTm9ybWFsTW9kdWxlUGx1Z2luIiwiVHJhbnNmb3JtTm9ybWFsTW9kdWxlRmFjdG9yeVBsdWdpbiIsIlRyYW5zZm9ybU1vZHVsZUFzc2V0c1BsdWdpbiIsIlRyYW5zZm9ybU1vZHVsZUVycm9yc1BsdWdpbiIsIlN1cHBvcnRFeHRyYWN0VGV4dFBsdWdpbiIsIlN1cHBvcnRNaW5pQ3NzRXh0cmFjdFBsdWdpbiIsIkV4Y2x1ZGVNaW5pQ3NzTW9kdWxlUGx1Z2luIiwiVHJhbnNmb3JtRGVwZW5kZW5jeUJsb2NrUGx1Z2luIiwiVHJhbnNmb3JtQmFzaWNEZXBlbmRlbmN5UGx1Z2luIiwiSGFyZEhhcm1vbnlEZXBlbmRlbmN5UGx1Z2luIiwiVHJhbnNmb3JtU291cmNlUGx1Z2luIiwiVHJhbnNmb3JtUGFyc2VyUGx1Z2luIiwiVHJhbnNmb3JtR2VuZXJhdG9yUGx1Z2luIiwiQ2hhbGtMb2dnZXJQbHVnaW4iLCJzY2hlbWEiLCJpbmZvIiwiZnJlZXplIiwiX2hhcmRTb3VyY2VNZXRob2RzIiwibWV0aG9kcyIsImFmdGVyQ29tcGlsZSIsImNvbXBpbGF0aW9uIiwic3RhcnRDYWNoZVRpbWUiLCJpZGVudGlmaWVyUHJlZml4IiwibW9kdWxlIiwiZXhwb3J0cyIsIkxldmVsRGJTZXJpYWxpemVyUGx1Z2luIl0sIm1hcHBpbmdzIjoiOzs7O0FBQUEsTUFBTUEsU0FBU0MsUUFBUSxRQUFSLENBQWY7QUFDQSxNQUFNQyxLQUFLRCxRQUFRLElBQVIsQ0FBWDtBQUNBLE1BQU1FLE9BQU9GLFFBQVEsTUFBUixDQUFiOztBQUVBLE1BQU1HLFNBQVNILFFBQVEsUUFBUixDQUFmO0FBQ0EsTUFBTUksVUFBVUosUUFBUSxRQUFSLENBQWhCO0FBQ0EsTUFBTUssVUFBVUwsUUFBUSxRQUFSLENBQWhCO0FBQ0EsTUFBTU0saUJBQWlCTixRQUFRLGtCQUFSLENBQXZCO0FBQ0EsTUFBTU8sZUFBZVAsUUFBUSxnQkFBUixDQUFyQjs7QUFFQSxNQUFNUSxVQUFVUixRQUFRLGVBQVIsQ0FBaEI7QUFDQSxNQUFNUyxvQkFBb0JULFFBQVEseUJBQVIsQ0FBMUI7QUFDQSxNQUFNVSxZQUFZVixRQUFRLHNCQUFSLENBQWxCO0FB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OENHLFlBQTlDLEVBQTRELE1BQTVELENBRFUsRUFFVnJGLFlBQ0U1QyxLQUFLd0UsSUFBTCxDQUFVc0QsWUFBVixFQUF3QixTQUF4QixDQURGLEVBRUV6RyxpQkFGRixFQUdFLE1BSEYsQ0FGVSxDQUFaLENBREYsQ0FEaUIsRUFXakJYLGFBQWE2SixPQUFiLENBQXFCcEcsUUFBckIsRUFBK0IsdUJBQS9CLEVBQXdELENBQ3RENkksV0FEc0QsRUFFdEQ7QUFDRWpKLHdCQURGO0FBRUVHLDJCQUZGO0FBR0VPLDRCQUhGOztBQUtFVCx5QkFMRjtBQU1FWSw0QkFORjtBQU9FQztBQVBGLE9BRnNELENBQXhELENBWGlCLENBQVosRUF1QkpzRSxJQXZCSSxDQXVCQyxNQUFNO0FBQ1o7QUFDRCxPQXpCTSxDQUFQO0FBMEJELEtBeENEO0FBeUNEO0FBL2IyQjs7QUFrYzlCZ0UsT0FBT0MsT0FBUCxHQUFpQjlILHVCQUFqQjs7QUFFQUEsd0JBQXdCdkUsbUJBQXhCLEdBQThDQSxtQkFBOUM7QUFDQXVFLHdCQUF3QnRFLGlDQUF4QixHQUE0REEsaUNBQTVEO0FBQ0FzRSx3QkFBd0IrSCx1QkFBeEIsR0FBa0RyTSxpQ0FBbEQ7QUFDQXNFLHdCQUF3QnJFLHVCQUF4QixHQUFrREEsdUJBQWxEO0FBQ0FxRSx3QkFBd0JwRSxzQkFBeEIsR0FBaURBLHNCQUFqRDtBQUNBb0Usd0JBQXdCbkUsdUJBQXhCLEdBQWtEQSx1QkFBbEQ7QUFDQW1FLHdCQUF3QmxFLG9CQUF4QixHQUErQ0Esb0JBQS9DIiwiZmlsZSI6ImhhcmQtc291cmNlLXdlYnBhY2stcGx1Z2luL2luZGV4LmpzIiwic291cmNlc0NvbnRlbnQiOlsiY29uc3QgY3J5cHRvID0gcmVxdWlyZSgnY3J5cHRvJyk7XG5jb25zdCBmcyA9IHJlcXVpcmUoJ2ZzJyk7XG5jb25zdCBwYXRoID0gcmVxdWlyZSgncGF0aCcpO1xuXG5jb25zdCBsb2Rhc2ggPSByZXF1aXJlKCdsb2Rhc2gnKTtcbmNvbnN0IF9ta2RpcnAgPSByZXF1aXJlKCdta2RpcnAnKTtcbmNvbnN0IF9yaW1yYWYgPSByZXF1aXJlKCdyaW1yYWYnKTtcbmNvbnN0IG5vZGVPYmplY3RIYXNoID0gcmVxdWlyZSgnbm9kZS1vYmplY3QtaGFzaCcpO1xuY29uc3QgZmluZENhY2hlRGlyID0gcmVxdWlyZSgnZmluZC1jYWNoZS1kaXInKTtcblxuY29uc3QgZW52SGFzaCA9IHJlcXVpcmUoJy4vbGliL2Vudkhhc2gnKTtcbmNvbnN0IGRlZmF1bHRDb25maWdIYXNoID0gcmVxdWlyZSgnLi9saWIvZGVmYXVsdENvbmZpZ0hhc2gnKTtcbmNvbnN0IHByb21pc2lmeSA9IHJlcXVpcmUoJy4vbGliL3V0aWwvcHJvbWlzaWZ5Jyk7XG5jb25zdCByZWxhdGVDb250ZXh0ID0gcmVxdWlyZSgnLi9saWIvdXRpbC9yZWxhdGUtY29udGV4dCcpO1xuY29uc3QgcGx1Z2luQ29tcGF0ID0gcmVxdWlyZSgnLi9saWIvdXRpbC9wbHVnaW4tY29tcGF0Jyk7XG5jb25zdCBsb2dNZXNzYWdlcyA9IHJlcXVpcmUoJy4vbGliL3V0aWwvbG9nLW1lc3NhZ2VzJyk7XG5cbmNvbnN0IExvZ2dlckZhY3RvcnkgPSByZXF1aXJlKCcuL2xpYi9sb2dnZXJGYWN0b3J5Jyk7XG5cbmNvbnN0IGNhY2hlUHJlZml4ID0gcmVxdWlyZSgnLi9saWIvdXRpbCcpLmNhY2hlUHJlZml4O1xuXG5jb25zdCBDYWNoZVNlcmlhbGl6ZXJGYWN0b3J5ID0gcmVxdWlyZSgnLi9saWIvQ2FjaGVTZXJpYWxpemVyRmFjdG9yeScpO1xuY29uc3QgRXhjbHVkZU1vZHVsZVBsdWdpbiA9IHJlcXVpcmUoJy4vbGliL0V4Y2x1ZGVNb2R1bGVQbHVnaW4nKTtcbmNvbnN0IEhhcmRTb3VyY2VMZXZlbERiU2VyaWFsaXplclBsdWdpbiA9IHJlcXVpcmUoJy4vbGliL1NlcmlhbGl6ZXJMZXZlbGRiUGx1Z2luJyk7XG5jb25zdCBTZXJpYWxpemVyQXBwZW5kMlBsdWdpbiA9IHJlcXVpcmUoJy4vbGliL1NlcmlhbGl6ZXJBcHBlbmQyUGx1Z2luJyk7XG5jb25zdCBTZXJpYWxpemVyQXBwZW5kUGx1Z2luID0gcmVxdWlyZSgnLi9saWIvU2VyaWFsaXplckFwcGVuZFBsdWdpbicpO1xuY29uc3QgU2VyaWFsaXplckNhY2FjaGVQbHVnaW4gPSByZXF1aXJlKCcuL2xpYi9TZXJpYWxpemVyQ2FjYWNoZVBsdWdpbicpO1xuY29uc3QgU2VyaWFsaXplckpzb25QbHVnaW4gPSByZXF1aXJlKCcuL2xpYi9TZXJpYWxpemVySnNvblBsdWdpbicpO1xuXG5jb25zdCBoYXJkU291cmNlVmVyc2lvbiA9IHJlcXVpcmUoJy4vcGFja2FnZS5qc29uJykudmVyc2lvbjtcblxuaWYgKCFTdHJpbmcucHJvdG90eXBlLnBhZFN0YXJ0KSB7XG4gIFN0cmluZy5wcm90b3R5cGUucGFkU3RhcnQgPSBmdW5jdGlvbiBwYWRTdGFydCh0YXJnZXRMZW5ndGgscGFkU3RyaW5nKSB7XG4gICAgdGFyZ2V0TGVuZ3RoID0gdGFyZ2V0TGVuZ3RoPj4wOyAvL3RydW5jYXRlIGlmIG51bWJlciBvciBjb252ZXJ0IG5vbi1udW1iZXIgdG8gMDtcbiAgICBwYWRTdHJpbmcgPSBTdHJpbmcoKHR5cGVvZiBwYWRTdHJpbmcgIT09ICd1bmRlZmluZWQnID8gcGFkU3RyaW5nIDogJyAnKSk7XG4gICAgaWYgKHRoaXMubGVuZ3RoID4gdGFyZ2V0TGVuZ3RoKSB7XG4gICAgICByZXR1cm4gU3RyaW5nKHRoaXMpO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIHRhcmdldExlbmd0aCA9IHRhcmdldExlbmd0aC10aGlzLmxlbmd0aDtcbiAgICAgIGlmICh0YXJnZXRMZW5ndGggPiBwYWRTdHJpbmcubGVuZ3RoKSB7XG4gICAgICAgIHBhZFN0cmluZyArPSBwYWRTdHJpbmcucmVwZWF0KHRhcmdldExlbmd0aC9wYWRTdHJpbmcubGVuZ3RoKTsgLy9hcHBlbmQgdG8gb3JpZ2luYWwgdG8gZW5zdXJlIHdlIGFyZSBsb25nZXIgdGhhbiBuZWVkZWRcbiAgICAgIH1cbiAgICAgIHJldHVybiBwYWRTdHJpbmcuc2xpY2UoMCx0YXJnZXRMZW5ndGgpICsgU3RyaW5nKHRoaXMpO1xuICAgIH1cbiAgfTtcbn1cblxuZnVuY3Rpb24gcmVxdWVzdEhhc2gocmVxdWVzdCkge1xuICByZXR1cm4gY3J5cHRvXG4gICAgLmNyZWF0ZUhhc2goJ3NoYTEnKVxuICAgIC51cGRhdGUocmVxdWVzdClcbiAgICAuZGlnZXN0KClcbiAgICAuaGV4U2xpY2UoKTtcbn1cblxuY29uc3QgbWtkaXJwID0gcHJvbWlzaWZ5KF9ta2RpcnAsIHsgY29udGV4dDogX21rZGlycCB9KTtcbm1rZGlycC5zeW5jID0gX21rZGlycC5zeW5jLmJpbmQoX21rZGlycCk7XG5jb25zdCByaW1yYWYgPSBwcm9taXNpZnkoX3JpbXJhZik7XG5yaW1yYWYuc3luYyA9IF9yaW1yYWYuc3luYy5iaW5kKF9yaW1yYWYpO1xuY29uc3QgZnNSZWFkRmlsZSA9IHByb21pc2lmeShmcy5yZWFkRmlsZSwgeyBjb250ZXh0OiBmcyB9KTtcbmNvbnN0IGZzV3JpdGVGaWxlID0gcHJvbWlzaWZ5KGZzLndyaXRlRmlsZSwgeyBjb250ZXh0OiBmcyB9KTtcblxuY29uc3QgYnVsa0ZzVGFzayA9IChhcnJheSwgZWFjaCkgPT5cbiAgbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgIGxldCBvcHMgPSAwO1xuICAgIGNvbnN0IG91dCA9IFtdO1xuICAgIGFycmF5LmZvckVhY2goKGl0ZW0sIGkpID0+IHtcbiAgICAgIG91dFtpXSA9IGVhY2goaXRlbSwgKGJhY2ssIGNhbGxiYWNrKSA9PiB7XG4gICAgICAgIG9wcysrO1xuICAgICAgICByZXR1cm4gKGVyciwgdmFsdWUpID0+IHtcbiAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgb3V0W2ldID0gYmFjayhlcnIsIHZhbHVlLCBvdXRbaV0pO1xuICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIHJldHVybiByZWplY3QoZSk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgb3BzLS07XG4gICAgICAgICAgaWYgKG9wcyA9PT0gMCkge1xuICAgICAgICAgICAgcmVzb2x2ZShvdXQpO1xuICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgIH0pO1xuICAgIH0pO1xuICAgIGlmIChvcHMgPT09IDApIHtcbiAgICAgIHJlc29sdmUob3V0KTtcbiAgICB9XG4gIH0pO1xuXG5jb25zdCBjb21waWxlckNvbnRleHQgPSByZWxhdGVDb250ZXh0LmNvbXBpbGVyQ29udGV4dDtcbmNvbnN0IHJlbGF0ZU5vcm1hbFBhdGggPSByZWxhdGVDb250ZXh0LnJlbGF0ZU5vcm1hbFBhdGg7XG5jb25zdCBjb250ZXh0Tm9ybWFsUGF0aCA9IHJlbGF0ZUNvbnRleHQuY29udGV4dE5vcm1hbFBhdGg7XG5jb25zdCBjb250ZXh0Tm9ybWFsUGF0aFNldCA9IHJlbGF0ZUNvbnRleHQuY29udGV4dE5vcm1hbFBhdGhTZXQ7XG5cbmZ1bmN0aW9uIHJlbGF0ZU5vcm1hbFJlcXVlc3QoY29tcGlsZXIsIGtleSkge1xuICByZXR1cm4ga2V5XG4gICAgLnNwbGl0KCchJylcbiAgICAubWFwKHN1YmtleSA9PiByZWxhdGVOb3JtYWxQYXRoKGNvbXBpbGVyLCBzdWJrZXkpKVxuICAgIC5qb2luKCchJyk7XG59XG5cbmZ1bmN0aW9uIHJlbGF0ZU5vcm1hbE1vZHVsZUlkKGNvbXBpbGVyLCBpZCkge1xuICByZXR1cm4gaWQuc3Vic3RyaW5nKDAsIDI0KSArIHJlbGF0ZU5vcm1hbFJlcXVlc3QoY29tcGlsZXIsIGlkLnN1YnN0cmluZygyNCkpO1xufVxuXG5mdW5jdGlvbiBjb250ZXh0Tm9ybWFsUmVxdWVzdChjb21waWxlciwga2V5KSB7XG4gIHJldHVybiBrZXlcbiAgICAuc3BsaXQoJyEnKVxuICAgIC5tYXAoc3Via2V5ID0+IGNvbnRleHROb3JtYWxQYXRoKGNvbXBpbGVyLCBzdWJrZXkpKVxuICAgIC5qb2luKCchJyk7XG59XG5cbmZ1bmN0aW9uIGNvbnRleHROb3JtYWxNb2R1bGVJZChjb21waWxlciwgaWQpIHtcbiAgcmV0dXJuIGlkLnN1YnN0cmluZygwLCAyNCkgKyBjb250ZXh0Tm9ybWFsUmVxdWVzdChjb21waWxlciwgaWQuc3Vic3RyaW5nKDI0KSk7XG59XG5cbmZ1bmN0aW9uIGNvbnRleHROb3JtYWxMb2FkZXJzKGNvbXBpbGVyLCBsb2FkZXJzKSB7XG4gIHJldHVybiBsb2FkZXJzLm1hcChsb2FkZXIgPT5cbiAgICBPYmplY3QuYXNzaWduKHt9LCBsb2FkZXIsIHtcbiAgICAgIGxvYWRlcjogY29udGV4dE5vcm1hbFBhdGgoY29tcGlsZXIsIGxvYWRlci5sb2FkZXIpLFxuICAgIH0pLFxuICApO1xufVxuXG5mdW5jdGlvbiBjb250ZXh0Tm9ybWFsUGF0aEFycmF5KGNvbXBpbGVyLCBwYXRocykge1xuICByZXR1cm4gcGF0aHMubWFwKHN1YnBhdGggPT4gY29udGV4dE5vcm1hbFBhdGgoY29tcGlsZXIsIHN1YnBhdGgpKTtcbn1cblxuY2xhc3MgSGFyZFNvdXJjZVdlYnBhY2tQbHVnaW4ge1xuICBjb25zdHJ1Y3RvcihvcHRpb25zKSB7XG4gICAgdGhpcy5vcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgfVxuXG4gIGdldFBhdGgoZGlyTmFtZSwgc3VmZml4KSB7XG4gICAgY29uc3QgY29uZmlnaGFzaEluZGV4ID0gZGlyTmFtZS5zZWFyY2goL1xcW2NvbmZpZ2hhc2hcXF0vKTtcbiAgICBpZiAoY29uZmlnaGFzaEluZGV4ICE9PSAtMSkge1xuICAgICAgZGlyTmFtZSA9IGRpck5hbWUucmVwbGFjZSgvXFxbY29uZmlnaGFzaFxcXS8sIHRoaXMuY29uZmlnSGFzaCk7XG4gICAgfVxuICAgIGxldCBjYWNoZVBhdGggPSBwYXRoLnJlc29sdmUoXG4gICAgICBwcm9jZXNzLmN3ZCgpLFxuICAgICAgdGhpcy5jb21waWxlck91dHB1dE9wdGlvbnMucGF0aCxcbiAgICAgIGRpck5hbWUsXG4gICAgKTtcbiAgICBpZiAoc3VmZml4KSB7XG4gICAgICBjYWNoZVBhdGggPSBwYXRoLmpvaW4oY2FjaGVQYXRoLCBzdWZmaXgpO1xuICAgIH1cbiAgICByZXR1cm4gY2FjaGVQYXRoO1xuICB9XG5cbiAgZ2V0Q2FjaGVQYXRoKHN1ZmZpeCkge1xuICAgIHJldHVybiB0aGlzLmdldFBhdGgodGhpcy5vcHRpb25zLmNhY2hlRGlyZWN0b3J5LCBzdWZmaXgpO1xuICB9XG5cbiAgYXBwbHkoY29tcGlsZXIpIHtcbiAgICBjb25zdCBvcHRpb25zID0gdGhpcy5vcHRpb25zO1xuICAgIGxldCBhY3RpdmUgPSB0cnVlO1xuXG4gICAgY29uc3QgbG9nZ2VyID0gbmV3IExvZ2dlckZhY3RvcnkoY29tcGlsZXIpLmNyZWF0ZSgpO1xuXG4gICAgY29uc3QgbG9nZ2VyQ29yZSA9IGxvZ2dlci5mcm9tKCdjb3JlJyk7XG4gICAgbG9nZ2VyLmxvY2soKTtcblxuICAgIGNvbnN0IGNvbXBpbGVySG9va3MgPSBwbHVnaW5Db21wYXQuaG9va3MoY29tcGlsZXIpO1xuXG4gICAgaWYgKCFjb21waWxlci5vcHRpb25zLmNhY2hlKSB7XG4gICAgICBjb21waWxlci5vcHRpb25zLmNhY2hlID0gdHJ1ZTtcbiAgICB9XG5cbiAgICBpZiAoIW9wdGlvbnMuY2FjaGVEaXJlY3RvcnkpIHtcbiAgICAgIG9wdGlvbnMuY2FjaGVEaXJlY3RvcnkgPSBwYXRoLnJlc29sdmUoXG4gICAgICAgIGZpbmRDYWNoZURpcih7XG4gICAgICAgICAgbmFtZTogJ2hhcmQtc291cmNlJyxcbiAgICAgICAgICBjd2Q6IGNvbXBpbGVyLm9wdGlvbnMuY29udGV4dCB8fCBwcm9jZXNzLmN3ZCgpLFxuICAgICAgICB9KSxcbiAgICAgICAgJ1tjb25maWdoYXNoXScsXG4gICAgICApO1xuICAgIH1cblxuICAgIHRoaXMuY29tcGlsZXJPdXRwdXRPcHRpb25zID0gY29tcGlsZXIub3B0aW9ucy5vdXRwdXQ7XG4gICAgaWYgKCFvcHRpb25zLmNvbmZpZ0hhc2gpIHtcbiAgICAgIG9wdGlvbnMuY29uZmlnSGFzaCA9IGRlZmF1bHRDb25maWdIYXNoO1xuICAgIH1cbiAgICBpZiAob3B0aW9ucy5jb25maWdIYXNoKSB7XG4gICAgICBpZiAodHlwZW9mIG9wdGlvbnMuY29uZmlnSGFzaCA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgdGhpcy5jb25maWdIYXNoID0gb3B0aW9ucy5jb25maWdIYXNoO1xuICAgICAgfSBlbHNlIGlmICh0eXBlb2Ygb3B0aW9ucy5jb25maWdIYXNoID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIHRoaXMuY29uZmlnSGFzaCA9IG9wdGlvbnMuY29uZmlnSGFzaChjb21waWxlci5vcHRpb25zKTtcbiAgICAgIH1cbiAgICAgIGNvbXBpbGVyLl9faGFyZFNvdXJjZV9jb25maWdIYXNoID0gdGhpcy5jb25maWdIYXNoO1xuICAgICAgY29tcGlsZXIuX19oYXJkU291cmNlX3Nob3J0Q29uZmlnSGFzaCA9IHRoaXMuY29uZmlnSGFzaC5zdWJzdHJpbmcoMCwgOCk7XG4gICAgfVxuICAgIGNvbnN0IGNvbmZpZ0hhc2hJbkRpcmVjdG9yeSA9XG4gICAgICBvcHRpb25zLmNhY2hlRGlyZWN0b3J5LnNlYXJjaCgvXFxbY29uZmlnaGFzaFxcXS8pICE9PSAtMTtcbiAgICBpZiAoY29uZmlnSGFzaEluRGlyZWN0b3J5ICYmICF0aGlzLmNvbmZpZ0hhc2gpIHtcbiAgICAgIGxvZ01lc3NhZ2VzLmNvbmZpZ0hhc2hTZXRCdXROb3RVc2VkKGNvbXBpbGVyLCB7XG4gICAgICAgIGNhY2hlRGlyZWN0b3J5OiBvcHRpb25zLmNhY2hlRGlyZWN0b3J5LFxuICAgICAgfSk7XG4gICAgICBhY3RpdmUgPSBmYWxzZTtcblxuICAgICAgZnVuY3Rpb24gdW5sb2NrTG9nZ2VyKCkge1xuICAgICAgICBsb2dnZXIudW5sb2NrKCk7XG4gICAgICB9XG4gICAgICBjb21waWxlckhvb2tzLndhdGNoUnVuLnRhcCgnSGFyZFNvdXJjZSAtIGluZGV4JywgdW5sb2NrTG9nZ2VyKTtcbiAgICAgIGNvbXBpbGVySG9va3MucnVuLnRhcCgnSGFyZFNvdXJjZSAtIGluZGV4JywgdW5sb2NrTG9nZ2VyKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBsZXQgZW52aXJvbm1lbnRIYXNoZXIgPSBudWxsO1xuICAgIGlmICh0eXBlb2Ygb3B0aW9ucy5lbnZpcm9ubWVudEhhc2ggIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICBpZiAob3B0aW9ucy5lbnZpcm9ubWVudEhhc2ggPT09IGZhbHNlKSB7XG4gICAgICAgIGVudmlyb25tZW50SGFzaGVyID0gKCkgPT4gUHJvbWlzZS5yZXNvbHZlKCcnKTtcbiAgICAgIH0gZWxzZSBpZiAodHlwZW9mIG9wdGlvbnMuZW52aXJvbm1lbnRIYXNoID09PSAnc3RyaW5nJykge1xuICAgICAgICBlbnZpcm9ubWVudEhhc2hlciA9ICgpID0+IFByb21pc2UucmVzb2x2ZShvcHRpb25zLmVudmlyb25tZW50SGFzaCk7XG4gICAgICB9IGVsc2UgaWYgKHR5cGVvZiBvcHRpb25zLmVudmlyb25tZW50SGFzaCA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgZW52aXJvbm1lbnRIYXNoZXIgPSAoKSA9PiBlbnZIYXNoKG9wdGlvbnMuZW52aXJvbm1lbnRIYXNoKTtcbiAgICAgICAgZW52aXJvbm1lbnRIYXNoZXIuaW5wdXRzID0gKCkgPT5cbiAgICAgICAgICBlbnZIYXNoLmlucHV0cyhvcHRpb25zLmVudmlyb25tZW50SGFzaCk7XG4gICAgICB9IGVsc2UgaWYgKHR5cGVvZiBvcHRpb25zLmVudmlyb25tZW50SGFzaCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICBlbnZpcm9ubWVudEhhc2hlciA9ICgpID0+IFByb21pc2UucmVzb2x2ZShvcHRpb25zLmVudmlyb25tZW50SGFzaCgpKTtcbiAgICAgICAgaWYgKG9wdGlvbnMuZW52aXJvbm1lbnRIYXNoLmlucHV0cykge1xuICAgICAgICAgIGVudmlyb25tZW50SGFzaGVyLmlucHV0cyA9ICgpID0+XG4gICAgICAgICAgICBQcm9taXNlLnJlc29sdmUob3B0aW9ucy5lbnZpcm9ubWVudEhhc2hlci5pbnB1dHMoKSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKCFlbnZpcm9ubWVudEhhc2hlcikge1xuICAgICAgZW52aXJvbm1lbnRIYXNoZXIgPSBlbnZIYXNoO1xuICAgIH1cblxuICAgIGNvbnN0IGNhY2hlRGlyUGF0aCA9IHRoaXMuZ2V0Q2FjaGVQYXRoKCk7XG4gICAgY29uc3QgY2FjaGVBc3NldERpclBhdGggPSBwYXRoLmpvaW4oY2FjaGVEaXJQYXRoLCAnYXNzZXRzJyk7XG4gICAgY29uc3QgcmVzb2x2ZUNhY2hlUGF0aCA9IHBhdGguam9pbihjYWNoZURpclBhdGgsICdyZXNvbHZlLmpzb24nKTtcblxuICAgIGxldCBjdXJyZW50U3RhbXAgPSAnJztcblxuICAgIGNvbnN0IGNhY2hlU2VyaWFsaXplckZhY3RvcnkgPSBuZXcgQ2FjaGVTZXJpYWxpemVyRmFjdG9yeShjb21waWxlcik7XG4gICAgbGV0IGNyZWF0ZVNlcmlhbGl6ZXJzID0gdHJ1ZTtcbiAgICBsZXQgY2FjaGVSZWFkID0gZmFsc2U7XG5cbiAgICBjb25zdCBfdGhpcyA9IHRoaXM7XG5cbiAgICBwbHVnaW5Db21wYXQucmVnaXN0ZXIoY29tcGlsZXIsICdfaGFyZFNvdXJjZUNyZWF0ZVNlcmlhbGl6ZXInLCAnc3luYycsIFtcbiAgICAgICdjYWNoZVNlcmlhbGl6ZXJGYWN0b3J5JyxcbiAgICAgICdjYWNoZURpclBhdGgnLFxuICAgIF0pO1xuICAgIHBsdWdpbkNvbXBhdC5yZWdpc3Rlcihjb21waWxlciwgJ19oYXJkU291cmNlUmVzZXRDYWNoZScsICdzeW5jJywgW10pO1xuICAgIHBsdWdpbkNvbXBhdC5yZWdpc3Rlcihjb21waWxlciwgJ19oYXJkU291cmNlUmVhZENhY2hlJywgJ2FzeW5jUGFyYWxsZWwnLCBbXG4gICAgICAncmVsYXRpdmVIZWxwZXJzJyxcbiAgICBdKTtcbiAgICBwbHVnaW5Db21wYXQucmVnaXN0ZXIoXG4gICAgICBjb21waWxlcixcbiAgICAgICdfaGFyZFNvdXJjZVZlcmlmeUNhY2hlJyxcbiAgICAgICdhc3luY1BhcmFsbGVsJyxcbiAgICAgIFtdLFxuICAgICk7XG4gICAgcGx1Z2luQ29tcGF0LnJlZ2lzdGVyKGNvbXBpbGVyLCAnX2hhcmRTb3VyY2VXcml0ZUNhY2hlJywgJ2FzeW5jUGFyYWxsZWwnLCBbXG4gICAgICAnY29tcGlsYXRpb24nLFxuICAgICAgJ3JlbGF0aXZlSGVscGVycycsXG4gICAgXSk7XG5cbiAgICBmdW5jdGlvbiBydW5SZWFkT3JSZXNldChfY29tcGlsZXIpIHtcbiAgICAgIGxvZ2dlci51bmxvY2soKTtcblxuICAgICAgaWYgKCFhY3RpdmUpIHtcbiAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpO1xuICAgICAgfVxuXG4gICAgICB0cnkge1xuICAgICAgICBmcy5zdGF0U3luYyhjYWNoZUFzc2V0RGlyUGF0aCk7XG4gICAgICB9IGNhdGNoIChfKSB7XG4gICAgICAgIG1rZGlycC5zeW5jKGNhY2hlQXNzZXREaXJQYXRoKTtcbiAgICAgICAgbG9nTWVzc2FnZXMuY29uZmlnSGFzaEZpcnN0QnVpbGQoY29tcGlsZXIsIHtcbiAgICAgICAgICBjYWNoZURpclBhdGgsXG4gICAgICAgICAgY29uZmlnSGFzaDogY29tcGlsZXIuX19oYXJkU291cmNlX2NvbmZpZ0hhc2gsXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgICAgY29uc3Qgc3RhcnQgPSBEYXRlLm5vdygpO1xuXG4gICAgICBpZiAoY3JlYXRlU2VyaWFsaXplcnMpIHtcbiAgICAgICAgY3JlYXRlU2VyaWFsaXplcnMgPSBmYWxzZTtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBjb21waWxlckhvb2tzLl9oYXJkU291cmNlQ3JlYXRlU2VyaWFsaXplci5jYWxsKFxuICAgICAgICAgICAgY2FjaGVTZXJpYWxpemVyRmFjdG9yeSxcbiAgICAgICAgICAgIGNhY2hlRGlyUGF0aCxcbiAgICAgICAgICApO1xuICAgICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZWplY3QoZXJyKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICByZXR1cm4gUHJvbWlzZS5hbGwoW1xuICAgICAgICBmc1JlYWRGaWxlKHBhdGguam9pbihjYWNoZURpclBhdGgsICdzdGFtcCcpLCAndXRmOCcpLmNhdGNoKCgpID0+ICcnKSxcblxuICAgICAgICBlbnZpcm9ubWVudEhhc2hlcigpLFxuXG4gICAgICAgIGZzUmVhZEZpbGUocGF0aC5qb2luKGNhY2hlRGlyUGF0aCwgJ3ZlcnNpb24nKSwgJ3V0ZjgnKS5jYXRjaCgoKSA9PiAnJyksXG5cbiAgICAgICAgZW52aXJvbm1lbnRIYXNoZXIuaW5wdXRzID8gZW52aXJvbm1lbnRIYXNoZXIuaW5wdXRzKCkgOiBudWxsLFxuICAgICAgXSkudGhlbigoW3N0YW1wLCBoYXNoLCB2ZXJzaW9uU3RhbXAsIGhhc2hJbnB1dHNdKSA9PiB7XG4gICAgICAgIGlmICghY29uZmlnSGFzaEluRGlyZWN0b3J5ICYmIG9wdGlvbnMuY29uZmlnSGFzaCkge1xuICAgICAgICAgIGhhc2ggKz0gYF8ke190aGlzLmNvbmZpZ0hhc2h9YDtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChoYXNoSW5wdXRzICYmICFjYWNoZVJlYWQpIHtcbiAgICAgICAgICBsb2dNZXNzYWdlcy5lbnZpcm9ubWVudElucHV0cyhjb21waWxlciwgeyBpbnB1dHM6IGhhc2hJbnB1dHMgfSk7XG4gICAgICAgIH1cblxuICAgICAgICBjdXJyZW50U3RhbXAgPSBoYXNoO1xuICAgICAgICBpZiAoIWhhc2ggfHwgaGFzaCAhPT0gc3RhbXAgfHwgaGFyZFNvdXJjZVZlcnNpb24gIT09IHZlcnNpb25TdGFtcCkge1xuICAgICAgICAgIGlmIChoYXNoICYmIHN0YW1wKSB7XG4gICAgICAgICAgICBpZiAoY29uZmlnSGFzaEluRGlyZWN0b3J5KSB7XG4gICAgICAgICAgICAgIGxvZ01lc3NhZ2VzLmVudmlyb25tZW50SGFzaENoYW5nZWQoY29tcGlsZXIpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgbG9nTWVzc2FnZXMuY29uZmlnSGFzaENoYW5nZWQoY29tcGlsZXIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gZWxzZSBpZiAodmVyc2lvblN0YW1wICYmIGhhcmRTb3VyY2VWZXJzaW9uICE9PSB2ZXJzaW9uU3RhbXApIHtcbiAgICAgICAgICAgIGxvZ01lc3NhZ2VzLmhhcmRTb3VyY2VWZXJzaW9uQ2hhbmdlZChjb21waWxlcik7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgLy8gUmVzZXQgdGhlIGNhY2hlLCB3ZSBjYW4ndCB1c2UgaXQgZG8gdG8gYW4gZW52aXJvbm1lbnQgY2hhbmdlLlxuICAgICAgICAgIHBsdWdpbkNvbXBhdC5jYWxsKGNvbXBpbGVyLCAnX2hhcmRTb3VyY2VSZXNldENhY2hlJywgW10pO1xuXG4gICAgICAgICAgcmV0dXJuIHJpbXJhZihjYWNoZURpclBhdGgpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGNhY2hlUmVhZCkge1xuICAgICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoKTtcbiAgICAgICAgfVxuICAgICAgICBjYWNoZVJlYWQgPSB0cnVlO1xuXG4gICAgICAgIGxvZ01lc3NhZ2VzLmNvbmZpZ0hhc2hCdWlsZFdpdGgoY29tcGlsZXIsIHtcbiAgICAgICAgICBjYWNoZURpclBhdGgsXG4gICAgICAgICAgY29uZmlnSGFzaDogY29tcGlsZXIuX19oYXJkU291cmNlX2NvbmZpZ0hhc2gsXG4gICAgICAgIH0pO1xuXG4gICAgICAgIGZ1bmN0aW9uIGNvbnRleHRLZXlzKGNvbXBpbGVyLCBmbikge1xuICAgICAgICAgIHJldHVybiBzb3VyY2UgPT4ge1xuICAgICAgICAgICAgY29uc3QgZGVzdCA9IHt9O1xuICAgICAgICAgICAgT2JqZWN0LmtleXMoc291cmNlKS5mb3JFYWNoKGtleSA9PiB7XG4gICAgICAgICAgICAgIGRlc3RbZm4oY29tcGlsZXIsIGtleSldID0gc291cmNlW2tleV07XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHJldHVybiBkZXN0O1xuICAgICAgICAgIH07XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBjb250ZXh0VmFsdWVzKGNvbXBpbGVyLCBmbikge1xuICAgICAgICAgIHJldHVybiBzb3VyY2UgPT4ge1xuICAgICAgICAgICAgY29uc3QgZGVzdCA9IHt9O1xuICAgICAgICAgICAgT2JqZWN0LmtleXMoc291cmNlKS5mb3JFYWNoKGtleSA9PiB7XG4gICAgICAgICAgICAgIGNvbnN0IHZhbHVlID0gZm4oY29tcGlsZXIsIHNvdXJjZVtrZXldLCBrZXkpO1xuICAgICAgICAgICAgICBpZiAodmFsdWUpIHtcbiAgICAgICAgICAgICAgICBkZXN0W2tleV0gPSB2YWx1ZTtcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBkZWxldGUgZGVzdFtrZXldO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHJldHVybiBkZXN0O1xuICAgICAgICAgIH07XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBjb3B5V2l0aERlc2VyKGRlc3QsIHNvdXJjZSkge1xuICAgICAgICAgIE9iamVjdC5rZXlzKHNvdXJjZSkuZm9yRWFjaChrZXkgPT4ge1xuICAgICAgICAgICAgY29uc3QgaXRlbSA9IHNvdXJjZVtrZXldO1xuICAgICAgICAgICAgZGVzdFtrZXldID0gdHlwZW9mIGl0ZW0gPT09ICdzdHJpbmcnID8gSlNPTi5wYXJzZShpdGVtKSA6IGl0ZW07XG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gUHJvbWlzZS5hbGwoW1xuICAgICAgICAgIGNvbXBpbGVySG9va3MuX2hhcmRTb3VyY2VSZWFkQ2FjaGUucHJvbWlzZSh7XG4gICAgICAgICAgICBjb250ZXh0S2V5cyxcbiAgICAgICAgICAgIGNvbnRleHRWYWx1ZXMsXG4gICAgICAgICAgICBjb250ZXh0Tm9ybWFsUGF0aCxcbiAgICAgICAgICAgIGNvbnRleHROb3JtYWxSZXF1ZXN0LFxuICAgICAgICAgICAgY29udGV4dE5vcm1hbE1vZHVsZUlkLFxuICAgICAgICAgICAgY29weVdpdGhEZXNlcixcbiAgICAgICAgICB9KSxcbiAgICAgICAgXSlcbiAgICAgICAgICAuY2F0Y2goZXJyb3IgPT4ge1xuICAgICAgICAgICAgbG9nTWVzc2FnZXMuc2VyaWFsQmFkQ2FjaGUoY29tcGlsZXIsIGVycm9yKTtcblxuICAgICAgICAgICAgcmV0dXJuIHJpbXJhZihjYWNoZURpclBhdGgpO1xuICAgICAgICAgIH0pXG4gICAgICAgICAgLnRoZW4oKCkgPT4ge1xuICAgICAgICAgICAgLy8gY29uc29sZS5sb2coJ2NhY2hlIGluJywgRGF0ZS5ub3coKSAtIHN0YXJ0KTtcbiAgICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHJ1blZlcmlmeShfY29tcGlsZXIpIHtcbiAgICAgIGlmICghYWN0aXZlKSB7XG4gICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoKTtcbiAgICAgIH1cblxuICAgICAgY29uc3Qgc3RhdHMgPSB7fTtcbiAgICAgIHJldHVybiBwbHVnaW5Db21wYXQucHJvbWlzZShjb21waWxlciwgJ19oYXJkU291cmNlVmVyaWZ5Q2FjaGUnLCBbXSk7XG4gICAgfVxuXG4gICAgY29tcGlsZXJIb29rcy53YXRjaFJ1bi50YXBQcm9taXNlKFxuICAgICAgJ0hhcmRTb3VyY2UgLSBpbmRleCAtIHJlYWRPclJlc2V0JyxcbiAgICAgIHJ1blJlYWRPclJlc2V0LFxuICAgICk7XG4gICAgY29tcGlsZXJIb29rcy5ydW4udGFwUHJvbWlzZShcbiAgICAgICdIYXJkU291cmNlIC0gaW5kZXggLSByZWFkT3JSZXNldCcsXG4gICAgICBydW5SZWFkT3JSZXNldCxcbiAgICApO1xuXG4gICAgY29uc3QgZGV0ZWN0TW9kdWxlID0gcGF0aCA9PiB7XG4gICAgICB0cnkge1xuICAgICAgICByZXF1aXJlKHBhdGgpO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH0gY2F0Y2ggKF8pIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgIH07XG5cbiAgICBjb25zdCB3ZWJwYWNrRmVhdHVyZXMgPSB7XG4gICAgICBjb25jYXRlbmF0ZWRNb2R1bGU6IGRldGVjdE1vZHVsZShcbiAgICAgICAgJ3dlYnBhY2svbGliL29wdGltaXplL0NvbmNhdGVuYXRlZE1vZHVsZScsXG4gICAgICApLFxuICAgICAgZ2VuZXJhdG9yOiBkZXRlY3RNb2R1bGUoJ3dlYnBhY2svbGliL0phdmFzY3JpcHRHZW5lcmF0b3InKSxcbiAgICB9O1xuXG4gICAgbGV0IHNjaGVtYXNWZXJzaW9uID0gMjtcbiAgICBpZiAod2VicGFja0ZlYXR1cmVzLmNvbmNhdGVuYXRlZE1vZHVsZSkge1xuICAgICAgc2NoZW1hc1ZlcnNpb24gPSAzO1xuICAgIH1cbiAgICBpZiAod2VicGFja0ZlYXR1cmVzLmdlbmVyYXRvcikge1xuICAgICAgc2NoZW1hc1ZlcnNpb24gPSA0O1xuICAgIH1cblxuICAgIGNvbnN0IEFyY2hldHlwZVN5c3RlbSA9IHJlcXVpcmUoJy4vbGliL1N5c3RlbUFyY2hldHlwZScpO1xuICAgIGNvbnN0IFBhcml0eVN5c3RlbSA9IHJlcXVpcmUoJy4vbGliL1N5c3RlbVBhcml0eScpO1xuXG4gICAgY29uc3QgQXNzZXRDYWNoZSA9IHJlcXVpcmUoJy4vbGliL0NhY2hlQXNzZXQnKTtcbiAgICBjb25zdCBNb2R1bGVDYWNoZSA9IHJlcXVpcmUoJy4vbGliL0NhY2hlTW9kdWxlJyk7XG5cbiAgICBjb25zdCBFbmhhbmNlZFJlc29sdmVDYWNoZSA9IHJlcXVpcmUoJy4vbGliL0NhY2hlRW5oYW5jZWRSZXNvbHZlJyk7XG4gICAgY29uc3QgTWQ1Q2FjaGUgPSByZXF1aXJlKCcuL2xpYi9DYWNoZU1kNScpO1xuICAgIGNvbnN0IE1vZHVsZVJlc29sdmVyQ2FjaGUgPSByZXF1aXJlKCcuL2xpYi9DYWNoZU1vZHVsZVJlc29sdmVyJyk7XG5cbiAgICBjb25zdCBUcmFuc2Zvcm1Db21waWxhdGlvblBsdWdpbiA9IHJlcXVpcmUoJy4vbGliL1RyYW5zZm9ybUNvbXBpbGF0aW9uUGx1Z2luJyk7XG4gICAgY29uc3QgVHJhbnNmb3JtQXNzZXRQbHVnaW4gPSByZXF1aXJlKCcuL2xpYi9UcmFuc2Zvcm1Bc3NldFBsdWdpbicpO1xuICAgIGxldCBUcmFuc2Zvcm1Db25jYXRlbmF0aW9uTW9kdWxlUGx1Z2luO1xuICAgIGlmICh3ZWJwYWNrRmVhdHVyZXMuY29uY2F0ZW5hdGVkTW9kdWxlKSB7XG4gICAgICBUcmFuc2Zvcm1Db25jYXRlbmF0aW9uTW9kdWxlUGx1Z2luID0gcmVxdWlyZSgnLi9saWIvVHJhbnNmb3JtQ29uY2F0ZW5hdGlvbk1vZHVsZVBsdWdpbicpO1xuICAgIH1cbiAgICBjb25zdCBUcmFuc2Zvcm1Ob3JtYWxNb2R1bGVQbHVnaW4gPSByZXF1aXJlKCcuL2xpYi9UcmFuc2Zvcm1Ob3JtYWxNb2R1bGVQbHVnaW4nKTtcbiAgICBjb25zdCBUcmFuc2Zvcm1Ob3JtYWxNb2R1bGVGYWN0b3J5UGx1Z2luID0gcmVxdWlyZSgnLi9saWIvVHJhbnNmb3JtTm9ybWFsTW9kdWxlRmFjdG9yeVBsdWdpbicpO1xuICAgIGNvbnN0IFRyYW5zZm9ybU1vZHVsZUFzc2V0c1BsdWdpbiA9IHJlcXVpcmUoJy4vbGliL1RyYW5zZm9ybU1vZHVsZUFzc2V0c1BsdWdpbicpO1xuICAgIGNvbnN0IFRyYW5zZm9ybU1vZHVsZUVycm9yc1BsdWdpbiA9IHJlcXVpcmUoJy4vbGliL1RyYW5zZm9ybU1vZHVsZUVycm9yc1BsdWdpbicpO1xuICAgIGNvbnN0IFN1cHBvcnRFeHRyYWN0VGV4dFBsdWdpbiA9IHJlcXVpcmUoJy4vbGliL1N1cHBvcnRFeHRyYWN0VGV4dFBsdWdpbicpO1xuICAgIGxldCBTdXBwb3J0TWluaUNzc0V4dHJhY3RQbHVnaW47XG4gICAgbGV0IEV4Y2x1ZGVNaW5pQ3NzTW9kdWxlUGx1Z2luO1xuICAgIGlmICh3ZWJwYWNrRmVhdHVyZXMuZ2VuZXJhdG9yKSB7XG4gICAgICBTdXBwb3J0TWluaUNzc0V4dHJhY3RQbHVnaW4gPSByZXF1aXJlKCcuL2xpYi9TdXBwb3J0TWluaUNzc0V4dHJhY3RQbHVnaW4nKTtcbiAgICAgIEV4Y2x1ZGVNaW5pQ3NzTW9kdWxlUGx1Z2luID0gcmVxdWlyZSgnLi9saWIvRXhjbHVkZU1pbmlDc3NNb2R1bGVQbHVnaW4nKTtcbiAgICB9XG4gICAgY29uc3QgVHJhbnNmb3JtRGVwZW5kZW5jeUJsb2NrUGx1Z2luID0gcmVxdWlyZSgnLi9saWIvVHJhbnNmb3JtRGVwZW5kZW5jeUJsb2NrUGx1Z2luJyk7XG4gICAgY29uc3QgVHJhbnNmb3JtQmFzaWNEZXBlbmRlbmN5UGx1Z2luID0gcmVxdWlyZSgnLi9saWIvVHJhbnNmb3JtQmFzaWNEZXBlbmRlbmN5UGx1Z2luJyk7XG4gICAgbGV0IEhhcmRIYXJtb255RGVwZW5kZW5jeVBsdWdpbjtcbiAgICBjb25zdCBUcmFuc2Zvcm1Tb3VyY2VQbHVnaW4gPSByZXF1aXJlKCcuL2xpYi9UcmFuc2Zvcm1Tb3VyY2VQbHVnaW4nKTtcbiAgICBjb25zdCBUcmFuc2Zvcm1QYXJzZXJQbHVnaW4gPSByZXF1aXJlKCcuL2xpYi9UcmFuc2Zvcm1QYXJzZXJQbHVnaW4nKTtcbiAgICBsZXQgVHJhbnNmb3JtR2VuZXJhdG9yUGx1Z2luO1xuICAgIGlmICh3ZWJwYWNrRmVhdHVyZXMuZ2VuZXJhdG9yKSB7XG4gICAgICBUcmFuc2Zvcm1HZW5lcmF0b3JQbHVnaW4gPSByZXF1aXJlKCcuL2xpYi9UcmFuc2Zvcm1HZW5lcmF0b3JQbHVnaW4nKTtcbiAgICB9XG5cbiAgICBjb25zdCBDaGFsa0xvZ2dlclBsdWdpbiA9IHJlcXVpcmUoJy4vbGliL0NoYWxrTG9nZ2VyUGx1Z2luJyk7XG5cbiAgICBuZXcgQXJjaGV0eXBlU3lzdGVtKCkuYXBwbHkoY29tcGlsZXIpO1xuICAgIG5ldyBQYXJpdHlTeXN0ZW0oKS5hcHBseShjb21waWxlcik7XG5cbiAgICBuZXcgQXNzZXRDYWNoZSgpLmFwcGx5KGNvbXBpbGVyKTtcbiAgICBuZXcgTW9kdWxlQ2FjaGUoKS5hcHBseShjb21waWxlcik7XG5cbiAgICBuZXcgRW5oYW5jZWRSZXNvbHZlQ2FjaGUoKS5hcHBseShjb21waWxlcik7XG4gICAgbmV3IE1kNUNhY2hlKCkuYXBwbHkoY29tcGlsZXIpO1xuICAgIG5ldyBNb2R1bGVSZXNvbHZlckNhY2hlKCkuYXBwbHkoY29tcGlsZXIpO1xuXG4gICAgbmV3IFRyYW5zZm9ybUNvbXBpbGF0aW9uUGx1Z2luKCkuYXBwbHkoY29tcGlsZXIpO1xuXG4gICAgbmV3IFRyYW5zZm9ybUFzc2V0UGx1Z2luKCkuYXBwbHkoY29tcGlsZXIpO1xuXG4gICAgbmV3IFRyYW5zZm9ybU5vcm1hbE1vZHVsZVBsdWdpbih7XG4gICAgICBzY2hlbWE6IHNjaGVtYXNWZXJzaW9uLFxuICAgIH0pLmFwcGx5KGNvbXBpbGVyKTtcbiAgICBuZXcgVHJhbnNmb3JtTm9ybWFsTW9kdWxlRmFjdG9yeVBsdWdpbigpLmFwcGx5KGNvbXBpbGVyKTtcblxuICAgIGlmIChUcmFuc2Zvcm1Db25jYXRlbmF0aW9uTW9kdWxlUGx1Z2luKSB7XG4gICAgICBuZXcgVHJhbnNmb3JtQ29uY2F0ZW5hdGlvbk1vZHVsZVBsdWdpbigpLmFwcGx5KGNvbXBpbGVyKTtcbiAgICB9XG5cbiAgICBuZXcgVHJhbnNmb3JtTW9kdWxlQXNzZXRzUGx1Z2luKCkuYXBwbHkoY29tcGlsZXIpO1xuICAgIG5ldyBUcmFuc2Zvcm1Nb2R1bGVFcnJvcnNQbHVnaW4oKS5hcHBseShjb21waWxlcik7XG4gICAgbmV3IFN1cHBvcnRFeHRyYWN0VGV4dFBsdWdpbigpLmFwcGx5KGNvbXBpbGVyKTtcblxuICAgIGlmIChTdXBwb3J0TWluaUNzc0V4dHJhY3RQbHVnaW4pIHtcbiAgICAgIG5ldyBTdXBwb3J0TWluaUNzc0V4dHJhY3RQbHVnaW4oKS5hcHBseShjb21waWxlcik7XG4gICAgICBuZXcgRXhjbHVkZU1pbmlDc3NNb2R1bGVQbHVnaW4oKS5hcHBseShjb21waWxlcik7XG4gICAgfVxuXG4gICAgbmV3IFRyYW5zZm9ybURlcGVuZGVuY3lCbG9ja1BsdWdpbih7XG4gICAgICBzY2hlbWE6IHNjaGVtYXNWZXJzaW9uLFxuICAgIH0pLmFwcGx5KGNvbXBpbGVyKTtcblxuICAgIG5ldyBUcmFuc2Zvcm1CYXNpY0RlcGVuZGVuY3lQbHVnaW4oe1xuICAgICAgc2NoZW1hOiBzY2hlbWFzVmVyc2lvbixcbiAgICB9KS5hcHBseShjb21waWxlcik7XG5cbiAgICBuZXcgVHJhbnNmb3JtU291cmNlUGx1Z2luKHtcbiAgICAgIHNjaGVtYTogc2NoZW1hc1ZlcnNpb24sXG4gICAgfSkuYXBwbHkoY29tcGlsZXIpO1xuXG4gICAgbmV3IFRyYW5zZm9ybVBhcnNlclBsdWdpbih7XG4gICAgICBzY2hlbWE6IHNjaGVtYXNWZXJzaW9uLFxuICAgIH0pLmFwcGx5KGNvbXBpbGVyKTtcblxuICAgIGlmIChUcmFuc2Zvcm1HZW5lcmF0b3JQbHVnaW4pIHtcbiAgICAgIG5ldyBUcmFuc2Zvcm1HZW5lcmF0b3JQbHVnaW4oe1xuICAgICAgICBzY2hlbWE6IHNjaGVtYXNWZXJzaW9uLFxuICAgICAgfSkuYXBwbHkoY29tcGlsZXIpO1xuICAgIH1cblxuICAgIG5ldyBDaGFsa0xvZ2dlclBsdWdpbih0aGlzLm9wdGlvbnMuaW5mbykuYXBwbHkoY29tcGlsZXIpO1xuXG4gICAgY29tcGlsZXJIb29rcy53YXRjaFJ1bi50YXBQcm9taXNlKCdIYXJkU291cmNlIC0gaW5kZXggLSB2ZXJpZnknLCBydW5WZXJpZnkpO1xuICAgIGNvbXBpbGVySG9va3MucnVuLnRhcFByb21pc2UoJ0hhcmRTb3VyY2UgLSBpbmRleCAtIHZlcmlmeScsIHJ1blZlcmlmeSk7XG5cbiAgICBsZXQgZnJlZXplO1xuXG4gICAgY29tcGlsZXJIb29rcy5faGFyZFNvdXJjZU1ldGhvZHMudGFwKCdIYXJkU291cmNlIC0gaW5kZXgnLCBtZXRob2RzID0+IHtcbiAgICAgIGZyZWV6ZSA9IG1ldGhvZHMuZnJlZXplO1xuICAgIH0pO1xuXG4gICAgY29tcGlsZXJIb29rcy5hZnRlckNvbXBpbGUudGFwUHJvbWlzZSgnSGFyZFNvdXJjZSAtIGluZGV4JywgY29tcGlsYXRpb24gPT4ge1xuICAgICAgaWYgKCFhY3RpdmUpIHtcbiAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBzdGFydENhY2hlVGltZSA9IERhdGUubm93KCk7XG5cbiAgICAgIGNvbnN0IGlkZW50aWZpZXJQcmVmaXggPSBjYWNoZVByZWZpeChjb21waWxhdGlvbik7XG4gICAgICBpZiAoaWRlbnRpZmllclByZWZpeCAhPT0gbnVsbCkge1xuICAgICAgICBmcmVlemUoJ0NvbXBpbGF0aW9uJywgbnVsbCwgY29tcGlsYXRpb24sIHtcbiAgICAgICAgICBjb21waWxhdGlvbixcbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBQcm9taXNlLmFsbChbXG4gICAgICAgIG1rZGlycChjYWNoZURpclBhdGgpLnRoZW4oKCkgPT5cbiAgICAgICAgICBQcm9taXNlLmFsbChbXG4gICAgICAgICAgICBmc1dyaXRlRmlsZShwYXRoLmpvaW4oY2FjaGVEaXJQYXRoLCAnc3RhbXAnKSwgY3VycmVudFN0YW1wLCAndXRmOCcpLFxuICAgICAgICAgICAgZnNXcml0ZUZpbGUoXG4gICAgICAgICAgICAgIHBhdGguam9pbihjYWNoZURpclBhdGgsICd2ZXJzaW9uJyksXG4gICAgICAgICAgICAgIGhhcmRTb3VyY2VWZXJzaW9uLFxuICAgICAgICAgICAgICAndXRmOCcsXG4gICAgICAgICAgICApLFxuICAgICAgICAgIF0pLFxuICAgICAgICApLFxuICAgICAgICBwbHVnaW5Db21wYXQucHJvbWlzZShjb21waWxlciwgJ19oYXJkU291cmNlV3JpdGVDYWNoZScsIFtcbiAgICAgICAgICBjb21waWxhdGlvbixcbiAgICAgICAgICB7XG4gICAgICAgICAgICByZWxhdGVOb3JtYWxQYXRoLFxuICAgICAgICAgICAgcmVsYXRlTm9ybWFsUmVxdWVzdCxcbiAgICAgICAgICAgIHJlbGF0ZU5vcm1hbE1vZHVsZUlkLFxuXG4gICAgICAgICAgICBjb250ZXh0Tm9ybWFsUGF0aCxcbiAgICAgICAgICAgIGNvbnRleHROb3JtYWxSZXF1ZXN0LFxuICAgICAgICAgICAgY29udGV4dE5vcm1hbE1vZHVsZUlkLFxuICAgICAgICAgIH0sXG4gICAgICAgIF0pLFxuICAgICAgXSkudGhlbigoKSA9PiB7XG4gICAgICAgIC8vIGNvbnNvbGUubG9nKCdjYWNoZSBvdXQnLCBEYXRlLm5vdygpIC0gc3RhcnRDYWNoZVRpbWUpO1xuICAgICAgfSk7XG4gICAgfSk7XG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBIYXJkU291cmNlV2VicGFja1BsdWdpbjtcblxuSGFyZFNvdXJjZVdlYnBhY2tQbHVnaW4uRXhjbHVkZU1vZHVsZVBsdWdpbiA9IEV4Y2x1ZGVNb2R1bGVQbHVnaW47XG5IYXJkU291cmNlV2VicGFja1BsdWdpbi5IYXJkU291cmNlTGV2ZWxEYlNlcmlhbGl6ZXJQbHVnaW4gPSBIYXJkU291cmNlTGV2ZWxEYlNlcmlhbGl6ZXJQbHVnaW47XG5IYXJkU291cmNlV2VicGFja1BsdWdpbi5MZXZlbERiU2VyaWFsaXplclBsdWdpbiA9IEhhcmRTb3VyY2VMZXZlbERiU2VyaWFsaXplclBsdWdpbjtcbkhhcmRTb3VyY2VXZWJwYWNrUGx1Z2luLlNlcmlhbGl6ZXJBcHBlbmQyUGx1Z2luID0gU2VyaWFsaXplckFwcGVuZDJQbHVnaW47XG5IYXJkU291cmNlV2VicGFja1BsdWdpbi5TZXJpYWxpemVyQXBwZW5kUGx1Z2luID0gU2VyaWFsaXplckFwcGVuZFBsdWdpbjtcbkhhcmRTb3VyY2VXZWJwYWNrUGx1Z2luLlNlcmlhbGl6ZXJDYWNhY2hlUGx1Z2luID0gU2VyaWFsaXplckNhY2FjaGVQbHVnaW47XG5IYXJkU291cmNlV2VicGFja1BsdWdpbi5TZXJpYWxpemVySnNvblBsdWdpbiA9IFNlcmlhbGl6ZXJKc29uUGx1Z2luO1xuIl0sInNvdXJjZVJvb3QiOiIvVXNlcnMvdHlsZXJhcmJ1cy9kZXYvcHJvdmlkZXIvc3JjIn0=

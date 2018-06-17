'use strict';

require('source-map-support/register');

/**
 * The LoggerFactory wraps a hard source plugin exposed on the webpack Compiler.
 *
 * The plugin handle, `'hard-source-log'` takes one object as input and should
 * log it to the console, disk, or somewhere. Or not if it the message should
 * be ignored. The object has a few arguments that generally follows this
 * structure. The `data` key will generally have an `id` value.
 *
 * ```js
 * {
 *   from: 'core',
 *   level: 'error',
 *   message: 'HardSourceWebpackPlugin requires a cacheDirectory setting.',
 *   data: {
 *     id: 'need-cache-directory-option'
 *   }
 * }
 * ```
 *
 * So a simple plugin handle may be
 *
 * ```js
 * compiler.plugin('hard-source-log', function(message) {
 *   console[message.level].call(
 *     console,
 *     'hard-source:' + message.from, message.message
 *   );
 * });
 * ```
 *
 * @module hard-source-webpack-plugin/logger-factory
 * @author Michael "Z" Goddard <mzgoddard@gmail.com>
 */

const pluginCompat = require('./util/plugin-compat');

const LOGGER_SEPARATOR = ':';
const DEFAULT_LOGGER_PREFIX = 'hard-source';
const LOGGER_FACTORY_COMPILER_KEY = `${__dirname}/hard-source-logger-factory-compiler-key`;

/**
 * @constructor Logger
 * @memberof module:hard-source-webpack-plugin/logger-factory
 */
class Logger {
  constructor(compiler) {
    this.compiler = compiler;
    this._lock = null;
  }

  /**
   * @method lock
   * @memberof module:hard-source-webpack-plugin/logger-factory~Logger#
   */
  lock() {
    this._lock = [];
  }

  /**
   * @method unlock
   * @memberof module:hard-source-webpack-plugin/logger-factory~Logger#
   */
  unlock() {
    const _this = this;
    if (_this._lock) {
      const lock = _this._lock;
      _this._lock = null;
      lock.forEach(value => {
        _this.write(value);
      });
    }
  }

  /**
   * @method write
   * @memberof module:hard-source-webpack-plugin/logger-factory~Logger#
   */
  write(value) {
    if (this._lock) {
      return this._lock.push(value);
    }

    if (this.compiler.hooks && this.compiler.hooks.hardSourceLog.taps.length) {
      this.compiler.hooks.hardSourceLog.call(value);
    } else if (this.compiler._plugins && this.compiler._plugins['hard-source-log'] && this.compiler._plugins['hard-source-log'].length) {
      (this.compiler.applyPlugins1 || this.compiler.applyPlugins).call(this.compiler, 'hard-source-log', value);
    } else {
      console.error(`[${DEFAULT_LOGGER_PREFIX}${LOGGER_SEPARATOR}${value.from}]`, value.message);
    }
  }

  /**
   * @method from
   * @memberof module:hard-source-webpack-plugin/logger-factory~Logger#
   */
  from(name) {
    return new LoggerFrom(this, name);
  }
}

/**
 * @constructor LoggerFrom
 * @memberof module:hard-source-webpack-plugin/logger-factory
 */
class LoggerFrom {
  constructor(logger, from) {
    this._logger = logger;
    this._from = from;
  }

  /**
   * @method from
   * @memberof module:hard-source-webpack-plugin/logger-factory~LoggerFrom#
   */
  from(name) {
    return new LoggerFrom(this._logger, this._from + LOGGER_SEPARATOR + name);
  }

  /**
   * @method _write
   * @memberof module:hard-source-webpack-plugin/logger-factory~LoggerFrom#
   */
  _write(level, data, message) {
    this._logger.write({
      from: this._from,
      level,
      message,
      data
    });
  }

  /**
   * @method error
   * @memberof module:hard-source-webpack-plugin/logger-factory~LoggerFrom#
   */
  error(data, message) {
    this._write('error', data, message);
  }

  /**
   * @method warn
   * @memberof module:hard-source-webpack-plugin/logger-factory~LoggerFrom#
   */
  warn(data, message) {
    this._write('warn', data, message);
  }

  /**
   * @method info
   * @memberof module:hard-source-webpack-plugin/logger-factory~LoggerFrom#
   */
  info(data, message) {
    this._write('info', data, message);
  }

  /**
   * @method log
   * @memberof module:hard-source-webpack-plugin/logger-factory~LoggerFrom#
   */
  log(data, message) {
    this._write('log', data, message);
  }

  /**
   * @method debug
   * @memberof module:hard-source-webpack-plugin/logger-factory~LoggerFrom#
   */
  debug(data, message) {
    this._write('debug', data, message);
  }
}

/**
 * @constructor LoggerFactory
 * @memberof module:hard-source-webpack-plugin/logger-factory
 */
class LoggerFactory {
  constructor(compiler) {
    this.compiler = compiler;

    pluginCompat.register(compiler, 'hardSourceLog', 'sync', ['data']);
  }

  /**
   * @method create
   * @memberof module:hard-source-webpack-plugin/logger-factory~LoggerFactory#
   */
  create() {
    const compiler = this.compiler;
    if (!compiler[LOGGER_FACTORY_COMPILER_KEY]) {
      compiler[LOGGER_FACTORY_COMPILER_KEY] = new Logger(this.compiler);
    }
    return compiler[LOGGER_FACTORY_COMPILER_KEY];
  }
}

/**
 * @function getLogger
 * @memberof module:hard-source-webpack-plugin/logger-factory~LoggerFactory.
 */
LoggerFactory.getLogger = compilation => {
  while (compilation.compiler.parentCompilation) {
    compilation = compilation.compiler.parentCompilation;
  }
  return new LoggerFactory(compilation.compiler).create();
};

module.exports = LoggerFactory;
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImhhcmQtc291cmNlLXdlYnBhY2stcGx1Z2luL2xpYi9sb2dnZXJGYWN0b3J5LmpzIl0sIm5hbWVzIjpbInBsdWdpbkNvbXBhdCIsInJlcXVpcmUiLCJMT0dHRVJfU0VQQVJBVE9SIiwiREVGQVVMVF9MT0dHRVJfUFJFRklYIiwiTE9HR0VSX0ZBQ1RPUllfQ09NUElMRVJfS0VZIiwiX19kaXJuYW1lIiwiTG9nZ2VyIiwiY29uc3RydWN0b3IiLCJjb21waWxlciIsIl9sb2NrIiwibG9jayIsInVubG9jayIsIl90aGlzIiwiZm9yRWFjaCIsInZhbHVlIiwid3JpdGUiLCJwdXNoIiwiaG9va3MiLCJoYXJkU291cmNlTG9nIiwidGFwcyIsImxlbmd0aCIsImNhbGwiLCJfcGx1Z2lucyIsImFwcGx5UGx1Z2luczEiLCJhcHBseVBsdWdpbnMiLCJjb25zb2xlIiwiZXJyb3IiLCJmcm9tIiwibWVzc2FnZSIsIm5hbWUiLCJMb2dnZXJGcm9tIiwibG9nZ2VyIiwiX2xvZ2dlciIsIl9mcm9tIiwiX3dyaXRlIiwibGV2ZWwiLCJkYXRhIiwid2FybiIsImluZm8iLCJsb2ciLCJkZWJ1ZyIsIkxvZ2dlckZhY3RvcnkiLCJyZWdpc3RlciIsImNyZWF0ZSIsImdldExvZ2dlciIsImNvbXBpbGF0aW9uIiwicGFyZW50Q29tcGlsYXRpb24iLCJtb2R1bGUiLCJleHBvcnRzIl0sIm1hcHBpbmdzIjoiOzs7O0FBQUE7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFrQ0EsTUFBTUEsZUFBZUMsUUFBUSxzQkFBUixDQUFyQjs7QUFFQSxNQUFNQyxtQkFBbUIsR0FBekI7QUFDQSxNQUFNQyx3QkFBd0IsYUFBOUI7QUFDQSxNQUFNQyw4QkFBK0IsR0FBRUMsU0FBVSwwQ0FBakQ7O0FBRUE7Ozs7QUFJQSxNQUFNQyxNQUFOLENBQWE7QUFDWEMsY0FBWUMsUUFBWixFQUFzQjtBQUNwQixTQUFLQSxRQUFMLEdBQWdCQSxRQUFoQjtBQUNBLFNBQUtDLEtBQUwsR0FBYSxJQUFi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QW1CRSxJQUFuQixFQUF5QlIsT0FBekI7QUFDRDs7QUFFRDs7OztBQUlBWSxRQUFNSixJQUFOLEVBQVlSLE9BQVosRUFBcUI7QUFDbkIsU0FBS00sTUFBTCxDQUFZLE9BQVosRUFBcUJFLElBQXJCLEVBQTJCUixPQUEzQjtBQUNEO0FBakVjOztBQW9FakI7Ozs7QUFJQSxNQUFNYSxhQUFOLENBQW9CO0FBQ2xCbEMsY0FBWUMsUUFBWixFQUFzQjtBQUNwQixTQUFLQSxRQUFMLEdBQWdCQSxRQUFoQjs7QUFFQVIsaUJBQWEwQyxRQUFiLENBQXNCbEMsUUFBdEIsRUFBZ0MsZUFBaEMsRUFBaUQsTUFBakQsRUFBeUQsQ0FBQyxNQUFELENBQXpEO0FBQ0Q7O0FBRUQ7Ozs7QUFJQW1DLFdBQVM7QUFDUCxVQUFNbkMsV0FBVyxLQUFLQSxRQUF0QjtBQUNBLFFBQUksQ0FBQ0EsU0FBU0osMkJBQVQsQ0FBTCxFQUE0QztBQUMxQ0ksZUFBU0osMkJBQVQsSUFBd0MsSUFBSUUsTUFBSixDQUFXLEtBQUtFLFFBQWhCLENBQXhDO0FBQ0Q7QUFDRCxXQUFPQSxTQUFTSiwyQkFBVCxDQUFQO0FBQ0Q7QUFqQmlCOztBQW9CcEI7Ozs7QUFJQXFDLGNBQWNHLFNBQWQsR0FBMEJDLGVBQWU7QUFDdkMsU0FBT0EsWUFBWXJDLFFBQVosQ0FBcUJzQyxpQkFBNUIsRUFBK0M7QUFDN0NELGtCQUFjQSxZQUFZckMsUUFBWixDQUFxQnNDLGlCQUFuQztBQUNEO0FBQ0QsU0FBTyxJQUFJTCxhQUFKLENBQWtCSSxZQUFZckMsUUFBOUIsRUFBd0NtQyxNQUF4QyxFQUFQO0FBQ0QsQ0FMRDs7QUFPQUksT0FBT0MsT0FBUCxHQUFpQlAsYUFBakIiLCJmaWxlIjoiaGFyZC1zb3VyY2Utd2VicGFjay1wbHVnaW4vbGliL2xvZ2dlckZhY3RvcnkuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIFRoZSBMb2dnZXJGYWN0b3J5IHdyYXBzIGEgaGFyZCBzb3VyY2UgcGx1Z2luIGV4cG9zZWQgb24gdGhlIHdlYnBhY2sgQ29tcGlsZXIuXG4gKlxuICogVGhlIHBsdWdpbiBoYW5kbGUsIGAnaGFyZC1zb3VyY2UtbG9nJ2AgdGFrZXMgb25lIG9iamVjdCBhcyBpbnB1dCBhbmQgc2hvdWxkXG4gKiBsb2cgaXQgdG8gdGhlIGNvbnNvbGUsIGRpc2ssIG9yIHNvbWV3aGVyZS4gT3Igbm90IGlmIGl0IHRoZSBtZXNzYWdlIHNob3VsZFxuICogYmUgaWdub3JlZC4gVGhlIG9iamVjdCBoYXMgYSBmZXcgYXJndW1lbnRzIHRoYXQgZ2VuZXJhbGx5IGZvbGxvd3MgdGhpc1xuICogc3RydWN0dXJlLiBUaGUgYGRhdGFgIGtleSB3aWxsIGdlbmVyYWxseSBoYXZlIGFuIGBpZGAgdmFsdWUuXG4gKlxuICogYGBganNcbiAqIHtcbiAqICAgZnJvbTogJ2NvcmUnLFxuICogICBsZXZlbDogJ2Vycm9yJyxcbiAqICAgbWVzc2FnZTogJ0hhcmRTb3VyY2VXZWJwYWNrUGx1Z2luIHJlcXVpcmVzIGEgY2FjaGVEaXJlY3Rvcnkgc2V0dGluZy4nLFxuICogICBkYXRhOiB7XG4gKiAgICAgaWQ6ICduZWVkLWNhY2hlLWRpcmVjdG9yeS1vcHRpb24nXG4gKiAgIH1cbiAqIH1cbiAqIGBgYFxuICpcbiAqIFNvIGEgc2ltcGxlIHBsdWdpbiBoYW5kbGUgbWF5IGJlXG4gKlxuICogYGBganNcbiAqIGNvbXBpbGVyLnBsdWdpbignaGFyZC1zb3VyY2UtbG9nJywgZnVuY3Rpb24obWVzc2FnZSkge1xuICogICBjb25zb2xlW21lc3NhZ2UubGV2ZWxdLmNhbGwoXG4gKiAgICAgY29uc29sZSxcbiAqICAgICAnaGFyZC1zb3VyY2U6JyArIG1lc3NhZ2UuZnJvbSwgbWVzc2FnZS5tZXNzYWdlXG4gKiAgICk7XG4gKiB9KTtcbiAqIGBgYFxuICpcbiAqIEBtb2R1bGUgaGFyZC1zb3VyY2Utd2VicGFjay1wbHVnaW4vbG9nZ2VyLWZhY3RvcnlcbiAqIEBhdXRob3IgTWljaGFlbCBcIlpcIiBHb2RkYXJkIDxtemdvZGRhcmRAZ21haWwuY29tPlxuICovXG5cbmNvbnN0IHBsdWdpbkNvbXBhdCA9IHJlcXVpcmUoJy4vdXRpbC9wbHVnaW4tY29tcGF0Jyk7XG5cbmNvbnN0IExPR0dFUl9TRVBBUkFUT1IgPSAnOic7XG5jb25zdCBERUZBVUxUX0xPR0dFUl9QUkVGSVggPSAnaGFyZC1zb3VyY2UnO1xuY29uc3QgTE9HR0VSX0ZBQ1RPUllfQ09NUElMRVJfS0VZID0gYCR7X19kaXJuYW1lfS9oYXJkLXNvdXJjZS1sb2dnZXItZmFjdG9yeS1jb21waWxlci1rZXlgO1xuXG4vKipcbiAqIEBjb25zdHJ1Y3RvciBMb2dnZXJcbiAqIEBtZW1iZXJvZiBtb2R1bGU6aGFyZC1zb3VyY2Utd2VicGFjay1wbHVnaW4vbG9nZ2VyLWZhY3RvcnlcbiAqL1xuY2xhc3MgTG9nZ2VyIHtcbiAgY29uc3RydWN0b3IoY29tcGlsZXIpIHtcbiAgICB0aGlzLmNvbXBpbGVyID0gY29tcGlsZXI7XG4gICAgdGhpcy5fbG9jayA9IG51bGw7XG4gIH1cblxuICAvKipcbiAgICogQG1ldGhvZCBsb2NrXG4gICAqIEBtZW1iZXJvZiBtb2R1bGU6aGFyZC1zb3VyY2Utd2VicGFjay1wbHVnaW4vbG9nZ2VyLWZhY3Rvcnl+TG9nZ2VyI1xuICAgKi9cbiAgbG9jaygpIHtcbiAgICB0aGlzLl9sb2NrID0gW107XG4gIH1cblxuICAvKipcbiAgICogQG1ldGhvZCB1bmxvY2tcbiAgICogQG1lbWJlcm9mIG1vZHVsZTpoYXJkLXNvdXJjZS13ZWJwYWNrLXBsdWdpbi9sb2dnZXItZmFjdG9yeX5Mb2dnZXIjXG4gICAqL1xuICB1bmxvY2soKSB7XG4gICAgY29uc3QgX3RoaXMgPSB0aGlzO1xuICAgIGlmIChfdGhpcy5fbG9jaykge1xuICAgICAgY29uc3QgbG9jayA9IF90aGlzLl9sb2NrO1xuICAgICAgX3RoaXMuX2xvY2sgPSBudWxsO1xuICAgICAgbG9jay5mb3JFYWNoKHZhbHVlID0+IHtcbiAgICAgICAgX3RoaXMud3JpdGUodmFsdWUpO1xuICAgICAgfSk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEBtZXRob2Qgd3JpdGVcbiAgICogQG1lbWJlcm9mIG1vZHVsZTpoYXJkLXNvdXJjZS13ZWJwYWNrLXBsdWdpbi9sb2dnZXItZmFjdG9yeX5Mb2dnZXIjXG4gICAqL1xuICB3cml0ZSh2YWx1ZSkge1xuICAgIGlmICh0aGlzLl9sb2NrKSB7XG4gICAgICByZXR1cm4gdGhpcy5fbG9jay5wdXNoKHZhbHVlKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5jb21waWxlci5ob29rcyAmJiB0aGlzLmNvbXBpbGVyLmhvb2tzLmhhcmRTb3VyY2VMb2cudGFwcy5sZW5ndGgpIHtcbiAgICAgIHRoaXMuY29tcGlsZXIuaG9va3MuaGFyZFNvdXJjZUxvZy5jYWxsKHZhbHVlKTtcbiAgICB9IGVsc2UgaWYgKFxuICAgICAgdGhpcy5jb21waWxlci5fcGx1Z2lucyAmJlxuICAgICAgdGhpcy5jb21waWxlci5fcGx1Z2luc1snaGFyZC1zb3VyY2UtbG9nJ10gJiZcbiAgICAgIHRoaXMuY29tcGlsZXIuX3BsdWdpbnNbJ2hhcmQtc291cmNlLWxvZyddLmxlbmd0aFxuICAgICkge1xuICAgICAgKHRoaXMuY29tcGlsZXIuYXBwbHlQbHVnaW5zMSB8fCB0aGlzLmNvbXBpbGVyLmFwcGx5UGx1Z2lucykuY2FsbChcbiAgICAgICAgdGhpcy5jb21waWxlcixcbiAgICAgICAgJ2hhcmQtc291cmNlLWxvZycsXG4gICAgICAgIHZhbHVlLFxuICAgICAgKTtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc29sZS5lcnJvcihcbiAgICAgICAgYFske0RFRkFVTFRfTE9HR0VSX1BSRUZJWH0ke0xPR0dFUl9TRVBBUkFUT1J9JHt2YWx1ZS5mcm9tfV1gLFxuICAgICAgICB2YWx1ZS5tZXNzYWdlLFxuICAgICAgKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQG1ldGhvZCBmcm9tXG4gICAqIEBtZW1iZXJvZiBtb2R1bGU6aGFyZC1zb3VyY2Utd2VicGFjay1wbHVnaW4vbG9nZ2VyLWZhY3Rvcnl+TG9nZ2VyI1xuICAgKi9cbiAgZnJvbShuYW1lKSB7XG4gICAgcmV0dXJuIG5ldyBMb2dnZXJGcm9tKHRoaXMsIG5hbWUpO1xuICB9XG59XG5cbi8qKlxuICogQGNvbnN0cnVjdG9yIExvZ2dlckZyb21cbiAqIEBtZW1iZXJvZiBtb2R1bGU6aGFyZC1zb3VyY2Utd2VicGFjay1wbHVnaW4vbG9nZ2VyLWZhY3RvcnlcbiAqL1xuY2xhc3MgTG9nZ2VyRnJvbSB7XG4gIGNvbnN0cnVjdG9yKGxvZ2dlciwgZnJvbSkge1xuICAgIHRoaXMuX2xvZ2dlciA9IGxvZ2dlcjtcbiAgICB0aGlzLl9mcm9tID0gZnJvbTtcbiAgfVxuXG4gIC8qKlxuICAgKiBAbWV0aG9kIGZyb21cbiAgICogQG1lbWJlcm9mIG1vZHVsZTpoYXJkLXNvdXJjZS13ZWJwYWNrLXBsdWdpbi9sb2dnZXItZmFjdG9yeX5Mb2dnZXJGcm9tI1xuICAgKi9cbiAgZnJvbShuYW1lKSB7XG4gICAgcmV0dXJuIG5ldyBMb2dnZXJGcm9tKHRoaXMuX2xvZ2dlciwgdGhpcy5fZnJvbSArIExPR0dFUl9TRVBBUkFUT1IgKyBuYW1lKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBAbWV0aG9kIF93cml0ZVxuICAgKiBAbWVtYmVyb2YgbW9kdWxlOmhhcmQtc291cmNlLXdlYnBhY2stcGx1Z2luL2xvZ2dlci1mYWN0b3J5fkxvZ2dlckZyb20jXG4gICAqL1xuICBfd3JpdGUobGV2ZWwsIGRhdGEsIG1lc3NhZ2UpIHtcbiAgICB0aGlzLl9sb2dnZXIud3JpdGUoe1xuICAgICAgZnJvbTogdGhpcy5fZnJvbSxcbiAgICAgIGxldmVsLFxuICAgICAgbWVzc2FnZSxcbiAgICAgIGRhdGEsXG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogQG1ldGhvZCBlcnJvclxuICAgKiBAbWVtYmVyb2YgbW9kdWxlOmhhcmQtc291cmNlLXdlYnBhY2stcGx1Z2luL2xvZ2dlci1mYWN0b3J5fkxvZ2dlckZyb20jXG4gICAqL1xuICBlcnJvcihkYXRhLCBtZXNzYWdlKSB7XG4gICAgdGhpcy5fd3JpdGUoJ2Vycm9yJywgZGF0YSwgbWVzc2FnZSk7XG4gIH1cblxuICAvKipcbiAgICogQG1ldGhvZCB3YXJuXG4gICAqIEBtZW1iZXJvZiBtb2R1bGU6aGFyZC1zb3VyY2Utd2VicGFjay1wbHVnaW4vbG9nZ2VyLWZhY3Rvcnl+TG9nZ2VyRnJvbSNcbiAgICovXG4gIHdhcm4oZGF0YSwgbWVzc2FnZSkge1xuICAgIHRoaXMuX3dyaXRlKCd3YXJuJywgZGF0YSwgbWVzc2FnZSk7XG4gIH1cblxuICAvKipcbiAgICogQG1ldGhvZCBpbmZvXG4gICAqIEBtZW1iZXJvZiBtb2R1bGU6aGFyZC1zb3VyY2Utd2VicGFjay1wbHVnaW4vbG9nZ2VyLWZhY3Rvcnl+TG9nZ2VyRnJvbSNcbiAgICovXG4gIGluZm8oZGF0YSwgbWVzc2FnZSkge1xuICAgIHRoaXMuX3dyaXRlKCdpbmZvJywgZGF0YSwgbWVzc2FnZSk7XG4gIH1cblxuICAvKipcbiAgICogQG1ldGhvZCBsb2dcbiAgICogQG1lbWJlcm9mIG1vZHVsZTpoYXJkLXNvdXJjZS13ZWJwYWNrLXBsdWdpbi9sb2dnZXItZmFjdG9yeX5Mb2dnZXJGcm9tI1xuICAgKi9cbiAgbG9nKGRhdGEsIG1lc3NhZ2UpIHtcbiAgICB0aGlzLl93cml0ZSgnbG9nJywgZGF0YSwgbWVzc2FnZSk7XG4gIH1cblxuICAvKipcbiAgICogQG1ldGhvZCBkZWJ1Z1xuICAgKiBAbWVtYmVyb2YgbW9kdWxlOmhhcmQtc291cmNlLXdlYnBhY2stcGx1Z2luL2xvZ2dlci1mYWN0b3J5fkxvZ2dlckZyb20jXG4gICAqL1xuICBkZWJ1ZyhkYXRhLCBtZXNzYWdlKSB7XG4gICAgdGhpcy5fd3JpdGUoJ2RlYnVnJywgZGF0YSwgbWVzc2FnZSk7XG4gIH1cbn1cblxuLyoqXG4gKiBAY29uc3RydWN0b3IgTG9nZ2VyRmFjdG9yeVxuICogQG1lbWJlcm9mIG1vZHVsZTpoYXJkLXNvdXJjZS13ZWJwYWNrLXBsdWdpbi9sb2dnZXItZmFjdG9yeVxuICovXG5jbGFzcyBMb2dnZXJGYWN0b3J5IHtcbiAgY29uc3RydWN0b3IoY29tcGlsZXIpIHtcbiAgICB0aGlzLmNvbXBpbGVyID0gY29tcGlsZXI7XG5cbiAgICBwbHVnaW5Db21wYXQucmVnaXN0ZXIoY29tcGlsZXIsICdoYXJkU291cmNlTG9nJywgJ3N5bmMnLCBbJ2RhdGEnXSk7XG4gIH1cblxuICAvKipcbiAgICogQG1ldGhvZCBjcmVhdGVcbiAgICogQG1lbWJlcm9mIG1vZHVsZTpoYXJkLXNvdXJjZS13ZWJwYWNrLXBsdWdpbi9sb2dnZXItZmFjdG9yeX5Mb2dnZXJGYWN0b3J5I1xuICAgKi9cbiAgY3JlYXRlKCkge1xuICAgIGNvbnN0IGNvbXBpbGVyID0gdGhpcy5jb21waWxlcjtcbiAgICBpZiAoIWNvbXBpbGVyW0xPR0dFUl9GQUNUT1JZX0NPTVBJTEVSX0tFWV0pIHtcbiAgICAgIGNvbXBpbGVyW0xPR0dFUl9GQUNUT1JZX0NPTVBJTEVSX0tFWV0gPSBuZXcgTG9nZ2VyKHRoaXMuY29tcGlsZXIpO1xuICAgIH1cbiAgICByZXR1cm4gY29tcGlsZXJbTE9HR0VSX0ZBQ1RPUllfQ09NUElMRVJfS0VZXTtcbiAgfVxufVxuXG4vKipcbiAqIEBmdW5jdGlvbiBnZXRMb2dnZXJcbiAqIEBtZW1iZXJvZiBtb2R1bGU6aGFyZC1zb3VyY2Utd2VicGFjay1wbHVnaW4vbG9nZ2VyLWZhY3Rvcnl+TG9nZ2VyRmFjdG9yeS5cbiAqL1xuTG9nZ2VyRmFjdG9yeS5nZXRMb2dnZXIgPSBjb21waWxhdGlvbiA9PiB7XG4gIHdoaWxlIChjb21waWxhdGlvbi5jb21waWxlci5wYXJlbnRDb21waWxhdGlvbikge1xuICAgIGNvbXBpbGF0aW9uID0gY29tcGlsYXRpb24uY29tcGlsZXIucGFyZW50Q29tcGlsYXRpb247XG4gIH1cbiAgcmV0dXJuIG5ldyBMb2dnZXJGYWN0b3J5KGNvbXBpbGF0aW9uLmNvbXBpbGVyKS5jcmVhdGUoKTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gTG9nZ2VyRmFjdG9yeTtcbiJdLCJzb3VyY2VSb290IjoiL1VzZXJzL3R5bGVyYXJidXMvZGV2L3Byb3ZpZGVyL3NyYyJ9

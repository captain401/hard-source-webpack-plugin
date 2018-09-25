'use strict';

/**
 * A factory wrapper around a webpack compiler plugin to create a serializer
 * object that caches a various data hard-source turns into json data without
 * circular references.
 *
 * The wrapper uses a plugin hook on the webpack Compiler called
 * `'hard-source-cache-factory'`. It is a waterfall plugin, the returned value
 * of one plugin handle is passed to the next as the first argument. This
 * plugin is expected to return a factory function that takes one argument. The
 * argument passed to the factory function is the info about what kind of cache
 * serializer hard-source wants.
 *
 * The info object contains three fields, `name`, `type`, and `cacheDirPath`.
 *
 * One example of info might be
 *
 * ```js
 * {
 *   name: 'asset',
 *   type: 'file',
 *   cacheDirPath: '/absolute/path/to/my-project/path/configured/in/hard-source'
 * }
 * ```
 *
 * - `name` is the general name of the cache in hard-source.
 * - `type` is the type of data contained. The `file` type means it'll be file
 *    data like large buffers and strings. The `data` type means its generally
 *    smaller info and serializable with JSON.stringify.
 * - `cacheDirPath` is the root of the hard-source disk cache. A serializer
 *   should add some further element to the path for where it will store its
 *   info.
 *
 * So an example plugin handle should take the `factory` argument and return
 * its own wrapping factory function. That function will take the `info` data
 * and if it wants to returns a serializer. Otherwise its best to call the
 * factory passed into the plugin handle.
 *
 * ```js
 * compiler.plugin('hard-source-cache-factory', function(factory) {
 *   return function(info) {
 *     if (info.type === 'data') {
 *       return new MySerializer({
 *         cacheDirPath: join(info.cacheDirPath, info.name)
 *       });
 *     }
 *     return factory(info);
 *   };
 * });
 * ```
 *
 * @module hard-source-webpack-plugin/cache-serializer-factory
 * @author Michael "Z" Goddard <mzgoddard@gmail.com>
 */

/**
 * @constructor Serializer
 * @memberof module:hard-source-webpack-plugin/cache-serializer-factory
 */

/**
 * @method read
 * @memberof module:hard-source-webpack-plugin/cache-serializer-factory~Serializer#
 * @returns {Promise} promise that resolves the disk cache's contents
 * @resolves {Object} a map of keys to current values stored on disk that has
 *   previously been cached
 */

/**
 * @method write
 * @memberof module:hard-source-webpack-plugin/cache-serializer-factory~Serializer#
 * @param {Array.Object} ops difference of values to be stored in the disk cache
 * @param {string} ops.key
 * @param ops.value
 * @returns {Promise} promise that resolves when writing completes
 */

const FileSerializerPlugin = require('./SerializerFilePlugin');
const Append2SerializerPlugin = require('./SerializerAppend2Plugin');

const pluginCompat = require('./util/plugin-compat');

/**
 * @constructor CacheSerializerFactory
 * @memberof module:hard-source-webpack-plugin/cache-serializer-factory
 */
class CacheSerializerFactory {
  constructor(compiler) {
    this.compiler = compiler;

    pluginCompat.register(compiler, 'hardSourceCacheFactory', 'syncWaterfall', ['factory']);

    pluginCompat.tap(compiler, 'hardSourceCacheFactory', 'default factory', factory => info => {
      // It's best to have plugins to hard-source listed in the config after it
      // but to make hard-source easier to use we can call the factory of a
      // plugin passed into this default factory.
      if (factory) {
        serializer = factory(info);
        if (serializer) {
          return serializer;
        }
      }

      // Otherwise lets return the default serializers.
      switch (info.type) {
        case 'data':
          return CacheSerializerFactory.dataSerializer.createSerializer(info);
          break;
        case 'file':
          return CacheSerializerFactory.fileSerializer.createSerializer(info);
          break;
        default:
          throw new Error(`Unknown hard-source cache serializer type: ${info.type}`);
          break;
      }
    });
  }

  /**
   * @method create
   * @memberof module:hard-source-webpack-plugin/cache-serializer-factory~CacheSerializerFactory#
   * @param {Object} info
   * @param {String} info.name
   * @param {String} info.type
   * @param {String} info.cacheDirPath
   * @returns {Serializer}
   */
  create(info) {
    const factory = pluginCompat.call(this.compiler, 'hardSourceCacheFactory', [null]);

    const serializer = factory(info);

    return serializer;
  }
}

/**
 * The default data serializer factory.
 */
CacheSerializerFactory.dataSerializer = Append2SerializerPlugin;

/**
 * The default file serializer factory.
 */
CacheSerializerFactory.fileSerializer = FileSerializerPlugin;

module.exports = CacheSerializerFactory;
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImhhcmQtc291cmNlLXdlYnBhY2stcGx1Z2luL2xpYi9DYWNoZVNlcmlhbGl6ZXJGYWN0b3J5LmpzIl0sIm5hbWVzIjpbIkZpbGVTZXJpYWxpemVyUGx1Z2luIiwicmVxdWlyZSIsIkFwcGVuZDJTZXJpYWxpemVyUGx1Z2luIiwicGx1Z2luQ29tcGF0IiwiQ2FjaGVTZXJpYWxpemVyRmFjdG9yeSIsImNvbnN0cnVjdG9yIiwiY29tcGlsZXIiLCJyZWdpc3RlciIsInRhcCIsImZhY3RvcnkiLCJpbmZvIiwic2VyaWFsaXplciIsInR5cGUiLCJkYXRhU2VyaWFsaXplciIsImNyZWF0ZVNlcmlhbGl6ZXIiLCJmaWxlU2VyaWFsaXplciIsIkVycm9yIiwiY3JlYXRlIiwiY2FsbCIsIm1vZHVsZSIsImV4cG9ydHMiXSwibWFwcGluZ3MiOiI7O0FBQUE7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQXNEQTs7Ozs7QUFLQTs7Ozs7Ozs7QUFRQTs7Ozs7Ozs7O0FBU0EsTUFBTUEsdUJBQXVCQyxpQ0FBN0I7QUFDQSxNQUFNQywwQkFBMEJELG9DQUFoQzs7QUFFQSxNQUFNRSxlQUFlRiwrQkFBckI7O0FBRUE7Ozs7QUFJQSxNQUFNRyxzQkFBTixDQUE2QjtBQUMzQkMsY0FBWUMsUUFBWixFQUFzQjtBQUNwQixTQUFLQSxRQUFMLEdBQWdCQSxRQUFoQjs7QUFFQUgsaUJBQWFJLFFBQWIsQ0FBc0JELFFBQXRCLEVBQWdDLHdCQUFoQyxFQUEwRCxlQUExRCxFQUEyRSxDQUN6RSxTQUR5RSxDQUEzRTs7QUFJQUgsaUJBQWFLLEdBQWIsQ0FDRUYsUUFERixFQUVFLHdCQUZGLEVBR0UsaUJBSEYsRUFJRUcsV0FBV0MsUUFBUTtBQUNqQjtBQUNBO0FBQ0E7QUFDQSxVQUFJRCxPQUFKLEVBQWE7QUFDWEUscUJBQWFGLFFBQVFDLElBQVIsQ0FBYjtBQUNBLFlBQUlDLFVBQUosRUFBZ0I7QUFDZCxpQkFBT0EsVUFBUDtBQUNEO0FBQ0Y7O0FBRUQ7QUFDQSxjQUFRRCxLQUFLRSxJQUFiO0FBQ0UsYUFBSyxNQUFMO0FBQ0UsaUJBQU9SLHVCQUF1QlMsY0FBdkIsQ0FBc0NDLGdCQUF0QyxDQUF1REosSUFBdkQsQ0FBUDtBQUNBO0FBQ0YsYUFBSyxNQUFMO0FBQ0UsaUJBQU9OLHVCQUF1QlcsY0FBdkIsQ0FBc0NELGdCQUF0QyxDQUF1REosSUFBdkQsQ0FBUDtBQUNBO0FBQ0Y7QUFDRSxnQkFBTSxJQUFJTSxLQUFKLENBQ0gsOENBQTZDTixLQUFLRSxJQUFLLEVBRHBELENBQU47QUFHQTtBQVhKO0FBYUQsS0E3Qkg7QUErQkQ7O0FBRUQ7Ozs7Ozs7OztBQVNBSyxTQUFPUCxJQUFQLEVBQWE7QUFDWCxVQUFNRCxVQUFVTixhQUFhZSxJQUFiLENBQWtCLEtBQUtaLFFBQXZCLEVBQWlDLHdCQUFqQyxFQUEyRCxDQUN6RSxJQUR5RSxDQUEzRCxDQUFoQjs7QUFJQSxVQUFNSyxhQUFhRixRQUFRQyxJQUFSLENBQW5COztBQUVBLFdBQU9DLFVBQVA7QUFDRDtBQTFEMEI7O0FBNkQ3Qjs7O0FBR0FQLHVCQUF1QlMsY0FBdkIsR0FBd0NYLHVCQUF4Qzs7QUFFQTs7O0FBR0FFLHVCQUF1QlcsY0FBdkIsR0FBd0NmLG9CQUF4Qzs7QUFFQW1CLE9BQU9DLE9BQVAsR0FBaUJoQixzQkFBakIiLCJmaWxlIjoiaGFyZC1zb3VyY2Utd2VicGFjay1wbHVnaW4vbGliL0NhY2hlU2VyaWFsaXplckZhY3RvcnkuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEEgZmFjdG9yeSB3cmFwcGVyIGFyb3VuZCBhIHdlYnBhY2sgY29tcGlsZXIgcGx1Z2luIHRvIGNyZWF0ZSBhIHNlcmlhbGl6ZXJcbiAqIG9iamVjdCB0aGF0IGNhY2hlcyBhIHZhcmlvdXMgZGF0YSBoYXJkLXNvdXJjZSB0dXJucyBpbnRvIGpzb24gZGF0YSB3aXRob3V0XG4gKiBjaXJjdWxhciByZWZlcmVuY2VzLlxuICpcbiAqIFRoZSB3cmFwcGVyIHVzZXMgYSBwbHVnaW4gaG9vayBvbiB0aGUgd2VicGFjayBDb21waWxlciBjYWxsZWRcbiAqIGAnaGFyZC1zb3VyY2UtY2FjaGUtZmFjdG9yeSdgLiBJdCBpcyBhIHdhdGVyZmFsbCBwbHVnaW4sIHRoZSByZXR1cm5lZCB2YWx1ZVxuICogb2Ygb25lIHBsdWdpbiBoYW5kbGUgaXMgcGFzc2VkIHRvIHRoZSBuZXh0IGFzIHRoZSBmaXJzdCBhcmd1bWVudC4gVGhpc1xuICogcGx1Z2luIGlzIGV4cGVjdGVkIHRvIHJldHVybiBhIGZhY3RvcnkgZnVuY3Rpb24gdGhhdCB0YWtlcyBvbmUgYXJndW1lbnQuIFRoZVxuICogYXJndW1lbnQgcGFzc2VkIHRvIHRoZSBmYWN0b3J5IGZ1bmN0aW9uIGlzIHRoZSBpbmZvIGFib3V0IHdoYXQga2luZCBvZiBjYWNoZVxuICogc2VyaWFsaXplciBoYXJkLXNvdXJjZSB3YW50cy5cbiAqXG4gKiBUaGUgaW5mbyBvYmplY3QgY29udGFpbnMgdGhyZWUgZmllbGRzLCBgbmFtZWAsIGB0eXBlYCwgYW5kIGBjYWNoZURpclBhdGhgLlxuICpcbiAqIE9uZSBleGFtcGxlIG9mIGluZm8gbWlnaHQgYmVcbiAqXG4gKiBgYGBqc1xuICoge1xuICogICBuYW1lOiAnYXNzZXQnLFxuICogICB0eXBlOiAnZmlsZScsXG4gKiAgIGNhY2hlRGlyUGF0aDogJy9hYnNvbHV0ZS9wYXRoL3RvL215LXByb2plY3QvcGF0aC9jb25maWd1cmVkL2luL2hhcmQtc291cmNlJ1xuICogfVxuICogYGBgXG4gKlxuICogLSBgbmFtZWAgaXMgdGhlIGdlbmVyYWwgbmFtZSBvZiB0aGUgY2FjaGUgaW4gaGFyZC1zb3VyY2UuXG4gKiAtIGB0eXBlYCBpcyB0aGUgdHlwZSBvZiBkYXRhIGNvbnRhaW5lZC4gVGhlIGBmaWxlYCB0eXBlIG1lYW5zIGl0J2xsIGJlIGZpbGVcbiAqICAgIGRhdGEgbGlrZSBsYXJnZSBidWZmZXJzIGFuZCBzdHJpbmdzLiBUaGUgYGRhdGFgIHR5cGUgbWVhbnMgaXRzIGdlbmVyYWxseVxuICogICAgc21hbGxlciBpbmZvIGFuZCBzZXJpYWxpemFibGUgd2l0aCBKU09OLnN0cmluZ2lmeS5cbiAqIC0gYGNhY2hlRGlyUGF0aGAgaXMgdGhlIHJvb3Qgb2YgdGhlIGhhcmQtc291cmNlIGRpc2sgY2FjaGUuIEEgc2VyaWFsaXplclxuICogICBzaG91bGQgYWRkIHNvbWUgZnVydGhlciBlbGVtZW50IHRvIHRoZSBwYXRoIGZvciB3aGVyZSBpdCB3aWxsIHN0b3JlIGl0c1xuICogICBpbmZvLlxuICpcbiAqIFNvIGFuIGV4YW1wbGUgcGx1Z2luIGhhbmRsZSBzaG91bGQgdGFrZSB0aGUgYGZhY3RvcnlgIGFyZ3VtZW50IGFuZCByZXR1cm5cbiAqIGl0cyBvd24gd3JhcHBpbmcgZmFjdG9yeSBmdW5jdGlvbi4gVGhhdCBmdW5jdGlvbiB3aWxsIHRha2UgdGhlIGBpbmZvYCBkYXRhXG4gKiBhbmQgaWYgaXQgd2FudHMgdG8gcmV0dXJucyBhIHNlcmlhbGl6ZXIuIE90aGVyd2lzZSBpdHMgYmVzdCB0byBjYWxsIHRoZVxuICogZmFjdG9yeSBwYXNzZWQgaW50byB0aGUgcGx1Z2luIGhhbmRsZS5cbiAqXG4gKiBgYGBqc1xuICogY29tcGlsZXIucGx1Z2luKCdoYXJkLXNvdXJjZS1jYWNoZS1mYWN0b3J5JywgZnVuY3Rpb24oZmFjdG9yeSkge1xuICogICByZXR1cm4gZnVuY3Rpb24oaW5mbykge1xuICogICAgIGlmIChpbmZvLnR5cGUgPT09ICdkYXRhJykge1xuICogICAgICAgcmV0dXJuIG5ldyBNeVNlcmlhbGl6ZXIoe1xuICogICAgICAgICBjYWNoZURpclBhdGg6IGpvaW4oaW5mby5jYWNoZURpclBhdGgsIGluZm8ubmFtZSlcbiAqICAgICAgIH0pO1xuICogICAgIH1cbiAqICAgICByZXR1cm4gZmFjdG9yeShpbmZvKTtcbiAqICAgfTtcbiAqIH0pO1xuICogYGBgXG4gKlxuICogQG1vZHVsZSBoYXJkLXNvdXJjZS13ZWJwYWNrLXBsdWdpbi9jYWNoZS1zZXJpYWxpemVyLWZhY3RvcnlcbiAqIEBhdXRob3IgTWljaGFlbCBcIlpcIiBHb2RkYXJkIDxtemdvZGRhcmRAZ21haWwuY29tPlxuICovXG5cbi8qKlxuICogQGNvbnN0cnVjdG9yIFNlcmlhbGl6ZXJcbiAqIEBtZW1iZXJvZiBtb2R1bGU6aGFyZC1zb3VyY2Utd2VicGFjay1wbHVnaW4vY2FjaGUtc2VyaWFsaXplci1mYWN0b3J5XG4gKi9cblxuLyoqXG4gKiBAbWV0aG9kIHJlYWRcbiAqIEBtZW1iZXJvZiBtb2R1bGU6aGFyZC1zb3VyY2Utd2VicGFjay1wbHVnaW4vY2FjaGUtc2VyaWFsaXplci1mYWN0b3J5flNlcmlhbGl6ZXIjXG4gKiBAcmV0dXJucyB7UHJvbWlzZX0gcHJvbWlzZSB0aGF0IHJlc29sdmVzIHRoZSBkaXNrIGNhY2hlJ3MgY29udGVudHNcbiAqIEByZXNvbHZlcyB7T2JqZWN0fSBhIG1hcCBvZiBrZXlzIHRvIGN1cnJlbnQgdmFsdWVzIHN0b3JlZCBvbiBkaXNrIHRoYXQgaGFzXG4gKiAgIHByZXZpb3VzbHkgYmVlbiBjYWNoZWRcbiAqL1xuXG4vKipcbiAqIEBtZXRob2Qgd3JpdGVcbiAqIEBtZW1iZXJvZiBtb2R1bGU6aGFyZC1zb3VyY2Utd2VicGFjay1wbHVnaW4vY2FjaGUtc2VyaWFsaXplci1mYWN0b3J5flNlcmlhbGl6ZXIjXG4gKiBAcGFyYW0ge0FycmF5Lk9iamVjdH0gb3BzIGRpZmZlcmVuY2Ugb2YgdmFsdWVzIHRvIGJlIHN0b3JlZCBpbiB0aGUgZGlzayBjYWNoZVxuICogQHBhcmFtIHtzdHJpbmd9IG9wcy5rZXlcbiAqIEBwYXJhbSBvcHMudmFsdWVcbiAqIEByZXR1cm5zIHtQcm9taXNlfSBwcm9taXNlIHRoYXQgcmVzb2x2ZXMgd2hlbiB3cml0aW5nIGNvbXBsZXRlc1xuICovXG5cbmNvbnN0IEZpbGVTZXJpYWxpemVyUGx1Z2luID0gcmVxdWlyZSgnLi9TZXJpYWxpemVyRmlsZVBsdWdpbicpO1xuY29uc3QgQXBwZW5kMlNlcmlhbGl6ZXJQbHVnaW4gPSByZXF1aXJlKCcuL1NlcmlhbGl6ZXJBcHBlbmQyUGx1Z2luJyk7XG5cbmNvbnN0IHBsdWdpbkNvbXBhdCA9IHJlcXVpcmUoJy4vdXRpbC9wbHVnaW4tY29tcGF0Jyk7XG5cbi8qKlxuICogQGNvbnN0cnVjdG9yIENhY2hlU2VyaWFsaXplckZhY3RvcnlcbiAqIEBtZW1iZXJvZiBtb2R1bGU6aGFyZC1zb3VyY2Utd2VicGFjay1wbHVnaW4vY2FjaGUtc2VyaWFsaXplci1mYWN0b3J5XG4gKi9cbmNsYXNzIENhY2hlU2VyaWFsaXplckZhY3Rvcnkge1xuICBjb25zdHJ1Y3Rvcihjb21waWxlcikge1xuICAgIHRoaXMuY29tcGlsZXIgPSBjb21waWxlcjtcblxuICAgIHBsdWdpbkNvbXBhdC5yZWdpc3Rlcihjb21waWxlciwgJ2hhcmRTb3VyY2VDYWNoZUZhY3RvcnknLCAnc3luY1dhdGVyZmFsbCcsIFtcbiAgICAgICdmYWN0b3J5JyxcbiAgICBdKTtcblxuICAgIHBsdWdpbkNvbXBhdC50YXAoXG4gICAgICBjb21waWxlcixcbiAgICAgICdoYXJkU291cmNlQ2FjaGVGYWN0b3J5JyxcbiAgICAgICdkZWZhdWx0IGZhY3RvcnknLFxuICAgICAgZmFjdG9yeSA9PiBpbmZvID0+IHtcbiAgICAgICAgLy8gSXQncyBiZXN0IHRvIGhhdmUgcGx1Z2lucyB0byBoYXJkLXNvdXJjZSBsaXN0ZWQgaW4gdGhlIGNvbmZpZyBhZnRlciBpdFxuICAgICAgICAvLyBidXQgdG8gbWFrZSBoYXJkLXNvdXJjZSBlYXNpZXIgdG8gdXNlIHdlIGNhbiBjYWxsIHRoZSBmYWN0b3J5IG9mIGFcbiAgICAgICAgLy8gcGx1Z2luIHBhc3NlZCBpbnRvIHRoaXMgZGVmYXVsdCBmYWN0b3J5LlxuICAgICAgICBpZiAoZmFjdG9yeSkge1xuICAgICAgICAgIHNlcmlhbGl6ZXIgPSBmYWN0b3J5KGluZm8pO1xuICAgICAgICAgIGlmIChzZXJpYWxpemVyKSB7XG4gICAgICAgICAgICByZXR1cm4gc2VyaWFsaXplcjtcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBPdGhlcndpc2UgbGV0cyByZXR1cm4gdGhlIGRlZmF1bHQgc2VyaWFsaXplcnMuXG4gICAgICAgIHN3aXRjaCAoaW5mby50eXBlKSB7XG4gICAgICAgICAgY2FzZSAnZGF0YSc6XG4gICAgICAgICAgICByZXR1cm4gQ2FjaGVTZXJpYWxpemVyRmFjdG9yeS5kYXRhU2VyaWFsaXplci5jcmVhdGVTZXJpYWxpemVyKGluZm8pO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgY2FzZSAnZmlsZSc6XG4gICAgICAgICAgICByZXR1cm4gQ2FjaGVTZXJpYWxpemVyRmFjdG9yeS5maWxlU2VyaWFsaXplci5jcmVhdGVTZXJpYWxpemVyKGluZm8pO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICAgICAgYFVua25vd24gaGFyZC1zb3VyY2UgY2FjaGUgc2VyaWFsaXplciB0eXBlOiAke2luZm8udHlwZX1gLFxuICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICB9LFxuICAgICk7XG4gIH1cblxuICAvKipcbiAgICogQG1ldGhvZCBjcmVhdGVcbiAgICogQG1lbWJlcm9mIG1vZHVsZTpoYXJkLXNvdXJjZS13ZWJwYWNrLXBsdWdpbi9jYWNoZS1zZXJpYWxpemVyLWZhY3Rvcnl+Q2FjaGVTZXJpYWxpemVyRmFjdG9yeSNcbiAgICogQHBhcmFtIHtPYmplY3R9IGluZm9cbiAgICogQHBhcmFtIHtTdHJpbmd9IGluZm8ubmFtZVxuICAgKiBAcGFyYW0ge1N0cmluZ30gaW5mby50eXBlXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBpbmZvLmNhY2hlRGlyUGF0aFxuICAgKiBAcmV0dXJucyB7U2VyaWFsaXplcn1cbiAgICovXG4gIGNyZWF0ZShpbmZvKSB7XG4gICAgY29uc3QgZmFjdG9yeSA9IHBsdWdpbkNvbXBhdC5jYWxsKHRoaXMuY29tcGlsZXIsICdoYXJkU291cmNlQ2FjaGVGYWN0b3J5JywgW1xuICAgICAgbnVsbCxcbiAgICBdKTtcblxuICAgIGNvbnN0IHNlcmlhbGl6ZXIgPSBmYWN0b3J5KGluZm8pO1xuXG4gICAgcmV0dXJuIHNlcmlhbGl6ZXI7XG4gIH1cbn1cblxuLyoqXG4gKiBUaGUgZGVmYXVsdCBkYXRhIHNlcmlhbGl6ZXIgZmFjdG9yeS5cbiAqL1xuQ2FjaGVTZXJpYWxpemVyRmFjdG9yeS5kYXRhU2VyaWFsaXplciA9IEFwcGVuZDJTZXJpYWxpemVyUGx1Z2luO1xuXG4vKipcbiAqIFRoZSBkZWZhdWx0IGZpbGUgc2VyaWFsaXplciBmYWN0b3J5LlxuICovXG5DYWNoZVNlcmlhbGl6ZXJGYWN0b3J5LmZpbGVTZXJpYWxpemVyID0gRmlsZVNlcmlhbGl6ZXJQbHVnaW47XG5cbm1vZHVsZS5leHBvcnRzID0gQ2FjaGVTZXJpYWxpemVyRmFjdG9yeTtcbiJdLCJzb3VyY2VSb290IjoiL1VzZXJzL3R5bGVyYXJidXMvZGV2L3Byb3ZpZGVyL3NyYyJ9

'use strict';

require('source-map-support/register');

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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImhhcmQtc291cmNlLXdlYnBhY2stcGx1Z2luL2xpYi9DYWNoZVNlcmlhbGl6ZXJGYWN0b3J5LmpzIl0sIm5hbWVzIjpbIkZpbGVTZXJpYWxpemVyUGx1Z2luIiwicmVxdWlyZSIsIkFwcGVuZDJTZXJpYWxpemVyUGx1Z2luIiwicGx1Z2luQ29tcGF0IiwiQ2FjaGVTZXJpYWxpemVyRmFjdG9yeSIsImNvbnN0cnVjdG9yIiwiY29tcGlsZXIiLCJyZWdpc3RlciIsInRhcCIsImZhY3RvcnkiLCJpbmZvIiwic2VyaWFsaXplciIsInR5cGUiLCJkYXRhU2VyaWFsaXplciIsImNyZWF0ZVNlcmlhbGl6ZXIiLCJmaWxlU2VyaWFsaXplciIsIkVycm9yIiwiY3JlYXRlIiwiY2FsbCIsIm1vZHVsZSIsImV4cG9ydHMiXSwibWFwcGluZ3MiOiI7Ozs7QUFBQTs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBc0RBOzs7OztBQUtBOzs7Ozs7OztBQVFBOzs7Ozs7Ozs7QUFTQSxNQUFNQSx1QkFBdUJDLFFBQVEsd0JBQVIsQ0FBN0I7QUFDQSxNQUFNQywwQkFBMEJELFFBQVEsMkJBQVIsQ0FBaEM7O0FBRUEsTUFBTUUsZUFBZUYsUUFBUSxzQkFBUixDQUFyQjs7QUFFQTs7OztBQUlBLE1BQU1HLHNCQUFOLENBQTZCO0FBQzNCQyxjQUFZQyxRQUFaLEVBQXNCO0FBQ3BCLFNBQUtBLFFBQUwsR0FBZ0JBLFFBQWhCOztBQUVBSCxpQkFBYUksUUFBYixDQUFzQkQsUUFBdEIsRUFBZ0Msd0JBQWhDLEVBQTBELGVBQTFELEVBQTJFLENBQ3pFLFNBRHlFLENBQTNFOztBQUlBSCxpQkFBYUssR0FBYixDQUNFRixRQURGLEVBRUUsd0JBRkYsRUFHRSxpQkFIRixFQUlFRyxXQUFXQyxRQUFRO0FBQ2pCO0FBQ0E7QUFDQTtBQUNBLFVBQUlELE9BQUosRUFBYTtBQUNYRSxxQkFBYUYsUUFBUUMsSUFBUixDQUFiO0FBQ0EsWUFBSUMsVUFBSixFQUFnQjtBQUNkLGlCQUFPQSxVQUFQO0FBQ0Q7QUFDRjs7QUFFRDtBQUNBLGNBQVFELEtBQUtFLElBQWI7QUFDRSxhQUFLLE1BQUw7QUFDRSxpQkFBT1IsdUJBQXVCUyxjQUF2QixDQUFzQ0MsZ0JBQXRDLENBQXVESixJQUF2RCxDQUFQO0FBQ0E7QUFDRixhQUFLLE1BQUw7QUFDRSxpQkFBT04sdUJBQXVCVyxjQUF2QixDQUFzQ0QsZ0JBQXRDLENBQXVESixJQUF2RCxDQUFQO0FBQ0E7QUFDRjtBQUNFLGdCQUFNLElBQUlNLEtBQUosQ0FDSCw4Q0FBNkNOLEtBQUtFLElBQUssRUFEcEQsQ0FBTjtBQUdBO0FBWEo7QUFhRCxLQTdCSDtBQStCRDs7QUFFRDs7Ozs7Ozs7O0FBU0FLLFNBQU9QLElBQVAsRUFBYTtBQUNYLFVBQU1ELFVBQVVOLGFBQWFlLElBQWIsQ0FBa0IsS0FBS1osUUFBdkIsRUFBaUMsd0JBQWpDLEVBQTJELENBQ3pFLElBRHlFLENBQTNELENBQWhCOztBQUlBLFVBQU1LLGFBQWFGLFFBQVFDLElBQVIsQ0FBbkI7O0FBRUEsV0FBT0MsVUFBUDtBQUNEO0FBMUQwQjs7QUE2RDdCOzs7QUFHQVAsdUJBQXVCUyxjQUF2QixHQUF3Q1gsdUJBQXhDOztBQUVBOzs7QUFHQUUsdUJBQXVCVyxjQUF2QixHQUF3Q2Ysb0JBQXhDOztBQUVBbUIsT0FBT0MsT0FBUCxHQUFpQmhCLHNCQUFqQiIsImZpbGUiOiJoYXJkLXNvdXJjZS13ZWJwYWNrLXBsdWdpbi9saWIvQ2FjaGVTZXJpYWxpemVyRmFjdG9yeS5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQSBmYWN0b3J5IHdyYXBwZXIgYXJvdW5kIGEgd2VicGFjayBjb21waWxlciBwbHVnaW4gdG8gY3JlYXRlIGEgc2VyaWFsaXplclxuICogb2JqZWN0IHRoYXQgY2FjaGVzIGEgdmFyaW91cyBkYXRhIGhhcmQtc291cmNlIHR1cm5zIGludG8ganNvbiBkYXRhIHdpdGhvdXRcbiAqIGNpcmN1bGFyIHJlZmVyZW5jZXMuXG4gKlxuICogVGhlIHdyYXBwZXIgdXNlcyBhIHBsdWdpbiBob29rIG9uIHRoZSB3ZWJwYWNrIENvbXBpbGVyIGNhbGxlZFxuICogYCdoYXJkLXNvdXJjZS1jYWNoZS1mYWN0b3J5J2AuIEl0IGlzIGEgd2F0ZXJmYWxsIHBsdWdpbiwgdGhlIHJldHVybmVkIHZhbHVlXG4gKiBvZiBvbmUgcGx1Z2luIGhhbmRsZSBpcyBwYXNzZWQgdG8gdGhlIG5leHQgYXMgdGhlIGZpcnN0IGFyZ3VtZW50LiBUaGlzXG4gKiBwbHVnaW4gaXMgZXhwZWN0ZWQgdG8gcmV0dXJuIGEgZmFjdG9yeSBmdW5jdGlvbiB0aGF0IHRha2VzIG9uZSBhcmd1bWVudC4gVGhlXG4gKiBhcmd1bWVudCBwYXNzZWQgdG8gdGhlIGZhY3RvcnkgZnVuY3Rpb24gaXMgdGhlIGluZm8gYWJvdXQgd2hhdCBraW5kIG9mIGNhY2hlXG4gKiBzZXJpYWxpemVyIGhhcmQtc291cmNlIHdhbnRzLlxuICpcbiAqIFRoZSBpbmZvIG9iamVjdCBjb250YWlucyB0aHJlZSBmaWVsZHMsIGBuYW1lYCwgYHR5cGVgLCBhbmQgYGNhY2hlRGlyUGF0aGAuXG4gKlxuICogT25lIGV4YW1wbGUgb2YgaW5mbyBtaWdodCBiZVxuICpcbiAqIGBgYGpzXG4gKiB7XG4gKiAgIG5hbWU6ICdhc3NldCcsXG4gKiAgIHR5cGU6ICdmaWxlJyxcbiAqICAgY2FjaGVEaXJQYXRoOiAnL2Fic29sdXRlL3BhdGgvdG8vbXktcHJvamVjdC9wYXRoL2NvbmZpZ3VyZWQvaW4vaGFyZC1zb3VyY2UnXG4gKiB9XG4gKiBgYGBcbiAqXG4gKiAtIGBuYW1lYCBpcyB0aGUgZ2VuZXJhbCBuYW1lIG9mIHRoZSBjYWNoZSBpbiBoYXJkLXNvdXJjZS5cbiAqIC0gYHR5cGVgIGlzIHRoZSB0eXBlIG9mIGRhdGEgY29udGFpbmVkLiBUaGUgYGZpbGVgIHR5cGUgbWVhbnMgaXQnbGwgYmUgZmlsZVxuICogICAgZGF0YSBsaWtlIGxhcmdlIGJ1ZmZlcnMgYW5kIHN0cmluZ3MuIFRoZSBgZGF0YWAgdHlwZSBtZWFucyBpdHMgZ2VuZXJhbGx5XG4gKiAgICBzbWFsbGVyIGluZm8gYW5kIHNlcmlhbGl6YWJsZSB3aXRoIEpTT04uc3RyaW5naWZ5LlxuICogLSBgY2FjaGVEaXJQYXRoYCBpcyB0aGUgcm9vdCBvZiB0aGUgaGFyZC1zb3VyY2UgZGlzayBjYWNoZS4gQSBzZXJpYWxpemVyXG4gKiAgIHNob3VsZCBhZGQgc29tZSBmdXJ0aGVyIGVsZW1lbnQgdG8gdGhlIHBhdGggZm9yIHdoZXJlIGl0IHdpbGwgc3RvcmUgaXRzXG4gKiAgIGluZm8uXG4gKlxuICogU28gYW4gZXhhbXBsZSBwbHVnaW4gaGFuZGxlIHNob3VsZCB0YWtlIHRoZSBgZmFjdG9yeWAgYXJndW1lbnQgYW5kIHJldHVyblxuICogaXRzIG93biB3cmFwcGluZyBmYWN0b3J5IGZ1bmN0aW9uLiBUaGF0IGZ1bmN0aW9uIHdpbGwgdGFrZSB0aGUgYGluZm9gIGRhdGFcbiAqIGFuZCBpZiBpdCB3YW50cyB0byByZXR1cm5zIGEgc2VyaWFsaXplci4gT3RoZXJ3aXNlIGl0cyBiZXN0IHRvIGNhbGwgdGhlXG4gKiBmYWN0b3J5IHBhc3NlZCBpbnRvIHRoZSBwbHVnaW4gaGFuZGxlLlxuICpcbiAqIGBgYGpzXG4gKiBjb21waWxlci5wbHVnaW4oJ2hhcmQtc291cmNlLWNhY2hlLWZhY3RvcnknLCBmdW5jdGlvbihmYWN0b3J5KSB7XG4gKiAgIHJldHVybiBmdW5jdGlvbihpbmZvKSB7XG4gKiAgICAgaWYgKGluZm8udHlwZSA9PT0gJ2RhdGEnKSB7XG4gKiAgICAgICByZXR1cm4gbmV3IE15U2VyaWFsaXplcih7XG4gKiAgICAgICAgIGNhY2hlRGlyUGF0aDogam9pbihpbmZvLmNhY2hlRGlyUGF0aCwgaW5mby5uYW1lKVxuICogICAgICAgfSk7XG4gKiAgICAgfVxuICogICAgIHJldHVybiBmYWN0b3J5KGluZm8pO1xuICogICB9O1xuICogfSk7XG4gKiBgYGBcbiAqXG4gKiBAbW9kdWxlIGhhcmQtc291cmNlLXdlYnBhY2stcGx1Z2luL2NhY2hlLXNlcmlhbGl6ZXItZmFjdG9yeVxuICogQGF1dGhvciBNaWNoYWVsIFwiWlwiIEdvZGRhcmQgPG16Z29kZGFyZEBnbWFpbC5jb20+XG4gKi9cblxuLyoqXG4gKiBAY29uc3RydWN0b3IgU2VyaWFsaXplclxuICogQG1lbWJlcm9mIG1vZHVsZTpoYXJkLXNvdXJjZS13ZWJwYWNrLXBsdWdpbi9jYWNoZS1zZXJpYWxpemVyLWZhY3RvcnlcbiAqL1xuXG4vKipcbiAqIEBtZXRob2QgcmVhZFxuICogQG1lbWJlcm9mIG1vZHVsZTpoYXJkLXNvdXJjZS13ZWJwYWNrLXBsdWdpbi9jYWNoZS1zZXJpYWxpemVyLWZhY3Rvcnl+U2VyaWFsaXplciNcbiAqIEByZXR1cm5zIHtQcm9taXNlfSBwcm9taXNlIHRoYXQgcmVzb2x2ZXMgdGhlIGRpc2sgY2FjaGUncyBjb250ZW50c1xuICogQHJlc29sdmVzIHtPYmplY3R9IGEgbWFwIG9mIGtleXMgdG8gY3VycmVudCB2YWx1ZXMgc3RvcmVkIG9uIGRpc2sgdGhhdCBoYXNcbiAqICAgcHJldmlvdXNseSBiZWVuIGNhY2hlZFxuICovXG5cbi8qKlxuICogQG1ldGhvZCB3cml0ZVxuICogQG1lbWJlcm9mIG1vZHVsZTpoYXJkLXNvdXJjZS13ZWJwYWNrLXBsdWdpbi9jYWNoZS1zZXJpYWxpemVyLWZhY3Rvcnl+U2VyaWFsaXplciNcbiAqIEBwYXJhbSB7QXJyYXkuT2JqZWN0fSBvcHMgZGlmZmVyZW5jZSBvZiB2YWx1ZXMgdG8gYmUgc3RvcmVkIGluIHRoZSBkaXNrIGNhY2hlXG4gKiBAcGFyYW0ge3N0cmluZ30gb3BzLmtleVxuICogQHBhcmFtIG9wcy52YWx1ZVxuICogQHJldHVybnMge1Byb21pc2V9IHByb21pc2UgdGhhdCByZXNvbHZlcyB3aGVuIHdyaXRpbmcgY29tcGxldGVzXG4gKi9cblxuY29uc3QgRmlsZVNlcmlhbGl6ZXJQbHVnaW4gPSByZXF1aXJlKCcuL1NlcmlhbGl6ZXJGaWxlUGx1Z2luJyk7XG5jb25zdCBBcHBlbmQyU2VyaWFsaXplclBsdWdpbiA9IHJlcXVpcmUoJy4vU2VyaWFsaXplckFwcGVuZDJQbHVnaW4nKTtcblxuY29uc3QgcGx1Z2luQ29tcGF0ID0gcmVxdWlyZSgnLi91dGlsL3BsdWdpbi1jb21wYXQnKTtcblxuLyoqXG4gKiBAY29uc3RydWN0b3IgQ2FjaGVTZXJpYWxpemVyRmFjdG9yeVxuICogQG1lbWJlcm9mIG1vZHVsZTpoYXJkLXNvdXJjZS13ZWJwYWNrLXBsdWdpbi9jYWNoZS1zZXJpYWxpemVyLWZhY3RvcnlcbiAqL1xuY2xhc3MgQ2FjaGVTZXJpYWxpemVyRmFjdG9yeSB7XG4gIGNvbnN0cnVjdG9yKGNvbXBpbGVyKSB7XG4gICAgdGhpcy5jb21waWxlciA9IGNvbXBpbGVyO1xuXG4gICAgcGx1Z2luQ29tcGF0LnJlZ2lzdGVyKGNvbXBpbGVyLCAnaGFyZFNvdXJjZUNhY2hlRmFjdG9yeScsICdzeW5jV2F0ZXJmYWxsJywgW1xuICAgICAgJ2ZhY3RvcnknLFxuICAgIF0pO1xuXG4gICAgcGx1Z2luQ29tcGF0LnRhcChcbiAgICAgIGNvbXBpbGVyLFxuICAgICAgJ2hhcmRTb3VyY2VDYWNoZUZhY3RvcnknLFxuICAgICAgJ2RlZmF1bHQgZmFjdG9yeScsXG4gICAgICBmYWN0b3J5ID0+IGluZm8gPT4ge1xuICAgICAgICAvLyBJdCdzIGJlc3QgdG8gaGF2ZSBwbHVnaW5zIHRvIGhhcmQtc291cmNlIGxpc3RlZCBpbiB0aGUgY29uZmlnIGFmdGVyIGl0XG4gICAgICAgIC8vIGJ1dCB0byBtYWtlIGhhcmQtc291cmNlIGVhc2llciB0byB1c2Ugd2UgY2FuIGNhbGwgdGhlIGZhY3Rvcnkgb2YgYVxuICAgICAgICAvLyBwbHVnaW4gcGFzc2VkIGludG8gdGhpcyBkZWZhdWx0IGZhY3RvcnkuXG4gICAgICAgIGlmIChmYWN0b3J5KSB7XG4gICAgICAgICAgc2VyaWFsaXplciA9IGZhY3RvcnkoaW5mbyk7XG4gICAgICAgICAgaWYgKHNlcmlhbGl6ZXIpIHtcbiAgICAgICAgICAgIHJldHVybiBzZXJpYWxpemVyO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIE90aGVyd2lzZSBsZXRzIHJldHVybiB0aGUgZGVmYXVsdCBzZXJpYWxpemVycy5cbiAgICAgICAgc3dpdGNoIChpbmZvLnR5cGUpIHtcbiAgICAgICAgICBjYXNlICdkYXRhJzpcbiAgICAgICAgICAgIHJldHVybiBDYWNoZVNlcmlhbGl6ZXJGYWN0b3J5LmRhdGFTZXJpYWxpemVyLmNyZWF0ZVNlcmlhbGl6ZXIoaW5mbyk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICBjYXNlICdmaWxlJzpcbiAgICAgICAgICAgIHJldHVybiBDYWNoZVNlcmlhbGl6ZXJGYWN0b3J5LmZpbGVTZXJpYWxpemVyLmNyZWF0ZVNlcmlhbGl6ZXIoaW5mbyk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgICAgICBgVW5rbm93biBoYXJkLXNvdXJjZSBjYWNoZSBzZXJpYWxpemVyIHR5cGU6ICR7aW5mby50eXBlfWAsXG4gICAgICAgICAgICApO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgIH0sXG4gICAgKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBAbWV0aG9kIGNyZWF0ZVxuICAgKiBAbWVtYmVyb2YgbW9kdWxlOmhhcmQtc291cmNlLXdlYnBhY2stcGx1Z2luL2NhY2hlLXNlcmlhbGl6ZXItZmFjdG9yeX5DYWNoZVNlcmlhbGl6ZXJGYWN0b3J5I1xuICAgKiBAcGFyYW0ge09iamVjdH0gaW5mb1xuICAgKiBAcGFyYW0ge1N0cmluZ30gaW5mby5uYW1lXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBpbmZvLnR5cGVcbiAgICogQHBhcmFtIHtTdHJpbmd9IGluZm8uY2FjaGVEaXJQYXRoXG4gICAqIEByZXR1cm5zIHtTZXJpYWxpemVyfVxuICAgKi9cbiAgY3JlYXRlKGluZm8pIHtcbiAgICBjb25zdCBmYWN0b3J5ID0gcGx1Z2luQ29tcGF0LmNhbGwodGhpcy5jb21waWxlciwgJ2hhcmRTb3VyY2VDYWNoZUZhY3RvcnknLCBbXG4gICAgICBudWxsLFxuICAgIF0pO1xuXG4gICAgY29uc3Qgc2VyaWFsaXplciA9IGZhY3RvcnkoaW5mbyk7XG5cbiAgICByZXR1cm4gc2VyaWFsaXplcjtcbiAgfVxufVxuXG4vKipcbiAqIFRoZSBkZWZhdWx0IGRhdGEgc2VyaWFsaXplciBmYWN0b3J5LlxuICovXG5DYWNoZVNlcmlhbGl6ZXJGYWN0b3J5LmRhdGFTZXJpYWxpemVyID0gQXBwZW5kMlNlcmlhbGl6ZXJQbHVnaW47XG5cbi8qKlxuICogVGhlIGRlZmF1bHQgZmlsZSBzZXJpYWxpemVyIGZhY3RvcnkuXG4gKi9cbkNhY2hlU2VyaWFsaXplckZhY3RvcnkuZmlsZVNlcmlhbGl6ZXIgPSBGaWxlU2VyaWFsaXplclBsdWdpbjtcblxubW9kdWxlLmV4cG9ydHMgPSBDYWNoZVNlcmlhbGl6ZXJGYWN0b3J5O1xuIl0sInNvdXJjZVJvb3QiOiIvVXNlcnMvdHlsZXJhcmJ1cy9kZXYvcHJvdmlkZXIvc3JjIn0=

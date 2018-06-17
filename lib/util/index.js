'use strict';

require('source-map-support/register');

const fs = require('fs');
const path = require('path');

const logMessages = require('./log-messages');

exports.cachePrefix = cachePrefix;

const NS = fs.realpathSync(path.dirname(__dirname));

const cachePrefixNS = `${NS}/cachePrefix`;

function cachePrefix(compilation) {
  if (typeof compilation[cachePrefixNS] === 'undefined') {
    let prefix = '';
    let nextCompilation = compilation;

    while (nextCompilation.compiler.parentCompilation) {
      const parentCompilation = nextCompilation.compiler.parentCompilation;
      if (!nextCompilation.cache) {
        logMessages.childCompilerWithoutCache(compilation);
        prefix = null;
        break;
      }

      const cache = nextCompilation.cache;
      let parentCache = parentCompilation.cache;

      if (cache === parentCache) {
        nextCompilation = parentCompilation;
        continue;
      }

      let cacheKey;
      for (var key in parentCache) {
        if (key && parentCache[key] === cache) {
          cacheKey = key;
          break;
        }
      }
      // webpack 3 adds the children member containing compiler names paired
      // with arrays of compilation caches, one for each compilation sharing the
      // same name.
      if (!cacheKey && parentCache.children) {
        parentCache = parentCache.children;
        for (var key in parentCache) {
          if (key && parentCache[key]) {
            for (const index in parentCache[key]) {
              if (parentCache[key][index] === cache) {
                cacheKey = `${key}.${index}`;
                break;
              }
              if (parentCache[key][index] && typeof parentCache[key][index] === 'object') {
                for (const subkey in parentCache[key][index]) {
                  if (parentCache[key][index][subkey] === cache) {
                    cacheKey = `${key}.${index}.${subkey}`;
                    break;
                  }
                }
              }
            }
          }
        }
      }

      if (!cacheKey) {
        logMessages.childCompilerUnnamedCache(compilation);
        prefix = null;
        break;
      } else {
        prefix = cacheKey + prefix;
      }

      nextCompilation = parentCompilation;
    }

    compilation[cachePrefixNS] = prefix !== null ? require('crypto').createHash('md5').update(prefix).digest('base64') : null;
  }

  return compilation[cachePrefixNS];
}
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImhhcmQtc291cmNlLXdlYnBhY2stcGx1Z2luL2xpYi91dGlsL2luZGV4LmpzIl0sIm5hbWVzIjpbImZzIiwicmVxdWlyZSIsInBhdGgiLCJsb2dNZXNzYWdlcyIsImV4cG9ydHMiLCJjYWNoZVByZWZpeCIsIk5TIiwicmVhbHBhdGhTeW5jIiwiZGlybmFtZSIsIl9fZGlybmFtZSIsImNhY2hlUHJlZml4TlMiLCJjb21waWxhdGlvbiIsInByZWZpeCIsIm5leHRDb21waWxhdGlvbiIsImNvbXBpbGVyIiwicGFyZW50Q29tcGlsYXRpb24iLCJjYWNoZSIsImNoaWxkQ29tcGlsZXJXaXRob3V0Q2FjaGUiLCJwYXJlbnRDYWNoZSIsImNhY2hlS2V5Iiwia2V5IiwiY2hpbGRyZW4iLCJpbmRleCIsInN1YmtleSIsImNoaWxkQ29tcGlsZXJVbm5hbWVkQ2FjaGUiLCJjcmVhdGVIYXNoIiwidXBkYXRlIiwiZGlnZXN0Il0sIm1hcHBpbmdzIjoiOzs7O0FBQUEsTUFBTUEsS0FBS0MsUUFBUSxJQUFSLENBQVg7QUFDQSxNQUFNQyxPQUFPRCxRQUFRLE1BQVIsQ0FBYjs7QUFFQSxNQUFNRSxjQUFjRixRQUFRLGdCQUFSLENBQXBCOztBQUVBRyxRQUFRQyxXQUFSLEdBQXNCQSxXQUF0Qjs7QUFFQSxNQUFNQyxLQUFLTixHQUFHTyxZQUFILENBQWdCTCxLQUFLTSxPQUFMLENBQWFDLFNBQWIsQ0FBaEIsQ0FBWDs7QUFFQSxNQUFNQyxnQkFBaUIsR0FBRUosRUFBRyxjQUE1Qjs7QUFFQSxTQUFTRCxXQUFULENBQXFCTSxXQUFyQixFQUFrQztBQUNoQyxNQUFJLE9BQU9BLFlBQVlELGFBQVosQ0FBUCxLQUFzQyxXQUExQyxFQUF1RDtBQUNyRCxRQUFJRSxTQUFTLEVBQWI7QUFDQSxRQUFJQyxrQkFBa0JGLFdBQXRCOztBQUVBLFdBQU9FLGdCQUFnQkMsUUFBaEIsQ0FBeUJDLGlCQUFoQyxFQUFtRDtBQUNqRCxZQUFNQSxvQkFBb0JGLGdCQUFnQkMsUUFBaEIsQ0FBeUJDLGlCQUFuRDtBQUNBLFVBQUksQ0FBQ0YsZ0JBQWdCRyxLQUFyQixFQUE0QjtBQUMxQmIsb0JBQVljLHlCQUFaLENBQXNDTixXQUF0QztBQUNBQyxpQkFBUyxJQUFUO0FBQ0E7QUFDRDs7QUFFRCxZQUFNSSxRQUFRSCxnQkFBZ0JHLEtBQTlCO0FBQ0EsVUFBSUUsY0FBY0gsa0JBQWtCQyxLQUFwQzs7QUFFQSxVQUFJQSxVQUFVRSxXQUFkLEVBQTJCO0FBQ3pCTCwwQkFBa0JFLGlCQUFsQjtBQUNBO0FBQ0Q7O0FBRUQsVUFBSUksUUFBSjtBQUNBLFdBQUssSUFBSUMsR0FBVCxJQUFnQkYsV0FBaEIsRUFBNkI7QUFDM0IsWUFBSUUsT0FBT0YsWUFBWUUsR0FBWixNQUFxQkosS0FBaEMsRUFBdUM7QUFDckNHLHFCQUFXQyxHQUFYO0FBQ0E7QUFDRDtBQUNGO0FBQ0Q7QUFDQTtBQUNBO0FBQ0EsVUFBSSxDQUFDRCxRQUFELElBQWFELFlBQVlHLFFBQTdCLEVBQXVDO0FBQ3JDSCxzQkFBY0EsWUFBWUcsUUFBMUI7QUFDQSxhQUFLLElBQUlELEdBQVQsSUFBZ0JGLFdBQWhCLEVBQTZCO0FBQzNCLGNBQUlFLE9BQU9GLFlBQVlFLEdBQVosQ0FBWCxFQUE2QjtBQUMzQixpQkFBSyxNQUFNRSxLQUFYLElBQW9CSixZQUFZRSxHQUFaLENBQXBCLEVBQXNDO0FBQ3BDLGtCQUFJRixZQUFZRSxHQUFaLEVBQWlCRSxLQUFqQixNQUE0Qk4sS0FBaEMsRUFBdUM7QUFDckNHLDJCQUFZLEdBQUVDLEdBQUksSUFBR0UsS0FBTSxFQUEzQjtBQUNBO0FBQ0Q7QUFDRCxrQkFDRUosWUFBWUUsR0FBWixFQUFpQkUsS0FBakIsS0FDQSxPQUFPSixZQUFZRSxHQUFaLEVBQWlCRSxLQUFqQixDQUFQLEtBQW1DLFFBRnJDLEVBR0U7QUFDQSxxQkFBSyxNQUFNQyxNQUFYLElBQXFCTCxZQUFZRSxHQUFaLEVBQWlCRSxLQUFqQixDQUFyQixFQUE4QztBQUM1QyxzQkFBSUosWUFBWUUsR0FBWixFQUFpQkUsS0FBakIsRUFBd0JDLE1BQXhCLE1BQW9DUCxLQUF4QyxFQUErQztBQUM3Q0csK0JBQVksR0FBRUMsR0FBSSxJQUFHRSxLQUFNLElBQUdDLE1BQU8sRUFBckM7QUFDQTtBQUNEO0FBQ0Y7QUFDRjtBQUNGO0FBQ0Y7QUFDRjtBQUNGOztBQUVELFVBQUksQ0FBQ0osUUFBTCxFQUFlO0FBQ2JoQixvQkFBWXFCLHlCQUFaLENBQXNDYixXQUF0QztBQUNBQyxpQkFBUyxJQUFUO0FBQ0E7QUFDRCxPQUpELE1BSU87QUFDTEEsaUJBQVNPLFdBQVdQLE1BQXBCO0FBQ0Q7O0FBRURDLHdCQUFrQkUsaUJBQWxCO0FBQ0Q7O0FBRURKLGdCQUFZRCxhQUFaLElBQ0VFLFdBQVcsSUFBWCxHQUNJWCxRQUFRLFFBQVIsRUFDR3dCLFVBREgsQ0FDYyxLQURkLEVBRUdDLE1BRkgsQ0FFVWQsTUFGVixFQUdHZSxNQUhILENBR1UsUUFIVixDQURKLEdBS0ksSUFOTjtBQU9EOztBQUVELFNBQU9oQixZQUFZRCxhQUFaLENBQVA7QUFDRCIsImZpbGUiOiJoYXJkLXNvdXJjZS13ZWJwYWNrLXBsdWdpbi9saWIvdXRpbC9pbmRleC5qcyIsInNvdXJjZXNDb250ZW50IjpbImNvbnN0IGZzID0gcmVxdWlyZSgnZnMnKTtcbmNvbnN0IHBhdGggPSByZXF1aXJlKCdwYXRoJyk7XG5cbmNvbnN0IGxvZ01lc3NhZ2VzID0gcmVxdWlyZSgnLi9sb2ctbWVzc2FnZXMnKTtcblxuZXhwb3J0cy5jYWNoZVByZWZpeCA9IGNhY2hlUHJlZml4O1xuXG5jb25zdCBOUyA9IGZzLnJlYWxwYXRoU3luYyhwYXRoLmRpcm5hbWUoX19kaXJuYW1lKSk7XG5cbmNvbnN0IGNhY2hlUHJlZml4TlMgPSBgJHtOU30vY2FjaGVQcmVmaXhgO1xuXG5mdW5jdGlvbiBjYWNoZVByZWZpeChjb21waWxhdGlvbikge1xuICBpZiAodHlwZW9mIGNvbXBpbGF0aW9uW2NhY2hlUHJlZml4TlNdID09PSAndW5kZWZpbmVkJykge1xuICAgIGxldCBwcmVmaXggPSAnJztcbiAgICBsZXQgbmV4dENvbXBpbGF0aW9uID0gY29tcGlsYXRpb247XG5cbiAgICB3aGlsZSAobmV4dENvbXBpbGF0aW9uLmNvbXBpbGVyLnBhcmVudENvbXBpbGF0aW9uKSB7XG4gICAgICBjb25zdCBwYXJlbnRDb21waWxhdGlvbiA9IG5leHRDb21waWxhdGlvbi5jb21waWxlci5wYXJlbnRDb21waWxhdGlvbjtcbiAgICAgIGlmICghbmV4dENvbXBpbGF0aW9uLmNhY2hlKSB7XG4gICAgICAgIGxvZ01lc3NhZ2VzLmNoaWxkQ29tcGlsZXJXaXRob3V0Q2FjaGUoY29tcGlsYXRpb24pO1xuICAgICAgICBwcmVmaXggPSBudWxsO1xuICAgICAgICBicmVhaztcbiAgICAgIH1cblxuICAgICAgY29uc3QgY2FjaGUgPSBuZXh0Q29tcGlsYXRpb24uY2FjaGU7XG4gICAgICBsZXQgcGFyZW50Q2FjaGUgPSBwYXJlbnRDb21waWxhdGlvbi5jYWNoZTtcblxuICAgICAgaWYgKGNhY2hlID09PSBwYXJlbnRDYWNoZSkge1xuICAgICAgICBuZXh0Q29tcGlsYXRpb24gPSBwYXJlbnRDb21waWxhdGlvbjtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIGxldCBjYWNoZUtleTtcbiAgICAgIGZvciAodmFyIGtleSBpbiBwYXJlbnRDYWNoZSkge1xuICAgICAgICBpZiAoa2V5ICYmIHBhcmVudENhY2hlW2tleV0gPT09IGNhY2hlKSB7XG4gICAgICAgICAgY2FjaGVLZXkgPSBrZXk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIC8vIHdlYnBhY2sgMyBhZGRzIHRoZSBjaGlsZHJlbiBtZW1iZXIgY29udGFpbmluZyBjb21waWxlciBuYW1lcyBwYWlyZWRcbiAgICAgIC8vIHdpdGggYXJyYXlzIG9mIGNvbXBpbGF0aW9uIGNhY2hlcywgb25lIGZvciBlYWNoIGNvbXBpbGF0aW9uIHNoYXJpbmcgdGhlXG4gICAgICAvLyBzYW1lIG5hbWUuXG4gICAgICBpZiAoIWNhY2hlS2V5ICYmIHBhcmVudENhY2hlLmNoaWxkcmVuKSB7XG4gICAgICAgIHBhcmVudENhY2hlID0gcGFyZW50Q2FjaGUuY2hpbGRyZW47XG4gICAgICAgIGZvciAodmFyIGtleSBpbiBwYXJlbnRDYWNoZSkge1xuICAgICAgICAgIGlmIChrZXkgJiYgcGFyZW50Q2FjaGVba2V5XSkge1xuICAgICAgICAgICAgZm9yIChjb25zdCBpbmRleCBpbiBwYXJlbnRDYWNoZVtrZXldKSB7XG4gICAgICAgICAgICAgIGlmIChwYXJlbnRDYWNoZVtrZXldW2luZGV4XSA9PT0gY2FjaGUpIHtcbiAgICAgICAgICAgICAgICBjYWNoZUtleSA9IGAke2tleX0uJHtpbmRleH1gO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGlmIChcbiAgICAgICAgICAgICAgICBwYXJlbnRDYWNoZVtrZXldW2luZGV4XSAmJlxuICAgICAgICAgICAgICAgIHR5cGVvZiBwYXJlbnRDYWNoZVtrZXldW2luZGV4XSA9PT0gJ29iamVjdCdcbiAgICAgICAgICAgICAgKSB7XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBzdWJrZXkgaW4gcGFyZW50Q2FjaGVba2V5XVtpbmRleF0pIHtcbiAgICAgICAgICAgICAgICAgIGlmIChwYXJlbnRDYWNoZVtrZXldW2luZGV4XVtzdWJrZXldID09PSBjYWNoZSkge1xuICAgICAgICAgICAgICAgICAgICBjYWNoZUtleSA9IGAke2tleX0uJHtpbmRleH0uJHtzdWJrZXl9YDtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGlmICghY2FjaGVLZXkpIHtcbiAgICAgICAgbG9nTWVzc2FnZXMuY2hpbGRDb21waWxlclVubmFtZWRDYWNoZShjb21waWxhdGlvbik7XG4gICAgICAgIHByZWZpeCA9IG51bGw7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcHJlZml4ID0gY2FjaGVLZXkgKyBwcmVmaXg7XG4gICAgICB9XG5cbiAgICAgIG5leHRDb21waWxhdGlvbiA9IHBhcmVudENvbXBpbGF0aW9uO1xuICAgIH1cblxuICAgIGNvbXBpbGF0aW9uW2NhY2hlUHJlZml4TlNdID1cbiAgICAgIHByZWZpeCAhPT0gbnVsbFxuICAgICAgICA/IHJlcXVpcmUoJ2NyeXB0bycpXG4gICAgICAgICAgICAuY3JlYXRlSGFzaCgnbWQ1JylcbiAgICAgICAgICAgIC51cGRhdGUocHJlZml4KVxuICAgICAgICAgICAgLmRpZ2VzdCgnYmFzZTY0JylcbiAgICAgICAgOiBudWxsO1xuICB9XG5cbiAgcmV0dXJuIGNvbXBpbGF0aW9uW2NhY2hlUHJlZml4TlNdO1xufVxuIl0sInNvdXJjZVJvb3QiOiIvVXNlcnMvdHlsZXJhcmJ1cy9kZXYvcHJvdmlkZXIvc3JjIn0=

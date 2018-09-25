'use strict';

const chalk = require('chalk');

const pluginCompat = require('./util/plugin-compat');

const LOGGER_SEPARATOR = ':';
const DEFAULT_LOGGER_PREFIX = 'hardsource';

const messages = {
  'serialization--error-freezing-module': {
    short: value => `Could not freeze ${value.data.moduleReadable}: ${value.data.errorMessage}`
  },
  'serialzation--cache-incomplete': {
    short: value => `Last compilation did not finish saving. Building new cache.`
  },
  'confighash--directory-no-confighash': {
    short: value => `Config hash skipped in cache directory.`
  },
  'confighash--new': {
    short: value => `Writing new cache ${value.data.configHash.substring(0, 8)}...`
  },
  'confighash--reused': {
    short: value => `Reading from cache ${value.data.configHash.substring(0, 8)}...`
  },
  'caches--delete-old': {
    short: value => `Deleted ${value.data.deletedSizeMB} MB. Using ${value.data.sizeMB} MB of disk space.`
  },
  'caches--keep': {
    short: value => `Using ${value.data.sizeMB} MB of disk space.`
  },
  'environment--inputs': {
    short: value => `Tracking node dependencies with: ${value.data.inputs.join(', ')}.`
  },
  'environment--config-changed': {
    short: value => 'Configuration changed. Building new cache.'
  },
  'environment--changed': {
    short: value => `Node dependencies changed. Building new cache.`
  },
  'environment--hardsource-changed': {
    short: value => `hard-source version changed. Building new cache.`
  },
  'childcompiler--no-cache': {
    once: value => `A child compiler has its cache disabled. Skipping child in hard-source.`
  },
  'childcompiler--unnamed-cache': {
    once: value => `A child compiler has unnamed cache. Skipping child in hard-source.`
  },
  unrecognized: {
    short: value => value.message
  }
};

const logLevels = ['error', 'warn', 'info', 'log', 'debug'];

const levelId = level => logLevels.indexOf(level.toLowerCase());

const compareLevel = (a, b) => levelId(a) - levelId(b);

class ChalkLoggerPlugin {
  constructor(options = {}) {
    this.options = options;
    this.once = {};

    // mode: 'test' or 'none'
    this.options.mode = this.options.mode || (process.env.NODE_ENV === 'test' ? 'test' : 'none');
    // level: 'error', 'warn', 'info', 'log', 'debug'
    this.options.level = this.options.level || (this.options.mode === 'test' ? 'warn' : 'debug');
  }

  apply(compiler) {
    const compilerHooks = pluginCompat.hooks(compiler);

    compilerHooks.hardSourceLog.tap('HardSource - ChalkLoggerPlugin', value => {
      if (compareLevel(this.options.level, value.level) < 0) {
        return;
      }

      let headerColor = chalk.white;
      let color = chalk.white;
      if (value.level === 'error') {
        headerColor = chalk.red;
      } else if (value.level === 'warn') {
        headerColor = chalk.yellow;
      } else if (value.level === 'info') {
        headerColor = chalk.white;
      } else {
        headerColor = color = chalk.gray;
      }

      const header = headerColor(`[${DEFAULT_LOGGER_PREFIX}${LOGGER_SEPARATOR}${compiler.__hardSource_shortConfigHash || value.from}]`);

      // Always use warn or error so that output goes to stderr.
      const consoleFn = value.level === 'error' ? console.error : console.warn;

      let handle = messages[value.data.id];
      if (!handle) {
        handle = messages.unrecognized;
      }

      if (handle) {
        if (handle.once) {
          if (!this.once[value.data.id]) {
            this.once[value.data.id] = true;
            consoleFn.call(console, header, color(handle.once(value)));
          }
        } else if (handle.short) {
          consoleFn.call(console, header, color(handle.short(value)));
        }
      } else {
        consoleFn.call(console, header, color(value.message));
      }
    });
  }
}

module.exports = ChalkLoggerPlugin;
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImhhcmQtc291cmNlLXdlYnBhY2stcGx1Z2luL2xpYi9DaGFsa0xvZ2dlclBsdWdpbi5qcyJdLCJuYW1lcyI6WyJjaGFsayIsInJlcXVpcmUiLCJwbHVnaW5Db21wYXQiLCJMT0dHRVJfU0VQQVJBVE9SIiwiREVGQVVMVF9MT0dHRVJfUFJFRklYIiwibWVzc2FnZXMiLCJzaG9ydCIsInZhbHVlIiwiZGF0YSIsIm1vZHVsZVJlYWRhYmxlIiwiZXJyb3JNZXNzYWdlIiwiY29uZmlnSGFzaCIsInN1YnN0cmluZyIsImRlbGV0ZWRTaXplTUIiLCJzaXplTUIiLCJpbnB1dHMiLCJqb2luIiwib25jZSIsInVucmVjb2duaXplZCIsIm1lc3NhZ2UiLCJsb2dMZXZlbHMiLCJsZXZlbElkIiwibGV2ZWwiLCJpbmRleE9mIiwidG9Mb3dlckNhc2UiLCJjb21wYXJlTGV2ZWwiLCJhIiwiYiIsIkNoYWxrTG9nZ2VyUGx1Z2luIiwiY29uc3RydWN0b3IiLCJvcHRpb25zIiwibW9kZSIsInByb2Nlc3MiLCJlbnYiLCJOT0RFX0VOViIsImFwcGx5IiwiY29tcGlsZXIiLCJjb21waWxlckhvb2tzIiwiaG9va3MiLCJoYXJkU291cmNlTG9nIiwidGFwIiwiaGVhZGVyQ29sb3IiLCJ3aGl0ZSIsImNvbG9yIiwicmVkIiwieWVsbG93IiwiZ3JheSIsImhlYWRlciIsIl9faGFyZFNvdXJjZV9zaG9ydENvbmZpZ0hhc2giLCJmcm9tIiwiY29uc29sZUZuIiwiY29uc29sZSIsImVycm9yIiwid2FybiIsImhhbmRsZSIsImlkIiwiY2FsbCIsIm1vZHVsZSIsImV4cG9ydHMiXSwibWFwcGluZ3MiOiI7O0FBQUEsTUFBTUEsUUFBUUMsUUFBUSxPQUFSLENBQWQ7O0FBRUEsTUFBTUMsZUFBZUQsK0JBQXJCOztBQUVBLE1BQU1FLG1CQUFtQixHQUF6QjtBQUNBLE1BQU1DLHdCQUF3QixZQUE5Qjs7QUFFQSxNQUFNQyxXQUFXO0FBQ2YsMENBQXdDO0FBQ3RDQyxXQUFPQyxTQUNKLG9CQUFtQkEs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NEMsb0JBQVVNLElBQVYsQ0FBZUwsT0FBZixFQUF3QkosTUFBeEIsRUFBZ0NKLE1BQU1XLE9BQU9oRCxLQUFQLENBQWFDLEtBQWIsQ0FBTixDQUFoQztBQUNEO0FBQ0YsT0FURCxNQVNPO0FBQ0wyQyxrQkFBVU0sSUFBVixDQUFlTCxPQUFmLEVBQXdCSixNQUF4QixFQUFnQ0osTUFBTXBDLE1BQU1ZLE9BQVosQ0FBaEM7QUFDRDtBQUNGLEtBMUNEO0FBMkNEO0FBM0RxQjs7QUE4RHhCc0MsT0FBT0MsT0FBUCxHQUFpQjlCLGlCQUFqQiIsImZpbGUiOiJoYXJkLXNvdXJjZS13ZWJwYWNrLXBsdWdpbi9saWIvQ2hhbGtMb2dnZXJQbHVnaW4uanMiLCJzb3VyY2VzQ29udGVudCI6WyJjb25zdCBjaGFsayA9IHJlcXVpcmUoJ2NoYWxrJyk7XG5cbmNvbnN0IHBsdWdpbkNvbXBhdCA9IHJlcXVpcmUoJy4vdXRpbC9wbHVnaW4tY29tcGF0Jyk7XG5cbmNvbnN0IExPR0dFUl9TRVBBUkFUT1IgPSAnOic7XG5jb25zdCBERUZBVUxUX0xPR0dFUl9QUkVGSVggPSAnaGFyZHNvdXJjZSc7XG5cbmNvbnN0IG1lc3NhZ2VzID0ge1xuICAnc2VyaWFsaXphdGlvbi0tZXJyb3ItZnJlZXppbmctbW9kdWxlJzoge1xuICAgIHNob3J0OiB2YWx1ZSA9PlxuICAgICAgYENvdWxkIG5vdCBmcmVlemUgJHt2YWx1ZS5kYXRhLm1vZHVsZVJlYWRhYmxlfTogJHtcbiAgICAgICAgdmFsdWUuZGF0YS5lcnJvck1lc3NhZ2VcbiAgICAgIH1gLFxuICB9LFxuICAnc2VyaWFsemF0aW9uLS1jYWNoZS1pbmNvbXBsZXRlJzoge1xuICAgIHNob3J0OiB2YWx1ZSA9PlxuICAgICAgYExhc3QgY29tcGlsYXRpb24gZGlkIG5vdCBmaW5pc2ggc2F2aW5nLiBCdWlsZGluZyBuZXcgY2FjaGUuYCxcbiAgfSxcbiAgJ2NvbmZpZ2hhc2gtLWRpcmVjdG9yeS1uby1jb25maWdoYXNoJzoge1xuICAgIHNob3J0OiB2YWx1ZSA9PiBgQ29uZmlnIGhhc2ggc2tpcHBlZCBpbiBjYWNoZSBkaXJlY3RvcnkuYCxcbiAgfSxcbiAgJ2NvbmZpZ2hhc2gtLW5ldyc6IHtcbiAgICBzaG9ydDogdmFsdWUgPT5cbiAgICAgIGBXcml0aW5nIG5ldyBjYWNoZSAke3ZhbHVlLmRhdGEuY29uZmlnSGFzaC5zdWJzdHJpbmcoMCwgOCl9Li4uYCxcbiAgfSxcbiAgJ2NvbmZpZ2hhc2gtLXJldXNlZCc6IHtcbiAgICBzaG9ydDogdmFsdWUgPT5cbiAgICAgIGBSZWFkaW5nIGZyb20gY2FjaGUgJHt2YWx1ZS5kYXRhLmNvbmZpZ0hhc2guc3Vic3RyaW5nKDAsIDgpfS4uLmAsXG4gIH0sXG4gICdjYWNoZXMtLWRlbGV0ZS1vbGQnOiB7XG4gICAgc2hvcnQ6IHZhbHVlID0+XG4gICAgICBgRGVsZXRlZCAke3ZhbHVlLmRhdGEuZGVsZXRlZFNpemVNQn0gTUIuIFVzaW5nICR7XG4gICAgICAgIHZhbHVlLmRhdGEuc2l6ZU1CXG4gICAgICB9IE1CIG9mIGRpc2sgc3BhY2UuYCxcbiAgfSxcbiAgJ2NhY2hlcy0ta2VlcCc6IHtcbiAgICBzaG9ydDogdmFsdWUgPT4gYFVzaW5nICR7dmFsdWUuZGF0YS5zaXplTUJ9IE1CIG9mIGRpc2sgc3BhY2UuYCxcbiAgfSxcbiAgJ2Vudmlyb25tZW50LS1pbnB1dHMnOiB7XG4gICAgc2hvcnQ6IHZhbHVlID0+XG4gICAgICBgVHJhY2tpbmcgbm9kZSBkZXBlbmRlbmNpZXMgd2l0aDogJHt2YWx1ZS5kYXRhLmlucHV0cy5qb2luKCcsICcpfS5gLFxuICB9LFxuICAnZW52aXJvbm1lbnQtLWNvbmZpZy1jaGFuZ2VkJzoge1xuICAgIHNob3J0OiB2YWx1ZSA9PiAnQ29uZmlndXJhdGlvbiBjaGFuZ2VkLiBCdWlsZGluZyBuZXcgY2FjaGUuJyxcbiAgfSxcbiAgJ2Vudmlyb25tZW50LS1jaGFuZ2VkJzoge1xuICAgIHNob3J0OiB2YWx1ZSA9PiBgTm9kZSBkZXBlbmRlbmNpZXMgY2hhbmdlZC4gQnVpbGRpbmcgbmV3IGNhY2hlLmAsXG4gIH0sXG4gICdlbnZpcm9ubWVudC0taGFyZHNvdXJjZS1jaGFuZ2VkJzoge1xuICAgIHNob3J0OiB2YWx1ZSA9PiBgaGFyZC1zb3VyY2UgdmVyc2lvbiBjaGFuZ2VkLiBCdWlsZGluZyBuZXcgY2FjaGUuYCxcbiAgfSxcbiAgJ2NoaWxkY29tcGlsZXItLW5vLWNhY2hlJzoge1xuICAgIG9uY2U6IHZhbHVlID0+XG4gICAgICBgQSBjaGlsZCBjb21waWxlciBoYXMgaXRzIGNhY2hlIGRpc2FibGVkLiBTa2lwcGluZyBjaGlsZCBpbiBoYXJkLXNvdXJjZS5gLFxuICB9LFxuICAnY2hpbGRjb21waWxlci0tdW5uYW1lZC1jYWNoZSc6IHtcbiAgICBvbmNlOiB2YWx1ZSA9PlxuICAgICAgYEEgY2hpbGQgY29tcGlsZXIgaGFzIHVubmFtZWQgY2FjaGUuIFNraXBwaW5nIGNoaWxkIGluIGhhcmQtc291cmNlLmAsXG4gIH0sXG4gIHVucmVjb2duaXplZDoge1xuICAgIHNob3J0OiB2YWx1ZSA9PiB2YWx1ZS5tZXNzYWdlLFxuICB9LFxufTtcblxuY29uc3QgbG9nTGV2ZWxzID0gWydlcnJvcicsICd3YXJuJywgJ2luZm8nLCAnbG9nJywgJ2RlYnVnJ107XG5cbmNvbnN0IGxldmVsSWQgPSBsZXZlbCA9PiBsb2dMZXZlbHMuaW5kZXhPZihsZXZlbC50b0xvd2VyQ2FzZSgpKTtcblxuY29uc3QgY29tcGFyZUxldmVsID0gKGEsIGIpID0+IGxldmVsSWQoYSkgLSBsZXZlbElkKGIpO1xuXG5jbGFzcyBDaGFsa0xvZ2dlclBsdWdpbiB7XG4gIGNvbnN0cnVjdG9yKG9wdGlvbnMgPSB7fSkge1xuICAgIHRoaXMub3B0aW9ucyA9IG9wdGlvbnM7XG4gICAgdGhpcy5vbmNlID0ge307XG5cbiAgICAvLyBtb2RlOiAndGVzdCcgb3IgJ25vbmUnXG4gICAgdGhpcy5vcHRpb25zLm1vZGUgPVxuICAgICAgdGhpcy5vcHRpb25zLm1vZGUgfHwgKHByb2Nlc3MuZW52Lk5PREVfRU5WID09PSAndGVzdCcgPyAndGVzdCcgOiAnbm9uZScpO1xuICAgIC8vIGxldmVsOiAnZXJyb3InLCAnd2FybicsICdpbmZvJywgJ2xvZycsICdkZWJ1ZydcbiAgICB0aGlzLm9wdGlvbnMubGV2ZWwgPVxuICAgICAgdGhpcy5vcHRpb25zLmxldmVsIHx8ICh0aGlzLm9wdGlvbnMubW9kZSA9PT0gJ3Rlc3QnID8gJ3dhcm4nIDogJ2RlYnVnJyk7XG4gIH1cblxuICBhcHBseShjb21waWxlcikge1xuICAgIGNvbnN0IGNvbXBpbGVySG9va3MgPSBwbHVnaW5Db21wYXQuaG9va3MoY29tcGlsZXIpO1xuXG4gICAgY29tcGlsZXJIb29rcy5oYXJkU291cmNlTG9nLnRhcCgnSGFyZFNvdXJjZSAtIENoYWxrTG9nZ2VyUGx1Z2luJywgdmFsdWUgPT4ge1xuICAgICAgaWYgKGNvbXBhcmVMZXZlbCh0aGlzLm9wdGlvbnMubGV2ZWwsIHZhbHVlLmxldmVsKSA8IDApIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBsZXQgaGVhZGVyQ29sb3IgPSBjaGFsay53aGl0ZTtcbiAgICAgIGxldCBjb2xvciA9IGNoYWxrLndoaXRlO1xuICAgICAgaWYgKHZhbHVlLmxldmVsID09PSAnZXJyb3InKSB7XG4gICAgICAgIGhlYWRlckNvbG9yID0gY2hhbGsucmVkO1xuICAgICAgfSBlbHNlIGlmICh2YWx1ZS5sZXZlbCA9PT0gJ3dhcm4nKSB7XG4gICAgICAgIGhlYWRlckNvbG9yID0gY2hhbGsueWVsbG93O1xuICAgICAgfSBlbHNlIGlmICh2YWx1ZS5sZXZlbCA9PT0gJ2luZm8nKSB7XG4gICAgICAgIGhlYWRlckNvbG9yID0gY2hhbGsud2hpdGU7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBoZWFkZXJDb2xvciA9IGNvbG9yID0gY2hhbGsuZ3JheTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgaGVhZGVyID0gaGVhZGVyQ29sb3IoXG4gICAgICAgIGBbJHtERUZBVUxUX0xPR0dFUl9QUkVGSVh9JHtMT0dHRVJfU0VQQVJBVE9SfSR7Y29tcGlsZXIuX19oYXJkU291cmNlX3Nob3J0Q29uZmlnSGFzaCB8fFxuICAgICAgICAgIHZhbHVlLmZyb219XWAsXG4gICAgICApO1xuXG4gICAgICAvLyBBbHdheXMgdXNlIHdhcm4gb3IgZXJyb3Igc28gdGhhdCBvdXRwdXQgZ29lcyB0byBzdGRlcnIuXG4gICAgICBjb25zdCBjb25zb2xlRm4gPSB2YWx1ZS5sZXZlbCA9PT0gJ2Vycm9yJyA/IGNvbnNvbGUuZXJyb3IgOiBjb25zb2xlLndhcm47XG5cbiAgICAgIGxldCBoYW5kbGUgPSBtZXNzYWdlc1t2YWx1ZS5kYXRhLmlkXTtcbiAgICAgIGlmICghaGFuZGxlKSB7XG4gICAgICAgIGhhbmRsZSA9IG1lc3NhZ2VzLnVucmVjb2duaXplZDtcbiAgICAgIH1cblxuICAgICAgaWYgKGhhbmRsZSkge1xuICAgICAgICBpZiAoaGFuZGxlLm9uY2UpIHtcbiAgICAgICAgICBpZiAoIXRoaXMub25jZVt2YWx1ZS5kYXRhLmlkXSkge1xuICAgICAgICAgICAgdGhpcy5vbmNlW3ZhbHVlLmRhdGEuaWRdID0gdHJ1ZTtcbiAgICAgICAgICAgIGNvbnNvbGVGbi5jYWxsKGNvbnNvbGUsIGhlYWRlciwgY29sb3IoaGFuZGxlLm9uY2UodmFsdWUpKSk7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKGhhbmRsZS5zaG9ydCkge1xuICAgICAgICAgIGNvbnNvbGVGbi5jYWxsKGNvbnNvbGUsIGhlYWRlciwgY29sb3IoaGFuZGxlLnNob3J0KHZhbHVlKSkpO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb25zb2xlRm4uY2FsbChjb25zb2xlLCBoZWFkZXIsIGNvbG9yKHZhbHVlLm1lc3NhZ2UpKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IENoYWxrTG9nZ2VyUGx1Z2luO1xuIl0sInNvdXJjZVJvb3QiOiIvVXNlcnMvdHlsZXJhcmJ1cy9kZXYvcHJvdmlkZXIvc3JjIn0=

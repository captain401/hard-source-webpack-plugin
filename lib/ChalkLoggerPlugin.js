'use strict';

require('source-map-support/register');

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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImhhcmQtc291cmNlLXdlYnBhY2stcGx1Z2luL2xpYi9DaGFsa0xvZ2dlclBsdWdpbi5qcyJdLCJuYW1lcyI6WyJjaGFsayIsInJlcXVpcmUiLCJwbHVnaW5Db21wYXQiLCJMT0dHRVJfU0VQQVJBVE9SIiwiREVGQVVMVF9MT0dHRVJfUFJFRklYIiwibWVzc2FnZXMiLCJzaG9ydCIsInZhbHVlIiwiZGF0YSIsIm1vZHVsZVJlYWRhYmxlIiwiZXJyb3JNZXNzYWdlIiwiY29uZmlnSGFzaCIsInN1YnN0cmluZyIsImlucHV0cyIsImpvaW4iLCJvbmNlIiwidW5yZWNvZ25pemVkIiwibWVzc2FnZSIsImxvZ0xldmVscyIsImxldmVsSWQiLCJsZXZlbCIsImluZGV4T2YiLCJ0b0xvd2VyQ2FzZSIsImNvbXBhcmVMZXZlbCIsImEiLCJiIiwiQ2hhbGtMb2dnZXJQbHVnaW4iLCJjb25zdHJ1Y3RvciIsIm9wdGlvbnMiLCJtb2RlIiwicHJvY2VzcyIsImVudiIsIk5PREVfRU5WIiwiYXBwbHkiLCJjb21waWxlciIsImNvbXBpbGVySG9va3MiLCJob29rcyIsImhhcmRTb3VyY2VMb2ciLCJ0YXAiLCJoZWFkZXJDb2xvciIsIndoaXRlIiwiY29sb3IiLCJyZWQiLCJ5ZWxsb3ciLCJncmF5IiwiaGVhZGVyIiwiX19oYXJkU291cmNlX3Nob3J0Q29uZmlnSGFzaCIsImZyb20iLCJjb25zb2xlRm4iLCJjb25zb2xlIiwiZXJyb3IiLCJ3YXJuIiwiaGFuZGxlIiwiaWQiLCJjYWxsIiwibW9kdWxlIiwiZXhwb3J0cyJdLCJtYXBwaW5ncyI6Ijs7OztBQUFBLE1BQU1BLFFBQVFDLFFBQVEsT0FBUixDQUFkOztBQUVBLE1BQU1DLGVBQWVELFFBQVEsc0JBQVIsQ0FBckI7O0FBRUEsTUFBTUUsbUJBQW1CLEdBQXpCO0FBQ0EsTUFBTUMsd0JBQXdCLFlBQTlCOztBQUVBLE1BQU1DLFdBQVc7QUFDZiwwQ0FBd0M7QUFDdENDLFdBQU9DLFNBQ0osb0JBQW1CQSxNQUFNQyxJQUFOLENB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RDtBQUNGLEtBMUNEO0FBMkNEO0FBM0RxQjs7QUE4RHhCc0MsT0FBT0MsT0FBUCxHQUFpQjlCLGlCQUFqQiIsImZpbGUiOiJoYXJkLXNvdXJjZS13ZWJwYWNrLXBsdWdpbi9saWIvQ2hhbGtMb2dnZXJQbHVnaW4uanMiLCJzb3VyY2VzQ29udGVudCI6WyJjb25zdCBjaGFsayA9IHJlcXVpcmUoJ2NoYWxrJyk7XG5cbmNvbnN0IHBsdWdpbkNvbXBhdCA9IHJlcXVpcmUoJy4vdXRpbC9wbHVnaW4tY29tcGF0Jyk7XG5cbmNvbnN0IExPR0dFUl9TRVBBUkFUT1IgPSAnOic7XG5jb25zdCBERUZBVUxUX0xPR0dFUl9QUkVGSVggPSAnaGFyZHNvdXJjZSc7XG5cbmNvbnN0IG1lc3NhZ2VzID0ge1xuICAnc2VyaWFsaXphdGlvbi0tZXJyb3ItZnJlZXppbmctbW9kdWxlJzoge1xuICAgIHNob3J0OiB2YWx1ZSA9PlxuICAgICAgYENvdWxkIG5vdCBmcmVlemUgJHt2YWx1ZS5kYXRhLm1vZHVsZVJlYWRhYmxlfTogJHtcbiAgICAgICAgdmFsdWUuZGF0YS5lcnJvck1lc3NhZ2VcbiAgICAgIH1gLFxuICB9LFxuICAnc2VyaWFsemF0aW9uLS1jYWNoZS1pbmNvbXBsZXRlJzoge1xuICAgIHNob3J0OiB2YWx1ZSA9PlxuICAgICAgYExhc3QgY29tcGlsYXRpb24gZGlkIG5vdCBmaW5pc2ggc2F2aW5nLiBCdWlsZGluZyBuZXcgY2FjaGUuYCxcbiAgfSxcbiAgJ2NvbmZpZ2hhc2gtLWRpcmVjdG9yeS1uby1jb25maWdoYXNoJzoge1xuICAgIHNob3J0OiB2YWx1ZSA9PiBgQ29uZmlnIGhhc2ggc2tpcHBlZCBpbiBjYWNoZSBkaXJlY3RvcnkuYCxcbiAgfSxcbiAgJ2NvbmZpZ2hhc2gtLW5ldyc6IHtcbiAgICBzaG9ydDogdmFsdWUgPT5cbiAgICAgIGBXcml0aW5nIG5ldyBjYWNoZSAke3ZhbHVlLmRhdGEuY29uZmlnSGFzaC5zdWJzdHJpbmcoMCwgOCl9Li4uYCxcbiAgfSxcbiAgJ2NvbmZpZ2hhc2gtLXJldXNlZCc6IHtcbiAgICBzaG9ydDogdmFsdWUgPT5cbiAgICAgIGBSZWFkaW5nIGZyb20gY2FjaGUgJHt2YWx1ZS5kYXRhLmNvbmZpZ0hhc2guc3Vic3RyaW5nKDAsIDgpfS4uLmAsXG4gIH0sXG4gICdlbnZpcm9ubWVudC0taW5wdXRzJzoge1xuICAgIHNob3J0OiB2YWx1ZSA9PlxuICAgICAgYFRyYWNraW5nIG5vZGUgZGVwZW5kZW5jaWVzIHdpdGg6ICR7dmFsdWUuZGF0YS5pbnB1dHMuam9pbignLCAnKX0uYCxcbiAgfSxcbiAgJ2Vudmlyb25tZW50LS1jb25maWctY2hhbmdlZCc6IHtcbiAgICBzaG9ydDogdmFsdWUgPT4gJ0NvbmZpZ3VyYXRpb24gY2hhbmdlZC4gQnVpbGRpbmcgbmV3IGNhY2hlLicsXG4gIH0sXG4gICdlbnZpcm9ubWVudC0tY2hhbmdlZCc6IHtcbiAgICBzaG9ydDogdmFsdWUgPT4gYE5vZGUgZGVwZW5kZW5jaWVzIGNoYW5nZWQuIEJ1aWxkaW5nIG5ldyBjYWNoZS5gLFxuICB9LFxuICAnZW52aXJvbm1lbnQtLWhhcmRzb3VyY2UtY2hhbmdlZCc6IHtcbiAgICBzaG9ydDogdmFsdWUgPT4gYGhhcmQtc291cmNlIHZlcnNpb24gY2hhbmdlZC4gQnVpbGRpbmcgbmV3IGNhY2hlLmAsXG4gIH0sXG4gICdjaGlsZGNvbXBpbGVyLS1uby1jYWNoZSc6IHtcbiAgICBvbmNlOiB2YWx1ZSA9PlxuICAgICAgYEEgY2hpbGQgY29tcGlsZXIgaGFzIGl0cyBjYWNoZSBkaXNhYmxlZC4gU2tpcHBpbmcgY2hpbGQgaW4gaGFyZC1zb3VyY2UuYCxcbiAgfSxcbiAgJ2NoaWxkY29tcGlsZXItLXVubmFtZWQtY2FjaGUnOiB7XG4gICAgb25jZTogdmFsdWUgPT5cbiAgICAgIGBBIGNoaWxkIGNvbXBpbGVyIGhhcyB1bm5hbWVkIGNhY2hlLiBTa2lwcGluZyBjaGlsZCBpbiBoYXJkLXNvdXJjZS5gLFxuICB9LFxuICB1bnJlY29nbml6ZWQ6IHtcbiAgICBzaG9ydDogdmFsdWUgPT4gdmFsdWUubWVzc2FnZSxcbiAgfSxcbn07XG5cbmNvbnN0IGxvZ0xldmVscyA9IFsnZXJyb3InLCAnd2FybicsICdpbmZvJywgJ2xvZycsICdkZWJ1ZyddO1xuXG5jb25zdCBsZXZlbElkID0gbGV2ZWwgPT4gbG9nTGV2ZWxzLmluZGV4T2YobGV2ZWwudG9Mb3dlckNhc2UoKSk7XG5cbmNvbnN0IGNvbXBhcmVMZXZlbCA9IChhLCBiKSA9PiBsZXZlbElkKGEpIC0gbGV2ZWxJZChiKTtcblxuY2xhc3MgQ2hhbGtMb2dnZXJQbHVnaW4ge1xuICBjb25zdHJ1Y3RvcihvcHRpb25zID0ge30pIHtcbiAgICB0aGlzLm9wdGlvbnMgPSBvcHRpb25zO1xuICAgIHRoaXMub25jZSA9IHt9O1xuXG4gICAgLy8gbW9kZTogJ3Rlc3QnIG9yICdub25lJ1xuICAgIHRoaXMub3B0aW9ucy5tb2RlID1cbiAgICAgIHRoaXMub3B0aW9ucy5tb2RlIHx8IChwcm9jZXNzLmVudi5OT0RFX0VOViA9PT0gJ3Rlc3QnID8gJ3Rlc3QnIDogJ25vbmUnKTtcbiAgICAvLyBsZXZlbDogJ2Vycm9yJywgJ3dhcm4nLCAnaW5mbycsICdsb2cnLCAnZGVidWcnXG4gICAgdGhpcy5vcHRpb25zLmxldmVsID1cbiAgICAgIHRoaXMub3B0aW9ucy5sZXZlbCB8fCAodGhpcy5vcHRpb25zLm1vZGUgPT09ICd0ZXN0JyA/ICd3YXJuJyA6ICdkZWJ1ZycpO1xuICB9XG5cbiAgYXBwbHkoY29tcGlsZXIpIHtcbiAgICBjb25zdCBjb21waWxlckhvb2tzID0gcGx1Z2luQ29tcGF0Lmhvb2tzKGNvbXBpbGVyKTtcblxuICAgIGNvbXBpbGVySG9va3MuaGFyZFNvdXJjZUxvZy50YXAoJ0hhcmRTb3VyY2UgLSBDaGFsa0xvZ2dlclBsdWdpbicsIHZhbHVlID0+IHtcbiAgICAgIGlmIChjb21wYXJlTGV2ZWwodGhpcy5vcHRpb25zLmxldmVsLCB2YWx1ZS5sZXZlbCkgPCAwKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgbGV0IGhlYWRlckNvbG9yID0gY2hhbGsud2hpdGU7XG4gICAgICBsZXQgY29sb3IgPSBjaGFsay53aGl0ZTtcbiAgICAgIGlmICh2YWx1ZS5sZXZlbCA9PT0gJ2Vycm9yJykge1xuICAgICAgICBoZWFkZXJDb2xvciA9IGNoYWxrLnJlZDtcbiAgICAgIH0gZWxzZSBpZiAodmFsdWUubGV2ZWwgPT09ICd3YXJuJykge1xuICAgICAgICBoZWFkZXJDb2xvciA9IGNoYWxrLnllbGxvdztcbiAgICAgIH0gZWxzZSBpZiAodmFsdWUubGV2ZWwgPT09ICdpbmZvJykge1xuICAgICAgICBoZWFkZXJDb2xvciA9IGNoYWxrLndoaXRlO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaGVhZGVyQ29sb3IgPSBjb2xvciA9IGNoYWxrLmdyYXk7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IGhlYWRlciA9IGhlYWRlckNvbG9yKFxuICAgICAgICBgWyR7REVGQVVMVF9MT0dHRVJfUFJFRklYfSR7TE9HR0VSX1NFUEFSQVRPUn0ke2NvbXBpbGVyLl9faGFyZFNvdXJjZV9zaG9ydENvbmZpZ0hhc2ggfHxcbiAgICAgICAgICB2YWx1ZS5mcm9tfV1gLFxuICAgICAgKTtcblxuICAgICAgLy8gQWx3YXlzIHVzZSB3YXJuIG9yIGVycm9yIHNvIHRoYXQgb3V0cHV0IGdvZXMgdG8gc3RkZXJyLlxuICAgICAgY29uc3QgY29uc29sZUZuID0gdmFsdWUubGV2ZWwgPT09ICdlcnJvcicgPyBjb25zb2xlLmVycm9yIDogY29uc29sZS53YXJuO1xuXG4gICAgICBsZXQgaGFuZGxlID0gbWVzc2FnZXNbdmFsdWUuZGF0YS5pZF07XG4gICAgICBpZiAoIWhhbmRsZSkge1xuICAgICAgICBoYW5kbGUgPSBtZXNzYWdlcy51bnJlY29nbml6ZWQ7XG4gICAgICB9XG5cbiAgICAgIGlmIChoYW5kbGUpIHtcbiAgICAgICAgaWYgKGhhbmRsZS5vbmNlKSB7XG4gICAgICAgICAgaWYgKCF0aGlzLm9uY2VbdmFsdWUuZGF0YS5pZF0pIHtcbiAgICAgICAgICAgIHRoaXMub25jZVt2YWx1ZS5kYXRhLmlkXSA9IHRydWU7XG4gICAgICAgICAgICBjb25zb2xlRm4uY2FsbChjb25zb2xlLCBoZWFkZXIsIGNvbG9yKGhhbmRsZS5vbmNlKHZhbHVlKSkpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmIChoYW5kbGUuc2hvcnQpIHtcbiAgICAgICAgICBjb25zb2xlRm4uY2FsbChjb25zb2xlLCBoZWFkZXIsIGNvbG9yKGhhbmRsZS5zaG9ydCh2YWx1ZSkpKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29uc29sZUZuLmNhbGwoY29uc29sZSwgaGVhZGVyLCBjb2xvcih2YWx1ZS5tZXNzYWdlKSk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBDaGFsa0xvZ2dlclBsdWdpbjtcbiJdLCJzb3VyY2VSb290IjoiL1VzZXJzL3R5bGVyYXJidXMvZGV2L3Byb3ZpZGVyL3NyYyJ9

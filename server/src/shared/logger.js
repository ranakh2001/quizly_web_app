// Tiny logger so the codebase never calls console.* directly outside this file.
import config from '../config.js';

const logger = {
  // Routine info noise (migrations applied, server started, seed progress) isn't useful in
  // test output - it runs on every test file's in-memory DB setup. warn/error stay on since
  // those indicate something worth seeing even during tests.
  info: (...args) => {
    if (!config.isTest) console.log('[info]', ...args);
  },
  warn: (...args) => console.warn('[warn]', ...args),
  error: (...args) => console.error('[error]', ...args),
};

export default logger;

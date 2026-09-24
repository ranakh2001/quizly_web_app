import createApp from './app.js';
import config from './config.js';
import { runMigrations } from './db/migrate.js';
import logger from './shared/logger.js';

// The only file that calls listen(). Keeping app construction separate lets
// tests import app.js without opening a real port.
runMigrations();

const app = createApp();

app.listen(config.port, () => {
  logger.info(`quizly server listening on port ${config.port}`);
});

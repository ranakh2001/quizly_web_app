import fs from 'node:fs';
import config from '../config.js';
import { runMigrations } from './migrate.js';
import { seed } from './seed.js';
import logger from '../shared/logger.js';

// Deletes the SQLite file (and its WAL/SHM sidecars) then rebuilds it from scratch.
function resetDatabase() {
  for (const suffix of ['', '-wal', '-shm']) {
    const file = `${config.databasePath}${suffix}`;
    if (fs.existsSync(file)) fs.unlinkSync(file);
  }
  logger.info('reset-db: database files removed');
  runMigrations();
  seed();
}

resetDatabase();

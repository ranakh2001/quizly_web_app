import createApp from '../../src/app.js';
import { createConnection } from '../../src/db/connection.js';
import { runMigrations } from '../../src/db/migrate.js';

// Builds an Express app backed by a fresh in-memory database, isolated per test file.
export function createTestApp() {
  const db = createConnection(':memory:');
  runMigrations(db);
  const app = createApp(db);
  return { app, db };
}

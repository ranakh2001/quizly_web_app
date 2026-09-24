import createApp from '../../src/app.js';
import { createConnection } from '../../src/db/connection.js';
import { runMigrations } from '../../src/db/migrate.js';

// Builds an Express app backed by a fresh in-memory database, isolated per test file.
// Login helpers for authenticated requests are added once auth exists (Phase 2).
export function createTestApp() {
  const db = createConnection(':memory:');
  runMigrations(db);
  const app = createApp();
  return { app, db };
}

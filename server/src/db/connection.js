import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import config from '../config.js';

let sharedConnection = null;

// Single factory for better-sqlite3 connections. Tests pass ':memory:' to get an isolated
// in-memory database per test file; the app uses the configured file path.
export function createConnection(databasePath = config.databasePath) {
  if (databasePath !== ':memory:') {
    fs.mkdirSync(path.dirname(databasePath), { recursive: true });
  }
  const db = new Database(databasePath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  return db;
}

// The app process shares one connection so every module hits the same database.
export function getConnection() {
  if (!sharedConnection) {
    sharedConnection = createConnection();
  }
  return sharedConnection;
}

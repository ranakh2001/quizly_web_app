import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cookieParser from 'cookie-parser';
import config from './config.js';
import errorHandler from './shared/errorHandler.js';
import { notFound } from './shared/errors.js';
import { getConnection } from './db/connection.js';
import authRouter from './modules/auth/auth.routes.js';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDistPath = path.join(dirname, '../../client/dist');

// Builds and returns the Express app without calling listen(), so tests can import
// it directly with supertest. server.js is the only file that starts listening.
// `db` defaults to the shared connection but tests pass their own isolated database,
// so every route/service/repository reads it from req.db instead of importing a singleton.
export default function createApp(db = getConnection()) {
  const app = express();

  app.use(express.json());
  app.use(cookieParser());
  app.use((req, res, next) => {
    req.db = db;
    next();
  });

  app.get('/api/health', (req, res) => {
    res.json({ ok: true, serverTime: new Date().toISOString() });
  });

  app.use('/api/auth', authRouter);

  app.use('/api', (req, res, next) => {
    next(notFound('Route not found'));
  });

  if (config.isProduction) {
    app.use(express.static(clientDistPath));
    app.get('/*splat', (req, res) => {
      res.sendFile(path.join(clientDistPath, 'index.html'));
    });
  }

  app.use(errorHandler);

  return app;
}

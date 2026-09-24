// Reads process.env exactly once at startup and exposes a frozen config object.
// Every other module imports config from here instead of touching process.env directly.

const config = Object.freeze({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 3000,
  databasePath: process.env.DATABASE_PATH || './data/quizly.db',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me',
  isProduction: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test',
});

export default config;

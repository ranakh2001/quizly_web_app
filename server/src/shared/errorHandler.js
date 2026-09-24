import logger from './logger.js';
import { AppError } from './errors.js';

// Express error-handling middleware (4 args) must stay last in app.js.
// Every thrown error, AppError or not, is normalised into { error: { code, message, details } }.
export default function errorHandler(error, req, res, _next) {
  if (error instanceof AppError) {
    if (error.status >= 500) logger.error(error);
    res.status(error.status).json({
      error: { code: error.code, message: error.message, details: error.details ?? null },
    });
    return;
  }

  logger.error(error);
  res.status(500).json({
    error: { code: 'INTERNAL_ERROR', message: 'Something went wrong', details: null },
  });
}

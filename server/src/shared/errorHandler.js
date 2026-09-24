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

  // body-parser's JSON size limit (see app.js) throws a plain Error, not an AppError - a
  // too-large upload is a client mistake, not a server bug, so it gets its own clean 4xx
  // instead of being masked as a 500 by the generic handler below.
  if (error.type === 'entity.too.large') {
    res.status(413).json({
      error: { code: 'PAYLOAD_TOO_LARGE', message: 'The request is too large', details: null },
    });
    return;
  }

  logger.error(error);
  res.status(500).json({
    error: { code: 'INTERNAL_ERROR', message: 'Something went wrong', details: null },
  });
}

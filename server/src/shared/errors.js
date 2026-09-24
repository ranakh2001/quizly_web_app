// One error type for every expected failure. Routes and services throw these;
// errorHandler.js is the only place that turns them into an HTTP response.

export class AppError extends Error {
  constructor(code, message, status, details) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export const badRequest = (message, details) => new AppError('BAD_REQUEST', message, 400, details);

export const unauthorized = (message = 'Unauthorized') =>
  new AppError('UNAUTHORIZED', message, 401);

export const forbidden = (message = 'Forbidden') => new AppError('FORBIDDEN', message, 403);

export const notFound = (message = 'Not found') => new AppError('NOT_FOUND', message, 404);

export const conflict = (message, details) => new AppError('CONFLICT', message, 409, details);

export const validation = (message, details) =>
  new AppError('VALIDATION_ERROR', message, 422, details);

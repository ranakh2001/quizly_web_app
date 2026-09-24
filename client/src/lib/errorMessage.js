import { ApiError } from '../api/client.js';

// Generic per-code fallback keys. A screen can pass its own `overrides` for a code that
// deserves more specific copy in that context (e.g. login's UNAUTHORIZED becomes
// "incorrect code/username or password" instead of the generic "not signed in").
const DEFAULT_KEYS_BY_CODE = {
  UNAUTHORIZED: 'errors.unauthorized',
  FORBIDDEN: 'errors.forbidden',
  NOT_FOUND: 'errors.notFound',
  CONFLICT: 'errors.conflict',
  VALIDATION_ERROR: 'errors.validation',
  BAD_REQUEST: 'errors.badRequest',
  TOO_MANY_ATTEMPTS: 'errors.tooManyAttempts',
  PAYLOAD_TOO_LARGE: 'errors.payloadTooLarge',
};

// Maps an error to a stable i18n KEY (never a translated string) so callers can store it in
// state and call t(key) at render time - that's what makes the message switch languages
// immediately if the user toggles language while the error is still on screen, instead of
// staying frozen in whatever language was active when the error was first caught. Also the
// single place the server's raw error.message is deliberately never used for display.
export function errorMessageKey(error, { overrides = {}, fallback = 'common.genericError' } = {}) {
  if (error instanceof ApiError) {
    const key = overrides[error.code] ?? DEFAULT_KEYS_BY_CODE[error.code];
    if (key) return key;
  }
  return fallback;
}

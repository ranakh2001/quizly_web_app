// The only place in the client that calls fetch(). Every request goes through the
// Vite dev proxy (/api -> http://localhost:3000) or, in production, is same-origin.

const BASE_URL = '/api';

// A session that expires or gets revoked while the user is deep in the app (e.g. mid-quiz)
// would otherwise just leave every subsequent call throwing an inline "session expired"
// error with no way back except a manual refresh. AuthContext registers a handler here that
// clears the signed-in user, so RequireAuth's existing "no user -> /login" redirect kicks in
// automatically on the next render - one place handles it instead of every screen guessing.
let onUnauthorized = null;
export function setUnauthorizedHandler(handler) {
  onUnauthorized = handler;
}

// /auth/login and /auth/me are expected to 401 as part of normal, non-broken flows (a wrong
// password, or the very first "am I logged in?" check) - only a 401 from somewhere else means
// a previously-valid session just stopped being valid.
const ROUTES_EXEMPT_FROM_GLOBAL_401 = new Set(['/auth/login', '/auth/me']);

class ApiError extends Error {
  constructor(code, message, status, details) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

async function request(path, options = {}) {
  const response = await fetch(`${BASE_URL}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const isJson = response.headers.get('content-type')?.includes('application/json');
  const payload = isJson ? await response.json() : null;

  if (!response.ok) {
    const { code, message, details } = payload?.error ?? {};
    if (response.status === 401 && !ROUTES_EXEMPT_FROM_GLOBAL_401.has(path)) {
      onUnauthorized?.();
    }
    throw new ApiError(
      code ?? 'UNKNOWN_ERROR',
      message ?? 'Something went wrong',
      response.status,
      details ?? null,
    );
  }

  return payload;
}

export const api = {
  get: (path) => request(path, { method: 'GET' }),
  post: (path, body) => request(path, { method: 'POST', body }),
  put: (path, body) => request(path, { method: 'PUT', body }),
  delete: (path) => request(path, { method: 'DELETE' }),
};

export { ApiError };

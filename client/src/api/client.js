// The only place in the client that calls fetch(). Every request goes through the
// Vite dev proxy (/api -> http://localhost:3000) or, in production, is same-origin.

const BASE_URL = '/api';

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

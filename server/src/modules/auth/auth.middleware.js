import { SESSION_COOKIE_NAME } from '../../constants.js';
import { unauthorized, forbidden } from '../../shared/errors.js';
import { verifySession } from './auth.service.js';

// Verifies the session cookie and attaches the current user as req.user. Every module's
// routes that need a signed-in user put this first; ownership checks (e.g. "this teacher
// owns this quiz") are specific to each feature and live in that feature's service instead.
export function requireAuth(req, res, next) {
  const token = req.cookies[SESSION_COOKIE_NAME];
  if (!token) {
    next(unauthorized('Not signed in'));
    return;
  }

  try {
    req.user = verifySession(req.db, token);
    next();
  } catch (error) {
    next(error);
  }
}

// Must run after requireAuth. Rejects any role not in the allowed list.
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      next(forbidden('You do not have access to this resource'));
      return;
    }
    next();
  };
}

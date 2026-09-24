import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import config from '../../config.js';
import { SESSION_COOKIE_NAME, LOGIN_MAX_FAILURES, LOGIN_LOCKOUT_MINUTES } from '../../constants.js';
import validate from '../../shared/validate.js';
import { loginSchema } from './auth.schemas.js';
import * as authService from './auth.service.js';
import { requireAuth } from './auth.middleware.js';

const router = Router();

const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: config.isProduction,
};

// Rule 14: rate-limit login failures. Skipped in tests so the rest of the auth test suite
// (which logs in many times per file) doesn't trip a shared limiter.
const loginLimiter = rateLimit({
  windowMs: LOGIN_LOCKOUT_MINUTES * 60 * 1000,
  limit: LOGIN_MAX_FAILURES,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => config.isTest,
  message: {
    error: {
      code: 'TOO_MANY_ATTEMPTS',
      message: 'Too many login attempts. Try again later.',
      details: null,
    },
  },
});

router.post('/login', loginLimiter, validate(loginSchema), (req, res) => {
  const { token, user } = authService.login(req.db, req.body);
  res.cookie(SESSION_COOKIE_NAME, token, cookieOptions);
  res.json({ user });
});

router.post('/logout', (req, res) => {
  res.clearCookie(SESSION_COOKIE_NAME, cookieOptions);
  res.status(204).end();
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

export default router;

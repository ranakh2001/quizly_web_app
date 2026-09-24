// Business constants shared across services. Nothing here talks to Express or the database.
// Keeping every magic number/string in one file is what makes the business rules easy to find.

export const DEFAULT_TIME_LIMIT_MIN = 20;
export const GRACE_SECONDS = 30;
export const DEFAULT_PENALTY_RATIO = 0.25;
export const OPTIONS_PER_QUESTION = 4;

export const ROLES = Object.freeze({
  STUDENT: 'student',
  TEACHER: 'teacher',
  ADMIN: 'admin',
});

export const QUIZ_STATUS = Object.freeze({
  DRAFT: 'draft',
  PUBLISHED: 'published',
});

export const ATTEMPT_STATUS = Object.freeze({
  IN_PROGRESS: 'in_progress',
  SUBMITTED: 'submitted',
  AUTO_SUBMITTED: 'auto_submitted',
});

export const LOGIN_MAX_FAILURES = 5;
export const LOGIN_LOCKOUT_MINUTES = 5;

export const SESSION_COOKIE_NAME = 'session';
export const SESSION_DURATION = '12h';

// Pure functions for "is this quiz in a state a student can act on", no DB/Express imports.

import { QUIZ_DISPLAY_STATUS } from '../constants.js';

// Rule: a quiz can be started only if published, assigned to the student's class, and
// opens_at <= now < closes_at.
export function canStartQuiz({ quiz, isClassAssigned, now }) {
  if (quiz.status !== 'published') return false;
  if (!isClassAssigned) return false;

  const nowMs = new Date(now).getTime();
  return new Date(quiz.opensAt).getTime() <= nowMs && nowMs < new Date(quiz.closesAt).getTime();
}

// Which of the student Home screen's three tabs (upcoming/available/completed) a quiz
// belongs in, given the student's own attempt for it (if any).
export function categorizeQuizForStudent({ quiz, attempt, now }) {
  const nowMs = new Date(now).getTime();
  const opensMs = new Date(quiz.opensAt).getTime();
  const closesMs = new Date(quiz.closesAt).getTime();

  if (nowMs < opensMs) return 'upcoming';
  if (attempt && (attempt.status === 'submitted' || attempt.status === 'auto_submitted')) {
    return 'completed';
  }
  if (nowMs >= closesMs) return 'completed';
  return 'available';
}

// Rule: the per-question review (is_correct) unlocks only after the quiz closes, regardless
// of when the individual student's attempt was finalised.
export function isReviewUnlocked({ quiz, now }) {
  return new Date(now).getTime() >= new Date(quiz.closesAt).getTime();
}

// Rule: a published quiz whose closing time has passed displays as "closed" to staff, even
// though the stored status column only ever holds draft/published - "closed" is a read-only
// display state, never written back to the database.
export function getQuizDisplayStatus({ status, closesAt, now }) {
  if (
    status === QUIZ_DISPLAY_STATUS.PUBLISHED &&
    new Date(now).getTime() >= new Date(closesAt).getTime()
  ) {
    return QUIZ_DISPLAY_STATUS.CLOSED;
  }
  return status;
}

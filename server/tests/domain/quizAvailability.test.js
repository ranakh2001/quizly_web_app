import { describe, it, expect } from 'vitest';
import {
  canStartQuiz,
  categorizeQuizForStudent,
  isReviewUnlocked,
} from '../../src/domain/quizAvailability.js';

const baseQuiz = {
  status: 'published',
  opensAt: '2026-01-10T00:00:00.000Z',
  closesAt: '2026-01-20T00:00:00.000Z',
};

describe('canStartQuiz', () => {
  it('allows starting when published, class assigned, and within the open window', () => {
    expect(
      canStartQuiz({ quiz: baseQuiz, isClassAssigned: true, now: '2026-01-15T00:00:00.000Z' }),
    ).toBe(true);
  });

  it('rejects starting a draft quiz even if the window is open', () => {
    expect(
      canStartQuiz({
        quiz: { ...baseQuiz, status: 'draft' },
        isClassAssigned: true,
        now: '2026-01-15T00:00:00.000Z',
      }),
    ).toBe(false);
  });

  it("rejects starting when the student's class is not assigned to the quiz", () => {
    expect(
      canStartQuiz({ quiz: baseQuiz, isClassAssigned: false, now: '2026-01-15T00:00:00.000Z' }),
    ).toBe(false);
  });

  it('rejects starting before opens_at', () => {
    expect(
      canStartQuiz({ quiz: baseQuiz, isClassAssigned: true, now: '2026-01-09T23:59:59.000Z' }),
    ).toBe(false);
  });

  it('rejects starting at or after closes_at', () => {
    expect(
      canStartQuiz({ quiz: baseQuiz, isClassAssigned: true, now: '2026-01-20T00:00:00.000Z' }),
    ).toBe(false);
  });

  it('allows starting at the exact opens_at instant (inclusive lower bound)', () => {
    expect(
      canStartQuiz({ quiz: baseQuiz, isClassAssigned: true, now: '2026-01-10T00:00:00.000Z' }),
    ).toBe(true);
  });
});

describe('categorizeQuizForStudent', () => {
  it('is upcoming before opens_at', () => {
    expect(
      categorizeQuizForStudent({ quiz: baseQuiz, attempt: null, now: '2026-01-01T00:00:00.000Z' }),
    ).toBe('upcoming');
  });

  it('is available within the window with no attempt yet', () => {
    expect(
      categorizeQuizForStudent({ quiz: baseQuiz, attempt: null, now: '2026-01-15T00:00:00.000Z' }),
    ).toBe('available');
  });

  it('is available within the window while the attempt is still in progress', () => {
    expect(
      categorizeQuizForStudent({
        quiz: baseQuiz,
        attempt: { status: 'in_progress' },
        now: '2026-01-15T00:00:00.000Z',
      }),
    ).toBe('available');
  });

  it('is completed once the attempt has been submitted, even before closes_at', () => {
    expect(
      categorizeQuizForStudent({
        quiz: baseQuiz,
        attempt: { status: 'submitted' },
        now: '2026-01-15T00:00:00.000Z',
      }),
    ).toBe('completed');
  });

  it('is completed once closes_at has passed, even with no attempt at all', () => {
    expect(
      categorizeQuizForStudent({ quiz: baseQuiz, attempt: null, now: '2026-01-21T00:00:00.000Z' }),
    ).toBe('completed');
  });
});

describe('isReviewUnlocked', () => {
  it('is locked before closes_at', () => {
    expect(isReviewUnlocked({ quiz: baseQuiz, now: '2026-01-15T00:00:00.000Z' })).toBe(false);
  });

  it('unlocks at and after closes_at', () => {
    expect(isReviewUnlocked({ quiz: baseQuiz, now: '2026-01-20T00:00:00.000Z' })).toBe(true);
  });
});

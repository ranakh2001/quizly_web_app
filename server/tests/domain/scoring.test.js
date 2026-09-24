import { describe, it, expect } from 'vitest';
import { scoreAttempt } from '../../src/domain/scoring.js';

const questions = [
  { id: 1, points: 4 },
  { id: 2, points: 2 },
  { id: 3, points: 4 },
];

describe('scoreAttempt', () => {
  it('awards full points for a correct answer', () => {
    const result = scoreAttempt({
      questions: [{ id: 1, points: 4 }],
      answers: [{ questionId: 1, isCorrect: true }],
      negativeMarking: false,
    });

    expect(result.score).toBe(4);
    expect(result.maxScore).toBe(4);
  });

  it('awards zero for a wrong answer when negative marking is off', () => {
    const result = scoreAttempt({
      questions: [{ id: 1, points: 4 }],
      answers: [{ questionId: 1, isCorrect: false }],
      negativeMarking: false,
    });

    expect(result.score).toBe(0);
  });

  it('subtracts points times the penalty ratio for a wrong answer when negative marking is on', () => {
    const result = scoreAttempt({
      questions: [
        { id: 1, points: 4 },
        { id: 2, points: 4 },
      ],
      answers: [
        { questionId: 1, isCorrect: true },
        { questionId: 2, isCorrect: false },
      ],
      negativeMarking: true,
      penaltyRatio: 0.25,
    });

    // +4 for the correct answer, -1 (4 * 0.25) for the wrong one.
    expect(result.score).toBe(3);
  });

  it('always scores an unanswered question as zero, even with negative marking on', () => {
    const result = scoreAttempt({
      questions: [{ id: 1, points: 4 }],
      answers: [],
      negativeMarking: true,
      penaltyRatio: 0.5,
    });

    expect(result.score).toBe(0);
    expect(result.breakdown[0].outcome).toBe('unanswered');
  });

  it('floors the total score at 0 when penalties outweigh correct answers', () => {
    const result = scoreAttempt({
      questions: [
        { id: 1, points: 2 },
        { id: 2, points: 10 },
      ],
      answers: [
        { questionId: 1, isCorrect: true },
        { questionId: 2, isCorrect: false },
      ],
      negativeMarking: true,
      penaltyRatio: 1,
    });

    // +2 for the correct answer, -10 for the wrong one under 100% penalty: floored at 0, not -8.
    expect(result.score).toBe(0);
  });

  it('sets maxScore to the sum of all question points regardless of answers', () => {
    const result = scoreAttempt({
      questions,
      answers: [{ questionId: 1, isCorrect: true }],
      negativeMarking: false,
    });

    expect(result.maxScore).toBe(10);
  });

  it('uses the default penalty ratio when none is provided', () => {
    const result = scoreAttempt({
      questions: [{ id: 1, points: 8 }],
      answers: [{ questionId: 1, isCorrect: false }],
      negativeMarking: true,
    });

    // default penalty ratio is 0.25, so 8 * 0.25 = 2, floored at 0.
    expect(result.score).toBe(0);
  });
});

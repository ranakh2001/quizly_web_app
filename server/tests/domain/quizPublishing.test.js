import { describe, it, expect } from 'vitest';
import { getPublishErrors } from '../../src/domain/quizPublishing.js';

const validQuestion = {
  points: 2,
  options: [
    { text: 'a', isCorrect: true },
    { text: 'b', isCorrect: false },
    { text: 'c', isCorrect: false },
    { text: 'd', isCorrect: false },
  ],
};

const validQuiz = { opensAt: '2026-01-01T00:00:00.000Z', closesAt: '2026-01-02T00:00:00.000Z' };

describe('getPublishErrors', () => {
  it('returns no errors for a fully valid quiz', () => {
    const errors = getPublishErrors({ quiz: validQuiz, questions: [validQuestion], classIds: [1] });
    expect(errors).toEqual([]);
  });

  it('requires opens_at to be before closes_at', () => {
    const errors = getPublishErrors({
      quiz: { opensAt: '2026-01-02T00:00:00.000Z', closesAt: '2026-01-01T00:00:00.000Z' },
      questions: [validQuestion],
      classIds: [1],
    });
    expect(errors).toContain('Opens time must be before closes time.');
  });

  it('requires at least one assigned class', () => {
    const errors = getPublishErrors({ quiz: validQuiz, questions: [validQuestion], classIds: [] });
    expect(errors).toContain('At least one class must be assigned.');
  });

  it('requires at least one question', () => {
    const errors = getPublishErrors({ quiz: validQuiz, questions: [], classIds: [1] });
    expect(errors).toContain('The quiz must have at least one question.');
  });

  it('rejects a question with zero or negative points', () => {
    const errors = getPublishErrors({
      quiz: validQuiz,
      questions: [{ ...validQuestion, points: 0 }],
      classIds: [1],
    });
    expect(errors).toContain('Question 1: points must be greater than 0.');
  });

  it('rejects a question without exactly 4 options', () => {
    const errors = getPublishErrors({
      quiz: validQuiz,
      questions: [{ ...validQuestion, options: validQuestion.options.slice(0, 3) }],
      classIds: [1],
    });
    expect(errors).toContain('Question 1: must have exactly 4 options.');
  });

  it('rejects a question with zero correct options', () => {
    const errors = getPublishErrors({
      quiz: validQuiz,
      questions: [
        {
          ...validQuestion,
          options: validQuestion.options.map((o) => ({ ...o, isCorrect: false })),
        },
      ],
      classIds: [1],
    });
    expect(errors).toContain('Question 1: must have exactly one correct option.');
  });

  it('rejects a question with more than one correct option', () => {
    const errors = getPublishErrors({
      quiz: validQuiz,
      questions: [
        {
          ...validQuestion,
          options: validQuestion.options.map((o) => ({ ...o, isCorrect: true })),
        },
      ],
      classIds: [1],
    });
    expect(errors).toContain('Question 1: must have exactly one correct option.');
  });

  it('reports every invalid question by its position, not just the first', () => {
    const badQuestion = { ...validQuestion, points: 0 };
    const errors = getPublishErrors({
      quiz: validQuiz,
      questions: [validQuestion, badQuestion],
      classIds: [1],
    });
    expect(errors).toContain('Question 2: points must be greater than 0.');
    expect(errors).not.toContain('Question 1: points must be greater than 0.');
  });
});

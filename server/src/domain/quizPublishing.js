import { OPTIONS_PER_QUESTION } from '../constants.js';

// Rule 11: publish validates the quiz is actually complete and returns a list of
// human-readable errors instead of a single failure, so the editor can show a checklist.
// Pure function, no DB/Express - questions/classIds are already-loaded plain data.
export function getPublishErrors({ quiz, questions, classIds }) {
  const errors = [];

  if (new Date(quiz.opensAt).getTime() >= new Date(quiz.closesAt).getTime()) {
    errors.push('Opens time must be before closes time.');
  }
  if (classIds.length === 0) {
    errors.push('At least one class must be assigned.');
  }
  if (questions.length === 0) {
    errors.push('The quiz must have at least one question.');
  }

  questions.forEach((question, index) => {
    const position = index + 1;
    if (question.points <= 0) {
      errors.push(`Question ${position}: points must be greater than 0.`);
    }
    if (question.options.length !== OPTIONS_PER_QUESTION) {
      errors.push(`Question ${position}: must have exactly ${OPTIONS_PER_QUESTION} options.`);
    }
    const correctCount = question.options.filter((option) => option.isCorrect).length;
    if (correctCount !== 1) {
      errors.push(`Question ${position}: must have exactly one correct option.`);
    }
  });

  return errors;
}

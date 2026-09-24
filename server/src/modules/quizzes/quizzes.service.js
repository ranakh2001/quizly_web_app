import { notFound } from '../../shared/errors.js';
import { categorizeQuizForStudent } from '../../domain/quizAvailability.js';
import * as quizzesRepository from './quizzes.repository.js';
import * as attemptsRepository from '../attempts/attempts.repository.js';

// The student Home screen: every published quiz assigned to the student's class, tagged
// with which of the three tabs (upcoming/available/completed) it belongs in right now.
export function listForStudent(db, student) {
  const quizzes = quizzesRepository.listPublishedForClass(db, student.classId);
  const now = new Date().toISOString();

  return quizzes.map((quiz) => {
    const attempt = attemptsRepository.findByQuizAndStudent(db, quiz.id, student.id);
    return {
      id: quiz.id,
      title: quiz.title,
      language: quiz.language,
      timeLimitMinutes: quiz.timeLimitMinutes,
      opensAt: quiz.opensAt,
      closesAt: quiz.closesAt,
      negativeMarking: quiz.negativeMarking,
      category: categorizeQuizForStudent({ quiz, attempt, now }),
      attemptStatus: attempt?.status ?? 'not_started',
      score: attempt?.score ?? null,
      maxScore: attempt?.maxScore ?? null,
    };
  });
}

// The "Quiz intro" screen: rules, negative-marking explanation, one-attempt warning.
// A quiz not assigned to the student's class (or still a draft) is treated as not found,
// not forbidden, so students can't probe for the existence of quizzes outside their class.
export function getQuizDetailForStudent(db, student, quizId) {
  const quiz = quizzesRepository.findById(db, quizId);
  if (
    !quiz ||
    quiz.status !== 'published' ||
    !quizzesRepository.isClassAssigned(db, quizId, student.classId)
  ) {
    throw notFound('Quiz not found');
  }

  const questions = quizzesRepository.findQuestionsWithOptions(db, quizId);
  const attempt = attemptsRepository.findByQuizAndStudent(db, quizId, student.id);

  return {
    id: quiz.id,
    title: quiz.title,
    language: quiz.language,
    timeLimitMinutes: quiz.timeLimitMinutes,
    opensAt: quiz.opensAt,
    closesAt: quiz.closesAt,
    negativeMarking: quiz.negativeMarking,
    penaltyRatio: quiz.penaltyRatio,
    questionCount: questions.length,
    totalPoints: questions.reduce((sum, question) => sum + question.points, 0),
    hasAttempted: Boolean(attempt),
  };
}

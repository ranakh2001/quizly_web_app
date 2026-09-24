import { GRACE_SECONDS, ATTEMPT_STATUS } from '../../constants.js';
import { notFound, forbidden, conflict, badRequest } from '../../shared/errors.js';
import { computeDeadline } from '../../domain/deadline.js';
import { scoreAttempt } from '../../domain/scoring.js';
import { canStartQuiz, isReviewUnlocked } from '../../domain/quizAvailability.js';
import * as attemptsRepository from './attempts.repository.js';
import * as quizzesRepository from '../quizzes/quizzes.repository.js';

// Rule 2: starting is idempotent - refresh / second tab / second device all return the
// same attempt. Rule 3 (published, class assigned, opens_at <= now < closes_at) only gates
// creating a brand new attempt, never resuming an existing one.
export function startAttempt(db, student, quizId) {
  const quiz = quizzesRepository.findById(db, quizId);
  const existingAttempt = attemptsRepository.findByQuizAndStudent(db, quizId, student.id);

  if (existingAttempt) {
    const questions = quizzesRepository.findQuestionsWithOptions(db, quizId);
    const current = finalizeIfOverdue(db, existingAttempt, quiz, questions);
    return buildAttemptView(db, current, quiz, questions);
  }

  const isAssigned = quizzesRepository.isClassAssigned(db, quizId, student.classId);
  if (!quiz || quiz.status !== 'published' || !isAssigned) {
    // A draft quiz or one outside the student's class is treated as not found, not
    // forbidden, so students can't probe for quizzes outside their own class.
    throw notFound('Quiz not found');
  }

  const now = new Date().toISOString();
  if (!canStartQuiz({ quiz, isClassAssigned: isAssigned, now })) {
    throw conflict('This quiz is not open right now');
  }

  const deadline = computeDeadline(now, quiz.timeLimitMinutes, quiz.closesAt);
  const attempt = attemptsRepository.insert(db, {
    quizId,
    studentId: student.id,
    startedAt: now,
    deadline,
  });

  const questions = quizzesRepository.findQuestionsWithOptions(db, quizId);
  return buildAttemptView(db, attempt, quiz, questions);
}

// Rule 7: auto-submit is finalised and scored on the next read, with no cron. This is the
// single place that check runs, so every route (get, save answer, submit) sees it applied.
export function getAttemptForStudent(db, student, attemptId) {
  const { attempt, quiz, questions } = loadOwnedAttempt(db, student, attemptId);
  const current = finalizeIfOverdue(db, attempt, quiz, questions);
  return buildAttemptView(db, current, quiz, questions);
}

// Rule 6: answers are accepted until deadline + grace, rejected after with 409. Rule 8:
// answers are read-only once the attempt is submitted or auto-submitted.
export function saveAnswer(db, student, attemptId, questionId, optionId) {
  const { attempt, quiz, questions } = loadOwnedAttempt(db, student, attemptId);
  const current = finalizeIfOverdue(db, attempt, quiz, questions);

  if (current.status !== ATTEMPT_STATUS.IN_PROGRESS) {
    throw conflict('This attempt is no longer accepting answers');
  }

  const question = questions.find((candidate) => candidate.id === questionId);
  if (!question) throw notFound('Question not found');

  const option = question.options.find((candidate) => candidate.id === optionId);
  if (!option) throw badRequest('Option does not belong to this question');

  attemptsRepository.upsertAnswer(db, { attemptId, questionId, optionId });
  return { saved: true };
}

// Rule 8: submit is idempotent - a double click (or a submit that arrives after grace has
// already expired) always converges on the same finalised, scored result.
export function submitAttempt(db, student, attemptId) {
  const { attempt, quiz, questions } = loadOwnedAttempt(db, student, attemptId);
  const current = finalizeIfOverdue(db, attempt, quiz, questions);

  if (current.status !== ATTEMPT_STATUS.IN_PROGRESS) {
    return buildAttemptView(db, current, quiz, questions);
  }

  const finalized = finalizeAttempt(db, current, quiz, questions, {
    status: ATTEMPT_STATUS.SUBMITTED,
    submittedAt: new Date().toISOString(),
  });
  return buildAttemptView(db, finalized, quiz, questions);
}

function loadOwnedAttempt(db, student, attemptId) {
  const attempt = attemptsRepository.findById(db, attemptId);
  if (!attempt) throw notFound('Attempt not found');
  if (attempt.studentId !== student.id) throw forbidden('This attempt does not belong to you');

  const quiz = quizzesRepository.findById(db, attempt.quizId);
  const questions = quizzesRepository.findQuestionsWithOptions(db, attempt.quizId);
  return { attempt, quiz, questions };
}

// Exported so results.service.js can show up-to-date status/score for an in_progress
// attempt that has gone overdue, without a second copy of the auto-submit rule.
export function finalizeIfOverdue(db, attempt, quiz, questions) {
  if (attempt.status !== ATTEMPT_STATUS.IN_PROGRESS) return attempt;

  const graceDeadlineMs = new Date(attempt.deadline).getTime() + GRACE_SECONDS * 1000;
  if (Date.now() <= graceDeadlineMs) return attempt;

  // Auto-submitted_at is the deadline itself (when the attempt period ended), not whenever
  // the system happened to notice - a manual late submit converges on the same value.
  return finalizeAttempt(db, attempt, quiz, questions, {
    status: ATTEMPT_STATUS.AUTO_SUBMITTED,
    submittedAt: attempt.deadline,
  });
}

function finalizeAttempt(db, attempt, quiz, questions, { status, submittedAt }) {
  const answers = attemptsRepository.findAnswersByAttempt(db, attempt.id);
  const answersWithCorrectness = answers.map((answer) => {
    const question = questions.find((candidate) => candidate.id === answer.questionId);
    const option = question?.options.find((candidate) => candidate.id === answer.optionId);
    return { questionId: answer.questionId, isCorrect: Boolean(option?.isCorrect) };
  });

  const { score, maxScore } = scoreAttempt({
    questions: questions.map((question) => ({ id: question.id, points: question.points })),
    answers: answersWithCorrectness,
    negativeMarking: quiz.negativeMarking,
    penaltyRatio: quiz.penaltyRatio,
  });

  return attemptsRepository.finalize(db, attempt.id, { status, submittedAt, score, maxScore });
}

// Rule 9: correct answers are never sent while the quiz is open; the score is visible as
// soon as the attempt is finalised, but per-question correctness waits for closes_at.
function buildAttemptView(db, attempt, quiz, questions) {
  const now = new Date().toISOString();
  const reviewUnlocked = isReviewUnlocked({ quiz, now });
  const scoreVisible = attempt.status !== ATTEMPT_STATUS.IN_PROGRESS;

  const answersByQuestionId = new Map(
    attemptsRepository
      .findAnswersByAttempt(db, attempt.id)
      .map((answer) => [answer.questionId, answer.optionId]),
  );

  return {
    attempt: {
      id: attempt.id,
      quizId: attempt.quizId,
      status: attempt.status,
      startedAt: attempt.startedAt,
      deadline: attempt.deadline,
      submittedAt: attempt.submittedAt,
      score: scoreVisible ? attempt.score : null,
      maxScore: scoreVisible ? attempt.maxScore : null,
    },
    quiz: {
      id: quiz.id,
      title: quiz.title,
      language: quiz.language,
      timeLimitMinutes: quiz.timeLimitMinutes,
      closesAt: quiz.closesAt,
      negativeMarking: quiz.negativeMarking,
      penaltyRatio: quiz.penaltyRatio,
    },
    questions: questions.map((question) => ({
      id: question.id,
      text: question.text,
      points: question.points,
      options: question.options.map((option) => ({
        id: option.id,
        text: option.text,
        ...(reviewUnlocked ? { isCorrect: option.isCorrect } : {}),
      })),
    })),
    answers: questions.map((question) => ({
      questionId: question.id,
      optionId: answersByQuestionId.get(question.id) ?? null,
    })),
    reviewUnlocked,
    serverNow: now,
  };
}

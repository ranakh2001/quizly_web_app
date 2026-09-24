import { QUIZ_STATUS } from '../../constants.js';
import { notFound, forbidden, conflict, validation, badRequest } from '../../shared/errors.js';
import { categorizeQuizForStudent } from '../../domain/quizAvailability.js';
import { getPublishErrors } from '../../domain/quizPublishing.js';
import * as quizzesRepository from './quizzes.repository.js';
import * as attemptsRepository from '../attempts/attempts.repository.js';

// ---- Student-facing (Phase 3) ----------------------------------------------------------

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
      attemptId: attempt?.id ?? null,
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
    quiz.status !== QUIZ_STATUS.PUBLISHED ||
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
    attemptId: attempt?.id ?? null,
    attemptStatus: attempt?.status ?? null,
  };
}

// ---- Teacher-facing (Phase 4) ----------------------------------------------------------

export function listForTeacher(db, teacher) {
  return quizzesRepository.listForTeacher(db, teacher.id).map((quiz) => ({
    id: quiz.id,
    title: quiz.title,
    language: quiz.language,
    status: quiz.status,
    opensAt: quiz.opensAt,
    closesAt: quiz.closesAt,
    timeLimitMinutes: quiz.timeLimitMinutes,
    negativeMarking: quiz.negativeMarking,
    questionCount: quizzesRepository.countQuestions(db, quiz.id),
    locked: attemptsRepository.existsForQuiz(db, quiz.id),
  }));
}

export function listForAdmin(db) {
  return quizzesRepository.listAllWithTeacherName(db).map((quiz) => ({
    id: quiz.id,
    title: quiz.title,
    language: quiz.language,
    status: quiz.status,
    opensAt: quiz.opensAt,
    closesAt: quiz.closesAt,
    teacherName: quiz.teacherName,
  }));
}

export function createQuiz(db, teacher, input) {
  const classIds = input.classIds ?? [];
  assertClassesExist(db, classIds);

  const quiz = quizzesRepository.insert(db, {
    teacherId: teacher.id,
    title: input.title,
    language: input.language,
    timeLimitMinutes: input.timeLimitMinutes,
    opensAt: input.opensAt,
    closesAt: input.closesAt,
    negativeMarking: input.negativeMarking,
    penaltyRatio: input.penaltyRatio,
  });
  quizzesRepository.replaceClasses(db, quiz.id, classIds);

  return buildTeacherQuizView(db, quiz);
}

// Rule 11: once the first attempt has started, only title and closes_at (extended, never
// shortened) may still change; every other field is rejected outright.
export function updateQuiz(db, teacher, quizId, input) {
  const quiz = loadOwnedQuizForTeacher(db, teacher, quizId);
  const locked = attemptsRepository.existsForQuiz(db, quizId);

  if (locked) {
    const disallowedFields = Object.keys(input).filter(
      (key) => key !== 'title' && key !== 'closesAt',
    );
    if (disallowedFields.length > 0) {
      throw conflict(
        'This quiz is locked because students have already started it. Only title and closesAt (to extend the deadline) can still change.',
        disallowedFields,
      );
    }
    if (input.closesAt && new Date(input.closesAt).getTime() < new Date(quiz.closesAt).getTime()) {
      throw validation('closesAt can only be extended, not shortened, once the quiz is locked.');
    }
  }

  if (input.classIds) {
    assertClassesExist(db, input.classIds);
  }

  const mergedOpensAt = input.opensAt ?? quiz.opensAt;
  const mergedClosesAt = input.closesAt ?? quiz.closesAt;
  if (new Date(mergedOpensAt).getTime() >= new Date(mergedClosesAt).getTime()) {
    throw validation('opensAt must be before closesAt.');
  }

  quizzesRepository.update(db, quizId, input);
  if (input.classIds) {
    quizzesRepository.replaceClasses(db, quizId, input.classIds);
  }

  return buildTeacherQuizView(db, quizzesRepository.findById(db, quizId));
}

export function publishQuiz(db, teacher, quizId) {
  const quiz = loadOwnedQuizForTeacher(db, teacher, quizId);
  if (quiz.status === QUIZ_STATUS.PUBLISHED) {
    return buildTeacherQuizView(db, quiz);
  }

  const questions = quizzesRepository.findQuestionsWithOptions(db, quizId);
  const classIds = quizzesRepository.listClassIdsForQuiz(db, quizId);
  const errors = getPublishErrors({ quiz, questions, classIds });
  if (errors.length > 0) {
    throw validation('Quiz cannot be published yet', errors);
  }

  const published = quizzesRepository.setStatus(db, quizId, QUIZ_STATUS.PUBLISHED);
  return buildTeacherQuizView(db, published);
}

export function addQuestion(db, teacher, quizId, input) {
  loadOwnedQuizForTeacher(db, teacher, quizId);
  assertNotLocked(db, quizId);

  const orderIndex = quizzesRepository.nextQuestionOrderIndex(db, quizId);
  const questionId = quizzesRepository.insertQuestion(db, quizId, {
    text: input.text,
    points: input.points,
    orderIndex,
  });
  quizzesRepository.insertOptions(db, questionId, input.options);
  return getQuestionWithOptions(db, questionId);
}

export function updateQuestion(db, teacher, quizId, questionId, input) {
  loadOwnedQuizForTeacher(db, teacher, quizId);
  assertNotLocked(db, quizId);
  assertQuestionBelongsToQuiz(db, questionId, quizId);

  quizzesRepository.updateQuestion(db, questionId, { text: input.text, points: input.points });
  quizzesRepository.replaceOptions(db, questionId, input.options);
  return getQuestionWithOptions(db, questionId);
}

export function deleteQuestion(db, teacher, quizId, questionId) {
  loadOwnedQuizForTeacher(db, teacher, quizId);
  assertNotLocked(db, quizId);
  assertQuestionBelongsToQuiz(db, questionId, quizId);

  quizzesRepository.deleteQuestion(db, questionId);
}

export function getQuizDetailForTeacher(db, teacher, quizId) {
  const quiz = loadOwnedQuizForTeacher(db, teacher, quizId);
  return buildTeacherQuizView(db, quiz);
}

// ---- Shared by teacher + admin (results, Phase 4/5) ------------------------------------

// Admin may view any quiz; a teacher only their own. Exported for results.service.js.
export function loadQuizForTeacherOrAdmin(db, actor, quizId) {
  const quiz = quizzesRepository.findById(db, quizId);
  if (!quiz) throw notFound('Quiz not found');
  if (actor.role === 'teacher' && quiz.teacherId !== actor.id) {
    throw forbidden('This quiz belongs to another teacher');
  }
  return quiz;
}

export function getQuizDetailForTeacherOrAdmin(db, actor, quizId) {
  const quiz = loadQuizForTeacherOrAdmin(db, actor, quizId);
  return buildTeacherQuizView(db, quiz);
}

// ---- helpers -----------------------------------------------------------------------------

function loadOwnedQuizForTeacher(db, teacher, quizId) {
  const quiz = quizzesRepository.findById(db, quizId);
  if (!quiz) throw notFound('Quiz not found');
  if (quiz.teacherId !== teacher.id) throw forbidden('This quiz belongs to another teacher');
  return quiz;
}

function assertNotLocked(db, quizId) {
  if (attemptsRepository.existsForQuiz(db, quizId)) {
    throw conflict('This quiz is locked because students have already started it');
  }
}

function assertQuestionBelongsToQuiz(db, questionId, quizId) {
  const question = quizzesRepository.findQuestionById(db, questionId);
  if (!question || question.quizId !== quizId) throw notFound('Question not found');
}

function assertClassesExist(db, classIds) {
  if (classIds.length === 0) return;
  const found = quizzesRepository.findClassesByIds(db, classIds);
  if (found.length !== new Set(classIds).size) {
    throw badRequest('One or more classIds do not exist');
  }
}

function getQuestionWithOptions(db, questionId) {
  const question = quizzesRepository.findQuestionById(db, questionId);
  return {
    id: question.id,
    text: question.text,
    points: question.points,
    options: quizzesRepository.findOptionsForQuestion(db, questionId),
  };
}

function buildTeacherQuizView(db, quiz) {
  return {
    id: quiz.id,
    teacherId: quiz.teacherId,
    title: quiz.title,
    language: quiz.language,
    timeLimitMinutes: quiz.timeLimitMinutes,
    opensAt: quiz.opensAt,
    closesAt: quiz.closesAt,
    negativeMarking: quiz.negativeMarking,
    penaltyRatio: quiz.penaltyRatio,
    status: quiz.status,
    classIds: quizzesRepository.listClassIdsForQuiz(db, quiz.id),
    locked: attemptsRepository.existsForQuiz(db, quiz.id),
    questions: quizzesRepository.findQuestionsWithOptions(db, quiz.id),
  };
}

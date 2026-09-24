import { ATTEMPT_STATUS } from '../../constants.js';
import { badRequest } from '../../shared/errors.js';
import * as quizzesService from '../quizzes/quizzes.service.js';
import * as quizzesRepository from '../quizzes/quizzes.repository.js';
import * as attemptsRepository from '../attempts/attempts.repository.js';
import { finalizeIfOverdue } from '../attempts/attempts.service.js';
import * as resultsRepository from './results.repository.js';

const FINALIZED_STATUSES = new Set([ATTEMPT_STATUS.SUBMITTED, ATTEMPT_STATUS.AUTO_SUBMITTED]);

// Teacher (own quizzes) or admin (any quiz): per-student status/score/time-taken, filterable
// by class, plus the per-question correct rate across everyone who has finished.
export function getResultsForQuiz(db, actor, quizId, { classId } = {}) {
  const quiz = quizzesService.loadQuizForTeacherOrAdmin(db, actor, quizId);
  const assignedClassIds = quizzesRepository.listClassIdsForQuiz(db, quizId);

  if (classId && !assignedClassIds.includes(classId)) {
    throw badRequest('This class is not assigned to the quiz');
  }
  const classIdsToQuery = classId ? [classId] : assignedClassIds;

  const questions = quizzesRepository.findQuestionsWithOptions(db, quizId);
  const rows = resultsRepository.listStudentsWithAttempts(db, quizId, classIdsToQuery);
  const currentRows = rows.map((row) => refreshIfOverdue(db, row, quiz, questions));

  return {
    quiz: {
      id: quiz.id,
      title: quiz.title,
      negativeMarking: quiz.negativeMarking,
      penaltyRatio: quiz.penaltyRatio,
    },
    students: currentRows.map(toStudentResult),
    perQuestionCorrectRate: computeCorrectRates(db, currentRows, questions),
  };
}

export function buildResultsCsv(results) {
  const header = [
    'Student Name',
    'Student Code',
    'Class',
    'Status',
    'Score',
    'Max Score',
    'Time Taken (s)',
  ];
  const rows = results.students.map((student) => [
    student.studentName,
    student.studentCode,
    student.className,
    student.status,
    student.score ?? '',
    student.maxScore ?? '',
    student.timeTakenSeconds ?? '',
  ]);

  const csvBody = [header, ...rows].map((line) => line.map(csvEscape).join(',')).join('\r\n');
  // Leading BOM so Excel opens the UTF-8 file (and any Arabic names in it) correctly.
  const bom = String.fromCharCode(0xfeff);
  return bom + csvBody;
}

// A row whose attempt is still in_progress might actually be overdue (rule 7: finalised and
// scored "on the next read") - results is a read, so it must reflect that too.
function refreshIfOverdue(db, row, quiz, questions) {
  if (row.status !== ATTEMPT_STATUS.IN_PROGRESS) return row;

  const attempt = attemptsRepository.findById(db, row.attemptId);
  const current = finalizeIfOverdue(db, attempt, quiz, questions);
  return {
    ...row,
    status: current.status,
    score: current.score,
    maxScore: current.maxScore,
    submittedAt: current.submittedAt,
  };
}

function toStudentResult(row) {
  const timeTakenSeconds =
    row.startedAt && row.submittedAt
      ? Math.round((new Date(row.submittedAt).getTime() - new Date(row.startedAt).getTime()) / 1000)
      : null;

  return {
    studentId: row.studentId,
    // Needed by the admin Results screen's Reset button (POST /admin/attempts/:attemptId/reset);
    // null for a student who never started, so nothing to reset.
    attemptId: row.attemptId,
    studentName: row.studentName,
    studentCode: row.studentCode,
    className: row.className,
    status: row.status,
    score: row.score,
    maxScore: row.maxScore,
    timeTakenSeconds,
  };
}

function computeCorrectRates(db, rows, questions) {
  const finalizedAttemptIds = rows
    .filter((row) => FINALIZED_STATUSES.has(row.status))
    .map((row) => row.attemptId);
  const totalFinalized = finalizedAttemptIds.length;

  return questions.map((question) => {
    if (totalFinalized === 0) {
      return { questionId: question.id, text: question.text, correctRate: null };
    }
    const correctOption = question.options.find((option) => option.isCorrect);
    const correctCount = resultsRepository.countCorrectAnswers(
      db,
      finalizedAttemptIds,
      question.id,
      correctOption?.id,
    );
    return {
      questionId: question.id,
      text: question.text,
      correctRate: Math.round((correctCount / totalFinalized) * 1000) / 10,
    };
  });
}

function csvEscape(value) {
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

import { notFound, badRequest } from '../../shared/errors.js';
import * as adminRepository from './admin.repository.js';
import * as attemptsRepository from '../attempts/attempts.repository.js';
import { getQuizDisplayStatus } from '../../domain/quizAvailability.js';

const RECENT_QUIZZES_LIMIT = 5;

export function getOverview(db) {
  const now = new Date().toISOString();

  return {
    totals: {
      students: adminRepository.countUsersByRole(db, 'student'),
      teachers: adminRepository.countUsersByRole(db, 'teacher'),
      quizzes: adminRepository.countQuizzes(db),
      classes: adminRepository.countClasses(db),
    },
    averageScoreByClass: adminRepository.averageScoreByClass(db).map((row) => ({
      classId: row.class_id,
      className: row.class_name,
      averagePercent:
        row.average_percent === null ? null : Math.round(row.average_percent * 10) / 10,
      attemptsCount: row.attempts_count,
    })),
    recentQuizzes: adminRepository.recentQuizzes(db, RECENT_QUIZZES_LIMIT).map((row) => ({
      id: row.id,
      title: row.title,
      status: getQuizDisplayStatus({ status: row.status, closesAt: row.closes_at, now }),
      teacherName: row.teacher_name,
      classNames: row.class_names ? row.class_names.split(', ') : [],
      submittedCount: row.submitted_count,
      createdAt: row.created_at,
    })),
  };
}

// Rule 2: only admin can reset an attempt; a reason is required and written to audit_log.
// Resetting deletes the attempt (and its answers) so the student's next start creates a
// fresh one - it does not un-delete or restore anything, it simply clears the one-attempt lock.
export function resetAttempt(db, admin, attemptId, reason) {
  if (!reason?.trim()) {
    throw badRequest('A reason is required to reset an attempt');
  }
  const attempt = attemptsRepository.findById(db, attemptId);
  if (!attempt) throw notFound('Attempt not found');

  attemptsRepository.deleteAttempt(db, attemptId);
  adminRepository.insertAuditLog(db, {
    actorId: admin.id,
    action: 'attempt_reset',
    targetType: 'attempt',
    targetId: attemptId,
    reason: reason.trim(),
  });

  return { reset: true };
}

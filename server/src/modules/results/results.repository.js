// SQL only, always parameterised - no business logic here (see CLAUDE.md).

// Every student in the given classes, left-joined with their attempt (if any) for this
// quiz, so a student who never started still shows up as "not_started".
export function listStudentsWithAttempts(db, quizId, classIds) {
  if (classIds.length === 0) return [];
  const placeholders = classIds.map(() => '?').join(',');
  const rows = db
    .prepare(
      `SELECT u.id AS student_id, u.name AS student_name, u.student_code,
              c.id AS class_id, c.name AS class_name,
              a.id AS attempt_id, a.status, a.score, a.max_score, a.started_at, a.submitted_at
       FROM users u
       JOIN classes c ON c.id = u.class_id
       LEFT JOIN attempts a ON a.student_id = u.id AND a.quiz_id = ?
       WHERE u.role = 'student' AND u.class_id IN (${placeholders})
       ORDER BY c.name, u.name`,
    )
    .all(quizId, ...classIds);

  return rows.map((row) => ({
    studentId: row.student_id,
    studentName: row.student_name,
    studentCode: row.student_code,
    classId: row.class_id,
    className: row.class_name,
    attemptId: row.attempt_id,
    status: row.status ?? 'not_started',
    score: row.score,
    maxScore: row.max_score,
    startedAt: row.started_at,
    submittedAt: row.submitted_at,
  }));
}

export function countCorrectAnswers(db, attemptIds, questionId, correctOptionId) {
  if (attemptIds.length === 0 || !correctOptionId) return 0;
  const placeholders = attemptIds.map(() => '?').join(',');
  const row = db
    .prepare(
      `SELECT COUNT(*) AS count FROM answers
       WHERE question_id = ? AND option_id = ? AND attempt_id IN (${placeholders})`,
    )
    .get(questionId, correctOptionId, ...attemptIds);
  return row.count;
}

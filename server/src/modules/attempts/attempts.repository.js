// SQL only, always parameterised - no business logic here (see CLAUDE.md).

export function findByQuizAndStudent(db, quizId, studentId) {
  return mapAttempt(
    db
      .prepare('SELECT * FROM attempts WHERE quiz_id = ? AND student_id = ?')
      .get(quizId, studentId),
  );
}

export function findById(db, attemptId) {
  return mapAttempt(db.prepare('SELECT * FROM attempts WHERE id = ?').get(attemptId));
}

// One row per student per quiz, already-existing attempts are never re-inserted (see
// attempts.service.js#startAttempt) so a plain INSERT is safe - Node/better-sqlite3 run
// synchronously, so there is no window for a second request to race this one.
export function insert(db, { quizId, studentId, startedAt, deadline }) {
  const id = db
    .prepare(
      `INSERT INTO attempts (quiz_id, student_id, started_at, deadline, status)
       VALUES (?, ?, ?, ?, 'in_progress')`,
    )
    .run(quizId, studentId, startedAt, deadline).lastInsertRowid;
  return findById(db, id);
}

export function finalize(db, attemptId, { status, submittedAt, score, maxScore }) {
  db.prepare(
    'UPDATE attempts SET status = ?, submitted_at = ?, score = ?, max_score = ? WHERE id = ?',
  ).run(status, submittedAt, score, maxScore, attemptId);
  return findById(db, attemptId);
}

export function listByStudent(db, studentId) {
  return db.prepare('SELECT * FROM attempts WHERE student_id = ?').all(studentId).map(mapAttempt);
}

export function findAnswersByAttempt(db, attemptId) {
  return db
    .prepare('SELECT question_id, option_id FROM answers WHERE attempt_id = ?')
    .all(attemptId)
    .map((row) => ({ questionId: row.question_id, optionId: row.option_id }));
}

export function upsertAnswer(db, { attemptId, questionId, optionId }) {
  db.prepare(
    `INSERT INTO answers (attempt_id, question_id, option_id)
     VALUES (?, ?, ?)
     ON CONFLICT (attempt_id, question_id) DO UPDATE SET option_id = excluded.option_id, answered_at = datetime('now')`,
  ).run(attemptId, questionId, optionId);
}

function mapAttempt(row) {
  if (!row) return null;
  return {
    id: row.id,
    quizId: row.quiz_id,
    studentId: row.student_id,
    startedAt: row.started_at,
    deadline: row.deadline,
    submittedAt: row.submitted_at,
    status: row.status,
    score: row.score,
    maxScore: row.max_score,
  };
}

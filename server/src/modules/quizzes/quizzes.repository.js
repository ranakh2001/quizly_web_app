// SQL only, always parameterised - no business logic here (see CLAUDE.md).

export function findById(db, quizId) {
  return mapQuiz(db.prepare('SELECT * FROM quizzes WHERE id = ?').get(quizId));
}

export function isClassAssigned(db, quizId, classId) {
  if (!classId) return false;
  const row = db
    .prepare('SELECT 1 FROM quiz_class WHERE quiz_id = ? AND class_id = ?')
    .get(quizId, classId);
  return Boolean(row);
}

// Published quizzes assigned to a class - what a student is allowed to ever see.
export function listPublishedForClass(db, classId) {
  const rows = db
    .prepare(
      `SELECT q.* FROM quizzes q
       JOIN quiz_class qc ON qc.quiz_id = q.id
       WHERE qc.class_id = ? AND q.status = 'published'
       ORDER BY q.opens_at`,
    )
    .all(classId);
  return rows.map(mapQuiz);
}

export function findQuestionsWithOptions(db, quizId) {
  const questionRows = db
    .prepare('SELECT * FROM questions WHERE quiz_id = ? ORDER BY order_index')
    .all(quizId);

  const optionStatement = db.prepare(
    'SELECT * FROM options WHERE question_id = ? ORDER BY order_index',
  );

  return questionRows.map((question) => ({
    id: question.id,
    text: question.text,
    points: question.points,
    options: optionStatement.all(question.id).map(mapOption),
  }));
}

function mapQuiz(row) {
  if (!row) return null;
  return {
    id: row.id,
    teacherId: row.teacher_id,
    title: row.title,
    language: row.language,
    timeLimitMinutes: row.time_limit_minutes,
    opensAt: row.opens_at,
    closesAt: row.closes_at,
    negativeMarking: Boolean(row.negative_marking),
    penaltyRatio: row.penalty_ratio,
    status: row.status,
  };
}

function mapOption(row) {
  return { id: row.id, text: row.text, isCorrect: Boolean(row.is_correct) };
}

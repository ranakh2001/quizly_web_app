// SQL only, always parameterised - no business logic here (see CLAUDE.md).

const UPDATABLE_COLUMNS = {
  title: 'title',
  language: 'language',
  timeLimitMinutes: 'time_limit_minutes',
  opensAt: 'opens_at',
  closesAt: 'closes_at',
  negativeMarking: 'negative_marking',
  penaltyRatio: 'penalty_ratio',
};

export function findById(db, quizId) {
  return mapQuiz(db.prepare('SELECT * FROM quizzes WHERE id = ?').get(quizId));
}

export function insert(
  db,
  {
    teacherId,
    title,
    language,
    timeLimitMinutes,
    opensAt,
    closesAt,
    negativeMarking,
    penaltyRatio,
  },
) {
  const id = db
    .prepare(
      `INSERT INTO quizzes
        (teacher_id, title, language, time_limit_minutes, opens_at, closes_at, negative_marking, penalty_ratio, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'draft')`,
    )
    .run(
      teacherId,
      title,
      language,
      timeLimitMinutes,
      opensAt,
      closesAt,
      negativeMarking ? 1 : 0,
      penaltyRatio,
    ).lastInsertRowid;
  return findById(db, id);
}

// Only known columns are ever interpolated into the SQL (from the fixed map above), so this
// stays safe from injection even though the field list is dynamic.
export function update(db, quizId, fields) {
  const entries = Object.entries(fields).filter(([key]) => key in UPDATABLE_COLUMNS);
  if (entries.length === 0) return findById(db, quizId);

  const setClause = entries.map(([key]) => `${UPDATABLE_COLUMNS[key]} = ?`).join(', ');
  const values = entries.map(([key, value]) =>
    key === 'negativeMarking' ? (value ? 1 : 0) : value,
  );
  db.prepare(`UPDATE quizzes SET ${setClause}, updated_at = datetime('now') WHERE id = ?`).run(
    ...values,
    quizId,
  );
  return findById(db, quizId);
}

export function setStatus(db, quizId, status) {
  db.prepare("UPDATE quizzes SET status = ?, updated_at = datetime('now') WHERE id = ?").run(
    status,
    quizId,
  );
  return findById(db, quizId);
}

export function listForTeacher(db, teacherId) {
  return db
    .prepare('SELECT * FROM quizzes WHERE teacher_id = ? ORDER BY created_at DESC')
    .all(teacherId)
    .map(mapQuiz);
}

export function listAll(db) {
  return db.prepare('SELECT * FROM quizzes ORDER BY created_at DESC').all().map(mapQuiz);
}

export function isClassAssigned(db, quizId, classId) {
  if (!classId) return false;
  const row = db
    .prepare('SELECT 1 FROM quiz_class WHERE quiz_id = ? AND class_id = ?')
    .get(quizId, classId);
  return Boolean(row);
}

export function listClassIdsForQuiz(db, quizId) {
  return db
    .prepare('SELECT class_id FROM quiz_class WHERE quiz_id = ?')
    .all(quizId)
    .map((row) => row.class_id);
}

export function replaceClasses(db, quizId, classIds) {
  db.prepare('DELETE FROM quiz_class WHERE quiz_id = ?').run(quizId);
  const insertLink = db.prepare('INSERT INTO quiz_class (quiz_id, class_id) VALUES (?, ?)');
  for (const classId of classIds) insertLink.run(quizId, classId);
}

export function findClassesByIds(db, classIds) {
  if (classIds.length === 0) return [];
  const placeholders = classIds.map(() => '?').join(',');
  return db.prepare(`SELECT id, name FROM classes WHERE id IN (${placeholders})`).all(...classIds);
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

  return questionRows.map((question) => ({
    id: question.id,
    text: question.text,
    points: question.points,
    options: findOptionsForQuestion(db, question.id),
  }));
}

export function findOptionsForQuestion(db, questionId) {
  return db
    .prepare('SELECT * FROM options WHERE question_id = ? ORDER BY order_index')
    .all(questionId)
    .map(mapOption);
}

export function findQuestionById(db, questionId) {
  const row = db.prepare('SELECT * FROM questions WHERE id = ?').get(questionId);
  if (!row) return null;
  return {
    id: row.id,
    quizId: row.quiz_id,
    text: row.text,
    points: row.points,
    orderIndex: row.order_index,
  };
}

export function countQuestions(db, quizId) {
  return db.prepare('SELECT COUNT(*) AS count FROM questions WHERE quiz_id = ?').get(quizId).count;
}

export function nextQuestionOrderIndex(db, quizId) {
  const row = db
    .prepare('SELECT MAX(order_index) AS maxIndex FROM questions WHERE quiz_id = ?')
    .get(quizId);
  return (row.maxIndex ?? -1) + 1;
}

export function insertQuestion(db, quizId, { text, points, orderIndex }) {
  return db
    .prepare('INSERT INTO questions (quiz_id, text, points, order_index) VALUES (?, ?, ?, ?)')
    .run(quizId, text, points, orderIndex).lastInsertRowid;
}

export function updateQuestion(db, questionId, { text, points }) {
  db.prepare('UPDATE questions SET text = ?, points = ? WHERE id = ?').run(
    text,
    points,
    questionId,
  );
}

export function deleteQuestion(db, questionId) {
  db.prepare('DELETE FROM options WHERE question_id = ?').run(questionId);
  db.prepare('DELETE FROM questions WHERE id = ?').run(questionId);
}

export function insertOptions(db, questionId, options) {
  const insertOption = db.prepare(
    'INSERT INTO options (question_id, text, is_correct, order_index) VALUES (?, ?, ?, ?)',
  );
  options.forEach((option, index) =>
    insertOption.run(questionId, option.text, option.isCorrect ? 1 : 0, index),
  );
}

export function replaceOptions(db, questionId, options) {
  db.prepare('DELETE FROM options WHERE question_id = ?').run(questionId);
  insertOptions(db, questionId, options);
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

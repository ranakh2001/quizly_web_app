import bcrypt from 'bcryptjs';

// Test fixtures that insert directly into the DB, bypassing the API, so each test only
// sets up the state it actually needs.

export function createClass(db, name) {
  return db.prepare('INSERT INTO classes (name) VALUES (?)').run(name).lastInsertRowid;
}

export function createUser(
  db,
  { role, name, username = null, studentCode = null, classId = null, password = 'password123' },
) {
  const passwordHash = bcrypt.hashSync(password, 4); // low cost factor: tests don't need production hardness
  const id = db
    .prepare(
      'INSERT INTO users (role, name, username, student_code, class_id, password_hash) VALUES (?, ?, ?, ?, ?, ?)',
    )
    .run(role, name, username, studentCode, classId, passwordHash).lastInsertRowid;
  return { id, role, name, username, studentCode, classId, password };
}

// Inserts a quiz, links it to the given classes, and inserts each question with its options.
// Returns the quiz id plus each question's id and its options' ids (with which is correct),
// so a test can immediately PUT answers without a separate lookup step.
export function createQuizWithQuestions(
  db,
  {
    teacherId,
    title = 'Test Quiz',
    language = 'en',
    timeLimitMinutes = 20,
    opensAt,
    closesAt,
    negativeMarking = false,
    penaltyRatio = 0.25,
    status = 'published',
    classIds = [],
    questions = [defaultQuestion()],
  },
) {
  const quizId = db
    .prepare(
      `INSERT INTO quizzes
        (teacher_id, title, language, time_limit_minutes, opens_at, closes_at, negative_marking, penalty_ratio, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
      status,
    ).lastInsertRowid;

  const linkClass = db.prepare('INSERT INTO quiz_class (quiz_id, class_id) VALUES (?, ?)');
  for (const classId of classIds) linkClass.run(quizId, classId);

  const insertQuestion = db.prepare(
    'INSERT INTO questions (quiz_id, text, points, order_index) VALUES (?, ?, ?, ?)',
  );
  const insertOption = db.prepare(
    'INSERT INTO options (question_id, text, is_correct, order_index) VALUES (?, ?, ?, ?)',
  );

  const insertedQuestions = questions.map((question, questionIndex) => {
    const questionId = insertQuestion.run(
      quizId,
      question.text,
      question.points,
      questionIndex,
    ).lastInsertRowid;
    const options = question.options.map((option, optionIndex) => ({
      id: insertOption.run(questionId, option.text, option.isCorrect ? 1 : 0, optionIndex)
        .lastInsertRowid,
      isCorrect: option.isCorrect,
    }));
    return { id: questionId, points: question.points, options };
  });

  return { id: quizId, questions: insertedQuestions };
}

// Inserts an attempt row directly, for edge cases the API can't reach on its own (e.g. an
// attempt that is already overdue, or one that belongs to a quiz that has since closed).
export function createAttempt(
  db,
  {
    quizId,
    studentId,
    startedAt,
    deadline,
    status = 'in_progress',
    submittedAt = null,
    score = null,
    maxScore = null,
  },
) {
  return db
    .prepare(
      `INSERT INTO attempts (quiz_id, student_id, started_at, deadline, submitted_at, status, score, max_score)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(quizId, studentId, startedAt, deadline, submittedAt, status, score, maxScore)
    .lastInsertRowid;
}

export function insertAnswer(db, { attemptId, questionId, optionId }) {
  db.prepare('INSERT INTO answers (attempt_id, question_id, option_id) VALUES (?, ?, ?)').run(
    attemptId,
    questionId,
    optionId,
  );
}

function defaultQuestion() {
  return {
    text: 'What is 2 + 2?',
    points: 4,
    options: [
      { text: '4', isCorrect: true },
      { text: '3', isCorrect: false },
      { text: '5', isCorrect: false },
      { text: '22', isCorrect: false },
    ],
  };
}

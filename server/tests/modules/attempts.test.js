import { describe, it, expect } from 'vitest';
import { createTestApp } from '../helpers/createTestApp.js';
import {
  createClass,
  createUser,
  createQuizWithQuestions,
  createAttempt,
  insertAnswer,
} from '../helpers/factories.js';
import { loginAgent } from '../helpers/auth.js';

const HOUR_MS = 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;

function isoIn(ms) {
  return new Date(Date.now() + ms).toISOString();
}

const TWO_QUESTIONS = [
  {
    text: 'Q1',
    points: 4,
    options: [
      { text: '4', isCorrect: true },
      { text: '3', isCorrect: false },
      { text: '5', isCorrect: false },
      { text: '22', isCorrect: false },
    ],
  },
  {
    text: 'Q2',
    points: 2,
    options: [
      { text: 'A', isCorrect: false },
      { text: 'B', isCorrect: true },
      { text: 'C', isCorrect: false },
      { text: 'D', isCorrect: false },
    ],
  },
];

// A quiz that is open right now, assigned to the given student's class, with two questions
// worth 4 and 2 points. Returns everything a test needs: ids, an authenticated agent, db.
function setUpOpenQuiz(db, overrides = {}) {
  const classId = createClass(db, '10A');
  const teacher = createUser(db, { role: 'teacher', name: 'Teacher', username: 'teacher1' });
  const student = createUser(db, {
    role: 'student',
    name: 'Student',
    studentCode: 's10a01',
    classId,
    password: 'student123',
  });
  const otherStudent = createUser(db, {
    role: 'student',
    name: 'Other Student',
    studentCode: 's10a02',
    classId,
    password: 'student123',
  });

  const quiz = createQuizWithQuestions(db, {
    teacherId: teacher.id,
    title: 'Open Quiz',
    timeLimitMinutes: 20,
    opensAt: isoIn(-HOUR_MS),
    closesAt: isoIn(HOUR_MS),
    negativeMarking: false,
    penaltyRatio: 0.25,
    status: 'published',
    classIds: [classId],
    questions: TWO_QUESTIONS,
    ...overrides,
  });

  return { classId, teacher, student, otherStudent, quiz };
}

async function studentAgent(app, student) {
  return loginAgent(app, { studentCode: student.studentCode, password: student.password });
}

describe('POST /api/attempts (start)', () => {
  it('creates a new attempt for a published quiz open to the student', async () => {
    const { app, db } = createTestApp();
    const { student, quiz } = setUpOpenQuiz(db);
    const agent = await studentAgent(app, student);

    const response = await agent.post('/api/attempts').send({ quizId: quiz.id });

    expect(response.status).toBe(201);
    expect(response.body.attempt).toMatchObject({ quizId: quiz.id, status: 'in_progress' });
    expect(response.body.serverNow).toBeDefined();
  });

  it('is idempotent: starting the same quiz twice returns the same attempt id', async () => {
    const { app, db } = createTestApp();
    const { student, quiz } = setUpOpenQuiz(db);
    const agent = await studentAgent(app, student);

    const first = await agent.post('/api/attempts').send({ quizId: quiz.id });
    const second = await agent.post('/api/attempts').send({ quizId: quiz.id });

    expect(second.body.attempt.id).toBe(first.body.attempt.id);
  });

  it('never creates a second attempt row for the same student and quiz', async () => {
    const { app, db } = createTestApp();
    const { student, quiz } = setUpOpenQuiz(db);
    const agent = await studentAgent(app, student);

    await agent.post('/api/attempts').send({ quizId: quiz.id });
    await agent.post('/api/attempts').send({ quizId: quiz.id });

    const count = db
      .prepare('SELECT COUNT(*) AS count FROM attempts WHERE quiz_id = ? AND student_id = ?')
      .get(quiz.id, student.id).count;
    expect(count).toBe(1);
  });

  it('is impossible even at the database level: UNIQUE(quiz_id, student_id) rejects a raw duplicate insert', () => {
    const { db } = createTestApp();
    const { student, quiz } = setUpOpenQuiz(db);
    const insertAttempt = () =>
      db
        .prepare(
          "INSERT INTO attempts (quiz_id, student_id, started_at, deadline, status) VALUES (?, ?, datetime('now'), datetime('now'), 'in_progress')",
        )
        .run(quiz.id, student.id);

    insertAttempt();

    expect(insertAttempt).toThrow(/UNIQUE/);
  });

  it('auto-submits and scores an existing attempt when start is called again after grace has passed', async () => {
    const { app, db } = createTestApp();
    const { student, quiz } = setUpOpenQuiz(db);
    const pastDeadline = isoIn(-MINUTE_MS);
    const attemptId = createAttempt(db, {
      quizId: quiz.id,
      studentId: student.id,
      startedAt: isoIn(-2 * MINUTE_MS),
      deadline: pastDeadline,
      status: 'in_progress',
    });
    insertAnswer(db, {
      attemptId,
      questionId: quiz.questions[0].id,
      optionId: quiz.questions[0].options[0].id,
    });
    const agent = await studentAgent(app, student);

    const response = await agent.post('/api/attempts').send({ quizId: quiz.id });

    expect(response.body.attempt.id).toBe(attemptId);
    expect(response.body.attempt.status).toBe('auto_submitted');
    expect(response.body.attempt.score).toBe(4);
  });

  it('rejects starting with a missing quizId', async () => {
    const { app, db } = createTestApp();
    const { student } = setUpOpenQuiz(db);
    const agent = await studentAgent(app, student);

    const response = await agent.post('/api/attempts').send({});

    expect(response.status).toBe(422);
  });

  it('rejects starting a quiz before its opens_at', async () => {
    const { app, db } = createTestApp();
    const { student, quiz } = setUpOpenQuiz(db, {
      opensAt: isoIn(HOUR_MS),
      closesAt: isoIn(2 * HOUR_MS),
    });
    const agent = await studentAgent(app, student);

    const response = await agent.post('/api/attempts').send({ quizId: quiz.id });

    expect(response.status).toBe(409);
  });

  it('rejects starting a quiz at or after its closes_at', async () => {
    const { app, db } = createTestApp();
    const { student, quiz } = setUpOpenQuiz(db, {
      opensAt: isoIn(-2 * HOUR_MS),
      closesAt: isoIn(-MINUTE_MS),
    });
    const agent = await studentAgent(app, student);

    const response = await agent.post('/api/attempts').send({ quizId: quiz.id });

    expect(response.status).toBe(409);
  });

  it("rejects starting a quiz not assigned to the student's class", async () => {
    const { app, db } = createTestApp();
    const { student, teacher } = setUpOpenQuiz(db);
    const otherClass = createClass(db, '10B');
    const otherQuiz = createQuizWithQuestions(db, {
      teacherId: teacher.id,
      opensAt: isoIn(-HOUR_MS),
      closesAt: isoIn(HOUR_MS),
      status: 'published',
      classIds: [otherClass],
    });
    const agent = await studentAgent(app, student);

    const response = await agent.post('/api/attempts').send({ quizId: otherQuiz.id });

    expect(response.status).toBe(404);
  });

  it('rejects starting a draft quiz', async () => {
    const { app, db } = createTestApp();
    const { student, quiz } = setUpOpenQuiz(db, { status: 'draft' });
    const agent = await studentAgent(app, student);

    const response = await agent.post('/api/attempts').send({ quizId: quiz.id });

    expect(response.status).toBe(404);
  });

  it('rejects a teacher from starting an attempt', async () => {
    const { app, db } = createTestApp();
    const { teacher, quiz } = setUpOpenQuiz(db);
    const agent = await loginAgent(app, { username: teacher.username, password: teacher.password });

    const response = await agent.post('/api/attempts').send({ quizId: quiz.id });

    expect(response.status).toBe(403);
  });

  it('sets the deadline to started_at + time_limit when that is before closes_at', async () => {
    const { app, db } = createTestApp();
    const { student, quiz } = setUpOpenQuiz(db, {
      timeLimitMinutes: 20,
      closesAt: isoIn(5 * HOUR_MS),
    });
    const agent = await studentAgent(app, student);

    const response = await agent.post('/api/attempts').send({ quizId: quiz.id });

    const startedAtMs = new Date(response.body.attempt.startedAt).getTime();
    const deadlineMs = new Date(response.body.attempt.deadline).getTime();
    expect(deadlineMs - startedAtMs).toBe(20 * MINUTE_MS);
  });

  it('caps the deadline at closes_at when the student starts late enough that the time limit would overrun it', async () => {
    const { app, db } = createTestApp();
    const { student, quiz } = setUpOpenQuiz(db, {
      timeLimitMinutes: 20,
      opensAt: isoIn(-HOUR_MS),
      closesAt: isoIn(5 * MINUTE_MS),
    });
    const agent = await studentAgent(app, student);

    const response = await agent.post('/api/attempts').send({ quizId: quiz.id });

    expect(response.body.attempt.deadline).toBe(response.body.quiz.closesAt);
  });
});

describe('GET /api/attempts/:attemptId', () => {
  it('returns 404 for an attempt id that does not exist', async () => {
    const { app, db } = createTestApp();
    const { student } = setUpOpenQuiz(db);
    const agent = await studentAgent(app, student);

    const response = await agent.get('/api/attempts/999999');

    expect(response.status).toBe(404);
  });

  it("returns the questions without isCorrect while the quiz is still open (correct answers aren't leaked)", async () => {
    const { app, db } = createTestApp();
    const { student, quiz } = setUpOpenQuiz(db);
    const agent = await studentAgent(app, student);
    const started = await agent.post('/api/attempts').send({ quizId: quiz.id });

    const response = await agent.get(`/api/attempts/${started.body.attempt.id}`);

    expect(response.status).toBe(200);
    expect(response.body.reviewUnlocked).toBe(false);
    for (const question of response.body.questions) {
      for (const option of question.options) {
        expect(option).not.toHaveProperty('isCorrect');
      }
    }
  });

  it('rejects a request for another student’s attempt', async () => {
    const { app, db } = createTestApp();
    const { student, otherStudent, quiz } = setUpOpenQuiz(db);
    const owner = await studentAgent(app, student);
    const started = await owner.post('/api/attempts').send({ quizId: quiz.id });
    const intruder = await studentAgent(app, otherStudent);

    const response = await intruder.get(`/api/attempts/${started.body.attempt.id}`);

    expect(response.status).toBe(403);
  });

  it('rejects a teacher from reading a student attempt', async () => {
    const { app, db } = createTestApp();
    const { student, teacher, quiz } = setUpOpenQuiz(db);
    const owner = await studentAgent(app, student);
    const started = await owner.post('/api/attempts').send({ quizId: quiz.id });
    const teacherAgent = await loginAgent(app, {
      username: teacher.username,
      password: teacher.password,
    });

    const response = await teacherAgent.get(`/api/attempts/${started.body.attempt.id}`);

    expect(response.status).toBe(403);
  });

  it('auto-submits and scores the attempt when read after the deadline plus grace period has passed', async () => {
    const { app, db } = createTestApp();
    const { student, quiz } = setUpOpenQuiz(db);
    const pastDeadline = isoIn(-MINUTE_MS); // more than GRACE_SECONDS (30s) ago
    const attemptId = createAttempt(db, {
      quizId: quiz.id,
      studentId: student.id,
      startedAt: isoIn(-2 * MINUTE_MS),
      deadline: pastDeadline,
      status: 'in_progress',
    });
    insertAnswer(db, {
      attemptId,
      questionId: quiz.questions[0].id,
      optionId: quiz.questions[0].options[0].id,
    });
    const agent = await studentAgent(app, student);

    const response = await agent.get(`/api/attempts/${attemptId}`);

    expect(response.body.attempt.status).toBe('auto_submitted');
    expect(response.body.attempt.submittedAt).toBe(pastDeadline);
    expect(response.body.attempt.score).toBe(4);
    expect(response.body.attempt.maxScore).toBe(6);

    const row = db.prepare('SELECT status, score FROM attempts WHERE id = ?').get(attemptId);
    expect(row.status).toBe('auto_submitted');
    expect(row.score).toBe(4);
  });

  it('does not auto-submit when read within the grace period after the deadline', async () => {
    const { app, db } = createTestApp();
    const { student, quiz } = setUpOpenQuiz(db);
    const attemptId = createAttempt(db, {
      quizId: quiz.id,
      studentId: student.id,
      startedAt: isoIn(-MINUTE_MS),
      deadline: isoIn(-10 * 1000), // 10s ago, well within the 30s grace period
      status: 'in_progress',
    });
    const agent = await studentAgent(app, student);

    const response = await agent.get(`/api/attempts/${attemptId}`);

    expect(response.body.attempt.status).toBe('in_progress');
    expect(response.body.attempt.score).toBeNull();
  });

  it('keeps the score hidden while the attempt is still in progress', async () => {
    const { app, db } = createTestApp();
    const { student, quiz } = setUpOpenQuiz(db);
    const agent = await studentAgent(app, student);
    const started = await agent.post('/api/attempts').send({ quizId: quiz.id });

    const response = await agent.get(`/api/attempts/${started.body.attempt.id}`);

    expect(response.body.attempt.score).toBeNull();
    expect(response.body.attempt.maxScore).toBeNull();
  });

  it('reveals the score immediately after submitting, even though the quiz is still open', async () => {
    const { app, db } = createTestApp();
    const { student, quiz } = setUpOpenQuiz(db);
    const agent = await studentAgent(app, student);
    const started = await agent.post('/api/attempts').send({ quizId: quiz.id });
    await agent
      .put(`/api/attempts/${started.body.attempt.id}/answers/${quiz.questions[0].id}`)
      .send({
        optionId: quiz.questions[0].options[0].id,
      });
    await agent.post(`/api/attempts/${started.body.attempt.id}/submit`);

    const response = await agent.get(`/api/attempts/${started.body.attempt.id}`);

    expect(response.body.attempt.score).toBe(4);
    expect(response.body.reviewUnlocked).toBe(false);
    for (const question of response.body.questions) {
      for (const option of question.options) {
        expect(option).not.toHaveProperty('isCorrect');
      }
    }
  });

  it('unlocks per-question correctness once the quiz has closed', async () => {
    const { app, db } = createTestApp();
    const classId = createClass(db, '10A');
    const teacher = createUser(db, { role: 'teacher', name: 'Teacher', username: 'teacher1' });
    const student = createUser(db, {
      role: 'student',
      name: 'Student',
      studentCode: 's10a01',
      classId,
      password: 'student123',
    });
    // A quiz that has already closed, with an attempt that was submitted before it closed.
    const quiz = createQuizWithQuestions(db, {
      teacherId: teacher.id,
      opensAt: isoIn(-2 * HOUR_MS),
      closesAt: isoIn(-HOUR_MS),
      status: 'published',
      classIds: [classId],
      questions: TWO_QUESTIONS,
    });
    const attemptId = createAttempt(db, {
      quizId: quiz.id,
      studentId: student.id,
      startedAt: isoIn(-2 * HOUR_MS),
      deadline: isoIn(-HOUR_MS - MINUTE_MS),
      status: 'submitted',
      submittedAt: isoIn(-HOUR_MS - MINUTE_MS),
      score: 4,
      maxScore: 6,
    });
    insertAnswer(db, {
      attemptId,
      questionId: quiz.questions[0].id,
      optionId: quiz.questions[0].options[0].id,
    });
    const agent = await studentAgent(app, student);

    const response = await agent.get(`/api/attempts/${attemptId}`);

    expect(response.body.reviewUnlocked).toBe(true);
    expect(response.body.questions[0].options[0]).toHaveProperty('isCorrect');
  });
});

describe('PUT /api/attempts/:attemptId/answers/:questionId', () => {
  it('saves a new answer', async () => {
    const { app, db } = createTestApp();
    const { student, quiz } = setUpOpenQuiz(db);
    const agent = await studentAgent(app, student);
    const started = await agent.post('/api/attempts').send({ quizId: quiz.id });

    const response = await agent
      .put(`/api/attempts/${started.body.attempt.id}/answers/${quiz.questions[0].id}`)
      .send({ optionId: quiz.questions[0].options[0].id });

    expect(response.status).toBe(200);
    const row = db
      .prepare('SELECT option_id FROM answers WHERE attempt_id = ? AND question_id = ?')
      .get(started.body.attempt.id, quiz.questions[0].id);
    expect(row.option_id).toBe(quiz.questions[0].options[0].id);
  });

  it('overwrites a previous answer for the same question when changed before the deadline', async () => {
    const { app, db } = createTestApp();
    const { student, quiz } = setUpOpenQuiz(db);
    const agent = await studentAgent(app, student);
    const started = await agent.post('/api/attempts').send({ quizId: quiz.id });
    const questionId = quiz.questions[0].id;
    const [firstOption, secondOption] = quiz.questions[0].options;

    await agent
      .put(`/api/attempts/${started.body.attempt.id}/answers/${questionId}`)
      .send({ optionId: firstOption.id });
    await agent
      .put(`/api/attempts/${started.body.attempt.id}/answers/${questionId}`)
      .send({ optionId: secondOption.id });

    const rows = db
      .prepare('SELECT option_id FROM answers WHERE attempt_id = ? AND question_id = ?')
      .all(started.body.attempt.id, questionId);
    expect(rows).toHaveLength(1);
    expect(rows[0].option_id).toBe(secondOption.id);
  });

  it('rejects saving an answer after the deadline plus grace period has passed with 409', async () => {
    const { app, db } = createTestApp();
    const { student, quiz } = setUpOpenQuiz(db);
    const attemptId = createAttempt(db, {
      quizId: quiz.id,
      studentId: student.id,
      startedAt: isoIn(-2 * MINUTE_MS),
      deadline: isoIn(-MINUTE_MS),
      status: 'in_progress',
    });
    const agent = await studentAgent(app, student);

    const response = await agent
      .put(`/api/attempts/${attemptId}/answers/${quiz.questions[0].id}`)
      .send({ optionId: quiz.questions[0].options[0].id });

    expect(response.status).toBe(409);
  });

  it('rejects saving an answer once the attempt has already been submitted', async () => {
    const { app, db } = createTestApp();
    const { student, quiz } = setUpOpenQuiz(db);
    const agent = await studentAgent(app, student);
    const started = await agent.post('/api/attempts').send({ quizId: quiz.id });
    await agent.post(`/api/attempts/${started.body.attempt.id}/submit`);

    const response = await agent
      .put(`/api/attempts/${started.body.attempt.id}/answers/${quiz.questions[0].id}`)
      .send({ optionId: quiz.questions[0].options[0].id });

    expect(response.status).toBe(409);
  });

  it('rejects an option that does not belong to the given question', async () => {
    const { app, db } = createTestApp();
    const { student, quiz } = setUpOpenQuiz(db);
    const agent = await studentAgent(app, student);
    const started = await agent.post('/api/attempts').send({ quizId: quiz.id });
    const optionFromOtherQuestion = quiz.questions[1].options[0].id;

    const response = await agent
      .put(`/api/attempts/${started.body.attempt.id}/answers/${quiz.questions[0].id}`)
      .send({ optionId: optionFromOtherQuestion });

    expect(response.status).toBe(400);
  });

  it("rejects a question that does not belong to the attempt's quiz", async () => {
    const { app, db } = createTestApp();
    const { student, teacher, quiz } = setUpOpenQuiz(db);
    const otherQuiz = createQuizWithQuestions(db, {
      teacherId: teacher.id,
      opensAt: isoIn(-HOUR_MS),
      closesAt: isoIn(HOUR_MS),
      status: 'published',
      classIds: [],
      questions: TWO_QUESTIONS,
    });
    const agent = await studentAgent(app, student);
    const started = await agent.post('/api/attempts').send({ quizId: quiz.id });

    const response = await agent
      .put(`/api/attempts/${started.body.attempt.id}/answers/${otherQuiz.questions[0].id}`)
      .send({ optionId: otherQuiz.questions[0].options[0].id });

    expect(response.status).toBe(404);
  });

  it("rejects saving an answer to another student's attempt", async () => {
    const { app, db } = createTestApp();
    const { student, otherStudent, quiz } = setUpOpenQuiz(db);
    const owner = await studentAgent(app, student);
    const started = await owner.post('/api/attempts').send({ quizId: quiz.id });
    const intruder = await studentAgent(app, otherStudent);

    const response = await intruder
      .put(`/api/attempts/${started.body.attempt.id}/answers/${quiz.questions[0].id}`)
      .send({ optionId: quiz.questions[0].options[0].id });

    expect(response.status).toBe(403);
  });

  it('rejects a request missing optionId', async () => {
    const { app, db } = createTestApp();
    const { student, quiz } = setUpOpenQuiz(db);
    const agent = await studentAgent(app, student);
    const started = await agent.post('/api/attempts').send({ quizId: quiz.id });

    const response = await agent
      .put(`/api/attempts/${started.body.attempt.id}/answers/${quiz.questions[0].id}`)
      .send({});

    expect(response.status).toBe(422);
  });
});

describe('POST /api/attempts/:attemptId/submit', () => {
  it('computes the correct score with no negative marking', async () => {
    const { app, db } = createTestApp();
    const { student, quiz } = setUpOpenQuiz(db);
    const agent = await studentAgent(app, student);
    const started = await agent.post('/api/attempts').send({ quizId: quiz.id });
    // Q1 correct (+4), Q2 wrong (0, no penalty since negative marking is off).
    await agent
      .put(`/api/attempts/${started.body.attempt.id}/answers/${quiz.questions[0].id}`)
      .send({
        optionId: quiz.questions[0].options[0].id,
      });
    await agent
      .put(`/api/attempts/${started.body.attempt.id}/answers/${quiz.questions[1].id}`)
      .send({
        optionId: quiz.questions[1].options[0].id, // wrong option for Q2
      });

    const response = await agent.post(`/api/attempts/${started.body.attempt.id}/submit`);

    expect(response.status).toBe(200);
    expect(response.body.attempt.status).toBe('submitted');
    expect(response.body.attempt.score).toBe(4);
    expect(response.body.attempt.maxScore).toBe(6);
  });

  it('applies the penalty ratio to a wrong answer when negative marking is on', async () => {
    const { app, db } = createTestApp();
    const { student, quiz } = setUpOpenQuiz(db, { negativeMarking: true, penaltyRatio: 0.5 });
    const agent = await studentAgent(app, student);
    const started = await agent.post('/api/attempts').send({ quizId: quiz.id });
    await agent
      .put(`/api/attempts/${started.body.attempt.id}/answers/${quiz.questions[0].id}`)
      .send({
        optionId: quiz.questions[0].options[0].id, // correct, +4
      });
    await agent
      .put(`/api/attempts/${started.body.attempt.id}/answers/${quiz.questions[1].id}`)
      .send({
        optionId: quiz.questions[1].options[0].id, // wrong, -(2*0.5) = -1
      });

    const response = await agent.post(`/api/attempts/${started.body.attempt.id}/submit`);

    expect(response.body.attempt.score).toBe(3);
  });

  it('scores an unanswered question as zero even with negative marking on', async () => {
    const { app, db } = createTestApp();
    const { student, quiz } = setUpOpenQuiz(db, { negativeMarking: true, penaltyRatio: 1 });
    const agent = await studentAgent(app, student);
    const started = await agent.post('/api/attempts').send({ quizId: quiz.id });
    await agent
      .put(`/api/attempts/${started.body.attempt.id}/answers/${quiz.questions[0].id}`)
      .send({
        optionId: quiz.questions[0].options[0].id, // correct, +4
      });
    // Q2 left unanswered entirely.

    const response = await agent.post(`/api/attempts/${started.body.attempt.id}/submit`);

    expect(response.body.attempt.score).toBe(4);
  });

  it('is idempotent: submitting twice returns the same score and does not change submittedAt', async () => {
    const { app, db } = createTestApp();
    const { student, quiz } = setUpOpenQuiz(db);
    const agent = await studentAgent(app, student);
    const started = await agent.post('/api/attempts').send({ quizId: quiz.id });
    await agent
      .put(`/api/attempts/${started.body.attempt.id}/answers/${quiz.questions[0].id}`)
      .send({
        optionId: quiz.questions[0].options[0].id,
      });

    const first = await agent.post(`/api/attempts/${started.body.attempt.id}/submit`);
    const second = await agent.post(`/api/attempts/${started.body.attempt.id}/submit`);

    expect(second.body.attempt.score).toBe(first.body.attempt.score);
    expect(second.body.attempt.submittedAt).toBe(first.body.attempt.submittedAt);
    expect(second.body.attempt.status).toBe('submitted');
  });

  it('finalises as auto_submitted (not submitted) when called after the grace period has already passed', async () => {
    const { app, db } = createTestApp();
    const { student, quiz } = setUpOpenQuiz(db);
    const pastDeadline = isoIn(-MINUTE_MS);
    const attemptId = createAttempt(db, {
      quizId: quiz.id,
      studentId: student.id,
      startedAt: isoIn(-2 * MINUTE_MS),
      deadline: pastDeadline,
      status: 'in_progress',
    });
    const agent = await studentAgent(app, student);

    const response = await agent.post(`/api/attempts/${attemptId}/submit`);

    expect(response.body.attempt.status).toBe('auto_submitted');
    expect(response.body.attempt.submittedAt).toBe(pastDeadline);
  });

  it('makes answers read-only after submit', async () => {
    const { app, db } = createTestApp();
    const { student, quiz } = setUpOpenQuiz(db);
    const agent = await studentAgent(app, student);
    const started = await agent.post('/api/attempts').send({ quizId: quiz.id });
    await agent.post(`/api/attempts/${started.body.attempt.id}/submit`);

    const response = await agent
      .put(`/api/attempts/${started.body.attempt.id}/answers/${quiz.questions[0].id}`)
      .send({ optionId: quiz.questions[0].options[0].id });

    expect(response.status).toBe(409);
  });

  it('rejects a teacher from submitting a student attempt', async () => {
    const { app, db } = createTestApp();
    const { student, teacher, quiz } = setUpOpenQuiz(db);
    const owner = await studentAgent(app, student);
    const started = await owner.post('/api/attempts').send({ quizId: quiz.id });
    const teacherAgent = await loginAgent(app, {
      username: teacher.username,
      password: teacher.password,
    });

    const response = await teacherAgent.post(`/api/attempts/${started.body.attempt.id}/submit`);

    expect(response.status).toBe(403);
  });
});

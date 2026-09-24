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

function setUp(db) {
  const classA = createClass(db, '10A');
  const classB = createClass(db, '10B');
  const teacher = createUser(db, { role: 'teacher', name: 'Teacher', username: 'teacher1' });
  const otherTeacher = createUser(db, { role: 'teacher', name: 'Other', username: 'teacher2' });
  const admin = createUser(db, { role: 'admin', name: 'Admin', username: 'admin' });
  const studentA1 = createUser(db, {
    role: 'student',
    name: 'Student A1',
    studentCode: 's10a01',
    classId: classA,
  });
  const studentA2 = createUser(db, {
    role: 'student',
    name: 'Student A2',
    studentCode: 's10a02',
    classId: classA,
  });
  const studentB1 = createUser(db, {
    role: 'student',
    name: 'Student B1',
    studentCode: 's10b01',
    classId: classB,
  });

  const quiz = createQuizWithQuestions(db, {
    teacherId: teacher.id,
    title: 'Results Quiz',
    opensAt: isoIn(-HOUR_MS),
    closesAt: isoIn(HOUR_MS),
    classIds: [classA, classB],
    questions: TWO_QUESTIONS,
  });

  return { classA, classB, teacher, otherTeacher, admin, studentA1, studentA2, studentB1, quiz };
}

async function teacherAgent(app, teacher) {
  return loginAgent(app, { username: teacher.username, password: teacher.password });
}

describe('GET /api/quizzes/:quizId/results', () => {
  it('shows not_started for a student who never attempted the quiz', async () => {
    const { app, db } = createTestApp();
    const { teacher, quiz } = setUp(db);
    const agent = await teacherAgent(app, teacher);

    const response = await agent.get(`/api/quizzes/${quiz.id}/results`);

    expect(response.status).toBe(200);
    const names = response.body.students.map((s) => s.studentName);
    expect(names).toEqual(expect.arrayContaining(['Student A1', 'Student A2', 'Student B1']));
    const notStarted = response.body.students.find((s) => s.studentName === 'Student A2');
    expect(notStarted.status).toBe('not_started');
    expect(notStarted.score).toBeNull();
  });

  it('reports a submitted attempt’s score and time taken', async () => {
    const { app, db } = createTestApp();
    const { teacher, studentA1, quiz } = setUp(db);
    const startedAt = isoIn(-30 * MINUTE_MS);
    const submittedAt = isoIn(-20 * MINUTE_MS);
    createAttempt(db, {
      quizId: quiz.id,
      studentId: studentA1.id,
      startedAt,
      deadline: isoIn(0),
      status: 'submitted',
      submittedAt,
      score: 4,
      maxScore: 6,
    });
    const agent = await teacherAgent(app, teacher);

    const response = await agent.get(`/api/quizzes/${quiz.id}/results`);

    const row = response.body.students.find((s) => s.studentName === 'Student A1');
    expect(row.status).toBe('submitted');
    expect(row.score).toBe(4);
    expect(row.maxScore).toBe(6);
    expect(row.timeTakenSeconds).toBe(10 * 60);
  });

  it('auto-finalises an overdue in_progress attempt when results are read', async () => {
    const { app, db } = createTestApp();
    const { teacher, studentA1, quiz } = setUp(db);
    const pastDeadline = isoIn(-MINUTE_MS);
    const attemptId = createAttempt(db, {
      quizId: quiz.id,
      studentId: studentA1.id,
      startedAt: isoIn(-2 * MINUTE_MS),
      deadline: pastDeadline,
      status: 'in_progress',
    });
    insertAnswer(db, {
      attemptId,
      questionId: quiz.questions[0].id,
      optionId: quiz.questions[0].options[0].id,
    });
    const agent = await teacherAgent(app, teacher);

    const response = await agent.get(`/api/quizzes/${quiz.id}/results`);

    const row = response.body.students.find((s) => s.studentName === 'Student A1');
    expect(row.status).toBe('auto_submitted');
    expect(row.score).toBe(4);

    const dbRow = db.prepare('SELECT status FROM attempts WHERE id = ?').get(attemptId);
    expect(dbRow.status).toBe('auto_submitted');
  });

  it('filters results down to one class', async () => {
    const { app, db } = createTestApp();
    const { classA, teacher, quiz } = setUp(db);
    const agent = await teacherAgent(app, teacher);

    const response = await agent.get(`/api/quizzes/${quiz.id}/results?classId=${classA}`);

    const names = response.body.students.map((s) => s.studentName);
    expect(names).toEqual(expect.arrayContaining(['Student A1', 'Student A2']));
    expect(names).not.toContain('Student B1');
  });

  it('rejects filtering by a class not assigned to the quiz', async () => {
    const { app, db } = createTestApp();
    const { teacher, quiz } = setUp(db);
    const unrelatedClass = createClass(db, '11A');
    const agent = await teacherAgent(app, teacher);

    const response = await agent.get(`/api/quizzes/${quiz.id}/results?classId=${unrelatedClass}`);

    expect(response.status).toBe(400);
  });

  it('computes the per-question correct rate across finalised attempts only', async () => {
    const { app, db } = createTestApp();
    const { teacher, studentA1, studentA2, quiz } = setUp(db);
    // Student A1: answers Q1 correctly, submitted.
    const attempt1 = createAttempt(db, {
      quizId: quiz.id,
      studentId: studentA1.id,
      startedAt: isoIn(-MINUTE_MS),
      deadline: isoIn(HOUR_MS),
      status: 'submitted',
      submittedAt: isoIn(0),
      score: 4,
      maxScore: 6,
    });
    insertAnswer(db, {
      attemptId: attempt1,
      questionId: quiz.questions[0].id,
      optionId: quiz.questions[0].options[0].id,
    });
    // Student A2: answers Q1 incorrectly, submitted.
    const attempt2 = createAttempt(db, {
      quizId: quiz.id,
      studentId: studentA2.id,
      startedAt: isoIn(-MINUTE_MS),
      deadline: isoIn(HOUR_MS),
      status: 'submitted',
      submittedAt: isoIn(0),
      score: 0,
      maxScore: 6,
    });
    insertAnswer(db, {
      attemptId: attempt2,
      questionId: quiz.questions[0].id,
      optionId: quiz.questions[0].options[1].id,
    });
    const agent = await teacherAgent(app, teacher);

    const response = await agent.get(`/api/quizzes/${quiz.id}/results`);

    const q1Rate = response.body.perQuestionCorrectRate.find(
      (q) => q.questionId === quiz.questions[0].id,
    );
    expect(q1Rate.correctRate).toBe(50); // 1 of 2 finalised attempts got it right
    const q2Rate = response.body.perQuestionCorrectRate.find(
      (q) => q.questionId === quiz.questions[1].id,
    );
    expect(q2Rate.correctRate).toBe(0); // neither answered Q2, so 0 of 2 got it right
  });

  it('reports a null correct rate when nobody has finished the quiz yet', async () => {
    const { app, db } = createTestApp();
    const { teacher, quiz } = setUp(db);
    const agent = await teacherAgent(app, teacher);

    const response = await agent.get(`/api/quizzes/${quiz.id}/results`);

    expect(response.body.perQuestionCorrectRate[0].correctRate).toBeNull();
  });

  it("rejects viewing another teacher's quiz results", async () => {
    const { app, db } = createTestApp();
    const { otherTeacher, quiz } = setUp(db);
    const agent = await teacherAgent(app, otherTeacher);

    const response = await agent.get(`/api/quizzes/${quiz.id}/results`);

    expect(response.status).toBe(403);
  });

  it('allows admin to view results for any quiz', async () => {
    const { app, db } = createTestApp();
    const { admin, quiz } = setUp(db);
    const agent = await loginAgent(app, { username: admin.username, password: admin.password });

    const response = await agent.get(`/api/quizzes/${quiz.id}/results`);

    expect(response.status).toBe(200);
  });

  it('rejects a student from viewing results', async () => {
    const { app, db } = createTestApp();
    const { studentA1, quiz } = setUp(db);
    const agent = await loginAgent(app, {
      studentCode: studentA1.studentCode,
      password: 'password123',
    });

    const response = await agent.get(`/api/quizzes/${quiz.id}/results`);

    expect(response.status).toBe(403);
  });
});

describe('GET /api/quizzes/:quizId/results/export', () => {
  it('returns a UTF-8 BOM-prefixed CSV with a header row', async () => {
    const { app, db } = createTestApp();
    const { teacher, studentA1, quiz } = setUp(db);
    createAttempt(db, {
      quizId: quiz.id,
      studentId: studentA1.id,
      startedAt: isoIn(-MINUTE_MS),
      deadline: isoIn(HOUR_MS),
      status: 'submitted',
      submittedAt: isoIn(0),
      score: 4,
      maxScore: 6,
    });
    const agent = await teacherAgent(app, teacher);

    const response = await agent.get(`/api/quizzes/${quiz.id}/results/export`);

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch(/text\/csv/);
    const body = response.text;
    expect(body.charCodeAt(0)).toBe(0xfeff);
    expect(body).toContain('Student Name,Student Code,Class,Status,Score,Max Score,Time Taken (s)');
    expect(body).toContain('Student A1');
  });
});

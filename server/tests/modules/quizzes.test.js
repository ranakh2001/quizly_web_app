import { describe, it, expect } from 'vitest';
import { createTestApp } from '../helpers/createTestApp.js';
import { createClass, createUser, createQuizWithQuestions } from '../helpers/factories.js';
import { loginAgent } from '../helpers/auth.js';

const HOUR_MS = 60 * 60 * 1000;

function isoIn(ms) {
  return new Date(Date.now() + ms).toISOString();
}

function setUp(db) {
  const classA = createClass(db, '10A');
  const classB = createClass(db, '10B');
  const teacher = createUser(db, { role: 'teacher', name: 'Teacher', username: 'teacher1' });
  const student = createUser(db, {
    role: 'student',
    name: 'Student',
    studentCode: 's10a01',
    classId: classA,
    password: 'student123',
  });
  return { classA, classB, teacher, student };
}

describe('GET /api/quizzes', () => {
  it("lists only published quizzes assigned to the student's class", async () => {
    const { app, db } = createTestApp();
    const { classA, classB, teacher, student } = setUp(db);
    createQuizWithQuestions(db, {
      teacherId: teacher.id,
      title: 'My Class Quiz',
      opensAt: isoIn(-HOUR_MS),
      closesAt: isoIn(HOUR_MS),
      status: 'published',
      classIds: [classA],
    });
    createQuizWithQuestions(db, {
      teacherId: teacher.id,
      title: 'Other Class Quiz',
      opensAt: isoIn(-HOUR_MS),
      closesAt: isoIn(HOUR_MS),
      status: 'published',
      classIds: [classB],
    });
    const agent = await loginAgent(app, {
      studentCode: student.studentCode,
      password: student.password,
    });

    const response = await agent.get('/api/quizzes');

    expect(response.status).toBe(200);
    expect(response.body.quizzes).toHaveLength(1);
    expect(response.body.quizzes[0].title).toBe('My Class Quiz');
  });

  it('excludes draft quizzes even when assigned to the class', async () => {
    const { app, db } = createTestApp();
    const { classA, teacher, student } = setUp(db);
    createQuizWithQuestions(db, {
      teacherId: teacher.id,
      title: 'Draft Quiz',
      opensAt: isoIn(-HOUR_MS),
      closesAt: isoIn(HOUR_MS),
      status: 'draft',
      classIds: [classA],
    });
    const agent = await loginAgent(app, {
      studentCode: student.studentCode,
      password: student.password,
    });

    const response = await agent.get('/api/quizzes');

    expect(response.body.quizzes).toHaveLength(0);
  });

  it('categorizes an unopened quiz as upcoming', async () => {
    const { app, db } = createTestApp();
    const { classA, teacher, student } = setUp(db);
    createQuizWithQuestions(db, {
      teacherId: teacher.id,
      opensAt: isoIn(HOUR_MS),
      closesAt: isoIn(2 * HOUR_MS),
      status: 'published',
      classIds: [classA],
    });
    const agent = await loginAgent(app, {
      studentCode: student.studentCode,
      password: student.password,
    });

    const response = await agent.get('/api/quizzes');

    expect(response.body.quizzes[0].category).toBe('upcoming');
  });

  it('rejects a non-student role', async () => {
    const { app, db } = createTestApp();
    const { teacher } = setUp(db);
    const agent = await loginAgent(app, { username: teacher.username, password: teacher.password });

    const response = await agent.get('/api/quizzes');

    expect(response.status).toBe(403);
  });
});

describe('GET /api/quizzes/:quizId', () => {
  it("returns quiz detail for a quiz assigned to the student's class", async () => {
    const { app, db } = createTestApp();
    const { classA, teacher, student } = setUp(db);
    const quiz = createQuizWithQuestions(db, {
      teacherId: teacher.id,
      title: 'Algebra',
      timeLimitMinutes: 15,
      opensAt: isoIn(-HOUR_MS),
      closesAt: isoIn(HOUR_MS),
      status: 'published',
      classIds: [classA],
    });
    const agent = await loginAgent(app, {
      studentCode: student.studentCode,
      password: student.password,
    });

    const response = await agent.get(`/api/quizzes/${quiz.id}`);

    expect(response.status).toBe(200);
    expect(response.body.quiz).toMatchObject({
      title: 'Algebra',
      timeLimitMinutes: 15,
      questionCount: 1,
    });
  });

  it("returns 404 for a quiz not assigned to the student's class (not 403, to avoid leaking its existence)", async () => {
    const { app, db } = createTestApp();
    const { classB, teacher, student } = setUp(db);
    const quiz = createQuizWithQuestions(db, {
      teacherId: teacher.id,
      opensAt: isoIn(-HOUR_MS),
      closesAt: isoIn(HOUR_MS),
      status: 'published',
      classIds: [classB],
    });
    const agent = await loginAgent(app, {
      studentCode: student.studentCode,
      password: student.password,
    });

    const response = await agent.get(`/api/quizzes/${quiz.id}`);

    expect(response.status).toBe(404);
  });

  it('returns 404 for a draft quiz', async () => {
    const { app, db } = createTestApp();
    const { classA, teacher, student } = setUp(db);
    const quiz = createQuizWithQuestions(db, {
      teacherId: teacher.id,
      opensAt: isoIn(-HOUR_MS),
      closesAt: isoIn(HOUR_MS),
      status: 'draft',
      classIds: [classA],
    });
    const agent = await loginAgent(app, {
      studentCode: student.studentCode,
      password: student.password,
    });

    const response = await agent.get(`/api/quizzes/${quiz.id}`);

    expect(response.status).toBe(404);
  });
});

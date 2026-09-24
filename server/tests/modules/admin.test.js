import { describe, it, expect } from 'vitest';
import { createTestApp } from '../helpers/createTestApp.js';
import {
  createClass,
  createUser,
  createQuizWithQuestions,
  createAttempt,
} from '../helpers/factories.js';
import { loginAgent } from '../helpers/auth.js';

const HOUR_MS = 60 * 60 * 1000;

function isoIn(ms) {
  return new Date(Date.now() + ms).toISOString();
}

function setUp(db) {
  const classA = createClass(db, '10A');
  const teacher = createUser(db, { role: 'teacher', name: 'Teacher', username: 'teacher1' });
  const admin = createUser(db, { role: 'admin', name: 'Nour', username: 'admin' });
  const student = createUser(db, {
    role: 'student',
    name: 'Student',
    studentCode: 's10a01',
    classId: classA,
  });
  const quiz = createQuizWithQuestions(db, {
    teacherId: teacher.id,
    opensAt: isoIn(-HOUR_MS),
    closesAt: isoIn(HOUR_MS),
    classIds: [classA],
  });
  return { classA, teacher, admin, student, quiz };
}

async function adminAgent(app, admin) {
  return loginAgent(app, { username: admin.username, password: admin.password });
}

describe('GET /api/admin/overview', () => {
  it('reports totals, average score by class, and recent quizzes', async () => {
    const { app, db } = createTestApp();
    const { classA, admin, student, quiz } = setUp(db);
    createAttempt(db, {
      quizId: quiz.id,
      studentId: student.id,
      startedAt: isoIn(-30 * 60 * 1000),
      deadline: isoIn(0),
      status: 'submitted',
      submittedAt: isoIn(-20 * 60 * 1000),
      score: 3,
      maxScore: 6,
    });
    const agent = await adminAgent(app, admin);

    const response = await agent.get('/api/admin/overview');

    expect(response.status).toBe(200);
    expect(response.body.totals).toMatchObject({
      students: 1,
      teachers: 1,
      quizzes: 1,
      classes: 1,
    });
    const classRow = response.body.averageScoreByClass.find((row) => row.classId === classA);
    expect(classRow.averagePercent).toBe(50);
    expect(classRow.attemptsCount).toBe(1);
    expect(response.body.recentQuizzes).toHaveLength(1);
    expect(response.body.recentQuizzes[0].teacherName).toBe('Teacher');
  });

  it('reports a null average for a class with no finalised attempts', async () => {
    const { app, db } = createTestApp();
    const { admin } = setUp(db);
    const agent = await adminAgent(app, admin);

    const response = await agent.get('/api/admin/overview');

    expect(response.body.averageScoreByClass[0].averagePercent).toBeNull();
  });

  it('rejects a non-admin role', async () => {
    const { app, db } = createTestApp();
    const { teacher } = setUp(db);
    const agent = await loginAgent(app, { username: teacher.username, password: teacher.password });

    const response = await agent.get('/api/admin/overview');

    expect(response.status).toBe(403);
  });
});

describe('POST /api/admin/attempts/:attemptId/reset', () => {
  it('deletes the attempt and writes an audit_log entry', async () => {
    const { app, db } = createTestApp();
    const { admin, student, quiz } = setUp(db);
    const attemptId = createAttempt(db, {
      quizId: quiz.id,
      studentId: student.id,
      startedAt: isoIn(-30 * 60 * 1000),
      deadline: isoIn(0),
      status: 'submitted',
      submittedAt: isoIn(-20 * 60 * 1000),
      score: 3,
      maxScore: 6,
    });
    const agent = await adminAgent(app, admin);

    const response = await agent
      .post(`/api/admin/attempts/${attemptId}/reset`)
      .send({ reason: 'Technical issue during the exam' });

    expect(response.status).toBe(200);
    const attemptRow = db.prepare('SELECT * FROM attempts WHERE id = ?').get(attemptId);
    expect(attemptRow).toBeUndefined();

    const auditRow = db.prepare('SELECT * FROM audit_log WHERE target_id = ?').get(attemptId);
    expect(auditRow).toMatchObject({
      actor_id: admin.id,
      action: 'attempt_reset',
      target_type: 'attempt',
      reason: 'Technical issue during the exam',
    });
  });

  it('lets the student start a brand new attempt after a reset', async () => {
    const { app, db } = createTestApp();
    const { admin, student, quiz } = setUp(db);
    const attemptId = createAttempt(db, {
      quizId: quiz.id,
      studentId: student.id,
      startedAt: isoIn(-30 * 60 * 1000),
      deadline: isoIn(0),
      status: 'submitted',
      submittedAt: isoIn(-20 * 60 * 1000),
      score: 3,
      maxScore: 6,
    });
    const admAgent = await adminAgent(app, admin);
    await admAgent
      .post(`/api/admin/attempts/${attemptId}/reset`)
      .send({ reason: 'Retake approved' });

    const studentAgent = await loginAgent(app, {
      studentCode: student.studentCode,
      password: 'password123',
    });
    const response = await studentAgent.post('/api/attempts').send({ quizId: quiz.id });

    expect(response.status).toBe(201);
    expect(response.body.attempt.id).not.toBe(attemptId);
    expect(response.body.attempt.status).toBe('in_progress');
  });

  it('requires a reason', async () => {
    const { app, db } = createTestApp();
    const { admin, student, quiz } = setUp(db);
    const attemptId = createAttempt(db, {
      quizId: quiz.id,
      studentId: student.id,
      startedAt: isoIn(-HOUR_MS),
      deadline: isoIn(0),
    });
    const agent = await adminAgent(app, admin);

    const response = await agent
      .post(`/api/admin/attempts/${attemptId}/reset`)
      .send({ reason: '  ' });

    expect(response.status).toBe(422);
  });

  it('returns 404 for an attempt that does not exist', async () => {
    const { app, db } = createTestApp();
    const { admin } = setUp(db);
    const agent = await adminAgent(app, admin);

    const response = await agent
      .post('/api/admin/attempts/999999/reset')
      .send({ reason: 'Testing' });

    expect(response.status).toBe(404);
  });

  it('rejects a non-admin role', async () => {
    const { app, db } = createTestApp();
    const { teacher, student, quiz } = setUp(db);
    const attemptId = createAttempt(db, {
      quizId: quiz.id,
      studentId: student.id,
      startedAt: isoIn(-HOUR_MS),
      deadline: isoIn(0),
    });
    const agent = await loginAgent(app, { username: teacher.username, password: teacher.password });

    const response = await agent
      .post(`/api/admin/attempts/${attemptId}/reset`)
      .send({ reason: 'Testing' });

    expect(response.status).toBe(403);
  });
});

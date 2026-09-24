import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createTestApp } from '../helpers/createTestApp.js';
import { createClass, createUser } from '../helpers/factories.js';

function setUpUsers(db) {
  const classId = createClass(db, '10A');
  const student = createUser(db, {
    role: 'student',
    name: 'Student One',
    studentCode: 's10a01',
    classId,
    password: 'student123',
  });
  const teacher = createUser(db, {
    role: 'teacher',
    name: 'Teacher One',
    username: 'teacher1',
    password: 'teacher123',
  });
  const admin = createUser(db, {
    role: 'admin',
    name: 'Nour',
    username: 'admin',
    password: 'admin123',
  });
  return { student, teacher, admin };
}

describe('POST /api/auth/login', () => {
  it('logs in a student with a valid student code and password', async () => {
    const { app, db } = createTestApp();
    const { student } = setUpUsers(db);

    const response = await request(app)
      .post('/api/auth/login')
      .send({ studentCode: student.studentCode, password: student.password });

    expect(response.status).toBe(200);
    expect(response.body.user).toMatchObject({
      role: 'student',
      studentCode: 's10a01',
      className: '10A',
    });
    expect(response.headers['set-cookie']?.[0]).toMatch(/^session=/);
  });

  it('logs in a teacher with a valid username and password', async () => {
    const { app, db } = createTestApp();
    const { teacher } = setUpUsers(db);

    const response = await request(app)
      .post('/api/auth/login')
      .send({ username: teacher.username, password: teacher.password });

    expect(response.status).toBe(200);
    expect(response.body.user).toMatchObject({ role: 'teacher', username: 'teacher1' });
  });

  it('logs in the admin with a valid username and password', async () => {
    const { app, db } = createTestApp();
    const { admin } = setUpUsers(db);

    const response = await request(app)
      .post('/api/auth/login')
      .send({ username: admin.username, password: admin.password });

    expect(response.status).toBe(200);
    expect(response.body.user).toMatchObject({ role: 'admin' });
  });

  it('never returns the password hash in the user payload', async () => {
    const { app, db } = createTestApp();
    const { teacher } = setUpUsers(db);

    const response = await request(app)
      .post('/api/auth/login')
      .send({ username: teacher.username, password: teacher.password });

    expect(response.body.user.passwordHash).toBeUndefined();
    expect(response.body.user.password_hash).toBeUndefined();
  });

  it('rejects an unknown student code with a generic error', async () => {
    const { app, db } = createTestApp();
    setUpUsers(db);

    const response = await request(app)
      .post('/api/auth/login')
      .send({ studentCode: 'does-not-exist', password: 'whatever' });

    expect(response.status).toBe(401);
    expect(response.body.error.message).toBe('Invalid credentials');
  });

  it('rejects a wrong password with the exact same generic error as an unknown identifier', async () => {
    const { app, db } = createTestApp();
    const { student } = setUpUsers(db);

    const wrongPassword = await request(app)
      .post('/api/auth/login')
      .send({ studentCode: student.studentCode, password: 'not-the-password' });
    const unknownIdentifier = await request(app)
      .post('/api/auth/login')
      .send({ studentCode: 'does-not-exist', password: 'not-the-password' });

    expect(wrongPassword.status).toBe(401);
    expect(wrongPassword.body.error.message).toBe(unknownIdentifier.body.error.message);
  });

  it('rejects a login request that provides both studentCode and username', async () => {
    const { app } = createTestApp();

    const response = await request(app)
      .post('/api/auth/login')
      .send({ studentCode: 's10a01', username: 'teacher1', password: 'x' });

    expect(response.status).toBe(422);
  });

  it('rejects a login request that provides neither studentCode nor username', async () => {
    const { app } = createTestApp();

    const response = await request(app).post('/api/auth/login').send({ password: 'x' });

    expect(response.status).toBe(422);
  });
});

describe('GET /api/auth/me', () => {
  it('returns the current user when authenticated', async () => {
    const { app, db } = createTestApp();
    const { teacher } = setUpUsers(db);
    const agent = request.agent(app);
    await agent
      .post('/api/auth/login')
      .send({ username: teacher.username, password: teacher.password });

    const response = await agent.get('/api/auth/me');

    expect(response.status).toBe(200);
    expect(response.body.user).toMatchObject({ role: 'teacher', username: 'teacher1' });
  });

  it('rejects the request when there is no session cookie', async () => {
    const { app } = createTestApp();

    const response = await request(app).get('/api/auth/me');

    expect(response.status).toBe(401);
  });

  it('rejects a tampered session cookie', async () => {
    const { app } = createTestApp();

    const response = await request(app)
      .get('/api/auth/me')
      .set('Cookie', 'session=not-a-real-token');

    expect(response.status).toBe(401);
  });
});

describe('POST /api/auth/logout', () => {
  it('clears the session so a later /me request is rejected', async () => {
    const { app, db } = createTestApp();
    const { student } = setUpUsers(db);
    const agent = request.agent(app);
    await agent
      .post('/api/auth/login')
      .send({ studentCode: student.studentCode, password: student.password });

    await agent.post('/api/auth/logout');
    const response = await agent.get('/api/auth/me');

    expect(response.status).toBe(401);
  });
});

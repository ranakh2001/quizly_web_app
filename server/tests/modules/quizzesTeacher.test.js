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
  const classB = createClass(db, '10B');
  const teacher = createUser(db, { role: 'teacher', name: 'Teacher One', username: 'teacher1' });
  const otherTeacher = createUser(db, {
    role: 'teacher',
    name: 'Teacher Two',
    username: 'teacher2',
  });
  const admin = createUser(db, { role: 'admin', name: 'Admin', username: 'admin' });
  const student = createUser(db, {
    role: 'student',
    name: 'Student',
    studentCode: 's10a01',
    classId: classA,
  });
  return { classA, classB, teacher, otherTeacher, admin, student };
}

async function teacherAgent(app, teacher) {
  return loginAgent(app, { username: teacher.username, password: teacher.password });
}

function validQuizPayload(overrides = {}) {
  return {
    title: 'Fractions',
    language: 'en',
    opensAt: isoIn(-HOUR_MS),
    closesAt: isoIn(HOUR_MS),
    ...overrides,
  };
}

function validQuestionPayload(overrides = {}) {
  return {
    text: 'What is 1/2 + 1/2?',
    points: 2,
    options: [
      { text: '1', isCorrect: true },
      { text: '0', isCorrect: false },
      { text: '2', isCorrect: false },
      { text: '1/4', isCorrect: false },
    ],
    ...overrides,
  };
}

describe('POST /api/quizzes', () => {
  it('creates a draft quiz owned by the calling teacher', async () => {
    const { app, db } = createTestApp();
    const { classA, teacher } = setUp(db);
    const agent = await teacherAgent(app, teacher);

    const response = await agent
      .post('/api/quizzes')
      .send(validQuizPayload({ classIds: [classA] }));

    expect(response.status).toBe(201);
    expect(response.body.quiz).toMatchObject({
      title: 'Fractions',
      status: 'draft',
      teacherId: teacher.id,
      classIds: [classA],
      locked: false,
    });
  });

  it('defaults timeLimitMinutes and penaltyRatio when omitted', async () => {
    const { app, db } = createTestApp();
    const { teacher } = setUp(db);
    const agent = await teacherAgent(app, teacher);

    const response = await agent.post('/api/quizzes').send(validQuizPayload());

    expect(response.body.quiz.timeLimitMinutes).toBe(20);
    expect(response.body.quiz.penaltyRatio).toBe(0.25);
  });

  it('rejects opensAt at or after closesAt', async () => {
    const { app, db } = createTestApp();
    const { teacher } = setUp(db);
    const agent = await teacherAgent(app, teacher);

    const response = await agent
      .post('/api/quizzes')
      .send(validQuizPayload({ opensAt: isoIn(HOUR_MS), closesAt: isoIn(-HOUR_MS) }));

    expect(response.status).toBe(422);
  });

  it('rejects an unknown classId', async () => {
    const { app, db } = createTestApp();
    const { teacher } = setUp(db);
    const agent = await teacherAgent(app, teacher);

    const response = await agent
      .post('/api/quizzes')
      .send(validQuizPayload({ classIds: [999999] }));

    expect(response.status).toBe(400);
  });

  it('rejects a student from creating a quiz', async () => {
    const { app, db } = createTestApp();
    const { student } = setUp(db);
    const agent = await loginAgent(app, {
      studentCode: student.studentCode,
      password: student.password,
    });

    const response = await agent.post('/api/quizzes').send(validQuizPayload());

    expect(response.status).toBe(403);
  });

  it('rejects an admin from creating a quiz', async () => {
    const { app, db } = createTestApp();
    const { admin } = setUp(db);
    const agent = await loginAgent(app, { username: admin.username, password: admin.password });

    const response = await agent.post('/api/quizzes').send(validQuizPayload());

    expect(response.status).toBe(403);
  });

  it('rejects a missing title', async () => {
    const { app, db } = createTestApp();
    const { teacher } = setUp(db);
    const agent = await teacherAgent(app, teacher);

    const response = await agent.post('/api/quizzes').send(validQuizPayload({ title: undefined }));

    expect(response.status).toBe(422);
  });
});

describe('GET /api/quizzes (teacher)', () => {
  it("lists only the teacher's own quizzes", async () => {
    const { app, db } = createTestApp();
    const { teacher, otherTeacher } = setUp(db);
    createQuizWithQuestions(db, {
      teacherId: teacher.id,
      title: 'Mine',
      opensAt: isoIn(-HOUR_MS),
      closesAt: isoIn(HOUR_MS),
    });
    createQuizWithQuestions(db, {
      teacherId: otherTeacher.id,
      title: 'Not Mine',
      opensAt: isoIn(-HOUR_MS),
      closesAt: isoIn(HOUR_MS),
    });
    const agent = await teacherAgent(app, teacher);

    const response = await agent.get('/api/quizzes');

    expect(response.body.quizzes).toHaveLength(1);
    expect(response.body.quizzes[0].title).toBe('Mine');
  });

  it('reports locked: true once a student has started an attempt', async () => {
    const { app, db } = createTestApp();
    const { classA, teacher, student } = setUp(db);
    const quiz = createQuizWithQuestions(db, {
      teacherId: teacher.id,
      opensAt: isoIn(-HOUR_MS),
      closesAt: isoIn(HOUR_MS),
      classIds: [classA],
    });
    createAttempt(db, {
      quizId: quiz.id,
      studentId: student.id,
      startedAt: isoIn(0),
      deadline: isoIn(HOUR_MS),
    });
    const agent = await teacherAgent(app, teacher);

    const response = await agent.get('/api/quizzes');

    expect(response.body.quizzes[0].locked).toBe(true);
  });
});

describe('GET /api/quizzes/:quizId (teacher)', () => {
  it('returns the full quiz including which option is correct', async () => {
    const { app, db } = createTestApp();
    const { teacher } = setUp(db);
    const quiz = createQuizWithQuestions(db, {
      teacherId: teacher.id,
      opensAt: isoIn(-HOUR_MS),
      closesAt: isoIn(HOUR_MS),
    });
    const agent = await teacherAgent(app, teacher);

    const response = await agent.get(`/api/quizzes/${quiz.id}`);

    expect(response.status).toBe(200);
    expect(response.body.quiz.questions[0].options[0]).toHaveProperty('isCorrect');
  });

  it("rejects reading another teacher's quiz", async () => {
    const { app, db } = createTestApp();
    const { teacher, otherTeacher } = setUp(db);
    const quiz = createQuizWithQuestions(db, {
      teacherId: otherTeacher.id,
      opensAt: isoIn(-HOUR_MS),
      closesAt: isoIn(HOUR_MS),
    });
    const agent = await teacherAgent(app, teacher);

    const response = await agent.get(`/api/quizzes/${quiz.id}`);

    expect(response.status).toBe(403);
  });

  it('returns 404 for a quiz id that does not exist', async () => {
    const { app, db } = createTestApp();
    const { teacher } = setUp(db);
    const agent = await teacherAgent(app, teacher);

    const response = await agent.get('/api/quizzes/999999');

    expect(response.status).toBe(404);
  });
});

describe('PUT /api/quizzes/:quizId', () => {
  it('updates any field on an unlocked quiz', async () => {
    const { app, db } = createTestApp();
    const { classA, teacher } = setUp(db);
    const quiz = createQuizWithQuestions(db, {
      teacherId: teacher.id,
      title: 'Old title',
      timeLimitMinutes: 20,
      opensAt: isoIn(-HOUR_MS),
      closesAt: isoIn(HOUR_MS),
    });
    const agent = await teacherAgent(app, teacher);

    const response = await agent
      .put(`/api/quizzes/${quiz.id}`)
      .send({ title: 'New title', timeLimitMinutes: 30, classIds: [classA] });

    expect(response.status).toBe(200);
    expect(response.body.quiz).toMatchObject({
      title: 'New title',
      timeLimitMinutes: 30,
      classIds: [classA],
    });
  });

  it('rejects changing a locked field once a student has started an attempt', async () => {
    const { app, db } = createTestApp();
    const { teacher, student } = setUp(db);
    const quiz = createQuizWithQuestions(db, {
      teacherId: teacher.id,
      opensAt: isoIn(-HOUR_MS),
      closesAt: isoIn(HOUR_MS),
    });
    createAttempt(db, {
      quizId: quiz.id,
      studentId: student.id,
      startedAt: isoIn(0),
      deadline: isoIn(HOUR_MS),
    });
    const agent = await teacherAgent(app, teacher);

    const response = await agent.put(`/api/quizzes/${quiz.id}`).send({ timeLimitMinutes: 99 });

    expect(response.status).toBe(409);
  });

  it('still allows editing title and extending closesAt once locked', async () => {
    const { app, db } = createTestApp();
    const { teacher, student } = setUp(db);
    const quiz = createQuizWithQuestions(db, {
      teacherId: teacher.id,
      opensAt: isoIn(-HOUR_MS),
      closesAt: isoIn(HOUR_MS),
    });
    createAttempt(db, {
      quizId: quiz.id,
      studentId: student.id,
      startedAt: isoIn(0),
      deadline: isoIn(HOUR_MS),
    });
    const agent = await teacherAgent(app, teacher);
    const extendedClosesAt = isoIn(2 * HOUR_MS);

    const response = await agent
      .put(`/api/quizzes/${quiz.id}`)
      .send({ title: 'Extended', closesAt: extendedClosesAt });

    expect(response.status).toBe(200);
    expect(response.body.quiz.title).toBe('Extended');
    expect(response.body.quiz.closesAt).toBe(extendedClosesAt);
  });

  it('rejects shortening closesAt once locked', async () => {
    const { app, db } = createTestApp();
    const { teacher, student } = setUp(db);
    const quiz = createQuizWithQuestions(db, {
      teacherId: teacher.id,
      opensAt: isoIn(-HOUR_MS),
      closesAt: isoIn(HOUR_MS),
    });
    createAttempt(db, {
      quizId: quiz.id,
      studentId: student.id,
      startedAt: isoIn(0),
      deadline: isoIn(HOUR_MS),
    });
    const agent = await teacherAgent(app, teacher);

    const response = await agent
      .put(`/api/quizzes/${quiz.id}`)
      .send({ closesAt: isoIn(30 * 60 * 1000) }); // earlier than the current closesAt

    expect(response.status).toBe(422);
  });

  it('rejects an update that would put opensAt at or after closesAt', async () => {
    const { app, db } = createTestApp();
    const { teacher } = setUp(db);
    const quiz = createQuizWithQuestions(db, {
      teacherId: teacher.id,
      opensAt: isoIn(-HOUR_MS),
      closesAt: isoIn(HOUR_MS),
    });
    const agent = await teacherAgent(app, teacher);

    const response = await agent
      .put(`/api/quizzes/${quiz.id}`)
      .send({ opensAt: isoIn(2 * HOUR_MS) });

    expect(response.status).toBe(422);
  });

  it("rejects updating another teacher's quiz", async () => {
    const { app, db } = createTestApp();
    const { teacher, otherTeacher } = setUp(db);
    const quiz = createQuizWithQuestions(db, {
      teacherId: otherTeacher.id,
      opensAt: isoIn(-HOUR_MS),
      closesAt: isoIn(HOUR_MS),
    });
    const agent = await teacherAgent(app, teacher);

    const response = await agent.put(`/api/quizzes/${quiz.id}`).send({ title: 'Hijacked' });

    expect(response.status).toBe(403);
  });
});

describe('question management', () => {
  it('adds a question with exactly 4 options to an unlocked quiz', async () => {
    const { app, db } = createTestApp();
    const { teacher } = setUp(db);
    const quiz = createQuizWithQuestions(db, {
      teacherId: teacher.id,
      opensAt: isoIn(-HOUR_MS),
      closesAt: isoIn(HOUR_MS),
      questions: [],
    });
    const agent = await teacherAgent(app, teacher);

    const response = await agent
      .post(`/api/quizzes/${quiz.id}/questions`)
      .send(validQuestionPayload());

    expect(response.status).toBe(201);
    expect(response.body.question.options).toHaveLength(4);
  });

  it('rejects a question with fewer than 4 options', async () => {
    const { app, db } = createTestApp();
    const { teacher } = setUp(db);
    const quiz = createQuizWithQuestions(db, {
      teacherId: teacher.id,
      opensAt: isoIn(-HOUR_MS),
      closesAt: isoIn(HOUR_MS),
      questions: [],
    });
    const agent = await teacherAgent(app, teacher);

    const response = await agent
      .post(`/api/quizzes/${quiz.id}/questions`)
      .send(validQuestionPayload({ options: validQuestionPayload().options.slice(0, 3) }));

    expect(response.status).toBe(422);
  });

  it('rejects a question with zero correct options', async () => {
    const { app, db } = createTestApp();
    const { teacher } = setUp(db);
    const quiz = createQuizWithQuestions(db, {
      teacherId: teacher.id,
      opensAt: isoIn(-HOUR_MS),
      closesAt: isoIn(HOUR_MS),
      questions: [],
    });
    const agent = await teacherAgent(app, teacher);
    const options = validQuestionPayload().options.map((option) => ({
      ...option,
      isCorrect: false,
    }));

    const response = await agent
      .post(`/api/quizzes/${quiz.id}/questions`)
      .send(validQuestionPayload({ options }));

    expect(response.status).toBe(422);
  });

  it('rejects a question with more than one correct option', async () => {
    const { app, db } = createTestApp();
    const { teacher } = setUp(db);
    const quiz = createQuizWithQuestions(db, {
      teacherId: teacher.id,
      opensAt: isoIn(-HOUR_MS),
      closesAt: isoIn(HOUR_MS),
      questions: [],
    });
    const agent = await teacherAgent(app, teacher);
    const options = validQuestionPayload().options.map((option) => ({
      ...option,
      isCorrect: true,
    }));

    const response = await agent
      .post(`/api/quizzes/${quiz.id}/questions`)
      .send(validQuestionPayload({ options }));

    expect(response.status).toBe(422);
  });

  it('rejects adding a question once the quiz is locked', async () => {
    const { app, db } = createTestApp();
    const { teacher, student } = setUp(db);
    const quiz = createQuizWithQuestions(db, {
      teacherId: teacher.id,
      opensAt: isoIn(-HOUR_MS),
      closesAt: isoIn(HOUR_MS),
    });
    createAttempt(db, {
      quizId: quiz.id,
      studentId: student.id,
      startedAt: isoIn(0),
      deadline: isoIn(HOUR_MS),
    });
    const agent = await teacherAgent(app, teacher);

    const response = await agent
      .post(`/api/quizzes/${quiz.id}/questions`)
      .send(validQuestionPayload());

    expect(response.status).toBe(409);
  });

  it('updates an existing question', async () => {
    const { app, db } = createTestApp();
    const { teacher } = setUp(db);
    const quiz = createQuizWithQuestions(db, {
      teacherId: teacher.id,
      opensAt: isoIn(-HOUR_MS),
      closesAt: isoIn(HOUR_MS),
    });
    const agent = await teacherAgent(app, teacher);

    const response = await agent
      .put(`/api/quizzes/${quiz.id}/questions/${quiz.questions[0].id}`)
      .send(validQuestionPayload({ text: 'Updated text', points: 5 }));

    expect(response.status).toBe(200);
    expect(response.body.question).toMatchObject({ text: 'Updated text', points: 5 });
  });

  it('rejects updating a question that belongs to a different quiz', async () => {
    const { app, db } = createTestApp();
    const { teacher } = setUp(db);
    const quiz = createQuizWithQuestions(db, {
      teacherId: teacher.id,
      opensAt: isoIn(-HOUR_MS),
      closesAt: isoIn(HOUR_MS),
    });
    const otherQuiz = createQuizWithQuestions(db, {
      teacherId: teacher.id,
      opensAt: isoIn(-HOUR_MS),
      closesAt: isoIn(HOUR_MS),
    });
    const agent = await teacherAgent(app, teacher);

    const response = await agent
      .put(`/api/quizzes/${quiz.id}/questions/${otherQuiz.questions[0].id}`)
      .send(validQuestionPayload());

    expect(response.status).toBe(404);
  });

  it('deletes a question from an unlocked quiz', async () => {
    const { app, db } = createTestApp();
    const { teacher } = setUp(db);
    const quiz = createQuizWithQuestions(db, {
      teacherId: teacher.id,
      opensAt: isoIn(-HOUR_MS),
      closesAt: isoIn(HOUR_MS),
    });
    const agent = await teacherAgent(app, teacher);

    const response = await agent.delete(
      `/api/quizzes/${quiz.id}/questions/${quiz.questions[0].id}`,
    );

    expect(response.status).toBe(204);
    const row = db.prepare('SELECT * FROM questions WHERE id = ?').get(quiz.questions[0].id);
    expect(row).toBeUndefined();
  });

  it('rejects deleting a question once the quiz is locked', async () => {
    const { app, db } = createTestApp();
    const { teacher, student } = setUp(db);
    const quiz = createQuizWithQuestions(db, {
      teacherId: teacher.id,
      opensAt: isoIn(-HOUR_MS),
      closesAt: isoIn(HOUR_MS),
    });
    createAttempt(db, {
      quizId: quiz.id,
      studentId: student.id,
      startedAt: isoIn(0),
      deadline: isoIn(HOUR_MS),
    });
    const agent = await teacherAgent(app, teacher);

    const response = await agent.delete(
      `/api/quizzes/${quiz.id}/questions/${quiz.questions[0].id}`,
    );

    expect(response.status).toBe(409);
  });
});

describe('POST /api/quizzes/:quizId/publish', () => {
  it('publishes a complete quiz', async () => {
    const { app, db } = createTestApp();
    const { classA, teacher } = setUp(db);
    const quiz = createQuizWithQuestions(db, {
      teacherId: teacher.id,
      status: 'draft',
      opensAt: isoIn(-HOUR_MS),
      closesAt: isoIn(HOUR_MS),
      classIds: [classA],
    });
    const agent = await teacherAgent(app, teacher);

    const response = await agent.post(`/api/quizzes/${quiz.id}/publish`);

    expect(response.status).toBe(200);
    expect(response.body.quiz.status).toBe('published');
  });

  it('rejects publishing a quiz with no questions and lists it as a human-readable error', async () => {
    const { app, db } = createTestApp();
    const { classA, teacher } = setUp(db);
    const quiz = createQuizWithQuestions(db, {
      teacherId: teacher.id,
      status: 'draft',
      opensAt: isoIn(-HOUR_MS),
      closesAt: isoIn(HOUR_MS),
      classIds: [classA],
      questions: [],
    });
    const agent = await teacherAgent(app, teacher);

    const response = await agent.post(`/api/quizzes/${quiz.id}/publish`);

    expect(response.status).toBe(422);
    expect(response.body.error.details).toContain('The quiz must have at least one question.');
  });

  it('rejects publishing a quiz with no classes assigned', async () => {
    const { app, db } = createTestApp();
    const { teacher } = setUp(db);
    const quiz = createQuizWithQuestions(db, {
      teacherId: teacher.id,
      status: 'draft',
      opensAt: isoIn(-HOUR_MS),
      closesAt: isoIn(HOUR_MS),
      classIds: [],
    });
    const agent = await teacherAgent(app, teacher);

    const response = await agent.post(`/api/quizzes/${quiz.id}/publish`);

    expect(response.status).toBe(422);
    expect(response.body.error.details).toContain('At least one class must be assigned.');
  });

  it('is idempotent: publishing an already-published quiz just returns it', async () => {
    const { app, db } = createTestApp();
    const { classA, teacher } = setUp(db);
    const quiz = createQuizWithQuestions(db, {
      teacherId: teacher.id,
      status: 'published',
      opensAt: isoIn(-HOUR_MS),
      closesAt: isoIn(HOUR_MS),
      classIds: [classA],
    });
    const agent = await teacherAgent(app, teacher);

    const response = await agent.post(`/api/quizzes/${quiz.id}/publish`);

    expect(response.status).toBe(200);
    expect(response.body.quiz.status).toBe('published');
  });

  it("rejects publishing another teacher's quiz", async () => {
    const { app, db } = createTestApp();
    const { classA, teacher, otherTeacher } = setUp(db);
    const quiz = createQuizWithQuestions(db, {
      teacherId: otherTeacher.id,
      status: 'draft',
      opensAt: isoIn(-HOUR_MS),
      closesAt: isoIn(HOUR_MS),
      classIds: [classA],
    });
    const agent = await teacherAgent(app, teacher);

    const response = await agent.post(`/api/quizzes/${quiz.id}/publish`);

    expect(response.status).toBe(403);
  });
});

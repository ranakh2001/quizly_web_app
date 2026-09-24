import { describe, it, expect } from 'vitest';
import ExcelJS from 'exceljs';
import { createTestApp } from '../helpers/createTestApp.js';
import { createClass, createUser } from '../helpers/factories.js';
import { loginAgent } from '../helpers/auth.js';

function toBase64(content) {
  return Buffer.from(content, 'utf8').toString('base64');
}

async function adminAgent(app, admin) {
  return loginAgent(app, { username: admin.username, password: admin.password });
}

function setUp(db) {
  const classA = createClass(db, '10A');
  const admin = createUser(db, { role: 'admin', name: 'Nour', username: 'admin' });
  const teacher = createUser(db, { role: 'teacher', name: 'Teacher', username: 'teacher1' });
  return { classA, admin, teacher };
}

describe('POST /api/admin/imports/students', () => {
  it('creates new students from a valid CSV', async () => {
    const { app, db } = createTestApp();
    const { admin } = setUp(db);
    const csv = 'name,student_code,class,password\nJad Kareem,s10a30,10A,demo1234\n';
    const agent = await adminAgent(app, admin);

    const response = await agent
      .post('/api/admin/imports/students')
      .send({ filename: 'students.csv', contentBase64: toBase64(csv) });

    expect(response.status).toBe(200);
    expect(response.body.report).toMatchObject({ createdCount: 1, updatedCount: 0, rejected: [] });
    const row = db.prepare("SELECT * FROM users WHERE student_code = 's10a30'").get();
    expect(row.name).toBe('Jad Kareem');
  });

  it('upserts an existing student matched by student_code', async () => {
    const { app, db } = createTestApp();
    const { classA, admin } = setUp(db);
    createUser(db, { role: 'student', name: 'Old Name', studentCode: 's10a31', classId: classA });
    const csv = 'name,student_code,class,password\nNew Name,s10a31,10A,newpass1\n';
    const agent = await adminAgent(app, admin);

    const response = await agent
      .post('/api/admin/imports/students')
      .send({ filename: 'students.csv', contentBase64: toBase64(csv) });

    expect(response.body.report).toMatchObject({ createdCount: 0, updatedCount: 1 });
    const row = db.prepare("SELECT * FROM users WHERE student_code = 's10a31'").get();
    expect(row.name).toBe('New Name');
  });

  it('rejects a row with an unknown class but still imports the valid rows', async () => {
    const { app, db } = createTestApp();
    const { admin } = setUp(db);
    const csv = [
      'name,student_code,class,password',
      'Good Row,s10a32,10A,demo1234',
      'Bad Row,s10a33,99Z,demo1234',
    ].join('\n');
    const agent = await adminAgent(app, admin);

    const response = await agent
      .post('/api/admin/imports/students')
      .send({ filename: 'students.csv', contentBase64: toBase64(csv) });

    expect(response.body.report.createdCount).toBe(1);
    expect(response.body.report.rejected).toEqual([{ row: 3, reason: 'Unknown class "99Z"' }]);
    expect(db.prepare("SELECT * FROM users WHERE student_code = 's10a33'").get()).toBeUndefined();
  });

  it('rejects a row missing a required field', async () => {
    const { app, db } = createTestApp();
    const { admin } = setUp(db);
    const csv = 'name,student_code,class,password\n,s10a34,10A,demo1234\n';
    const agent = await adminAgent(app, admin);

    const response = await agent
      .post('/api/admin/imports/students')
      .send({ filename: 'students.csv', contentBase64: toBase64(csv) });

    expect(response.body.report.rejected).toEqual([
      { row: 2, reason: 'Missing required field(s)' },
    ]);
  });

  it('rejects the whole file and saves nothing when a required column is missing', async () => {
    const { app, db } = createTestApp();
    const { admin } = setUp(db);
    const csv = 'name,student_code,password\nJad Kareem,s10a35,demo1234\n'; // missing "class"
    const agent = await adminAgent(app, admin);

    const response = await agent
      .post('/api/admin/imports/students')
      .send({ filename: 'students.csv', contentBase64: toBase64(csv) });

    expect(response.status).toBe(400);
    expect(db.prepare("SELECT * FROM users WHERE student_code = 's10a35'").get()).toBeUndefined();
  });

  it('handles a UTF-8 BOM-prefixed CSV with Arabic names', async () => {
    const { app, db } = createTestApp();
    const { admin } = setUp(db);
    const bom = '﻿';
    const csv = `${bom}name,student_code,class,password\nسارة الحمصي,s10a36,10A,demo1234\n`;
    const agent = await adminAgent(app, admin);

    const response = await agent
      .post('/api/admin/imports/students')
      .send({ filename: 'students.csv', contentBase64: toBase64(csv) });

    expect(response.body.report.createdCount).toBe(1);
    const row = db.prepare("SELECT * FROM users WHERE student_code = 's10a36'").get();
    expect(row.name).toBe('سارة الحمصي');
  });

  it('imports from an .xlsx file', async () => {
    const { app, db } = createTestApp();
    const { admin } = setUp(db);
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Students');
    sheet.addRow(['name', 'student_code', 'class', 'password']);
    sheet.addRow(['Xlsx Student', 's10a37', '10A', 'demo1234']);
    const buffer = await workbook.xlsx.writeBuffer();
    const agent = await adminAgent(app, admin);

    const response = await agent
      .post('/api/admin/imports/students')
      .send({ filename: 'students.xlsx', contentBase64: Buffer.from(buffer).toString('base64') });

    expect(response.body.report.createdCount).toBe(1);
    const row = db.prepare("SELECT * FROM users WHERE student_code = 's10a37'").get();
    expect(row.name).toBe('Xlsx Student');
  });

  it('rejects a non-admin role', async () => {
    const { app, db } = createTestApp();
    const { teacher } = setUp(db);
    const agent = await loginAgent(app, { username: teacher.username, password: teacher.password });

    const response = await agent
      .post('/api/admin/imports/students')
      .send({
        filename: 'students.csv',
        contentBase64: toBase64('name,student_code,class,password\n'),
      });

    expect(response.status).toBe(403);
  });
});

describe('POST /api/admin/imports/teachers', () => {
  it('creates new teachers from a valid CSV', async () => {
    const { app, db } = createTestApp();
    const { admin } = setUp(db);
    const csv = 'name,username,password\nNew Teacher,newteacher,teachpass1\n';
    const agent = await adminAgent(app, admin);

    const response = await agent
      .post('/api/admin/imports/teachers')
      .send({ filename: 'teachers.csv', contentBase64: toBase64(csv) });

    expect(response.body.report).toMatchObject({ createdCount: 1, updatedCount: 0 });
    const row = db.prepare("SELECT * FROM users WHERE username = 'newteacher'").get();
    expect(row.role).toBe('teacher');
  });

  it('upserts an existing teacher matched by username', async () => {
    const { app, db } = createTestApp();
    const { admin } = setUp(db);
    createUser(db, { role: 'teacher', name: 'Old Name', username: 'teach2' });
    const csv = 'name,username,password\nUpdated Name,teach2,teachpass2\n';
    const agent = await adminAgent(app, admin);

    const response = await agent
      .post('/api/admin/imports/teachers')
      .send({ filename: 'teachers.csv', contentBase64: toBase64(csv) });

    expect(response.body.report).toMatchObject({ createdCount: 0, updatedCount: 1 });
    const row = db.prepare("SELECT * FROM users WHERE username = 'teach2'").get();
    expect(row.name).toBe('Updated Name');
  });

  it('rejects the whole file when required columns are missing', async () => {
    const { app, db } = createTestApp();
    const { admin } = setUp(db);
    const csv = 'name,password\nNo Username,pass1234\n';
    const agent = await adminAgent(app, admin);

    const response = await agent
      .post('/api/admin/imports/teachers')
      .send({ filename: 'teachers.csv', contentBase64: toBase64(csv) });

    expect(response.status).toBe(400);
  });
});

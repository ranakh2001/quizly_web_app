import { describe, it, expect, vi } from 'vitest';
import { createConnection } from '../../src/db/connection.js';
import { runMigrations } from '../../src/db/migrate.js';
import { createUser } from '../helpers/factories.js';
import { requireAuth, requireRole } from '../../src/modules/auth/auth.middleware.js';
import * as authService from '../../src/modules/auth/auth.service.js';

function setUpDb() {
  const db = createConnection(':memory:');
  runMigrations(db);
  return db;
}

describe('requireAuth', () => {
  it('rejects the request when no session cookie is present', () => {
    const req = { db: setUpDb(), cookies: {} };
    const next = vi.fn();

    requireAuth(req, {}, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 401 }));
  });

  it('attaches req.user and calls next() with a valid session token', () => {
    const db = setUpDb();
    const teacher = createUser(db, { role: 'teacher', name: 'Teacher One', username: 'teacher1' });
    const { token } = authService.login(db, { username: 'teacher1', password: teacher.password });
    const req = { db, cookies: { session: token } };
    const next = vi.fn();

    requireAuth(req, {}, next);

    expect(next).toHaveBeenCalledWith();
    expect(req.user).toMatchObject({ role: 'teacher', username: 'teacher1' });
  });
});

describe('requireRole', () => {
  it('calls next() when the user has one of the allowed roles', () => {
    const req = { user: { role: 'teacher' } };
    const next = vi.fn();

    requireRole('teacher', 'admin')(req, {}, next);

    expect(next).toHaveBeenCalledWith();
  });

  it('rejects a student from a teacher-only route with a 403', () => {
    const req = { user: { role: 'student' } };
    const next = vi.fn();

    requireRole('teacher', 'admin')(req, {}, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 403 }));
  });
});

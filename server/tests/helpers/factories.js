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

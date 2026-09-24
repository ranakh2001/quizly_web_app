// SQL only, always parameterised - no business logic here (see CLAUDE.md).

export function mapClassNamesToIds(db) {
  const rows = db.prepare('SELECT id, name FROM classes').all();
  return new Map(rows.map((row) => [row.name.toLowerCase(), row.id]));
}

export function findStudentByCode(db, studentCode) {
  return db
    .prepare("SELECT id FROM users WHERE role = 'student' AND student_code = ?")
    .get(studentCode);
}

export function insertStudent(db, { name, studentCode, classId, passwordHash }) {
  db.prepare(
    "INSERT INTO users (role, name, student_code, class_id, password_hash) VALUES ('student', ?, ?, ?, ?)",
  ).run(name, studentCode, classId, passwordHash);
}

export function updateStudent(db, id, { name, classId, passwordHash }) {
  db.prepare('UPDATE users SET name = ?, class_id = ?, password_hash = ? WHERE id = ?').run(
    name,
    classId,
    passwordHash,
    id,
  );
}

export function findTeacherByUsername(db, username) {
  return db.prepare("SELECT id FROM users WHERE role = 'teacher' AND username = ?").get(username);
}

export function insertTeacher(db, { name, username, passwordHash }) {
  db.prepare(
    "INSERT INTO users (role, name, username, password_hash) VALUES ('teacher', ?, ?, ?)",
  ).run(name, username, passwordHash);
}

export function updateTeacher(db, id, { name, passwordHash }) {
  db.prepare('UPDATE users SET name = ?, password_hash = ? WHERE id = ?').run(
    name,
    passwordHash,
    id,
  );
}

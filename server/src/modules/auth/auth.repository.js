// SQL only, always parameterised - no business logic here (see CLAUDE.md).

export function findByUsername(db, username) {
  return mapRow(db.prepare('SELECT * FROM users WHERE username = ?').get(username));
}

export function findByStudentCode(db, studentCode) {
  return mapRow(db.prepare('SELECT * FROM users WHERE student_code = ?').get(studentCode));
}

export function findById(db, id) {
  return mapRow(db.prepare('SELECT * FROM users WHERE id = ?').get(id));
}

function mapRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    role: row.role,
    name: row.name,
    username: row.username,
    studentCode: row.student_code,
    classId: row.class_id,
    passwordHash: row.password_hash,
  };
}

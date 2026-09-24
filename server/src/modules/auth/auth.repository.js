// SQL only, always parameterised - no business logic here (see CLAUDE.md).

const SELECT_WITH_CLASS = `SELECT u.*, c.name AS class_name FROM users u
   LEFT JOIN classes c ON c.id = u.class_id`;

export function findByUsername(db, username) {
  return mapRow(db.prepare(`${SELECT_WITH_CLASS} WHERE u.username = ?`).get(username));
}

export function findByStudentCode(db, studentCode) {
  return mapRow(db.prepare(`${SELECT_WITH_CLASS} WHERE u.student_code = ?`).get(studentCode));
}

export function findById(db, id) {
  return mapRow(db.prepare(`${SELECT_WITH_CLASS} WHERE u.id = ?`).get(id));
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
    className: row.class_name,
    passwordHash: row.password_hash,
  };
}

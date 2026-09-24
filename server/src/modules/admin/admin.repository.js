// SQL only, always parameterised - no business logic here (see CLAUDE.md).

export function countUsersByRole(db, role) {
  return db.prepare('SELECT COUNT(*) AS count FROM users WHERE role = ?').get(role).count;
}

export function countQuizzes(db) {
  return db.prepare('SELECT COUNT(*) AS count FROM quizzes').get().count;
}

export function countClasses(db) {
  return db.prepare('SELECT COUNT(*) AS count FROM classes').get().count;
}

// Average percentage score (score / max_score) across every finalised attempt by students
// in each class, over all quizzes - not just one.
export function averageScoreByClass(db) {
  return db
    .prepare(
      `SELECT c.id AS class_id, c.name AS class_name,
              AVG(CASE WHEN a.max_score > 0 THEN (a.score * 100.0 / a.max_score) END) AS average_percent,
              COUNT(a.id) AS attempts_count
       FROM classes c
       LEFT JOIN users u ON u.class_id = c.id AND u.role = 'student'
       LEFT JOIN attempts a ON a.student_id = u.id AND a.status IN ('submitted', 'auto_submitted')
       GROUP BY c.id, c.name
       ORDER BY c.name`,
    )
    .all();
}

export function recentQuizzes(db, limit) {
  return db
    .prepare(
      `SELECT q.id, q.title, q.status, q.closes_at, q.created_at, t.name AS teacher_name,
              (SELECT GROUP_CONCAT(c.name, ', ')
                 FROM quiz_class qc JOIN classes c ON c.id = qc.class_id
                WHERE qc.quiz_id = q.id) AS class_names,
              (SELECT COUNT(*) FROM attempts a
                WHERE a.quiz_id = q.id AND a.status IN ('submitted', 'auto_submitted')) AS submitted_count
       FROM quizzes q
       JOIN users t ON t.id = q.teacher_id
       ORDER BY q.created_at DESC
       LIMIT ?`,
    )
    .all(limit);
}

export function insertAuditLog(db, { actorId, action, targetType, targetId, reason }) {
  db.prepare(
    'INSERT INTO audit_log (actor_id, action, target_type, target_id, reason) VALUES (?, ?, ?, ?, ?)',
  ).run(actorId, action, targetType, targetId, reason);
}

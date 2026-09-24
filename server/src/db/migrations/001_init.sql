-- Core schema for Quizly. All timestamps are stored as UTC ISO-8601 strings; the client
-- converts to Asia/Amman for display (see client/src/lib/time.js). Enum-like columns use
-- CHECK constraints whose values mirror server/src/constants.js by hand, since SQL can't
-- import JS constants.

CREATE TABLE classes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE
);

-- Students, teachers and admin share one table (role tells them apart) because they share
-- the same login/session machinery. Students log in with student_code, staff with username;
-- exactly one of the two is set, enforced in the service layer (SQLite UNIQUE allows many NULLs).
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  role TEXT NOT NULL CHECK (role IN ('student', 'teacher', 'admin')),
  name TEXT NOT NULL,
  username TEXT UNIQUE,
  student_code TEXT UNIQUE,
  class_id INTEGER REFERENCES classes(id),
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_users_class_id ON users(class_id);

CREATE TABLE quizzes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  teacher_id INTEGER NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  language TEXT NOT NULL CHECK (language IN ('ar', 'en')),
  time_limit_minutes INTEGER NOT NULL DEFAULT 20,
  opens_at TEXT NOT NULL,
  closes_at TEXT NOT NULL,
  negative_marking INTEGER NOT NULL DEFAULT 0 CHECK (negative_marking IN (0, 1)),
  penalty_ratio REAL NOT NULL DEFAULT 0.25,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_quizzes_teacher_id ON quizzes(teacher_id);

-- Which classes a quiz is assigned to. A student can only start a quiz whose class list
-- includes their own class_id.
CREATE TABLE quiz_class (
  quiz_id INTEGER NOT NULL REFERENCES quizzes(id),
  class_id INTEGER NOT NULL REFERENCES classes(id),
  PRIMARY KEY (quiz_id, class_id)
);

CREATE INDEX idx_quiz_class_class_id ON quiz_class(class_id);

CREATE TABLE questions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  quiz_id INTEGER NOT NULL REFERENCES quizzes(id),
  text TEXT NOT NULL,
  points INTEGER NOT NULL CHECK (points > 0),
  order_index INTEGER NOT NULL
);

CREATE INDEX idx_questions_quiz_id ON questions(quiz_id);

-- Exactly 4 options with exactly 1 correct per question is a publish-time business rule,
-- not something SQLite CHECK can express across rows, so it's enforced in quizzes.service.js.
CREATE TABLE options (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  question_id INTEGER NOT NULL REFERENCES questions(id),
  text TEXT NOT NULL,
  is_correct INTEGER NOT NULL DEFAULT 0 CHECK (is_correct IN (0, 1)),
  order_index INTEGER NOT NULL
);

CREATE INDEX idx_options_question_id ON options(question_id);

-- UNIQUE(quiz_id, student_id) is what makes "one attempt per student" and "start is
-- idempotent" enforceable with a single INSERT ... ON CONFLICT in the repository.
CREATE TABLE attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  quiz_id INTEGER NOT NULL REFERENCES quizzes(id),
  student_id INTEGER NOT NULL REFERENCES users(id),
  started_at TEXT NOT NULL,
  deadline TEXT NOT NULL,
  submitted_at TEXT,
  status TEXT NOT NULL DEFAULT 'in_progress'
    CHECK (status IN ('in_progress', 'submitted', 'auto_submitted')),
  score REAL,
  max_score REAL,
  UNIQUE (quiz_id, student_id)
);

CREATE INDEX idx_attempts_student_id ON attempts(student_id);

-- UNIQUE(attempt_id, question_id) is what makes "answering again overwrites" a plain
-- INSERT ... ON CONFLICT DO UPDATE instead of a separate lookup-then-update.
CREATE TABLE answers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  attempt_id INTEGER NOT NULL REFERENCES attempts(id),
  question_id INTEGER NOT NULL REFERENCES questions(id),
  option_id INTEGER NOT NULL REFERENCES options(id),
  answered_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (attempt_id, question_id)
);

CREATE INDEX idx_answers_attempt_id ON answers(attempt_id);

-- Records admin actions that need a paper trail, starting with attempt resets (reason required).
CREATE TABLE audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actor_id INTEGER NOT NULL REFERENCES users(id),
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id INTEGER NOT NULL,
  reason TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_audit_log_target ON audit_log(target_type, target_id);

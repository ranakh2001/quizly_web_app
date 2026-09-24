import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import { getConnection } from './connection.js';
import { createRng, randomInt, pick, shuffle, chance } from './seedData/rng.js';
import { generatePersonName, ADMIN, TEACHERS } from './seedData/names.js';
import {
  generateMathQuestions,
  scienceQuestions,
  historyQuestions,
  chemistryQuestions,
  arabicQuestions,
} from './seedData/questionBanks.js';
import { scoreAttempt } from '../domain/scoring.js';
import { computeDeadline } from '../domain/deadline.js';
import { DEFAULT_PENALTY_RATIO } from '../constants.js';
import logger from '../shared/logger.js';

// Fixed seed so `npm run seed` / `npm run reset-db` always produce the same demo data -
// the README's demo logins and quiz states (open/upcoming/closed/draft) stay accurate.
const RNG_SEED = 42;

const STUDENT_PASSWORD = 'student123';
const TEACHER_PASSWORD = 'teacher123';
const ADMIN_PASSWORD = 'admin123';

const CLASS_NAMES = ['10A', '10B', '11A'];
const STUDENTS_PER_CLASS = 20;
const DAY_MS = 24 * 60 * 60 * 1000;

export function seed(db = getConnection()) {
  const alreadySeeded = db.prepare('SELECT COUNT(*) AS count FROM users').get().count > 0;
  if (alreadySeeded) {
    logger.info('seed: database already has data, skipping');
    return;
  }

  const rng = createRng(RNG_SEED);
  const now = Date.now();

  db.transaction(() => {
    const classIds = insertClasses(db);
    insertAdmin(db);
    const teacherIds = insertTeachers(db);
    const studentsByClass = insertStudents(db, rng, classIds);

    const algebra = insertQuizWithQuestions(db, rng, {
      teacherId: teacherIds[0],
      title: 'Algebra Warm-up',
      language: 'en',
      timeLimitMinutes: 25,
      opensAt: addDays(now, -2),
      closesAt: addDays(now, 5),
      negativeMarking: true,
      penaltyRatio: DEFAULT_PENALTY_RATIO,
      status: 'published',
      classIds: [classIds['10A'], classIds['10B']],
      questions: generateMathQuestions(rng, 15),
    });

    insertQuizWithQuestions(db, rng, {
      teacherId: teacherIds[1],
      title: 'General Science Quiz',
      language: 'en',
      timeLimitMinutes: 20,
      opensAt: addDays(now, -1),
      closesAt: addDays(now, 3),
      negativeMarking: false,
      penaltyRatio: DEFAULT_PENALTY_RATIO,
      status: 'published',
      classIds: [classIds['11A']],
      questions: scienceQuestions(rng),
    });

    insertQuizWithQuestions(db, rng, {
      teacherId: teacherIds[0],
      title: 'World History Trivia',
      language: 'en',
      timeLimitMinutes: 20,
      opensAt: addDays(now, 2),
      closesAt: addDays(now, 9),
      negativeMarking: false,
      penaltyRatio: DEFAULT_PENALTY_RATIO,
      status: 'published',
      classIds: [classIds['10A']],
      questions: historyQuestions(rng),
    });

    const arabic = insertQuizWithQuestions(db, rng, {
      teacherId: teacherIds[2],
      title: 'اختبار قواعد اللغة العربية',
      language: 'ar',
      timeLimitMinutes: 15,
      opensAt: addDays(now, -14),
      closesAt: addDays(now, -7),
      negativeMarking: true,
      penaltyRatio: 0.5,
      status: 'published',
      classIds: [classIds['10B'], classIds['11A']],
      questions: arabicQuestions(rng),
    });

    insertQuizWithQuestions(db, rng, {
      teacherId: teacherIds[3],
      title: 'Chemistry Fundamentals',
      language: 'en',
      timeLimitMinutes: 20,
      opensAt: addDays(now, 1),
      closesAt: addDays(now, 8),
      negativeMarking: false,
      penaltyRatio: DEFAULT_PENALTY_RATIO,
      status: 'draft',
      classIds: [classIds['10A']],
      questions: chemistryQuestions(rng),
    });

    seedAttemptsForOpenQuiz(db, rng, {
      quiz: algebra,
      students: [...studentsByClass['10A'], ...studentsByClass['10B']],
    });

    seedAttemptsForClosedQuiz(db, rng, {
      quiz: arabic,
      students: [...studentsByClass['10B'], ...studentsByClass['11A']],
    });
  })();

  logger.info('seed: database populated with demo data');
}

function addDays(baseMs, days) {
  return new Date(baseMs + days * DAY_MS).toISOString();
}

function insertClasses(db) {
  const insert = db.prepare('INSERT INTO classes (name) VALUES (?)');
  const ids = {};
  for (const name of CLASS_NAMES) {
    ids[name] = insert.run(name).lastInsertRowid;
  }
  return ids;
}

function insertAdmin(db) {
  const passwordHash = bcrypt.hashSync(ADMIN_PASSWORD, 10);
  db.prepare('INSERT INTO users (role, name, username, password_hash) VALUES (?, ?, ?, ?)').run(
    'admin',
    ADMIN.name,
    ADMIN.username,
    passwordHash,
  );
}

function insertTeachers(db) {
  const passwordHash = bcrypt.hashSync(TEACHER_PASSWORD, 10);
  const insert = db.prepare(
    'INSERT INTO users (role, name, username, password_hash) VALUES (?, ?, ?, ?)',
  );
  return TEACHERS.map(
    (teacher) =>
      insert.run('teacher', teacher.name, teacher.username, passwordHash).lastInsertRowid,
  );
}

function insertStudents(db, rng, classIds) {
  const passwordHash = bcrypt.hashSync(STUDENT_PASSWORD, 10);
  const insert = db.prepare(
    'INSERT INTO users (role, name, student_code, class_id, password_hash) VALUES (?, ?, ?, ?, ?)',
  );

  const studentsByClass = {};
  for (const className of CLASS_NAMES) {
    const prefix = `s${className.toLowerCase()}`;
    const students = [];
    for (let i = 1; i <= STUDENTS_PER_CLASS; i += 1) {
      const studentCode = `${prefix}${String(i).padStart(2, '0')}`;
      const name = generatePersonName(rng);
      const id = insert.run(
        'student',
        name,
        studentCode,
        classIds[className],
        passwordHash,
      ).lastInsertRowid;
      students.push({ id, studentCode, classId: classIds[className] });
    }
    studentsByClass[className] = students;
  }
  return studentsByClass;
}

// Inserts a quiz, its class assignments and its questions/options, and returns everything
// the attempt-seeding helpers need (question ids, option ids and which option is correct).
function insertQuizWithQuestions(db, rng, config) {
  const quizId = db
    .prepare(
      `INSERT INTO quizzes
        (teacher_id, title, language, time_limit_minutes, opens_at, closes_at, negative_marking, penalty_ratio, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      config.teacherId,
      config.title,
      config.language,
      config.timeLimitMinutes,
      config.opensAt,
      config.closesAt,
      config.negativeMarking ? 1 : 0,
      config.penaltyRatio,
      config.status,
    ).lastInsertRowid;

  const linkClass = db.prepare('INSERT INTO quiz_class (quiz_id, class_id) VALUES (?, ?)');
  for (const classId of config.classIds) {
    linkClass.run(quizId, classId);
  }

  const insertQuestion = db.prepare(
    'INSERT INTO questions (quiz_id, text, points, order_index) VALUES (?, ?, ?, ?)',
  );
  const insertOption = db.prepare(
    'INSERT INTO options (question_id, text, is_correct, order_index) VALUES (?, ?, ?, ?)',
  );

  const questions = config.questions.map((question, questionIndex) => {
    const questionId = insertQuestion.run(
      quizId,
      question.text,
      question.points,
      questionIndex,
    ).lastInsertRowid;

    const options = question.options.map((option, optionIndex) => ({
      id: insertOption.run(questionId, option.text, option.isCorrect ? 1 : 0, optionIndex)
        .lastInsertRowid,
      isCorrect: option.isCorrect,
    }));

    return { id: questionId, points: question.points, options };
  });

  return {
    id: quizId,
    timeLimitMinutes: config.timeLimitMinutes,
    opensAt: config.opensAt,
    closesAt: config.closesAt,
    negativeMarking: config.negativeMarking,
    penaltyRatio: config.penaltyRatio,
    questions,
  };
}

// For each question, randomly skip it, answer it correctly, or answer it wrong - so seeded
// attempts show a realistic mix of scores instead of everyone getting a perfect score.
function simulateAnswers(rng, questions, { correctChance, skipChance }) {
  const answers = [];
  for (const question of questions) {
    if (chance(rng, skipChance)) continue;

    const answerCorrectly = chance(rng, correctChance);
    const wrongOptions = question.options.filter((option) => !option.isCorrect);
    const option = answerCorrectly
      ? question.options.find((o) => o.isCorrect)
      : pick(rng, wrongOptions);

    answers.push({ questionId: question.id, optionId: option.id, isCorrect: option.isCorrect });
  }
  return answers;
}

function insertAttempt(db, { quiz, student, startedAt, status, submittedAt, answers }) {
  const deadline = computeDeadline(startedAt, quiz.timeLimitMinutes, quiz.closesAt);

  const attemptId = db
    .prepare(
      `INSERT INTO attempts (quiz_id, student_id, started_at, deadline, submitted_at, status, score, max_score)
       VALUES (?, ?, ?, ?, ?, ?, NULL, NULL)`,
    )
    .run(quiz.id, student.id, startedAt, deadline, submittedAt ?? null, status).lastInsertRowid;

  const insertAnswer = db.prepare(
    'INSERT INTO answers (attempt_id, question_id, option_id) VALUES (?, ?, ?)',
  );
  for (const answer of answers) {
    insertAnswer.run(attemptId, answer.questionId, answer.optionId);
  }

  if (status === 'in_progress') return;

  const { score, maxScore } = scoreAttempt({
    questions: quiz.questions,
    answers,
    negativeMarking: quiz.negativeMarking,
    penaltyRatio: quiz.penaltyRatio,
  });
  db.prepare('UPDATE attempts SET score = ?, max_score = ? WHERE id = ?').run(
    score,
    maxScore,
    attemptId,
  );
}

// A handful of students already interacting with the still-open quiz: some mid-attempt,
// some already submitted, so the teacher results screen has something to show immediately.
function seedAttemptsForOpenQuiz(db, rng, { quiz, students }) {
  const participants = shuffle(rng, students).slice(0, 6);
  const opensMs = new Date(quiz.opensAt).getTime();
  const nowMs = Date.now();

  participants.forEach((student, index) => {
    const startedAt = new Date(randomInt(rng, opensMs, nowMs)).toISOString();
    const answers = simulateAnswers(rng, quiz.questions, { correctChance: 0.65, skipChance: 0.1 });

    if (index % 2 === 1) {
      insertAttempt(db, {
        quiz,
        student,
        startedAt,
        status: 'in_progress',
        submittedAt: null,
        answers,
      });
      return;
    }

    const deadlineMs = new Date(
      computeDeadline(startedAt, quiz.timeLimitMinutes, quiz.closesAt),
    ).getTime();
    const submittedAt = new Date(
      randomInt(rng, new Date(startedAt).getTime(), deadlineMs),
    ).toISOString();
    insertAttempt(db, { quiz, student, startedAt, status: 'submitted', submittedAt, answers });
  });
}

// A closed quiz needs a realistic mix of students who submitted in time and students who
// ran out of the grace period and were auto-submitted instead.
function seedAttemptsForClosedQuiz(db, rng, { quiz, students }) {
  const participants = shuffle(rng, students).slice(0, 8);
  const opensMs = new Date(quiz.opensAt).getTime();
  const closesMs = new Date(quiz.closesAt).getTime();
  const latestStartMs = Math.max(opensMs, closesMs - quiz.timeLimitMinutes * 60 * 1000);

  participants.forEach((student, index) => {
    const startedAt = new Date(randomInt(rng, opensMs, latestStartMs)).toISOString();
    const deadline = computeDeadline(startedAt, quiz.timeLimitMinutes, quiz.closesAt);

    if (index % 3 === 0) {
      const answers = simulateAnswers(rng, quiz.questions, {
        correctChance: 0.55,
        skipChance: 0.4,
      });
      insertAttempt(db, {
        quiz,
        student,
        startedAt,
        status: 'auto_submitted',
        submittedAt: deadline,
        answers,
      });
      return;
    }

    const answers = simulateAnswers(rng, quiz.questions, { correctChance: 0.7, skipChance: 0.05 });
    const deadlineMs = new Date(deadline).getTime();
    const submittedAt = new Date(
      randomInt(rng, new Date(startedAt).getTime(), deadlineMs),
    ).toISOString();
    insertAttempt(db, { quiz, student, startedAt, status: 'submitted', submittedAt, answers });
  });
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  seed();
}

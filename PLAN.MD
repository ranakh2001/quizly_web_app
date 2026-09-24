You are building "Quizly", a timed online quiz web app for Nour's Tutoring Centre (Amman).
This is a 24-hour take-home assessment. The reviewers will clone the repo, run it with ONE command,
read the code, run the tests, and actively try to break it. Correctness and clarity beat features.

Read REQUIREMENTS.md in the repo root first. It is the source of truth for scope, business rules
and assumptions. If something here conflicts with it, REQUIREMENTS.md wins; tell me about the conflict.

## About me
I am a Flutter developer and I am NEW to React. Keep the frontend simple and idiomatic
(function components + hooks, no clever abstractions). After each phase, give me a short
plain-English summary of what each new file does so I can explain it in the interview.

## Stack (do not change without asking)
- Node.js 22 (already installed), npm workspaces monorepo: /server and /client
- Server: Express, JavaScript (ESM), better-sqlite3 with plain SQL migrations (no ORM),
  zod for validation, bcryptjs for passwords, httpOnly cookie session (signed JWT),
  exceljs + csv-parse for imports, Vitest + supertest for tests
- Client: Vite + React + React Router, plain CSS with CSS variables (no UI library),
  a tiny custom i18n (ar/en dictionaries + React context), fetch wrapper for the API
- Production mode: Express serves the built client on http://localhost:3000

## One-command run (hard requirement)
Root package.json scripts:
- `npm run setup`  -> install all workspaces, run migrations, seed the database
- `npm start`      -> build client and start server on port 3000
- `npm run dev`    -> server + Vite dev server with proxy (for me)
- `npm test`       -> all server tests
- `npm run reset-db` -> delete DB, migrate, seed
Also add a docker-compose.yml as an optional alternative, but SQLite + npm must work without Docker.

## Non-negotiable business rules (enforce on the SERVER, never trust the client)
1. Roles: student, teacher, admin (Nour). Students log in with student_code + password,
   teachers/admin with username + password. Every route checks role AND ownership
   (teacher sees only own quizzes; student sees only quizzes assigned to own class).
2. One attempt per (quiz, student): UNIQUE(quiz_id, student_id). Start is idempotent:
   refresh / second tab / second device returns the SAME attempt. Starting counts as the attempt.
   Only admin can reset an attempt (reason required, written to audit_log).
3. A quiz can be started only if: published, student's class assigned, opens_at <= now < closes_at.
4. deadline = min(started_at + time_limit, closes_at). Store all times in UTC; display Asia/Amman.
5. The client timer counts down to the server deadline using server time
   (API returns server_now so the client computes the offset; device clock is ignored).
6. Answers are saved one at a time (PUT per question) and accepted until deadline + 30s grace.
   After that: 409. Changing an answer before the deadline overwrites it. UNIQUE(attempt_id, question_id).
7. Auto-submit: if the deadline + grace passed and the attempt is not submitted, it is finalised
   and scored on the next read of it (no cron needed). Status becomes "auto_submitted".
8. Submit is idempotent (double click = one submission). After submit, answers are read-only.
9. Correct answers (is_correct) are NEVER sent to students while the quiz is open.
   Students see their score immediately; the per-question review unlocks only after closes_at.
10. Scoring: correct = +points; wrong = 0, or -(points * penalty_ratio) if negative marking is on;
    unanswered = 0 always; total floored at 0; max = sum of points. penalty_ratio is per quiz
    (default 0.25). Put scoring in ONE pure function with thorough unit tests.
11. Quiz: title, language (ar/en), time_limit_minutes (default 20), opens_at, closes_at,
    classes, negative_marking, penalty_ratio, status draft/published. Questions have points > 0
    and EXACTLY 4 options with exactly ONE correct. Publish validates all of this and returns
    a list of human-readable errors. After the first attempt starts, questions/options/scoring
    are locked; only title and closes_at (extend only) stay editable.
12. Imports (admin): students (name, student_code, class, password) and teachers
    (name, username, password) from .xlsx or .csv (UTF-8, with or without BOM, Arabic names).
    Upsert by student_code / username (no duplicates). Validate everything first; return a report:
    created / updated / rejected rows with row number and reason. Unknown class = rejected row.
    A file with wrong headers is rejected entirely and saves nothing.
    Teachers can import quiz questions (question, option_a..option_d, correct, points).
13. Results: teacher (own quizzes) and admin (all): per-student status
    (not_started / in_progress / submitted / auto_submitted), score, time taken, filter by class,
    per-question correct rate, CSV export (UTF-8 with BOM so Arabic opens in Excel).
14. Security basics: rate-limit login (e.g. 5 failures -> short lockout), generic login error,
    passwords hashed, input validated with zod, parameterised SQL only, consistent JSON errors.

## Data model
users, classes, quizzes, quiz_class, questions, options, attempts, answers, audit_log
(see REQUIREMENTS.md for columns). Add indexes and the UNIQUE constraints above.

## Seed data
- Admin: Nour. 4 teachers. Classes 10A, 10B, 11A with ~20 students each, realistic Arabic names.
- 5 quizzes covering every state relative to "now" at seed time: one OPEN with negative marking,
  one OPEN without, one UPCOMING, one CLOSED with submitted + auto-submitted attempts, one DRAFT.
  At least one quiz fully in Arabic, 15 questions each, varied points.
- Predictable logins documented in README (e.g. admin / admin123, teacher usernames,
  student codes s10a01..., one shared demo password).

## UI (follow this design system)
Dark gradient canvas: linear-gradient(135deg, #1E1B4B, #4C1D95 55%, #0F766E).
Accents: primary #14B8A6 (text on it #042F2E), warning #F59E0B, danger #F43F5E
(destructive buttons #E11D48 + white text), success #10B981, info #A855F7.
Font: Cairo (self-host or Google Fonts with fallback). Glass surfaces:
rgba(255,255,255,.12), backdrop-filter: blur(24px), 1px border rgba(255,255,255,.22), radius 20,
with @supports fallback to rgba(30,27,75,.88). Use glass only for cards, top bars, dialogs, sheets.
Answer options are SOLID white tiles (no blur), states: idle / selected / correct / wrong / disabled.
Timer: teal > 5 min, amber <= 5 min, rose <= 1 min, aria-live announcements.
Mobile-first (390px) for students, desktop sidebar layout for teacher/admin.
Arabic UI is RTL (dir="rtl" on <html>), with an EN toggle. Quiz content direction follows
quiz.language. Use logical CSS properties (margin-inline-start etc.).
Every data screen has loading, empty and error states. Confirm dialogs for Start, Submit,
Publish and Reset.

Screens:
- Student: Login, Home (tabs: available / upcoming / completed), Quiz intro (rules, negative-marking
  explanation, one-attempt warning), Taking (sticky timer, one question per screen, auto-save
  indicator "saved / saving / offline", question navigator), Submit sheet (unanswered count),
  Time's up, Result (score + breakdown of +correct, -penalty).
- Teacher: Dashboard (own quizzes + status), Quiz editor (settings + questions + publish checklist),
  Results (table + per-question correct rate + CSV).
- Admin: Overview (stats, avg by class, recent quizzes), Import (upload -> report), Results for any
  quiz with "Reset attempt" dialog (reason required).

## Tests (Vitest + supertest, fresh in-memory or temp DB per test file)
Must cover at least: scoring (all cases incl. floor at 0 and unanswered), start idempotency,
second attempt impossible, starting outside the window, wrong class, answer after deadline+grace
rejected, deadline = closes_at when started late, auto-submit on read, correct answers not leaked,
role/ownership checks (student -> teacher routes, teacher -> other teacher's quiz),
publish validation, locking after first attempt, import upsert + rejected rows + bad headers,
admin reset. Tests must pass with `npm test` on a clean clone.

## Docs
- README.md: what it is, requirements (Node 22), one-command run, all demo logins,
  how to run tests, project structure, how to import the sample spreadsheets
  (put sample .xlsx/.csv files in /samples).
- DECISIONS.md: every assumption and trade-off (copy the [A] items from REQUIREMENTS.md
  and add any you make), plus what I would do with more time.
- CLAUDE.md: short guide for future AI agents working on this repo.
- AI_USAGE.md: create only a skeleton with headings. I will write the content myself.

## How to work
Work in phases. At the end of EACH phase: run the tests, fix failures, make a git commit
with a clear message, give me the file summary, then STOP and wait for my "continue".
0. git init, .gitignore, workspaces scaffold, scripts, README stub
1. DB: migrations, schema, seed
2. Auth + role/ownership middleware + tests
3. Student quiz API: start / get attempt / answer / submit / auto-submit / scoring + tests
4. Teacher API: quiz CRUD, questions, publish validation, locking, results, CSV + tests
5. Admin API: imports with report, overview, reset attempt + tests
6. Client shell: design tokens, i18n + RTL, API wrapper, routing guards, Login
7. Student screens
8. Teacher screens
9. Admin screens
10. Hardening pass (try to break it: double clicks, refresh mid-quiz, expired session,
    clock skew, huge/invalid uploads), then README / DECISIONS / CLAUDE.md
Ask me before adding any dependency not listed above.
Start with phase 0.

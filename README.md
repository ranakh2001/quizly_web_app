# Quizly

A timed online quiz web app for Nour's Tutoring Centre (Amman). Built with an Express +
better-sqlite3 API and a Vite + React client, in an npm workspaces monorepo.

> This project is being built in phases. This README will grow with each phase; right now the
> full server API is done (scaffold, schema/seed, auth, student quiz-taking, teacher quiz
> management/results, admin imports/overview/reset) - the client UI comes in later phases.

## Requirements

- Node.js 22 (see `.nvmrc`)

## One-command run

```bash
npm run setup   # install all workspaces, run migrations, seed the database
npm run dev     # server + Vite dev server (with proxy), for local development
npm start       # build the client and start the server on http://localhost:3000
npm test        # run all server tests
npm run reset-db  # delete the database, re-run migrations, reseed
```

## Project structure

```
server/                  Express API (JavaScript, ESM)
  src/
    app.js                the Express app (no listen(); importable by tests)
    server.js              starts the server; the only file that calls listen()
    config.js              reads process.env once, exports a frozen config object
    constants.js            business constants (time limits, roles, statuses, ...)
    db/
      connection.js          better-sqlite3 connection factory
      migrate.js              runs migrations/*.sql in order
      migrations/              plain SQL migration files (schema lives in 001_init.sql)
      seed.js                  seeds demo data (classes, users, quizzes, attempts)
      seedData/                name pools and question banks used only by seed.js
      reset.js                 deletes the DB, migrates, seeds
    domain/                 pure business logic (scoring, deadline, quiz availability/
                              publishing rules) - no Express/DB imports
    modules/                 one folder per feature, each with routes/service/repository/
                              schemas (imports/ also has spreadsheet.js, the .csv/.xlsx parser):
                                auth/       login, session cookie, role middleware
                                quizzes/    quiz CRUD, questions, publish, locking (teacher);
                                            browsing (student); listing (admin)
                                attempts/   start/get/answer/submit, auto-submit-on-read
                                results/    per-student results, per-question rate, CSV export
                                imports/    admin bulk import of students/teachers
                                admin/      overview stats, reset attempt (audit_log)
    shared/                  errors, error handler, validation middleware, logger
  tests/                   Vitest + supertest tests, one fresh DB per test file

client/                  Vite + React app
  src/
    api/client.js           the only place that calls fetch()
    i18n/                    ar/en dictionaries + I18nProvider + useT hook (supports
                              {param} interpolation)
    styles/
      tokens.css               design tokens as CSS variables, incl. the two responsive
                                breakpoints (600px tablet, 1024px desktop) documented once
      base.css                 reset, component styles, mobile-first (base = phone)
      glass.css                 .glass / .glass--bar / .glass--sheet utility classes
      responsive.css            tablet/desktop overrides only, in exactly two @media blocks
    components/ui/          reusable presentational components (Button, Dialog, ScoreRing,
                              Loading/Error/EmptyState, ComingSoonPage)
    components/layout/      page shells (MobileLayout - responsive despite the name: phone
                              back-button bar up to a full desktop nav bar via CSS only)
    features/                one folder per area (auth, student, teacher, admin), each with
                              pages/, components/, hooks/
    lib/                     time.js (Asia/Amman formatting), errorMessage.js (maps an
                              ApiError's code to an i18n KEY - never shows the server's raw
                              message; components store the key and translate at render
                              time so it re-translates immediately if the UI language changes)
```

## Demo logins

Seeded by `npm run setup` / `npm run reset-db` (same data every time - the seed uses a fixed
random seed). All passwords are shared demo passwords, not per-user.

| Role    | Identifier                                              | Password     |
| ------- | ------------------------------------------------------- | ------------ |
| Admin   | `admin`                                                 | `admin123`   |
| Teacher | `teacher1`, `teacher2`, `teacher3`, `teacher4`          | `teacher123` |
| Student | `s10a01`-`s10a20`, `s10b01`-`s10b20`, `s11a01`-`s11a20` | `student123` |

Seeded classes: `10A`, `10B`, `11A` (~20 students each). Seeded quizzes cover every state:
one open with negative marking ("Algebra Warm-up"), one open without ("General Science
Quiz"), one upcoming ("World History Trivia"), one closed with a mix of submitted and
auto-submitted attempts ("اختبار قواعد اللغة العربية", fully in Arabic), and one draft ("Chemistry Fundamentals").

## Tests

Added incrementally per phase; run with `npm test`.

## Importing spreadsheets

Admin-only, via `POST /api/admin/imports/students` and `/teachers`. Both accept `.csv` or
`.xlsx`, UTF-8, with or without a byte-order mark, Arabic names included. There's no file
upload UI yet (Phase 9), so for now the file travels as base64 inside the JSON body:

```bash
curl -X POST http://localhost:3000/api/admin/imports/students \
  -H "Content-Type: application/json" \
  --cookie "<your admin session cookie>" \
  -d "{\"filename\":\"students.csv\",\"contentBase64\":\"$(base64 -w0 samples/students.csv)\"}"
```

Required columns:

- Students: `name`, `student_code`, `class`, `password` - `class` must match an existing
  class name exactly (case-insensitive); an unknown class rejects just that row.
- Teachers: `name`, `username`, `password`.

Rows are upserted (matched by `student_code` / `username`); a missing required column
rejects the whole file and saves nothing, but one bad row (missing field, unknown class)
is skipped while the rest of the file still imports. The response reports how many rows
were created/updated and lists every rejected row with its row number and reason.

Sample files that import cleanly against the seeded demo data live in `/samples`
(`students.csv`, `students.xlsx`, `teachers.csv`, `teachers.xlsx`).

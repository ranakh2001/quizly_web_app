# Quizly

A timed online quiz web app for Nour's Tutoring Centre (Amman). Built with an Express +
better-sqlite3 API and a Vite + React client, in an npm workspaces monorepo.

> This project is being built in phases. This README will grow with each phase; right now it
> covers the scaffold (Phase 0), the database schema and seed data (Phase 1), and login +
> session handling (Phase 2). The student/teacher/admin quiz APIs and UI come in later phases.

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
    domain/                 pure business logic (scoring.js, deadline.js) - no Express/DB imports
    modules/                 one folder per feature (auth, quizzes, attempts, results,
                              imports, admin), each with routes/service/repository/schemas
    shared/                  errors, error handler, validation middleware, logger
  tests/                   Vitest + supertest tests, one fresh DB per test file

client/                  Vite + React app
  src/
    api/client.js           the only place that calls fetch()
    i18n/                    ar/en dictionaries + I18nProvider + useT hook
    styles/                  design tokens, base styles, glass-surface utility classes
    components/ui/          reusable presentational components
    components/layout/      page shells (mobile, dashboard)
    features/                one folder per area (auth, student, teacher, admin)
    lib/time.js              date/time formatting (Asia/Amman)
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

Documented once the import feature exists (Phase 5). Sample files will live in `/samples`.

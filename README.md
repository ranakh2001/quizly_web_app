# Quizly

A timed online quiz web app for Nour's Tutoring Centre (Amman): students take timed, auto-
scored quizzes; teachers build quizzes and review results; the admin manages classes/imports
and can reset a stuck attempt. Built with an Express + better-sqlite3 API and a Vite + React
client, in an npm workspaces monorepo, dark-glass UI with full Arabic RTL support (and an EN
toggle).

## Requirements

- Node.js 22 (see `.nvmrc`)
- No `.env` file is required to run this. `npm start` reads the committed
  `server/.env.production` (which only sets `NODE_ENV=production`); every other setting has a
  sane default (see `.env.example` if you want to override the port, DB path, or JWT secret).

## One-command run

```bash
npm run setup   # install all workspaces, run migrations, seed the database
npm run dev     # server + Vite dev server (with proxy), for local development
npm start       # build the client and start the server on http://localhost:3000
npm test        # run all server tests
npm run lint    # ESLint across both workspaces
npm run reset-db  # delete the database, re-run migrations, reseed
```

`npm run setup` is safe to run on a completely clean clone: there's no database file to leave
behind (the seed script refuses to double-seed an existing one anyway - see `npm run reset-db`
if you want a fresh start later), and nothing else needs configuring first.

### Troubleshooting `npm run setup`

If installation fails while building `better-sqlite3` with a Python/`node-gyp` error, npm
decided it couldn't use the prebuilt binary for your platform and fell back to compiling from
source (which needs Python 3 + build tools). This shouldn't normally happen - better-sqlite3
ships prebuilt binaries for common platforms (Windows/macOS/Linux, x64/arm64) - but if it does:
first just try `npm install` again (this can be a transient hiccup during a large install);
failing that, install Python 3 and a C++ toolchain, or fetch the platform binary manually per
[better-sqlite3's install docs](https://github.com/WiseLibs/better-sqlite3#installation).

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
    api/client.js           the only place that calls fetch(); also owns the global
                              "session just became invalid" handler (see Hardening below)
    i18n/                    ar/en dictionaries + I18nProvider + useT hook (supports
                              {param} interpolation) - keys are shared across features
                              wherever the underlying concept is (attemptStatus.*,
                              quizStatus.*, ...) rather than duplicated per screen
    styles/
      tokens.css               design tokens as CSS variables, incl. the two responsive
                                breakpoints (600px tablet, 1024px desktop) documented once
      base.css                 reset, component styles, mobile-first (base = phone) for
                                student screens; the dashboard shell flips this for
                                teacher/admin (desktop sidebar, phone top-bar fallback)
      glass.css                 .glass / .glass--bar / .glass--sheet utility classes
      responsive.css            tablet/desktop overrides only, in exactly two @media blocks
    components/ui/          reusable presentational components: Button, Dialog,
                              ConfirmDialog (the shared confirm-dialog shape behind Start/
                              Submit/Publish/Delete/Reset), StatCard, Callout, Avatar,
                              UserMenu, ScoreRing, SkeletonCard, Loading/Empty/ErrorState
    components/results/     ResultsView - the results table + per-question correct rate +
                              CSV export shared by the teacher and admin Results screens
                              (admin gets an extra Reset-attempt column/dialog via a prop)
    components/layout/      page shells: MobileLayout (student, phone-first: top bar +
                              bottom nav) and DashboardLayout (teacher/admin, desktop
                              sidebar collapsing to a top bar on phone)
    features/                one folder per area (auth, student, teacher, admin), each with
                              pages/, components/, hooks/
    lib/                     time.js (the only place that formats a date - Asia/Amman,
                              active UI language), attemptStatus.js (server enum -> i18n
                              key), errorMessage.js (maps an ApiError's code to an i18n
                              KEY - never shows the server's raw message; components store
                              the key and translate at render time so it re-translates
                              immediately if the UI language changes), constants.js
```

## Hardening

- **Double-click / multi-tab**: starting a quiz and submitting an attempt are both
  idempotent server-side (a UNIQUE constraint plus a synchronous check-then-write path - see
  CLAUDE.md) - a repeated request returns the existing attempt/result instead of erroring or
  creating a duplicate. Buttons also disable themselves while a request is in flight.
- **Refresh mid-quiz**: the Taking screen keeps no state of its own that isn't reloaded from
  `GET /api/attempts/:id` on mount - the timer counts down to the server's deadline using the
  server's clock (not the device's), and already-saved answers come back from the same
  request. A refresh (or a second tab) just re-syncs to the same in-progress attempt.
- **Expired/invalidated session**: a 401 from anywhere except `/auth/login` or the initial
  `/auth/me` check clears the signed-in user, which sends the student/teacher/admin to
  `/login` automatically - including mid-quiz - instead of leaving them stuck on a screen that
  can no longer save anything.
- **Wrong role's URL**: visiting a route for another role (typed directly, or a stale
  bookmark) redirects to your own home instead of a 403 page or a broken screen; every API
  route enforces the same role/ownership check independently, so this is a UX nicety on top of
  a real server-side check, not a substitute for one.
- **Invalid/huge uploads**: a corrupt or wrong-format spreadsheet returns a clean 400 (the
  parser never throws past a `try`/`catch`), and a request over the 5MB body limit returns a
  clean 413 - neither crashes the process or falls through as a bare 500.
- **Answers after the deadline**: rejected with 409 once the deadline plus a 30s grace period
  has passed; the same grace period is also what turns a not-yet-submitted attempt into
  `auto_submitted` (and scores it) the next time anything reads it - no cron job needed.

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

`npm test` runs the full server suite (Vitest + supertest): 177 tests across 13 files, each
with a fresh in-memory database. Covers every business rule in PLAN.MD - scoring (every case,
including the floor-at-0 and unanswered cases), start idempotency and the UNIQUE-constraint
guarantee behind it, the start/answer time-window rules, deadline computation (including the
"started late enough that time_limit would overrun closes_at" case), auto-submit-on-read,
answers rejected after deadline+grace, correct answers never leaked while a quiz is open,
role/ownership checks on every route (student -> teacher/admin routes, teacher -> another
teacher's quiz), publish validation and locking after the first attempt, CSV/XLSX import
(upsert, per-row rejection, missing-header rejection, BOM-prefixed Arabic CSV, corrupt files,
oversized uploads), admin reset (with the required-reason check), and session handling
(missing/tampered/expired tokens). No test suite is required or included for the client (see
Hardening above for how client behaviour was verified instead).

Also: `npm run lint` (ESLint, both workspaces) and `npm run format` (Prettier) - both are
clean on the current code and expected to stay that way.

## Importing spreadsheets

Admin-only, from the Admin -> Import screen in the app, or directly via `POST
/api/admin/imports/students` and `/teachers`. Both accept `.csv` or `.xlsx`, UTF-8, with or
without a byte-order mark, Arabic names included. The API takes the file as base64 inside the
JSON body (there's no multipart upload dependency for files this small):

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

> Bulk-importing a quiz's _questions_ from a spreadsheet (as opposed to students/teachers) is
> not implemented - see DECISIONS.md. A teacher adds questions one at a time in the quiz
> editor today.

Sample files that import cleanly against the seeded demo data live in `/samples`
(`students.csv`, `students.xlsx`, `teachers.csv`, `teachers.xlsx`).

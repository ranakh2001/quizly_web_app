Read REQUIREMENTS.md (scope and business rules) and PLAN.md (stack, rules, phases) fully before doing anything.
Now do ONLY Phase 0: set up the project structure, tooling and coding conventions so every later phase
builds on a clean, consistent foundation. Do not implement features yet.

## Goals of this phase
1. Clean, readable, consistent code from the first file.
2. No duplication: one place for each concern (config, errors, validation, API calls, design tokens,
   translations, constants). But do NOT over-abstract: only extract a helper when it is used in
   2+ places or clearly will be. Prefer simple and explicit over clever.
3. The structure must make the business rules easy to find and test.

## Root
- npm workspaces: "client" and "server". Node 22 (.nvmrc = 22, "engines" in package.json).
- Files: .gitignore (node_modules, dist, *.db, .env, coverage), .editorconfig, .env.example, README.md stub.
- Shared ESLint (flat config) + Prettier at the root for both workspaces
  (react-hooks rules for the client). Format on save friendly.
- Root scripts (they must all work at the end of this phase, even if some are thin for now):
  setup, dev (server + client together via concurrently), start, test, lint, format, reset-db.

## Server structure (Express 5, JavaScript ESM)
server/
  src/
    app.js            -> builds and returns the Express app (no listen, so tests can import it)
    server.js         -> starts listening; the only file that calls listen()
    config.js         -> reads env ONCE, exports a frozen config object (port, db path, jwt secret, etc.)
    constants.js      -> business constants: DEFAULT_TIME_LIMIT_MIN=20, GRACE_SECONDS=30,
                         DEFAULT_PENALTY_RATIO=0.25, OPTIONS_PER_QUESTION=4, ROLES, ATTEMPT_STATUS, ...
    db/
      connection.js   -> single better-sqlite3 connection factory (file DB or in-memory for tests)
      migrate.js      -> runs migrations/*.sql in order, tracks applied ones
      migrations/     -> 001_init.sql (empty placeholder for now; schema comes in Phase 1)
      seed.js         -> placeholder
    domain/           -> pure functions with no Express/DB imports (scoring, deadline, quiz state)
    modules/          -> one folder per feature, same shape every time:
      auth/ quizzes/ attempts/ results/ imports/ admin/
        <feature>.routes.js      thin: parse request, call service, send response
        <feature>.service.js     business logic and rule checks
        <feature>.repository.js  SQL only (parameterised), no business logic
        <feature>.schemas.js     zod schemas for request validation
      (create the folders with placeholder files only where needed; no dead code)
    shared/
      errors.js       -> AppError class + helpers (notFound, forbidden, conflict, validation...)
      errorHandler.js -> one middleware; every error becomes { error: { code, message, details } }
      validate.js     -> zod validation middleware used by all routes
      logger.js       -> tiny logger (no stray console.log anywhere else)
  tests/
    helpers/          -> createTestApp() with a fresh temp/in-memory DB, login helpers for later
    health.test.js
- Implement GET /api/health -> { ok: true, serverTime } and a test for it, so the pipeline works end to end.
- In production mode the server serves client/dist (wire it now).

## Client structure (Vite + React + React Router, plain CSS)
client/src/
  main.jsx, App.jsx, router.jsx
  api/client.js       -> the ONLY place that calls fetch: base URL, JSON, credentials, error normalising
  i18n/               -> ar.js, en.js, I18nProvider.jsx (sets <html dir/lang>), useT hook
  styles/
    tokens.css        -> ALL design tokens as CSS variables (colours, gradient, radii, spacing,
                         font sizes, glass values) from PLAN.md. No hard-coded colours elsewhere.
    base.css          -> reset, Cairo font, body gradient, focus ring, logical properties
    glass.css         -> .glass / .glass--bar / .glass--sheet + @supports and
                         prefers-reduced-transparency fallbacks
  components/
    ui/               -> reusable, presentational only (created when first needed; for now Button)
    layout/           -> MobileLayout, DashboardLayout (placeholders)
  features/
    auth/ student/ teacher/ admin/   -> each will hold pages/, components/, hooks/
  lib/
    time.js           -> date/time formatting in Asia/Amman (single place)
- Vite dev proxy: /api -> http://localhost:3000.
- For now render one placeholder page that calls /api/health through api/client.js and shows the
  result on the glass background, in Arabic RTL with an EN toggle, to prove tokens, i18n and API work.

## Coding conventions (write these into CLAUDE.md so every later phase follows them)
- Names say what things are; no abbreviations except common ones (id, db, url).
- Small files and functions, one responsibility each; early returns over nested ifs.
- Routes are thin; business rules live in services/domain; SQL lives only in repositories.
- No magic numbers or strings: use constants.js / tokens.css / i18n dictionaries.
- User-facing text only through i18n (ar + en), never hard-coded in components.
- Comments explain WHY, not what. No commented-out code, no unused files or exports.
- async/await everywhere; errors thrown as AppError and handled in one place.
- One consistent API error shape; the client shows errors from that shape only.
- Every business rule gets a test; test names read like the rule.
- Also add a short "Project structure" section to README explaining the folders.

## Dependencies
Install only what this phase needs. Approved for the whole project:
express, better-sqlite3, zod, bcryptjs, jsonwebtoken, cookie-parser, express-rate-limit, exceljs,
csv-parse, react, react-dom, react-router-dom, vite, @vitejs/plugin-react, vitest, supertest,
concurrently, eslint, prettier, eslint-plugin-react-hooks, globals. Ask before adding anything else.

## Done when
- `npm run setup`, `npm run dev`, `npm run lint`, `npm test`, `npm start` all run without errors.
- Show me the final folder tree.
- git init and commit: "chore: scaffold monorepo, tooling and conventions".
- Give me a short plain-English explanation of each folder and key file (I'm new to React).
- Then STOP and wait for me. The next phases come from PLAN.md when I say "continue".

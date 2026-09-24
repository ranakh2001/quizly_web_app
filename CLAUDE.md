# CLAUDE.md

Guide for any AI agent (or human) working on Quizly. Read REQUIREMENTS.md and PLAN.MD first —
they are the source of truth for scope and business rules. This file is about _how_ to write
the code, not _what_ to build.

## Project shape

- npm workspaces monorepo: `server` (Express 5, ESM) and `client` (Vite + React).
- Server: routes -> services -> repositories. Routes are thin (parse request, call service,
  send response). Business rules and validation-of-rules live in services. Domain logic with
  no Express/DB dependency (scoring, deadlines) lives in `server/src/domain/`. SQL lives only
  in `*.repository.js` files, always parameterised.
- Client: function components + hooks only, no class components, no clever abstractions.

## Naming and structure

- Names say what things are; no abbreviations except common ones (`id`, `db`, `url`).
- Small files and functions, one responsibility each. Prefer early returns over nested `if`s.
- No magic numbers or strings: business constants go in `server/src/constants.js`, design
  values in `client/src/styles/tokens.css`, user-facing text in `client/src/i18n/{ar,en}.js`.
- User-facing text only through i18n. Never hard-code strings in components.

## Errors

- Server: every expected failure is thrown as an `AppError` (see `server/src/shared/errors.js`)
  via its helpers (`notFound`, `forbidden`, `conflict`, `validation`, ...). The single
  `errorHandler` middleware turns any error into `{ error: { code, message, details } }`.
  Never send an ad hoc error shape from a route.
- Client: `client/src/api/client.js` is the only place that calls `fetch`. It throws
  `ApiError` for non-2xx responses. Components only ever show errors from that shape.

## Validation

- All request input is validated with zod schemas in `<feature>.schemas.js`, applied via the
  shared `validate` middleware (`server/src/shared/validate.js`). Never trust `req.body` /
  `req.params` / `req.query` directly in a route or service.
- Every business rule is enforced server-side, regardless of what the client does.

## Style

- `async`/`await` everywhere; no bare `.then` chains in application code.
- Comments explain _why_, not _what_. No commented-out code. No unused files or exports.
- No stray `console.log`; use `server/src/shared/logger.js` on the server.
- Format with Prettier, lint with ESLint (`npm run format`, `npm run lint`) before committing.

## Testing

- Vitest + supertest, a fresh in-memory (or temp) database per test file via
  `server/tests/helpers/createTestApp.js`.
- Every business rule from REQUIREMENTS.md gets a test, and the test name reads like the rule
  (e.g. "rejects a second attempt for the same student and quiz").

## Working in phases

This project is built in the phases listed in PLAN.MD's "How to work" section. Finish one
phase, run the tests, commit, summarise the new files in plain English, then stop and wait
before starting the next phase. Ask before adding any dependency not already approved in
PLAN.MD.

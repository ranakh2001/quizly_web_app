# CLAUDE.md

Guide for any AI agent (or human) working on Quizly. Read REQUIREMENTS.md and PLAN.MD first —
they are the source of truth for scope and business rules. This file is about _how_ to write
the code, not _what_ to build.

**Note on those two files' names**: despite the names, REQUIREMENTS.md holds the Phase 0
scaffolding brief and PLAN.MD holds the actual business rules, data model, screens and phase
list. Read both fully regardless - the swap doesn't change their content, just don't rely on
the filenames alone to know which one has what.

## Project shape

- npm workspaces monorepo: `server` (Express 5, ESM) and `client` (Vite + React).
- Server: routes -> services -> repositories. Routes are thin (parse request, call service,
  send response). Business rules and validation-of-rules live in services. Domain logic with
  no Express/DB dependency (scoring, deadlines) lives in `server/src/domain/`. SQL lives only
  in `*.repository.js` files, always parameterised.
- Client: function components + hooks only, no class components, no clever abstractions.
  Before adding a component, an i18n key, or a date/time formatter, check whether one already
  covers it - `components/ui/` (ConfirmDialog, StatCard, Callout, EmptyState/ErrorState, ...)
  and `components/results/ResultsView.jsx` are shared across features specifically to avoid
  three screens each growing their own copy of the same confirm dialog or stat tile. Likewise
  `lib/time.js` is the only place that formats a date, and `lib/attemptStatus.js` /
  `lib/errorMessage.js` are the only places that map a server enum/error code to display text.

## Naming and structure

- Names say what things are; no abbreviations except common ones (`id`, `db`, `url`).
- Small files and functions, one responsibility each. Prefer early returns over nested `if`s.
- No magic numbers or strings: business constants go in `server/src/constants.js`, design
  values in `client/src/styles/tokens.css`, user-facing text in `client/src/i18n/{ar,en}.js`.
- User-facing text only through i18n. Never hard-code strings in components.
- The palette is minimal by design: white/near-black text + one teal accent (`--color-primary`)
  + red only for danger (errors, destructive actions, wrong answers, the timer's last minute).
  No other accent colours (no amber/violet/emerald, no gradients, no glassmorphism blur) - every
  colour value lives in `tokens.css` as a variable; components reference `var(--...)` only. The
  `.glass`/`.glass--bar`/`.glass--sheet` class names (`styles/glass.css`) are now flat card
  surfaces (border + soft shadow, no blur) - the historical name stuck to avoid renaming call
  sites across every feature screen.

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
- Every business rule from PLAN.MD gets a test, and the test name reads like the rule
  (e.g. "rejects a second attempt for the same student and quiz").
- The client has no automated test suite (not required by PLAN.MD); UI changes are verified
  by running the dev server and checking the actual screens.

## Hardening patterns already in place

- **Idempotency** (start an attempt, submit): the route handler is synchronous end-to-end (no
  `await` between the "does this already exist" read and the write), so a single Node process
  can't interleave two requests mid-check; the DB's UNIQUE constraint is the second line of
  defence for anything running against the same file from another process. Don't add an
  `async`/`await` in that path without re-checking this still holds.
- **Session expiry**: `requireAuth` throws the same `unauthorized()` for a missing, tampered,
  or expired token (jwt.verify's own error covers all three). Client-side, `api/client.js`
  calls a registered handler on any 401 that isn't from `/auth/login` or `/auth/me`, which
  `AuthContext` uses to clear the signed-in user - that's what makes a session dying mid-quiz
  bounce the student to `/login` instead of leaving them stuck on a dead screen.
- **Untrusted uploads** (imports): `spreadsheet.js` wraps both parsers in try/catch and turns
  any failure into a `badRequest`, and `app.js`'s `express.json({ limit: '5mb' })` plus
  `errorHandler`'s explicit `entity.too.large` branch keep an oversized request from crashing
  the process or falling through as a bare 500.

## Working in phases

This project is built in the phases listed in PLAN.MD's "How to work" section. Finish one
phase, run the tests, commit, summarise the new files in plain English, then stop and wait
before starting the next phase. Ask before adding any dependency not already approved in
PLAN.MD.

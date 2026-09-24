# Decisions

Assumptions, trade-offs, and known gaps made while building Quizly, plus what I'd do with more
time. REQUIREMENTS.md and PLAN.MD don't carry any `[A]`-tagged assumption markers (see the note
in CLAUDE.md about those two files' names being swapped relative to their content), so this is
a from-scratch account of every non-obvious call made across the project, not a copy of tagged
items.

## Assumptions

- **Demo passwords are shared, not per-user.** Every seeded student shares `student123`, every
  teacher `teacher123`, the admin is `admin123`. A real deployment would issue unique passwords
  (or a first-login "set your password" flow); for a reviewable demo, memorable shared
  passwords matter more than per-user secrecy.
- **No minimum password length/complexity is enforced**, at login or at import (`password:
z.string().min(1)`-equivalent). Matches the simple demo passwords above; a real deployment
  would add a minimum length at least.
- **`JWT_SECRET` falls back to a known default (`dev-secret-change-me`) if not set via env.**
  Acceptable for a take-home that must run with zero required `.env` setup; a real production
  deploy would need to set a real secret (see `.env.example`) or the server should refuse to
  start with the default in that mode. I left the current dev-friendly behaviour since it's
  what makes `npm start` work out of the box.
- **Session length is 12 hours**, long enough to cover a school day without needing a refresh-
  token flow. There's no "remember me" distinction and no way to revoke a single session early
  short of an admin resetting the DB - acceptable for the scope here.
- **Rate limiting counts every login request, not just failures** (`express-rate-limit` without
  `skipSuccessfulRequests`), and is per-IP, in-memory, and resets on server restart. Good enough
  for a single-instance deployment; a horizontally-scaled one would need a shared store (Redis)
  and would probably want to key on the identifier being logged in as too, not just IP, since
  right now many people behind the same IP/NAT share one lockout budget (I hit this myself
  while browser-testing multiple logins back-to-back during development).
- **Resetting an attempt hard-deletes it** (and its answers) rather than archiving it; the
  `audit_log` row (actor, reason, timestamp) is the only surviving record that a reset
  happened. The student's next start creates a genuinely fresh attempt. This matches "resets
  the one-attempt lock" literally, but means a reset attempt's answers/score are unrecoverable
  even by an admin after the fact.
- **CSV export is aggregate only** (status, score, time taken - one row per student), not a
  full per-question answer dump. Matches what rule 13 asks for explicitly.
- **`<input type="datetime-local">` uses the browser's local timezone**, not a timezone pinned
  to Asia/Amman - there's no way to lock a native datetime-local input to a fixed IANA zone.
  The value still round-trips to the correct UTC instant either way (a teacher sets a time on
  their own clock; the server only ever sees the resulting UTC timestamp), so this is a
  simplification, not a correctness bug. A custom Amman-locked date/time picker would be more
  UI machinery than this scope calls for.
- **The publish checklist is duplicated as a pure client-side function**
  (`client/src/features/teacher/publishChecklist.js`) that mirrors
  `server/src/domain/quizPublishing.js`'s rules, instead of parsing the server's response. The
  server's publish-validation errors are hardcoded English sentences (by design - they're
  meant to be read by whoever wrote the code, not shown verbatim to a user), so showing them
  as-is would break the "never show raw server text" rule established after an earlier bug
  where a login error surfaced in the wrong UI language. Recomputing the same checklist
  client-side, from data the client already has, lets it render in the active language and
  update live as the teacher fixes each item, instead of only appearing after a failed submit.
- **Import rejection reasons are shown to the admin as-is, untranslated** (e.g. `Unknown class
"99Z"`). Unlike the publish checklist, these come from the _uploaded file's own data_, not a
  fixed set of messages - there's no sane i18n key for "whatever class name someone typo'd into
  a spreadsheet." This is a deliberate, narrow exception to the "never show raw server text"
  rule: the audience is an admin reviewing their own import, not a student seeing a bare error.

## Trade-offs

- **No pagination anywhere** - the teacher dashboard, admin overview's recent-quizzes list
  (capped at 5), and every results table load their full result set in one response. Fine at
  the seeded scale (~60 students, single-digit quizzes); would need real pagination or
  virtualised lists before it'd hold up with hundreds of students or dozens of quizzes per
  teacher.
- **No client-side automated tests.** PLAN.MD's test requirement is scoped to the server
  (Vitest + supertest); the client is instead verified by running the dev server and exercising
  the actual screens (including with Playwright during development, ad hoc, never committed as
  a project dependency). A production version of this app would want component/interaction
  tests for the client too.
- **`docker-compose.yml` was listed as an optional alternative in PLAN.MD but wasn't built.**
  SQLite + npm was treated as the one hard requirement ("must work without Docker"), and time
  went to the hardening pass and docs instead. See "what I'd do with more time" below.
- **The admin `audit_log` table is written to (on every reset) but has no screen to read it
  back.** Rule 2 only requires the write; nothing in the screens list asks for an audit log
  viewer, so one wasn't built.

## A gap worth calling out explicitly

- **Teacher bulk question import is not implemented.** Rule 12's last sentence says "Teachers
  can import quiz questions (question, option_a..option_d, correct, points)" from a
  spreadsheet, the same way admin imports students/teachers. Only the admin-side
  students/teachers import was built; a teacher currently adds questions one at a time through
  the quiz editor's Add/Edit question dialog (`POST`/`PUT /api/quizzes/:id/questions`). The
  underlying pieces this would reuse already exist (`spreadsheet.js`'s CSV/XLSX parser, the
  same validate-then-report pattern as the admin import), so it's a bounded addition, not a
  redesign - it just didn't happen in the time available. Flagging it here rather than
  quietly leaving it out.

## What I'd do with more time

1. **Build the teacher question import** described above - it's the one PLAN.MD requirement
   that's genuinely missing, not just simplified.
2. **`docker-compose.yml`** for the optional containerised run PLAN.MD mentioned.
3. **Pagination** for results tables and the teacher/admin quiz lists.
4. **An audit log viewer** for admin, since the data is already being collected.
5. **A "forgot password" / admin-driven password reset flow** - right now a locked-out user
   needs an admin to re-import them (which upserts, so it works, but it's not a dedicated flow).
6. **Move rate-limit state to a shared store** (e.g. Redis) if this ever ran on more than one
   server process, and consider keying it by identifier as well as IP.
7. **A proper Amman-locked date/time picker** for the quiz opens/closes fields, instead of
   relying on `datetime-local`'s browser-local-timezone behaviour.
8. **Client-side component tests** (React Testing Library or similar) alongside the existing
   server test suite.
9. **A "require `JWT_SECRET` to be explicitly set in production"** startup check, so a real
   deployment can't silently run on the dev fallback secret.

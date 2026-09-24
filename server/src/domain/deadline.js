// Rule: deadline = min(started_at + time_limit, closes_at). Pure function, no DB/Express -
// reused by seed.js and the attempts service so this is computed in exactly one place.
export function computeDeadline(startedAt, timeLimitMinutes, closesAt) {
  const byTimeLimitMs = new Date(startedAt).getTime() + timeLimitMinutes * 60 * 1000;
  const closesMs = new Date(closesAt).getTime();
  return new Date(Math.min(byTimeLimitMs, closesMs)).toISOString();
}

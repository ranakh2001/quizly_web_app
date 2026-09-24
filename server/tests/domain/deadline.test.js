import { describe, it, expect } from 'vitest';
import { computeDeadline } from '../../src/domain/deadline.js';

describe('computeDeadline', () => {
  it('is started_at plus the time limit when that is before closes_at', () => {
    const deadline = computeDeadline('2026-01-01T09:00:00.000Z', 20, '2026-01-01T23:00:00.000Z');

    expect(deadline).toBe('2026-01-01T09:20:00.000Z');
  });

  it('equals closes_at when the student started late enough that the time limit would overrun it', () => {
    const deadline = computeDeadline('2026-01-01T22:50:00.000Z', 20, '2026-01-01T23:00:00.000Z');

    expect(deadline).toBe('2026-01-01T23:00:00.000Z');
  });
});

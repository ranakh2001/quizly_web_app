import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createTestApp } from './helpers/createTestApp.js';

describe('GET /api/health', () => {
  it('returns ok true and the current server time', async () => {
    const { app } = createTestApp();

    const response = await request(app).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
    expect(new Date(response.body.serverTime).toString()).not.toBe('Invalid Date');
  });
});

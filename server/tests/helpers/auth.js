import request from 'supertest';

// Logs in and returns a supertest agent that keeps the session cookie for later requests.
export async function loginAgent(app, credentials) {
  const agent = request.agent(app);
  await agent.post('/api/auth/login').send(credentials);
  return agent;
}

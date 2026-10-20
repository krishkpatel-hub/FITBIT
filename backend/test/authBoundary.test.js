import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import jwt from 'jsonwebtoken';
import app from '../src/app.js';

test('protected routes reject missing, invalid, and expired tokens', async () => {
  const previousSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = 'test-only-jwt-secret';
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  const base = `http://127.0.0.1:${port}`;

  try {
    const missing = await fetch(`${base}/api/auth/me`);
    assert.equal(missing.status, 401);

    const invalid = await fetch(`${base}/api/dashboard`, {
      headers: { Authorization: 'Bearer invalid-token' },
    });
    assert.equal(invalid.status, 401);

    const expiredToken = jwt.sign({ id: '507f1f77bcf86cd799439011' }, process.env.JWT_SECRET, { expiresIn: -1 });
    const expired = await fetch(`${base}/api/workouts`, {
      headers: { Authorization: `Bearer ${expiredToken}` },
    });
    assert.equal(expired.status, 401);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
  }
});

test('auth endpoints return validation errors for non-string identity fields', async () => {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  const base = `http://127.0.0.1:${port}`;

  try {
    const register = await fetch(`${base}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ firstName: 7, lastName: 'Athlete', username: 'athlete', email: 'a@example.com', password: 'secret123' }),
    });
    assert.equal(register.status, 400);
    assert.equal((await register.json()).message, 'First name must be text');

    const login = await fetch(`${base}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: ['a@example.com'], password: 'secret123' }),
    });
    assert.equal(login.status, 400);
    assert.equal((await login.json()).message, 'Email or username must be text');
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

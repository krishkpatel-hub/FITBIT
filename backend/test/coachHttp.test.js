import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { setTimeout as delay } from 'node:timers/promises';
import express from 'express';
import compression from 'compression';
import jwt from 'jsonwebtoken';
import OpenAI from 'openai';
import User from '../src/models/User.js';
import { protect } from '../src/middleware/authMiddleware.js';
import { createStreamChatHandler } from '../src/controllers/coachController.js';
import { createStreamingCoachAgent } from '../src/services/coachAgent.js';
import { errorHandler } from '../src/middleware/errorMiddleware.js';

const listen = async (app, t) => {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise((resolve) => { server.close(resolve); server.closeAllConnections(); }));
  return `http://127.0.0.1:${server.address().port}`;
};

test('authenticated POST survives body completion through real SDK streaming and tool follow-up', async (t) => {
  const previousSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = 'isolated-http-test-secret';
  t.after(() => { if (previousSecret === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = previousSecret; });
  t.mock.method(User, 'findById', (id) => ({ select: async () => ({ id }) }));
  const calls = [];
  const toolCalls = [];
  const client = new OpenAI({
    apiKey: 'test-provider-key', maxRetries: 0,
    fetch: async (_url, options) => {
      // Exercise the SDK's cancellation path while the POST request ends normally.
      await delay(25, undefined, { signal: options.signal });
      const payload = JSON.parse(options.body);
      calls.push(payload);
      const output = calls.length === 1 ? [{
        type: 'function_call', name: 'get_current_program', arguments: '{}', call_id: 'call_test', id: 'fc_test',
      }] : [{ type: 'message', content: [{ type: 'output_text', text: 'Your next workout is Bench Press.' }] }];
      const events = calls.length === 1 ? [] : [{ type: 'response.output_text.delta', delta: 'Your next workout is Bench Press.' }];
      events.push({ type: 'response.completed', response: { id: `resp_${calls.length}`, output } });
      return new Response(events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join(''), { headers: { 'Content-Type': 'text/event-stream' } });
    },
  });
  const agent = createStreamingCoachAgent({ client, executeTool: async (call) => {
    toolCalls.push(call);
    return { result: { program: { weekNumber: 1, workouts: [{ title: 'Bench Press', status: 'planned' }] } } };
  } });
  const app = express();
  app.use(compression());
  app.use(express.json());
  app.post('/coach/chat/stream', protect, createStreamChatHandler(agent));
  app.use(errorHandler);
  const url = await listen(app, t);
  const token = jwt.sign({ id: 'test-user-a' }, process.env.JWT_SECRET, { expiresIn: '1m' });
  const response = await fetch(`${url}/coach/chat/stream`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ message: 'What should I train next?', userId: 'test-user-b' }),
  });
  const body = await response.text();
  assert.equal(response.status, 200);
  assert.match(body, /text_delta/);
  assert.match(body, /Your next workout is Bench Press/);
  assert.match(body, /"type":"complete"/);
  assert.doesNotMatch(body, /"type":"error"|test-user|call_test|function_call/);
  assert.equal(toolCalls[0].authenticatedUserId, 'test-user-a');
  assert.equal(calls[1].previous_response_id, 'resp_1');
  assert.equal(calls[1].input[0].call_id, 'call_test');

  const rejected = await fetch(`${url}/coach/chat/stream`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: 'What should I train next?' }) });
  assert.equal(rejected.status, 401);
  assert.equal(calls.length, 2);
});

test('SSE disconnect cancels upstream work and removes response listeners', async (t) => {
  let aborted;
  const upstreamAborted = new Promise((resolve) => { aborted = resolve; });
  let responseObject;
  const app = express();
  app.use(express.json());
  app.post('/stream', (req, res, next) => { req.user = { id: 'test-user-a' }; responseObject = res; next(); }, createStreamChatHandler(async ({ signal, onEvent }) => {
    await onEvent({ type: 'status', message: 'Reviewing your training...' });
    await new Promise((resolve) => signal.addEventListener('abort', () => { aborted(); resolve(); }, { once: true }));
  }));
  const url = await listen(app, t);
  const controller = new AbortController();
  const response = await fetch(`${url}/stream`, { method: 'POST', signal: controller.signal, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: 'test' }) });
  await response.body.getReader().read();
  controller.abort();
  await upstreamAborted;
  await delay(0);
  assert.equal(responseObject.listenerCount('close'), 0);
});

test('provider or tool failures emit one safe error and close the stream', async (t) => {
  const app = express();
  app.use(express.json());
  app.post('/stream', (req, res, next) => { req.user = { id: 'test-user-a' }; next(); }, createStreamChatHandler(async () => { throw new Error('Private Mongo/provider details'); }));
  const url = await listen(app, t);
  const response = await fetch(`${url}/stream`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: 'test' }) });
  const body = await response.text();
  assert.equal((body.match(/"type":"error"/g) || []).length, 1);
  assert.doesNotMatch(body, /Private|Mongo|provider details/);
});

test('SSE deadline closes a stalled tool and rejects late output', async (t) => {
  let emitLate;
  let finishTool;
  let toolSignal;
  const app = express();
  app.use(express.json());
  app.post('/stream', (req, res, next) => { req.user = { id: 'test-user-a' }; next(); }, createStreamChatHandler(async ({ signal, onEvent }) => {
    emitLate = onEvent;
    toolSignal = signal;
    await new Promise((resolve) => { finishTool = resolve; });
  }, { timeoutMs: 30 }));
  const url = await listen(app, t);
  const response = await fetch(`${url}/stream`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: 'test' }) });
  const body = await response.text();
  assert.match(body, /"status":504/);
  assert.match(body, /too long/);
  assert.equal(toolSignal.aborted, true);
  assert.equal((body.match(/"type":"error"/g) || []).length, 1);
  await emitLate({ type: 'text_delta', delta: 'Should never be sent' });
  finishTool();
});

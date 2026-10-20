import test from 'node:test';
import assert from 'node:assert/strict';
import { retryCoachTurn, shouldSubmitCoachOnEnter, startCoachTurn, updateCoachTurn } from '../../frontend/src/utils/coachConversation.ts';

test('suggested and typed questions create the same turn shape', () => {
  const suggested = startCoachTurn([], 'What should I train next?', 1, 2);
  const typed = startCoachTurn([], 'What should I train next?', 1, 2);
  assert.deepEqual(suggested, typed);
  assert.equal(suggested[1].status, 'Reviewing your training…');
});

test('stream completion and a tool-backed answer update only the coach turn', () => {
  const started = startCoachTurn([], 'What should I train next?', 1, 2);
  const streamed = updateCoachTurn(started, 2, { delta: 'Your program has no planned workout yet.' });
  const complete = updateCoachTurn(streamed, 2, { streaming: false, status: '' });
  assert.equal(complete[0].content, 'What should I train next?');
  assert.equal(complete[1].content, 'Your program has no planned workout yet.');
  assert.equal(complete[1].streaming, false);
});

test('failure retains a partial answer and retry reuses the original user turn', () => {
  const started = startCoachTurn([], 'How has my bench changed?', 1, 2);
  const partial = updateCoachTurn(started, 2, { delta: 'Your bench has', streaming: false, incomplete: true });
  assert.equal(partial[1].content, 'Your bench has');
  const retried = retryCoachTurn(partial, 2);
  assert.equal(retried.length, 2);
  assert.equal(retried.filter((turn) => turn.role === 'user').length, 1);
  assert.equal(retried[1].content, '');
  assert.equal(retried[1].streaming, true);
});

test('Enter submits on desktop except for Shift+Enter and IME composition', () => {
  const event = { key: 'Enter', shiftKey: false };
  assert.equal(shouldSubmitCoachOnEnter(event, false), true);
  assert.equal(shouldSubmitCoachOnEnter({ ...event, shiftKey: true }, false), false);
  assert.equal(shouldSubmitCoachOnEnter({ ...event, nativeEvent: { isComposing: true } }, false), false);
  assert.equal(shouldSubmitCoachOnEnter(event, true), false);
});

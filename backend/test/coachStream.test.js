import test from 'node:test';
import assert from 'node:assert/strict';
import { readCoachStream } from '../../frontend/src/utils/coachStream.ts';

const bodyFor = (parts) => new ReadableStream({ start(controller) {
  parts.forEach((part) => controller.enqueue(new TextEncoder().encode(part)));
  controller.close();
} });

test('frontend stream parser handles split chunks, CRLF, heartbeat, and completion', async () => {
  const events = [];
  await readCoachStream(bodyFor([': ping\r\n\r\ndata: {"type":"status","message":"Reviewing"}\r', '\n\r\ndata: {"type":"text_delta","delta":"Bench"}\n\ndata: {"type":"complete","sources":[]}\n\n']), new AbortController().signal, (event) => events.push(event.type));
  assert.deepEqual(events, ['status', 'text_delta', 'complete']);
});

test('frontend rejects malformed events, early EOF, and server errors without a complete event', async () => {
  for (const text of [
    'data: nope\n\n', 'data: {"type":"text_delta","delta":123}\n\n',
    'data: {"type":"text_delta","delta":"partial"}\n\n',
    'data: {"type":"complete","sources":{}}\n\n',
    'data: {"type":"error","message":"Unavailable","status":502}\n\n',
  ]) {
    await assert.rejects(() => readCoachStream(bodyFor([text]), new AbortController().signal, () => {}));
  }
});

test('frontend cancellation releases a pending stream reader', async () => {
  const controller = new AbortController();
  let cancelled = false;
  const body = new ReadableStream({ cancel() { cancelled = true; } });
  const pending = readCoachStream(body, controller.signal, () => {});
  controller.abort();
  await assert.rejects(() => pending, { name: 'AbortError' });
  assert.equal(cancelled, true);
  assert.equal(body.locked, false);
});

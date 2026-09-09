import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import { WebSocket } from 'ws';
import { createRealtimeServer } from '../src/realtime/realtimeServer.js';

const createTestRealtimeServer = async () => {
  const server = http.createServer();
  const realtime = createRealtimeServer({
    server,
    verifyToken: async (token) => {
      if (token === 'token-a') return 'user-a';
      if (token === 'token-b') return 'user-b';
      throw new Error('Invalid token');
    },
  });

  await new Promise((resolve) => server.listen(0, resolve));
  const { port } = server.address();

  return {
    realtime,
    url: `ws://127.0.0.1:${port}/realtime`,
    close: async () => {
      await realtime.close();
      await new Promise((resolve) => {
        const timeout = setTimeout(resolve, 250);

        server.close(() => {
          clearTimeout(timeout);
          resolve();
        });
      });
    },
  };
};

const waitForMessage = (socket, timeoutMs = 500) =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.removeEventListener('message', onMessage);
      reject(new Error('Timed out waiting for realtime message'));
    }, timeoutMs);

    const onMessage = (event) => {
      clearTimeout(timer);
      socket.removeEventListener('message', onMessage);
      resolve(JSON.parse(event.data.toString()));
    };

    socket.addEventListener('message', onMessage);
  });

const waitForNoMessage = (socket, timeoutMs = 100) =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.removeEventListener('message', onMessage);
      resolve();
    }, timeoutMs);

    const onMessage = () => {
      clearTimeout(timer);
      socket.removeEventListener('message', onMessage);
      reject(new Error('Unexpected realtime message'));
    };

    socket.addEventListener('message', onMessage);
  });

const waitForClose = (socket) =>
  new Promise((resolve) => {
    socket.addEventListener('close', (event) => resolve(event), { once: true });
  });

const waitForCondition = async (predicate, timeoutMs = 500) => {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (predicate()) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 10));
  }

  assert.equal(predicate(), true);
};

const connectAs = async (url, token) => {
  const socket = new WebSocket(url);

  await new Promise((resolve) => socket.addEventListener('open', resolve, { once: true }));
  socket.send(JSON.stringify({ type: 'authenticate', token }));
  const connectedMessage = await waitForMessage(socket);

  assert.equal(connectedMessage.type, 'realtime.connected');

  return socket;
};

test('Realtime server authenticates a connection before delivering user events', async () => {
  const testServer = await createTestRealtimeServer();

  try {
    const socket = await connectAs(testServer.url, 'token-a');

    assert.equal(testServer.realtime.getConnectionCount('user-a'), 1);

    testServer.realtime.emitToUser('user-a', {
      type: 'workout.updated',
      workoutId: 'workout-1',
      status: 'planned',
    });

    const event = await waitForMessage(socket);

    assert.equal(event.type, 'workout.updated');
    assert.equal(event.workoutId, 'workout-1');
    assert.equal(event.status, 'planned');
    assert.ok(event.occurredAt);

    socket.close();
  } finally {
    await testServer.close();
  }
});

test('Realtime server rejects unauthenticated or invalid connections', async () => {
  const testServer = await createTestRealtimeServer();

  try {
    const socket = new WebSocket(testServer.url);
    await new Promise((resolve) => socket.addEventListener('open', resolve, { once: true }));

    socket.send(JSON.stringify({ type: 'authenticate', token: 'invalid-token' }));
    const closeEvent = await waitForClose(socket);

    assert.equal(closeEvent.code, 1008);
  } finally {
    await testServer.close();
  }
});

test('Realtime server isolates events by authenticated user', async () => {
  const testServer = await createTestRealtimeServer();

  try {
    const userA = await connectAs(testServer.url, 'token-a');
    const userB = await connectAs(testServer.url, 'token-b');

    testServer.realtime.emitToUser('user-a', {
      type: 'workout.completed',
      workoutId: 'workout-a',
      status: 'completed',
    });

    const userAEvent = await waitForMessage(userA);

    assert.equal(userAEvent.type, 'workout.completed');
    assert.equal(userAEvent.workoutId, 'workout-a');
    await waitForNoMessage(userB);

    userA.close();
    userB.close();
  } finally {
    await testServer.close();
  }
});

test('Realtime server handles duplicate connections, disconnect, and reconnect cleanup', async () => {
  const testServer = await createTestRealtimeServer();

  try {
    const firstConnection = await connectAs(testServer.url, 'token-a');
    const secondConnection = await connectAs(testServer.url, 'token-a');

    assert.equal(testServer.realtime.getConnectionCount('user-a'), 2);

    firstConnection.close();
    await waitForClose(firstConnection);
    await waitForCondition(() => testServer.realtime.getConnectionCount('user-a') === 1);
    assert.equal(testServer.realtime.getConnectionCount('user-a'), 1);

    secondConnection.close();
    await waitForClose(secondConnection);
    await waitForCondition(() => testServer.realtime.getConnectionCount('user-a') === 0);
    assert.equal(testServer.realtime.getConnectionCount('user-a'), 0);

    const reconnected = await connectAs(testServer.url, 'token-a');

    assert.equal(testServer.realtime.getConnectionCount('user-a'), 1);
    reconnected.close();
  } finally {
    await testServer.close();
  }
});

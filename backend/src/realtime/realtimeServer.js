import jwt from 'jsonwebtoken';
import { WebSocket, WebSocketServer } from 'ws';
import User from '../models/User.js';

const AUTH_TIMEOUT_MS = 5000;
const HEARTBEAT_INTERVAL_MS = 30000;
const REALTIME_PATH = '/realtime';

let realtimeServer = null;

const getAllowedOrigins = () =>
  (process.env.CLIENT_URL || 'http://localhost:5173,http://localhost:5174')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

const isAllowedOrigin = (origin) => !origin || getAllowedOrigins().includes(origin);

const defaultVerifyToken = async (token) => {
  if (!process.env.JWT_SECRET) {
    throw new Error('Authentication is not configured');
  }

  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const user = await User.findById(decoded.id).select('_id');

  if (!user) {
    throw new Error('User not found');
  }

  return String(user._id);
};

const sendJson = (socket, payload) => {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(payload));
  }
};

const parseMessage = (message) => {
  try {
    return JSON.parse(message.toString());
  } catch {
    return null;
  }
};

export const createRealtimeServer = ({ server, verifyToken = defaultVerifyToken } = {}) => {
  if (!server) {
    throw new Error('HTTP server is required for realtime setup');
  }

  const wss = new WebSocketServer({ server, path: REALTIME_PATH });
  const userConnections = new Map();

  const addUserConnection = (userId, socket) => {
    const key = String(userId);
    const connections = userConnections.get(key) || new Set();
    connections.add(socket);
    userConnections.set(key, connections);
  };

  const removeUserConnection = (userId, socket) => {
    if (!userId) return;

    const key = String(userId);
    const connections = userConnections.get(key);

    if (!connections) return;

    connections.delete(socket);

    if (connections.size === 0) {
      userConnections.delete(key);
    }
  };

  const heartbeat = setInterval(() => {
    wss.clients.forEach((socket) => {
      if (socket.isAlive === false) {
        socket.terminate();
        return;
      }

      socket.isAlive = false;
      socket.ping();
    });
  }, HEARTBEAT_INTERVAL_MS);

  wss.on('connection', (socket, request) => {
    const origin = request.headers.origin;

    if (!isAllowedOrigin(origin)) {
      socket.close(1008, 'Origin not allowed');
      return;
    }

    socket.isAlive = true;
    socket.authenticatedUserId = null;
    socket.realtimeClientId = null;

    const authTimer = setTimeout(() => {
      if (!socket.authenticatedUserId) {
        socket.close(1008, 'Authentication required');
      }
    }, AUTH_TIMEOUT_MS);

    socket.on('pong', () => {
      socket.isAlive = true;
    });

    socket.on('message', async (rawMessage) => {
      const message = parseMessage(rawMessage);

      if (!socket.authenticatedUserId) {
        if (message?.type !== 'authenticate' || typeof message.token !== 'string') {
          socket.close(1008, 'Authentication required');
          return;
        }

        try {
          const userId = await verifyToken(message.token);
          socket.authenticatedUserId = userId;
          socket.realtimeClientId = typeof message.clientId === 'string' ? message.clientId.slice(0, 128) : null;
          clearTimeout(authTimer);
          addUserConnection(userId, socket);
          sendJson(socket, {
            type: 'realtime.connected',
            occurredAt: new Date().toISOString(),
          });
        } catch {
          socket.close(1008, 'Authentication failed');
        }

        return;
      }

      if (message?.type === 'ping') {
        sendJson(socket, { type: 'pong', occurredAt: new Date().toISOString() });
      }
    });

    socket.on('close', () => {
      clearTimeout(authTimer);
      removeUserConnection(socket.authenticatedUserId, socket);
    });
  });

  const emitToUser = (userId, event) => {
    const connections = userConnections.get(String(userId));

    if (!connections || connections.size === 0) {
      return false;
    }

    const payload = JSON.stringify({
      ...event,
      occurredAt: event.occurredAt || new Date().toISOString(),
    });

    connections.forEach((socket) => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(payload);
      }
    });

    return true;
  };

  const close = async () => {
    clearInterval(heartbeat);
    userConnections.clear();
    wss.clients.forEach((socket) => socket.terminate());

    await new Promise((resolve) => {
      const timeout = setTimeout(resolve, 250);

      wss.close(() => {
        clearTimeout(timeout);
        resolve();
      });
    });
  };

  return {
    wss,
    emitToUser,
    close,
    getConnectionCount: (userId) => userConnections.get(String(userId))?.size || 0,
  };
};

export const attachRealtimeServer = (server) => {
  realtimeServer = createRealtimeServer({ server });
  return realtimeServer;
};

export const emitRealtimeEvent = (userId, event) => {
  try {
    realtimeServer?.emitToUser(userId, event);
  } catch (error) {
    console.warn('Realtime event delivery failed', { message: error.message });
  }
};

export const closeRealtimeServer = () => realtimeServer?.close();

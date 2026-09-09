const rawBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const realtimeUrl = `${rawBaseUrl.replace(/\/api\/?$/, '').replace(/\/$/, '').replace(/^http/, 'ws')}/realtime`;
const REALTIME_CLIENT_ID_KEY = 'getjackedcoach.realtimeClientId';

export const getRealtimeClientId = () => {
  const existingId = window.sessionStorage.getItem(REALTIME_CLIENT_ID_KEY);

  if (existingId) {
    return existingId;
  }

  const nextId = window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  window.sessionStorage.setItem(REALTIME_CLIENT_ID_KEY, nextId);

  return nextId;
};

export type RealtimeEvent =
  | { type: 'realtime.connected'; occurredAt: string }
  | { type: 'workout.updated'; workoutId: string; status?: string; sourceClientId?: string; occurredAt: string }
  | { type: 'workout.completed'; workoutId: string; status?: string; sourceClientId?: string; occurredAt: string }
  | { type: 'progress.updated'; progressId: string; sourceClientId?: string; occurredAt: string }
  | { type: string; [key: string]: unknown };

type RealtimeConnectionOptions = {
  token: string;
  onEvent: (event: RealtimeEvent) => void;
  onStatus?: (status: 'connecting' | 'connected' | 'disconnected') => void;
};

export const createRealtimeConnection = ({ token, onEvent, onStatus }: RealtimeConnectionOptions) => {
  let socket: WebSocket | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let reconnectAttempts = 0;
  let intentionallyClosed = false;

  const clearReconnectTimer = () => {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
  };

  const scheduleReconnect = () => {
    if (intentionallyClosed) return;

    const delay = Math.min(10000, 1000 * 2 ** reconnectAttempts);
    reconnectAttempts += 1;
    clearReconnectTimer();
    reconnectTimer = setTimeout(connect, delay);
  };

  const connect = () => {
    if (intentionallyClosed) return;

    onStatus?.('connecting');
    socket = new WebSocket(realtimeUrl);

    socket.addEventListener('open', () => {
      socket?.send(JSON.stringify({ type: 'authenticate', token, clientId: getRealtimeClientId() }));
    });

    socket.addEventListener('message', (event) => {
      try {
        const payload = JSON.parse(event.data) as RealtimeEvent;

        if (payload.type === 'realtime.connected') {
          reconnectAttempts = 0;
          onStatus?.('connected');
        }

        onEvent(payload);
      } catch {
        // Ignore malformed realtime messages. REST remains authoritative.
      }
    });

    socket.addEventListener('close', () => {
      onStatus?.('disconnected');
      scheduleReconnect();
    });

    socket.addEventListener('error', () => {
      onStatus?.('disconnected');
    });
  };

  connect();

  return {
    disconnect: () => {
      intentionallyClosed = true;
      clearReconnectTimer();
      socket?.close(1000, 'Client disconnected');
      socket = null;
      onStatus?.('disconnected');
    },
  };
};

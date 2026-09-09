import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from './AuthContext.jsx';
import { createRealtimeConnection, getRealtimeClientId } from '../services/realtimeService';

const RealtimeContext = createContext(null);

export function RealtimeProvider({ children }) {
  const { isAuthenticated, token } = useAuth();
  const subscribersRef = useRef(new Map());
  const connectionRef = useRef(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');

  const notifySubscribers = useCallback((event) => {
    if (event.sourceClientId && event.sourceClientId === getRealtimeClientId()) {
      return;
    }

    const subscribers = [
      ...(subscribersRef.current.get(event.type) || []),
      ...(subscribersRef.current.get('*') || []),
    ];

    subscribers.forEach((handler) => {
      handler(event);
    });
  }, []);

  useEffect(() => {
    connectionRef.current?.disconnect();
    connectionRef.current = null;

    if (!isAuthenticated || !token) {
      setConnectionStatus('disconnected');
      return undefined;
    }

    connectionRef.current = createRealtimeConnection({
      token,
      onEvent: notifySubscribers,
      onStatus: setConnectionStatus,
    });

    return () => {
      connectionRef.current?.disconnect();
      connectionRef.current = null;
    };
  }, [isAuthenticated, notifySubscribers, token]);

  const subscribe = useCallback((eventTypes, handler) => {
    const types = Array.isArray(eventTypes) ? eventTypes : [eventTypes];

    types.forEach((type) => {
      const handlers = subscribersRef.current.get(type) || new Set();
      handlers.add(handler);
      subscribersRef.current.set(type, handlers);
    });

    return () => {
      types.forEach((type) => {
        const handlers = subscribersRef.current.get(type);

        if (!handlers) return;

        handlers.delete(handler);

        if (handlers.size === 0) {
          subscribersRef.current.delete(type);
        }
      });
    };
  }, []);

  const value = useMemo(
    () => ({
      connectionStatus,
      subscribe,
    }),
    [connectionStatus, subscribe],
  );

  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
}

export function useRealtime() {
  return useContext(RealtimeContext);
}

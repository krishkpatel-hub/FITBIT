import api from './axios';
import type { ApiSuccess, CoachChatResponse, CoachInsight } from '../types/domain';

const rawBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const apiBaseUrl = `${rawBaseUrl.replace(/\/$/, '')}/api`;

class CoachStreamError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'CoachStreamError';
    this.status = status;
  }
}

export type CoachStreamEvent =
  | { type: 'status'; message: string }
  | { type: 'text_delta'; delta: string }
  | { type: 'complete'; sources?: string[] }
  | { type: 'error'; message: string };

const parseStreamChunk = (buffer: string, onEvent: (event: CoachStreamEvent) => void) => {
  const events = buffer.split('\n\n');
  const remaining = events.pop() || '';

  events.forEach((eventBlock) => {
    const dataLine = eventBlock
      .split('\n')
      .find((line) => line.startsWith('data: '));

    if (!dataLine) return;

    try {
      onEvent(JSON.parse(dataLine.slice(6)) as CoachStreamEvent);
    } catch {
      onEvent({ type: 'error', message: 'Coach stream returned an unreadable event.' });
    }
  });

  return remaining;
};

export const coachService = {
  getCoachInsights: async (): Promise<ApiSuccess<CoachInsight[]>> => {
    const response = await api.get('/coach/insights');
    return response.data;
  },
  sendCoachMessage: async (message: string): Promise<ApiSuccess<CoachChatResponse>> => {
    const response = await api.post('/coach/chat', { message });
    return response.data;
  },
  streamCoachMessage: async ({
    message,
    signal,
    onEvent,
  }: {
    message: string;
    signal: AbortSignal;
    onEvent: (event: CoachStreamEvent) => void;
  }): Promise<void> => {
    const token = localStorage.getItem('fitbitStrengthToken');
    const response = await fetch(`${apiBaseUrl}/coach/chat/stream`, {
      method: 'POST',
      signal,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ message }),
    });

    if (!response.ok) {
      if (response.status === 401) {
        window.dispatchEvent(new Event('fitbit-strength:unauthorized'));
      }

      let messageText = 'Unable to stream Coach response right now.';

      try {
        const errorBody = await response.json();
        messageText = errorBody.message || messageText;
      } catch {
        // Streaming fallbacks intentionally avoid exposing raw response bodies.
      }

      throw new CoachStreamError(messageText, response.status);
    }

    if (!response.body) {
      throw new CoachStreamError('Coach streaming is not supported by this browser.');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { value, done } = await reader.read();

        if (done) break;

        buffer = parseStreamChunk(buffer + decoder.decode(value, { stream: true }), onEvent);
      }

      buffer = parseStreamChunk(buffer + decoder.decode(), onEvent);

      if (buffer.trim()) {
        onEvent({ type: 'error', message: 'Coach stream ended with an incomplete event.' });
      }
    } finally {
      reader.releaseLock();
    }
  },
};

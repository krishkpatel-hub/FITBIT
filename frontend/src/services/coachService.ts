import api from './axios';
import type { ApiSuccess, CoachChatResponse, CoachInsight } from '../types/domain';
import { CoachStreamError, readCoachStream } from '../utils/coachStream';
import type { CoachStreamEvent } from '../utils/coachStream';

export type { CoachStreamEvent } from '../utils/coachStream';
const COACH_STREAM_TIMEOUT_MS = 75000;

export const coachService = {
  getCoachInsights: async (): Promise<ApiSuccess<CoachInsight[]>> => {
    const response = await api.get('/coach/insights');
    return response.data;
  },
  sendCoachMessage: async (message: string): Promise<ApiSuccess<CoachChatResponse>> => {
    const response = await api.post('/coach/chat', { message });
    return response.data;
  },
  streamCoachMessage: async ({ message, signal, onEvent }: {
    message: string;
    signal: AbortSignal;
    onEvent: (event: CoachStreamEvent) => void;
  }): Promise<void> => {
    const requestController = new AbortController();
    const abortRequest = () => requestController.abort();
    let timedOut = false;
    signal.throwIfAborted();
    signal.addEventListener('abort', abortRequest, { once: true });
    const timeout = window.setTimeout(() => {
      timedOut = true;
      requestController.abort();
    }, COACH_STREAM_TIMEOUT_MS);

    const fallback = async () => {
      const response = await api.post<ApiSuccess<CoachChatResponse>>('/coach/chat', { message }, { signal: requestController.signal });
      onEvent({ type: 'text_delta', delta: response.data.data.answer });
      onEvent({ type: 'complete', sources: response.data.data.sources });
    };

    try {
      if (typeof ReadableStream === 'undefined') return await fallback();
      const token = localStorage.getItem('fitbitStrengthToken');
      const response = await fetch(`${api.defaults.baseURL}/coach/chat/stream`, {
        method: 'POST',
        signal: requestController.signal,
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ message }),
      });
      // Only retry through REST if the streaming endpoint is unavailable.
      if ([404, 405, 501].includes(response.status)) {
        await response.body?.cancel();
        return await fallback();
      }
      if (!response.ok) {
        await response.body?.cancel();
        if (response.status === 401) window.dispatchEvent(new Event('fitbit-strength:unauthorized'));
        throw new CoachStreamError('Unable to reach Coach right now.', response.status);
      }
      if (!response.body || !response.headers.get('content-type')?.includes('text/event-stream')) {
        await response.body?.cancel();
        throw new CoachStreamError('Coach response was interrupted. Please try again.');
      }
      await readCoachStream(response.body, requestController.signal, onEvent);
    } catch (error) {
      if (timedOut) throw new CoachStreamError('Coach took too long to respond. Please try again.', 504);
      if (signal.aborted) throw new DOMException('Response cancelled.', 'AbortError');
      throw error;
    } finally {
      window.clearTimeout(timeout);
      signal.removeEventListener('abort', abortRequest);
    }
  },
};

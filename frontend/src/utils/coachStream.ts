export type CoachStreamEvent =
  | { type: 'status'; message: string }
  | { type: 'text_delta'; delta: string }
  | { type: 'complete'; sources?: string[] }
  | { type: 'error'; message: string; status?: number };

export class CoachStreamError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
    this.name = 'CoachStreamError';
  }
}

const parseEvent = (block: string): CoachStreamEvent | null => {
  const data = block.split('\n').filter((line) => line.startsWith('data:'))
    .map((line) => line.slice(5).trimStart()).join('\n');
  if (!data) return null; // SSE comments are heartbeats, not application events.
  let event;
  try { event = JSON.parse(data); } catch { throw new CoachStreamError('Unreadable Coach response.'); }
  if (!event || typeof event !== 'object') throw new CoachStreamError('Unreadable Coach response.');
  if ((event.type === 'status' || event.type === 'error') && typeof event.message === 'string') return event;
  if (event.type === 'text_delta' && typeof event.delta === 'string') return event;
  if (event.type === 'complete' && (event.sources === undefined ||
    (Array.isArray(event.sources) && event.sources.every((source: unknown) => typeof source === 'string')))) return event;
  throw new CoachStreamError('Unreadable Coach response.');
};

export const readCoachStream = async (
  body: ReadableStream<Uint8Array>,
  signal: AbortSignal,
  onEvent: (event: CoachStreamEvent) => void,
): Promise<void> => {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let complete = false;
  const abort = () => { void reader.cancel().catch(() => {}); };
  signal.addEventListener('abort', abort, { once: true });
  try {
    while (!complete) {
      signal.throwIfAborted();
      const { value, done } = await reader.read();
      signal.throwIfAborted();
      buffer += decoder.decode(value, { stream: !done });
      buffer = buffer.replace(/\r\n/g, '\n');
      if (buffer.length > 262144) throw new CoachStreamError('Unreadable Coach response.');
      let boundary;
      while ((boundary = buffer.indexOf('\n\n')) !== -1) {
        const event = parseEvent(buffer.slice(0, boundary));
        buffer = buffer.slice(boundary + 2);
        if (!event) continue;
        if (event.type === 'error') throw new CoachStreamError(event.message, event.status);
        onEvent(event);
        if (event.type === 'complete') { complete = true; break; }
      }
      if (done && !complete) throw new CoachStreamError('Coach response was interrupted. Please try again.');
    }
  } finally {
    signal.removeEventListener('abort', abort);
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
};

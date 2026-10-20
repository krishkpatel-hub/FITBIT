import asyncHandler from 'express-async-handler';
import { getSmartCoachInsightsForUser } from '../services/analyticsService.js';
import { runCoachAgent, streamCoachAgent } from '../services/coachAgent.js';
import { sendSuccess } from '../utils/apiHelpers.js';

const MAX_COACH_MESSAGE_LENGTH = 1000;

export const getCoachInsights = asyncHandler(async (req, res) => {
  const { insights } = await getSmartCoachInsightsForUser(req.user.id);

  sendSuccess(res, insights);
});

export const chatWithCoach = asyncHandler(async (req, res) => {
  const message = typeof req.body.message === 'string' ? req.body.message.trim() : '';

  validateCoachMessage(message);

  const coachResponse = await runCoachAgent({
    authenticatedUserId: req.user.id,
    message,
  });

  sendSuccess(res, coachResponse);
});

const validateCoachMessage = (message) => {
  if (!message) {
    const error = new Error('Message is required');
    error.statusCode = 400;
    throw error;
  }

  if (message.length > MAX_COACH_MESSAGE_LENGTH) {
    const error = new Error(`Message must be ${MAX_COACH_MESSAGE_LENGTH} characters or fewer`);
    error.statusCode = 400;
    throw error;
  }
};

const writeStreamEvent = (res, event) => {
  if (res.destroyed || res.writableEnded) return;
  res.write(`data: ${JSON.stringify(event)}\n\n`);
};

const getClientSafeStreamError = (error) => {
  if (error.statusCode === 429) {
    return 'The coach is receiving too many requests. Please try again shortly.';
  }

  if (error.statusCode === 499) {
    return 'Coach response was cancelled.';
  }

  if (error.statusCode === 504) {
    return 'The coach took too long to respond. Please try again.';
  }

  return error.expose ? error.message : 'Unable to stream Coach response right now.';
};

export const createStreamChatHandler = (runAgent = streamCoachAgent, { timeoutMs = 65000 } = {}) => asyncHandler(async (req, res) => {
  const message = typeof req.body.message === 'string' ? req.body.message.trim() : '';
  validateCoachMessage(message);

  const abortController = new AbortController();

  // IncomingMessage.close also fires when a normal POST body finishes.
  // Only the response closing means the streaming client has disconnected.
  const handleDisconnect = () => {
    if (!res.writableEnded) {
      abortController.abort();
    }
  };
  res.on('close', handleDisconnect);
  const timeout = setTimeout(() => abortController.abort(new DOMException('Coach timed out', 'TimeoutError')), timeoutMs);

  res.status(200);
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();
  const heartbeat = setInterval(() => {
    if (!res.destroyed && !res.writableEnded) res.write(': keep-alive\n\n');
  }, 15000);

  let rejectOnAbort;
  const cancelled = new Promise((_, reject) => {
    rejectOnAbort = () => {
      const error = new Error('Coach request ended');
      error.statusCode = abortController.signal.reason?.name === 'TimeoutError' ? 504 : 499;
      reject(error);
    };
    abortController.signal.addEventListener('abort', rejectOnAbort, { once: true });
  });

  try {
    // Bound the response even when a database operation cannot be cancelled.
    await Promise.race([cancelled, runAgent({
      authenticatedUserId: req.user.id,
      message,
      signal: abortController.signal,
      onEvent: async (event) => {
        if (!abortController.signal.aborted) writeStreamEvent(res, event);
      },
    })]);
  } catch (error) {
    if (!res.destroyed && !res.writableEnded) {
      writeStreamEvent(res, {
        type: 'error',
        message: getClientSafeStreamError(error),
        status: error.statusCode || 502,
      });
    }
  } finally {
    clearTimeout(timeout);
    clearInterval(heartbeat);
    abortController.signal.removeEventListener('abort', rejectOnAbort);
    res.off('close', handleDisconnect);
    if (!res.writableEnded) {
      res.end();
    }
  }
});

export const streamChatWithCoach = createStreamChatHandler();

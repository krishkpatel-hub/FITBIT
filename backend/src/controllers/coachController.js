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

export const streamChatWithCoach = asyncHandler(async (req, res) => {
  const message = typeof req.body.message === 'string' ? req.body.message.trim() : '';
  validateCoachMessage(message);

  const abortController = new AbortController();

  req.on('close', () => {
    if (!res.writableEnded) {
      abortController.abort();
    }
  });

  res.status(200);
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  try {
    await streamCoachAgent({
      authenticatedUserId: req.user.id,
      message,
      signal: abortController.signal,
      onEvent: async (event) => writeStreamEvent(res, event),
    });
  } catch (error) {
    if (!res.writableEnded) {
      writeStreamEvent(res, {
        type: 'error',
        message: getClientSafeStreamError(error),
      });
    }
  } finally {
    if (!res.writableEnded) {
      res.end();
    }
  }
});

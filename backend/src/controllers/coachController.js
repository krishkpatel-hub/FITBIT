import asyncHandler from 'express-async-handler';
import { getSmartCoachInsightsForUser } from '../services/analyticsService.js';
import { runCoachAgent } from '../services/coachAgent.js';
import { sendSuccess } from '../utils/apiHelpers.js';

const MAX_COACH_MESSAGE_LENGTH = 1000;

export const getCoachInsights = asyncHandler(async (req, res) => {
  const { insights } = await getSmartCoachInsightsForUser(req.user.id);

  sendSuccess(res, insights);
});

export const chatWithCoach = asyncHandler(async (req, res) => {
  const message = typeof req.body.message === 'string' ? req.body.message.trim() : '';

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

  const coachResponse = await runCoachAgent({
    authenticatedUserId: req.user.id,
    message,
  });

  sendSuccess(res, coachResponse);
});

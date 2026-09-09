import asyncHandler from 'express-async-handler';
import PRRecord from '../models/PRRecord.js';
import Progress from '../models/Progress.js';
import TrainingMax from '../models/TrainingMax.js';
import Workout from '../models/Workout.js';
import { runCoachAgent } from '../services/coachAgent.js';
import { generateSmartCoachInsights } from '../services/smartCoachService.js';
import { sendSuccess } from '../utils/apiHelpers.js';

const MAX_COACH_MESSAGE_LENGTH = 1000;

export const getCoachInsights = asyncHandler(async (req, res) => {
  const userFilter = { user: req.user.id };

  const [workouts, trainingMaxes, prs, progressLogs] = await Promise.all([
    Workout.find(userFilter).sort({ date: -1, updatedAt: -1 }).limit(120),
    TrainingMax.find(userFilter).sort({ liftName: 1 }),
    PRRecord.find(userFilter).sort({ date: -1, updatedAt: -1 }).limit(80),
    Progress.find(userFilter).sort({ date: -1, updatedAt: -1 }).limit(45),
  ]);

  const insights = generateSmartCoachInsights({
    workouts,
    trainingMaxes,
    prs,
    progressLogs,
  });

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

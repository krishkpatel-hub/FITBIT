import asyncHandler from 'express-async-handler';
import PRRecord from '../models/PRRecord.js';
import Progress from '../models/Progress.js';
import TrainingMax from '../models/TrainingMax.js';
import Workout from '../models/Workout.js';
import { generateSmartCoachInsights } from '../services/smartCoachService.js';
import { sendSuccess } from '../utils/apiHelpers.js';

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

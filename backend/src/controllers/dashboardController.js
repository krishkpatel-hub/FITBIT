import asyncHandler from 'express-async-handler';
import { getDashboardSummary } from '../services/analyticsService.js';
import { sendSuccess } from '../utils/apiHelpers.js';

export const getDashboardData = asyncHandler(async (req, res) => {
  const dashboardData = await getDashboardSummary({ user: req.user });

  sendSuccess(res, dashboardData);
});

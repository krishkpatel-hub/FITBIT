import asyncHandler from 'express-async-handler';
import mongoose from 'mongoose';
import PRRecord from '../models/PRRecord.js';
import Progress from '../models/Progress.js';
import Recommendation from '../models/Recommendation.js';
import TrainingMax from '../models/TrainingMax.js';
import Workout from '../models/Workout.js';
import { getLiftLabel } from '../services/adaptiveFitnessService.js';
import { sendSuccess } from '../utils/apiHelpers.js';

const startOfDay = (date) => {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
};

const assertValidDate = (date, label) => {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    const error = new Error(`${label} must be a valid date`);
    error.statusCode = 400;
    throw error;
  }
};

const getWeekKey = (date) => {
  const value = startOfDay(date);
  const day = value.getDay();
  const diff = value.getDate() - day + (day === 0 ? -6 : 1);
  value.setDate(diff);
  return value.toISOString().slice(0, 10);
};

const buildWeeklyWorkoutVolume = (workouts) => {
  const volumeByWeek = workouts.reduce((weeks, workout) => {
    const week = getWeekKey(workout.date);
    weeks[week] = (weeks[week] || 0) + (workout.totalVolume || 0);
    return weeks;
  }, {});

  return Object.entries(volumeByWeek)
    .map(([week, totalVolume]) => ({ week, totalVolume }))
    .sort((a, b) => new Date(a.week) - new Date(b.week));
};

const buildStrengthProgression = (trainingMaxes) => {
  return trainingMaxes.flatMap((trainingMax) =>
    trainingMax.history.map((entry) => ({
      liftName: trainingMax.liftName,
      liftLabel: getLiftLabel(trainingMax.liftName),
      week: entry.week,
      oneRepMax: entry.oneRepMax,
      trainingMax: entry.trainingMax,
      increaseAmount: entry.increaseAmount,
      plusSetReps: entry.plusSetReps,
      date: entry.date,
    })),
  );
};

export const getDashboardData = asyncHandler(async (req, res) => {
  const userFilter = { user: req.user.id };
  const now = new Date();
  const todayStart = startOfDay(now);
  const twelveWeeksAgo = new Date(now);
  twelveWeeksAgo.setDate(twelveWeeksAgo.getDate() - 84);
  assertValidDate(todayStart, 'Dashboard start date');
  assertValidDate(twelveWeeksAgo, 'Dashboard volume start date');

  const [
    trainingMaxes,
    lastWorkout,
    nextWorkout,
    recommendations,
    prs,
    progressHistory,
    recentCompletedWorkouts,
  ] = await Promise.all([
    TrainingMax.find(userFilter).sort({ liftName: 1 }),
    Workout.findOne({ ...userFilter, status: 'completed' }).sort({ date: -1, updatedAt: -1 }),
    Workout.findOne({ ...userFilter, status: 'planned', date: mongoose.trusted({ $gte: todayStart }) }).sort({ date: 1, createdAt: 1 }),
    Recommendation.find(userFilter).sort({ createdAt: -1 }).limit(5),
    PRRecord.find(userFilter).sort({ date: -1 }).limit(5),
    Progress.find(userFilter).sort({ date: -1 }).limit(12),
    Workout.find({ ...userFilter, status: 'completed', date: mongoose.trusted({ $gte: twelveWeeksAgo }) }).sort({ date: 1 }),
  ]);

  const profileSummary = {
    id: req.user.id,
    firstName: req.user.firstName,
    lastName: req.user.lastName,
    username: req.user.username,
    email: req.user.email,
    fitnessGoal: req.user.fitnessGoal,
    activityLevel: req.user.activityLevel,
  };

  sendSuccess(res, {
    user: profileSummary,
    currentTrainingMaxes: trainingMaxes,
    currentWeek: trainingMaxes[0]?.currentWeek || 1,
    lastWorkout,
    nextWorkout,
    recentRecommendations: recommendations,
    recentPRs: prs,
    currentPRs: prs,
    progressHistory,
    weeklyWorkoutVolume: buildWeeklyWorkoutVolume(recentCompletedWorkouts),
    strengthProgression: buildStrengthProgression(trainingMaxes),
  });
});

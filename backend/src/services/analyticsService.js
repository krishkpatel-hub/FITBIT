import mongoose from 'mongoose';
import Recommendation from '../models/Recommendation.js';
import Workout from '../models/Workout.js';
import { getLiftLabel } from './adaptiveFitnessService.js';
import { getRecentPRRecords } from './prService.js';
import { getRecentProgressEntries } from './progressService.js';
import { getUserTrainingMaxes } from './programService.js';
import { generateSmartCoachInsights } from './smartCoachService.js';
import { getUserWorkouts } from './workoutService.js';

export const startOfDay = (date) => {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
};

export const assertValidDate = (date, label) => {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    const error = new Error(`${label} must be a valid date`);
    error.statusCode = 400;
    throw error;
  }
};

export const getWeekKey = (date) => {
  const value = startOfDay(date);
  const day = value.getDay();
  const diff = value.getDate() - day + (day === 0 ? -6 : 1);
  value.setDate(diff);
  return value.toISOString().slice(0, 10);
};

export const buildWeeklyWorkoutVolume = (workouts) => {
  const volumeByWeek = workouts.reduce((weeks, workout) => {
    const week = getWeekKey(workout.date);
    weeks[week] = (weeks[week] || 0) + (workout.totalVolume || 0);
    return weeks;
  }, {});

  return Object.entries(volumeByWeek)
    .map(([week, totalVolume]) => ({ week, totalVolume }))
    .sort((a, b) => new Date(a.week) - new Date(b.week));
};

export const buildStrengthProgression = (trainingMaxes) =>
  trainingMaxes.flatMap((trainingMax) =>
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

export const getDashboardSummary = async ({ user }) => {
  const userFilter = { user: user.id };
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
    getUserTrainingMaxes({ userId: user.id }),
    Workout.findOne({ ...userFilter, status: 'completed' }).sort({ date: -1, updatedAt: -1 }),
    Workout.findOne({ ...userFilter, status: 'planned', date: mongoose.trusted({ $gte: todayStart }) }).sort({ date: 1, createdAt: 1 }),
    Recommendation.find(userFilter).sort({ createdAt: -1 }).limit(5),
    getRecentPRRecords({ userId: user.id, limit: 5 }),
    getRecentProgressEntries({ userId: user.id, limit: 12 }),
    Workout.find({ ...userFilter, status: 'completed', date: mongoose.trusted({ $gte: twelveWeeksAgo }) }).sort({ date: 1 }),
  ]);

  const profileSummary = {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    username: user.username,
    email: user.email,
    fitnessGoal: user.fitnessGoal,
    activityLevel: user.activityLevel,
  };

  return {
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
  };
};

export const getSmartCoachInsightsForUser = async (userId) => {
  const [workouts, trainingMaxes, prs, progressLogs] = await Promise.all([
    getUserWorkouts(userId, { sort: { date: -1, updatedAt: -1 }, limit: 120 }),
    getUserTrainingMaxes({ userId }),
    getRecentPRRecords({ userId, limit: 80 }),
    getRecentProgressEntries({ userId, limit: 45 }),
  ]);

  return {
    workouts,
    trainingMaxes,
    prs,
    progressLogs,
    insights: generateSmartCoachInsights({ workouts, trainingMaxes, prs, progressLogs }),
  };
};

export const getCoachProgressSummary = async (userId) => {
  const { workouts, prs, insights } = await getSmartCoachInsightsForUser(userId);

  const completedWorkouts = workouts.filter((workout) => workout.status === 'completed');
  const plannedWorkouts = workouts.filter((workout) => workout.status === 'planned');
  const totalVolume = completedWorkouts.reduce((sum, workout) => sum + Number(workout.totalVolume || 0), 0);
  const latestProgress = progressLogs[0] || null;
  const latestPR = prs[0] || null;

  return {
    completedWorkouts: completedWorkouts.length,
    plannedWorkouts: plannedWorkouts.length,
    totalCompletedVolume: totalVolume,
    latestProgress: latestProgress
      ? {
          date: latestProgress.date,
          bodyWeight: Number(latestProgress.bodyWeight || 0),
          bodyFatPercentage: Number(latestProgress.bodyFatPercentage || 0),
          measurements: latestProgress.measurements || {},
        }
      : null,
    latestPR: latestPR
      ? {
          exerciseName: latestPR.exerciseName,
          date: latestPR.date,
          oneRepMax: Number(latestPR.oneRepMax || 0),
          estimatedOneRepMax: Number(latestPR.estimatedOneRepMax || 0),
          weight: Number(latestPR.weight || 0),
          reps: Number(latestPR.reps || 0),
        }
      : null,
    insights: insights.slice(0, 5),
  };
};

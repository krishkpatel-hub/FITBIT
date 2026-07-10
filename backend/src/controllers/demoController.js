import asyncHandler from 'express-async-handler';
import PRRecord from '../models/PRRecord.js';
import Progress from '../models/Progress.js';
import Recommendation from '../models/Recommendation.js';
import TrainingMax from '../models/TrainingMax.js';
import Workout from '../models/Workout.js';
import { sendSuccess } from '../utils/apiHelpers.js';

const liftSeeds = [
  { liftName: 'squat', oneRepMax: 275, trainingMax: 250 },
  { liftName: 'bench', oneRepMax: 225, trainingMax: 205 },
  { liftName: 'deadlift', oneRepMax: 335, trainingMax: 300 },
  { liftName: 'overhead_press', oneRepMax: 145, trainingMax: 130 },
];

const daysAgo = (days) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(12, 0, 0, 0);
  return date;
};

const addTrainingMaxes = async (userId) => {
  const trainingMaxes = [];

  for (const lift of liftSeeds) {
    const existing = await TrainingMax.findOne({ user: userId, liftName: lift.liftName });

    if (existing) {
      if (existing.history.length === 0) {
        existing.history.push({
          week: existing.currentWeek || 1,
          liftName: existing.liftName,
          oneRepMax: existing.oneRepMax,
          trainingMax: existing.trainingMax,
          plusSetReps: 0,
          increaseAmount: 0,
          date: daysAgo(21),
        });
        await existing.save();
      }

      trainingMaxes.push(existing);
      continue;
    }

    trainingMaxes.push(
      await TrainingMax.create({
        user: userId,
        liftName: lift.liftName,
        oneRepMax: lift.oneRepMax,
        trainingMax: lift.trainingMax,
        currentWeek: 2,
        lastUpdated: new Date(),
        history: [
          {
            week: 1,
            liftName: lift.liftName,
            oneRepMax: lift.oneRepMax - 10,
            trainingMax: lift.trainingMax - 10,
            plusSetReps: 5,
            increaseAmount: 0,
            date: daysAgo(21),
          },
          {
            week: 2,
            liftName: lift.liftName,
            oneRepMax: lift.oneRepMax,
            trainingMax: lift.trainingMax,
            plusSetReps: 6,
            increaseAmount: 10,
            date: daysAgo(7),
          },
        ],
      }),
    );
  }

  return trainingMaxes;
};

const demoWorkouts = (userId) => [
  {
    user: userId,
    title: 'Demo Upper Strength',
    date: daysAgo(9),
    type: 'strength',
    status: 'completed',
    duration: 58,
    notes: 'Demo seed workout',
    exercises: [
      {
        exerciseName: 'Bench Press',
        muscleGroup: 'Chest',
        sets: [
          { setNumber: 1, reps: 5, weight: 175, targetReps: 5, completed: true },
          { setNumber: 2, reps: 5, weight: 185, targetReps: 5, completed: true },
          { setNumber: 3, reps: 6, weight: 195, targetReps: 5, completed: true, isPlusSet: true },
        ],
      },
      {
        exerciseName: 'Barbell Row',
        muscleGroup: 'Back',
        sets: [
          { setNumber: 1, reps: 8, weight: 155, targetReps: 8, completed: true },
          { setNumber: 2, reps: 8, weight: 155, targetReps: 8, completed: true },
        ],
      },
    ],
  },
  {
    user: userId,
    title: 'Demo Lower Strength',
    date: daysAgo(4),
    type: 'strength',
    status: 'completed',
    duration: 64,
    notes: 'Demo seed workout',
    exercises: [
      {
        exerciseName: 'Squat',
        muscleGroup: 'Legs',
        sets: [
          { setNumber: 1, reps: 5, weight: 205, targetReps: 5, completed: true },
          { setNumber: 2, reps: 5, weight: 225, targetReps: 5, completed: true },
          { setNumber: 3, reps: 7, weight: 235, targetReps: 5, completed: true, isPlusSet: true },
        ],
      },
      {
        exerciseName: 'Romanian Deadlift',
        muscleGroup: 'Hamstrings',
        sets: [
          { setNumber: 1, reps: 8, weight: 185, targetReps: 8, completed: true },
          { setNumber: 2, reps: 8, weight: 185, targetReps: 8, completed: true },
        ],
      },
    ],
  },
  {
    user: userId,
    title: 'Demo Planned Press Day',
    date: daysAgo(-2),
    type: 'strength',
    status: 'planned',
    notes: 'Demo seed workout',
    exercises: [
      {
        exerciseName: 'Overhead Press',
        muscleGroup: 'Shoulders',
        sets: [
          { setNumber: 1, reps: 0, weight: 105, targetReps: 5 },
          { setNumber: 2, reps: 0, weight: 115, targetReps: 5 },
          { setNumber: 3, reps: 0, weight: 120, targetReps: 5, isPlusSet: true },
        ],
      },
    ],
  },
];

export const seedDemoData = asyncHandler(async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    res.status(404);
    throw new Error('Demo helper is not available');
  }

  const userId = req.user.id;

  await Promise.all([
    Workout.deleteMany({ user: userId, notes: 'Demo seed workout' }),
    Progress.deleteMany({ user: userId, notes: 'Demo seed progress' }),
    PRRecord.deleteMany({ user: userId, notes: 'Demo seed PR' }),
    Recommendation.deleteMany({ user: userId, source: 'demo-seed' }),
  ]);

  const trainingMaxes = await addTrainingMaxes(userId);
  const [workouts, progressLogs, prs, recommendations] = await Promise.all([
    Workout.create(demoWorkouts(userId)),
    Progress.create([
      { user: userId, date: daysAgo(28), bodyWeight: 184.5, bodyFatPercentage: 18, notes: 'Demo seed progress' },
      { user: userId, date: daysAgo(14), bodyWeight: 183.2, bodyFatPercentage: 17.5, notes: 'Demo seed progress' },
      { user: userId, date: new Date(), bodyWeight: 182.4, bodyFatPercentage: 17.1, notes: 'Demo seed progress' },
    ]),
    PRRecord.create([
      { user: userId, exerciseName: 'Bench Press', weight: 205, reps: 3, oneRepMax: 225, estimatedOneRepMax: 225, date: daysAgo(6), notes: 'Demo seed PR' },
      { user: userId, exerciseName: 'Squat', weight: 245, reps: 5, oneRepMax: 285, estimatedOneRepMax: 286, date: daysAgo(3), notes: 'Demo seed PR' },
    ]),
    Recommendation.create([
      {
        user: userId,
        type: 'workout',
        title: 'Keep the lower-body momentum',
        message: 'Squat plus-set output is strong. Keep the next increase conservative and prioritize clean reps.',
        source: 'demo-seed',
        priority: 'medium',
      },
    ]),
  ]);

  sendSuccess(
    res,
    {
      message: 'Demo data created for the current user.',
      created: {
        trainingMaxes: trainingMaxes.length,
        workouts: workouts.length,
        progressLogs: progressLogs.length,
        prs: prs.length,
        recommendations: recommendations.length,
      },
    },
    201,
  );
});

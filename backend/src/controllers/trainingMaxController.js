import asyncHandler from 'express-async-handler';
import mongoose from 'mongoose';
import ProgramWeek from '../models/ProgramWeek.js';
import Recommendation from '../models/Recommendation.js';
import TrainingMax from '../models/TrainingMax.js';
import Workout from '../models/Workout.js';
import {
  calculateTrainingMax,
  generateRecommendation,
  generateWeeklyProgram,
  getIncreaseAmount,
  getLiftLabel,
  getNextWeek,
  supportedLifts,
} from '../services/adaptiveFitnessService.js';
import {
  buildHistoryEntry,
  buildProgramWeekSnapshot,
  getActiveWeekNumber,
  getCompletedProgramWeek,
  getGeneratedProgramWeek,
  getProgramWeeksForUser,
  getUserTrainingMaxes,
  getWeekNumber,
  upsertProgramWeekMaxSnapshot,
} from '../services/programService.js';
import { findUserDocumentById, requireFields, sendSuccess } from '../utils/apiHelpers.js';

const allowedTrainingMaxFields = ['liftName', 'oneRepMax', 'trainingMax', 'currentWeek'];

const pickTrainingMaxFields = (body) =>
  allowedTrainingMaxFields.reduce((fields, field) => {
    if (body[field] !== undefined) {
      fields[field] = body[field];
    }

    return fields;
  }, {});

const assertSupportedLift = (liftName) => {
  if (!supportedLifts.includes(liftName)) {
    const error = new Error('Unsupported lift');
    error.statusCode = 400;
    throw error;
  }
};

export const getTrainingMaxes = asyncHandler(async (req, res) => {
  const trainingMaxes = await getUserTrainingMaxes({ userId: req.user.id });

  sendSuccess(res, trainingMaxes);
});

export const getProgramWeeks = asyncHandler(async (req, res) => {
  const programWeeks = await getProgramWeeksForUser(req.user.id);

  sendSuccess(res, programWeeks);
});

export const getTrainingMaxById = asyncHandler(async (req, res) => {
  const trainingMax = await findUserDocumentById(TrainingMax, req.params.id, req.user.id, 'Training max');

  sendSuccess(res, trainingMax);
});

export const createTrainingMax = asyncHandler(async (req, res) => {
  requireFields(req.body, ['liftName', 'oneRepMax']);
  assertSupportedLift(req.body.liftName);

  const fields = pickTrainingMaxFields(req.body);
  const calculatedTrainingMax = fields.trainingMax ?? calculateTrainingMax(fields.oneRepMax);
  const { liftName, ...trainingMaxUpdates } = fields;

  const trainingMax = await TrainingMax.findOneAndUpdate(
    { user: req.user.id, liftName },
    {
      $set: {
        ...trainingMaxUpdates,
        trainingMax: calculatedTrainingMax,
        currentWeek: fields.currentWeek || 1,
        lastUpdated: new Date(),
      },
      $push: {
        history: buildHistoryEntry({
          liftName,
          week: fields.currentWeek || 1,
          oneRepMax: fields.oneRepMax,
          trainingMax: calculatedTrainingMax,
        }),
      },
    },
    {
      new: true,
      runValidators: true,
      upsert: true,
      setDefaultsOnInsert: true,
    },
  );

  const weekNumber = Number(fields.currentWeek || 1);
  const weekTrainingMaxes = await getUserTrainingMaxes({ userId: req.user.id, currentWeek: weekNumber });
  await upsertProgramWeekMaxSnapshot({
    userId: req.user.id,
    weekNumber,
    trainingMaxes: weekTrainingMaxes,
  });

  sendSuccess(res, trainingMax, 201);
});

export const updateTrainingMax = asyncHandler(async (req, res) => {
  const trainingMax = await findUserDocumentById(TrainingMax, req.params.id, req.user.id, 'Training max');
  const updates = pickTrainingMaxFields(req.body);

  if (updates.liftName) {
    assertSupportedLift(updates.liftName);
  }

  if (updates.oneRepMax !== undefined && updates.trainingMax === undefined) {
    updates.trainingMax = calculateTrainingMax(updates.oneRepMax);
  }

  const nextValues = {
    liftName: updates.liftName || trainingMax.liftName,
    week: updates.currentWeek || trainingMax.currentWeek,
    oneRepMax: updates.oneRepMax ?? trainingMax.oneRepMax,
    trainingMax: updates.trainingMax ?? trainingMax.trainingMax,
  };

  trainingMax.set({
    ...updates,
    lastUpdated: new Date(),
  });

  trainingMax.history.push(buildHistoryEntry(nextValues));

  const updatedTrainingMax = await trainingMax.save();

  const weekNumber = Number(nextValues.week || 1);
  const weekTrainingMaxes = await getUserTrainingMaxes({ userId: req.user.id, currentWeek: weekNumber });
  await upsertProgramWeekMaxSnapshot({
    userId: req.user.id,
    weekNumber,
    trainingMaxes: weekTrainingMaxes,
  });

  sendSuccess(res, updatedTrainingMax);
});

export const deleteTrainingMax = asyncHandler(async (req, res) => {
  const trainingMax = await findUserDocumentById(TrainingMax, req.params.id, req.user.id, 'Training max');

  await trainingMax.deleteOne();

  sendSuccess(res, { id: req.params.id, message: 'Training max deleted successfully' });
});

export const generateProgram = asyncHandler(async (req, res) => {
  const trainingMaxes = await getUserTrainingMaxes({ userId: req.user.id });

  if (trainingMaxes.length === 0) {
    res.status(400);
    throw new Error('Set up training maxes before generating a program');
  }

  const missingLifts = supportedLifts.filter(
    (liftName) => !trainingMaxes.some((trainingMax) => trainingMax.liftName === liftName),
  );

  if (missingLifts.length > 0) {
    res.status(400);
    throw new Error(`Set up training maxes for ${missingLifts.map((liftName) => getLiftLabel(liftName)).join(', ')} before generating a full week`);
  }

  const requestedWeek = Number(req.body.week || trainingMaxes[0]?.currentWeek || 1);

  if (requestedWeek < 1 || requestedWeek > 4) {
    res.status(400);
    throw new Error('Week must be between 1 and 4');
  }

  const existingProgramWeeks = await getProgramWeeksForUser(req.user.id);
  const activeWeek = getActiveWeekNumber(existingProgramWeeks);

  if (requestedWeek !== activeWeek) {
    res.status(400);
    throw new Error(
      requestedWeek > activeWeek
        ? `Complete Week ${activeWeek} before generating Week ${requestedWeek}`
        : `Week ${requestedWeek} is already completed and cannot be regenerated`,
    );
  }

  if (requestedWeek > 1) {
    const previousWeek = await getCompletedProgramWeek(req.user.id, requestedWeek - 1);

    if (!previousWeek) {
      res.status(400);
      throw new Error(`Complete all 4 workouts in Week ${requestedWeek - 1} before generating Week ${requestedWeek}`);
    }
  }

  const existingProgramWeek = existingProgramWeeks.find((entry) => getWeekNumber(entry) === requestedWeek);

  if (existingProgramWeek?.status === 'completed') {
    res.status(400);
    throw new Error(`Week ${requestedWeek} is already completed and cannot be regenerated`);
  }

  const maxesSavedForRequestedWeek = trainingMaxes.every(
    (trainingMax) => Number(trainingMax.currentWeek || 1) === requestedWeek,
  );

  if (!maxesSavedForRequestedWeek) {
    res.status(400);
    throw new Error(`Enter new maxes to generate Week ${requestedWeek}`);
  }

  if (existingProgramWeek?.workouts?.length >= 4) {
    const programWeek = await getGeneratedProgramWeek(req.user.id, requestedWeek);

    sendSuccess(res, {
      programWeek,
      workouts: programWeek.workouts,
      message: `Week ${requestedWeek} is already generated`,
    });
    return;
  }

  if (existingProgramWeek?.workouts?.length > 0) {
    await Workout.deleteMany({
      user: req.user.id,
      _id: mongoose.trusted({ $in: existingProgramWeek.workouts.map((workout) => workout._id) }),
    });
  }

  await TrainingMax.updateMany(
    { user: req.user.id, liftName: mongoose.trusted({ $in: supportedLifts }) },
    { $set: { currentWeek: requestedWeek, lastUpdated: new Date() } },
    { runValidators: true },
  );

  const refreshedTrainingMaxes = await getUserTrainingMaxes({ userId: req.user.id });
  const programWorkouts = generateWeeklyProgram(refreshedTrainingMaxes, requestedWeek);
  const createdWorkouts = await Workout.insertMany(
    programWorkouts.map((workout) => ({
      ...workout,
      user: req.user.id,
    })),
  );

  const programWeek = await ProgramWeek.findOneAndUpdate(
    { user: req.user.id, weekNumber: requestedWeek },
    {
      $set: {
        week: requestedWeek,
        status: 'current',
        daysCompleted: 0,
        maxesEntered: true,
        maxes: buildProgramWeekSnapshot(refreshedTrainingMaxes),
        workouts: createdWorkouts.map((workout) => workout._id),
        generatedAt: new Date(),
        completedAt: null,
      },
      $setOnInsert: {
        dateCreated: new Date(),
      },
    },
    {
      new: true,
      upsert: true,
      runValidators: true,
      setDefaultsOnInsert: true,
    },
  ).populate({
    path: 'workouts',
    options: { sort: { programDay: 1, date: 1 } },
  });

  sendSuccess(res, { programWeek, workouts: createdWorkouts }, 201);
});

export const updateProgression = asyncHandler(async (req, res) => {
  const { trainingMaxId, liftName, plusSetReps, notes } = req.body;

  if (plusSetReps === undefined || plusSetReps === null) {
    res.status(400);
    throw new Error('plusSetReps is required');
  }

  const trainingMax = trainingMaxId
    ? await findUserDocumentById(TrainingMax, trainingMaxId, req.user.id, 'Training max')
    : await TrainingMax.findOne({ user: req.user.id, liftName });

  if (!trainingMax) {
    res.status(404);
    throw new Error('Training max not found');
  }

  const increaseAmount = getIncreaseAmount(plusSetReps);
  const nextTrainingMax = trainingMax.trainingMax + increaseAmount;
  const nextWeek = getNextWeek(trainingMax.currentWeek);
  const completedWeek = trainingMax.currentWeek;

  trainingMax.trainingMax = nextTrainingMax;
  trainingMax.lastUpdated = new Date();

  const recommendationContent = generateRecommendation({
    liftName: trainingMax.liftName,
    increaseAmount,
    plusSetReps,
  });

  const [updatedTrainingMax, recommendation] = await Promise.all([
    trainingMax.save(),
    Recommendation.create({
      user: req.user.id,
      type: 'workout',
      source: 'smart-adaptive-fitness-engine',
      priority: recommendationContent.priority,
      title: recommendationContent.title,
      message: notes ? `${recommendationContent.message} Notes: ${notes}` : recommendationContent.message,
    }),
  ]);

  sendSuccess(res, {
    trainingMax: updatedTrainingMax,
    recommendation,
    increaseAmount,
    nextWeek,
    completedWeek,
  });
});

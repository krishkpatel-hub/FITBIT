import asyncHandler from 'express-async-handler';
import Recommendation from '../models/Recommendation.js';
import TrainingMax from '../models/TrainingMax.js';
import Workout from '../models/Workout.js';
import {
  calculateTrainingMax,
  generateRecommendation,
  generateWeeklyProgram,
  getIncreaseAmount,
  getNextWeek,
  supportedLifts,
} from '../services/adaptiveFitnessService.js';
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

const buildHistoryEntry = ({ liftName, week, oneRepMax, trainingMax, plusSetReps = 0, increaseAmount = 0 }) => ({
  week,
  liftName,
  oneRepMax,
  trainingMax,
  plusSetReps,
  increaseAmount,
  date: new Date(),
});

export const getTrainingMaxes = asyncHandler(async (req, res) => {
  const trainingMaxes = await TrainingMax.find({ user: req.user.id }).sort({ liftName: 1 });

  sendSuccess(res, trainingMaxes);
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

  const trainingMax = await TrainingMax.findOneAndUpdate(
    { user: req.user.id, liftName: fields.liftName },
    {
      $set: {
        ...fields,
        trainingMax: calculatedTrainingMax,
        currentWeek: fields.currentWeek || 1,
        lastUpdated: new Date(),
      },
      $setOnInsert: {
        user: req.user.id,
      },
      $push: {
        history: buildHistoryEntry({
          liftName: fields.liftName,
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

  sendSuccess(res, updatedTrainingMax);
});

export const deleteTrainingMax = asyncHandler(async (req, res) => {
  const trainingMax = await findUserDocumentById(TrainingMax, req.params.id, req.user.id, 'Training max');

  await trainingMax.deleteOne();

  sendSuccess(res, { id: req.params.id, message: 'Training max deleted successfully' });
});

export const generateProgram = asyncHandler(async (req, res) => {
  const trainingMaxes = await TrainingMax.find({ user: req.user.id }).sort({ liftName: 1 });

  if (trainingMaxes.length === 0) {
    res.status(400);
    throw new Error('Set up training maxes before generating a program');
  }

  const programWorkouts = generateWeeklyProgram(trainingMaxes, req.body.week);
  const createdWorkouts = await Workout.insertMany(
    programWorkouts.map((workout) => ({
      ...workout,
      user: req.user.id,
    })),
  );

  sendSuccess(res, createdWorkouts, 201);
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
  trainingMax.currentWeek = nextWeek;
  trainingMax.lastUpdated = new Date();
  trainingMax.history.push(
    buildHistoryEntry({
      liftName: trainingMax.liftName,
      week: completedWeek,
      oneRepMax: trainingMax.oneRepMax,
      trainingMax: nextTrainingMax,
      plusSetReps: Number(plusSetReps),
      increaseAmount,
    }),
  );

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
  });
});

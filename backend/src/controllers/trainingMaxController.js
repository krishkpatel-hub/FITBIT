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

const buildProgramWeekSnapshot = (trainingMaxes) =>
  supportedLifts.reduce((snapshot, liftName) => {
    const trainingMax = trainingMaxes.find((item) => item.liftName === liftName);

    snapshot[liftName] = {
      oneRepMax: trainingMax.oneRepMax,
      trainingMax: trainingMax.trainingMax,
    };

    return snapshot;
  }, {});

const getWeekNumber = (programWeek) => Number(programWeek.weekNumber || programWeek.week || 1);

const populateProgramWeekWorkouts = (query) =>
  query.populate({
    path: 'workouts',
    options: { sort: { programDay: 1, date: 1 } },
  });

const cleanupDuplicateProgramWeeks = async (userId) => {
  const programWeeks = await ProgramWeek.find({ user: userId }).sort({ updatedAt: -1, dateCreated: -1, createdAt: -1 });
  const newestByWeek = new Map();
  const duplicateIds = [];

  programWeeks.forEach((programWeek) => {
    const weekNumber = getWeekNumber(programWeek);

    if (!newestByWeek.has(weekNumber)) {
      newestByWeek.set(weekNumber, programWeek);
      return;
    }

    duplicateIds.push(programWeek._id);
  });

  if (duplicateIds.length > 0) {
    await ProgramWeek.deleteMany({ user: userId, _id: mongoose.trusted({ $in: duplicateIds }) });
  }

  await Promise.all(
    [...newestByWeek.entries()].map(([weekNumber, programWeek]) => {
      if (programWeek.week === weekNumber && programWeek.weekNumber === weekNumber) {
        return programWeek;
      }

      programWeek.week = weekNumber;
      programWeek.weekNumber = weekNumber;
      return programWeek.save();
    }),
  );
};

const upsertProgramWeekMaxSnapshot = async ({ userId, weekNumber, trainingMaxes, preserveDates = true }) => {
  if (trainingMaxes.length !== supportedLifts.length) {
    return null;
  }

  const allLiftsForWeek = supportedLifts.every((liftName) =>
    trainingMaxes.some(
      (trainingMax) =>
        trainingMax.liftName === liftName && Number(trainingMax.currentWeek || 1) === Number(weekNumber),
    ),
  );

  if (!allLiftsForWeek) {
    return null;
  }

  return ProgramWeek.findOneAndUpdate(
    { user: userId, weekNumber: Number(weekNumber) },
    {
      $set: {
        week: Number(weekNumber),
        maxesEntered: true,
        maxes: buildProgramWeekSnapshot(trainingMaxes),
      },
      $setOnInsert: {
        status: 'current',
        daysCompleted: 0,
        workouts: [],
        dateCreated: new Date(),
        generatedAt: preserveDates ? null : new Date(),
        completedAt: null,
      },
    },
    {
      new: true,
      upsert: true,
      runValidators: true,
      setDefaultsOnInsert: true,
    },
  );
};

const getProgramWeekDaysCompleted = (programWeek) =>
  (programWeek.workouts || []).filter((workout) => workout.status === 'completed').length;

const refreshProgramWeekStatus = async (programWeek) => {
  if (!programWeek) return null;

  const daysCompleted = getProgramWeekDaysCompleted(programWeek);
  const isComplete = (programWeek.workouts || []).length >= 4 && daysCompleted === 4;
  const nextStatus = isComplete ? 'completed' : 'current';
  const nextCompletedAt = isComplete ? programWeek.completedAt || new Date() : null;

  if (
    programWeek.weekNumber !== programWeek.week ||
    programWeek.status !== nextStatus ||
    programWeek.daysCompleted !== daysCompleted ||
    String(programWeek.completedAt || '') !== String(nextCompletedAt || '')
  ) {
    programWeek.weekNumber = programWeek.week;
    programWeek.status = nextStatus;
    programWeek.daysCompleted = daysCompleted;
    programWeek.completedAt = nextCompletedAt;
    await programWeek.save();
  }

  return programWeek;
};

const getProgramWeeksForUser = async (userId) => {
  await cleanupDuplicateProgramWeeks(userId);
  await ProgramWeek.updateMany({ user: userId, status: 'planned' }, { $set: { status: 'current' } });

  const programWeeks = await ProgramWeek.find({ user: userId })
    .sort({ week: 1 })
    .populate({
      path: 'workouts',
      options: { sort: { programDay: 1, date: 1 } },
    });

  return Promise.all(programWeeks.map(refreshProgramWeekStatus));
};

const getActiveWeekNumber = (programWeeks) => {
  for (let week = 1; week <= 4; week += 1) {
    const programWeek = programWeeks.find((entry) => getWeekNumber(entry) === week);

    if (!programWeek || programWeek.status !== 'completed') {
      return week;
    }
  }

  return 4;
};

const getCompletedProgramWeek = async (userId, week) => {
  await cleanupDuplicateProgramWeeks(userId);
  const programWeek = await ProgramWeek.findOne({ user: userId, weekNumber: week }).populate('workouts');

  if (!programWeek || programWeek.workouts.length < 4) {
    return null;
  }

  const isComplete = programWeek.workouts.every((workout) => workout.status === 'completed');

  if (!isComplete) {
    return null;
  }

  if (programWeek.status !== 'completed') {
    programWeek.status = 'completed';
    programWeek.daysCompleted = 4;
    programWeek.completedAt = programWeek.completedAt || new Date();
    await programWeek.save();
  }

  return programWeek;
};

const getGeneratedProgramWeek = async (userId, weekNumber) =>
  populateProgramWeekWorkouts(ProgramWeek.findOne({ user: userId, weekNumber }));

export const getTrainingMaxes = asyncHandler(async (req, res) => {
  const trainingMaxes = await TrainingMax.find({ user: req.user.id }).sort({ liftName: 1 });

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
  const weekTrainingMaxes = await TrainingMax.find({ user: req.user.id, currentWeek: weekNumber }).sort({ liftName: 1 });
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
  const weekTrainingMaxes = await TrainingMax.find({ user: req.user.id, currentWeek: weekNumber }).sort({ liftName: 1 });
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
  const trainingMaxes = await TrainingMax.find({ user: req.user.id }).sort({ liftName: 1 });

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

  const refreshedTrainingMaxes = await TrainingMax.find({ user: req.user.id }).sort({ liftName: 1 });
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

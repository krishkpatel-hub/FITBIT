import mongoose from 'mongoose';
import ProgramWeek from '../models/ProgramWeek.js';
import TrainingMax from '../models/TrainingMax.js';
import { supportedLifts } from './adaptiveFitnessService.js';

export const buildHistoryEntry = ({
  liftName,
  week,
  oneRepMax,
  trainingMax,
  plusSetReps = 0,
  increaseAmount = 0,
}) => ({
  week,
  liftName,
  oneRepMax,
  trainingMax,
  plusSetReps,
  increaseAmount,
  date: new Date(),
});

export const buildProgramWeekSnapshot = (trainingMaxes) =>
  supportedLifts.reduce((snapshot, liftName) => {
    const trainingMax = trainingMaxes.find((item) => item.liftName === liftName);

    snapshot[liftName] = {
      oneRepMax: trainingMax.oneRepMax,
      trainingMax: trainingMax.trainingMax,
    };

    return snapshot;
  }, {});

export const getWeekNumber = (programWeek) => Number(programWeek.weekNumber || programWeek.week || 1);

export const populateProgramWeekWorkouts = (query) =>
  query.populate({
    path: 'workouts',
    options: { sort: { programDay: 1, date: 1 } },
  });

export const getUserTrainingMaxes = ({ userId, currentWeek } = {}) => {
  const filter = { user: userId };

  if (currentWeek !== undefined) {
    filter.currentWeek = currentWeek;
  }

  return TrainingMax.find(filter).sort({ liftName: 1 });
};

export const getUserTrainingMaxByLift = ({ userId, liftName } = {}) =>
  TrainingMax.findOne({ user: userId, liftName });

export const cleanupDuplicateProgramWeeks = async (userId) => {
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

export const upsertProgramWeekMaxSnapshot = async ({ userId, weekNumber, trainingMaxes, preserveDates = true }) => {
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

export const refreshProgramWeekStatus = async (programWeek) => {
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

export const getProgramWeeksForUser = async (userId) => {
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

export const getActiveWeekNumber = (programWeeks) => {
  for (let week = 1; week <= 4; week += 1) {
    const programWeek = programWeeks.find((entry) => getWeekNumber(entry) === week);

    if (!programWeek || programWeek.status !== 'completed') {
      return week;
    }
  }

  return 4;
};

export const getCompletedProgramWeek = async (userId, week) => {
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

export const getGeneratedProgramWeek = (userId, weekNumber) =>
  populateProgramWeekWorkouts(ProgramWeek.findOne({ user: userId, weekNumber }));

export const getCurrentProgramWeek = (userId) =>
  populateProgramWeekWorkouts(ProgramWeek.findOne({ user: userId, status: 'current' }).sort({ weekNumber: 1 }));

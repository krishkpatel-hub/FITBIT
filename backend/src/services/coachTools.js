import PRRecord from '../models/PRRecord.js';
import ProgramWeek from '../models/ProgramWeek.js';
import Progress from '../models/Progress.js';
import TrainingMax from '../models/TrainingMax.js';
import Workout from '../models/Workout.js';
import { generateSmartCoachInsights } from './smartCoachService.js';

const MAIN_LIFTS = {
  squat: { key: 'squat', label: 'Squat' },
  back_squat: { key: 'squat', label: 'Squat' },
  bench: { key: 'bench', label: 'Bench Press' },
  bench_press: { key: 'bench', label: 'Bench Press' },
  deadlift: { key: 'deadlift', label: 'Deadlift' },
  overhead_press: { key: 'overhead_press', label: 'Overhead Press' },
  ohp: { key: 'overhead_press', label: 'Overhead Press' },
};

const DEFAULT_LIMIT = 5;
const MAX_RECENT_WORKOUTS = 10;
const MAX_HISTORY_WEEKS = 24;

const defaultModels = {
  PRRecord,
  ProgramWeek,
  Progress,
  TrainingMax,
  Workout,
};

const toPlainArray = async (query) => {
  if (query && typeof query.lean === 'function') {
    return query.lean();
  }

  return query;
};

const chainSort = (query, sort) => (query && typeof query.sort === 'function' ? query.sort(sort) : query);
const chainLimit = (query, limit) => (query && typeof query.limit === 'function' ? query.limit(limit) : query);
const chainPopulate = (query, populate) =>
  query && typeof query.populate === 'function' ? query.populate(populate) : query;

const isoDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const compactSet = (set) => ({
  setNumber: Number(set.setNumber || 0),
  reps: Number(set.reps || 0),
  weight: Number(set.weight || 0),
  targetReps: Number(set.targetReps || 0),
  completed: Boolean(set.completed),
  isPlusSet: Boolean(set.isPlusSet),
  rpe: Number(set.rpe || 0),
});

const compactExercise = (exercise) => ({
  exerciseName: exercise.exerciseName,
  muscleGroup: exercise.muscleGroup || '',
  notes: exercise.notes || '',
  sets: (exercise.sets || []).map(compactSet),
});

const compactWorkout = (workout) => ({
  date: isoDate(workout.date),
  title: workout.title,
  type: workout.type || '',
  programWeek: workout.programWeek || null,
  programDay: workout.programDay || null,
  liftName: workout.liftName || '',
  status: workout.status,
  duration: Number(workout.duration || 0),
  totalVolume: Number(workout.totalVolume || 0),
  notes: workout.notes || '',
  exercises: (workout.exercises || []).map(compactExercise),
});

const normalizeKey = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

export const normalizeLiftName = (value) => {
  const normalized = normalizeKey(value);
  return MAIN_LIFTS[normalized] || null;
};

const assertNoExtraArgs = (args, allowedKeys, toolName) => {
  const extraKey = Object.keys(args || {}).find((key) => !allowedKeys.includes(key));

  if (extraKey) {
    const error = new Error(`${toolName} received an unsupported argument`);
    error.statusCode = 400;
    throw error;
  }
};

const parseArgs = (rawArgs, toolName) => {
  if (!rawArgs) return {};

  if (typeof rawArgs === 'string') {
    try {
      return JSON.parse(rawArgs);
    } catch {
      const error = new Error(`${toolName} received malformed arguments`);
      error.statusCode = 400;
      throw error;
    }
  }

  if (typeof rawArgs === 'object' && !Array.isArray(rawArgs)) {
    return rawArgs;
  }

  const error = new Error(`${toolName} received malformed arguments`);
  error.statusCode = 400;
  throw error;
};

const validateLimit = (value = DEFAULT_LIMIT) => {
  const limit = Number(value);

  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_RECENT_WORKOUTS) {
    const error = new Error(`limit must be an integer between 1 and ${MAX_RECENT_WORKOUTS}`);
    error.statusCode = 400;
    throw error;
  }

  return limit;
};

const validateWeeks = (value) => {
  const weeks = Number(value);

  if (!Number.isInteger(weeks) || weeks < 1 || weeks > MAX_HISTORY_WEEKS) {
    const error = new Error(`weeks must be an integer between 1 and ${MAX_HISTORY_WEEKS}`);
    error.statusCode = 400;
    throw error;
  }

  return weeks;
};

const assertAuthenticatedUser = (authenticatedUserId) => {
  if (!authenticatedUserId) {
    const error = new Error('Authentication is required');
    error.statusCode = 401;
    throw error;
  }
};

const runFindMany = async (Model, filter, sort, limit) => {
  let query = Model.find(filter);
  query = chainSort(query, sort);

  if (limit) {
    query = chainLimit(query, limit);
  }

  return toPlainArray(query);
};

const runFindOne = async (Model, filter, sort, populate) => {
  let query = Model.findOne(filter);

  if (sort) {
    query = chainSort(query, sort);
  }

  if (populate) {
    query = chainPopulate(query, populate);
  }

  return toPlainArray(query);
};

const filterWorkoutsByExercise = (workouts, exercise) => {
  const requested = normalizeKey(exercise);

  if (!requested) return workouts;

  return workouts.filter((workout) =>
    (workout.exercises || []).some((item) => normalizeKey(item.exerciseName).includes(requested)),
  );
};

export const coachToolDefinitions = [
  {
    type: 'function',
    name: 'get_training_maxes',
    description: "Retrieve the authenticated user's current one-rep maxes and training maxes.",
    strict: true,
    parameters: {
      type: 'object',
      properties: {},
      required: [],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'get_recent_workouts',
    description: "Retrieve the authenticated user's recent completed workouts.",
    strict: true,
    parameters: {
      type: 'object',
      properties: {
        limit: {
          type: 'integer',
          minimum: 1,
          maximum: MAX_RECENT_WORKOUTS,
        },
        exercise: {
          type: 'string',
          minLength: 1,
          maxLength: 60,
        },
      },
      required: [],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'get_lift_history',
    description: "Retrieve the authenticated user's recent performance history for a main strength lift.",
    strict: true,
    parameters: {
      type: 'object',
      properties: {
        lift: {
          type: 'string',
          enum: ['squat', 'bench', 'bench_press', 'deadlift', 'overhead_press', 'ohp'],
        },
        weeks: {
          type: 'integer',
          minimum: 1,
          maximum: MAX_HISTORY_WEEKS,
        },
      },
      required: ['lift', 'weeks'],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'get_current_program',
    description: "Retrieve the authenticated user's current Strength Program week and programmed workouts.",
    strict: true,
    parameters: {
      type: 'object',
      properties: {},
      required: [],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'get_progress_summary',
    description: "Retrieve a concise summary of the authenticated user's progress, PRs, consistency, and coaching signals.",
    strict: true,
    parameters: {
      type: 'object',
      properties: {},
      required: [],
      additionalProperties: false,
    },
  },
];

export const createCoachToolExecutor = (models = defaultModels) => async ({ name, args, authenticatedUserId }) => {
  assertAuthenticatedUser(authenticatedUserId);

  const parsedArgs = parseArgs(args, name);
  const startedAt = Date.now();
  let result;

  switch (name) {
    case 'get_training_maxes': {
      assertNoExtraArgs(parsedArgs, [], name);
      const trainingMaxes = await runFindMany(models.TrainingMax, { user: authenticatedUserId }, { liftName: 1 });

      result = {
        trainingMaxes: trainingMaxes.map((item) => ({
          liftName: item.liftName,
          oneRepMax: Number(item.oneRepMax || 0),
          trainingMax: Number(item.trainingMax || 0),
          currentWeek: Number(item.currentWeek || 1),
          lastUpdated: isoDate(item.lastUpdated || item.updatedAt),
        })),
      };
      break;
    }

    case 'get_recent_workouts': {
      assertNoExtraArgs(parsedArgs, ['limit', 'exercise'], name);
      const limit = validateLimit(parsedArgs.limit || DEFAULT_LIMIT);
      const workouts = await runFindMany(
        models.Workout,
        { user: authenticatedUserId, status: 'completed' },
        { date: -1, updatedAt: -1 },
        parsedArgs.exercise ? 50 : limit,
      );
      result = {
        workouts: filterWorkoutsByExercise(workouts, parsedArgs.exercise).slice(0, limit).map(compactWorkout),
      };
      break;
    }

    case 'get_lift_history': {
      assertNoExtraArgs(parsedArgs, ['lift', 'weeks'], name);
      const lift = normalizeLiftName(parsedArgs.lift);
      const weeks = validateWeeks(parsedArgs.weeks);

      if (!lift) {
        const error = new Error('lift must be one of squat, bench, deadlift, or overhead_press');
        error.statusCode = 400;
        throw error;
      }

      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - weeks * 7);

      const [trainingMax, workouts, prs] = await Promise.all([
        runFindOne(models.TrainingMax, { user: authenticatedUserId, liftName: lift.key }),
        runFindMany(
          models.Workout,
          { user: authenticatedUserId, status: 'completed', liftName: lift.key },
          { date: -1, updatedAt: -1 },
          80,
        ),
        runFindMany(models.PRRecord, { user: authenticatedUserId }, { date: -1, updatedAt: -1 }, 40),
      ]);

      const sessions = workouts
        .filter((workout) => {
          const date = new Date(workout.date);
          return !Number.isNaN(date.getTime()) && date >= cutoff;
        })
        .map(compactWorkout);

      const prHistory = prs
        .filter((pr) => normalizeKey(pr.exerciseName).includes(normalizeKey(lift.label)))
        .filter((pr) => {
          const date = new Date(pr.date);
          return !Number.isNaN(date.getTime()) && date >= cutoff;
        })
        .map((pr) => ({
          exerciseName: pr.exerciseName,
          date: isoDate(pr.date),
          oneRepMax: Number(pr.oneRepMax || 0),
          estimatedOneRepMax: Number(pr.estimatedOneRepMax || 0),
          weight: Number(pr.weight || 0),
          reps: Number(pr.reps || 0),
        }));

      result = {
        lift: lift.label,
        weeks,
        currentTrainingMax: trainingMax
          ? {
              oneRepMax: Number(trainingMax.oneRepMax || 0),
              trainingMax: Number(trainingMax.trainingMax || 0),
              currentWeek: Number(trainingMax.currentWeek || 1),
              lastUpdated: isoDate(trainingMax.lastUpdated || trainingMax.updatedAt),
            }
          : null,
        trainingMaxHistory: (trainingMax?.history || []).map((entry) => ({
          week: Number(entry.week || 0),
          oneRepMax: Number(entry.oneRepMax || 0),
          trainingMax: Number(entry.trainingMax || 0),
          plusSetReps: Number(entry.plusSetReps || 0),
          increaseAmount: Number(entry.increaseAmount || 0),
          date: isoDate(entry.date),
        })),
        sessions,
        prHistory,
      };
      break;
    }

    case 'get_current_program': {
      assertNoExtraArgs(parsedArgs, [], name);
      const programWeek = await runFindOne(
        models.ProgramWeek,
        { user: authenticatedUserId, status: 'current' },
        { weekNumber: 1 },
        { path: 'workouts', options: { sort: { programDay: 1, date: 1 } } },
      );

      result = {
        program: programWeek
          ? {
              weekNumber: Number(programWeek.weekNumber || programWeek.week || 1),
              status: programWeek.status,
              daysCompleted: Number(programWeek.daysCompleted || 0),
              maxesEntered: Boolean(programWeek.maxesEntered),
              generatedAt: isoDate(programWeek.generatedAt),
              completedAt: isoDate(programWeek.completedAt),
              maxes: programWeek.maxes || {},
              workouts: (programWeek.workouts || []).map(compactWorkout),
            }
          : null,
      };
      break;
    }

    case 'get_progress_summary': {
      assertNoExtraArgs(parsedArgs, [], name);
      const [workouts, trainingMaxes, prs, progressLogs] = await Promise.all([
        runFindMany(models.Workout, { user: authenticatedUserId }, { date: -1, updatedAt: -1 }, 120),
        runFindMany(models.TrainingMax, { user: authenticatedUserId }, { liftName: 1 }),
        runFindMany(models.PRRecord, { user: authenticatedUserId }, { date: -1, updatedAt: -1 }, 80),
        runFindMany(models.Progress, { user: authenticatedUserId }, { date: -1, updatedAt: -1 }, 45),
      ]);

      const completedWorkouts = workouts.filter((workout) => workout.status === 'completed');
      const plannedWorkouts = workouts.filter((workout) => workout.status === 'planned');
      const totalVolume = completedWorkouts.reduce((sum, workout) => sum + Number(workout.totalVolume || 0), 0);
      const latestProgress = progressLogs[0] || null;
      const latestPR = prs[0] || null;

      result = {
        completedWorkouts: completedWorkouts.length,
        plannedWorkouts: plannedWorkouts.length,
        totalCompletedVolume: totalVolume,
        latestProgress: latestProgress
          ? {
              date: isoDate(latestProgress.date),
              bodyWeight: Number(latestProgress.bodyWeight || 0),
              bodyFatPercentage: Number(latestProgress.bodyFatPercentage || 0),
              measurements: latestProgress.measurements || {},
            }
          : null,
        latestPR: latestPR
          ? {
              exerciseName: latestPR.exerciseName,
              date: isoDate(latestPR.date),
              oneRepMax: Number(latestPR.oneRepMax || 0),
              estimatedOneRepMax: Number(latestPR.estimatedOneRepMax || 0),
              weight: Number(latestPR.weight || 0),
              reps: Number(latestPR.reps || 0),
            }
          : null,
        insights: generateSmartCoachInsights({ workouts, trainingMaxes, prs, progressLogs }).slice(0, 5),
      };
      break;
    }

    default: {
      const error = new Error('Unknown Coach tool requested');
      error.statusCode = 400;
      throw error;
    }
  }

  return {
    name,
    durationMs: Date.now() - startedAt,
    result,
  };
};

export const executeCoachTool = createCoachToolExecutor();

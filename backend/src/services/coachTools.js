import { getCoachProgressSummary } from './analyticsService.js';
import { getRecentPRRecords } from './prService.js';
import { getCurrentProgramWeek, getUserTrainingMaxByLift, getUserTrainingMaxes } from './programService.js';
import { getCompletedLiftWorkouts, getCompletedWorkouts } from './workoutService.js';

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

const defaultDataServices = {
  getTrainingMaxes: (userId) => getUserTrainingMaxes({ userId }),
  getTrainingMaxByLift: (userId, liftName) => getUserTrainingMaxByLift({ userId, liftName }),
  getRecentCompletedWorkouts: (userId, limit) => getCompletedWorkouts({ userId, limit }),
  getCompletedLiftWorkouts: (userId, liftName, limit) => getCompletedLiftWorkouts({ userId, liftName, limit }),
  getRecentPRRecords: (userId, limit) => getRecentPRRecords({ userId, limit }),
  getCurrentProgram: (userId) => getCurrentProgramWeek(userId),
  getProgressSummary: (userId) => getCoachProgressSummary(userId),
};

const toPlainArray = async (query) => {
  if (query && typeof query.lean === 'function') {
    return query.lean();
  }

  return query;
};

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
  if (value === null || value === undefined) {
    return DEFAULT_LIMIT;
  }

  const limit = Number(value);

  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_RECENT_WORKOUTS) {
    const error = new Error(`limit must be an integer between 1 and ${MAX_RECENT_WORKOUTS}`);
    error.statusCode = 400;
    throw error;
  }

  return limit;
};

const validateWeeks = (value) => {
  if (value === null || value === undefined) {
    return 8;
  }

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
          type: ['integer', 'null'],
          minimum: 1,
          maximum: MAX_RECENT_WORKOUTS,
        },
        exercise: {
          type: ['string', 'null'],
          minLength: 1,
          maxLength: 60,
        },
      },
      required: ['limit', 'exercise'],
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
          type: ['integer', 'null'],
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

export const createCoachToolExecutor = (dataServices = defaultDataServices) => async ({ name, args, authenticatedUserId }) => {
  assertAuthenticatedUser(authenticatedUserId);

  const parsedArgs = parseArgs(args, name);
  const startedAt = Date.now();
  let result;

  switch (name) {
    case 'get_training_maxes': {
      assertNoExtraArgs(parsedArgs, [], name);
      const trainingMaxes = await toPlainArray(dataServices.getTrainingMaxes(authenticatedUserId));

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
      const workouts = await toPlainArray(
        dataServices.getRecentCompletedWorkouts(authenticatedUserId, parsedArgs.exercise ? 50 : limit),
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
        toPlainArray(dataServices.getTrainingMaxByLift(authenticatedUserId, lift.key)),
        toPlainArray(dataServices.getCompletedLiftWorkouts(authenticatedUserId, lift.key, 80)),
        toPlainArray(dataServices.getRecentPRRecords(authenticatedUserId, 40)),
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
      const programWeek = await toPlainArray(dataServices.getCurrentProgram(authenticatedUserId));

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
      result = await dataServices.getProgressSummary(authenticatedUserId);
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

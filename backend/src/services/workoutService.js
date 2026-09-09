import ProgramWeek from '../models/ProgramWeek.js';
import Workout from '../models/Workout.js';
import { findUserDocumentById } from '../utils/apiHelpers.js';

export const allowedWorkoutFields = [
  'title',
  'date',
  'type',
  'programWeek',
  'programDay',
  'liftName',
  'status',
  'exercises',
  'duration',
  'notes',
];

export const pickWorkoutFields = (body) =>
  allowedWorkoutFields.reduce((fields, field) => {
    if (body[field] !== undefined) {
      fields[field] = body[field];
    }

    return fields;
  }, {});

export const getUserWorkouts = (userId, { sort = { date: -1, createdAt: -1 }, limit } = {}) => {
  let query = Workout.find({ user: userId }).sort(sort);

  if (limit) {
    query = query.limit(limit);
  }

  return query;
};

export const getCompletedWorkouts = ({ userId, sort = { date: -1, updatedAt: -1 }, limit } = {}) => {
  let query = Workout.find({ user: userId, status: 'completed' }).sort(sort);

  if (limit) {
    query = query.limit(limit);
  }

  return query;
};

export const getCompletedLiftWorkouts = ({ userId, liftName, limit = 80 } = {}) =>
  Workout.find({ user: userId, status: 'completed', liftName }).sort({ date: -1, updatedAt: -1 }).limit(limit);

export const getUserWorkoutById = (id, userId) => findUserDocumentById(Workout, id, userId, 'Workout');

export const createUserWorkout = (userId, body) =>
  Workout.create({
    ...pickWorkoutFields(body),
    user: userId,
  });

export const syncProgramWeekStatus = async (userId, workoutId) => {
  const programWeek = await ProgramWeek.findOne({ user: userId, workouts: workoutId }).populate('workouts');

  if (!programWeek || programWeek.workouts.length < 4) {
    return;
  }

  const isComplete = programWeek.workouts.every((workout) => workout.status === 'completed');
  const daysCompleted = programWeek.workouts.filter((workout) => workout.status === 'completed').length;
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
};

export const updateUserWorkout = async (id, userId, body) => {
  const workout = await getUserWorkoutById(id, userId);

  workout.set(pickWorkoutFields(body));
  const updatedWorkout = await workout.save();

  await syncProgramWeekStatus(userId, updatedWorkout._id);

  return updatedWorkout;
};

export const deleteUserWorkout = async (id, userId) => {
  const workout = await getUserWorkoutById(id, userId);

  await workout.deleteOne();

  return { id, message: 'Workout deleted successfully' };
};

export const duplicateUserWorkout = async ({ userId, workoutId, date }) => {
  const sourceWorkout = await getUserWorkoutById(workoutId, userId);
  const duplicateDate = new Date(date);

  if (Number.isNaN(duplicateDate.getTime())) {
    const error = new Error('Valid date is required');
    error.statusCode = 400;
    throw error;
  }

  return Workout.create({
    user: userId,
    title: sourceWorkout.title,
    date: duplicateDate,
    type: sourceWorkout.type,
    status: 'planned',
    duration: sourceWorkout.duration,
    notes: sourceWorkout.notes,
    exercises: sourceWorkout.exercises.map((exercise) => ({
      exerciseName: exercise.exerciseName,
      muscleGroup: exercise.muscleGroup,
      notes: exercise.notes,
      sets: exercise.sets.map((set) => ({
        setNumber: set.setNumber,
        reps: set.reps,
        weight: set.weight,
        targetReps: set.targetReps,
        completed: false,
        isPlusSet: set.isPlusSet,
        rpe: set.rpe,
      })),
    })),
  });
};

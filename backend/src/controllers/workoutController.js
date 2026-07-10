import asyncHandler from 'express-async-handler';
import ProgramWeek from '../models/ProgramWeek.js';
import Workout from '../models/Workout.js';
import { findUserDocumentById, requireFields, sendSuccess } from '../utils/apiHelpers.js';

const allowedWorkoutFields = ['title', 'date', 'type', 'programWeek', 'programDay', 'liftName', 'status', 'exercises', 'duration', 'notes'];

const pickWorkoutFields = (body) =>
  allowedWorkoutFields.reduce((fields, field) => {
    if (body[field] !== undefined) {
      fields[field] = body[field];
    }

    return fields;
  }, {});

const syncProgramWeekStatus = async (userId, workoutId) => {
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

export const getWorkouts = asyncHandler(async (req, res) => {
  const workouts = await Workout.find({ user: req.user.id }).sort({ date: -1, createdAt: -1 });

  sendSuccess(res, workouts);
});

export const getWorkoutById = asyncHandler(async (req, res) => {
  const workout = await findUserDocumentById(Workout, req.params.id, req.user.id, 'Workout');

  sendSuccess(res, workout);
});

export const createWorkout = asyncHandler(async (req, res) => {
  requireFields(req.body, ['title']);

  const workout = await Workout.create({
    ...pickWorkoutFields(req.body),
    user: req.user.id,
  });

  sendSuccess(res, workout, 201);
});

export const updateWorkout = asyncHandler(async (req, res) => {
  const workout = await findUserDocumentById(Workout, req.params.id, req.user.id, 'Workout');

  workout.set(pickWorkoutFields(req.body));
  const updatedWorkout = await workout.save();

  await syncProgramWeekStatus(req.user.id, updatedWorkout._id);

  sendSuccess(res, updatedWorkout);
});

export const deleteWorkout = asyncHandler(async (req, res) => {
  const workout = await findUserDocumentById(Workout, req.params.id, req.user.id, 'Workout');

  await workout.deleteOne();

  sendSuccess(res, { id: req.params.id, message: 'Workout deleted successfully' });
});

export const duplicateWorkout = asyncHandler(async (req, res) => {
  requireFields(req.body, ['date']);

  const sourceWorkout = await findUserDocumentById(Workout, req.params.id, req.user.id, 'Workout');
  const duplicateDate = new Date(req.body.date);

  if (Number.isNaN(duplicateDate.getTime())) {
    const error = new Error('Valid date is required');
    error.statusCode = 400;
    throw error;
  }

  const duplicatedWorkout = await Workout.create({
    user: req.user.id,
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

  sendSuccess(res, duplicatedWorkout, 201);
});

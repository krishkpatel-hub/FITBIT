import asyncHandler from 'express-async-handler';
import Workout from '../models/Workout.js';
import { findUserDocumentById, requireFields, sendSuccess } from '../utils/apiHelpers.js';

const allowedWorkoutFields = ['title', 'date', 'type', 'status', 'exercises', 'duration', 'notes'];

const pickWorkoutFields = (body) =>
  allowedWorkoutFields.reduce((fields, field) => {
    if (body[field] !== undefined) {
      fields[field] = body[field];
    }

    return fields;
  }, {});

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

  sendSuccess(res, updatedWorkout);
});

export const deleteWorkout = asyncHandler(async (req, res) => {
  const workout = await findUserDocumentById(Workout, req.params.id, req.user.id, 'Workout');

  await workout.deleteOne();

  sendSuccess(res, { id: req.params.id, message: 'Workout deleted successfully' });
});

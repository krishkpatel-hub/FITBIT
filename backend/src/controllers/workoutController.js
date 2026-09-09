import asyncHandler from 'express-async-handler';
import {
  createUserWorkout,
  deleteUserWorkout,
  duplicateUserWorkout,
  getUserWorkoutById,
  getUserWorkouts,
  updateUserWorkout,
} from '../services/workoutService.js';
import { requireFields, sendSuccess } from '../utils/apiHelpers.js';

export const getWorkouts = asyncHandler(async (req, res) => {
  const workouts = await getUserWorkouts(req.user.id);

  sendSuccess(res, workouts);
});

export const getWorkoutById = asyncHandler(async (req, res) => {
  const workout = await getUserWorkoutById(req.params.id, req.user.id);

  sendSuccess(res, workout);
});

export const createWorkout = asyncHandler(async (req, res) => {
  requireFields(req.body, ['title']);

  const workout = await createUserWorkout(req.user.id, req.body);

  sendSuccess(res, workout, 201);
});

export const updateWorkout = asyncHandler(async (req, res) => {
  const updatedWorkout = await updateUserWorkout(req.params.id, req.user.id, req.body);

  sendSuccess(res, updatedWorkout);
});

export const deleteWorkout = asyncHandler(async (req, res) => {
  const result = await deleteUserWorkout(req.params.id, req.user.id);

  sendSuccess(res, result);
});

export const duplicateWorkout = asyncHandler(async (req, res) => {
  requireFields(req.body, ['date']);

  const duplicatedWorkout = await duplicateUserWorkout({
    userId: req.user.id,
    workoutId: req.params.id,
    date: req.body.date,
  });

  sendSuccess(res, duplicatedWorkout, 201);
});

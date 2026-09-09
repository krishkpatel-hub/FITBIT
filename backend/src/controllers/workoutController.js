import asyncHandler from 'express-async-handler';
import {
  createUserWorkout,
  deleteUserWorkout,
  duplicateUserWorkout,
  getUserWorkoutById,
  getUserWorkouts,
  updateUserWorkout,
} from '../services/workoutService.js';
import { emitRealtimeEvent } from '../realtime/realtimeServer.js';
import { requireFields, sendSuccess } from '../utils/apiHelpers.js';

const getRealtimeClientId = (req) => {
  const clientId = req.get('X-Realtime-Client-Id');
  return typeof clientId === 'string' ? clientId.slice(0, 128) : undefined;
};

const emitWorkoutEvent = (req, workout) => {
  emitRealtimeEvent(req.user.id, {
    type: workout.status === 'completed' ? 'workout.completed' : 'workout.updated',
    workoutId: String(workout._id),
    status: workout.status,
    sourceClientId: getRealtimeClientId(req),
  });
};

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

  emitWorkoutEvent(req, workout);

  sendSuccess(res, workout, 201);
});

export const updateWorkout = asyncHandler(async (req, res) => {
  const updatedWorkout = await updateUserWorkout(req.params.id, req.user.id, req.body);

  emitWorkoutEvent(req, updatedWorkout);

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

  emitWorkoutEvent(req, duplicatedWorkout);

  sendSuccess(res, duplicatedWorkout, 201);
});

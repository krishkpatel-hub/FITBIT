import asyncHandler from 'express-async-handler';
import Exercise from '../models/Exercise.js';
import { findUserDocumentById, requireFields, sendSuccess } from '../utils/apiHelpers.js';

const allowedExerciseFields = ['name', 'muscleGroup', 'category', 'equipment', 'notes', 'isTemplate'];

const pickExerciseFields = (body) =>
  allowedExerciseFields.reduce((fields, field) => {
    if (body[field] !== undefined) {
      fields[field] = body[field];
    }

    return fields;
  }, {});

export const getExercises = asyncHandler(async (req, res) => {
  const exercises = await Exercise.find({ user: req.user.id }).sort({ createdAt: -1 });

  sendSuccess(res, exercises);
});

export const getExerciseById = asyncHandler(async (req, res) => {
  const exercise = await findUserDocumentById(Exercise, req.params.id, req.user.id, 'Exercise');

  sendSuccess(res, exercise);
});

export const createExercise = asyncHandler(async (req, res) => {
  requireFields(req.body, ['name', 'muscleGroup', 'category']);

  const exercise = await Exercise.create({
    ...pickExerciseFields(req.body),
    user: req.user.id,
  });

  sendSuccess(res, exercise, 201);
});

export const updateExercise = asyncHandler(async (req, res) => {
  const exercise = await findUserDocumentById(Exercise, req.params.id, req.user.id, 'Exercise');

  exercise.set(pickExerciseFields(req.body));
  const updatedExercise = await exercise.save();

  sendSuccess(res, updatedExercise);
});

export const deleteExercise = asyncHandler(async (req, res) => {
  const exercise = await findUserDocumentById(Exercise, req.params.id, req.user.id, 'Exercise');

  await exercise.deleteOne();

  sendSuccess(res, { id: req.params.id, message: 'Exercise deleted successfully' });
});

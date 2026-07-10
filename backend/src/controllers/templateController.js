import asyncHandler from 'express-async-handler';
import Workout from '../models/Workout.js';
import WorkoutTemplate from '../models/WorkoutTemplate.js';
import { requireFields, sendSuccess, validateObjectId } from '../utils/apiHelpers.js';

const allowedTemplateFields = ['name', 'description', 'category', 'exercises', 'isDefault'];

const pickTemplateFields = (body) =>
  allowedTemplateFields.reduce((fields, field) => {
    if (body[field] !== undefined) {
      fields[field] = body[field];
    }

    return fields;
  }, {});

const findAccessibleTemplateById = async (id, userId) => {
  validateObjectId(id, 'Workout template');

  const template = await WorkoutTemplate.findOne({
    _id: id,
    $or: [{ user: userId }, { isDefault: true }],
  });

  if (!template) {
    const error = new Error('Workout template not found');
    error.statusCode = 404;
    throw error;
  }

  return template;
};

const findUserTemplateById = async (id, userId) => {
  validateObjectId(id, 'Workout template');

  const template = await WorkoutTemplate.findOne({ _id: id, user: userId });

  if (!template) {
    const error = new Error('Workout template not found');
    error.statusCode = 404;
    throw error;
  }

  return template;
};

export const getTemplates = asyncHandler(async (req, res) => {
  const templates = await WorkoutTemplate.find({
    $or: [{ user: req.user.id }, { isDefault: true }],
  }).sort({ isDefault: -1, createdAt: -1 });

  sendSuccess(res, templates);
});

export const getTemplateById = asyncHandler(async (req, res) => {
  const template = await findAccessibleTemplateById(req.params.id, req.user.id);

  sendSuccess(res, template);
});

export const createTemplate = asyncHandler(async (req, res) => {
  requireFields(req.body, ['name']);

  const template = await WorkoutTemplate.create({
    ...pickTemplateFields(req.body),
    isDefault: false,
    user: req.user.id,
  });

  sendSuccess(res, template, 201);
});

export const updateTemplate = asyncHandler(async (req, res) => {
  const template = await findUserTemplateById(req.params.id, req.user.id);

  template.set({
    ...pickTemplateFields(req.body),
    isDefault: false,
  });
  const updatedTemplate = await template.save();

  sendSuccess(res, updatedTemplate);
});

export const deleteTemplate = asyncHandler(async (req, res) => {
  const template = await findUserTemplateById(req.params.id, req.user.id);

  await template.deleteOne();

  sendSuccess(res, { id: req.params.id, message: 'Workout template deleted successfully' });
});

export const startWorkoutFromTemplate = asyncHandler(async (req, res) => {
  requireFields(req.body, ['date']);

  const template = await findAccessibleTemplateById(req.params.id, req.user.id);
  const plannedDate = new Date(req.body.date);

  if (Number.isNaN(plannedDate.getTime())) {
    const error = new Error('Valid date is required');
    error.statusCode = 400;
    throw error;
  }

  const workout = await Workout.create({
    user: req.user.id,
    title: template.name,
    date: plannedDate,
    type: template.category,
    status: 'planned',
    notes: template.description,
    exercises: template.exercises.map((exercise) => ({
      exerciseName: exercise.exerciseName,
      muscleGroup: exercise.muscleGroup,
      notes: exercise.notes,
      sets: exercise.sets.map((set) => ({
        setNumber: set.setNumber,
        reps: 0,
        weight: set.weight,
        targetReps: set.targetReps,
        completed: false,
        isPlusSet: set.isPlusSet,
        rpe: 0,
      })),
    })),
  });

  sendSuccess(res, workout, 201);
});

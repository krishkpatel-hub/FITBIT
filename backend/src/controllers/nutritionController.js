import asyncHandler from 'express-async-handler';
import Nutrition from '../models/Nutrition.js';
import { findUserDocumentById, sendSuccess } from '../utils/apiHelpers.js';

const allowedNutritionFields = ['date', 'meals'];

const pickNutritionFields = (body) =>
  allowedNutritionFields.reduce((fields, field) => {
    if (body[field] !== undefined) {
      fields[field] = body[field];
    }

    return fields;
  }, {});

export const getNutritionEntries = asyncHandler(async (req, res) => {
  const nutritionEntries = await Nutrition.find({ user: req.user.id }).sort({ date: -1, createdAt: -1 });

  sendSuccess(res, nutritionEntries);
});

export const getNutritionEntryById = asyncHandler(async (req, res) => {
  const nutritionEntry = await findUserDocumentById(Nutrition, req.params.id, req.user.id, 'Nutrition entry');

  sendSuccess(res, nutritionEntry);
});

export const createNutritionEntry = asyncHandler(async (req, res) => {
  const nutritionEntry = await Nutrition.create({
    ...pickNutritionFields(req.body),
    user: req.user.id,
  });

  sendSuccess(res, nutritionEntry, 201);
});

export const updateNutritionEntry = asyncHandler(async (req, res) => {
  const nutritionEntry = await findUserDocumentById(Nutrition, req.params.id, req.user.id, 'Nutrition entry');

  nutritionEntry.set(pickNutritionFields(req.body));
  const updatedNutritionEntry = await nutritionEntry.save();

  sendSuccess(res, updatedNutritionEntry);
});

export const deleteNutritionEntry = asyncHandler(async (req, res) => {
  const nutritionEntry = await findUserDocumentById(Nutrition, req.params.id, req.user.id, 'Nutrition entry');

  await nutritionEntry.deleteOne();

  sendSuccess(res, { id: req.params.id, message: 'Nutrition entry deleted successfully' });
});

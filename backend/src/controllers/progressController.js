import asyncHandler from 'express-async-handler';
import Progress from '../models/Progress.js';
import { findUserDocumentById, sendSuccess } from '../utils/apiHelpers.js';

const allowedProgressFields = ['date', 'bodyWeight', 'bodyFatPercentage', 'measurements', 'notes', 'photos'];

const pickProgressFields = (body) =>
  allowedProgressFields.reduce((fields, field) => {
    if (body[field] !== undefined) {
      fields[field] = body[field];
    }

    return fields;
  }, {});

export const getProgressEntries = asyncHandler(async (req, res) => {
  const progressEntries = await Progress.find({ user: req.user.id }).sort({ date: -1, createdAt: -1 });

  sendSuccess(res, progressEntries);
});

export const getProgressEntryById = asyncHandler(async (req, res) => {
  const progressEntry = await findUserDocumentById(Progress, req.params.id, req.user.id, 'Progress entry');

  sendSuccess(res, progressEntry);
});

export const createProgressEntry = asyncHandler(async (req, res) => {
  const progressEntry = await Progress.create({
    ...pickProgressFields(req.body),
    user: req.user.id,
  });

  sendSuccess(res, progressEntry, 201);
});

export const updateProgressEntry = asyncHandler(async (req, res) => {
  const progressEntry = await findUserDocumentById(Progress, req.params.id, req.user.id, 'Progress entry');

  progressEntry.set(pickProgressFields(req.body));
  const updatedProgressEntry = await progressEntry.save();

  sendSuccess(res, updatedProgressEntry);
});

export const deleteProgressEntry = asyncHandler(async (req, res) => {
  const progressEntry = await findUserDocumentById(Progress, req.params.id, req.user.id, 'Progress entry');

  await progressEntry.deleteOne();

  sendSuccess(res, { id: req.params.id, message: 'Progress entry deleted successfully' });
});

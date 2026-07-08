import asyncHandler from 'express-async-handler';
import PRRecord from '../models/PRRecord.js';
import { findUserDocumentById, requireFields, sendSuccess } from '../utils/apiHelpers.js';

const allowedPRFields = ['exerciseName', 'oneRepMax', 'estimatedOneRepMax', 'weight', 'reps', 'date', 'notes'];

const pickPRFields = (body) =>
  allowedPRFields.reduce((fields, field) => {
    if (body[field] !== undefined) {
      fields[field] = body[field];
    }

    return fields;
  }, {});

export const getPRRecords = asyncHandler(async (req, res) => {
  const prs = await PRRecord.find({ user: req.user.id }).sort({ date: -1, createdAt: -1 });

  sendSuccess(res, prs);
});

export const getPRRecordById = asyncHandler(async (req, res) => {
  const pr = await findUserDocumentById(PRRecord, req.params.id, req.user.id, 'PR record');

  sendSuccess(res, pr);
});

export const createPRRecord = asyncHandler(async (req, res) => {
  requireFields(req.body, ['exerciseName']);

  const pr = await PRRecord.create({
    ...pickPRFields(req.body),
    user: req.user.id,
  });

  sendSuccess(res, pr, 201);
});

export const updatePRRecord = asyncHandler(async (req, res) => {
  const pr = await findUserDocumentById(PRRecord, req.params.id, req.user.id, 'PR record');

  pr.set(pickPRFields(req.body));
  const updatedPR = await pr.save();

  sendSuccess(res, updatedPR);
});

export const deletePRRecord = asyncHandler(async (req, res) => {
  const pr = await findUserDocumentById(PRRecord, req.params.id, req.user.id, 'PR record');

  await pr.deleteOne();

  sendSuccess(res, { id: req.params.id, message: 'PR record deleted successfully' });
});


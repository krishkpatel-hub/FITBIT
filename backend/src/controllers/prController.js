import asyncHandler from 'express-async-handler';
import {
  createUserPRRecord,
  deleteUserPRRecord,
  getUserPRRecordById,
  getUserPRRecords,
  updateUserPRRecord,
} from '../services/prService.js';
import { requireFields, sendSuccess } from '../utils/apiHelpers.js';

export const getPRRecords = asyncHandler(async (req, res) => {
  const prs = await getUserPRRecords(req.user.id);

  sendSuccess(res, prs);
});

export const getPRRecordById = asyncHandler(async (req, res) => {
  const pr = await getUserPRRecordById(req.params.id, req.user.id);

  sendSuccess(res, pr);
});

export const createPRRecord = asyncHandler(async (req, res) => {
  requireFields(req.body, ['exerciseName']);

  const pr = await createUserPRRecord(req.user.id, req.body);

  sendSuccess(res, pr, 201);
});

export const updatePRRecord = asyncHandler(async (req, res) => {
  const updatedPR = await updateUserPRRecord(req.params.id, req.user.id, req.body);

  sendSuccess(res, updatedPR);
});

export const deletePRRecord = asyncHandler(async (req, res) => {
  const result = await deleteUserPRRecord(req.params.id, req.user.id);

  sendSuccess(res, result);
});

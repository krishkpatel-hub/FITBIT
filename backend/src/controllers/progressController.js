import asyncHandler from 'express-async-handler';
import {
  createUserProgressEntry,
  deleteUserProgressEntry,
  getUserProgressEntries,
  getUserProgressEntryById,
  updateUserProgressEntry,
} from '../services/progressService.js';
import { emitRealtimeEvent } from '../realtime/realtimeServer.js';
import { sendSuccess } from '../utils/apiHelpers.js';

const getRealtimeClientId = (req) => {
  const clientId = req.get('X-Realtime-Client-Id');
  return typeof clientId === 'string' ? clientId.slice(0, 128) : undefined;
};

const emitProgressUpdated = (req, progressEntry) => {
  emitRealtimeEvent(req.user.id, {
    type: 'progress.updated',
    progressId: String(progressEntry._id),
    sourceClientId: getRealtimeClientId(req),
  });
};

export const getProgressEntries = asyncHandler(async (req, res) => {
  const progressEntries = await getUserProgressEntries(req.user.id);

  sendSuccess(res, progressEntries);
});

export const getProgressEntryById = asyncHandler(async (req, res) => {
  const progressEntry = await getUserProgressEntryById(req.params.id, req.user.id);

  sendSuccess(res, progressEntry);
});

export const createProgressEntry = asyncHandler(async (req, res) => {
  const progressEntry = await createUserProgressEntry(req.user.id, req.body);

  emitProgressUpdated(req, progressEntry);

  sendSuccess(res, progressEntry, 201);
});

export const updateProgressEntry = asyncHandler(async (req, res) => {
  const updatedProgressEntry = await updateUserProgressEntry(req.params.id, req.user.id, req.body);

  emitProgressUpdated(req, updatedProgressEntry);

  sendSuccess(res, updatedProgressEntry);
});

export const deleteProgressEntry = asyncHandler(async (req, res) => {
  const result = await deleteUserProgressEntry(req.params.id, req.user.id);

  sendSuccess(res, result);
});

import Progress from '../models/Progress.js';
import { findUserDocumentById } from '../utils/apiHelpers.js';

export const allowedProgressFields = ['date', 'bodyWeight', 'bodyFatPercentage', 'measurements', 'notes', 'photos'];

export const pickProgressFields = (body) =>
  allowedProgressFields.reduce((fields, field) => {
    if (body[field] !== undefined) {
      fields[field] = body[field];
    }

    return fields;
  }, {});

export const getUserProgressEntries = (userId) => Progress.find({ user: userId }).sort({ date: -1, createdAt: -1 });

export const getRecentProgressEntries = ({ userId, limit = 45 } = {}) =>
  Progress.find({ user: userId }).sort({ date: -1, updatedAt: -1 }).limit(limit);

export const getUserProgressEntryById = (id, userId) => findUserDocumentById(Progress, id, userId, 'Progress entry');

export const createUserProgressEntry = (userId, body) =>
  Progress.create({
    ...pickProgressFields(body),
    user: userId,
  });

export const updateUserProgressEntry = async (id, userId, body) => {
  const progressEntry = await getUserProgressEntryById(id, userId);

  progressEntry.set(pickProgressFields(body));
  return progressEntry.save();
};

export const deleteUserProgressEntry = async (id, userId) => {
  const progressEntry = await getUserProgressEntryById(id, userId);

  await progressEntry.deleteOne();

  return { id, message: 'Progress entry deleted successfully' };
};

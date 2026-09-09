import PRRecord from '../models/PRRecord.js';
import { findUserDocumentById } from '../utils/apiHelpers.js';

export const allowedPRFields = ['exerciseName', 'oneRepMax', 'estimatedOneRepMax', 'weight', 'reps', 'date', 'notes'];

export const pickPRFields = (body) =>
  allowedPRFields.reduce((fields, field) => {
    if (body[field] !== undefined) {
      fields[field] = body[field];
    }

    return fields;
  }, {});

export const getUserPRRecords = (userId) => PRRecord.find({ user: userId }).sort({ date: -1, createdAt: -1 });

export const getRecentPRRecords = ({ userId, limit = 80 } = {}) =>
  PRRecord.find({ user: userId }).sort({ date: -1, updatedAt: -1 }).limit(limit);

export const getUserPRRecordById = (id, userId) => findUserDocumentById(PRRecord, id, userId, 'PR record');

export const createUserPRRecord = (userId, body) =>
  PRRecord.create({
    ...pickPRFields(body),
    user: userId,
  });

export const updateUserPRRecord = async (id, userId, body) => {
  const pr = await getUserPRRecordById(id, userId);

  pr.set(pickPRFields(body));
  return pr.save();
};

export const deleteUserPRRecord = async (id, userId) => {
  const pr = await getUserPRRecordById(id, userId);

  await pr.deleteOne();

  return { id, message: 'PR record deleted successfully' };
};

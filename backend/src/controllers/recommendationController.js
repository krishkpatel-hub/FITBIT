import asyncHandler from 'express-async-handler';
import Recommendation from '../models/Recommendation.js';
import { findUserDocumentById, requireFields, sendSuccess } from '../utils/apiHelpers.js';

const allowedRecommendationFields = ['type', 'title', 'message', 'source', 'priority', 'isRead'];

const pickRecommendationFields = (body) =>
  allowedRecommendationFields.reduce((fields, field) => {
    if (body[field] !== undefined) {
      fields[field] = body[field];
    }

    return fields;
  }, {});

export const getRecommendations = asyncHandler(async (req, res) => {
  const recommendations = await Recommendation.find({ user: req.user.id }).sort({ createdAt: -1 });

  sendSuccess(res, recommendations);
});

export const getRecommendationById = asyncHandler(async (req, res) => {
  const recommendation = await findUserDocumentById(Recommendation, req.params.id, req.user.id, 'Recommendation');

  sendSuccess(res, recommendation);
});

export const createRecommendation = asyncHandler(async (req, res) => {
  requireFields(req.body, ['type', 'title', 'message']);

  const recommendation = await Recommendation.create({
    ...pickRecommendationFields(req.body),
    user: req.user.id,
  });

  sendSuccess(res, recommendation, 201);
});

export const updateRecommendation = asyncHandler(async (req, res) => {
  const recommendation = await findUserDocumentById(Recommendation, req.params.id, req.user.id, 'Recommendation');

  recommendation.set(pickRecommendationFields(req.body));
  const updatedRecommendation = await recommendation.save();

  sendSuccess(res, updatedRecommendation);
});

export const deleteRecommendation = asyncHandler(async (req, res) => {
  const recommendation = await findUserDocumentById(Recommendation, req.params.id, req.user.id, 'Recommendation');

  await recommendation.deleteOne();

  sendSuccess(res, { id: req.params.id, message: 'Recommendation deleted successfully' });
});


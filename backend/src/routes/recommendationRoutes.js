import express from 'express';
import {
  createRecommendation,
  deleteRecommendation,
  getRecommendationById,
  getRecommendations,
  updateRecommendation,
} from '../controllers/recommendationController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.route('/').get(getRecommendations).post(createRecommendation);
router.route('/:id').get(getRecommendationById).put(updateRecommendation).delete(deleteRecommendation);

export default router;


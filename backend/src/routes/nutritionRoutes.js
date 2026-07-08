import express from 'express';
import {
  createNutritionEntry,
  deleteNutritionEntry,
  getNutritionEntries,
  getNutritionEntryById,
  updateNutritionEntry,
} from '../controllers/nutritionController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.route('/').get(getNutritionEntries).post(createNutritionEntry);
router.route('/:id').get(getNutritionEntryById).put(updateNutritionEntry).delete(deleteNutritionEntry);

export default router;

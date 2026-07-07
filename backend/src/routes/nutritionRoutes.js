import express from 'express';
import { createNutritionEntry, getNutritionEntries } from '../controllers/nutritionController.js';

const router = express.Router();

router.route('/').get(getNutritionEntries).post(createNutritionEntry);

export default router;


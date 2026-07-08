import express from 'express';
import {
  createTrainingMax,
  deleteTrainingMax,
  generateProgram,
  getTrainingMaxById,
  getTrainingMaxes,
  updateProgression,
  updateTrainingMax,
} from '../controllers/trainingMaxController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.route('/').get(getTrainingMaxes).post(createTrainingMax);
router.post('/generate-program', generateProgram);
router.post('/update-progression', updateProgression);
router.route('/:id').get(getTrainingMaxById).put(updateTrainingMax).delete(deleteTrainingMax);

export default router;

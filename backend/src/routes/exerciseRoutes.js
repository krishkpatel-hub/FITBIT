import express from 'express';
import {
  createExercise,
  deleteExercise,
  getExerciseById,
  getExercises,
  updateExercise,
} from '../controllers/exerciseController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.route('/').get(getExercises).post(createExercise);
router.route('/:id').get(getExerciseById).put(updateExercise).delete(deleteExercise);

export default router;

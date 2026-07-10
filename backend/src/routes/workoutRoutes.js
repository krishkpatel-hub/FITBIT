import express from 'express';
import {
  createWorkout,
  deleteWorkout,
  duplicateWorkout,
  getWorkoutById,
  getWorkouts,
  updateWorkout,
} from '../controllers/workoutController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.route('/').get(getWorkouts).post(createWorkout);
router.post('/:id/duplicate', duplicateWorkout);
router.route('/:id').get(getWorkoutById).put(updateWorkout).delete(deleteWorkout);

export default router;

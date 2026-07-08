import express from 'express';
import {
  createWorkout,
  deleteWorkout,
  getWorkoutById,
  getWorkouts,
  updateWorkout,
} from '../controllers/workoutController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.route('/').get(getWorkouts).post(createWorkout);
router.route('/:id').get(getWorkoutById).put(updateWorkout).delete(deleteWorkout);

export default router;

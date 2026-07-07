import express from 'express';
import { createWorkout, getWorkoutById, getWorkouts } from '../controllers/workoutController.js';

const router = express.Router();

router.route('/').get(getWorkouts).post(createWorkout);
router.get('/:id', getWorkoutById);

export default router;


import express from 'express';
import { createExercise, getExercises } from '../controllers/exerciseController.js';

const router = express.Router();

router.route('/').get(getExercises).post(createExercise);

export default router;


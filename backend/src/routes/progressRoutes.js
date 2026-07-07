import express from 'express';
import { createProgressEntry, getProgressEntries } from '../controllers/progressController.js';

const router = express.Router();

router.route('/').get(getProgressEntries).post(createProgressEntry);

export default router;


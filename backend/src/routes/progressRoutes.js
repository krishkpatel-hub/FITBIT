import express from 'express';
import {
  createProgressEntry,
  deleteProgressEntry,
  getProgressEntries,
  getProgressEntryById,
  updateProgressEntry,
} from '../controllers/progressController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.route('/').get(getProgressEntries).post(createProgressEntry);
router.route('/:id').get(getProgressEntryById).put(updateProgressEntry).delete(deleteProgressEntry);

export default router;

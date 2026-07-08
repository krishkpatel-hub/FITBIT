import express from 'express';
import {
  createPRRecord,
  deletePRRecord,
  getPRRecordById,
  getPRRecords,
  updatePRRecord,
} from '../controllers/prController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.route('/').get(getPRRecords).post(createPRRecord);
router.route('/:id').get(getPRRecordById).put(updatePRRecord).delete(deletePRRecord);

export default router;


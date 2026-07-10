import express from 'express';
import { getCoachInsights } from '../controllers/coachController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.get('/insights', getCoachInsights);

export default router;

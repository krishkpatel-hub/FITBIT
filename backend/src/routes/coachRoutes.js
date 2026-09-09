import express from 'express';
import { chatWithCoach, getCoachInsights } from '../controllers/coachController.js';
import { protect } from '../middleware/authMiddleware.js';
import { coachLimiter } from '../middleware/rateLimitMiddleware.js';

const router = express.Router();

router.use(protect);

router.get('/insights', getCoachInsights);
router.post('/chat', coachLimiter, chatWithCoach);

export default router;

import express from 'express';
import { chatWithCoach, getCoachInsights, streamChatWithCoach } from '../controllers/coachController.js';
import { protect } from '../middleware/authMiddleware.js';
import { coachLimiter } from '../middleware/rateLimitMiddleware.js';

const router = express.Router();

router.use(protect);

router.get('/insights', getCoachInsights);
router.post('/chat', coachLimiter, chatWithCoach);
router.post('/chat/stream', coachLimiter, streamChatWithCoach);

export default router;

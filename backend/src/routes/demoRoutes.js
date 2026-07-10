import express from 'express';
import { seedDemoData } from '../controllers/demoController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.post('/seed', seedDemoData);

export default router;

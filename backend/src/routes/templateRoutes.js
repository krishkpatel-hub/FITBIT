import express from 'express';
import {
  createTemplate,
  deleteTemplate,
  getTemplateById,
  getTemplates,
  startWorkoutFromTemplate,
  updateTemplate,
} from '../controllers/templateController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.route('/').get(getTemplates).post(createTemplate);
router.post('/:id/start-workout', startWorkoutFromTemplate);
router.route('/:id').get(getTemplateById).put(updateTemplate).delete(deleteTemplate);

export default router;

import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import {
  getAllSliders,
  getAllSlidersAdmin,
  createSlider,
  updateSlider,
  deleteSlider,
  upload
} from '../controllers/slider.controller';

const router = Router();

console.log('🔧 Setting up slider routes...');

// Public route - get active sliders
router.get('/', getAllSliders);

// Admin routes
router.get(
  '/all',
  authenticate,
  requireRole(['ADMIN']),
  getAllSlidersAdmin
);

router.post(
  '/',
  authenticate,
  requireRole(['ADMIN']),
  upload.single('image'),
  createSlider
);

router.put(
  '/:id',
  authenticate,
  requireRole(['ADMIN']),
  upload.single('image'),
  updateSlider
);

router.delete(
  '/:id',
  authenticate,
  requireRole(['ADMIN']),
  deleteSlider
);

console.log('✅ Slider routes configured successfully');

export default router;


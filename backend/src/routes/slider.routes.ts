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
router.get('/', getAllSliders);
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

export default router;


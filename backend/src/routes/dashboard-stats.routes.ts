import { Router } from 'express';
import {
  getNgoDashboardStats,
  getDonorDashboardStats,
} from '../controllers/dashboard-stats.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';

const router = Router();
router.get(
  '/ngo/dashboard-stats',
  authenticate,
  requireRole(['NGO']),
  getNgoDashboardStats
);
router.get(
  '/donor/dashboard-stats',
  authenticate,
  requireRole(['DONOR']),
  getDonorDashboardStats
);

export default router;


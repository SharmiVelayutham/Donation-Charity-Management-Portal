import { Router } from 'express';
import {
  getNgoDashboardStats,
  getDonorDashboardStats,
} from '../controllers/dashboard-stats.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';

const router = Router();

/**
 * Dashboard Statistics Routes
 * Real-time statistics for NGO and Donor dashboards
 */

// NGO dashboard stats (requires NGO authentication)
router.get(
  '/ngo/dashboard-stats',
  authenticate,
  requireRole(['NGO']),
  getNgoDashboardStats
);

// Donor dashboard stats (requires Donor authentication)
router.get(
  '/donor/dashboard-stats',
  authenticate,
  requireRole(['DONOR']),
  getDonorDashboardStats
);

export default router;


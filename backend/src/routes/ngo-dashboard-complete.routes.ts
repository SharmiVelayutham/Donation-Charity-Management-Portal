import { Router } from 'express';
import {
  getNgoDashboard,
  getNgoProfile,
  updateNgoProfile,
  getNgoDashboardDonations,
} from '../controllers/ngo-dashboard-complete.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';

const router = Router();

// All routes require NGO authentication
router.use(authenticate);
router.use(requireRole(['NGO']));

/**
 * NGO Dashboard Routes (Complete)
 * All routes are prefixed with /api/ngo/dashboard
 */

// Dashboard overview
router.get('/', getNgoDashboard);

// Profile management
router.get('/profile', getNgoProfile);
router.put('/profile', updateNgoProfile);

// Donations list
router.get('/donations', getNgoDashboardDonations);

export default router;


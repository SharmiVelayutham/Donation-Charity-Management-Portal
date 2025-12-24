import { Router } from 'express';
import {
  getNgoDashboard,
  getNgoProfile,
  updateNgoProfile,
  getNgoDashboardDonations,
} from '../controllers/ngo-dashboard-complete.controller';
import {
  getNgoDonationDetails,
  getNgoDonationSummary,
  updateContributionStatus,
} from '../controllers/ngo-donations.controller';
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

// Update contribution status (MUST be before /donations routes to avoid conflicts)
router.put('/donations/:contributionId/status', updateContributionStatus);

// Donation details and summary (new endpoints - must be before /donations)
router.get('/donations/details', (req, res, next) => {
  console.log('[Route] GET /api/ngo/dashboard/donations/details');
  next();
}, getNgoDonationDetails);
router.get('/donations/summary', (req, res, next) => {
  console.log('[Route] GET /api/ngo/dashboard/donations/summary');
  next();
}, getNgoDonationSummary);

// Donations list (must be last to avoid conflicts)
router.get('/donations', getNgoDashboardDonations);

export default router;


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
router.use(authenticate);
router.use(requireRole(['NGO']));
router.get('/', getNgoDashboard);
router.get('/profile', getNgoProfile);
router.put('/profile', updateNgoProfile);
router.put('/donations/:contributionId/status', updateContributionStatus);
router.get('/donations/details', (req, res, next) => {
  console.log('[Route] GET /api/ngo/dashboard/donations/details');
  next();
}, getNgoDonationDetails);
router.get('/donations/summary', (req, res, next) => {
  console.log('[Route] GET /api/ngo/dashboard/donations/summary');
  next();
}, getNgoDonationSummary);
router.get('/donations', getNgoDashboardDonations);

export default router;


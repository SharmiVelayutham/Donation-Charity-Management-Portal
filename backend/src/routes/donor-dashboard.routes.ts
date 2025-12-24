import { Router } from 'express';
import {
  getDonorDashboard,
  getDonorProfile,
  updateDonorProfile,
  getDonorContributions,
  getDonorDonationRequestContributions,
  getAvailableDonations,
} from '../controllers/donor-dashboard.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';

const router = Router();

// All routes require DONOR authentication
router.use(authenticate);
router.use(requireRole(['DONOR']));

/**
 * Donor Dashboard Routes
 * All routes are prefixed with /api/donor/dashboard
 */

// Dashboard overview
router.get('/', getDonorDashboard);

// Profile management
router.get('/profile', getDonorProfile);
router.put('/profile', updateDonorProfile);

// Contributions (old system)
router.get('/contributions', getDonorContributions);

// Donation request contributions (new system)
router.get('/donation-request-contributions', getDonorDonationRequestContributions);

// Browse available donations
router.get('/available-donations', getAvailableDonations);

export default router;


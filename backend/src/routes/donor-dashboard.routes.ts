import { Router } from 'express';
import {
  getDonorDashboard,
  getDonorProfile,
  updateDonorProfile,
  getDonorContributions,
  getDonorDonationRequestContributions,
  getAvailableDonations,
  getDonorDashboardStats,
  downloadReceipt,
} from '../controllers/donor-dashboard.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';

const router = Router();
router.use(authenticate);
router.use(requireRole(['DONOR']));
router.get('/', getDonorDashboard);
router.get('/stats', getDonorDashboardStats);
router.get('/profile', getDonorProfile);
router.put('/profile', updateDonorProfile);
router.get('/contributions', getDonorContributions);
router.get('/donation-request-contributions', getDonorDonationRequestContributions);
router.get('/donation-request-contributions/:id/receipt', downloadReceipt);
router.get('/available-donations', getAvailableDonations);

export default router;


import { Router } from 'express';
import {
  getNgoDonationDetails,
  getNgoDonationSummary,
} from '../controllers/ngo-donations.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';

const router = Router();

/**
 * NGO Donations Routes
 * Detailed donor information and aggregated statistics
 */

// Get detailed donor contributions
router.get(
  '/donations/details',
  authenticate,
  requireRole(['NGO']),
  getNgoDonationDetails
);

// Get aggregated donation summary
router.get(
  '/donations/summary',
  authenticate,
  requireRole(['NGO']),
  getNgoDonationSummary
);

export default router;


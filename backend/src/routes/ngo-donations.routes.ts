import { Router } from 'express';
import {
  getNgoDonationDetails,
  getNgoDonationSummary,
} from '../controllers/ngo-donations.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';

const router = Router();
router.get(
  '/donations/details',
  authenticate,
  requireRole(['NGO']),
  getNgoDonationDetails
);
router.get(
  '/donations/summary',
  authenticate,
  requireRole(['NGO']),
  getNgoDonationSummary
);

export default router;


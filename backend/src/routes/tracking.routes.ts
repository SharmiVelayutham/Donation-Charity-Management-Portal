import { Router } from 'express';
import {
  trackDonation,
  trackMyContributions,
  getUpcomingPickups,
  getNgoUpcomingPickups,
} from '../controllers/tracking.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';

const router = Router();

// Public donation tracking
router.get('/donation/:id', trackDonation);

// Donor tracking
router.get('/my-contributions', authenticate, requireRole(['DONOR']), trackMyContributions);
router.get('/upcoming-pickups', authenticate, requireRole(['DONOR']), getUpcomingPickups);

// NGO tracking
router.get('/ngo/pickups', authenticate, requireRole(['NGO']), getNgoUpcomingPickups);

export default router;


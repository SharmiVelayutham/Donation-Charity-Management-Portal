import { Router } from 'express';
import { contributeToDonation, getNgoPickups, updatePickupStatus } from '../controllers/pickup-management.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';

const router = Router();

/**
 * Pickup Management Routes
 */

// Donor contributes to donation (includes address and contact)
router.post('/donations/:id/contribute', authenticate, requireRole(['DONOR']), contributeToDonation);

// NGO pickup management (must be before /:id to avoid route conflicts)
router.get('/ngo/pickups', authenticate, requireRole(['NGO']), getNgoPickups);
router.patch('/ngo/pickups/:id/status', authenticate, requireRole(['NGO']), updatePickupStatus);

export default router;


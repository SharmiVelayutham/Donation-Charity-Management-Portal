import { Router } from 'express';
import { contributeToDonation, getNgoPickups, updatePickupStatus } from '../controllers/pickup-management.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';

const router = Router();
router.post('/donations/:id/contribute', authenticate, requireRole(['DONOR']), contributeToDonation);
router.get('/ngo/pickups', authenticate, requireRole(['NGO']), getNgoPickups);
router.patch('/ngo/pickups/:id/status', authenticate, requireRole(['NGO']), updatePickupStatus);

export default router;


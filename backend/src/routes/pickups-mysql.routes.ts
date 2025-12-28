import { Router } from 'express';
import {
  createPickup,
  getNgoPickups,
  getDonorPickups,
  updatePickupStatus,
} from '../controllers/pickups-mysql.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';

const router = Router();
router.post('/', authenticate, requireRole(['DONOR']), createPickup);
router.get('/ngo', authenticate, requireRole(['NGO']), getNgoPickups);
router.get('/donor', authenticate, requireRole(['DONOR']), getDonorPickups);
router.patch('/:id/status', authenticate, requireRole(['NGO', 'ADMIN']), updatePickupStatus);

export default router;


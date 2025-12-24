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

/**
 * Pickup Routes (MySQL-based)
 */

// Create pickup (usually done via contributions, but available for manual creation)
router.post('/', authenticate, requireRole(['DONOR']), createPickup);

// Get pickups for NGO
router.get('/ngo', authenticate, requireRole(['NGO']), getNgoPickups);

// Get pickups for donor
router.get('/donor', authenticate, requireRole(['DONOR']), getDonorPickups);

// Update pickup status
router.patch('/:id/status', authenticate, requireRole(['NGO', 'ADMIN']), updatePickupStatus);

export default router;


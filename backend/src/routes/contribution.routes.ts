import { Router } from 'express';
import {
  createContribution,
  getMyContributions,
  getNgoContributions,
  approveContribution,
  updatePickupSchedule,
} from '../controllers/contribution.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';

const router = Router();
router.post('/', authenticate, requireRole(['DONOR']), createContribution);
router.get('/my', authenticate, requireRole(['DONOR']), getMyContributions);
router.get('/ngo', authenticate, requireRole(['NGO']), getNgoContributions);
router.put('/:id/approve', authenticate, requireRole(['NGO', 'ADMIN']), approveContribution);
router.put('/:id/schedule', authenticate, requireRole(['NGO', 'ADMIN']), updatePickupSchedule);

export default router;


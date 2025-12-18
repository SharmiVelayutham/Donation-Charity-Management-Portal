import { Router } from 'express';
import {
  createContribution,
  getMyContributions,
  getNgoContributions,
} from '../controllers/contribution.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';

const router = Router();

router.post('/', authenticate, requireRole(['DONOR']), createContribution);
router.get('/my', authenticate, requireRole(['DONOR']), getMyContributions);
router.get('/ngo', authenticate, requireRole(['NGO']), getNgoContributions);

export default router;


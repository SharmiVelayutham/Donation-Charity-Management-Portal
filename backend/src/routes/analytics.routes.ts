import { Router } from 'express';
import { getPlatformStats, getDonorStats, getNgoStats } from '../controllers/analytics.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';

const router = Router();
router.get('/platform', getPlatformStats);
router.get('/donor', authenticate, requireRole(['DONOR']), getDonorStats);
router.get('/ngo', authenticate, requireRole(['NGO']), getNgoStats);

export default router;


import { Router } from 'express';
import {
  contributeToDonation,
  getMyContributions,
  getNgoContributions,
} from '../controllers/contributions-mysql.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';

const router = Router();
router.post('/donations/:id/contribute', authenticate, requireRole(['DONOR']), contributeToDonation);

export default router;
export const contributionsRouter = Router();
contributionsRouter.get('/my', authenticate, requireRole(['DONOR']), getMyContributions);
contributionsRouter.get('/ngo/:ngoId', authenticate, requireRole(['NGO', 'ADMIN']), getNgoContributions);


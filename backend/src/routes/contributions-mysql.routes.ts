import { Router } from 'express';
import {
  contributeToDonation,
  getMyContributions,
  getNgoContributions,
} from '../controllers/contributions-mysql.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';

const router = Router();

/**
 * Contributions Routes (MySQL-based)
 * Note: POST /api/donations/:id/contribute is registered via /api route prefix
 * GET /api/contributions/* routes are registered via /api/contributions prefix
 */

// Donor contributes to a donation
router.post('/donations/:id/contribute', authenticate, requireRole(['DONOR']), contributeToDonation);

export default router;

// Separate router for /api/contributions/* routes
export const contributionsRouter = Router();
contributionsRouter.get('/my', authenticate, requireRole(['DONOR']), getMyContributions);
contributionsRouter.get('/ngo/:ngoId', authenticate, requireRole(['NGO', 'ADMIN']), getNgoContributions);


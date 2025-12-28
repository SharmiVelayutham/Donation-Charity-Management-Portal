import { Router } from 'express';
import {
  getAllDonors,
  getAllContributions,
  getDonorContributions,
} from '../controllers/admin-donors.controller';
import { getAdminAnalytics } from '../controllers/admin-analytics.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';

const router = Router();
router.use(authenticate);
router.use(requireRole(['ADMIN']));
router.get('/analytics', (req, res, next) => {
  console.log('📊 [Admin Analytics] Route hit: /api/admin/analytics');
  getAdminAnalytics(req as any, res).catch(next);
});
router.get('/donors', (req, res, next) => {
  console.log('👥 [Admin Donors] Route hit: /api/admin/donors');
  getAllDonors(req as any, res).catch(next);
});

router.get('/contributions', (req, res, next) => {
  console.log('💰 [Admin Contributions] Route hit: /api/admin/contributions');
  getAllContributions(req as any, res).catch(next);
});

router.get('/contributions/:donorId', (req, res, next) => {
  console.log(`👤 [Admin Donor Contributions] Route hit: /api/admin/contributions/${req.params.donorId}`);
  getDonorContributions(req as any, res).catch(next);
});

export default router;


import { Router } from 'express';
import {
  getAllNgos,
  getAllDonors,
  getNgoDetails,
  getDonorDetails,
  blockNgo,
  unblockNgo,
  blockDonor,
  unblockDonor,
} from '../controllers/admin-dashboard.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';

const router = Router();

// All routes require ADMIN authentication
router.use(authenticate);
router.use(requireRole(['ADMIN']));

/**
 * Admin Dashboard Routes
 * All routes are prefixed with /api/admin/dashboard
 */

// NGO Management
router.get('/ngos', getAllNgos);
router.get('/ngos/:id', getNgoDetails);
router.put('/ngos/:id/block', blockNgo);
router.put('/ngos/:id/unblock', unblockNgo);

// Donor Management
router.get('/donors', getAllDonors);
router.get('/donors/:id', getDonorDetails);
router.put('/donors/:id/block', blockDonor);
router.put('/donors/:id/unblock', unblockDonor);

export default router;


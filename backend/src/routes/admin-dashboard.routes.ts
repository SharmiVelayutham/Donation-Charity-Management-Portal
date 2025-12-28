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
  approveNgo,
  rejectNgo,
  approveNgoProfileUpdate,
  rejectNgoProfileUpdate,
} from '../controllers/admin-dashboard.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';

const router = Router();
router.use(authenticate);
router.use(requireRole(['ADMIN']));
router.get('/ngos', getAllNgos);
router.get('/ngos/:id', getNgoDetails);
router.patch('/ngos/:id/block', blockNgo);
router.patch('/ngos/:id/unblock', unblockNgo);
router.put('/ngos/:id/approve', approveNgo);
router.put('/ngos/:id/reject', rejectNgo);
router.put('/ngos/:id/approve-profile-update', approveNgoProfileUpdate);
router.put('/ngos/:id/reject-profile-update', rejectNgoProfileUpdate);
router.get('/donors', getAllDonors);
router.get('/donors/:id', getDonorDetails);
router.put('/donors/:id/block', blockDonor);
router.put('/donors/:id/unblock', unblockDonor);

export default router;


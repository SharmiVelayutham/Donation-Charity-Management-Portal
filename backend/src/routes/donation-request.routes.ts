import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import {
  createDonationRequest,
  getActiveDonationRequests,
  getDonationRequestById,
  getMyDonationRequests,
  updateDonationRequestStatus,
  contributeToDonationRequest,
  upload
} from '../controllers/donation-request.controller';

const router = Router();
router.get('/test', (req, res) => {
  res.json({ success: true, message: 'Donation requests router is working!' });
});
router.get('/', getActiveDonationRequests);
router.post(
  '/',
  authenticate,
  requireRole(['NGO']),
  upload.array('images', 5), // Allow up to 5 images
  createDonationRequest
);
router.get(
  '/my-requests',
  authenticate,
  requireRole(['NGO']),
  getMyDonationRequests
);
router.get('/:id', getDonationRequestById);
router.post(
  '/:id/contribute',
  authenticate,
  requireRole(['DONOR']),
  upload.array('images', 5), // Allow up to 5 images
  contributeToDonationRequest
);
router.put(
  '/:id/status',
  authenticate,
  requireRole(['NGO', 'ADMIN']),
  updateDonationRequestStatus
);

export default router;


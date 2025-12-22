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

console.log('🔧 Setting up donation-request routes...');

// Test route to verify router is working
router.get('/test', (req, res) => {
  console.log('✅ Test route hit - /api/donation-requests/test');
  res.json({ success: true, message: 'Donation requests router is working!' });
});

// Public route: Get all ACTIVE donation requests (for donors)
router.get('/', (req, res, next) => {
  console.log('📥 GET /api/donation-requests - Request received');
  next();
}, getActiveDonationRequests);

// Protected routes: NGO only
router.post(
  '/',
  (req, res, next) => {
    console.log('📥 POST /api/donation-requests - Request received');
    next();
  },
  authenticate,
  requireRole(['NGO']),
  upload.array('images', 5), // Allow up to 5 images
  createDonationRequest
);

// Get my donation requests (NGO) - MUST be before /:id route
router.get(
  '/my-requests',
  authenticate,
  requireRole(['NGO']),
  getMyDonationRequests
);

// Public route: Get donation request by ID - MUST be after /my-requests
router.get('/:id', getDonationRequestById);

// Donor submits donation to a request
router.post(
  '/:id/contribute',
  authenticate,
  requireRole(['DONOR']),
  upload.array('images', 5), // Allow up to 5 images
  contributeToDonationRequest
);

// Update donation request status (NGO)
router.put(
  '/:id/status',
  authenticate,
  requireRole(['NGO', 'ADMIN']),
  updateDonationRequestStatus
);

console.log('✅ Donation-request routes configured successfully');

export default router;


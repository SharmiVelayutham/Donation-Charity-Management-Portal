import { Router } from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import {
  createNgoDonation,
  getNgoDonations,
  getNgoDonationById,
  updateNgoDonation,
  updateNgoDonationPriority,
  cancelNgoDonation,
  getNgoDonationDetails,
  updateDonationRequestContributionStatus,
} from '../controllers/ngo-dashboard.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';

// Setup multer for image uploads
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});

const upload = multer({ storage });

const router = Router();

// All routes require NGO authentication
router.use(authenticate);
router.use(requireRole(['NGO']));

/**
 * NGO Admin Dashboard Routes
 * All routes are prefixed with /api/ngo/donations
 */

// Create donation request
router.post('/', upload.array('images', 5), createNgoDonation);

// Get all donations created by logged-in NGO
router.get('/', getNgoDonations);

// Get donation request contributions with donor details
router.get('/details', getNgoDonationDetails);

// Update donation request contribution status (must be before /:id to avoid route conflicts)
router.put('/:id/status', updateDonationRequestContributionStatus);

// Get donation details (only own donation)
router.get('/:id', getNgoDonationById);

// Update donation request
router.put('/:id', upload.array('images', 5), updateNgoDonation);

// Update priority only
router.patch('/:id/priority', updateNgoDonationPriority);

// Cancel donation request
router.delete('/:id', cancelNgoDonation);

export default router;


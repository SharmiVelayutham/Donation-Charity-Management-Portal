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
router.use(authenticate);
router.use(requireRole(['NGO']));
router.post('/', upload.array('images', 5), createNgoDonation);
router.get('/', getNgoDonations);
router.get('/details', getNgoDonationDetails);
router.put('/:id/status', updateDonationRequestContributionStatus);
router.get('/:id', getNgoDonationById);
router.put('/:id', upload.array('images', 5), updateNgoDonation);
router.patch('/:id/priority', updateNgoDonationPriority);
router.delete('/:id', cancelNgoDonation);

export default router;


import { Router } from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import {
  createDonation,
  deleteDonation,
  getDonationById,
  getDonations,
  updateDonation,
} from '../controllers/donation.controller';
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

router.post('/', authenticate, requireRole(['NGO']), upload.array('images', 5), createDonation);
router.get('/', getDonations);
router.get('/:id', getDonationById);
router.put('/:id', authenticate, requireRole(['NGO', 'ADMIN']), upload.array('images', 5), updateDonation);
router.delete('/:id', authenticate, requireRole(['NGO', 'ADMIN']), deleteDonation);

export default router;


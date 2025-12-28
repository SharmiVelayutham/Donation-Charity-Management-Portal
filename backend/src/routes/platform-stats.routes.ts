import { Router } from 'express';
import { getPlatformStats } from '../controllers/platform-stats.controller';

const router = Router();
router.get('/stats', getPlatformStats);

export default router;


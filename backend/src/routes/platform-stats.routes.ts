import { Router } from 'express';
import { getPlatformStats } from '../controllers/platform-stats.controller';

const router = Router();

/**
 * Platform Statistics Routes (Public)
 */

// Get platform-wide stats (public, no auth required)
router.get('/stats', getPlatformStats);

export default router;


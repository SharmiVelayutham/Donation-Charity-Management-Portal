import { Router } from 'express';
import { getDonorLeaderboard, getNgoLeaderboard } from '../controllers/leaderboard.controller';

const router = Router();

// Public leaderboard endpoints
router.get('/donors', getDonorLeaderboard);
router.get('/ngos', getNgoLeaderboard);

export default router;


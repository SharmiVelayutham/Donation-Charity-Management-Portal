import { Router } from 'express';
import { getLeaderboard } from '../controllers/leaderboard-mysql.controller';

const router = Router();

console.log('🔧 Leaderboard routes file loaded');

/**
 * Leaderboard Routes (MySQL-based)
 * Public endpoints - no authentication required
 */

// Test route to verify registration
router.get('/test', (req, res) => {
  console.log('✅ Test route hit');
  res.json({ message: 'Leaderboard route is working!', path: req.path });
});

// Get leaderboard (donors or NGOs)
router.get('/', (req, res, next) => {
  console.log('📊 Leaderboard GET / route hit');
  next();
}, getLeaderboard);

console.log('✅ Leaderboard routes configured');

export default router;


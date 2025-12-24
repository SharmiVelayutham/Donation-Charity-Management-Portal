import { Router } from 'express';
import { getUserProfile } from '../controllers/user.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

/**
 * User Routes
 * All routes require authentication
 */

// Get user profile (works for both DONOR and NGO)
router.get('/profile', authenticate, getUserProfile);

export default router;


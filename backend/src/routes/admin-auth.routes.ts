import { Router } from 'express';
import { adminLogin, adminRegister } from '../controllers/admin-auth.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';

const router = Router();

/**
 * Admin-only authentication routes
 * These endpoints are separate from regular auth
 * Admin registration should be protected (only existing admins can create new admins)
 * For initial admin creation, you may want to add additional security
 */

// Admin registration (should be protected - only existing admins can register new admins)
// For production, consider adding additional security like admin invite codes
router.post('/register', authenticate, requireRole(['ADMIN']), adminRegister);

// Admin login (public endpoint but only admins can successfully login)
router.post('/login', adminLogin);

export default router;


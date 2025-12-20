import { Router, Request, Response, NextFunction } from 'express';
import { adminLogin, adminRegister } from '../controllers/admin-auth.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { queryOne } from '../config/mysql';

const router = Router();

/**
 * Admin-only authentication routes
 * These endpoints are separate from regular auth
 * Admin registration: First admin can be created without authentication
 * Subsequent admins require existing admin authentication
 */

// Middleware to check if first admin registration
const checkFirstAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const existingAdmin = await queryOne('SELECT id FROM admins LIMIT 1');
    if (existingAdmin) {
      // Admin exists, require authentication
      return authenticate(req, res, () => {
        requireRole(['ADMIN'])(req, res, next);
      });
    } else {
      // No admin exists, allow registration
      next();
    }
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to check admin status' });
  }
};

// Admin registration
router.post('/register', checkFirstAdmin, adminRegister);

// Admin login (public endpoint but only admins can successfully login)
router.post('/login', adminLogin);

export default router;

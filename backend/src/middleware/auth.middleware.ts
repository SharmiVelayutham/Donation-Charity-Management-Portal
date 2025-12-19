import { NextFunction, Request, Response } from 'express';
import { verifyToken } from '../utils/jwt';
import { findUserById } from '../utils/mysql-auth-helper';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    role: 'DONOR' | 'NGO' | 'ADMIN';
    email: string;
  };
}

/**
 * Authentication middleware
 * Checks Donor, Admin, and User (NGO) tables in MySQL
 */
export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    const token = authHeader.split(' ')[1];
    const payload = verifyToken(token);
    
    // Find user across all tables (Donor, Admin, User/NGO)
    const user = await findUserById(payload.userId);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    
    // Check if user is blocked
    if (user.isBlocked) {
      return res.status(403).json({ success: false, message: 'Your account has been blocked. Please contact support.' });
    }
    
    req.user = { id: user.id.toString(), role: user.role, email: user.email };
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};


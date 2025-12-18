import { NextFunction, Request, Response } from 'express';
import { verifyToken } from '../utils/jwt';
import { UserModel } from '../models/User.model';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    role: string;
    email: string;
  };
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    const token = authHeader.split(' ')[1];
    const payload = verifyToken(token);
    const user = await UserModel.findById(payload.userId);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    req.user = { id: user.id, role: user.role, email: user.email };
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};


import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { AdminModel } from '../models/Admin.model';
import { signToken } from '../utils/jwt';
import { sendSuccess } from '../utils/response';
import { emailExists } from '../utils/auth-helper';

const SALT_ROUNDS = 10;

/**
 * Admin-only registration endpoint
 * Only existing admins or system can create new admins
 * This endpoint should be protected or require special access
 */
export const adminRegister = async (req: Request, res: Response) => {
  const { name, email, password, contactInfo } = req.body as {
    name?: string;
    email?: string;
    password?: string;
    contactInfo?: string;
  };

  if (!name || !email || !password || !contactInfo) {
    return res.status(400).json({ success: false, message: 'Missing required fields' });
  }

  // Check if email exists in any collection
  const existing = await emailExists(email);
  if (existing) {
    return res.status(409).json({ success: false, message: 'Email already in use' });
  }

  const hashed = await bcrypt.hash(password, SALT_ROUNDS);
  const admin = await AdminModel.create({
    name,
    email,
    password: hashed,
    contactInfo,
    role: 'ADMIN',
  });

  const token = signToken({ userId: admin.id, role: 'ADMIN', email: admin.email });
  return sendSuccess(
    res,
    {
      token,
      admin: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        role: 'ADMIN',
      },
    },
    'Admin registered successfully',
    201
  );
};

/**
 * Admin-only login endpoint
 * Only admins can access this endpoint
 */
export const adminLogin = async (req: Request, res: Response) => {
  const { email, password } = req.body as { email: string; password: string };
  
  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Missing credentials' });
  }

  // Only check admin collection
  const admin = await AdminModel.findOne({ email: email.toLowerCase() });
  if (!admin) {
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
  }

  const match = await bcrypt.compare(password, admin.password);
  if (!match) {
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
  }

  const token = signToken({ userId: admin.id, role: 'ADMIN', email: admin.email });
  return sendSuccess(
    res,
    {
      token,
      admin: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        role: 'ADMIN',
      },
    },
    'Admin logged in successfully'
  );
};


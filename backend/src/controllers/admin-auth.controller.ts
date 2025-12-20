import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { signToken } from '../utils/jwt';
import { sendSuccess } from '../utils/response';
import { emailExists } from '../utils/mysql-auth-helper';
import { insert, queryOne } from '../config/mysql';

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
  const normalizedEmail = email.toLowerCase();
  
  const adminId = await insert(
    'INSERT INTO admins (name, email, password, contact_info, role) VALUES (?, ?, ?, ?, ?)',
    [name, normalizedEmail, hashed, contactInfo, 'ADMIN']
  );

  const admin = await queryOne<any>('SELECT id, name, email, role FROM admins WHERE id = ?', [adminId]);
  if (!admin) {
    return res.status(500).json({ success: false, message: 'Failed to create admin' });
  }

  const token = signToken({ userId: adminId.toString(), role: 'ADMIN', email: admin.email });
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

  // Only check admin table
  const admin = await queryOne<any>('SELECT id, name, email, password, role FROM admins WHERE email = ?', [email.toLowerCase()]);
  if (!admin) {
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
  }

  const match = await bcrypt.compare(password, admin.password);
  if (!match) {
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
  }

  const token = signToken({ userId: admin.id.toString(), role: 'ADMIN', email: admin.email });
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


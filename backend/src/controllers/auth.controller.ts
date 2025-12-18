import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { UserModel, UserRole } from '../models/User.model';
import { signToken } from '../utils/jwt';
import { sendSuccess } from '../utils/response';

const SALT_ROUNDS = 10;

export const register = async (req: Request, res: Response) => {
  // Be tolerant to different frontend field names (contactInfo vs contact_info, etc.)
  const body = req.body as {
    name?: string;
    email?: string;
    password?: string;
    role?: UserRole;
    contactInfo?: string;
    contact_info?: string;
  };

  const name = body.name;
  const email = body.email;
  const password = body.password;
  const role = body.role;
  const contactInfo = body.contactInfo ?? body.contact_info;

  if (!name || !email || !password || !contactInfo) {
    return res.status(400).json({ success: false, message: 'Missing required fields' });
  }

  const normalizedRole: UserRole = role || 'DONOR';
  if (!['DONOR', 'NGO', 'ADMIN'].includes(normalizedRole)) {
    return res.status(400).json({ success: false, message: 'Invalid role' });
  }

  const existing = await UserModel.findOne({ email });
  if (existing) {
    return res.status(409).json({ success: false, message: 'Email already in use' });
  }

  const hashed = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await UserModel.create({
    name,
    email,
    password: hashed,
    role: normalizedRole,
    contactInfo,
  });

  const token = signToken({ userId: user.id, role: user.role, email: user.email });
  return sendSuccess(
    res,
    {
      token,
      user: {
        user_id: user.id,
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    },
    'Registered',
    201
  );
};

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body as { email: string; password: string };
  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Missing credentials' });
  }

  const user = await UserModel.findOne({ email });
  if (!user) {
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
  }

  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
  }

  const token = signToken({ userId: user.id, role: user.role, email: user.email });
  return sendSuccess(
    res,
    {
      token,
      user: {
        user_id: user.id,
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    },
    'Logged in'
  );
};


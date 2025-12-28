import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { signToken } from '../utils/jwt';
import { sendSuccess } from '../utils/response';
import { emailExists } from '../utils/mysql-auth-helper';
import { insert, queryOne } from '../config/mysql';
import { generateOTP, storeOTP, sendOTPEmail, verifyOTP } from '../utils/otp.service';
import { env } from '../config/env';

const SALT_ROUNDS = 10;
export const adminRegister = async (req: Request, res: Response) => {
  const { name, email, password, contactInfo, securityCode } = req.body as {
    name?: string;
    email?: string;
    password?: string;
    contactInfo?: string;
    securityCode?: string;
  };
  if (!name || !email || !password || !contactInfo || !securityCode) {
    return res.status(400).json({ 
      success: false, 
      message: 'Missing required fields: name, email, password, contactInfo, and securityCode are required' 
    });
  }
  if (!env.adminSecurityCode || env.adminSecurityCode.trim() === '') {
    return res.status(500).json({ 
      success: false, 
      message: 'Admin security code is not configured. Please set ADMIN_SECURITY_CODE in your .env file. See .env.example for reference.' 
    });
  }
  const trimmedSecurityCode = securityCode.trim();
  const trimmedEnvCode = env.adminSecurityCode.trim();
  
  if (trimmedSecurityCode !== trimmedEnvCode) {
    console.log(`[Admin Registration] Security code mismatch. Expected: ${trimmedEnvCode}, Got: ${trimmedSecurityCode}`);
    return res.status(403).json({ 
      success: false, 
      message: 'Invalid security code. Admin registration requires a valid security code.' 
    });
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ success: false, message: 'Invalid email format' });
  }
  const existing = await emailExists(email);
  if (existing) {
    return res.status(409).json({ success: false, message: 'Email already in use' });
  }
  if (password.length < 6) {
    return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long' });
  }

  try {
    const otp = generateOTP();
    await storeOTP(email, otp, 'ADMIN_REGISTRATION');
    await sendOTPEmail(email, otp, 'ADMIN_REGISTRATION');
    return sendSuccess(
      res,
      {
        requiresVerification: true,
        email: email.toLowerCase(),
        message: 'Security code validated. OTP sent to your email. Please verify to complete registration.',
      },
      'OTP sent to email. Please verify to complete admin registration.',
      200
    );
  } catch (error: any) {
    console.error('Error sending OTP for admin registration:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to send OTP email. Please check SMTP configuration.',
    });
  }
};
export const adminVerifyOTPAndRegister = async (req: Request, res: Response) => {
  const { name, email, password, contactInfo, securityCode, otp } = req.body as {
    name?: string;
    email?: string;
    password?: string;
    contactInfo?: string;
    securityCode?: string;
    otp?: string;
  };
  if (!name || !email || !password || !contactInfo || !securityCode || !otp) {
    return res.status(400).json({ 
      success: false, 
      message: 'Missing required fields: name, email, password, contactInfo, securityCode, and otp are required' 
    });
  }
  const normalizedSecurityCode = securityCode.trim();
  if (!env.adminSecurityCode || normalizedSecurityCode !== env.adminSecurityCode.trim()) {
    console.log(`[Admin Registration] Security code mismatch. Expected: ${env.adminSecurityCode}, Got: ${normalizedSecurityCode}`);
    return res.status(403).json({ 
      success: false, 
      message: 'Invalid security code' 
    });
  }
  const normalizedEmailForOTP = email.toLowerCase().trim();
  const normalizedOTP = otp.trim();
  console.log(`[Admin Registration] Verifying OTP for email: ${normalizedEmailForOTP}, OTP: ${normalizedOTP}`);
  const isValidOTP = await verifyOTP(normalizedEmailForOTP, normalizedOTP, 'ADMIN_REGISTRATION');
  
  if (!isValidOTP) {
    const { query } = await import('../config/mysql');
    const existingOTPs = await query<any>(
      'SELECT otp_code, purpose, verified, expires_at, created_at FROM otp_verifications WHERE email = ? ORDER BY created_at DESC LIMIT 5',
      [normalizedEmailForOTP]
    );
    
    console.log(`[Admin Registration] Existing OTPs for ${normalizedEmailForOTP}:`, existingOTPs);
    
    return res.status(400).json({ 
      success: false, 
      message: 'Invalid or expired OTP. Please check the OTP code and ensure it hasn\'t expired (10 minutes). Request a new OTP if needed.' 
    });
  }
  const existing = await emailExists(normalizedEmailForOTP);
  if (existing) {
    return res.status(409).json({ success: false, message: 'Email already in use' });
  }
  const hashed = await bcrypt.hash(password, SALT_ROUNDS);
  
  const adminId = await insert(
    'INSERT INTO admins (name, email, password, contact_info, role) VALUES (?, ?, ?, ?, ?)',
    [name, normalizedEmailForOTP, hashed, contactInfo, 'ADMIN']
  );

  const admin = await queryOne<any>('SELECT id, name, email, role FROM admins WHERE id = ?', [adminId]);
  if (!admin) {
    return res.status(500).json({ success: false, message: 'Failed to create admin account' });
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
    'Admin registered and verified successfully',
    201
  );
};
export const adminLogin = async (req: Request, res: Response) => {
  const { email, password } = req.body as { email: string; password: string };
  
  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Missing credentials' });
  }
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


import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { signToken } from '../utils/jwt';
import { sendSuccess } from '../utils/response';
import { emailExists, findUserWithPasswordByEmail } from '../utils/mysql-auth-helper';
import { insert, queryOne } from '../config/mysql';
import { generateOTP, storeOTP, sendOTPEmail, verifyOTP } from '../utils/otp.service';
import { generateNgoId } from '../utils/ngo-id-generator';

const SALT_ROUNDS = 10;

export const register = async (req: Request, res: Response) => {
  // Be tolerant to different frontend field names (contactInfo vs contact_info, etc.)
  const body = req.body as {
    name?: string;
    email?: string;
    password?: string;
    role?: 'DONOR' | 'NGO' | 'ADMIN';
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

  const normalizedRole = (role || 'DONOR').toUpperCase();
  // Regular auth endpoint does not allow ADMIN registration
  // Admins must use /api/admin/auth/register
  if (!['DONOR', 'NGO'].includes(normalizedRole)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid role. Admin registration is not allowed through this endpoint. Use /api/admin/auth/register',
    });
  }

  // Check if email exists in any table
  const existing = await emailExists(email);
  if (existing) {
    return res.status(409).json({ success: false, message: 'Email already in use' });
  }

  try {
    // Generate OTP
    const otp = generateOTP();
    
    // Store OTP in database first (before sending email)
    // This way, if email fails, we can still track the attempt
    await storeOTP(email, otp, 'REGISTRATION');
    
    // Send OTP email - this will throw if email sending fails
    try {
      await sendOTPEmail(email, otp, 'REGISTRATION');
    } catch (emailError: any) {
      // If email fails, log the error but don't fail the entire registration
      // The OTP is already stored, so user can request resend
      console.error('Email sending failed:', emailError.message);
      
      // Return error response - do NOT pretend OTP was sent
      return res.status(500).json({
        success: false,
        message: `Failed to send OTP email: ${emailError.message}. Please check your email address and try again.`,
        emailError: true,
      });
    }
    
    // Only return success if email was sent successfully
    return sendSuccess(res, {
      message: 'OTP sent to your email. Please check your inbox and verify to complete registration.',
      email: email,
      requiresVerification: true
    }, 'OTP sent successfully', 200);
  } catch (error: any) {
    console.error('Registration error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to process registration. Please try again.',
    });
  }
};

/**
 * Verify OTP and complete registration
 * POST /api/auth/verify-otp
 */
export const verifyOTPAndRegister = async (req: Request, res: Response) => {
  const body = req.body as {
    name?: string;
    email?: string;
    password?: string;
    role?: 'DONOR' | 'NGO' | 'ADMIN';
    contactInfo?: string;
    contact_info?: string;
    otp?: string;
    // NGO-specific fields
    registrationNumber?: string;
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
    contactPersonName?: string;
    phoneNumber?: string;
    aboutNgo?: string;
    websiteUrl?: string;
  };

  const { name, email, password, role, contactInfo, contact_info, otp } = body;

  if (!name || !email || !password || !contactInfo || !otp) {
    return res.status(400).json({ success: false, message: 'Missing required fields' });
  }

  const normalizedRole = (role || 'DONOR').toUpperCase();
  if (!['DONOR', 'NGO'].includes(normalizedRole)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid role. Admin registration is not allowed through this endpoint.',
    });
  }

  // Verify OTP
  const isValidOTP = await verifyOTP(email, otp, 'REGISTRATION');
  if (!isValidOTP) {
    return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
  }

  // Check if email still exists (race condition check)
  const existing = await emailExists(email);
  if (existing) {
    return res.status(409).json({ success: false, message: 'Email already in use' });
  }

  try {
    const hashed = await bcrypt.hash(password, SALT_ROUNDS);
    const normalizedEmail = email.toLowerCase();
    const contact = contactInfo ?? contact_info;

    let userId: number;
    let userRole: string;

    // Create user in appropriate table based on role
    if (normalizedRole === 'DONOR') {
      console.log('Creating DONOR user:', { name, email: normalizedEmail });
      userId = await insert(
        'INSERT INTO donors (name, email, password, contact_info, role) VALUES (?, ?, ?, ?, ?)',
        [name, normalizedEmail, hashed, contact, 'DONOR']
      );
      console.log('DONOR created with ID:', userId);
      userRole = 'DONOR';
    } else {
      // NGO - stored in users table with full profile
      console.log('Creating NGO user:', { name, email: normalizedEmail });
      
      // Extract NGO-specific fields from request body
      const {
        registrationNumber,
        address,
        city,
        state,
        pincode,
        contactPersonName,
        phoneNumber,
        aboutNgo,
        websiteUrl,
      } = body as any;
      
      // Validate required NGO fields
      if (!registrationNumber || !address) {
        return res.status(400).json({
          success: false,
          message: 'Missing required NGO fields: registrationNumber and address are required',
        });
      }
      
      // Generate unique NGO ID
      console.log('[NGO Registration] Generating NGO ID...');
      const ngoId = await generateNgoId();
      console.log('[NGO Registration] Generated NGO ID:', ngoId);
      
      // Insert NGO with all fields, status defaults to PENDING and verified = 0
      userId = await insert(
        `INSERT INTO users (
          ngo_id, name, email, password, contact_info, role,
          registration_number, address, city, state, pincode,
          contact_person_name, phone_number, about_ngo, website_url,
          verification_status, verified, address_locked
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          ngoId,
          name,
          normalizedEmail,
          hashed,
          contact,
          'NGO',
          registrationNumber,
          address,
          city || null,
          state || null,
          pincode || null,
          contactPersonName || null,
          phoneNumber || null,
          aboutNgo || null,
          websiteUrl || null,
          'PENDING', // Default verification status
          false, // verified = 0 (not verified)
          true, // Lock address after initial submission
        ]
      );
      console.log('NGO created with ID:', userId, 'NGO ID:', ngoId, 'Status: PENDING, Verified: 0');
      userRole = 'NGO';
    }

    // Fetch created user to return complete data
    let userData: any;
    if (normalizedRole === 'DONOR') {
      userData = await queryOne('SELECT id, name, email, role FROM donors WHERE id = ?', [userId]);
    } else {
      userData = await queryOne(
        'SELECT id, ngo_id, name, email, role, verification_status, verified FROM users WHERE id = ?',
        [userId]
      );
    }

    if (!userData) {
      console.error('Failed to fetch created user data');
      return res.status(500).json({ success: false, message: 'Failed to create user' });
    }

    // For NGOs: Do NOT issue token if verification_status is not VERIFIED OR verified = 0
    // They must wait for admin approval
    // STRICT CHECK: Both verified = 1 AND verification_status = 'VERIFIED' required
    if (normalizedRole === 'NGO') {
      const verificationStatus = userData.verification_status || 'PENDING';
      // Handle both boolean and number (0/1) from MySQL
      const verifiedValue = userData.verified;
      const isVerified = verifiedValue === true || verifiedValue === 1 || (verifiedValue !== null && verifiedValue !== false && verifiedValue !== 0);
      
      console.log(`[NGO Registration] User ID: ${userData.id}, NGO ID: ${userData.ngo_id}`);
      console.log(`[NGO Registration] Verification Status: "${verificationStatus}", Verified Value: ${verifiedValue}, Is Verified: ${isVerified}`);
      
      // CRITICAL: Block if NOT verified (either status is not VERIFIED OR verified = 0/false)
      // For new registrations, both should be false/0 and PENDING
      if (!isVerified || verificationStatus !== 'VERIFIED') {
        console.log(`[NGO Registration] ❌ BLOCKING - verified=${isVerified} (value: ${verifiedValue}), status="${verificationStatus}" - NO TOKEN`);
        console.log(`[NGO Registration] ❌ BLOCKING LOGIN - verified=${isVerified}, status="${verificationStatus}". No token will be issued.`);
        
        // Send email notification that profile is under verification
        try {
          const { sendNgoProfileUnderVerificationEmail } = await import('../utils/email.service');
          await sendNgoProfileUnderVerificationEmail(normalizedEmail, name);
          console.log(`✅ Profile under verification email sent to ${normalizedEmail}`);
        } catch (emailError: any) {
          console.error('Failed to send verification email:', emailError);
          // Don't fail registration if email fails
        }
        
        return sendSuccess(
          res,
          {
            user: {
              id: userData.id,
              ngo_id: userData.ngo_id,
              name: userData.name,
              email: userData.email,
              role: userData.role || userRole,
              verification_status: verificationStatus,
            },
            message: 'Your NGO profile is under admin verification. You will receive an email once verified.',
          },
          'NGO registration completed. Awaiting admin verification.',
          201
        );
      } else {
        console.log(`[NGO Registration] ✅ NGO is VERIFIED - Token will be issued.`);
      }
    }

    // For DONOR or VERIFIED NGO: Issue token
    console.log(`[Registration] Issuing token for ${normalizedRole} - User ID: ${userData.id}`);
    const token = signToken({ userId: userId.toString(), role: userRole as 'DONOR' | 'NGO', email: normalizedEmail });
    
    const responseData = {
      token,
      user: {
        id: userData.id,
        ngo_id: userData.ngo_id || undefined,
        name: userData.name,
        email: userData.email,
        role: userData.role || userRole,
        verification_status: userData.verification_status || undefined,
      },
    };
    
    console.log('✅ Registration successful - Token issued:', { 
      userId: userData.id, 
      role: userData.role, 
      hasToken: !!token,
      verificationStatus: userData.verification_status 
    });
    return sendSuccess(res, responseData, 'Registration completed successfully', 201);
  } catch (error: any) {
    console.error('Registration error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to register user. Please try again.',
    });
  }
};

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body as { email: string; password: string };
  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Missing credentials' });
  }

  // Check if user is an admin - admins must use /api/admin/auth/login
  const admin = await queryOne<any>('SELECT id FROM admins WHERE email = ?', [email.toLowerCase()]);
  if (admin) {
    return res.status(403).json({
      success: false,
      message: 'Admin login is not allowed through this endpoint. Please use /api/admin/auth/login',
    });
  }

  // Find user across Donor and NGO tables only
  const user = await findUserWithPasswordByEmail(email);
  if (!user) {
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
  }

  // Double check - should not be admin at this point
  if (user.role === 'ADMIN') {
    return res.status(403).json({
      success: false,
      message: 'Admin login is not allowed through this endpoint. Please use /api/admin/auth/login',
    });
  }

  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
  }

  // For NGOs: Check verification status - ONLY allow login if verified = 1 AND verification_status = 'VERIFIED'
  if (user.role === 'NGO') {
    const ngoDetails = await queryOne<{ verified: boolean; verification_status: string; rejection_reason: string | null }>(
      'SELECT verified, verification_status, rejection_reason FROM users WHERE id = ?',
      [user.id]
    );

    if (!ngoDetails) {
      return res.status(500).json({ success: false, message: 'Failed to fetch NGO details' });
    }

    // STRICT CHECK: Both verified = 1 AND verification_status = 'VERIFIED' required
    // Handle both boolean and number (0/1) from MySQL
    const verifiedValue: any = ngoDetails.verified;
    const isVerified = verifiedValue === true || verifiedValue === 1 || (verifiedValue !== null && verifiedValue !== false && verifiedValue !== 0);
    const isStatusVerified = ngoDetails.verification_status === 'VERIFIED';

    if (!isVerified || !isStatusVerified) {
      // Block login if verified = 0 OR verification_status is not VERIFIED
      if (ngoDetails.verification_status === 'PENDING') {
        return res.status(403).json({
          success: false,
          message: 'Your NGO profile is under verification. Please wait for admin approval.',
          verification_status: 'PENDING',
        });
      }

      if (ngoDetails.verification_status === 'REJECTED') {
        return res.status(403).json({
          success: false,
          message: ngoDetails.rejection_reason 
            ? `Your NGO registration was rejected. Reason: ${ngoDetails.rejection_reason}`
            : 'Your NGO registration was rejected. Please contact support for more information.',
          verification_status: 'REJECTED',
          rejection_reason: ngoDetails.rejection_reason,
        });
      }

      // Generic message for any other non-verified status
      return res.status(403).json({
        success: false,
        message: 'Your NGO profile is under verification. Please wait for admin approval.',
        verification_status: ngoDetails.verification_status || 'PENDING',
      });
    }

    console.log(`[NGO Login] ✅ NGO verified - verified=${isVerified}, status=${ngoDetails.verification_status} - Login allowed`);
  }

  // Ensure role is uppercase before creating token
  const normalizedRole = (user.role || '').toUpperCase() as 'DONOR' | 'NGO' | 'ADMIN';
  console.log(`[Login] Creating token - User ID: ${user.id}, Role: "${user.role}" -> Normalized: "${normalizedRole}"`);
  
  const token = signToken({ userId: user.id.toString(), role: normalizedRole, email: user.email });
  
  console.log(`[Login] ✅ Token created successfully for ${normalizedRole} user`);
  
  return sendSuccess(
    res,
    {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: normalizedRole, // Return normalized role
      },
    },
    'Logged in'
  );
};


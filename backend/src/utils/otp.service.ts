import { query, queryOne, insert, update } from '../config/mysql';
import { sendOTPEmail as sendEmail } from './email.service';

/**
 * Generate a 6-digit OTP
 */
export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Store OTP in database
 */
export async function storeOTP(email: string, otp: string, purpose: 'REGISTRATION' | 'PASSWORD_RESET' | 'EMAIL_CHANGE' = 'REGISTRATION'): Promise<void> {
  // OTP expires in 10 minutes
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + 10);

  // Delete any existing OTPs for this email and purpose
  await query('DELETE FROM otp_verifications WHERE email = ? AND purpose = ?', [email.toLowerCase(), purpose]);

  // Insert new OTP
  await insert(
    'INSERT INTO otp_verifications (email, otp_code, purpose, expires_at) VALUES (?, ?, ?, ?)',
    [email.toLowerCase(), otp, purpose, expiresAt]
  );
}

/**
 * Verify OTP
 */
export async function verifyOTP(email: string, otp: string, purpose: 'REGISTRATION' | 'PASSWORD_RESET' | 'EMAIL_CHANGE' = 'REGISTRATION'): Promise<boolean> {
  const result = await queryOne<{ id: number; verified: boolean; expires_at: Date }>(
    'SELECT id, verified, expires_at FROM otp_verifications WHERE email = ? AND otp_code = ? AND purpose = ? ORDER BY created_at DESC LIMIT 1',
    [email.toLowerCase(), otp, purpose]
  );

  if (!result) {
    return false;
  }

  // Check if already verified
  if (result.verified) {
    return false;
  }

  // Check if expired
  const expiresAt = new Date(result.expires_at);
  if (expiresAt < new Date()) {
    return false;
  }

  // Mark as verified
  await update('UPDATE otp_verifications SET verified = TRUE WHERE id = ?', [result.id]);

  return true;
}

/**
 * Send OTP via email using nodemailer
 * Throws error if email sending fails
 */
export async function sendOTPEmail(
  email: string, 
  otp: string, 
  purpose: 'REGISTRATION' | 'PASSWORD_RESET' | 'EMAIL_CHANGE' = 'REGISTRATION'
): Promise<void> {
  try {
    // Use the email service to send OTP
    await sendEmail(email, otp, purpose);
    
    // Log success (without exposing OTP in production)
    console.log(`✅ OTP email sent successfully to ${email} for ${purpose}`);
    
  } catch (error: any) {
    // Log error details for debugging
    console.error(`❌ Failed to send OTP email to ${email}:`, error.message);
    
    // Re-throw to let caller handle the error
    throw new Error(`Failed to send OTP email: ${error.message}`);
  }
}


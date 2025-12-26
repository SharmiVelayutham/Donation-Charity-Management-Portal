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
export async function storeOTP(email: string, otp: string, purpose: 'REGISTRATION' | 'PASSWORD_RESET' | 'EMAIL_CHANGE' | 'ADMIN_REGISTRATION' = 'REGISTRATION'): Promise<void> {
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
export async function verifyOTP(email: string, otp: string, purpose: 'REGISTRATION' | 'PASSWORD_RESET' | 'EMAIL_CHANGE' | 'ADMIN_REGISTRATION' = 'REGISTRATION'): Promise<boolean> {
  const normalizedEmail = email.toLowerCase();
  const normalizedOTP = otp.trim();
  
  // Debug logging (remove in production)
  console.log(`[OTP Verification] Email: ${normalizedEmail}, OTP: ${normalizedOTP}, Purpose: ${purpose}`);
  
  const result = await queryOne<{ id: number; verified: boolean; expires_at: Date }>(
    'SELECT id, verified, expires_at FROM otp_verifications WHERE email = ? AND otp_code = ? AND purpose = ? ORDER BY created_at DESC LIMIT 1',
    [normalizedEmail, normalizedOTP, purpose]
  );

  if (!result) {
    // Check if OTP exists with different purpose or email (for debugging)
    const anyOTP = await queryOne<{ email: string; purpose: string; expires_at: Date }>(
      'SELECT email, purpose, expires_at FROM otp_verifications WHERE email = ? AND otp_code = ? ORDER BY created_at DESC LIMIT 1',
      [normalizedEmail, normalizedOTP]
    );
    
    if (anyOTP) {
      console.log(`[OTP Verification] OTP found but purpose mismatch. Expected: ${purpose}, Found: ${anyOTP.purpose}`);
      console.log(`[OTP Verification] ERROR: Database ENUM does not include '${purpose}'. Please run the SQL fix: ALTER TABLE otp_verifications MODIFY COLUMN purpose ENUM('REGISTRATION', 'PASSWORD_RESET', 'EMAIL_CHANGE', 'ADMIN_REGISTRATION') DEFAULT 'REGISTRATION';`);
    } else {
      console.log(`[OTP Verification] No OTP found for email: ${normalizedEmail}, OTP: ${normalizedOTP}`);
    }
    return false;
  }

  // Check if already verified
  if (result.verified) {
    console.log(`[OTP Verification] OTP already verified for email: ${normalizedEmail}`);
    return false;
  }

  // Check if expired
  const expiresAt = new Date(result.expires_at);
  const now = new Date();
  if (expiresAt < now) {
    console.log(`[OTP Verification] OTP expired. Expires: ${expiresAt.toISOString()}, Now: ${now.toISOString()}`);
    return false;
  }

  // Mark as verified
  await update('UPDATE otp_verifications SET verified = TRUE WHERE id = ?', [result.id]);
  console.log(`[OTP Verification] OTP verified successfully for email: ${normalizedEmail}`);

  return true;
}

/**
 * Send OTP via email using nodemailer
 * Throws error if email sending fails
 */
export async function sendOTPEmail(
  email: string, 
  otp: string, 
  purpose: 'REGISTRATION' | 'PASSWORD_RESET' | 'EMAIL_CHANGE' | 'ADMIN_REGISTRATION' = 'REGISTRATION'
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


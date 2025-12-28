import { query, queryOne, insert, update } from '../config/mysql';
import { sendOTPEmail as sendEmail } from './email.service';
export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}
export async function storeOTP(email: string, otp: string, purpose: 'REGISTRATION' | 'PASSWORD_RESET' | 'EMAIL_CHANGE' | 'ADMIN_REGISTRATION' = 'REGISTRATION'): Promise<void> {
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + 10);
  await query('DELETE FROM otp_verifications WHERE email = ? AND purpose = ?', [email.toLowerCase(), purpose]);
  await insert(
    'INSERT INTO otp_verifications (email, otp_code, purpose, expires_at) VALUES (?, ?, ?, ?)',
    [email.toLowerCase(), otp, purpose, expiresAt]
  );
}
export async function verifyOTP(email: string, otp: string, purpose: 'REGISTRATION' | 'PASSWORD_RESET' | 'EMAIL_CHANGE' | 'ADMIN_REGISTRATION' = 'REGISTRATION'): Promise<boolean> {
  const normalizedEmail = email.toLowerCase();
  const normalizedOTP = otp.trim();
  console.log(`[OTP Verification] Email: ${normalizedEmail}, OTP: ${normalizedOTP}, Purpose: ${purpose}`);
  
  const result = await queryOne<{ id: number; verified: boolean; expires_at: Date }>(
    'SELECT id, verified, expires_at FROM otp_verifications WHERE email = ? AND otp_code = ? AND purpose = ? ORDER BY created_at DESC LIMIT 1',
    [normalizedEmail, normalizedOTP, purpose]
  );

  if (!result) {
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
  if (result.verified) {
    console.log(`[OTP Verification] OTP already verified for email: ${normalizedEmail}`);
    return false;
  }
  const expiresAt = new Date(result.expires_at);
  const now = new Date();
  if (expiresAt < now) {
    console.log(`[OTP Verification] OTP expired. Expires: ${expiresAt.toISOString()}, Now: ${now.toISOString()}`);
    return false;
  }
  await update('UPDATE otp_verifications SET verified = TRUE WHERE id = ?', [result.id]);
  console.log(`[OTP Verification] OTP verified successfully for email: ${normalizedEmail}`);

  return true;
}
export async function sendOTPEmail(
  email: string, 
  otp: string, 
  purpose: 'REGISTRATION' | 'PASSWORD_RESET' | 'EMAIL_CHANGE' | 'ADMIN_REGISTRATION' = 'REGISTRATION'
): Promise<void> {
  try {
    await sendEmail(email, otp, purpose);
    console.log(`✅ OTP email sent successfully to ${email} for ${purpose}`);
    
  } catch (error: any) {
    console.error(`❌ Failed to send OTP email to ${email}:`, error.message);
    throw new Error(`Failed to send OTP email: ${error.message}`);
  }
}


"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateOTP = generateOTP;
exports.storeOTP = storeOTP;
exports.verifyOTP = verifyOTP;
exports.sendOTPEmail = sendOTPEmail;
const mysql_1 = require("../config/mysql");
/**
 * Generate a 6-digit OTP
 */
function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}
/**
 * Store OTP in database
 */
async function storeOTP(email, otp, purpose = 'REGISTRATION') {
    // OTP expires in 10 minutes
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10);
    // Delete any existing OTPs for this email and purpose
    await (0, mysql_1.query)('DELETE FROM otp_verifications WHERE email = ? AND purpose = ?', [email.toLowerCase(), purpose]);
    // Insert new OTP
    await (0, mysql_1.insert)('INSERT INTO otp_verifications (email, otp_code, purpose, expires_at) VALUES (?, ?, ?, ?)', [email.toLowerCase(), otp, purpose, expiresAt]);
}
/**
 * Verify OTP
 */
async function verifyOTP(email, otp, purpose = 'REGISTRATION') {
    const result = await (0, mysql_1.queryOne)('SELECT id, verified, expires_at FROM otp_verifications WHERE email = ? AND otp_code = ? AND purpose = ? ORDER BY created_at DESC LIMIT 1', [email.toLowerCase(), otp, purpose]);
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
    await (0, mysql_1.update)('UPDATE otp_verifications SET verified = TRUE WHERE id = ?', [result.id]);
    return true;
}
/**
 * Send OTP via email (placeholder - integrate with email service)
 * For now, logs to console. Replace with actual email service (nodemailer, sendgrid, etc.)
 */
async function sendOTPEmail(email, otp, purpose) {
    // TODO: Integrate with email service (nodemailer, sendgrid, AWS SES, etc.)
    // For now, log to console for testing
    console.log('='.repeat(50));
    console.log(`OTP Email for ${purpose}`);
    console.log(`To: ${email}`);
    console.log(`OTP Code: ${otp}`);
    console.log(`This OTP expires in 10 minutes`);
    console.log('='.repeat(50));
    // Example with nodemailer (uncomment and configure):
    /*
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  
    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'noreply@donationportal.com',
      to: email,
      subject: `Your ${purpose} OTP Code`,
      html: `
        <h2>Your OTP Code</h2>
        <p>Your OTP code for ${purpose} is: <strong>${otp}</strong></p>
        <p>This code will expire in 10 minutes.</p>
        <p>If you didn't request this, please ignore this email.</p>
      `,
    });
    */
}

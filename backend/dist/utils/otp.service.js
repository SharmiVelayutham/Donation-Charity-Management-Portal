"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateOTP = generateOTP;
exports.storeOTP = storeOTP;
exports.verifyOTP = verifyOTP;
exports.sendOTPEmail = sendOTPEmail;
const mysql_1 = require("../config/mysql");
const email_service_1 = require("./email.service");
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
 * Send OTP via email using nodemailer
 * Throws error if email sending fails
 */
async function sendOTPEmail(email, otp, purpose = 'REGISTRATION') {
    try {
        // Use the email service to send OTP
        await (0, email_service_1.sendOTPEmail)(email, otp, purpose);
        // Log success (without exposing OTP in production)
        console.log(`✅ OTP email sent successfully to ${email} for ${purpose}`);
    }
    catch (error) {
        // Log error details for debugging
        console.error(`❌ Failed to send OTP email to ${email}:`, error.message);
        // Re-throw to let caller handle the error
        throw new Error(`Failed to send OTP email: ${error.message}`);
    }
}

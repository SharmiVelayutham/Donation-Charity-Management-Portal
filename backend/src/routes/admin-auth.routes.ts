import { Router } from 'express';
import { adminLogin, adminRegister, adminVerifyOTPAndRegister } from '../controllers/admin-auth.controller';

const router = Router();

/**
 * Admin-only authentication routes
 * These endpoints are separate from regular auth
 * Admin registration requires:
 * 1. Valid security code (ADMIN_SECURITY_CODE from env)
 * 2. Email OTP verification
 * No need for existing admin authentication - security code is sufficient
 */

// Admin registration - Step 1: Validate security code and send OTP
router.post('/register', adminRegister);

// Admin registration - Step 2: Verify OTP and create admin account
router.post('/verify-otp', adminVerifyOTPAndRegister);

// Admin login (public endpoint but only admins can successfully login)
router.post('/login', adminLogin);

export default router;

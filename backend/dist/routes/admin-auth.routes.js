"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const admin_auth_controller_1 = require("../controllers/admin-auth.controller");
const router = (0, express_1.Router)();
/**
 * Admin-only authentication routes
 * These endpoints are separate from regular auth
 * Admin registration requires:
 * 1. Valid security code (ADMIN_SECURITY_CODE from env)
 * 2. Email OTP verification
 * No need for existing admin authentication - security code is sufficient
 */
// Admin registration - Step 1: Validate security code and send OTP
router.post('/register', admin_auth_controller_1.adminRegister);
// Admin registration - Step 2: Verify OTP and create admin account
router.post('/verify-otp', admin_auth_controller_1.adminVerifyOTPAndRegister);
// Admin login (public endpoint but only admins can successfully login)
router.post('/login', admin_auth_controller_1.adminLogin);
exports.default = router;

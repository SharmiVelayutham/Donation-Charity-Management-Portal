"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminLogin = exports.adminVerifyOTPAndRegister = exports.adminRegister = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jwt_1 = require("../utils/jwt");
const response_1 = require("../utils/response");
const mysql_auth_helper_1 = require("../utils/mysql-auth-helper");
const mysql_1 = require("../config/mysql");
const otp_service_1 = require("../utils/otp.service");
const env_1 = require("../config/env");
const SALT_ROUNDS = 10;
const adminRegister = async (req, res) => {
    const { name, email, password, contactInfo, securityCode } = req.body;
    if (!name || !email || !password || !contactInfo || !securityCode) {
        return res.status(400).json({
            success: false,
            message: 'Missing required fields: name, email, password, contactInfo, and securityCode are required'
        });
    }
    if (!env_1.env.adminSecurityCode || env_1.env.adminSecurityCode.trim() === '') {
        return res.status(500).json({
            success: false,
            message: 'Admin security code is not configured. Please set ADMIN_SECURITY_CODE in your .env file. See .env.example for reference.'
        });
    }
    const trimmedSecurityCode = securityCode.trim();
    const trimmedEnvCode = env_1.env.adminSecurityCode.trim();
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
    const existing = await (0, mysql_auth_helper_1.emailExists)(email);
    if (existing) {
        return res.status(409).json({ success: false, message: 'Email already in use' });
    }
    if (password.length < 6) {
        return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long' });
    }
    try {
        const otp = (0, otp_service_1.generateOTP)();
        await (0, otp_service_1.storeOTP)(email, otp, 'ADMIN_REGISTRATION');
        await (0, otp_service_1.sendOTPEmail)(email, otp, 'ADMIN_REGISTRATION');
        return (0, response_1.sendSuccess)(res, {
            requiresVerification: true,
            email: email.toLowerCase(),
            message: 'Security code validated. OTP sent to your email. Please verify to complete registration.',
        }, 'OTP sent to email. Please verify to complete admin registration.', 200);
    }
    catch (error) {
        console.error('Error sending OTP for admin registration:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to send OTP email. Please check SMTP configuration.',
        });
    }
};
exports.adminRegister = adminRegister;
const adminVerifyOTPAndRegister = async (req, res) => {
    const { name, email, password, contactInfo, securityCode, otp } = req.body;
    if (!name || !email || !password || !contactInfo || !securityCode || !otp) {
        return res.status(400).json({
            success: false,
            message: 'Missing required fields: name, email, password, contactInfo, securityCode, and otp are required'
        });
    }
    const normalizedSecurityCode = securityCode.trim();
    if (!env_1.env.adminSecurityCode || normalizedSecurityCode !== env_1.env.adminSecurityCode.trim()) {
        console.log(`[Admin Registration] Security code mismatch. Expected: ${env_1.env.adminSecurityCode}, Got: ${normalizedSecurityCode}`);
        return res.status(403).json({
            success: false,
            message: 'Invalid security code'
        });
    }
    const normalizedEmailForOTP = email.toLowerCase().trim();
    const normalizedOTP = otp.trim();
    console.log(`[Admin Registration] Verifying OTP for email: ${normalizedEmailForOTP}, OTP: ${normalizedOTP}`);
    const isValidOTP = await (0, otp_service_1.verifyOTP)(normalizedEmailForOTP, normalizedOTP, 'ADMIN_REGISTRATION');
    if (!isValidOTP) {
        const { query } = await Promise.resolve().then(() => __importStar(require('../config/mysql')));
        const existingOTPs = await query('SELECT otp_code, purpose, verified, expires_at, created_at FROM otp_verifications WHERE email = ? ORDER BY created_at DESC LIMIT 5', [normalizedEmailForOTP]);
        console.log(`[Admin Registration] Existing OTPs for ${normalizedEmailForOTP}:`, existingOTPs);
        return res.status(400).json({
            success: false,
            message: 'Invalid or expired OTP. Please check the OTP code and ensure it hasn\'t expired (10 minutes). Request a new OTP if needed.'
        });
    }
    const existing = await (0, mysql_auth_helper_1.emailExists)(normalizedEmailForOTP);
    if (existing) {
        return res.status(409).json({ success: false, message: 'Email already in use' });
    }
    const hashed = await bcryptjs_1.default.hash(password, SALT_ROUNDS);
    const adminId = await (0, mysql_1.insert)('INSERT INTO admins (name, email, password, contact_info, role) VALUES (?, ?, ?, ?, ?)', [name, normalizedEmailForOTP, hashed, contactInfo, 'ADMIN']);
    const admin = await (0, mysql_1.queryOne)('SELECT id, name, email, role FROM admins WHERE id = ?', [adminId]);
    if (!admin) {
        return res.status(500).json({ success: false, message: 'Failed to create admin account' });
    }
    const token = (0, jwt_1.signToken)({ userId: adminId.toString(), role: 'ADMIN', email: admin.email });
    return (0, response_1.sendSuccess)(res, {
        token,
        admin: {
            id: admin.id,
            name: admin.name,
            email: admin.email,
            role: 'ADMIN',
        },
    }, 'Admin registered and verified successfully', 201);
};
exports.adminVerifyOTPAndRegister = adminVerifyOTPAndRegister;
const adminLogin = async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ success: false, message: 'Missing credentials' });
    }
    const admin = await (0, mysql_1.queryOne)('SELECT id, name, email, password, role FROM admins WHERE email = ?', [email.toLowerCase()]);
    if (!admin) {
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    const match = await bcryptjs_1.default.compare(password, admin.password);
    if (!match) {
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    const token = (0, jwt_1.signToken)({ userId: admin.id.toString(), role: 'ADMIN', email: admin.email });
    return (0, response_1.sendSuccess)(res, {
        token,
        admin: {
            id: admin.id,
            name: admin.name,
            email: admin.email,
            role: 'ADMIN',
        },
    }, 'Admin logged in successfully');
};
exports.adminLogin = adminLogin;

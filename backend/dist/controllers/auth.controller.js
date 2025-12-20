"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.login = exports.verifyOTPAndRegister = exports.register = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jwt_1 = require("../utils/jwt");
const response_1 = require("../utils/response");
const mysql_auth_helper_1 = require("../utils/mysql-auth-helper");
const mysql_1 = require("../config/mysql");
const otp_service_1 = require("../utils/otp.service");
const SALT_ROUNDS = 10;
const register = async (req, res) => {
    var _a;
    // Be tolerant to different frontend field names (contactInfo vs contact_info, etc.)
    const body = req.body;
    const name = body.name;
    const email = body.email;
    const password = body.password;
    const role = body.role;
    const contactInfo = (_a = body.contactInfo) !== null && _a !== void 0 ? _a : body.contact_info;
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
    const existing = await (0, mysql_auth_helper_1.emailExists)(email);
    if (existing) {
        return res.status(409).json({ success: false, message: 'Email already in use' });
    }
    try {
        // Generate OTP
        const otp = (0, otp_service_1.generateOTP)();
        // Store OTP in database first (before sending email)
        // This way, if email fails, we can still track the attempt
        await (0, otp_service_1.storeOTP)(email, otp, 'REGISTRATION');
        // Send OTP email - this will throw if email sending fails
        try {
            await (0, otp_service_1.sendOTPEmail)(email, otp, 'REGISTRATION');
        }
        catch (emailError) {
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
        return (0, response_1.sendSuccess)(res, {
            message: 'OTP sent to your email. Please check your inbox and verify to complete registration.',
            email: email,
            requiresVerification: true
        }, 'OTP sent successfully', 200);
    }
    catch (error) {
        console.error('Registration error:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to process registration. Please try again.',
        });
    }
};
exports.register = register;
/**
 * Verify OTP and complete registration
 * POST /api/auth/verify-otp
 */
const verifyOTPAndRegister = async (req, res) => {
    const body = req.body;
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
    const isValidOTP = await (0, otp_service_1.verifyOTP)(email, otp, 'REGISTRATION');
    if (!isValidOTP) {
        return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
    }
    // Check if email still exists (race condition check)
    const existing = await (0, mysql_auth_helper_1.emailExists)(email);
    if (existing) {
        return res.status(409).json({ success: false, message: 'Email already in use' });
    }
    try {
        const hashed = await bcryptjs_1.default.hash(password, SALT_ROUNDS);
        const normalizedEmail = email.toLowerCase();
        const contact = contactInfo !== null && contactInfo !== void 0 ? contactInfo : contact_info;
        let userId;
        let userRole;
        // Create user in appropriate table based on role
        if (normalizedRole === 'DONOR') {
            console.log('Creating DONOR user:', { name, email: normalizedEmail });
            userId = await (0, mysql_1.insert)('INSERT INTO donors (name, email, password, contact_info, role) VALUES (?, ?, ?, ?, ?)', [name, normalizedEmail, hashed, contact, 'DONOR']);
            console.log('DONOR created with ID:', userId);
            userRole = 'DONOR';
        }
        else {
            // NGO - stored in users table
            console.log('Creating NGO user:', { name, email: normalizedEmail });
            userId = await (0, mysql_1.insert)('INSERT INTO users (name, email, password, contact_info, role) VALUES (?, ?, ?, ?, ?)', [name, normalizedEmail, hashed, contact, 'NGO']);
            console.log('NGO created with ID:', userId);
            userRole = 'NGO';
        }
        // Fetch created user to return complete data
        let userData;
        if (normalizedRole === 'DONOR') {
            userData = await (0, mysql_1.queryOne)('SELECT id, name, email, role FROM donors WHERE id = ?', [userId]);
        }
        else {
            userData = await (0, mysql_1.queryOne)('SELECT id, name, email, role FROM users WHERE id = ?', [userId]);
        }
        if (!userData) {
            console.error('Failed to fetch created user data');
            return res.status(500).json({ success: false, message: 'Failed to create user' });
        }
        const token = (0, jwt_1.signToken)({ userId: userId.toString(), role: userRole, email: normalizedEmail });
        const responseData = {
            token,
            user: {
                id: userData.id,
                name: userData.name,
                email: userData.email,
                role: userData.role || userRole,
            },
        };
        console.log('Registration successful:', responseData);
        return (0, response_1.sendSuccess)(res, responseData, 'Registration completed successfully', 201);
    }
    catch (error) {
        console.error('Registration error:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to register user. Please try again.',
        });
    }
};
exports.verifyOTPAndRegister = verifyOTPAndRegister;
const login = async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ success: false, message: 'Missing credentials' });
    }
    // Check if user is an admin - admins must use /api/admin/auth/login
    const admin = await (0, mysql_1.queryOne)('SELECT id FROM admins WHERE email = ?', [email.toLowerCase()]);
    if (admin) {
        return res.status(403).json({
            success: false,
            message: 'Admin login is not allowed through this endpoint. Please use /api/admin/auth/login',
        });
    }
    // Find user across Donor and NGO tables only
    const user = await (0, mysql_auth_helper_1.findUserWithPasswordByEmail)(email);
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
    const match = await bcryptjs_1.default.compare(password, user.password);
    if (!match) {
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    const token = (0, jwt_1.signToken)({ userId: user.id.toString(), role: user.role, email: user.email });
    return (0, response_1.sendSuccess)(res, {
        token,
        user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role, // This will be 'DONOR' or 'NGO'
        },
    }, 'Logged in');
};
exports.login = login;

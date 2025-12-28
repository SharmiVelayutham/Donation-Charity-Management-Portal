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
exports.login = exports.verifyOTPAndRegister = exports.register = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jwt_1 = require("../utils/jwt");
const response_1 = require("../utils/response");
const mysql_auth_helper_1 = require("../utils/mysql-auth-helper");
const mysql_1 = require("../config/mysql");
const otp_service_1 = require("../utils/otp.service");
const ngo_id_generator_1 = require("../utils/ngo-id-generator");
const notification_service_1 = require("../services/notification.service");
const SALT_ROUNDS = 10;
const register = async (req, res) => {
    var _a;
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
    if (!['DONOR', 'NGO'].includes(normalizedRole)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid role. Admin registration is not allowed through this endpoint. Use /api/admin/auth/register',
        });
    }
    const existing = await (0, mysql_auth_helper_1.emailExists)(email);
    if (existing) {
        return res.status(409).json({ success: false, message: 'Email already in use' });
    }
    try {
        const otp = (0, otp_service_1.generateOTP)();
        await (0, otp_service_1.storeOTP)(email, otp, 'REGISTRATION');
        try {
            await (0, otp_service_1.sendOTPEmail)(email, otp, 'REGISTRATION');
        }
        catch (emailError) {
            console.error('Email sending failed:', emailError.message);
            return res.status(500).json({
                success: false,
                message: `Failed to send OTP email: ${emailError.message}. Please check your email address and try again.`,
                emailError: true,
            });
        }
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
    const isValidOTP = await (0, otp_service_1.verifyOTP)(email, otp, 'REGISTRATION');
    if (!isValidOTP) {
        return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
    }
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
        if (normalizedRole === 'DONOR') {
            console.log('Creating DONOR user:', { name, email: normalizedEmail });
            userId = await (0, mysql_1.insert)('INSERT INTO donors (name, email, password, contact_info, role) VALUES (?, ?, ?, ?, ?)', [name, normalizedEmail, hashed, contact, 'DONOR']);
            console.log('DONOR created with ID:', userId);
            userRole = 'DONOR';
            try {
                await Promise.all([
                    (0, notification_service_1.notifyNgoOnDonorRegistration)(userId, name, normalizedEmail),
                    (0, notification_service_1.notifyAdminOnDonorRegistration)(userId, name, normalizedEmail)
                ]);
            }
            catch (notifError) {
                console.error('[Registration] Error sending notifications:', notifError);
            }
        }
        else {
            console.log('Creating NGO user:', { name, email: normalizedEmail });
            const { registrationNumber, address, city, state, pincode, contactPersonName, phoneNumber, aboutNgo, websiteUrl, } = body;
            if (!registrationNumber || !address) {
                return res.status(400).json({
                    success: false,
                    message: 'Missing required NGO fields: registrationNumber and address are required',
                });
            }
            console.log('[NGO Registration] Generating NGO ID...');
            const ngoId = await (0, ngo_id_generator_1.generateNgoId)();
            console.log('[NGO Registration] Generated NGO ID:', ngoId);
            userId = await (0, mysql_1.insert)(`INSERT INTO users (
          ngo_id, name, email, password, contact_info, role,
          registration_number, address, city, state, pincode,
          contact_person_name, phone_number, about_ngo, website_url,
          verification_status, verified, address_locked
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
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
            ]);
            console.log('NGO created with ID:', userId, 'NGO ID:', ngoId, 'Status: PENDING, Verified: 0');
            userRole = 'NGO';
            try {
                await (0, notification_service_1.notifyAdminOnNgoRegistration)(userId, name, normalizedEmail);
            }
            catch (notifError) {
                console.error('[Registration] Error sending notifications:', notifError);
            }
        }
        let userData;
        if (normalizedRole === 'DONOR') {
            userData = await (0, mysql_1.queryOne)('SELECT id, name, email, role FROM donors WHERE id = ?', [userId]);
        }
        else {
            userData = await (0, mysql_1.queryOne)('SELECT id, ngo_id, name, email, role, verification_status, verified FROM users WHERE id = ?', [userId]);
        }
        if (!userData) {
            console.error('Failed to fetch created user data');
            return res.status(500).json({ success: false, message: 'Failed to create user' });
        }
        if (normalizedRole === 'NGO') {
            const verificationStatus = userData.verification_status || 'PENDING';
            const verifiedValue = userData.verified;
            const isVerified = verifiedValue === true || verifiedValue === 1 || (verifiedValue !== null && verifiedValue !== false && verifiedValue !== 0);
            console.log(`[NGO Registration] User ID: ${userData.id}, NGO ID: ${userData.ngo_id}`);
            console.log(`[NGO Registration] Verification Status: "${verificationStatus}", Verified Value: ${verifiedValue}, Is Verified: ${isVerified}`);
            if (!isVerified || verificationStatus !== 'VERIFIED') {
                console.log(`[NGO Registration] ❌ BLOCKING - verified=${isVerified} (value: ${verifiedValue}), status="${verificationStatus}" - NO TOKEN`);
                console.log(`[NGO Registration] ❌ BLOCKING LOGIN - verified=${isVerified}, status="${verificationStatus}". No token will be issued.`);
                try {
                    const { sendNgoProfileUnderVerificationEmail } = await Promise.resolve().then(() => __importStar(require('../utils/email.service')));
                    await sendNgoProfileUnderVerificationEmail(normalizedEmail, name);
                    console.log(`✅ Profile under verification email sent to ${normalizedEmail}`);
                }
                catch (emailError) {
                    console.error('Failed to send verification email:', emailError);
                }
                return (0, response_1.sendSuccess)(res, {
                    user: {
                        id: userData.id,
                        ngo_id: userData.ngo_id,
                        name: userData.name,
                        email: userData.email,
                        role: userData.role || userRole,
                        verification_status: verificationStatus,
                    },
                    message: 'Your NGO profile is under admin verification. You will receive an email once verified.',
                }, 'NGO registration completed. Awaiting admin verification.', 201);
            }
            else {
                console.log(`[NGO Registration] ✅ NGO is VERIFIED - Token will be issued.`);
            }
        }
        console.log(`[Registration] Issuing token for ${normalizedRole} - User ID: ${userData.id}`);
        const token = (0, jwt_1.signToken)({ userId: userId.toString(), role: userRole, email: normalizedEmail });
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
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Missing credentials' });
        }
        const admin = await (0, mysql_1.queryOne)('SELECT id FROM admins WHERE email = ?', [email.toLowerCase()]);
        if (admin) {
            return res.status(403).json({
                success: false,
                message: 'Admin login is not allowed through this endpoint. Please use /api/admin/auth/login',
            });
        }
        const user = await (0, mysql_auth_helper_1.findUserWithPasswordByEmail)(email);
        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }
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
        if (user.role === 'NGO') {
            const ngoDetails = await (0, mysql_1.queryOne)('SELECT verified, verification_status, rejection_reason FROM users WHERE id = ?', [user.id]);
            if (!ngoDetails) {
                return res.status(500).json({ success: false, message: 'Failed to fetch NGO details' });
            }
            const verifiedValue = ngoDetails.verified;
            const isVerified = verifiedValue === true || verifiedValue === 1 || (verifiedValue !== null && verifiedValue !== false && verifiedValue !== 0);
            const isStatusVerified = ngoDetails.verification_status === 'VERIFIED';
            if (!isVerified || !isStatusVerified) {
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
                return res.status(403).json({
                    success: false,
                    message: 'Your NGO profile is under verification. Please wait for admin approval.',
                    verification_status: ngoDetails.verification_status || 'PENDING',
                });
            }
            console.log(`[NGO Login] ✅ NGO verified - verified=${isVerified}, status=${ngoDetails.verification_status} - Login allowed`);
        }
        const normalizedRole = (user.role || '').toUpperCase();
        console.log(`[Login] Creating token - User ID: ${user.id}, Role: "${user.role}" -> Normalized: "${normalizedRole}"`);
        const token = (0, jwt_1.signToken)({ userId: user.id.toString(), role: normalizedRole, email: user.email });
        console.log(`[Login] ✅ Token created successfully for ${normalizedRole} user`);
        return (0, response_1.sendSuccess)(res, {
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: normalizedRole, // Return normalized role
            },
        }, 'Logged in');
    }
    catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to process login. Please try again.',
        });
    }
};
exports.login = login;

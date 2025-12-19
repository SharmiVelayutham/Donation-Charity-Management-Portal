"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminLogin = exports.adminRegister = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const Admin_model_1 = require("../models/Admin.model");
const jwt_1 = require("../utils/jwt");
const response_1 = require("../utils/response");
const auth_helper_1 = require("../utils/auth-helper");
const SALT_ROUNDS = 10;
/**
 * Admin-only registration endpoint
 * Only existing admins or system can create new admins
 * This endpoint should be protected or require special access
 */
const adminRegister = async (req, res) => {
    const { name, email, password, contactInfo } = req.body;
    if (!name || !email || !password || !contactInfo) {
        return res.status(400).json({ success: false, message: 'Missing required fields' });
    }
    // Check if email exists in any collection
    const existing = await (0, auth_helper_1.emailExists)(email);
    if (existing) {
        return res.status(409).json({ success: false, message: 'Email already in use' });
    }
    const hashed = await bcryptjs_1.default.hash(password, SALT_ROUNDS);
    const admin = await Admin_model_1.AdminModel.create({
        name,
        email,
        password: hashed,
        contactInfo,
        role: 'ADMIN',
    });
    const token = (0, jwt_1.signToken)({ userId: admin.id, role: 'ADMIN', email: admin.email });
    return (0, response_1.sendSuccess)(res, {
        token,
        admin: {
            id: admin.id,
            name: admin.name,
            email: admin.email,
            role: 'ADMIN',
        },
    }, 'Admin registered successfully', 201);
};
exports.adminRegister = adminRegister;
/**
 * Admin-only login endpoint
 * Only admins can access this endpoint
 */
const adminLogin = async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ success: false, message: 'Missing credentials' });
    }
    // Only check admin collection
    const admin = await Admin_model_1.AdminModel.findOne({ email: email.toLowerCase() });
    if (!admin) {
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    const match = await bcryptjs_1.default.compare(password, admin.password);
    if (!match) {
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    const token = (0, jwt_1.signToken)({ userId: admin.id, role: 'ADMIN', email: admin.email });
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

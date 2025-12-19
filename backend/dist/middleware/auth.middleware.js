"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = void 0;
const jwt_1 = require("../utils/jwt");
const mysql_auth_helper_1 = require("../utils/mysql-auth-helper");
/**
 * Authentication middleware
 * Checks Donor, Admin, and User (NGO) tables in MySQL
 */
const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }
        const token = authHeader.split(' ')[1];
        const payload = (0, jwt_1.verifyToken)(token);
        // Find user across all tables (Donor, Admin, User/NGO)
        const user = await (0, mysql_auth_helper_1.findUserById)(payload.userId);
        if (!user) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }
        // Check if user is blocked
        if (user.isBlocked) {
            return res.status(403).json({ success: false, message: 'Your account has been blocked. Please contact support.' });
        }
        req.user = { id: user.id.toString(), role: user.role, email: user.email };
        next();
    }
    catch (error) {
        return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }
};
exports.authenticate = authenticate;

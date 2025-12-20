"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const admin_auth_controller_1 = require("../controllers/admin-auth.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const role_middleware_1 = require("../middleware/role.middleware");
const mysql_1 = require("../config/mysql");
const router = (0, express_1.Router)();
/**
 * Admin-only authentication routes
 * These endpoints are separate from regular auth
 * Admin registration: First admin can be created without authentication
 * Subsequent admins require existing admin authentication
 */
// Middleware to check if first admin registration
const checkFirstAdmin = async (req, res, next) => {
    try {
        const existingAdmin = await (0, mysql_1.queryOne)('SELECT id FROM admins LIMIT 1');
        if (existingAdmin) {
            // Admin exists, require authentication
            return (0, auth_middleware_1.authenticate)(req, res, () => {
                (0, role_middleware_1.requireRole)(['ADMIN'])(req, res, next);
            });
        }
        else {
            // No admin exists, allow registration
            next();
        }
    }
    catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to check admin status' });
    }
};
// Admin registration
router.post('/register', checkFirstAdmin, admin_auth_controller_1.adminRegister);
// Admin login (public endpoint but only admins can successfully login)
router.post('/login', admin_auth_controller_1.adminLogin);
exports.default = router;

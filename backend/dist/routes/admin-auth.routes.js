"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const admin_auth_controller_1 = require("../controllers/admin-auth.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const role_middleware_1 = require("../middleware/role.middleware");
const router = (0, express_1.Router)();
/**
 * Admin-only authentication routes
 * These endpoints are separate from regular auth
 * Admin registration should be protected (only existing admins can create new admins)
 * For initial admin creation, you may want to add additional security
 */
// Admin registration (should be protected - only existing admins can register new admins)
// For production, consider adding additional security like admin invite codes
router.post('/register', auth_middleware_1.authenticate, (0, role_middleware_1.requireRole)(['ADMIN']), admin_auth_controller_1.adminRegister);
// Admin login (public endpoint but only admins can successfully login)
router.post('/login', admin_auth_controller_1.adminLogin);
exports.default = router;

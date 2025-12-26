"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const user_controller_1 = require("../controllers/user.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
/**
 * User Routes
 * All routes require authentication
 */
// Get user profile (works for both DONOR and NGO)
router.get('/profile', auth_middleware_1.authenticate, user_controller_1.getUserProfile);
exports.default = router;

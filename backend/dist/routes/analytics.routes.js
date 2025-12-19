"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const analytics_controller_1 = require("../controllers/analytics.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const role_middleware_1 = require("../middleware/role.middleware");
const router = (0, express_1.Router)();
// Public platform stats
router.get('/platform', analytics_controller_1.getPlatformStats);
// Authenticated user stats
router.get('/donor', auth_middleware_1.authenticate, (0, role_middleware_1.requireRole)(['DONOR']), analytics_controller_1.getDonorStats);
router.get('/ngo', auth_middleware_1.authenticate, (0, role_middleware_1.requireRole)(['NGO']), analytics_controller_1.getNgoStats);
exports.default = router;

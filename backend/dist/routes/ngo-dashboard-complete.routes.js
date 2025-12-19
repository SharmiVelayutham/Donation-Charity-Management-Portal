"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const ngo_dashboard_complete_controller_1 = require("../controllers/ngo-dashboard-complete.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const role_middleware_1 = require("../middleware/role.middleware");
const router = (0, express_1.Router)();
// All routes require NGO authentication
router.use(auth_middleware_1.authenticate);
router.use((0, role_middleware_1.requireRole)(['NGO']));
/**
 * NGO Dashboard Routes (Complete)
 * All routes are prefixed with /api/ngo/dashboard
 */
// Dashboard overview
router.get('/', ngo_dashboard_complete_controller_1.getNgoDashboard);
// Profile management
router.get('/profile', ngo_dashboard_complete_controller_1.getNgoProfile);
router.put('/profile', ngo_dashboard_complete_controller_1.updateNgoProfile);
// Donations list
router.get('/donations', ngo_dashboard_complete_controller_1.getNgoDashboardDonations);
exports.default = router;

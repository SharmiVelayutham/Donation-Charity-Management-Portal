"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const ngo_dashboard_complete_controller_1 = require("../controllers/ngo-dashboard-complete.controller");
const ngo_donations_controller_1 = require("../controllers/ngo-donations.controller");
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
// Update contribution status (MUST be before /donations routes to avoid conflicts)
router.put('/donations/:contributionId/status', ngo_donations_controller_1.updateContributionStatus);
// Donation details and summary (new endpoints - must be before /donations)
router.get('/donations/details', (req, res, next) => {
    console.log('[Route] GET /api/ngo/dashboard/donations/details');
    next();
}, ngo_donations_controller_1.getNgoDonationDetails);
router.get('/donations/summary', (req, res, next) => {
    console.log('[Route] GET /api/ngo/dashboard/donations/summary');
    next();
}, ngo_donations_controller_1.getNgoDonationSummary);
// Donations list (must be last to avoid conflicts)
router.get('/donations', ngo_dashboard_complete_controller_1.getNgoDashboardDonations);
exports.default = router;

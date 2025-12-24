"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const donor_dashboard_controller_1 = require("../controllers/donor-dashboard.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const role_middleware_1 = require("../middleware/role.middleware");
const router = (0, express_1.Router)();
// All routes require DONOR authentication
router.use(auth_middleware_1.authenticate);
router.use((0, role_middleware_1.requireRole)(['DONOR']));
/**
 * Donor Dashboard Routes
 * All routes are prefixed with /api/donor/dashboard
 */
// Dashboard overview
router.get('/', donor_dashboard_controller_1.getDonorDashboard);
// Profile management
router.get('/profile', donor_dashboard_controller_1.getDonorProfile);
router.put('/profile', donor_dashboard_controller_1.updateDonorProfile);
// Contributions (old system)
router.get('/contributions', donor_dashboard_controller_1.getDonorContributions);
// Donation request contributions (new system)
router.get('/donation-request-contributions', donor_dashboard_controller_1.getDonorDonationRequestContributions);
// Browse available donations
router.get('/available-donations', donor_dashboard_controller_1.getAvailableDonations);
exports.default = router;

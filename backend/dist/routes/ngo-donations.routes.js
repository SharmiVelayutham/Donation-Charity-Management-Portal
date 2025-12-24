"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const ngo_donations_controller_1 = require("../controllers/ngo-donations.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const role_middleware_1 = require("../middleware/role.middleware");
const router = (0, express_1.Router)();
/**
 * NGO Donations Routes
 * Detailed donor information and aggregated statistics
 */
// Get detailed donor contributions
router.get('/donations/details', auth_middleware_1.authenticate, (0, role_middleware_1.requireRole)(['NGO']), ngo_donations_controller_1.getNgoDonationDetails);
// Get aggregated donation summary
router.get('/donations/summary', auth_middleware_1.authenticate, (0, role_middleware_1.requireRole)(['NGO']), ngo_donations_controller_1.getNgoDonationSummary);
exports.default = router;

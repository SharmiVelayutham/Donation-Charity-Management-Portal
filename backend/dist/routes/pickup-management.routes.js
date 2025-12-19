"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const pickup_management_controller_1 = require("../controllers/pickup-management.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const role_middleware_1 = require("../middleware/role.middleware");
const router = (0, express_1.Router)();
/**
 * Pickup Management Routes
 */
// Donor contributes to donation (includes address and contact)
router.post('/donations/:id/contribute', auth_middleware_1.authenticate, (0, role_middleware_1.requireRole)(['DONOR']), pickup_management_controller_1.contributeToDonation);
// NGO pickup management (must be before /:id to avoid route conflicts)
router.get('/ngo/pickups', auth_middleware_1.authenticate, (0, role_middleware_1.requireRole)(['NGO']), pickup_management_controller_1.getNgoPickups);
router.patch('/ngo/pickups/:id/status', auth_middleware_1.authenticate, (0, role_middleware_1.requireRole)(['NGO']), pickup_management_controller_1.updatePickupStatus);
exports.default = router;

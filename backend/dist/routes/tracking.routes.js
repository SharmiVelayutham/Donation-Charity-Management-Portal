"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const tracking_controller_1 = require("../controllers/tracking.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const role_middleware_1 = require("../middleware/role.middleware");
const router = (0, express_1.Router)();
// Public donation tracking
router.get('/donation/:id', tracking_controller_1.trackDonation);
// Donor tracking
router.get('/my-contributions', auth_middleware_1.authenticate, (0, role_middleware_1.requireRole)(['DONOR']), tracking_controller_1.trackMyContributions);
router.get('/upcoming-pickups', auth_middleware_1.authenticate, (0, role_middleware_1.requireRole)(['DONOR']), tracking_controller_1.getUpcomingPickups);
// NGO tracking
router.get('/ngo/pickups', auth_middleware_1.authenticate, (0, role_middleware_1.requireRole)(['NGO']), tracking_controller_1.getNgoUpcomingPickups);
exports.default = router;

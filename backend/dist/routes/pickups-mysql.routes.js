"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const pickups_mysql_controller_1 = require("../controllers/pickups-mysql.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const role_middleware_1 = require("../middleware/role.middleware");
const router = (0, express_1.Router)();
/**
 * Pickup Routes (MySQL-based)
 */
// Create pickup (usually done via contributions, but available for manual creation)
router.post('/', auth_middleware_1.authenticate, (0, role_middleware_1.requireRole)(['DONOR']), pickups_mysql_controller_1.createPickup);
// Get pickups for NGO
router.get('/ngo', auth_middleware_1.authenticate, (0, role_middleware_1.requireRole)(['NGO']), pickups_mysql_controller_1.getNgoPickups);
// Get pickups for donor
router.get('/donor', auth_middleware_1.authenticate, (0, role_middleware_1.requireRole)(['DONOR']), pickups_mysql_controller_1.getDonorPickups);
// Update pickup status
router.patch('/:id/status', auth_middleware_1.authenticate, (0, role_middleware_1.requireRole)(['NGO', 'ADMIN']), pickups_mysql_controller_1.updatePickupStatus);
exports.default = router;

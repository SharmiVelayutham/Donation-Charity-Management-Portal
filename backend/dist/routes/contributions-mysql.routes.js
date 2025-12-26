"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.contributionsRouter = void 0;
const express_1 = require("express");
const contributions_mysql_controller_1 = require("../controllers/contributions-mysql.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const role_middleware_1 = require("../middleware/role.middleware");
const router = (0, express_1.Router)();
/**
 * Contributions Routes (MySQL-based)
 * Note: POST /api/donations/:id/contribute is registered via /api route prefix
 * GET /api/contributions/* routes are registered via /api/contributions prefix
 */
// Donor contributes to a donation
router.post('/donations/:id/contribute', auth_middleware_1.authenticate, (0, role_middleware_1.requireRole)(['DONOR']), contributions_mysql_controller_1.contributeToDonation);
exports.default = router;
// Separate router for /api/contributions/* routes
exports.contributionsRouter = (0, express_1.Router)();
exports.contributionsRouter.get('/my', auth_middleware_1.authenticate, (0, role_middleware_1.requireRole)(['DONOR']), contributions_mysql_controller_1.getMyContributions);
exports.contributionsRouter.get('/ngo/:ngoId', auth_middleware_1.authenticate, (0, role_middleware_1.requireRole)(['NGO', 'ADMIN']), contributions_mysql_controller_1.getNgoContributions);

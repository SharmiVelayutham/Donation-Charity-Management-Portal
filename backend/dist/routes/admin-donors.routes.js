"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const admin_donors_controller_1 = require("../controllers/admin-donors.controller");
const admin_analytics_controller_1 = require("../controllers/admin-analytics.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const role_middleware_1 = require("../middleware/role.middleware");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
router.use((0, role_middleware_1.requireRole)(['ADMIN']));
router.get('/analytics', (req, res, next) => {
    console.log('📊 [Admin Analytics] Route hit: /api/admin/analytics');
    (0, admin_analytics_controller_1.getAdminAnalytics)(req, res).catch(next);
});
router.get('/donors', (req, res, next) => {
    console.log('👥 [Admin Donors] Route hit: /api/admin/donors');
    (0, admin_donors_controller_1.getAllDonors)(req, res).catch(next);
});
router.get('/contributions', (req, res, next) => {
    console.log('💰 [Admin Contributions] Route hit: /api/admin/contributions');
    (0, admin_donors_controller_1.getAllContributions)(req, res).catch(next);
});
router.get('/contributions/:donorId', (req, res, next) => {
    console.log(`👤 [Admin Donor Contributions] Route hit: /api/admin/contributions/${req.params.donorId}`);
    (0, admin_donors_controller_1.getDonorContributions)(req, res).catch(next);
});
exports.default = router;

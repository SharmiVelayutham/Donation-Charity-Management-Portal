"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const payment_management_controller_1 = require("../controllers/payment-management.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const role_middleware_1 = require("../middleware/role.middleware");
const router = (0, express_1.Router)();
/**
 * Payment Management Routes
 */
// Donor payment confirmation
router.post('/payments/confirm', auth_middleware_1.authenticate, (0, role_middleware_1.requireRole)(['DONOR']), payment_management_controller_1.confirmPayment);
// NGO payment management
router.get('/ngo/payments', auth_middleware_1.authenticate, (0, role_middleware_1.requireRole)(['NGO']), payment_management_controller_1.getNgoPayments);
router.get('/ngo/payments/:id', auth_middleware_1.authenticate, (0, role_middleware_1.requireRole)(['NGO']), payment_management_controller_1.getNgoPaymentDetails);
router.patch('/ngo/payments/:id/verify', auth_middleware_1.authenticate, (0, role_middleware_1.requireRole)(['NGO']), payment_management_controller_1.verifyNgoPayment);
// Organization Admin payment management
router.get('/org/payments', auth_middleware_1.authenticate, (0, role_middleware_1.requireRole)(['ADMIN']), payment_management_controller_1.getAllOrgPayments);
router.patch('/org/payments/:id/verify', auth_middleware_1.authenticate, (0, role_middleware_1.requireRole)(['ADMIN']), payment_management_controller_1.verifyOrgPayment);
exports.default = router;

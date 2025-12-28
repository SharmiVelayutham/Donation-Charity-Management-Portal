"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const role_middleware_1 = require("../middleware/role.middleware");
const donation_request_controller_1 = require("../controllers/donation-request.controller");
const router = (0, express_1.Router)();
router.get('/test', (req, res) => {
    res.json({ success: true, message: 'Donation requests router is working!' });
});
router.get('/', donation_request_controller_1.getActiveDonationRequests);
router.post('/', auth_middleware_1.authenticate, (0, role_middleware_1.requireRole)(['NGO']), donation_request_controller_1.upload.array('images', 5), // Allow up to 5 images
donation_request_controller_1.createDonationRequest);
router.get('/my-requests', auth_middleware_1.authenticate, (0, role_middleware_1.requireRole)(['NGO']), donation_request_controller_1.getMyDonationRequests);
router.get('/:id', donation_request_controller_1.getDonationRequestById);
router.post('/:id/contribute', auth_middleware_1.authenticate, (0, role_middleware_1.requireRole)(['DONOR']), donation_request_controller_1.upload.array('images', 5), // Allow up to 5 images
donation_request_controller_1.contributeToDonationRequest);
router.put('/:id/status', auth_middleware_1.authenticate, (0, role_middleware_1.requireRole)(['NGO', 'ADMIN']), donation_request_controller_1.updateDonationRequestStatus);
exports.default = router;

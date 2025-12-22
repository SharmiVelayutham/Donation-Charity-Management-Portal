"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const role_middleware_1 = require("../middleware/role.middleware");
const donation_request_controller_1 = require("../controllers/donation-request.controller");
const router = (0, express_1.Router)();
console.log('🔧 Setting up donation-request routes...');
// Test route to verify router is working
router.get('/test', (req, res) => {
    console.log('✅ Test route hit - /api/donation-requests/test');
    res.json({ success: true, message: 'Donation requests router is working!' });
});
// Public route: Get all ACTIVE donation requests (for donors)
router.get('/', (req, res, next) => {
    console.log('📥 GET /api/donation-requests - Request received');
    next();
}, donation_request_controller_1.getActiveDonationRequests);
// Protected routes: NGO only
router.post('/', (req, res, next) => {
    console.log('📥 POST /api/donation-requests - Request received');
    next();
}, auth_middleware_1.authenticate, (0, role_middleware_1.requireRole)(['NGO']), donation_request_controller_1.upload.array('images', 5), // Allow up to 5 images
donation_request_controller_1.createDonationRequest);
// Get my donation requests (NGO) - MUST be before /:id route
router.get('/my-requests', auth_middleware_1.authenticate, (0, role_middleware_1.requireRole)(['NGO']), donation_request_controller_1.getMyDonationRequests);
// Public route: Get donation request by ID - MUST be after /my-requests
router.get('/:id', donation_request_controller_1.getDonationRequestById);
// Donor submits donation to a request
router.post('/:id/contribute', auth_middleware_1.authenticate, (0, role_middleware_1.requireRole)(['DONOR']), donation_request_controller_1.upload.array('images', 5), // Allow up to 5 images
donation_request_controller_1.contributeToDonationRequest);
// Update donation request status (NGO)
router.put('/:id/status', auth_middleware_1.authenticate, (0, role_middleware_1.requireRole)(['NGO', 'ADMIN']), donation_request_controller_1.updateDonationRequestStatus);
console.log('✅ Donation-request routes configured successfully');
exports.default = router;

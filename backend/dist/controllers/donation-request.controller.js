"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateDonationRequestStatus = exports.contributeToDonationRequest = exports.getMyDonationRequests = exports.getDonationRequestById = exports.getActiveDonationRequests = exports.createDonationRequest = exports.upload = void 0;
const response_1 = require("../utils/response");
const mysql_1 = require("../config/mysql");
const socket_server_1 = require("../socket/socket.server");
const email_service_1 = require("../utils/email.service");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
// Configure multer for image uploads
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path_1.default.join(process.cwd(), 'uploads', 'donation-requests');
        if (!fs_1.default.existsSync(uploadDir)) {
            fs_1.default.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'request-' + uniqueSuffix + path_1.default.extname(file.originalname));
    }
});
exports.upload = (0, multer_1.default)({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const extname = allowedTypes.test(path_1.default.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error('Only image files are allowed'));
    }
});
// Valid donation types
const VALID_DONATION_TYPES = ['FOOD', 'FUNDS', 'CLOTHES', 'MEDICINE', 'BOOKS', 'TOYS', 'OTHER'];
/**
 * Create donation request (NGO)
 * POST /api/donation-requests
 */
const createDonationRequest = async (req, res) => {
    var _a, _b;
    try {
        const ngoId = parseInt(req.user.id);
        // Get NGO profile details
        const ngoProfile = await (0, mysql_1.queryOne)('SELECT id, name, address, city, state, pincode FROM users WHERE id = ? AND role = "NGO"', [ngoId]);
        if (!ngoProfile) {
            return res.status(404).json({ success: false, message: 'NGO profile not found' });
        }
        const { donationType, quantityOrAmount, description, bankAccountNumber, bankName, ifscCode, accountHolderName } = req.body;
        // Validation
        if (!donationType || !quantityOrAmount) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: donationType, quantityOrAmount'
            });
        }
        // Validate donation type
        const normalizedType = donationType.toUpperCase();
        if (!VALID_DONATION_TYPES.includes(normalizedType)) {
            return res.status(400).json({
                success: false,
                message: `Invalid donation type. Valid types: ${VALID_DONATION_TYPES.join(', ')}`,
            });
        }
        // Validate quantity/amount
        const quantity = Number(quantityOrAmount);
        if (Number.isNaN(quantity) || quantity <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Quantity/Amount must be greater than 0'
            });
        }
        // Build NGO address string
        const ngoAddressParts = [
            ngoProfile.address,
            ngoProfile.city,
            ngoProfile.state,
            ngoProfile.pincode
        ].filter(Boolean);
        const ngoAddress = ngoAddressParts.join(', ');
        // Insert donation request
        const requestId = await (0, mysql_1.insert)(`INSERT INTO donation_requests (
        ngo_id, ngo_name, ngo_address, donation_type, 
        quantity_or_amount, description, 
        bank_account_number, bank_name, ifsc_code, account_holder_name,
        status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
            ngoId,
            ngoProfile.name,
            ngoAddress,
            normalizedType,
            quantity,
            description || null,
            bankAccountNumber || null,
            bankName || null,
            ifscCode || null,
            accountHolderName || null,
            'ACTIVE'
        ]);
        // Handle image uploads
        const files = req.files || [];
        if (files.length > 0) {
            for (let i = 0; i < files.length; i++) {
                await (0, mysql_1.insert)('INSERT INTO donation_request_images (request_id, image_path, image_order) VALUES (?, ?, ?)', [requestId, files[i].path, i]);
            }
        }
        // Fetch created request with images
        const createdRequest = await (0, mysql_1.queryOne)('SELECT * FROM donation_requests WHERE id = ?', [requestId]);
        const images = await (0, mysql_1.query)('SELECT image_path FROM donation_request_images WHERE request_id = ? ORDER BY image_order', [requestId]);
        const requestWithDetails = {
            ...createdRequest,
            images: images.map((img) => img.image_path),
        };
        // Emit real-time update to NGO dashboard
        try {
            const stats = await Promise.all([
                (0, mysql_1.queryOne)('SELECT COUNT(*) as count FROM donation_requests WHERE ngo_id = ?', [ngoId]),
                (0, mysql_1.queryOne)(`SELECT COUNT(DISTINCT drc.donor_id) as count
           FROM donation_request_contributions drc
           INNER JOIN donation_requests dr ON drc.request_id = dr.id
           WHERE dr.ngo_id = ?`, [ngoId]),
            ]);
            (0, socket_server_1.emitToNgo)(ngoId, 'ngo:stats:updated', {
                totalDonationRequests: ((_a = stats[0]) === null || _a === void 0 ? void 0 : _a.count) || 0,
                totalDonors: ((_b = stats[1]) === null || _b === void 0 ? void 0 : _b.count) || 0,
            });
        }
        catch (socketError) {
            console.error('Error emitting socket event:', socketError);
            // Don't fail the request if socket fails
        }
        return (0, response_1.sendSuccess)(res, requestWithDetails, 'Donation request created successfully', 201);
    }
    catch (error) {
        console.error('Error creating donation request:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to create donation request',
        });
    }
};
exports.createDonationRequest = createDonationRequest;
/**
 * Get all ACTIVE donation requests (for donors to view)
 * GET /api/donation-requests
 */
const getActiveDonationRequests = async (req, res) => {
    try {
        const { donationType } = req.query;
        let sql = `
      SELECT dr.*,
        u.email as ngo_email,
        u.contact_info as ngo_contact_info,
        u.phone_number as ngo_phone
      FROM donation_requests dr
      INNER JOIN users u ON dr.ngo_id = u.id
      WHERE dr.status = 'ACTIVE'
    `;
        const params = [];
        if (donationType) {
            sql += ' AND dr.donation_type = ?';
            params.push(donationType.toUpperCase());
        }
        sql += ' ORDER BY dr.created_at DESC';
        const requests = await (0, mysql_1.query)(sql, params);
        // Get images for each request
        const requestsWithImages = await Promise.all(requests.map(async (request) => {
            const images = await (0, mysql_1.query)('SELECT image_path FROM donation_request_images WHERE request_id = ? ORDER BY image_order', [request.id]);
            return {
                ...request,
                images: images.map((img) => img.image_path),
            };
        }));
        return (0, response_1.sendSuccess)(res, requestsWithImages, 'Active donation requests fetched');
    }
    catch (error) {
        console.error('Error fetching donation requests:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to fetch donation requests',
        });
    }
};
exports.getActiveDonationRequests = getActiveDonationRequests;
/**
 * Get donation request by ID
 * GET /api/donation-requests/:id
 */
const getDonationRequestById = async (req, res) => {
    try {
        const { id } = req.params;
        const requestId = parseInt(id);
        if (isNaN(requestId)) {
            return res.status(400).json({ success: false, message: 'Invalid request id' });
        }
        const request = await (0, mysql_1.queryOne)(`SELECT dr.*,
        u.email as ngo_email,
        u.contact_info as ngo_contact_info,
        u.phone_number as ngo_phone
      FROM donation_requests dr
      INNER JOIN users u ON dr.ngo_id = u.id
      WHERE dr.id = ?`, [requestId]);
        if (!request) {
            return res.status(404).json({ success: false, message: 'Donation request not found' });
        }
        // Get images
        const images = await (0, mysql_1.query)('SELECT image_path FROM donation_request_images WHERE request_id = ? ORDER BY image_order', [requestId]);
        const requestWithDetails = {
            ...request,
            images: images.map((img) => img.image_path),
        };
        return (0, response_1.sendSuccess)(res, requestWithDetails, 'Donation request fetched');
    }
    catch (error) {
        console.error('Error fetching donation request:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to fetch donation request',
        });
    }
};
exports.getDonationRequestById = getDonationRequestById;
/**
 * Get all donation requests for logged-in NGO
 * GET /api/donation-requests/my-requests
 */
const getMyDonationRequests = async (req, res) => {
    try {
        const ngoId = parseInt(req.user.id);
        const { status } = req.query;
        let sql = `
      SELECT dr.*
      FROM donation_requests dr
      WHERE dr.ngo_id = ?
    `;
        const params = [ngoId];
        if (status) {
            sql += ' AND dr.status = ?';
            params.push(typeof status === 'string' ? status.toUpperCase() : String(status).toUpperCase());
        }
        sql += ' ORDER BY dr.created_at DESC';
        const requests = await (0, mysql_1.query)(sql, params);
        // Get images for each request
        const requestsWithImages = await Promise.all(requests.map(async (request) => {
            const images = await (0, mysql_1.query)('SELECT image_path FROM donation_request_images WHERE request_id = ? ORDER BY image_order', [request.id]);
            return {
                ...request,
                images: images.map((img) => img.image_path),
            };
        }));
        return (0, response_1.sendSuccess)(res, requestsWithImages, 'My donation requests fetched');
    }
    catch (error) {
        console.error('Error fetching my donation requests:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to fetch donation requests',
        });
    }
};
exports.getMyDonationRequests = getMyDonationRequests;
/**
 * Donor submits donation to a donation request
 * POST /api/donation-requests/:id/contribute
 */
const contributeToDonationRequest = async (req, res) => {
    var _a, _b;
    try {
        const { id } = req.params;
        const requestId = parseInt(id);
        const donorId = parseInt(req.user.id);
        if (isNaN(requestId)) {
            return res.status(400).json({ success: false, message: 'Invalid request id' });
        }
        const { quantityOrAmount, pickupLocation, pickupDate, pickupTime, notes } = req.body;
        console.log('[Contribute] Request body:', { quantityOrAmount, pickupLocation, pickupDate, pickupTime, donationType: 'will check after query' });
        // Validate quantity/amount (required for all types)
        if (!quantityOrAmount) {
            return res.status(400).json({
                success: false,
                message: 'Missing required field: quantityOrAmount'
            });
        }
        const quantity = Number(quantityOrAmount);
        if (Number.isNaN(quantity) || quantity <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Quantity/Amount must be greater than 0'
            });
        }
        // Check if request exists and is active (need to check donation type)
        const request = await (0, mysql_1.queryOne)('SELECT * FROM donation_requests WHERE id = ?', [requestId]);
        if (!request) {
            return res.status(404).json({ success: false, message: 'Donation request not found' });
        }
        if (request.status !== 'ACTIVE') {
            return res.status(400).json({
                success: false,
                message: 'Cannot contribute to a closed donation request'
            });
        }
        // Validate based on donation type
        const donationType = request.donation_type.toUpperCase();
        const isFunds = donationType === 'FUNDS';
        // Pickup is required for all donation types EXCEPT FUNDS (money)
        // For FUNDS, donors transfer money directly, so no pickup needed
        const requiresPickup = !isFunds;
        console.log('[Contribute] Donation type:', donationType, 'requiresPickup:', requiresPickup, 'isFunds:', isFunds);
        // For non-FUNDS donations (FOOD, CLOTHES, MEDICINE, BOOKS, TOYS, OTHER): Pickup fields are REQUIRED
        if (requiresPickup) {
            // Check for empty strings as well
            if (!pickupLocation || pickupLocation.trim() === '' || !pickupDate || pickupDate.trim() === '' || !pickupTime || pickupTime.trim() === '') {
                return res.status(400).json({
                    success: false,
                    message: `Missing required fields for ${donationType} donations: pickupLocation, pickupDate, pickupTime`
                });
            }
            // Validate pickup date/time
            const pickupDateTime = new Date(`${pickupDate}T${pickupTime}`);
            if (isNaN(pickupDateTime.getTime())) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid pickup date/time format'
                });
            }
            if (pickupDateTime.getTime() <= Date.now()) {
                return res.status(400).json({
                    success: false,
                    message: 'Pickup date/time must be in the future'
                });
            }
        }
        // For FUNDS: Pickup fields should be NULL (donors transfer money directly to bank account)
        // We'll set them to NULL in the insert statement
        // Check if donor already contributed to this request
        const existingContribution = await (0, mysql_1.queryOne)('SELECT id FROM donation_request_contributions WHERE request_id = ? AND donor_id = ?', [requestId, donorId]);
        if (existingContribution) {
            return res.status(409).json({
                success: false,
                message: 'You have already contributed to this donation request'
            });
        }
        // Insert contribution
        // For FUNDS: pickup fields are NULL (donors transfer money directly to bank account)
        // For all other types: pickup fields are required (physical items need pickup)
        const contributionId = await (0, mysql_1.insert)(`INSERT INTO donation_request_contributions (
        request_id, donor_id, quantity_or_amount, pickup_location,
        pickup_date, pickup_time, notes, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [
            requestId,
            donorId,
            quantity,
            requiresPickup ? ((pickupLocation === null || pickupLocation === void 0 ? void 0 : pickupLocation.trim()) || null) : null,
            requiresPickup ? (pickupDate || null) : null,
            requiresPickup ? (pickupTime || null) : null,
            notes || null,
            'PENDING'
        ]);
        // Handle image uploads
        const files = req.files || [];
        if (files.length > 0) {
            for (let i = 0; i < files.length; i++) {
                await (0, mysql_1.insert)('INSERT INTO donation_request_contribution_images (contribution_id, image_path, image_order) VALUES (?, ?, ?)', [contributionId, files[i].path, i]);
            }
        }
        // Fetch created contribution with images
        const contribution = await (0, mysql_1.queryOne)(`SELECT drc.*,
        d.name as donor_name,
        d.email as donor_email,
        dr.ngo_name,
        dr.ngo_address,
        dr.donation_type
      FROM donation_request_contributions drc
      INNER JOIN donors d ON drc.donor_id = d.id
      INNER JOIN donation_requests dr ON drc.request_id = dr.id
      WHERE drc.id = ?`, [contributionId]);
        const images = await (0, mysql_1.query)('SELECT image_path FROM donation_request_contribution_images WHERE contribution_id = ? ORDER BY image_order', [contributionId]);
        const contributionWithDetails = {
            ...contribution,
            images: images.map((img) => img.image_path),
        };
        // Send email to donor when they make a donation
        if (contribution.donor_email) {
            try {
                const emailSubject = 'Thank You for Your Contribution';
                const emailHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Thank You for Your Contribution</title>
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #1976d2 0%, #2196f3 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 28px;">Thank You for Your Contribution!</h1>
            </div>
            
            <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e2e8f0;">
              <p style="font-size: 16px; color: #0f172a;">Hello <strong>${contribution.donor_name}</strong>,</p>
              
              <p style="font-size: 16px; color: #0f172a;">
                Thank you for your generous contribution! Your donation has been received and is currently <strong style="color: #f59e0b;">under review</strong> by our NGO team.
              </p>
              
              <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <h3 style="color: #0f172a; margin-top: 0;">Contribution Details:</h3>
                <p style="margin: 10px 0;"><strong>Type:</strong> ${contribution.donation_type}</p>
                <p style="margin: 10px 0;"><strong>Quantity/Amount:</strong> ${contribution.quantity_or_amount}</p>
                <p style="margin: 10px 0;"><strong>NGO:</strong> ${contribution.ngo_name}</p>
                <p style="margin: 10px 0;"><strong>Status:</strong> <span style="color: #f59e0b; font-weight: bold;">UNDER REVIEW</span></p>
              </div>
              
              <p style="font-size: 16px; color: #0f172a;">
                Our team will review your contribution and you will receive an update via email once the review is complete.
              </p>
              
              <p style="font-size: 16px; color: #0f172a;">
                Thank you for joining us in making a positive impact!
              </p>
              
              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
              
              <p style="font-size: 14px; color: #64748b; margin: 0;">
                Regards,<br>
                <strong>Donation & Charity Platform Team</strong>
              </p>
              
              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
              
              <p style="font-size: 12px; color: #94a3b8; text-align: center; margin: 0;">
                This is an automated email. Please do not reply to this message.<br>
                © ${new Date().getFullYear()} Donation & Charity Management Portal
              </p>
            </div>
          </body>
          </html>
        `;
                await (0, email_service_1.sendEmail)({
                    to: contribution.donor_email,
                    subject: emailSubject,
                    html: emailHtml,
                });
                console.log(`[Donation Request] Thank you email sent to donor: ${contribution.donor_email}`);
            }
            catch (emailError) {
                console.error('[Donation Request] Failed to send thank you email:', emailError);
                // Don't fail the request if email fails
            }
        }
        // Emit real-time updates to both NGO and Donor dashboards
        try {
            // Update NGO stats (get ngo_id from request)
            const ngoId = request.ngo_id;
            const ngoStats = await Promise.all([
                (0, mysql_1.queryOne)('SELECT COUNT(*) as count FROM donation_requests WHERE ngo_id = ?', [ngoId]),
                (0, mysql_1.queryOne)(`SELECT COUNT(DISTINCT drc.donor_id) as count
           FROM donation_request_contributions drc
           INNER JOIN donation_requests dr ON drc.request_id = dr.id
           WHERE dr.ngo_id = ?`, [ngoId]),
            ]);
            (0, socket_server_1.emitToNgo)(ngoId, 'ngo:stats:updated', {
                totalDonationRequests: ((_a = ngoStats[0]) === null || _a === void 0 ? void 0 : _a.count) || 0,
                totalDonors: ((_b = ngoStats[1]) === null || _b === void 0 ? void 0 : _b.count) || 0,
            });
            // Emit donation_created event to NGO with contribution details
            const donationDetails = {
                contributionId: contributionWithDetails.id,
                donor: {
                    id: contributionWithDetails.donor_id,
                    name: contributionWithDetails.donor_name,
                    email: contributionWithDetails.donor_email,
                },
                donationType: contributionWithDetails.donation_type,
                quantityOrAmount: parseFloat(contributionWithDetails.quantity_or_amount),
                donationDate: contributionWithDetails.created_at,
                requestId: contributionWithDetails.request_id,
            };
            (0, socket_server_1.emitToNgo)(ngoId, 'donation:created', donationDetails);
            // Update Donor stats
            const donorStats = await (0, mysql_1.queryOne)('SELECT COUNT(*) as count FROM donation_request_contributions WHERE donor_id = ?', [donorId]);
            const donorIdNum = typeof donorId === 'string' ? parseInt(donorId) : donorId;
            console.log(`[Donation Request] Emitting donor:stats:updated to donor ${donorIdNum} with stats:`, {
                totalDonations: (donorStats === null || donorStats === void 0 ? void 0 : donorStats.count) || 0,
            });
            (0, socket_server_1.emitToDonor)(donorIdNum, 'donor:stats:updated', {
                totalDonations: (donorStats === null || donorStats === void 0 ? void 0 : donorStats.count) || 0,
            });
        }
        catch (socketError) {
            console.error('Error emitting socket event:', socketError);
            // Don't fail the request if socket fails
        }
        return (0, response_1.sendSuccess)(res, contributionWithDetails, 'Donation submitted successfully', 201);
    }
    catch (error) {
        console.error('Error submitting donation:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to submit donation',
        });
    }
};
exports.contributeToDonationRequest = contributeToDonationRequest;
/**
 * Update donation request status (NGO can close their request)
 * PUT /api/donation-requests/:id/status
 */
const updateDonationRequestStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const requestId = parseInt(id);
        const ngoId = parseInt(req.user.id);
        const { status } = req.body;
        const statusStr = typeof status === 'string' ? status : String(status);
        if (!statusStr || !['ACTIVE', 'CLOSED'].includes(statusStr.toUpperCase())) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status. Must be ACTIVE or CLOSED'
            });
        }
        // Verify ownership
        const request = await (0, mysql_1.queryOne)('SELECT * FROM donation_requests WHERE id = ?', [requestId]);
        if (!request) {
            return res.status(404).json({ success: false, message: 'Donation request not found' });
        }
        if (request.ngo_id !== ngoId && req.user.role !== 'ADMIN') {
            return res.status(403).json({ success: false, message: 'Forbidden' });
        }
        // Update status
        await (0, mysql_1.update)('UPDATE donation_requests SET status = ? WHERE id = ?', [statusStr.toUpperCase(), requestId]);
        const updated = await (0, mysql_1.queryOne)('SELECT * FROM donation_requests WHERE id = ?', [requestId]);
        return (0, response_1.sendSuccess)(res, updated, 'Donation request status updated');
    }
    catch (error) {
        console.error('Error updating donation request status:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to update donation request status',
        });
    }
};
exports.updateDonationRequestStatus = updateDonationRequestStatus;

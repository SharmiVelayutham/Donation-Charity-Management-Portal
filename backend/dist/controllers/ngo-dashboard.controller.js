"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cancelNgoDonation = exports.updateNgoDonationPriority = exports.updateNgoDonation = exports.updateDonationRequestContributionStatus = exports.getNgoDonationDetails = exports.getNgoDonationById = exports.getNgoDonations = exports.createNgoDonation = void 0;
const response_1 = require("../utils/response");
const mysql_1 = require("../config/mysql");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const isFutureDate = (value) => new Date(value).getTime() > Date.now();
// Valid donation categories for NGO Admin Dashboard
const VALID_DONATION_CATEGORIES = ['CLOTHES', 'FOOD', 'MONEY'];
/**
 * Create donation request (NGO Admin Dashboard)
 * POST /api/ngo/donations
 */
const createNgoDonation = async (req, res) => {
    try {
        const ngoId = parseInt(req.user.id);
        const { donationCategory, purpose, description, quantityOrAmount, pickupDateTime, timezone, priority, 
        // Payment details for MONEY donations
        qrCodeImage, bankAccountNumber, bankName, ifscCode, accountHolderName, } = req.body;
        // Validation: Required fields
        if (!donationCategory || !purpose || !description || !quantityOrAmount) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: donationCategory, purpose, description, quantityOrAmount',
            });
        }
        // Validate donation category
        const normalizedCategory = donationCategory.toUpperCase();
        if (!VALID_DONATION_CATEGORIES.includes(normalizedCategory)) {
            return res.status(400).json({
                success: false,
                message: `Invalid donation category. Valid categories: ${VALID_DONATION_CATEGORIES.join(', ')}`,
            });
        }
        // Validate purpose and description
        if (typeof purpose !== 'string' || purpose.trim().length === 0) {
            return res.status(400).json({ success: false, message: 'Purpose cannot be empty' });
        }
        if (typeof description !== 'string' || description.trim().length === 0) {
            return res.status(400).json({ success: false, message: 'Description cannot be empty' });
        }
        // Validate quantity/amount
        const quantity = Number(quantityOrAmount);
        if (Number.isNaN(quantity) || quantity <= 0) {
            return res.status(400).json({ success: false, message: 'Quantity/Amount must be greater than 0' });
        }
        // Get NGO profile to use registered address
        const ngoProfile = await (0, mysql_1.queryOne)('SELECT address, city, state, pincode FROM users WHERE id = ?', [ngoId]);
        if (!ngoProfile) {
            return res.status(404).json({ success: false, message: 'NGO profile not found' });
        }
        // Build address from NGO profile
        const ngoAddress = [
            ngoProfile.address,
            ngoProfile.city,
            ngoProfile.state,
            ngoProfile.pincode
        ].filter(Boolean).join(', ');
        if (!ngoAddress) {
            return res.status(400).json({
                success: false,
                message: 'NGO address not found. Please complete your profile with address details first.',
            });
        }
        // For MONEY donations, validate payment details
        if (normalizedCategory === 'MONEY') {
            if (!qrCodeImage || !bankAccountNumber || !bankName || !ifscCode || !accountHolderName) {
                return res.status(400).json({
                    success: false,
                    message: 'Missing payment details for MONEY donation: qrCodeImage, bankAccountNumber, bankName, ifscCode, accountHolderName are required',
                });
            }
        }
        else {
            // For FOOD/CLOTHES donations, validate pickup date/time
            if (!pickupDateTime) {
                return res.status(400).json({
                    success: false,
                    message: 'Missing required field for FOOD/CLOTHES donation: pickupDateTime',
                });
            }
        }
        // Validate pickup date/time (for FOOD/CLOTHES only)
        let pickupDate = null;
        if (normalizedCategory !== 'MONEY') {
            pickupDate = new Date(pickupDateTime);
            if (isNaN(pickupDate.getTime())) {
                return res.status(400).json({ success: false, message: 'Invalid pickup date/time format' });
            }
            if (!isFutureDate(pickupDate)) {
                return res.status(400).json({ success: false, message: 'Pickup date must be in the future' });
            }
        }
        // Handle image uploads
        const files = req.files || [];
        const imagePaths = files.map((file) => file.path);
        // Insert donation into MySQL
        const donationId = await (0, mysql_1.insert)(`INSERT INTO donations (
        ngo_id, donation_type, donation_category, purpose, description,
        quantity_or_amount, location_address, pickup_date_time, timezone,
        status, priority
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
            ngoId,
            normalizedCategory, // donation_type (legacy)
            normalizedCategory, // donation_category
            purpose.trim(),
            description.trim(),
            quantity,
            ngoAddress, // Use NGO's registered address
            pickupDate || null,
            timezone || null,
            'ACTIVE',
            priority || 'NORMAL',
        ]);
        // Insert images if any
        if (imagePaths.length > 0) {
            for (let i = 0; i < imagePaths.length; i++) {
                await (0, mysql_1.insert)('INSERT INTO donation_images (donation_id, image_path, image_order) VALUES (?, ?, ?)', [donationId, imagePaths[i], i]);
            }
        }
        // Insert payment details for MONEY donations
        if (normalizedCategory === 'MONEY') {
            await (0, mysql_1.insert)(`INSERT INTO donation_payment_details (
          donation_id, qr_code_image, bank_account_number, bank_name, ifsc_code, account_holder_name
        ) VALUES (?, ?, ?, ?, ?, ?)`, [
                donationId,
                qrCodeImage.trim(),
                bankAccountNumber.trim(),
                bankName.trim(),
                ifscCode.trim(),
                accountHolderName.trim(),
            ]);
        }
        // Fetch created donation with NGO details
        const donation = await (0, mysql_1.queryOne)(`SELECT d.*, 
        u.name as ngo_name, u.email as ngo_email, u.contact_info as ngo_contact_info,
        (SELECT COUNT(*) FROM donation_images di WHERE di.donation_id = d.id) as image_count
       FROM donations d
       INNER JOIN users u ON d.ngo_id = u.id
       WHERE d.id = ?`, [donationId]);
        // Get images
        const images = await (0, mysql_1.query)('SELECT image_path FROM donation_images WHERE donation_id = ? ORDER BY image_order', [donationId]);
        const donationWithDetails = {
            ...donation,
            images: images.map((img) => img.image_path),
        };
        return (0, response_1.sendSuccess)(res, donationWithDetails, 'Donation request created successfully', 201);
    }
    catch (error) {
        console.error('Error creating donation:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to create donation request',
        });
    }
};
exports.createNgoDonation = createNgoDonation;
/**
 * Get all donations created by logged-in NGO
 * GET /api/ngo/donations
 */
const getNgoDonations = async (req, res) => {
    try {
        const ngoId = parseInt(req.user.id);
        const { status, priority, donationCategory } = req.query;
        let sql = `
      SELECT d.*,
        (SELECT COUNT(*) FROM contributions c WHERE c.donation_id = d.id) as contribution_count,
        (SELECT COUNT(*) FROM contributions c WHERE c.donation_id = d.id AND c.status IN ('APPROVED', 'COMPLETED')) as approved_contributions
      FROM donations d
      WHERE d.ngo_id = ?
    `;
        const params = [ngoId];
        if (status) {
            sql += ' AND d.status = ?';
            params.push(status);
        }
        if (priority) {
            sql += ' AND d.priority = ?';
            params.push(priority);
        }
        if (donationCategory) {
            sql += ' AND d.donation_category = ?';
            params.push(donationCategory);
        }
        sql += ' ORDER BY d.created_at DESC';
        const donations = await (0, mysql_1.query)(sql, params);
        // Get images for each donation
        const donationsWithImages = await Promise.all(donations.map(async (donation) => {
            const images = await (0, mysql_1.query)('SELECT image_path FROM donation_images WHERE donation_id = ? ORDER BY image_order', [donation.id]);
            return {
                ...donation,
                images: images.map((img) => img.image_path),
            };
        }));
        return (0, response_1.sendSuccess)(res, donationsWithImages, 'NGO donations fetched successfully');
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to fetch donations',
        });
    }
};
exports.getNgoDonations = getNgoDonations;
/**
 * Get donation details (only own donation)
 * GET /api/ngo/donations/:id
 */
const getNgoDonationById = async (req, res) => {
    try {
        const { id } = req.params;
        const donationId = parseInt(id);
        const ngoId = parseInt(req.user.id);
        if (isNaN(donationId)) {
            return res.status(400).json({ success: false, message: 'Invalid donation id' });
        }
        const donation = await (0, mysql_1.queryOne)(`SELECT d.*, 
        u.name as ngo_name, u.email as ngo_email, u.contact_info as ngo_contact_info
       FROM donations d
       INNER JOIN users u ON d.ngo_id = u.id
       WHERE d.id = ? AND d.ngo_id = ?`, [donationId, ngoId]);
        if (!donation) {
            return res.status(404).json({
                success: false,
                message: 'Donation not found or you do not have permission to access it',
            });
        }
        // Get images
        const images = await (0, mysql_1.query)('SELECT image_path FROM donation_images WHERE donation_id = ? ORDER BY image_order', [donationId]);
        // Get contribution counts
        const contributionCount = await (0, mysql_1.queryOne)('SELECT COUNT(*) as count FROM contributions WHERE donation_id = ?', [donationId]);
        const approvedCount = await (0, mysql_1.queryOne)('SELECT COUNT(*) as count FROM contributions WHERE donation_id = ? AND status IN (?, ?)', [donationId, 'APPROVED', 'COMPLETED']);
        const donationWithDetails = {
            ...donation,
            images: images.map((img) => img.image_path),
            contributionCount: (contributionCount === null || contributionCount === void 0 ? void 0 : contributionCount.count) || 0,
            approvedContributions: (approvedCount === null || approvedCount === void 0 ? void 0 : approvedCount.count) || 0,
        };
        return (0, response_1.sendSuccess)(res, donationWithDetails, 'Donation details fetched successfully');
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to fetch donation details',
        });
    }
};
exports.getNgoDonationById = getNgoDonationById;
/**
 * Get NGO donation request contributions with donor details
 * GET /api/ngo/dashboard/donations/details
 */
const getNgoDonationDetails = async (req, res) => {
    try {
        const ngoId = parseInt(req.user.id);
        // Get all donation request contributions for this NGO's requests
        const contributions = await (0, mysql_1.query)(`
      SELECT 
        drc.id as contribution_id,
        drc.quantity_or_amount,
        drc.status,
        drc.created_at as contribution_date,
        drc.pickup_location,
        drc.pickup_date,
        drc.pickup_time,
        drc.notes,
        dr.id as request_id,
        dr.donation_type,
        dr.description as request_description,
        d.name as donor_name,
        d.email as donor_email,
        d.phone_number as donor_phone,
        d.full_address as donor_address
      FROM donation_request_contributions drc
      INNER JOIN donation_requests dr ON drc.request_id = dr.id
      INNER JOIN donors d ON drc.donor_id = d.id
      WHERE dr.ngo_id = ?
      ORDER BY drc.created_at DESC
    `, [ngoId]);
        // Format the response
        const formattedContributions = contributions.map((cont) => ({
            contributionId: cont.contribution_id,
            requestId: cont.request_id,
            donationType: cont.donation_type,
            quantityOrAmount: parseFloat(cont.quantity_or_amount),
            status: cont.status,
            contributionDate: cont.contribution_date,
            pickupLocation: cont.pickup_location,
            pickupDate: cont.pickup_date,
            pickupTime: cont.pickup_time,
            notes: cont.notes,
            donor: {
                name: cont.donor_name,
                email: cont.donor_email,
                phone: cont.donor_phone,
                address: cont.donor_address
            },
            request: {
                id: cont.request_id,
                description: cont.request_description
            }
        }));
        // Set cache-control headers to prevent caching
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        return (0, response_1.sendSuccess)(res, formattedContributions, 'Donation details fetched successfully');
    }
    catch (error) {
        console.error('Error fetching NGO donation details:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to fetch donation details'
        });
    }
};
exports.getNgoDonationDetails = getNgoDonationDetails;
/**
 * Update donation request contribution status
 * PUT /api/ngo/dashboard/donations/:id/status
 */
const updateDonationRequestContributionStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const contributionId = parseInt(id);
        const ngoId = parseInt(req.user.id);
        console.log('[updateContributionStatus] Route hit!');
        console.log('[updateContributionStatus] Params:', { contributionId });
        console.log('[updateContributionStatus] Body:', { status });
        console.log('[updateContributionStatus] User:', req.user);
        if (isNaN(contributionId)) {
            return res.status(400).json({ success: false, message: 'Invalid contribution id' });
        }
        if (!status || !['ACCEPTED', 'NOT_RECEIVED'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status. Must be ACCEPTED or NOT_RECEIVED'
            });
        }
        console.log('[updateContributionStatus] Parsed - NGO ID:', ngoId, 'Contribution ID:', contributionId, 'Status:', status);
        // Verify the contribution belongs to this NGO's donation request
        const contribution = await (0, mysql_1.queryOne)(`
      SELECT drc.*, dr.ngo_id
      FROM donation_request_contributions drc
      INNER JOIN donation_requests dr ON drc.request_id = dr.id
      WHERE drc.id = ? AND dr.ngo_id = ?
    `, [contributionId, ngoId]);
        if (!contribution) {
            return res.status(404).json({
                success: false,
                message: 'Contribution not found or you do not have permission to update it'
            });
        }
        // Update status
        await (0, mysql_1.update)('UPDATE donation_request_contributions SET status = ? WHERE id = ?', [status, contributionId]);
        console.log('[NGO Donations] Updated contribution', contributionId, 'status to', status);
        // Get updated contribution with all details
        const updated = await (0, mysql_1.queryOne)(`
      SELECT 
        drc.id as contribution_id,
        drc.quantity_or_amount,
        drc.status,
        drc.created_at as contribution_date,
        dr.id as request_id,
        dr.donation_type,
        d.name as donor_name,
        d.email as donor_email
      FROM donation_request_contributions drc
      INNER JOIN donation_requests dr ON drc.request_id = dr.id
      INNER JOIN donors d ON drc.donor_id = d.id
      WHERE drc.id = ?
    `, [contributionId]);
        return (0, response_1.sendSuccess)(res, {
            contributionId: updated.contribution_id,
            requestId: updated.request_id,
            donationType: updated.donation_type,
            quantityOrAmount: parseFloat(updated.quantity_or_amount),
            status: updated.status,
            contributionDate: updated.contribution_date,
            donor: {
                name: updated.donor_name,
                email: updated.donor_email
            }
        }, `Status updated to ${status} successfully`);
    }
    catch (error) {
        console.error('Error updating contribution status:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to update contribution status'
        });
    }
};
exports.updateDonationRequestContributionStatus = updateDonationRequestContributionStatus;
/**
 * Update donation request
 * PUT /api/ngo/donations/:id
 */
const updateNgoDonation = async (req, res) => {
    try {
        const { id } = req.params;
        const donationId = parseInt(id);
        const ngoId = parseInt(req.user.id);
        if (isNaN(donationId)) {
            return res.status(400).json({ success: false, message: 'Invalid donation id' });
        }
        // Verify ownership
        const existingDonation = await (0, mysql_1.queryOne)('SELECT status FROM donations WHERE id = ? AND ngo_id = ?', [donationId, ngoId]);
        if (!existingDonation) {
            return res.status(404).json({
                success: false,
                message: 'Donation not found or you do not have permission to update it',
            });
        }
        // Cannot update cancelled or completed donations
        if (existingDonation.status === 'CANCELLED' || existingDonation.status === 'COMPLETED') {
            return res.status(400).json({
                success: false,
                message: `Cannot update ${existingDonation.status.toLowerCase()} donation`,
            });
        }
        const { donationCategory, purpose, description, quantityOrAmount, pickupDateTime, timezone, status, priority, } = req.body;
        const updates = [];
        const params = [];
        // Update donation category
        if (donationCategory) {
            const normalizedCategory = donationCategory.toUpperCase();
            if (!VALID_DONATION_CATEGORIES.includes(normalizedCategory)) {
                return res.status(400).json({
                    success: false,
                    message: `Invalid donation category. Valid categories: ${VALID_DONATION_CATEGORIES.join(', ')}`,
                });
            }
            updates.push('donation_category = ?', 'donation_type = ?');
            params.push(normalizedCategory, normalizedCategory);
        }
        // Update purpose
        if (purpose !== undefined) {
            if (typeof purpose !== 'string' || purpose.trim().length === 0) {
                return res.status(400).json({ success: false, message: 'Purpose cannot be empty' });
            }
            updates.push('purpose = ?');
            params.push(purpose.trim());
        }
        // Update description
        if (description !== undefined) {
            if (typeof description !== 'string' || description.trim().length === 0) {
                return res.status(400).json({ success: false, message: 'Description cannot be empty' });
            }
            updates.push('description = ?');
            params.push(description.trim());
        }
        // Update quantity/amount
        if (quantityOrAmount !== undefined) {
            const quantity = Number(quantityOrAmount);
            if (Number.isNaN(quantity) || quantity <= 0) {
                return res.status(400).json({ success: false, message: 'Quantity/Amount must be greater than 0' });
            }
            updates.push('quantity_or_amount = ?');
            params.push(quantity);
        }
        // Update pickup date/time
        if (pickupDateTime !== undefined) {
            const pickupDate = new Date(pickupDateTime);
            if (isNaN(pickupDate.getTime())) {
                return res.status(400).json({ success: false, message: 'Invalid pickup date/time format' });
            }
            if (!isFutureDate(pickupDate)) {
                return res.status(400).json({ success: false, message: 'Pickup date must be in the future' });
            }
            updates.push('pickup_date_time = ?');
            params.push(pickupDate);
        }
        // Update timezone
        if (timezone !== undefined) {
            updates.push('timezone = ?');
            params.push(timezone || null);
        }
        // Update status
        if (status && ['PENDING', 'CONFIRMED', 'COMPLETED'].includes(status)) {
            updates.push('status = ?');
            params.push(status);
        }
        // Update priority
        if (priority && ['NORMAL', 'URGENT'].includes(priority)) {
            updates.push('priority = ?');
            params.push(priority);
        }
        // Handle image updates
        const files = req.files || [];
        if (files.length > 0) {
            // Delete old images
            const oldImages = await (0, mysql_1.query)('SELECT image_path FROM donation_images WHERE donation_id = ?', [donationId]);
            oldImages.forEach((img) => {
                const fullPath = path_1.default.join(process.cwd(), img.image_path);
                if (fs_1.default.existsSync(fullPath)) {
                    try {
                        fs_1.default.unlinkSync(fullPath);
                    }
                    catch (error) {
                        console.error(`Error deleting image: ${img.image_path}`, error);
                    }
                }
            });
            await (0, mysql_1.query)('DELETE FROM donation_images WHERE donation_id = ?', [donationId]);
            // Insert new images
            for (let i = 0; i < files.length; i++) {
                await (0, mysql_1.insert)('INSERT INTO donation_images (donation_id, image_path, image_order) VALUES (?, ?, ?)', [donationId, files[i].path, i]);
            }
        }
        // Update donation if there are updates
        if (updates.length > 0) {
            params.push(donationId);
            await (0, mysql_1.update)(`UPDATE donations SET ${updates.join(', ')} WHERE id = ?`, params);
        }
        // Fetch updated donation
        const updated = await (0, mysql_1.queryOne)(`SELECT d.*, 
        u.name as ngo_name, u.email as ngo_email, u.contact_info as ngo_contact_info
       FROM donations d
       INNER JOIN users u ON d.ngo_id = u.id
       WHERE d.id = ?`, [donationId]);
        // Get images
        const images = await (0, mysql_1.query)('SELECT image_path FROM donation_images WHERE donation_id = ? ORDER BY image_order', [donationId]);
        const donationWithDetails = {
            ...updated,
            images: images.map((img) => img.image_path),
        };
        return (0, response_1.sendSuccess)(res, donationWithDetails, 'Donation request updated successfully');
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to update donation request',
        });
    }
};
exports.updateNgoDonation = updateNgoDonation;
/**
 * Update donation priority only
 * PATCH /api/ngo/donations/:id/priority
 */
const updateNgoDonationPriority = async (req, res) => {
    try {
        const { id } = req.params;
        const donationId = parseInt(id);
        const ngoId = parseInt(req.user.id);
        const { priority } = req.body;
        if (isNaN(donationId)) {
            return res.status(400).json({ success: false, message: 'Invalid donation id' });
        }
        if (!priority || !['NORMAL', 'URGENT'].includes(priority)) {
            return res.status(400).json({
                success: false,
                message: 'Priority is required and must be either NORMAL or URGENT',
            });
        }
        // Verify ownership
        const donation = await (0, mysql_1.queryOne)('SELECT id FROM donations WHERE id = ? AND ngo_id = ?', [donationId, ngoId]);
        if (!donation) {
            return res.status(404).json({
                success: false,
                message: 'Donation not found or you do not have permission to update it',
            });
        }
        await (0, mysql_1.update)('UPDATE donations SET priority = ? WHERE id = ?', [priority, donationId]);
        const updated = await (0, mysql_1.queryOne)(`SELECT d.*, 
        u.name as ngo_name, u.email as ngo_email, u.contact_info as ngo_contact_info
       FROM donations d
       INNER JOIN users u ON d.ngo_id = u.id
       WHERE d.id = ?`, [donationId]);
        return (0, response_1.sendSuccess)(res, updated, 'Donation priority updated successfully');
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to update donation priority',
        });
    }
};
exports.updateNgoDonationPriority = updateNgoDonationPriority;
/**
 * Cancel donation request
 * DELETE /api/ngo/donations/:id
 */
const cancelNgoDonation = async (req, res) => {
    try {
        const { id } = req.params;
        const donationId = parseInt(id);
        const ngoId = parseInt(req.user.id);
        if (isNaN(donationId)) {
            return res.status(400).json({ success: false, message: 'Invalid donation id' });
        }
        // Verify ownership
        const donation = await (0, mysql_1.queryOne)('SELECT status FROM donations WHERE id = ? AND ngo_id = ?', [donationId, ngoId]);
        if (!donation) {
            return res.status(404).json({
                success: false,
                message: 'Donation not found or you do not have permission to cancel it',
            });
        }
        // Cannot cancel already completed donations
        if (donation.status === 'COMPLETED') {
            return res.status(400).json({ success: false, message: 'Cannot cancel completed donation' });
        }
        await (0, mysql_1.update)('UPDATE donations SET status = ? WHERE id = ?', ['CANCELLED', donationId]);
        const updated = await (0, mysql_1.queryOne)(`SELECT d.*, 
        u.name as ngo_name, u.email as ngo_email, u.contact_info as ngo_contact_info
       FROM donations d
       INNER JOIN users u ON d.ngo_id = u.id
       WHERE d.id = ?`, [donationId]);
        return (0, response_1.sendSuccess)(res, updated, 'Donation request cancelled successfully');
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to cancel donation request',
        });
    }
};
exports.cancelNgoDonation = cancelNgoDonation;

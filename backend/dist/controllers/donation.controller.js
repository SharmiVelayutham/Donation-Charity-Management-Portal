"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNearbyDonations = exports.getMyDonations = exports.deleteDonation = exports.cancelDonation = exports.updateDonation = exports.getDonationById = exports.getDonations = exports.createDonation = void 0;
const response_1 = require("../utils/response");
const mysql_1 = require("../config/mysql");
const location_1 = require("../utils/location");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const isFutureDate = (value) => new Date(value).getTime() > Date.now();
// Valid donation types
const VALID_DONATION_TYPES = ['FOOD', 'FUNDS', 'CLOTHES', 'MEDICINE', 'BOOKS', 'TOYS', 'OTHER'];
const createDonation = async (req, res) => {
    var _a, _b;
    const { donationType, quantityOrAmount, location, pickupDateTime, timezone, status, priority } = req.body;
    if (!donationType || !quantityOrAmount) {
        return res.status(400).json({ success: false, message: 'Missing required fields: donationType, quantityOrAmount' });
    }
    // Validate donation type
    const normalizedType = donationType.toUpperCase();
    if (!VALID_DONATION_TYPES.includes(normalizedType)) {
        return res.status(400).json({
            success: false,
            message: `Invalid donation type. Valid types: ${VALID_DONATION_TYPES.join(', ')}`,
        });
    }
    const quantity = Number(quantityOrAmount);
    if (Number.isNaN(quantity) || quantity <= 0) {
        return res.status(400).json({ success: false, message: 'Quantity/Amount must be greater than 0' });
    }
    const isFunds = normalizedType === 'FUNDS';
    const requiresPickup = !isFunds;
    // For FUNDS: location and pickupDateTime are not required
    // For FOOD/CLOTHES: location and pickupDateTime are required
    if (requiresPickup) {
        if (!location || !pickupDateTime) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields for FOOD/CLOTHES donations: location, pickupDateTime'
            });
        }
    }
    // Validate and normalize location (only for non-FUNDS)
    let normalizedLocation;
    if (requiresPickup) {
        try {
            normalizedLocation = (0, location_1.normalizeLocation)(location);
        }
        catch (error) {
            return res.status(400).json({ success: false, message: error.message || 'Invalid location format' });
        }
    }
    // Validate pickup date/time (only for non-FUNDS)
    let pickupDate = null;
    if (requiresPickup) {
        pickupDate = new Date(pickupDateTime);
        if (isNaN(pickupDate.getTime())) {
            return res.status(400).json({ success: false, message: 'Invalid pickup date/time format' });
        }
        if (!isFutureDate(pickupDate)) {
            return res.status(400).json({ success: false, message: 'Pickup date must be in the future' });
        }
    }
    // Validate timezone if provided
    if (timezone && !(0, location_1.isValidTimezone)(timezone)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid timezone format. Use IANA timezone (e.g., America/New_York, Europe/London)',
        });
    }
    const files = req.files || [];
    const imagePaths = files.map((file) => file.path);
    try {
        const ngoId = parseInt(req.user.id);
        // Extract location details (only for non-FUNDS)
        const locationAddress = requiresPickup ? (normalizedLocation.address || '') : null;
        const locationLat = requiresPickup ? (((_a = normalizedLocation.coordinates) === null || _a === void 0 ? void 0 : _a.latitude) || null) : null;
        const locationLng = requiresPickup ? (((_b = normalizedLocation.coordinates) === null || _b === void 0 ? void 0 : _b.longitude) || null) : null;
        // Insert donation
        const donationId = await (0, mysql_1.insert)(`INSERT INTO donations (
        ngo_id, donation_type, donation_category, purpose, description,
        quantity_or_amount, location_address, location_latitude, location_longitude,
        pickup_date_time, timezone, status, priority
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
            ngoId,
            normalizedType,
            normalizedType, // donation_category
            '', // purpose - not provided in this function
            '', // description - not provided in this function
            quantity,
            locationAddress,
            locationLat,
            locationLng,
            pickupDate,
            timezone || null,
            status || 'PENDING',
            priority || 'NORMAL',
        ]);
        // Insert images
        if (imagePaths.length > 0) {
            for (let i = 0; i < imagePaths.length; i++) {
                await (0, mysql_1.insert)('INSERT INTO donation_images (donation_id, image_path, image_order) VALUES (?, ?, ?)', [donationId, imagePaths[i], i]);
            }
        }
        // Fetch created donation with NGO details
        const populated = await (0, mysql_1.queryOne)(`SELECT d.*,
        u.name as ngo_name, u.email as ngo_email, u.contact_info as ngo_contact_info
       FROM donations d
       INNER JOIN users u ON d.ngo_id = u.id
       WHERE d.id = ?`, [donationId]);
        // Get images
        const images = await (0, mysql_1.query)('SELECT image_path FROM donation_images WHERE donation_id = ? ORDER BY image_order', [donationId]);
        const donationWithDetails = {
            ...populated,
            images: images.map((img) => img.image_path),
        };
        return (0, response_1.sendSuccess)(res, donationWithDetails, 'Donation created', 201);
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to create donation',
        });
    }
};
exports.createDonation = createDonation;
const getDonations = async (req, res) => {
    try {
        const { status, priority, donationType, category, includeCancelled } = req.query;
        let sql = `
      SELECT d.*,
        u.name as ngo_name, u.email as ngo_email, u.contact_info as ngo_contact_info,
        (SELECT COUNT(*) FROM contributions c WHERE c.donation_id = d.id) as contribution_count,
        (SELECT COUNT(*) FROM contributions c WHERE c.donation_id = d.id AND c.status IN ('APPROVED', 'COMPLETED')) as approved_contributions
      FROM donations d
      INNER JOIN users u ON d.ngo_id = u.id
      WHERE 1=1
    `;
        const params = [];
        if (status) {
            sql += ' AND d.status = ?';
            params.push(status);
        }
        else {
            // By default, show only ACTIVE donations (unless includeCancelled is true)
            if (includeCancelled !== 'true') {
                sql += ' AND d.status = ?';
                params.push('ACTIVE');
            }
            else {
                sql += ' AND d.status != ?';
                params.push('CANCELLED');
            }
        }
        if (priority) {
            sql += ' AND d.priority = ?';
            params.push(priority);
        }
        if (donationType) {
            sql += ' AND d.donation_type LIKE ?';
            params.push(`%${donationType}%`);
        }
        if (category) {
            sql += ' AND d.donation_category = ?';
            params.push(category);
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
        return (0, response_1.sendSuccess)(res, donationsWithImages, 'Donations fetched');
    }
    catch (error) {
        console.error('Error fetching donations:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to fetch donations',
        });
    }
};
exports.getDonations = getDonations;
const getDonationById = async (req, res) => {
    try {
        const { id } = req.params;
        const donationId = parseInt(id);
        if (isNaN(donationId)) {
            return res.status(400).json({ success: false, message: 'Invalid donation id' });
        }
        const donation = await (0, mysql_1.queryOne)(`SELECT d.*,
        u.name as ngo_name, u.email as ngo_email, u.contact_info as ngo_contact_info
       FROM donations d
       INNER JOIN users u ON d.ngo_id = u.id
       WHERE d.id = ?`, [donationId]);
        if (!donation) {
            return res.status(404).json({ success: false, message: 'Donation not found' });
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
        return (0, response_1.sendSuccess)(res, donationWithDetails, 'Donation fetched');
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to fetch donation',
        });
    }
};
exports.getDonationById = getDonationById;
const updateDonation = async (req, res) => {
    var _a, _b;
    try {
        const { id } = req.params;
        const donationId = parseInt(id);
        const ngoId = parseInt(req.user.id);
        if (isNaN(donationId)) {
            return res.status(400).json({ success: false, message: 'Invalid donation id' });
        }
        // Verify ownership and get donation
        const donation = await (0, mysql_1.queryOne)('SELECT * FROM donations WHERE id = ?', [donationId]);
        if (!donation) {
            return res.status(404).json({ success: false, message: 'Donation not found' });
        }
        if (donation.ngo_id !== ngoId && req.user.role !== 'ADMIN') {
            return res.status(403).json({ success: false, message: 'Forbidden' });
        }
        // Cannot update cancelled or completed donations
        if (donation.status === 'CANCELLED' || donation.status === 'COMPLETED') {
            return res.status(400).json({
                success: false,
                message: `Cannot update ${donation.status.toLowerCase()} donation`,
            });
        }
        const { donationType, quantityOrAmount, location, pickupDateTime, timezone, status, priority, images, removeImages, } = req.body;
        const updates = [];
        const params = [];
        if (donationType) {
            const normalizedType = donationType.toUpperCase();
            if (!VALID_DONATION_TYPES.includes(normalizedType)) {
                return res.status(400).json({
                    success: false,
                    message: `Invalid donation type. Valid types: ${VALID_DONATION_TYPES.join(', ')}`,
                });
            }
            updates.push('donation_type = ?', 'donation_category = ?');
            params.push(normalizedType, normalizedType);
        }
        // Validate and normalize location if provided
        if (location) {
            try {
                const normalizedLocation = (0, location_1.normalizeLocation)(location);
                updates.push('location_address = ?', 'location_latitude = ?', 'location_longitude = ?');
                params.push(normalizedLocation.address || '', ((_a = normalizedLocation.coordinates) === null || _a === void 0 ? void 0 : _a.latitude) || null, ((_b = normalizedLocation.coordinates) === null || _b === void 0 ? void 0 : _b.longitude) || null);
            }
            catch (error) {
                return res.status(400).json({ success: false, message: error.message || 'Invalid location format' });
            }
        }
        if (status && ['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'].includes(status)) {
            updates.push('status = ?');
            params.push(status);
        }
        if (priority && ['NORMAL', 'URGENT'].includes(priority)) {
            updates.push('priority = ?');
            params.push(priority);
        }
        if (quantityOrAmount !== undefined) {
            const quantity = Number(quantityOrAmount);
            if (Number.isNaN(quantity) || quantity <= 0) {
                return res.status(400).json({ success: false, message: 'Quantity/Amount must be greater than 0' });
            }
            updates.push('quantity_or_amount = ?');
            params.push(quantity);
        }
        if (pickupDateTime) {
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
        // Validate timezone if provided
        if (timezone !== undefined) {
            if (timezone === null || timezone === '') {
                updates.push('timezone = ?');
                params.push(null);
            }
            else if (!(0, location_1.isValidTimezone)(timezone)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid timezone format. Use IANA timezone (e.g., America/New_York, Europe/London)',
                });
            }
            else {
                updates.push('timezone = ?');
                params.push(timezone);
            }
        }
        // Handle image updates
        if (removeImages && Array.isArray(removeImages)) {
            // Delete old images from database and filesystem
            const existingImages = await (0, mysql_1.query)('SELECT image_path FROM donation_images WHERE donation_id = ?', [donationId]);
            existingImages.forEach((img) => {
                if (removeImages.includes(img.image_path)) {
                    const fullPath = path_1.default.join(process.cwd(), img.image_path);
                    if (fs_1.default.existsSync(fullPath)) {
                        try {
                            fs_1.default.unlinkSync(fullPath);
                        }
                        catch (error) {
                            console.error(`Error deleting image: ${img.image_path}`, error);
                        }
                    }
                }
            });
            // Delete from database
            for (const imagePath of removeImages) {
                await (0, mysql_1.query)('DELETE FROM donation_images WHERE donation_id = ? AND image_path = ?', [donationId, imagePath]);
            }
        }
        // Add new images
        const files = req.files || [];
        if (files.length > 0) {
            const existingCount = await (0, mysql_1.queryOne)('SELECT COUNT(*) as count FROM donation_images WHERE donation_id = ?', [donationId]);
            let orderIndex = (existingCount === null || existingCount === void 0 ? void 0 : existingCount.count) || 0;
            for (const file of files) {
                await (0, mysql_1.insert)('INSERT INTO donation_images (donation_id, image_path, image_order) VALUES (?, ?, ?)', [donationId, file.path, orderIndex++]);
            }
        }
        // Replace images if new array provided
        if (images && Array.isArray(images)) {
            // Delete all existing images
            const existingImages = await (0, mysql_1.query)('SELECT image_path FROM donation_images WHERE donation_id = ?', [donationId]);
            existingImages.forEach((img) => {
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
            for (let i = 0; i < images.length; i++) {
                await (0, mysql_1.insert)('INSERT INTO donation_images (donation_id, image_path, image_order) VALUES (?, ?, ?)', [donationId, images[i], i]);
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
        const donationImages = await (0, mysql_1.query)('SELECT image_path FROM donation_images WHERE donation_id = ? ORDER BY image_order', [donationId]);
        const donationWithDetails = {
            ...updated,
            images: donationImages.map((img) => img.image_path),
        };
        return (0, response_1.sendSuccess)(res, donationWithDetails, 'Donation updated');
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to update donation',
        });
    }
};
exports.updateDonation = updateDonation;
/**
 * Cancel a donation request (sets status to CANCELLED instead of deleting)
 * This preserves history and allows tracking
 */
const cancelDonation = async (req, res) => {
    try {
        const { id } = req.params;
        const donationId = parseInt(id);
        const ngoId = parseInt(req.user.id);
        if (isNaN(donationId)) {
            return res.status(400).json({ success: false, message: 'Invalid donation id' });
        }
        const donation = await (0, mysql_1.queryOne)('SELECT * FROM donations WHERE id = ?', [donationId]);
        if (!donation) {
            return res.status(404).json({ success: false, message: 'Donation not found' });
        }
        if (donation.ngo_id !== ngoId && req.user.role !== 'ADMIN') {
            return res.status(403).json({ success: false, message: 'Forbidden' });
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
        return (0, response_1.sendSuccess)(res, updated, 'Donation cancelled');
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to cancel donation',
        });
    }
};
exports.cancelDonation = cancelDonation;
/**
 * Delete donation permanently (only if no contributions exist)
 */
const deleteDonation = async (req, res) => {
    try {
        const { id } = req.params;
        const donationId = parseInt(id);
        const ngoId = parseInt(req.user.id);
        if (isNaN(donationId)) {
            return res.status(400).json({ success: false, message: 'Invalid donation id' });
        }
        const donation = await (0, mysql_1.queryOne)('SELECT * FROM donations WHERE id = ?', [donationId]);
        if (!donation) {
            return res.status(404).json({ success: false, message: 'Donation not found' });
        }
        if (donation.ngo_id !== ngoId && req.user.role !== 'ADMIN') {
            return res.status(403).json({ success: false, message: 'Forbidden' });
        }
        // Check if there are any contributions
        const contributionCount = await (0, mysql_1.queryOne)('SELECT COUNT(*) as count FROM contributions WHERE donation_id = ?', [donationId]);
        if (((contributionCount === null || contributionCount === void 0 ? void 0 : contributionCount.count) || 0) > 0) {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete donation with existing contributions. Use cancel instead.',
            });
        }
        // Delete associated images
        const images = await (0, mysql_1.query)('SELECT image_path FROM donation_images WHERE donation_id = ?', [donationId]);
        images.forEach((img) => {
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
        // Delete images from database
        await (0, mysql_1.query)('DELETE FROM donation_images WHERE donation_id = ?', [donationId]);
        // Delete donation
        await (0, mysql_1.query)('DELETE FROM donations WHERE id = ?', [donationId]);
        return (0, response_1.sendSuccess)(res, null, 'Donation deleted');
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to delete donation',
        });
    }
};
exports.deleteDonation = deleteDonation;
/**
 * Get all donations posted by the logged-in NGO
 */
const getMyDonations = async (req, res) => {
    try {
        const { status, priority, donationType } = req.query;
        const ngoId = parseInt(req.user.id);
        let sql = `
      SELECT d.*,
        u.name as ngo_name, u.email as ngo_email, u.contact_info as ngo_contact_info
      FROM donations d
      INNER JOIN users u ON d.ngo_id = u.id
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
        if (donationType) {
            sql += ' AND d.donation_type LIKE ?';
            params.push(`%${donationType}%`);
        }
        sql += ' ORDER BY d.created_at DESC';
        const donations = await (0, mysql_1.query)(sql, params);
        // Get images and contribution counts for each donation
        const donationsWithDetails = await Promise.all(donations.map(async (donation) => {
            const images = await (0, mysql_1.query)('SELECT image_path FROM donation_images WHERE donation_id = ? ORDER BY image_order', [donation.id]);
            const contributionCount = await (0, mysql_1.queryOne)('SELECT COUNT(*) as count FROM contributions WHERE donation_id = ?', [donation.id]);
            const approvedCount = await (0, mysql_1.queryOne)('SELECT COUNT(*) as count FROM contributions WHERE donation_id = ? AND status IN (?, ?)', [donation.id, 'APPROVED', 'COMPLETED']);
            return {
                ...donation,
                images: images.map((img) => img.image_path),
                contributionCount: (contributionCount === null || contributionCount === void 0 ? void 0 : contributionCount.count) || 0,
                approvedContributions: (approvedCount === null || approvedCount === void 0 ? void 0 : approvedCount.count) || 0,
            };
        }));
        return (0, response_1.sendSuccess)(res, donationsWithDetails, 'My donations fetched');
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to fetch donations',
        });
    }
};
exports.getMyDonations = getMyDonations;
/**
 * Get donations near a location (within specified radius in km)
 * Requires latitude and longitude
 */
const getNearbyDonations = async (req, res) => {
    const { latitude, longitude, radius = 10, status, priority, donationType } = req.query;
    // Validate coordinates
    const lat = Number(latitude);
    const lng = Number(longitude);
    const radiusKm = Number(radius) || 10;
    if (!latitude || !longitude) {
        return res.status(400).json({
            success: false,
            message: 'Latitude and longitude are required for nearby search',
        });
    }
    if (!(0, location_1.isValidCoordinates)(lat, lng)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid coordinates. Latitude must be between -90 and 90, longitude between -180 and 180',
        });
    }
    if (radiusKm <= 0 || radiusKm > 1000) {
        return res.status(400).json({
            success: false,
            message: 'Radius must be between 1 and 1000 kilometers',
        });
    }
    try {
        // Build SQL query
        let sql = `
      SELECT d.*,
        u.name as ngo_name, u.email as ngo_email, u.contact_info as ngo_contact_info
      FROM donations d
      INNER JOIN users u ON d.ngo_id = u.id
      WHERE d.location_latitude IS NOT NULL AND d.location_longitude IS NOT NULL
    `;
        const params = [];
        if (status) {
            sql += ' AND d.status = ?';
            params.push(status);
        }
        else {
            sql += ' AND d.status != ?';
            params.push('CANCELLED');
        }
        if (priority) {
            sql += ' AND d.priority = ?';
            params.push(priority);
        }
        if (donationType) {
            sql += ' AND d.donation_type LIKE ?';
            params.push(`%${donationType}%`);
        }
        sql += ' ORDER BY d.created_at DESC';
        // Get all donations with coordinates
        const donations = await (0, mysql_1.query)(sql, params);
        // Calculate distances and filter by radius
        const nearbyDonations = donations
            .map((donation) => {
            if (!donation.location_latitude || !donation.location_longitude) {
                return null;
            }
            const distance = (0, location_1.calculateDistance)(lat, lng, donation.location_latitude, donation.location_longitude);
            if (distance <= radiusKm) {
                return {
                    ...donation,
                    distance: Math.round(distance * 100) / 100, // Round to 2 decimal places
                };
            }
            return null;
        })
            .filter((donation) => donation !== null)
            .sort((a, b) => a.distance - b.distance); // Sort by distance
        // Get images and contribution counts
        const donationsWithCounts = await Promise.all(nearbyDonations.map(async (donation) => {
            const images = await (0, mysql_1.query)('SELECT image_path FROM donation_images WHERE donation_id = ? ORDER BY image_order', [donation.id]);
            const contributionCount = await (0, mysql_1.queryOne)('SELECT COUNT(*) as count FROM contributions WHERE donation_id = ?', [donation.id]);
            const approvedCount = await (0, mysql_1.queryOne)('SELECT COUNT(*) as count FROM contributions WHERE donation_id = ? AND status IN (?, ?)', [donation.id, 'APPROVED', 'COMPLETED']);
            return {
                ...donation,
                images: images.map((img) => img.image_path),
                contributionCount: (contributionCount === null || contributionCount === void 0 ? void 0 : contributionCount.count) || 0,
                approvedContributions: (approvedCount === null || approvedCount === void 0 ? void 0 : approvedCount.count) || 0,
            };
        }));
        return (0, response_1.sendSuccess)(res, {
            center: { latitude: lat, longitude: lng },
            radius: radiusKm,
            count: donationsWithCounts.length,
            donations: donationsWithCounts,
        }, 'Nearby donations fetched');
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to fetch nearby donations',
        });
    }
};
exports.getNearbyDonations = getNearbyDonations;

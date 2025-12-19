"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNearbyDonations = exports.getMyDonations = exports.deleteDonation = exports.cancelDonation = exports.updateDonation = exports.getDonationById = exports.getDonations = exports.createDonation = void 0;
const mongoose_1 = require("mongoose");
const Donation_model_1 = require("../models/Donation.model");
const Contribution_model_1 = require("../models/Contribution.model");
const response_1 = require("../utils/response");
const location_1 = require("../utils/location");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const isFutureDate = (value) => new Date(value).getTime() > Date.now();
// Valid donation types
const VALID_DONATION_TYPES = ['FOOD', 'FUNDS', 'CLOTHES', 'MEDICINE', 'BOOKS', 'TOYS', 'OTHER'];
const createDonation = async (req, res) => {
    const { donationType, quantityOrAmount, location, pickupDateTime, timezone, status, priority } = req.body;
    if (!donationType || !quantityOrAmount || !location || !pickupDateTime) {
        return res.status(400).json({ success: false, message: 'Missing required fields' });
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
    // Validate and normalize location
    let normalizedLocation;
    try {
        normalizedLocation = (0, location_1.normalizeLocation)(location);
    }
    catch (error) {
        return res.status(400).json({ success: false, message: error.message || 'Invalid location format' });
    }
    // Validate pickup date/time
    const pickupDate = new Date(pickupDateTime);
    if (isNaN(pickupDate.getTime())) {
        return res.status(400).json({ success: false, message: 'Invalid pickup date/time format' });
    }
    if (!isFutureDate(pickupDate)) {
        return res.status(400).json({ success: false, message: 'Pickup date must be in the future' });
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
    const donation = await Donation_model_1.DonationModel.create({
        ngoId: req.user.id,
        donationType: normalizedType,
        quantityOrAmount: quantity,
        location: normalizedLocation,
        pickupDateTime: pickupDate,
        timezone: timezone || undefined,
        status: status || 'PENDING',
        images: imagePaths,
        priority: priority || 'NORMAL',
    });
    const populated = await Donation_model_1.DonationModel.findById(donation._id)
        .populate('ngoId', 'name email contactInfo role');
    return (0, response_1.sendSuccess)(res, populated, 'Donation created', 201);
};
exports.createDonation = createDonation;
const getDonations = async (req, res) => {
    const { status, priority, donationType, includeCancelled } = req.query;
    const filter = {};
    if (status) {
        filter.status = status;
    }
    else if (includeCancelled !== 'true') {
        // By default, exclude cancelled donations unless explicitly requested
        filter.status = { $ne: 'CANCELLED' };
    }
    if (priority)
        filter.priority = priority;
    if (donationType)
        filter.donationType = { $regex: donationType, $options: 'i' };
    const donations = await Donation_model_1.DonationModel.find(filter)
        .populate('ngoId', 'name email contactInfo role')
        .sort({ createdAt: -1 })
        .lean();
    // Add contribution counts for each donation
    const donationsWithCounts = await Promise.all(donations.map(async (donation) => {
        const contributionCount = await Contribution_model_1.ContributionModel.countDocuments({
            donationId: donation._id,
        });
        const approvedCount = await Contribution_model_1.ContributionModel.countDocuments({
            donationId: donation._id,
            status: { $in: ['APPROVED', 'COMPLETED'] },
        });
        return {
            ...donation,
            contributionCount,
            approvedContributions: approvedCount,
        };
    }));
    return (0, response_1.sendSuccess)(res, donationsWithCounts, 'Donations fetched');
};
exports.getDonations = getDonations;
const getDonationById = async (req, res) => {
    const { id } = req.params;
    if (!mongoose_1.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, message: 'Invalid id' });
    }
    const donation = await Donation_model_1.DonationModel.findById(id)
        .populate('ngoId', 'name email contactInfo role')
        .lean();
    if (!donation) {
        return res.status(404).json({ success: false, message: 'Donation not found' });
    }
    // Add contribution counts
    const contributionCount = await Contribution_model_1.ContributionModel.countDocuments({ donationId: id });
    const approvedCount = await Contribution_model_1.ContributionModel.countDocuments({
        donationId: id,
        status: { $in: ['APPROVED', 'COMPLETED'] },
    });
    const donationWithCounts = {
        ...donation,
        contributionCount,
        approvedContributions: approvedCount,
    };
    return (0, response_1.sendSuccess)(res, donationWithCounts, 'Donation fetched');
};
exports.getDonationById = getDonationById;
const updateDonation = async (req, res) => {
    const { id } = req.params;
    if (!mongoose_1.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, message: 'Invalid id' });
    }
    const donation = await Donation_model_1.DonationModel.findById(id);
    if (!donation) {
        return res.status(404).json({ success: false, message: 'Donation not found' });
    }
    if (donation.ngoId.toString() !== req.user.id && req.user.role !== 'ADMIN') {
        return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    // Cannot update cancelled or completed donations
    if (donation.status === 'CANCELLED' || donation.status === 'COMPLETED') {
        return res.status(400).json({
            success: false,
            message: `Cannot update ${donation.status.toLowerCase()} donation`,
        });
    }
    const updates = {};
    const { donationType, quantityOrAmount, location, pickupDateTime, timezone, status, priority, images, removeImages, } = req.body;
    if (donationType) {
        const normalizedType = donationType.toUpperCase();
        if (!VALID_DONATION_TYPES.includes(normalizedType)) {
            return res.status(400).json({
                success: false,
                message: `Invalid donation type. Valid types: ${VALID_DONATION_TYPES.join(', ')}`,
            });
        }
        updates.donationType = normalizedType;
    }
    // Validate and normalize location if provided
    if (location) {
        try {
            updates.location = (0, location_1.normalizeLocation)(location);
        }
        catch (error) {
            return res.status(400).json({ success: false, message: error.message || 'Invalid location format' });
        }
    }
    if (status && ['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'].includes(status)) {
        updates.status = status;
    }
    if (priority && ['NORMAL', 'URGENT'].includes(priority)) {
        updates.priority = priority;
    }
    if (quantityOrAmount !== undefined) {
        const quantity = Number(quantityOrAmount);
        if (Number.isNaN(quantity) || quantity <= 0) {
            return res.status(400).json({ success: false, message: 'Quantity/Amount must be greater than 0' });
        }
        updates.quantityOrAmount = quantity;
    }
    if (pickupDateTime) {
        const pickupDate = new Date(pickupDateTime);
        if (isNaN(pickupDate.getTime())) {
            return res.status(400).json({ success: false, message: 'Invalid pickup date/time format' });
        }
        if (!isFutureDate(pickupDate)) {
            return res.status(400).json({ success: false, message: 'Pickup date must be in the future' });
        }
        updates.pickupDateTime = pickupDate;
    }
    // Validate timezone if provided
    if (timezone !== undefined) {
        if (timezone === null || timezone === '') {
            updates.timezone = undefined;
        }
        else if (!(0, location_1.isValidTimezone)(timezone)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid timezone format. Use IANA timezone (e.g., America/New_York, Europe/London)',
            });
        }
        else {
            updates.timezone = timezone;
        }
    }
    // Handle image updates
    let updatedImages = [...donation.images];
    // Remove specified images
    if (removeImages && Array.isArray(removeImages)) {
        removeImages.forEach((imagePath) => {
            const fullPath = path_1.default.join(process.cwd(), imagePath);
            if (fs_1.default.existsSync(fullPath)) {
                try {
                    fs_1.default.unlinkSync(fullPath);
                }
                catch (error) {
                    console.error(`Error deleting image: ${imagePath}`, error);
                }
            }
            updatedImages = updatedImages.filter((img) => img !== imagePath);
        });
    }
    // Add new images
    const files = req.files || [];
    if (files.length) {
        updatedImages = [...updatedImages, ...files.map((file) => file.path)];
    }
    // Replace images if new array provided
    if (images && Array.isArray(images)) {
        updatedImages = images;
    }
    updates.images = updatedImages;
    const updated = await Donation_model_1.DonationModel.findByIdAndUpdate(id, updates, { new: true })
        .populate('ngoId', 'name email contactInfo role');
    return (0, response_1.sendSuccess)(res, updated, 'Donation updated');
};
exports.updateDonation = updateDonation;
/**
 * Cancel a donation request (sets status to CANCELLED instead of deleting)
 * This preserves history and allows tracking
 */
const cancelDonation = async (req, res) => {
    const { id } = req.params;
    if (!mongoose_1.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, message: 'Invalid id' });
    }
    const donation = await Donation_model_1.DonationModel.findById(id);
    if (!donation) {
        return res.status(404).json({ success: false, message: 'Donation not found' });
    }
    if (donation.ngoId.toString() !== req.user.id && req.user.role !== 'ADMIN') {
        return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    // Cannot cancel already completed donations
    if (donation.status === 'COMPLETED') {
        return res.status(400).json({ success: false, message: 'Cannot cancel completed donation' });
    }
    donation.status = 'CANCELLED';
    await donation.save();
    const updated = await Donation_model_1.DonationModel.findById(id)
        .populate('ngoId', 'name email contactInfo role');
    return (0, response_1.sendSuccess)(res, updated, 'Donation cancelled');
};
exports.cancelDonation = cancelDonation;
/**
 * Delete donation permanently (only if no contributions exist)
 */
const deleteDonation = async (req, res) => {
    const { id } = req.params;
    if (!mongoose_1.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, message: 'Invalid id' });
    }
    const donation = await Donation_model_1.DonationModel.findById(id);
    if (!donation) {
        return res.status(404).json({ success: false, message: 'Donation not found' });
    }
    if (donation.ngoId.toString() !== req.user.id && req.user.role !== 'ADMIN') {
        return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    // Check if there are any contributions
    const contributionCount = await Contribution_model_1.ContributionModel.countDocuments({ donationId: id });
    if (contributionCount > 0) {
        return res.status(400).json({
            success: false,
            message: 'Cannot delete donation with existing contributions. Use cancel instead.',
        });
    }
    // Delete associated images
    donation.images.forEach((imagePath) => {
        const fullPath = path_1.default.join(process.cwd(), imagePath);
        if (fs_1.default.existsSync(fullPath)) {
            try {
                fs_1.default.unlinkSync(fullPath);
            }
            catch (error) {
                console.error(`Error deleting image: ${imagePath}`, error);
            }
        }
    });
    await Donation_model_1.DonationModel.findByIdAndDelete(id);
    return (0, response_1.sendSuccess)(res, null, 'Donation deleted');
};
exports.deleteDonation = deleteDonation;
/**
 * Get all donations posted by the logged-in NGO
 */
const getMyDonations = async (req, res) => {
    const { status, priority, donationType } = req.query;
    const filter = { ngoId: req.user.id };
    if (status)
        filter.status = status;
    if (priority)
        filter.priority = priority;
    if (donationType)
        filter.donationType = { $regex: donationType, $options: 'i' };
    const donations = await Donation_model_1.DonationModel.find(filter)
        .populate('ngoId', 'name email contactInfo role')
        .sort({ createdAt: -1 })
        .lean();
    // Add contribution counts for each donation
    const donationsWithCounts = await Promise.all(donations.map(async (donation) => {
        const contributionCount = await Contribution_model_1.ContributionModel.countDocuments({
            donationId: donation._id,
        });
        const approvedCount = await Contribution_model_1.ContributionModel.countDocuments({
            donationId: donation._id,
            status: { $in: ['APPROVED', 'COMPLETED'] },
        });
        return {
            ...donation,
            contributionCount,
            approvedContributions: approvedCount,
        };
    }));
    return (0, response_1.sendSuccess)(res, donationsWithCounts, 'My donations fetched');
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
    // Build filter
    const filter = {
        'location.coordinates.latitude': { $exists: true },
        'location.coordinates.longitude': { $exists: true },
    };
    if (status) {
        filter.status = status;
    }
    else {
        filter.status = { $ne: 'CANCELLED' };
    }
    if (priority)
        filter.priority = priority;
    if (donationType)
        filter.donationType = { $regex: donationType, $options: 'i' };
    // Get all donations with coordinates
    const donations = await Donation_model_1.DonationModel.find(filter)
        .populate('ngoId', 'name email contactInfo role')
        .sort({ createdAt: -1 })
        .lean();
    // Calculate distances and filter by radius
    const nearbyDonations = donations
        .map((donation) => {
        if (!donation.location.coordinates) {
            return null;
        }
        const distance = (0, location_1.calculateDistance)(lat, lng, donation.location.coordinates.latitude, donation.location.coordinates.longitude);
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
    // Add contribution counts
    const donationsWithCounts = await Promise.all(nearbyDonations.map(async (donation) => {
        const contributionCount = await Contribution_model_1.ContributionModel.countDocuments({
            donationId: donation._id,
        });
        const approvedCount = await Contribution_model_1.ContributionModel.countDocuments({
            donationId: donation._id,
            status: { $in: ['APPROVED', 'COMPLETED'] },
        });
        return {
            ...donation,
            contributionCount,
            approvedContributions: approvedCount,
        };
    }));
    return (0, response_1.sendSuccess)(res, {
        center: { latitude: lat, longitude: lng },
        radius: radiusKm,
        count: donationsWithCounts.length,
        donations: donationsWithCounts,
    }, 'Nearby donations fetched');
};
exports.getNearbyDonations = getNearbyDonations;

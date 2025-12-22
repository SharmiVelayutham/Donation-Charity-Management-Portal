"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updatePickupStatus = exports.getNgoPickups = exports.contributeToDonation = void 0;
const mongoose_1 = require("mongoose");
const response_1 = require("../utils/response");
const isFutureDate = (value) => new Date(value).getTime() > Date.now();
/**
 * Generate unique transaction reference ID
 */
const generateTransactionReferenceId = () => {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `PAY-${timestamp}-${random}`;
};
/**
 * Donor contributes to a donation request
 * Handles FOOD/CLOTHES (pickup) and MONEY (payment) donations
 * POST /api/donations/:id/contribute
 */
const contributeToDonation = async (req, res) => {
    const { id: donationId } = req.params;
    const { 
    // For FOOD/CLOTHES donations
    pickupScheduledDateTime, donorAddress, donorContactNumber, notes, 
    // For MONEY donations
    amount, donorProvidedReference, } = req.body;
    // Validation
    if (!mongoose_1.Types.ObjectId.isValid(donationId)) {
        return res.status(400).json({ success: false, message: 'Invalid donation id' });
    }
    // Check if donation exists and is active
    const donation = await Donation_model_1.DonationModel.findById(donationId);
    if (!donation) {
        return res.status(404).json({ success: false, message: 'Donation not found' });
    }
    if (donation.status === 'CANCELLED' || donation.status === 'COMPLETED') {
        return res.status(400).json({
            success: false,
            message: `Cannot contribute to ${donation.status.toLowerCase()} donation`,
        });
    }
    const donationCategory = donation.donationCategory || donation.donationType;
    // Handle MONEY donations
    if (donationCategory === 'MONEY' || donationCategory === 'FUNDS') {
        // Validate MONEY donation requirements
        if (!amount || Number(amount) <= 0) {
            return res.status(400).json({ success: false, message: 'Amount is required and must be greater than 0' });
        }
        // Validate payment details exist
        if (!donation.paymentDetails) {
            return res.status(400).json({
                success: false,
                message: 'Payment details not configured for this donation. Please contact the NGO.',
            });
        }
        const paymentDetails = donation.paymentDetails;
        if (!paymentDetails.qrCodeImage ||
            !paymentDetails.bankAccountNumber ||
            !paymentDetails.bankName ||
            !paymentDetails.ifscCode ||
            !paymentDetails.accountHolderName) {
            return res.status(400).json({
                success: false,
                message: 'Payment details incomplete. QR code and bank details are required.',
            });
        }
        // Check if donor already made a payment for this donation
        const existingPayment = await Payment_model_1.PaymentModel.findOne({
            donationId,
            donorId: req.user.id,
        });
        if (existingPayment) {
            return res.status(409).json({
                success: false,
                message: 'You have already submitted a payment for this donation',
            });
        }
        // Generate unique transaction reference ID
        let transactionReferenceId = generateTransactionReferenceId();
        let isUnique = false;
        while (!isUnique) {
            const exists = await Payment_model_1.PaymentModel.findOne({ transactionReferenceId });
            if (!exists) {
                isUnique = true;
            }
            else {
                transactionReferenceId = generateTransactionReferenceId();
            }
        }
        // Create payment record
        const payment = await Payment_model_1.PaymentModel.create({
            donationId,
            donorId: req.user.id,
            ngoId: donation.ngoId,
            amount: Number(amount),
            transactionReferenceId,
            donorProvidedReference: donorProvidedReference === null || donorProvidedReference === void 0 ? void 0 : donorProvidedReference.trim(),
            paymentStatus: 'PENDING',
        });
        const populated = await Payment_model_1.PaymentModel.findById(payment._id)
            .populate('donorId', 'name email')
            .populate('donationId', 'donationCategory purpose description quantityOrAmount paymentDetails');
        return (0, response_1.sendSuccess)(res, {
            ...populated === null || populated === void 0 ? void 0 : populated.toObject(),
            paymentDetails: {
                qrCodeImage: paymentDetails.qrCodeImage,
                bankAccountNumber: paymentDetails.bankAccountNumber,
                bankName: paymentDetails.bankName,
                ifscCode: paymentDetails.ifscCode,
                accountHolderName: paymentDetails.accountHolderName,
            },
        }, 'Payment submitted successfully. Please complete payment externally and confirm.', 201);
    }
    // Handle FOOD/CLOTHES donations (physical pickup)
    if (!pickupScheduledDateTime || !donorAddress || !donorContactNumber) {
        return res.status(400).json({
            success: false,
            message: 'Missing required fields: pickupScheduledDateTime, donorAddress, donorContactNumber',
        });
    }
    // Validate pickup date
    const pickupDate = new Date(pickupScheduledDateTime);
    if (isNaN(pickupDate.getTime())) {
        return res.status(400).json({ success: false, message: 'Invalid pickup date/time format' });
    }
    if (!isFutureDate(pickupDate)) {
        return res.status(400).json({ success: false, message: 'Pickup date must be in the future' });
    }
    // Validate address and contact
    if (typeof donorAddress !== 'string' || donorAddress.trim().length === 0) {
        return res.status(400).json({ success: false, message: 'Donor address cannot be empty' });
    }
    if (typeof donorContactNumber !== 'string' || donorContactNumber.trim().length === 0) {
        return res.status(400).json({ success: false, message: 'Donor contact number cannot be empty' });
    }
    // Check if donor already contributed to this donation
    const existingContribution = await Contribution_model_1.ContributionModel.findOne({
        donationId,
        donorId: req.user.id,
    });
    if (existingContribution) {
        return res.status(409).json({ success: false, message: 'You have already contributed to this donation' });
    }
    // Get donor details
    const donor = await Donor_model_1.DonorModel.findById(req.user.id);
    if (!donor) {
        return res.status(404).json({ success: false, message: 'Donor not found' });
    }
    // Update donor profile with address and phone if not set
    const donorUpdates = {};
    if (!donor.fullAddress) {
        donorUpdates.fullAddress = donorAddress.trim();
    }
    if (!donor.phoneNumber) {
        donorUpdates.phoneNumber = donorContactNumber.trim();
    }
    if (Object.keys(donorUpdates).length > 0) {
        await Donor_model_1.DonorModel.findByIdAndUpdate(req.user.id, donorUpdates);
    }
    // Create contribution
    const contribution = await Contribution_model_1.ContributionModel.create({
        donationId,
        donorId: req.user.id,
        pickupScheduledDateTime: pickupDate,
        scheduledPickupTime: pickupDate, // Legacy field
        donorAddress: donorAddress.trim(),
        donorContactNumber: donorContactNumber.trim(),
        pickupStatus: 'SCHEDULED',
        notes: notes === null || notes === void 0 ? void 0 : notes.trim(),
        status: 'PENDING',
    });
    const populated = await Contribution_model_1.ContributionModel.findById(contribution._id)
        .populate('donorId', 'name email')
        .populate('donationId');
    return (0, response_1.sendSuccess)(res, populated, 'Contribution submitted successfully', 201);
};
exports.contributeToDonation = contributeToDonation;
/**
 * Get all pickup requests for NGO's donations
 * GET /api/ngo/pickups
 */
const getNgoPickups = async (req, res) => {
    const ngoId = req.user.id;
    const { pickupStatus, donationId } = req.query;
    // Get all donations by this NGO
    const donations = await Donation_model_1.DonationModel.find({ ngoId }).select('_id');
    const donationIds = donations.map((d) => d._id);
    if (donationIds.length === 0) {
        return (0, response_1.sendSuccess)(res, { count: 0, pickups: [] }, 'No pickups found');
    }
    // Build filter
    const filter = {
        donationId: { $in: donationIds },
    };
    if (pickupStatus) {
        filter.pickupStatus = pickupStatus;
    }
    if (donationId) {
        if (!mongoose_1.Types.ObjectId.isValid(donationId)) {
            return res.status(400).json({ success: false, message: 'Invalid donation id' });
        }
        // Verify this donation belongs to the NGO
        const donation = await Donation_model_1.DonationModel.findOne({ _id: donationId, ngoId });
        if (!donation) {
            return res.status(403).json({ success: false, message: 'You do not have access to this donation' });
        }
        filter.donationId = donationId;
    }
    const pickups = await Contribution_model_1.ContributionModel.find(filter)
        .populate('donorId', 'name email') // Donor name and email
        .populate({
        path: 'donationId',
        select: 'donationCategory donationType purpose quantityOrAmount location pickupDateTime',
    })
        .sort({ pickupScheduledDateTime: 1 }) // Sort by pickup date
        .lean();
    // Format response with all required donor details
    const formattedPickups = pickups.map((pickup) => {
        var _a, _b, _c, _d, _e, _f, _g, _h;
        const donor = pickup.donorId || {};
        return {
            _id: pickup._id,
            donation: {
                id: (_a = pickup.donationId) === null || _a === void 0 ? void 0 : _a._id,
                donationCategory: ((_b = pickup.donationId) === null || _b === void 0 ? void 0 : _b.donationCategory) || ((_c = pickup.donationId) === null || _c === void 0 ? void 0 : _c.donationType),
                donationType: (_d = pickup.donationId) === null || _d === void 0 ? void 0 : _d.donationType,
                purpose: (_e = pickup.donationId) === null || _e === void 0 ? void 0 : _e.purpose,
                quantityOrAmount: (_f = pickup.donationId) === null || _f === void 0 ? void 0 : _f.quantityOrAmount,
                pickupLocation: (_g = pickup.donationId) === null || _g === void 0 ? void 0 : _g.location,
                pickupDateTime: (_h = pickup.donationId) === null || _h === void 0 ? void 0 : _h.pickupDateTime,
            },
            donor: {
                id: donor._id,
                name: donor.name,
                email: donor.email,
                address: pickup.donorAddress, // Donor address from contribution
                contactNumber: pickup.donorContactNumber, // Donor contact from contribution
            },
            pickupScheduledDateTime: pickup.pickupScheduledDateTime || pickup.scheduledPickupTime,
            pickupStatus: pickup.pickupStatus,
            contributionStatus: pickup.status,
            notes: pickup.notes,
            createdAt: pickup.createdAt,
        };
    });
    return (0, response_1.sendSuccess)(res, { count: formattedPickups.length, pickups: formattedPickups }, 'Pickups fetched successfully');
};
exports.getNgoPickups = getNgoPickups;
/**
 * Update pickup status
 * PATCH /api/ngo/pickups/:id/status
 */
const updatePickupStatus = async (req, res) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l;
    const { id } = req.params;
    const { pickupStatus } = req.body;
    const ngoId = req.user.id;
    if (!mongoose_1.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, message: 'Invalid pickup id' });
    }
    if (!pickupStatus || !['SCHEDULED', 'PICKED_UP', 'CANCELLED'].includes(pickupStatus)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid pickup status. Must be SCHEDULED, PICKED_UP, or CANCELLED',
        });
    }
    // Find contribution and verify it belongs to NGO's donation
    const contribution = await Contribution_model_1.ContributionModel.findById(id).populate('donationId');
    if (!contribution) {
        return res.status(404).json({ success: false, message: 'Pickup not found' });
    }
    const donation = contribution.donationId;
    if (donation.ngoId.toString() !== ngoId) {
        return res.status(403).json({
            success: false,
            message: 'Forbidden: You can only manage pickups for your own donations',
        });
    }
    // Update pickup status
    contribution.pickupStatus = pickupStatus;
    // If picked up, also update contribution status to COMPLETED
    if (pickupStatus === 'PICKED_UP') {
        contribution.status = 'COMPLETED';
    }
    await contribution.save();
    // Get updated contribution with all details
    const updated = await Contribution_model_1.ContributionModel.findById(id)
        .populate('donorId', 'name email')
        .populate({
        path: 'donationId',
        select: 'donationCategory donationType purpose quantityOrAmount location pickupDateTime',
    })
        .lean();
    const formattedPickup = {
        _id: updated._id,
        donation: {
            id: (_a = updated.donationId) === null || _a === void 0 ? void 0 : _a._id,
            donationCategory: ((_b = updated.donationId) === null || _b === void 0 ? void 0 : _b.donationCategory) || ((_c = updated.donationId) === null || _c === void 0 ? void 0 : _c.donationType),
            donationType: (_d = updated.donationId) === null || _d === void 0 ? void 0 : _d.donationType,
            purpose: (_e = updated.donationId) === null || _e === void 0 ? void 0 : _e.purpose,
            quantityOrAmount: (_f = updated.donationId) === null || _f === void 0 ? void 0 : _f.quantityOrAmount,
            pickupLocation: (_g = updated.donationId) === null || _g === void 0 ? void 0 : _g.location,
            pickupDateTime: (_h = updated.donationId) === null || _h === void 0 ? void 0 : _h.pickupDateTime,
        },
        donor: {
            id: (_j = updated.donorId) === null || _j === void 0 ? void 0 : _j._id,
            name: (_k = updated.donorId) === null || _k === void 0 ? void 0 : _k.name,
            email: (_l = updated.donorId) === null || _l === void 0 ? void 0 : _l.email,
            address: updated.donorAddress,
            contactNumber: updated.donorContactNumber,
        },
        pickupScheduledDateTime: updated.pickupScheduledDateTime || updated.scheduledPickupTime,
        pickupStatus: updated.pickupStatus,
        contributionStatus: updated.status,
        notes: updated.notes,
        createdAt: updated.createdAt,
    };
    return (0, response_1.sendSuccess)(res, formattedPickup, 'Pickup status updated successfully');
};
exports.updatePickupStatus = updatePickupStatus;

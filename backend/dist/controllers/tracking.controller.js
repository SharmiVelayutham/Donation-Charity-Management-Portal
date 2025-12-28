"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNgoUpcomingPickups = exports.getUpcomingPickups = exports.trackMyContributions = exports.trackDonation = void 0;
const mongoose_1 = require("mongoose");
const response_1 = require("../utils/response");
const trackDonation = async (req, res) => {
    const { id } = req.params;
    if (!mongoose_1.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, message: 'Invalid donation id' });
    }
    const donation = await Donation_model_1.DonationModel.findById(id)
        .populate('ngoId', 'name email contactInfo')
        .lean();
    if (!donation) {
        return res.status(404).json({ success: false, message: 'Donation not found' });
    }
    const contributions = await Contribution_model_1.ContributionModel.find({ donationId: id })
        .populate('donorId', 'name email contactInfo')
        .sort({ createdAt: -1 })
        .lean();
    const tracking = {
        donation: {
            id: donation._id,
            donationType: donation.donationType,
            quantityOrAmount: donation.quantityOrAmount,
            location: donation.location,
            status: donation.status,
            priority: donation.priority,
            pickupDateTime: donation.pickupDateTime,
            createdAt: donation.createdAt,
            ngo: donation.ngoId,
        },
        contributions: contributions.map((c) => ({
            id: c._id,
            donor: c.donorId,
            status: c.status,
            scheduledPickupTime: c.scheduledPickupTime,
            notes: c.notes,
            createdAt: c.createdAt,
        })),
        summary: {
            totalContributions: contributions.length,
            approvedContributions: contributions.filter((c) => c.status === 'APPROVED').length,
            completedContributions: contributions.filter((c) => c.status === 'COMPLETED').length,
            pendingContributions: contributions.filter((c) => c.status === 'PENDING').length,
        },
    };
    return (0, response_1.sendSuccess)(res, tracking, 'Donation tracking info');
};
exports.trackDonation = trackDonation;
const trackMyContributions = async (req, res) => {
    const donorId = req.user.id;
    const { status } = req.query;
    const filter = { donorId };
    if (status)
        filter.status = status;
    const contributions = await Contribution_model_1.ContributionModel.find(filter)
        .populate({
        path: 'donationId',
        populate: { path: 'ngoId', select: 'name email contactInfo' },
    })
        .sort({ createdAt: -1 })
        .lean();
    const tracking = contributions.map((c) => ({
        contribution: {
            id: c._id,
            status: c.status,
            scheduledPickupTime: c.scheduledPickupTime,
            notes: c.notes,
            createdAt: c.createdAt,
        },
        donation: c.donationId,
    }));
    return (0, response_1.sendSuccess)(res, { contributions: tracking }, 'Contribution tracking');
};
exports.trackMyContributions = trackMyContributions;
const getUpcomingPickups = async (req, res) => {
    const donorId = req.user.id;
    const now = new Date();
    const pickups = await Contribution_model_1.ContributionModel.find({
        donorId,
        status: { $in: ['APPROVED', 'PENDING'] },
        scheduledPickupTime: { $gte: now },
    })
        .populate({
        path: 'donationId',
        populate: { path: 'ngoId', select: 'name email contactInfo' },
    })
        .sort({ scheduledPickupTime: 1 })
        .limit(20)
        .lean();
    return (0, response_1.sendSuccess)(res, { pickups }, 'Upcoming pickups');
};
exports.getUpcomingPickups = getUpcomingPickups;
const getNgoUpcomingPickups = async (req, res) => {
    const ngoId = req.user.id;
    const now = new Date();
    const donations = await Donation_model_1.DonationModel.find({ ngoId }).select('_id');
    const donationIds = donations.map((d) => d._id);
    const pickups = await Contribution_model_1.ContributionModel.find({
        donationId: { $in: donationIds },
        status: { $in: ['APPROVED', 'PENDING'] },
        scheduledPickupTime: { $gte: now },
    })
        .populate('donorId', 'name email contactInfo')
        .populate('donationId')
        .sort({ scheduledPickupTime: 1 })
        .limit(50)
        .lean();
    return (0, response_1.sendSuccess)(res, { pickups }, 'Upcoming pickups for NGO');
};
exports.getNgoUpcomingPickups = getNgoUpcomingPickups;

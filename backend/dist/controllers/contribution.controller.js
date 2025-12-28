"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updatePickupSchedule = exports.approveContribution = exports.getNgoContributions = exports.getMyContributions = exports.createContribution = void 0;
const mongoose_1 = require("mongoose");
const response_1 = require("../utils/response");
const isFutureDate = (value) => new Date(value).getTime() > Date.now();
const createContribution = async (req, res) => {
    const { donationId, notes, scheduledPickupTime } = req.body;
    if (!donationId || !scheduledPickupTime) {
        return res.status(400).json({ success: false, message: 'Missing required fields' });
    }
    if (!mongoose_1.Types.ObjectId.isValid(donationId)) {
        return res.status(400).json({ success: false, message: 'Invalid donation id' });
    }
    if (!isFutureDate(scheduledPickupTime)) {
        return res.status(400).json({ success: false, message: 'Scheduled pickup must be in the future' });
    }
    const donation = await Donation_model_1.DonationModel.findById(donationId);
    if (!donation) {
        return res.status(404).json({ success: false, message: 'Donation not found' });
    }
    const contribution = await Contribution_model_1.ContributionModel.create({
        donationId,
        donorId: req.user.id,
        notes,
        scheduledPickupTime,
    });
    const populated = await Contribution_model_1.ContributionModel.findById(contribution._id)
        .populate('donorId', 'name email contactInfo')
        .populate('donationId');
    return (0, response_1.sendSuccess)(res, populated, 'Contribution created', 201);
};
exports.createContribution = createContribution;
const getMyContributions = async (req, res) => {
    const contributions = await Contribution_model_1.ContributionModel.find({ donorId: req.user.id })
        .populate('donationId')
        .sort({ createdAt: -1 });
    return (0, response_1.sendSuccess)(res, contributions, 'My contributions');
};
exports.getMyContributions = getMyContributions;
const getNgoContributions = async (req, res) => {
    const donations = await Donation_model_1.DonationModel.find({ ngoId: req.user.id }).select('_id');
    const donationIds = donations.map((d) => d._id);
    const contributions = await Contribution_model_1.ContributionModel.find({ donationId: { $in: donationIds } })
        .populate('donorId', 'name email contactInfo')
        .populate('donationId')
        .sort({ createdAt: -1 });
    return (0, response_1.sendSuccess)(res, contributions, 'NGO contributions');
};
exports.getNgoContributions = getNgoContributions;
const approveContribution = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    if (!mongoose_1.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, message: 'Invalid contribution id' });
    }
    if (!['APPROVED', 'REJECTED', 'COMPLETED'].includes(status)) {
        return res.status(400).json({ success: false, message: 'Invalid status. Use APPROVED, REJECTED, or COMPLETED' });
    }
    const contribution = await Contribution_model_1.ContributionModel.findById(id).populate('donationId');
    if (!contribution) {
        return res.status(404).json({ success: false, message: 'Contribution not found' });
    }
    const donation = contribution.donationId;
    if (donation.ngoId.toString() !== req.user.id && req.user.role !== 'ADMIN') {
        return res.status(403).json({ success: false, message: 'Forbidden: You can only approve contributions for your own donations' });
    }
    contribution.status = status;
    await contribution.save();
    if (status === 'APPROVED') {
        await Donation_model_1.DonationModel.findByIdAndUpdate(donation._id, { status: 'CONFIRMED' });
    }
    const updated = await Contribution_model_1.ContributionModel.findById(id)
        .populate('donorId', 'name email contactInfo')
        .populate('donationId');
    return (0, response_1.sendSuccess)(res, updated, `Contribution ${status.toLowerCase()}`);
};
exports.approveContribution = approveContribution;
const updatePickupSchedule = async (req, res) => {
    const { id } = req.params;
    const { scheduledPickupTime } = req.body;
    if (!mongoose_1.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, message: 'Invalid contribution id' });
    }
    if (!scheduledPickupTime) {
        return res.status(400).json({ success: false, message: 'Missing scheduledPickupTime' });
    }
    if (!isFutureDate(scheduledPickupTime)) {
        return res.status(400).json({ success: false, message: 'Scheduled pickup must be in the future' });
    }
    const contribution = await Contribution_model_1.ContributionModel.findById(id).populate('donationId');
    if (!contribution) {
        return res.status(404).json({ success: false, message: 'Contribution not found' });
    }
    const donation = contribution.donationId;
    if (donation.ngoId.toString() !== req.user.id && req.user.role !== 'ADMIN') {
        return res.status(403).json({ success: false, message: 'Forbidden: You can only update schedules for your own donations' });
    }
    contribution.scheduledPickupTime = new Date(scheduledPickupTime);
    await contribution.save();
    const updated = await Contribution_model_1.ContributionModel.findById(id)
        .populate('donorId', 'name email contactInfo')
        .populate('donationId');
    return (0, response_1.sendSuccess)(res, updated, 'Pickup schedule updated');
};
exports.updatePickupSchedule = updatePickupSchedule;

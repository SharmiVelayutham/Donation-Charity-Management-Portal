"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.unblockDonor = exports.blockDonor = exports.unblockNgo = exports.blockNgo = exports.getDonorDetails = exports.getNgoDetails = exports.getAllDonors = exports.getAllNgos = void 0;
const mongoose_1 = require("mongoose");
const Donor_model_1 = require("../models/Donor.model");
const User_model_1 = require("../models/User.model");
const Contribution_model_1 = require("../models/Contribution.model");
const Donation_model_1 = require("../models/Donation.model");
const response_1 = require("../utils/response");
/**
 * Get all NGOs with detailed information
 * GET /api/admin/dashboard/ngos
 */
const getAllNgos = async (req, res) => {
    const { isBlocked, search } = req.query;
    const filter = {};
    if (isBlocked !== undefined) {
        filter.isBlocked = isBlocked === 'true';
    }
    if (search) {
        filter.$or = [
            { name: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
            { contactInfo: { $regex: search, $options: 'i' } },
        ];
    }
    const ngos = await User_model_1.UserModel.find(filter)
        .select('-password') // Exclude password
        .sort({ createdAt: -1 })
        .lean();
    // Add donation statistics for each NGO
    const ngosWithStats = await Promise.all(ngos.map(async (ngo) => {
        const donationCount = await Donation_model_1.DonationModel.countDocuments({ ngoId: ngo._id });
        const totalContributions = await Donation_model_1.DonationModel.find({ ngoId: ngo._id })
            .select('_id')
            .then((donations) => {
            const donationIds = donations.map((d) => d._id);
            return Contribution_model_1.ContributionModel.countDocuments({ donationId: { $in: donationIds } });
        });
        return {
            ...ngo,
            statistics: {
                totalDonations: donationCount,
                totalContributions,
            },
        };
    }));
    return (0, response_1.sendSuccess)(res, { count: ngosWithStats.length, ngos: ngosWithStats }, 'NGOs fetched successfully');
};
exports.getAllNgos = getAllNgos;
/**
 * Get all Donors with detailed information
 * GET /api/admin/dashboard/donors
 */
const getAllDonors = async (req, res) => {
    const { isBlocked, search } = req.query;
    const filter = {};
    if (isBlocked !== undefined) {
        filter.isBlocked = isBlocked === 'true';
    }
    if (search) {
        filter.$or = [
            { name: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
            { contactInfo: { $regex: search, $options: 'i' } },
        ];
    }
    const donors = await Donor_model_1.DonorModel.find(filter)
        .select('-password') // Exclude password
        .sort({ createdAt: -1 })
        .lean();
    // Add contribution statistics for each donor
    const donorsWithStats = await Promise.all(donors.map(async (donor) => {
        const contributionCount = await Contribution_model_1.ContributionModel.countDocuments({ donorId: donor._id });
        const approvedContributions = await Contribution_model_1.ContributionModel.countDocuments({
            donorId: donor._id,
            status: { $in: ['APPROVED', 'COMPLETED'] },
        });
        return {
            ...donor,
            statistics: {
                totalContributions: contributionCount,
                approvedContributions,
            },
        };
    }));
    return (0, response_1.sendSuccess)(res, { count: donorsWithStats.length, donors: donorsWithStats }, 'Donors fetched successfully');
};
exports.getAllDonors = getAllDonors;
/**
 * Get detailed information about a specific NGO
 * GET /api/admin/dashboard/ngos/:id
 */
const getNgoDetails = async (req, res) => {
    const { id } = req.params;
    if (!mongoose_1.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, message: 'Invalid NGO id' });
    }
    const ngo = await User_model_1.UserModel.findById(id).select('-password').lean();
    if (!ngo) {
        return res.status(404).json({ success: false, message: 'NGO not found' });
    }
    // Get all donations by this NGO
    const donations = await Donation_model_1.DonationModel.find({ ngoId: id })
        .sort({ createdAt: -1 })
        .lean();
    // Get contribution statistics
    const donationIds = donations.map((d) => d._id);
    const totalContributions = await Contribution_model_1.ContributionModel.countDocuments({
        donationId: { $in: donationIds },
    });
    const ngoDetails = {
        ...ngo,
        donations: {
            total: donations.length,
            list: donations,
        },
        statistics: {
            totalDonations: donations.length,
            totalContributions,
        },
    };
    return (0, response_1.sendSuccess)(res, ngoDetails, 'NGO details fetched successfully');
};
exports.getNgoDetails = getNgoDetails;
/**
 * Get detailed information about a specific Donor
 * GET /api/admin/dashboard/donors/:id
 */
const getDonorDetails = async (req, res) => {
    const { id } = req.params;
    if (!mongoose_1.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, message: 'Invalid donor id' });
    }
    const donor = await Donor_model_1.DonorModel.findById(id).select('-password').lean();
    if (!donor) {
        return res.status(404).json({ success: false, message: 'Donor not found' });
    }
    // Get all contributions by this donor
    const contributions = await Contribution_model_1.ContributionModel.find({ donorId: id })
        .populate('donationId')
        .sort({ createdAt: -1 })
        .lean();
    const donorDetails = {
        ...donor,
        contributions: {
            total: contributions.length,
            list: contributions,
        },
        statistics: {
            totalContributions: contributions.length,
            approvedContributions: contributions.filter((c) => c.status === 'APPROVED' || c.status === 'COMPLETED').length,
        },
    };
    return (0, response_1.sendSuccess)(res, donorDetails, 'Donor details fetched successfully');
};
exports.getDonorDetails = getDonorDetails;
/**
 * Block an NGO
 * PUT /api/admin/dashboard/ngos/:id/block
 */
const blockNgo = async (req, res) => {
    const { id } = req.params;
    if (!mongoose_1.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, message: 'Invalid NGO id' });
    }
    const ngo = await User_model_1.UserModel.findByIdAndUpdate(id, { isBlocked: true }, { new: true })
        .select('-password');
    if (!ngo) {
        return res.status(404).json({ success: false, message: 'NGO not found' });
    }
    return (0, response_1.sendSuccess)(res, ngo, 'NGO blocked successfully');
};
exports.blockNgo = blockNgo;
/**
 * Unblock an NGO
 * PUT /api/admin/dashboard/ngos/:id/unblock
 */
const unblockNgo = async (req, res) => {
    const { id } = req.params;
    if (!mongoose_1.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, message: 'Invalid NGO id' });
    }
    const ngo = await User_model_1.UserModel.findByIdAndUpdate(id, { isBlocked: false }, { new: true })
        .select('-password');
    if (!ngo) {
        return res.status(404).json({ success: false, message: 'NGO not found' });
    }
    return (0, response_1.sendSuccess)(res, ngo, 'NGO unblocked successfully');
};
exports.unblockNgo = unblockNgo;
/**
 * Block a Donor
 * PUT /api/admin/dashboard/donors/:id/block
 */
const blockDonor = async (req, res) => {
    const { id } = req.params;
    if (!mongoose_1.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, message: 'Invalid donor id' });
    }
    const donor = await Donor_model_1.DonorModel.findByIdAndUpdate(id, { isBlocked: true }, { new: true })
        .select('-password');
    if (!donor) {
        return res.status(404).json({ success: false, message: 'Donor not found' });
    }
    return (0, response_1.sendSuccess)(res, donor, 'Donor blocked successfully');
};
exports.blockDonor = blockDonor;
/**
 * Unblock a Donor
 * PUT /api/admin/dashboard/donors/:id/unblock
 */
const unblockDonor = async (req, res) => {
    const { id } = req.params;
    if (!mongoose_1.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, message: 'Invalid donor id' });
    }
    const donor = await Donor_model_1.DonorModel.findByIdAndUpdate(id, { isBlocked: false }, { new: true })
        .select('-password');
    if (!donor) {
        return res.status(404).json({ success: false, message: 'Donor not found' });
    }
    return (0, response_1.sendSuccess)(res, donor, 'Donor unblocked successfully');
};
exports.unblockDonor = unblockDonor;

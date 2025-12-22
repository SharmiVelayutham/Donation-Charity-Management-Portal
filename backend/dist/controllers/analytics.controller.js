"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNgoStats = exports.getDonorStats = exports.getPlatformStats = void 0;
const response_1 = require("../utils/response");
/**
 * Get platform-wide analytics (Admin only or public stats)
 */
const getPlatformStats = async (req, res) => {
    var _a;
    const [totalDonors, totalNgos, totalDonations, totalContributions, totalAmountDonated, pendingDonations, completedDonations, urgentDonations,] = await Promise.all([
        User_model_1.UserModel.countDocuments({ role: 'DONOR' }),
        User_model_1.UserModel.countDocuments({ role: 'NGO' }),
        Donation_model_1.DonationModel.countDocuments(),
        Contribution_model_1.ContributionModel.countDocuments({ status: { $in: ['APPROVED', 'COMPLETED'] } }),
        Donation_model_1.DonationModel.aggregate([
            { $match: { status: 'COMPLETED' } },
            { $group: { _id: null, total: { $sum: '$quantityOrAmount' } } },
        ]),
        Donation_model_1.DonationModel.countDocuments({ status: 'PENDING' }),
        Donation_model_1.DonationModel.countDocuments({ status: 'COMPLETED' }),
        Donation_model_1.DonationModel.countDocuments({ priority: 'URGENT', status: { $ne: 'COMPLETED' } }),
    ]);
    const stats = {
        users: {
            totalDonors,
            totalNgos,
            totalUsers: totalDonors + totalNgos,
        },
        donations: {
            total: totalDonations,
            pending: pendingDonations,
            completed: completedDonations,
            urgent: urgentDonations,
        },
        contributions: {
            total: totalContributions,
            totalAmountDonated: ((_a = totalAmountDonated[0]) === null || _a === void 0 ? void 0 : _a.total) || 0,
        },
    };
    return (0, response_1.sendSuccess)(res, stats, 'Platform stats fetched');
};
exports.getPlatformStats = getPlatformStats;
/**
 * Get donor's personal analytics
 */
const getDonorStats = async (req, res) => {
    var _a;
    const donorId = req.user.id;
    const [totalContributions, approvedContributions, completedContributions, pendingContributions, totalAmount, recentContributions,] = await Promise.all([
        Contribution_model_1.ContributionModel.countDocuments({ donorId }),
        Contribution_model_1.ContributionModel.countDocuments({ donorId, status: 'APPROVED' }),
        Contribution_model_1.ContributionModel.countDocuments({ donorId, status: 'COMPLETED' }),
        Contribution_model_1.ContributionModel.countDocuments({ donorId, status: 'PENDING' }),
        Contribution_model_1.ContributionModel.aggregate([
            { $match: { donorId: donorId, status: { $in: ['APPROVED', 'COMPLETED'] } } },
            {
                $lookup: {
                    from: 'donations',
                    localField: 'donationId',
                    foreignField: '_id',
                    as: 'donation',
                },
            },
            { $unwind: '$donation' },
            { $group: { _id: null, total: { $sum: '$donation.quantityOrAmount' } } },
        ]),
        Contribution_model_1.ContributionModel.find({ donorId })
            .populate('donationId')
            .sort({ createdAt: -1 })
            .limit(5),
    ]);
    const stats = {
        contributions: {
            total: totalContributions,
            approved: approvedContributions,
            completed: completedContributions,
            pending: pendingContributions,
        },
        totalAmountContributed: ((_a = totalAmount[0]) === null || _a === void 0 ? void 0 : _a.total) || 0,
        recentContributions,
    };
    return (0, response_1.sendSuccess)(res, stats, 'Donor stats fetched');
};
exports.getDonorStats = getDonorStats;
/**
 * Get NGO's analytics
 */
const getNgoStats = async (req, res) => {
    var _a;
    const ngoId = req.user.id;
    const [totalDonations, pendingDonations, confirmedDonations, completedDonations, totalContributions, totalAmount, recentDonations,] = await Promise.all([
        Donation_model_1.DonationModel.countDocuments({ ngoId }),
        Donation_model_1.DonationModel.countDocuments({ ngoId, status: 'PENDING' }),
        Donation_model_1.DonationModel.countDocuments({ ngoId, status: 'CONFIRMED' }),
        Donation_model_1.DonationModel.countDocuments({ ngoId, status: 'COMPLETED' }),
        Donation_model_1.DonationModel.find({ ngoId }).select('_id').then((donations) => {
            const donationIds = donations.map((d) => d._id);
            return Contribution_model_1.ContributionModel.countDocuments({ donationId: { $in: donationIds } });
        }),
        Donation_model_1.DonationModel.aggregate([
            { $match: { ngoId: ngoId, status: 'COMPLETED' } },
            { $group: { _id: null, total: { $sum: '$quantityOrAmount' } } },
        ]),
        Donation_model_1.DonationModel.find({ ngoId }).sort({ createdAt: -1 }).limit(5),
    ]);
    const stats = {
        donations: {
            total: totalDonations,
            pending: pendingDonations,
            confirmed: confirmedDonations,
            completed: completedDonations,
        },
        contributions: {
            total: totalContributions,
        },
        totalAmountReceived: ((_a = totalAmount[0]) === null || _a === void 0 ? void 0 : _a.total) || 0,
        recentDonations,
    };
    return (0, response_1.sendSuccess)(res, stats, 'NGO stats fetched');
};
exports.getNgoStats = getNgoStats;

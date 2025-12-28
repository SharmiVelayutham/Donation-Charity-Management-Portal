"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNgoLeaderboard = exports.getDonorLeaderboard = void 0;
const response_1 = require("../utils/response");
const getDonorLeaderboard = async (req, res) => {
    const { period = 'all' } = req.query; // all, monthly, weekly
    let dateFilter = null;
    const now = new Date();
    if (period === 'monthly') {
        dateFilter = new Date(now.getFullYear(), now.getMonth(), 1);
    }
    else if (period === 'weekly') {
        const dayOfWeek = now.getDay();
        const diff = now.getDate() - dayOfWeek; // Sunday
        dateFilter = new Date(now.setDate(diff));
        dateFilter.setHours(0, 0, 0, 0);
    }
    const matchFilter = {
        status: { $in: ['APPROVED', 'COMPLETED'] }, // Only count approved/completed contributions
    };
    if (dateFilter) {
        matchFilter.createdAt = { $gte: dateFilter };
    }
    const leaderboard = await Contribution_model_1.ContributionModel.aggregate([
        { $match: matchFilter },
        {
            $lookup: {
                from: 'donations',
                localField: 'donationId',
                foreignField: '_id',
                as: 'donation',
            },
        },
        { $unwind: '$donation' },
        {
            $group: {
                _id: '$donorId',
                totalContributions: { $sum: 1 },
                totalAmount: { $sum: '$donation.quantityOrAmount' },
                completedContributions: {
                    $sum: { $cond: [{ $eq: ['$status', 'COMPLETED'] }, 1, 0] },
                },
                lastContributionDate: { $max: '$createdAt' },
            },
        },
        {
            $lookup: {
                from: 'users',
                localField: '_id',
                foreignField: '_id',
                as: 'donor',
            },
        },
        { $unwind: '$donor' },
        {
            $project: {
                donorId: '$_id',
                donorName: '$donor.name',
                donorEmail: '$donor.email',
                totalContributions: 1,
                totalAmount: 1,
                completedContributions: 1,
                lastContributionDate: 1,
                _id: 0,
            },
        },
        { $sort: { totalContributions: -1, totalAmount: -1 } },
        { $limit: 100 }, // Top 100 donors
    ]);
    const rankedLeaderboard = leaderboard.map((donor, index) => ({
        rank: index + 1,
        ...donor,
    }));
    return (0, response_1.sendSuccess)(res, { period, leaderboard: rankedLeaderboard }, 'Leaderboard fetched');
};
exports.getDonorLeaderboard = getDonorLeaderboard;
const getNgoLeaderboard = async (req, res) => {
    const { period = 'all' } = req.query;
    let dateFilter = null;
    const now = new Date();
    if (period === 'monthly') {
        dateFilter = new Date(now.getFullYear(), now.getMonth(), 1);
    }
    else if (period === 'weekly') {
        const dayOfWeek = now.getDay();
        const diff = now.getDate() - dayOfWeek;
        dateFilter = new Date(now.setDate(diff));
        dateFilter.setHours(0, 0, 0, 0);
    }
    const matchFilter = {};
    if (dateFilter) {
        matchFilter.createdAt = { $gte: dateFilter };
    }
    const leaderboard = await Donation_model_1.DonationModel.aggregate([
        { $match: matchFilter },
        {
            $group: {
                _id: '$ngoId',
                totalDonations: { $sum: 1 },
                totalAmount: { $sum: '$quantityOrAmount' },
                completedDonations: {
                    $sum: { $cond: [{ $eq: ['$status', 'COMPLETED'] }, 1, 0] },
                },
                urgentDonations: {
                    $sum: { $cond: [{ $eq: ['$priority', 'URGENT'] }, 1, 0] },
                },
            },
        },
        {
            $lookup: {
                from: 'users',
                localField: '_id',
                foreignField: '_id',
                as: 'ngo',
            },
        },
        { $unwind: '$ngo' },
        {
            $project: {
                ngoId: '$_id',
                ngoName: '$ngo.name',
                ngoEmail: '$ngo.email',
                contactInfo: '$ngo.contactInfo',
                totalDonations: 1,
                totalAmount: 1,
                completedDonations: 1,
                urgentDonations: 1,
                _id: 0,
            },
        },
        { $sort: { totalDonations: -1, totalAmount: -1 } },
        { $limit: 50 },
    ]);
    const rankedLeaderboard = leaderboard.map((ngo, index) => ({
        rank: index + 1,
        ...ngo,
    }));
    return (0, response_1.sendSuccess)(res, { period, leaderboard: rankedLeaderboard }, 'NGO leaderboard fetched');
};
exports.getNgoLeaderboard = getNgoLeaderboard;

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDonorDashboardStats = exports.getNgoDashboardStats = void 0;
const response_1 = require("../utils/response");
const mysql_1 = require("../config/mysql");
/**
 * Get NGO dashboard statistics (Real-Time)
 * GET /api/ngo/dashboard-stats
 *
 * Returns:
 * - totalDonationRequests: Count of donation requests created by this NGO
 * - totalDonors: Count of distinct donors who contributed to this NGO's requests
 */
const getNgoDashboardStats = async (req, res) => {
    try {
        const ngoId = parseInt(req.user.id);
        // Count total donation requests created by this NGO
        const totalRequestsResult = await (0, mysql_1.queryOne)('SELECT COUNT(*) as count FROM donation_requests WHERE ngo_id = ?', [ngoId]);
        // Count distinct donors who contributed to this NGO's donation requests
        const totalDonorsResult = await (0, mysql_1.queryOne)(`SELECT COUNT(DISTINCT drc.donor_id) as count
       FROM donation_request_contributions drc
       INNER JOIN donation_requests dr ON drc.request_id = dr.id
       WHERE dr.ngo_id = ?`, [ngoId]);
        const stats = {
            totalDonationRequests: (totalRequestsResult === null || totalRequestsResult === void 0 ? void 0 : totalRequestsResult.count) || 0,
            totalDonors: (totalDonorsResult === null || totalDonorsResult === void 0 ? void 0 : totalDonorsResult.count) || 0,
        };
        return (0, response_1.sendSuccess)(res, stats, 'NGO dashboard stats fetched successfully');
    }
    catch (error) {
        console.error('Error fetching NGO dashboard stats:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to fetch NGO dashboard stats',
        });
    }
};
exports.getNgoDashboardStats = getNgoDashboardStats;
/**
 * Get Donor dashboard statistics (Real-Time)
 * GET /api/donor/dashboard-stats
 *
 * Returns:
 * - totalDonations: Count of times this donor has contributed
 */
const getDonorDashboardStats = async (req, res) => {
    try {
        const donorId = parseInt(req.user.id);
        // Count total contributions by this donor
        const totalDonationsResult = await (0, mysql_1.queryOne)('SELECT COUNT(*) as count FROM donation_request_contributions WHERE donor_id = ?', [donorId]);
        const stats = {
            totalDonations: (totalDonationsResult === null || totalDonationsResult === void 0 ? void 0 : totalDonationsResult.count) || 0,
        };
        return (0, response_1.sendSuccess)(res, stats, 'Donor dashboard stats fetched successfully');
    }
    catch (error) {
        console.error('Error fetching Donor dashboard stats:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to fetch Donor dashboard stats',
        });
    }
};
exports.getDonorDashboardStats = getDonorDashboardStats;

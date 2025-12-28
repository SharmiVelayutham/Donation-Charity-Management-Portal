"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPlatformStats = void 0;
const mysql_1 = require("../config/mysql");
const response_1 = require("../utils/response");
const getPlatformStats = async (req, res) => {
    try {
        const totalDonationsResult = await (0, mysql_1.queryOne)('SELECT COUNT(*) as count FROM donation_requests WHERE status = "ACTIVE"');
        const totalDonations = (totalDonationsResult === null || totalDonationsResult === void 0 ? void 0 : totalDonationsResult.count) || 0;
        const activeNGOsResult = await (0, mysql_1.queryOne)(`SELECT COUNT(*) as count 
       FROM users 
       WHERE role = 'NGO' 
       AND verification_status = 'VERIFIED' 
       AND is_blocked = 0`);
        const activeNGOs = (activeNGOsResult === null || activeNGOsResult === void 0 ? void 0 : activeNGOsResult.count) || 0;
        const activeDonorsResult = await (0, mysql_1.queryOne)(`SELECT COUNT(*) as count 
       FROM donors 
       WHERE is_blocked = 0 OR is_blocked IS NULL`);
        const activeDonors = (activeDonorsResult === null || activeDonorsResult === void 0 ? void 0 : activeDonorsResult.count) || 0;
        const stats = {
            totalDonations,
            activeNGOs,
            activeDonors
        };
        return (0, response_1.sendSuccess)(res, stats, 'Platform stats fetched successfully');
    }
    catch (error) {
        console.error('[Platform Stats] Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch platform stats',
            error: error.message
        });
    }
};
exports.getPlatformStats = getPlatformStats;

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.unblockDonor = exports.blockDonor = exports.unblockNgo = exports.blockNgo = exports.getDonorDetails = exports.getNgoDetails = exports.getAllDonors = exports.getAllNgos = void 0;
const response_1 = require("../utils/response");
const mysql_1 = require("../config/mysql");
/**
 * Get all NGOs with detailed information
 * GET /api/admin/dashboard/ngos
 */
const getAllNgos = async (req, res) => {
    try {
        const { isBlocked, search } = req.query;
        let sql = 'SELECT id, name, email, contact_info, role, is_blocked, created_at FROM users WHERE 1=1';
        const params = [];
        if (isBlocked !== undefined) {
            sql += ' AND is_blocked = ?';
            params.push(isBlocked === 'true' ? 1 : 0);
        }
        if (search) {
            sql += ' AND (name LIKE ? OR email LIKE ? OR contact_info LIKE ?)';
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm, searchTerm);
        }
        sql += ' ORDER BY created_at DESC';
        const ngos = await (0, mysql_1.query)(sql, params);
        // Add donation statistics for each NGO
        const ngosWithStats = await Promise.all(ngos.map(async (ngo) => {
            const donationCountResult = await (0, mysql_1.queryOne)('SELECT COUNT(*) as count FROM donations WHERE ngo_id = ?', [ngo.id]);
            const donationCount = (donationCountResult === null || donationCountResult === void 0 ? void 0 : donationCountResult.count) || 0;
            const contributionCountResult = await (0, mysql_1.queryOne)(`SELECT COUNT(*) as count 
           FROM contributions c
           INNER JOIN donations d ON c.donation_id = d.id
           WHERE d.ngo_id = ?`, [ngo.id]);
            const totalContributions = (contributionCountResult === null || contributionCountResult === void 0 ? void 0 : contributionCountResult.count) || 0;
            return {
                id: ngo.id,
                name: ngo.name,
                email: ngo.email,
                contactInfo: ngo.contact_info,
                role: ngo.role,
                isBlocked: ngo.is_blocked === 1,
                createdAt: ngo.created_at,
                statistics: {
                    totalDonations: donationCount,
                    totalContributions,
                },
            };
        }));
        return (0, response_1.sendSuccess)(res, { count: ngosWithStats.length, ngos: ngosWithStats }, 'NGOs fetched successfully');
    }
    catch (error) {
        return res.status(500).json({ success: false, message: error.message || 'Failed to fetch NGOs' });
    }
};
exports.getAllNgos = getAllNgos;
/**
 * Get all Donors with detailed information
 * GET /api/admin/dashboard/donors
 */
const getAllDonors = async (req, res) => {
    try {
        const { isBlocked, search } = req.query;
        let sql = 'SELECT id, name, email, contact_info, phone_number, full_address, role, is_blocked, created_at FROM donors WHERE 1=1';
        const params = [];
        if (isBlocked !== undefined) {
            sql += ' AND is_blocked = ?';
            params.push(isBlocked === 'true' ? 1 : 0);
        }
        if (search) {
            sql += ' AND (name LIKE ? OR email LIKE ? OR contact_info LIKE ?)';
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm, searchTerm);
        }
        sql += ' ORDER BY created_at DESC';
        const donors = await (0, mysql_1.query)(sql, params);
        // Add contribution statistics for each donor
        const donorsWithStats = await Promise.all(donors.map(async (donor) => {
            const contributionCountResult = await (0, mysql_1.queryOne)('SELECT COUNT(*) as count FROM contributions WHERE donor_id = ?', [donor.id]);
            const contributionCount = (contributionCountResult === null || contributionCountResult === void 0 ? void 0 : contributionCountResult.count) || 0;
            const approvedContributionsResult = await (0, mysql_1.queryOne)('SELECT COUNT(*) as count FROM contributions WHERE donor_id = ? AND status IN (?, ?)', [donor.id, 'APPROVED', 'COMPLETED']);
            const approvedContributions = (approvedContributionsResult === null || approvedContributionsResult === void 0 ? void 0 : approvedContributionsResult.count) || 0;
            return {
                id: donor.id,
                name: donor.name,
                email: donor.email,
                contactInfo: donor.contact_info,
                phoneNumber: donor.phone_number,
                fullAddress: donor.full_address,
                role: donor.role,
                isBlocked: donor.is_blocked === 1,
                createdAt: donor.created_at,
                statistics: {
                    totalContributions: contributionCount,
                    approvedContributions,
                },
            };
        }));
        return (0, response_1.sendSuccess)(res, { count: donorsWithStats.length, donors: donorsWithStats }, 'Donors fetched successfully');
    }
    catch (error) {
        return res.status(500).json({ success: false, message: error.message || 'Failed to fetch donors' });
    }
};
exports.getAllDonors = getAllDonors;
/**
 * Get detailed information about a specific NGO
 * GET /api/admin/dashboard/ngos/:id
 */
const getNgoDetails = async (req, res) => {
    try {
        const { id } = req.params;
        const ngoId = parseInt(id);
        if (isNaN(ngoId)) {
            return res.status(400).json({ success: false, message: 'Invalid NGO id' });
        }
        const ngo = await (0, mysql_1.queryOne)('SELECT id, name, email, contact_info, role, is_blocked, created_at FROM users WHERE id = ?', [ngoId]);
        if (!ngo) {
            return res.status(404).json({ success: false, message: 'NGO not found' });
        }
        // Get all donations by this NGO
        const donations = await (0, mysql_1.query)('SELECT * FROM donations WHERE ngo_id = ? ORDER BY created_at DESC', [ngoId]);
        // Get contribution statistics
        const totalContributionsResult = await (0, mysql_1.queryOne)(`SELECT COUNT(*) as count 
       FROM contributions c
       INNER JOIN donations d ON c.donation_id = d.id
       WHERE d.ngo_id = ?`, [ngoId]);
        const totalContributions = (totalContributionsResult === null || totalContributionsResult === void 0 ? void 0 : totalContributionsResult.count) || 0;
        const ngoDetails = {
            id: ngo.id,
            name: ngo.name,
            email: ngo.email,
            contactInfo: ngo.contact_info,
            role: ngo.role,
            isBlocked: ngo.is_blocked === 1,
            createdAt: ngo.created_at,
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
    }
    catch (error) {
        return res.status(500).json({ success: false, message: error.message || 'Failed to fetch NGO details' });
    }
};
exports.getNgoDetails = getNgoDetails;
/**
 * Get detailed information about a specific Donor
 * GET /api/admin/dashboard/donors/:id
 */
const getDonorDetails = async (req, res) => {
    try {
        const { id } = req.params;
        const donorId = parseInt(id);
        if (isNaN(donorId)) {
            return res.status(400).json({ success: false, message: 'Invalid donor id' });
        }
        const donor = await (0, mysql_1.queryOne)('SELECT id, name, email, contact_info, phone_number, full_address, role, is_blocked, created_at FROM donors WHERE id = ?', [donorId]);
        if (!donor) {
            return res.status(404).json({ success: false, message: 'Donor not found' });
        }
        // Get all contributions by this donor with donation details
        const contributions = await (0, mysql_1.query)(`SELECT c.*, 
        d.donation_category, d.purpose, d.quantity_or_amount, d.status as donation_status,
        u.name as ngo_name, u.email as ngo_email
       FROM contributions c
       INNER JOIN donations d ON c.donation_id = d.id
       INNER JOIN users u ON d.ngo_id = u.id
       WHERE c.donor_id = ?
       ORDER BY c.created_at DESC`, [donorId]);
        const donorDetails = {
            id: donor.id,
            name: donor.name,
            email: donor.email,
            contactInfo: donor.contact_info,
            phoneNumber: donor.phone_number,
            fullAddress: donor.full_address,
            role: donor.role,
            isBlocked: donor.is_blocked === 1,
            createdAt: donor.created_at,
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
    }
    catch (error) {
        return res.status(500).json({ success: false, message: error.message || 'Failed to fetch donor details' });
    }
};
exports.getDonorDetails = getDonorDetails;
/**
 * Block an NGO
 * PUT /api/admin/dashboard/ngos/:id/block
 */
const blockNgo = async (req, res) => {
    try {
        const { id } = req.params;
        const ngoId = parseInt(id);
        if (isNaN(ngoId)) {
            return res.status(400).json({ success: false, message: 'Invalid NGO id' });
        }
        const affectedRows = await (0, mysql_1.update)('UPDATE users SET is_blocked = 1 WHERE id = ?', [ngoId]);
        if (affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'NGO not found' });
        }
        const ngo = await (0, mysql_1.queryOne)('SELECT id, name, email, contact_info, role, is_blocked, created_at FROM users WHERE id = ?', [ngoId]);
        return (0, response_1.sendSuccess)(res, {
            id: ngo.id,
            name: ngo.name,
            email: ngo.email,
            contactInfo: ngo.contact_info,
            role: ngo.role,
            isBlocked: true,
            createdAt: ngo.created_at,
        }, 'NGO blocked successfully');
    }
    catch (error) {
        return res.status(500).json({ success: false, message: error.message || 'Failed to block NGO' });
    }
};
exports.blockNgo = blockNgo;
/**
 * Unblock an NGO
 * PUT /api/admin/dashboard/ngos/:id/unblock
 */
const unblockNgo = async (req, res) => {
    try {
        const { id } = req.params;
        const ngoId = parseInt(id);
        if (isNaN(ngoId)) {
            return res.status(400).json({ success: false, message: 'Invalid NGO id' });
        }
        const affectedRows = await (0, mysql_1.update)('UPDATE users SET is_blocked = 0 WHERE id = ?', [ngoId]);
        if (affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'NGO not found' });
        }
        const ngo = await (0, mysql_1.queryOne)('SELECT id, name, email, contact_info, role, is_blocked, created_at FROM users WHERE id = ?', [ngoId]);
        return (0, response_1.sendSuccess)(res, {
            id: ngo.id,
            name: ngo.name,
            email: ngo.email,
            contactInfo: ngo.contact_info,
            role: ngo.role,
            isBlocked: false,
            createdAt: ngo.created_at,
        }, 'NGO unblocked successfully');
    }
    catch (error) {
        return res.status(500).json({ success: false, message: error.message || 'Failed to unblock NGO' });
    }
};
exports.unblockNgo = unblockNgo;
/**
 * Block a Donor
 * PUT /api/admin/dashboard/donors/:id/block
 */
const blockDonor = async (req, res) => {
    try {
        const { id } = req.params;
        const donorId = parseInt(id);
        if (isNaN(donorId)) {
            return res.status(400).json({ success: false, message: 'Invalid donor id' });
        }
        const affectedRows = await (0, mysql_1.update)('UPDATE donors SET is_blocked = 1 WHERE id = ?', [donorId]);
        if (affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Donor not found' });
        }
        const donor = await (0, mysql_1.queryOne)('SELECT id, name, email, contact_info, phone_number, full_address, role, is_blocked, created_at FROM donors WHERE id = ?', [donorId]);
        return (0, response_1.sendSuccess)(res, {
            id: donor.id,
            name: donor.name,
            email: donor.email,
            contactInfo: donor.contact_info,
            phoneNumber: donor.phone_number,
            fullAddress: donor.full_address,
            role: donor.role,
            isBlocked: true,
            createdAt: donor.created_at,
        }, 'Donor blocked successfully');
    }
    catch (error) {
        return res.status(500).json({ success: false, message: error.message || 'Failed to block donor' });
    }
};
exports.blockDonor = blockDonor;
/**
 * Unblock a Donor
 * PUT /api/admin/dashboard/donors/:id/unblock
 */
const unblockDonor = async (req, res) => {
    try {
        const { id } = req.params;
        const donorId = parseInt(id);
        if (isNaN(donorId)) {
            return res.status(400).json({ success: false, message: 'Invalid donor id' });
        }
        const affectedRows = await (0, mysql_1.update)('UPDATE donors SET is_blocked = 0 WHERE id = ?', [donorId]);
        if (affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Donor not found' });
        }
        const donor = await (0, mysql_1.queryOne)('SELECT id, name, email, contact_info, phone_number, full_address, role, is_blocked, created_at FROM donors WHERE id = ?', [donorId]);
        return (0, response_1.sendSuccess)(res, {
            id: donor.id,
            name: donor.name,
            email: donor.email,
            contactInfo: donor.contact_info,
            phoneNumber: donor.phone_number,
            fullAddress: donor.full_address,
            role: donor.role,
            isBlocked: false,
            createdAt: donor.created_at,
        }, 'Donor unblocked successfully');
    }
    catch (error) {
        return res.status(500).json({ success: false, message: error.message || 'Failed to unblock donor' });
    }
};
exports.unblockDonor = unblockDonor;

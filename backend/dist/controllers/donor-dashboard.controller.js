"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAvailableDonations = exports.getDonorDonationRequestContributions = exports.getDonorContributions = exports.updateDonorProfile = exports.getDonorProfile = exports.getDonorDashboard = void 0;
const response_1 = require("../utils/response");
const mysql_1 = require("../config/mysql");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const SALT_ROUNDS = 10;
/**
 * Get donor dashboard overview
 * GET /api/donor/dashboard
 */
const getDonorDashboard = async (req, res) => {
    try {
        const donorId = typeof req.user.id === 'string' ? parseInt(req.user.id) : req.user.id;
        // Get donor profile
        const donor = await (0, mysql_1.queryOne)('SELECT id, name, email, contact_info, phone_number, full_address, role, created_at FROM donors WHERE id = ?', [donorId]);
        if (!donor) {
            return res.status(404).json({ success: false, message: 'Donor not found' });
        }
        // Get statistics using SQL queries
        const [totalContributions, pendingContributions, approvedContributions, completedContributions, totalAmountResult,] = await Promise.all([
            (0, mysql_1.queryOne)('SELECT COUNT(*) as count FROM contributions WHERE donor_id = ?', [donorId]),
            (0, mysql_1.queryOne)('SELECT COUNT(*) as count FROM contributions WHERE donor_id = ? AND status = ?', [donorId, 'PENDING']),
            (0, mysql_1.queryOne)('SELECT COUNT(*) as count FROM contributions WHERE donor_id = ? AND status = ?', [donorId, 'APPROVED']),
            (0, mysql_1.queryOne)('SELECT COUNT(*) as count FROM contributions WHERE donor_id = ? AND status = ?', [donorId, 'COMPLETED']),
            (0, mysql_1.queryOne)(`
        SELECT COALESCE(SUM(d.quantity_or_amount), 0) as total
        FROM contributions c
        INNER JOIN donations d ON c.donation_id = d.id
        WHERE c.donor_id = ? AND c.status IN ('APPROVED', 'COMPLETED')
      `, [donorId]),
        ]);
        // Get recent contributions
        const recentContributions = await (0, mysql_1.query)(`
      SELECT c.*,
        d.donation_category, d.purpose, d.quantity_or_amount, d.status as donation_status,
        u.name as ngo_name, u.email as ngo_email, u.contact_info as ngo_contact_info
      FROM contributions c
      INNER JOIN donations d ON c.donation_id = d.id
      INNER JOIN users u ON d.ngo_id = u.id
      WHERE c.donor_id = ?
      ORDER BY c.created_at DESC
      LIMIT 5
    `, [donorId]);
        // Get upcoming pickups
        const upcomingPickups = await (0, mysql_1.query)(`
      SELECT c.*,
        d.donation_category, d.purpose, d.quantity_or_amount,
        u.name as ngo_name, u.email as ngo_email, u.contact_info as ngo_contact_info
      FROM contributions c
      INNER JOIN donations d ON c.donation_id = d.id
      INNER JOIN users u ON d.ngo_id = u.id
      WHERE c.donor_id = ?
        AND c.status IN ('APPROVED', 'PENDING')
        AND c.pickup_scheduled_date_time >= NOW()
      ORDER BY c.pickup_scheduled_date_time ASC
      LIMIT 5
    `, [donorId]);
        const dashboard = {
            profile: {
                id: donor.id,
                name: donor.name,
                email: donor.email,
                contactInfo: donor.contact_info,
                phoneNumber: donor.phone_number,
                fullAddress: donor.full_address,
                role: donor.role,
                createdAt: donor.created_at,
            },
            statistics: {
                contributions: {
                    total: (totalContributions === null || totalContributions === void 0 ? void 0 : totalContributions.count) || 0,
                    pending: (pendingContributions === null || pendingContributions === void 0 ? void 0 : pendingContributions.count) || 0,
                    approved: (approvedContributions === null || approvedContributions === void 0 ? void 0 : approvedContributions.count) || 0,
                    completed: (completedContributions === null || completedContributions === void 0 ? void 0 : completedContributions.count) || 0,
                },
                totalAmountContributed: (totalAmountResult === null || totalAmountResult === void 0 ? void 0 : totalAmountResult.total) || 0,
            },
            recentContributions: recentContributions || [],
            upcomingPickups: upcomingPickups || [],
            // Frontend expects these fields
            contributions: recentContributions || [],
            totalContributions: (totalContributions === null || totalContributions === void 0 ? void 0 : totalContributions.count) || 0,
        };
        return (0, response_1.sendSuccess)(res, dashboard, 'Donor dashboard fetched successfully');
    }
    catch (error) {
        console.error('Donor Dashboard Error:', error);
        return res.status(500).json({ success: false, message: error.message || 'Failed to fetch dashboard' });
    }
};
exports.getDonorDashboard = getDonorDashboard;
/**
 * Get donor profile
 * GET /api/donor/dashboard/profile
 */
const getDonorProfile = async (req, res) => {
    try {
        const donorId = typeof req.user.id === 'string' ? parseInt(req.user.id) : req.user.id;
        const donor = await (0, mysql_1.queryOne)('SELECT id, name, email, contact_info, phone_number, full_address, role, created_at FROM donors WHERE id = ?', [donorId]);
        if (!donor) {
            return res.status(404).json({ success: false, message: 'Donor not found' });
        }
        return (0, response_1.sendSuccess)(res, {
            id: donor.id,
            name: donor.name,
            email: donor.email,
            contactInfo: donor.contact_info,
            phoneNumber: donor.phone_number,
            fullAddress: donor.full_address,
            role: donor.role,
            createdAt: donor.created_at,
        }, 'Donor profile fetched successfully');
    }
    catch (error) {
        return res.status(500).json({ success: false, message: error.message || 'Failed to fetch profile' });
    }
};
exports.getDonorProfile = getDonorProfile;
/**
 * Update donor profile
 * PUT /api/donor/dashboard/profile
 */
const updateDonorProfile = async (req, res) => {
    try {
        const donorId = typeof req.user.id === 'string' ? parseInt(req.user.id) : req.user.id;
        const { name, contactInfo, password, phoneNumber, fullAddress } = req.body;
        const updates = [];
        const params = [];
        if (name) {
            updates.push('name = ?');
            params.push(name.trim());
        }
        if (contactInfo) {
            updates.push('contact_info = ?');
            params.push(contactInfo.trim());
        }
        if (phoneNumber !== undefined) {
            updates.push('phone_number = ?');
            params.push((phoneNumber === null || phoneNumber === void 0 ? void 0 : phoneNumber.trim()) || null);
        }
        if (fullAddress !== undefined) {
            updates.push('full_address = ?');
            params.push((fullAddress === null || fullAddress === void 0 ? void 0 : fullAddress.trim()) || null);
        }
        if (password) {
            if (password.length < 6) {
                return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
            }
            const hashed = await bcryptjs_1.default.hash(password, SALT_ROUNDS);
            updates.push('password = ?');
            params.push(hashed);
        }
        if (updates.length === 0) {
            return res.status(400).json({ success: false, message: 'No fields to update' });
        }
        params.push(donorId);
        const sql = `UPDATE donors SET ${updates.join(', ')} WHERE id = ?`;
        await (0, mysql_1.update)(sql, params);
        const updated = await (0, mysql_1.queryOne)('SELECT id, name, email, contact_info, phone_number, full_address, role, created_at FROM donors WHERE id = ?', [donorId]);
        return (0, response_1.sendSuccess)(res, {
            id: updated.id,
            name: updated.name,
            email: updated.email,
            contactInfo: updated.contact_info,
            phoneNumber: updated.phone_number,
            fullAddress: updated.full_address,
            role: updated.role,
            createdAt: updated.created_at,
        }, 'Profile updated successfully');
    }
    catch (error) {
        return res.status(500).json({ success: false, message: error.message || 'Failed to update profile' });
    }
};
exports.updateDonorProfile = updateDonorProfile;
/**
 * Get all contributions with filters
 * GET /api/donor/dashboard/contributions
 */
const getDonorContributions = async (req, res) => {
    try {
        const donorId = typeof req.user.id === 'string' ? parseInt(req.user.id) : req.user.id;
        const { status, limit = 20, page = 1 } = req.query;
        let sql = `
      SELECT c.*,
        d.donation_category, d.purpose, d.quantity_or_amount, d.status as donation_status,
        u.name as ngo_name, u.email as ngo_email, u.contact_info as ngo_contact_info
      FROM contributions c
      INNER JOIN donations d ON c.donation_id = d.id
      INNER JOIN users u ON d.ngo_id = u.id
      WHERE c.donor_id = ?
    `;
        const params = [donorId];
        if (status) {
            sql += ' AND c.status = ?';
            params.push(status);
        }
        sql += ' ORDER BY c.created_at DESC';
        const offset = (Number(page) - 1) * Number(limit);
        sql += ' LIMIT ? OFFSET ?';
        params.push(Number(limit), offset);
        const contributions = await (0, mysql_1.query)(sql, params);
        // Get total count
        let countSql = 'SELECT COUNT(*) as total FROM contributions WHERE donor_id = ?';
        const countParams = [donorId];
        if (status) {
            countSql += ' AND status = ?';
            countParams.push(status);
        }
        const totalResult = await (0, mysql_1.queryOne)(countSql, countParams);
        const total = (totalResult === null || totalResult === void 0 ? void 0 : totalResult.total) || 0;
        return (0, response_1.sendSuccess)(res, {
            contributions: contributions || [],
            pagination: {
                total,
                page: Number(page),
                limit: Number(limit),
                totalPages: Math.ceil(total / Number(limit)),
            },
        }, 'Contributions fetched successfully');
    }
    catch (error) {
        return res.status(500).json({ success: false, message: error.message || 'Failed to fetch contributions' });
    }
};
exports.getDonorContributions = getDonorContributions;
/**
 * Get donor's donation request contributions (new system)
 * GET /api/donor/dashboard/donation-request-contributions
 */
const getDonorDonationRequestContributions = async (req, res) => {
    try {
        const donorId = typeof req.user.id === 'string' ? parseInt(req.user.id) : req.user.id;
        // Get all contributions to donation requests
        const contributions = await (0, mysql_1.query)(`
      SELECT 
        drc.id as contribution_id,
        drc.quantity_or_amount,
        drc.pickup_location,
        drc.pickup_date,
        drc.pickup_time,
        drc.notes,
        drc.status,
        drc.created_at as contribution_date,
        dr.id as request_id,
        dr.donation_type,
        dr.description as request_description,
        dr.ngo_name,
        u.name as ngo_organization_name,
        u.email as ngo_email,
        u.contact_info as ngo_contact
      FROM donation_request_contributions drc
      INNER JOIN donation_requests dr ON drc.request_id = dr.id
      INNER JOIN users u ON dr.ngo_id = u.id
      WHERE drc.donor_id = ?
      ORDER BY drc.created_at DESC
    `, [donorId]);
        // Format the response
        const formattedContributions = contributions.map((cont) => ({
            contributionId: cont.contribution_id,
            requestId: cont.request_id,
            donationType: cont.donation_type,
            quantityOrAmount: parseFloat(cont.quantity_or_amount),
            status: cont.status,
            contributionDate: cont.contribution_date,
            pickupLocation: cont.pickup_location,
            pickupDate: cont.pickup_date,
            pickupTime: cont.pickup_time,
            notes: cont.notes,
            request: {
                id: cont.request_id,
                description: cont.request_description
            },
            ngo: {
                name: cont.ngo_organization_name || cont.ngo_name,
                email: cont.ngo_email,
                contact: cont.ngo_contact
            }
        }));
        return (0, response_1.sendSuccess)(res, formattedContributions, 'Donation request contributions fetched successfully');
    }
    catch (error) {
        console.error('Error fetching donor donation request contributions:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to fetch donation request contributions'
        });
    }
};
exports.getDonorDonationRequestContributions = getDonorDonationRequestContributions;
/**
 * Get available donations to contribute
 * GET /api/donor/dashboard/available-donations
 */
const getAvailableDonations = async (req, res) => {
    try {
        const { status, priority, donationCategory, search, limit = 20, page = 1 } = req.query;
        let sql = `
      SELECT d.*,
        u.name as ngo_name, u.email as ngo_email, u.contact_info as ngo_contact_info,
        (SELECT COUNT(*) FROM donation_images di WHERE di.donation_id = d.id) as image_count,
        (SELECT COUNT(*) FROM contributions c WHERE c.donation_id = d.id) as contribution_count
      FROM donations d
      INNER JOIN users u ON d.ngo_id = u.id
      WHERE d.status != 'CANCELLED'
    `;
        const params = [];
        if (status) {
            sql += ' AND d.status = ?';
            params.push(status);
        }
        if (priority) {
            sql += ' AND d.priority = ?';
            params.push(priority);
        }
        if (donationCategory) {
            sql += ' AND d.donation_category = ?';
            params.push(donationCategory);
        }
        if (search) {
            sql += ' AND (d.donation_type LIKE ? OR d.purpose LIKE ? OR d.description LIKE ?)';
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm, searchTerm);
        }
        sql += ' ORDER BY d.created_at DESC';
        const offset = (Number(page) - 1) * Number(limit);
        sql += ' LIMIT ? OFFSET ?';
        params.push(Number(limit), offset);
        const donations = await (0, mysql_1.query)(sql, params);
        // Get total count
        let countSql = 'SELECT COUNT(*) as total FROM donations WHERE status != ?';
        const countParams = ['CANCELLED'];
        if (status) {
            countSql += ' AND status = ?';
            countParams.push(status);
        }
        if (priority) {
            countSql += ' AND priority = ?';
            countParams.push(priority);
        }
        if (donationCategory) {
            countSql += ' AND donation_category = ?';
            countParams.push(donationCategory);
        }
        if (search) {
            countSql += ' AND (donation_type LIKE ? OR purpose LIKE ? OR description LIKE ?)';
            const searchTerm = `%${search}%`;
            countParams.push(searchTerm, searchTerm, searchTerm);
        }
        const totalResult = await (0, mysql_1.queryOne)(countSql, countParams);
        const total = (totalResult === null || totalResult === void 0 ? void 0 : totalResult.total) || 0;
        return (0, response_1.sendSuccess)(res, {
            donations: donations || [],
            pagination: {
                total,
                page: Number(page),
                limit: Number(limit),
                totalPages: Math.ceil(total / Number(limit)),
            },
        }, 'Available donations fetched successfully');
    }
    catch (error) {
        return res.status(500).json({ success: false, message: error.message || 'Failed to fetch donations' });
    }
};
exports.getAvailableDonations = getAvailableDonations;

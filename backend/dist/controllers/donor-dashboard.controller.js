"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.downloadReceipt = exports.getAvailableDonations = exports.getDonorDashboardStats = exports.getDonorDonationRequestContributions = exports.getDonorContributions = exports.updateDonorProfile = exports.getDonorProfile = exports.getDonorDashboard = void 0;
const response_1 = require("../utils/response");
const mysql_1 = require("../config/mysql");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const SALT_ROUNDS = 10;
const getDonorDashboard = async (req, res) => {
    try {
        const donorId = typeof req.user.id === 'string' ? parseInt(req.user.id) : req.user.id;
        const donor = await (0, mysql_1.queryOne)('SELECT id, name, email, contact_info, phone_number, full_address, role, created_at FROM donors WHERE id = ?', [donorId]);
        if (!donor) {
            return res.status(404).json({ success: false, message: 'Donor not found' });
        }
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
const getDonorDonationRequestContributions = async (req, res) => {
    try {
        const donorId = typeof req.user.id === 'string' ? parseInt(req.user.id) : req.user.id;
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
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
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
const getDonorDashboardStats = async (req, res) => {
    try {
        const donorId = typeof req.user.id === 'string' ? parseInt(req.user.id) : req.user.id;
        const donor = await (0, mysql_1.queryOne)('SELECT created_at FROM donors WHERE id = ?', [donorId]);
        const [totalDonationsResult, totalFundsResult, donationTypesResult, lastDonationResult] = await Promise.all([
            (0, mysql_1.queryOne)('SELECT COUNT(*) as count FROM donation_request_contributions WHERE donor_id = ?', [donorId]),
            (0, mysql_1.queryOne)(`
        SELECT COALESCE(SUM(drc.quantity_or_amount), 0) as total
        FROM donation_request_contributions drc
        INNER JOIN donation_requests dr ON drc.request_id = dr.id
        WHERE drc.donor_id = ? 
          AND dr.donation_type IN ('FUNDS', 'MONEY')
      `, [donorId]),
            (0, mysql_1.query)(`
        SELECT 
          dr.donation_type,
          COUNT(*) as count
        FROM donation_request_contributions drc
        INNER JOIN donation_requests dr ON drc.request_id = dr.id
        WHERE drc.donor_id = ?
        GROUP BY dr.donation_type
      `, [donorId]),
            (0, mysql_1.queryOne)(`
        SELECT MAX(drc.created_at) as last_donation
        FROM donation_request_contributions drc
        WHERE drc.donor_id = ?
      `, [donorId])
        ]);
        const donorSince = (donor === null || donor === void 0 ? void 0 : donor.created_at) ? new Date(donor.created_at) : new Date();
        const monthsDiff = Math.floor((new Date().getTime() - donorSince.getTime()) / (1000 * 60 * 60 * 24 * 30));
        let lastDonatedText = 'Never';
        if (lastDonationResult === null || lastDonationResult === void 0 ? void 0 : lastDonationResult.last_donation) {
            const lastDonation = new Date(lastDonationResult.last_donation);
            const now = new Date();
            const diffMs = now.getTime() - lastDonation.getTime();
            const diffMins = Math.floor(diffMs / (1000 * 60));
            const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
            if (diffMins < 60) {
                lastDonatedText = `${diffMins} mins ago`;
            }
            else if (diffHours < 24) {
                lastDonatedText = `${diffHours} hours ago`;
            }
            else {
                lastDonatedText = `${diffDays} days ago`;
            }
        }
        const donationTypes = (donationTypesResult || []).map((item) => ({
            type: item.donation_type,
            count: item.count
        }));
        const stats = {
            numberOfDonations: (totalDonationsResult === null || totalDonationsResult === void 0 ? void 0 : totalDonationsResult.count) || 0,
            totalFunds: (totalFundsResult === null || totalFundsResult === void 0 ? void 0 : totalFundsResult.total) || 0,
            donationTypes: donationTypes,
            lastDonated: lastDonatedText,
            donorForMonths: monthsDiff
        };
        return (0, response_1.sendSuccess)(res, stats, 'Donor dashboard stats fetched successfully');
    }
    catch (error) {
        console.error('Error fetching donor dashboard stats:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to fetch dashboard stats'
        });
    }
};
exports.getDonorDashboardStats = getDonorDashboardStats;
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
const downloadReceipt = async (req, res) => {
    try {
        const { id } = req.params;
        const contributionId = parseInt(id);
        const donorId = typeof req.user.id === 'string' ? parseInt(req.user.id) : req.user.id;
        if (isNaN(contributionId)) {
            return res.status(400).json({ success: false, message: 'Invalid contribution id' });
        }
        const contribution = await (0, mysql_1.queryOne)(`
      SELECT 
        drc.id as contribution_id,
        drc.quantity_or_amount,
        drc.status,
        drc.created_at as contribution_date,
        dr.donation_type,
        dr.description as request_description,
        dr.ngo_name,
        u.name as ngo_organization_name,
        u.email as ngo_email,
        u.contact_info as ngo_contact,
        d.name as donor_name,
        d.email as donor_email
      FROM donation_request_contributions drc
      INNER JOIN donation_requests dr ON drc.request_id = dr.id
      INNER JOIN users u ON dr.ngo_id = u.id
      INNER JOIN donors d ON drc.donor_id = d.id
      WHERE drc.id = ? AND drc.donor_id = ?
    `, [contributionId, donorId]);
        if (!contribution) {
            return res.status(404).json({ success: false, message: 'Contribution not found' });
        }
        if (!['ACCEPTED', 'APPROVED', 'COMPLETED'].includes(contribution.status)) {
            return res.status(400).json({
                success: false,
                message: 'Receipt can only be generated for received donations'
            });
        }
        const receiptDate = new Date(contribution.contribution_date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        const receiptHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Donation Receipt #${contribution.contribution_id}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 40px; max-width: 600px; margin: 0 auto; }
    .header { text-align: center; border-bottom: 2px solid #14b8a6; padding-bottom: 20px; margin-bottom: 30px; }
    .header h1 { color: #14b8a6; margin: 0; }
    .section { margin-bottom: 25px; }
    .section-title { font-weight: bold; color: #333; margin-bottom: 10px; font-size: 14px; text-transform: uppercase; }
    .section-content { color: #666; line-height: 1.6; }
    .row { display: flex; justify-content: space-between; margin-bottom: 8px; }
    .amount { font-size: 24px; font-weight: bold; color: #14b8a6; margin: 20px 0; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; color: #999; font-size: 12px; }
    .status { display: inline-block; padding: 5px 15px; background: #14b8a6; color: white; border-radius: 20px; font-size: 12px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>DONATION RECEIPT</h1>
    <p>Receipt #${contribution.contribution_id}</p>
  </div>

  <div class="section">
    <div class="section-title">Donation Details</div>
    <div class="section-content">
      <div class="row">
        <span>Date:</span>
        <span><strong>${receiptDate}</strong></span>
      </div>
      <div class="row">
        <span>Type:</span>
        <span><strong>${contribution.donation_type}</strong></span>
      </div>
      <div class="row">
        <span>${contribution.donation_type === 'FUNDS' ? 'Amount' : 'Quantity'}:</span>
        <span class="amount">${contribution.donation_type === 'FUNDS' ? `₹${parseFloat(contribution.quantity_or_amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : Math.round(parseFloat(contribution.quantity_or_amount)).toLocaleString('en-IN')}</span>
      </div>
      <div class="row">
        <span>Status:</span>
        <span class="status">Received</span>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Donor Information</div>
    <div class="section-content">
      <div class="row">
        <span>Name:</span>
        <span><strong>${contribution.donor_name}</strong></span>
      </div>
      <div class="row">
        <span>Email:</span>
        <span>${contribution.donor_email}</span>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">NGO Information</div>
    <div class="section-content">
      <div class="row">
        <span>Organization:</span>
        <span><strong>${contribution.ngo_organization_name || contribution.ngo_name}</strong></span>
      </div>
      <div class="row">
        <span>Contact:</span>
        <span>${contribution.ngo_contact || 'N/A'}</span>
      </div>
    </div>
  </div>

  <div class="footer">
    <p>This is an official receipt for your donation. Please keep this for your records.</p>
    <p>Generated on ${new Date().toLocaleString('en-US')}</p>
  </div>
</body>
</html>
    `;
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="receipt-${contributionId}.pdf"`);
        res.setHeader('Content-Type', 'text/html');
        res.setHeader('Content-Disposition', `attachment; filename="receipt-${contributionId}.html"`);
        res.send(receiptHtml);
    }
    catch (error) {
        console.error('Error generating receipt:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to generate receipt'
        });
    }
};
exports.downloadReceipt = downloadReceipt;

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDonorContributions = exports.getAllContributions = exports.getAllDonors = void 0;
const response_1 = require("../utils/response");
const mysql_1 = require("../config/mysql");
/**
 * Get all donors with summary statistics
 * GET /api/admin/donors
 */
const getAllDonors = async (req, res) => {
    try {
        const { page = 1, limit = 100, search } = req.query;
        const offset = (Number(page) - 1) * Number(limit);
        let sql = `
      SELECT 
        d.id as donor_id,
        d.name as donor_name,
        d.email as donor_email,
        d.role,
        d.is_blocked as status,
        d.created_at,
        COUNT(DISTINCT CASE WHEN c.id IS NOT NULL THEN c.id END) + 
        COUNT(DISTINCT CASE WHEN drc.id IS NOT NULL THEN drc.id END) as total_donations_count,
        COALESCE(SUM(CASE WHEN d2.quantity_or_amount IS NOT NULL THEN d2.quantity_or_amount ELSE 0 END), 0) + 
        COALESCE(SUM(CASE WHEN drc.quantity_or_amount IS NOT NULL THEN drc.quantity_or_amount ELSE 0 END), 0) as total_amount_donated
      FROM donors d
      LEFT JOIN contributions c ON d.id = c.donor_id
      LEFT JOIN donations d2 ON c.donation_id = d2.id
      LEFT JOIN donation_request_contributions drc ON d.id = drc.donor_id
    `;
        const params = [];
        if (search) {
            sql += ` WHERE (d.name LIKE ? OR d.email LIKE ?)`;
            params.push(`%${search}%`, `%${search}%`);
        }
        sql += ` 
      GROUP BY d.id, d.name, d.email, d.role, d.is_blocked, d.created_at
      ORDER BY d.created_at DESC
      LIMIT ? OFFSET ?
    `;
        params.push(Number(limit), offset);
        const donors = await (0, mysql_1.query)(sql, params);
        // Get total count
        let countSql = 'SELECT COUNT(DISTINCT d.id) as total FROM donors d';
        const countParams = [];
        if (search) {
            countSql += ` WHERE (d.name LIKE ? OR d.email LIKE ?)`;
            countParams.push(`%${search}%`, `%${search}%`);
        }
        const totalResult = await (0, mysql_1.queryOne)(countSql, countParams);
        const total = (totalResult === null || totalResult === void 0 ? void 0 : totalResult.total) || 0;
        const formattedDonors = donors.map((donor) => ({
            donorId: donor.donor_id,
            name: donor.donor_name,
            email: donor.donor_email,
            role: donor.role || 'DONOR',
            status: donor.status === 1 ? 'BLOCKED' : 'ACTIVE',
            createdAt: donor.created_at,
            statistics: {
                totalDonationsCount: Number(donor.total_donations_count) || 0,
                totalAmountDonated: Number(donor.total_amount_donated) || 0,
            },
        }));
        return (0, response_1.sendSuccess)(res, {
            donors: formattedDonors,
            pagination: {
                total,
                page: Number(page),
                limit: Number(limit),
                totalPages: Math.ceil(total / Number(limit)),
            },
        }, 'Donors fetched successfully');
    }
    catch (error) {
        console.error('Error fetching donors:', error);
        return res.status(500).json({ success: false, message: error.message || 'Failed to fetch donors' });
    }
};
exports.getAllDonors = getAllDonors;
/**
 * Get all contributions with donor, NGO, and donation details
 * GET /api/admin/contributions
 */
const getAllContributions = async (req, res) => {
    try {
        const { donorId, ngoId, donationType, fromDate, toDate, page = 1, limit = 100 } = req.query;
        const offset = (Number(page) - 1) * Number(limit);
        // Query for contributions from donations table (old system)
        let contributionsSql = `
      SELECT 
        c.id as contribution_id,
        c.donation_id,
        c.donor_id,
        c.status as contribution_status,
        c.created_at as contributed_date,
        d.donation_category as donation_type,
        d.quantity_or_amount,
        d.purpose,
        d.ngo_id,
        u.name as ngo_name,
        u.ngo_id as ngo_identifier,
        donor.name as donor_name,
        donor.email as donor_email,
        'DONATION' as contribution_source
      FROM contributions c
      INNER JOIN donations d ON c.donation_id = d.id
      INNER JOIN users u ON d.ngo_id = u.id
      INNER JOIN donors donor ON c.donor_id = donor.id
      WHERE 1=1
    `;
        const params = [];
        // Query for contributions from donation_requests table (new system)
        let requestContributionsSql = `
      SELECT 
        drc.id as contribution_id,
        drc.request_id as donation_id,
        drc.donor_id,
        drc.status as contribution_status,
        drc.created_at as contributed_date,
        dr.donation_type,
        drc.quantity_or_amount,
        dr.description as purpose,
        dr.ngo_id,
        u.name as ngo_name,
        u.ngo_id as ngo_identifier,
        donor.name as donor_name,
        donor.email as donor_email,
        'DONATION_REQUEST' as contribution_source
      FROM donation_request_contributions drc
      INNER JOIN donation_requests dr ON drc.request_id = dr.id
      INNER JOIN users u ON dr.ngo_id = u.id
      INNER JOIN donors donor ON drc.donor_id = donor.id
      WHERE 1=1
    `;
        const requestParams = [];
        // Apply filters
        if (donorId) {
            contributionsSql += ' AND c.donor_id = ?';
            params.push(donorId);
            requestContributionsSql += ' AND drc.donor_id = ?';
            requestParams.push(donorId);
        }
        if (ngoId) {
            contributionsSql += ' AND d.ngo_id = ?';
            params.push(ngoId);
            requestContributionsSql += ' AND dr.ngo_id = ?';
            requestParams.push(ngoId);
        }
        if (donationType) {
            contributionsSql += ' AND d.donation_category = ?';
            params.push(donationType);
            requestContributionsSql += ' AND dr.donation_type = ?';
            requestParams.push(donationType);
        }
        if (fromDate) {
            contributionsSql += ' AND DATE(c.created_at) >= ?';
            params.push(fromDate);
            requestContributionsSql += ' AND DATE(drc.created_at) >= ?';
            requestParams.push(fromDate);
        }
        if (toDate) {
            contributionsSql += ' AND DATE(c.created_at) <= ?';
            params.push(toDate);
            requestContributionsSql += ' AND DATE(drc.created_at) <= ?';
            requestParams.push(toDate);
        }
        contributionsSql += ' ORDER BY c.created_at DESC';
        requestContributionsSql += ' ORDER BY drc.created_at DESC';
        // Fetch both types of contributions
        const contributions = await (0, mysql_1.query)(contributionsSql, params);
        const requestContributions = await (0, mysql_1.query)(requestContributionsSql, requestParams);
        // Combine and format results
        const allContributions = [
            ...contributions.map((c) => ({
                contributionId: c.contribution_id,
                donationId: c.donation_id,
                donorId: c.donor_id,
                donorName: c.donor_name,
                donorEmail: c.donor_email,
                ngoId: c.ngo_id,
                ngoName: c.ngo_name,
                ngoIdentifier: c.ngo_identifier,
                donationType: c.donation_type,
                quantityOrAmount: Number(c.quantity_or_amount) || 0,
                purpose: c.purpose || '',
                contributedDate: c.contributed_date,
                contributionStatus: c.contribution_status,
                contributionSource: c.contribution_source,
            })),
            ...requestContributions.map((c) => ({
                contributionId: c.contribution_id,
                donationId: c.donation_id,
                donorId: c.donor_id,
                donorName: c.donor_name,
                donorEmail: c.donor_email,
                ngoId: c.ngo_id,
                ngoName: c.ngo_name,
                ngoIdentifier: c.ngo_identifier,
                donationType: c.donation_type,
                quantityOrAmount: Number(c.quantity_or_amount) || 0,
                purpose: c.purpose || '',
                contributedDate: c.contributed_date,
                contributionStatus: c.contribution_status,
                contributionSource: c.contribution_source,
            })),
        ];
        // Sort by date descending
        allContributions.sort((a, b) => new Date(b.contributedDate).getTime() - new Date(a.contributedDate).getTime());
        // Apply pagination
        const total = allContributions.length;
        const paginatedContributions = allContributions.slice(offset, offset + Number(limit));
        return (0, response_1.sendSuccess)(res, {
            contributions: paginatedContributions,
            pagination: {
                total,
                page: Number(page),
                limit: Number(limit),
                totalPages: Math.ceil(total / Number(limit)),
            },
        }, 'Contributions fetched successfully');
    }
    catch (error) {
        console.error('Error fetching contributions:', error);
        return res.status(500).json({ success: false, message: error.message || 'Failed to fetch contributions' });
    }
};
exports.getAllContributions = getAllContributions;
/**
 * Get detailed contribution history for a specific donor
 * GET /api/admin/contributions/:donorId
 */
const getDonorContributions = async (req, res) => {
    try {
        const { donorId } = req.params;
        // Get contributions from donations table
        const contributions = await (0, mysql_1.query)(`
      SELECT 
        c.id as contribution_id,
        c.donation_id,
        c.status as contribution_status,
        c.created_at as contributed_date,
        d.donation_category as donation_type,
        d.quantity_or_amount,
        d.purpose,
        d.ngo_id,
        u.name as ngo_name,
        u.ngo_id as ngo_identifier
      FROM contributions c
      INNER JOIN donations d ON c.donation_id = d.id
      INNER JOIN users u ON d.ngo_id = u.id
      WHERE c.donor_id = ?
      ORDER BY c.created_at DESC
    `, [donorId]);
        // Get contributions from donation_requests table
        const requestContributions = await (0, mysql_1.query)(`
      SELECT 
        drc.id as contribution_id,
        drc.request_id as donation_id,
        drc.status as contribution_status,
        drc.created_at as contributed_date,
        dr.donation_type,
        drc.quantity_or_amount,
        dr.description as purpose,
        dr.ngo_id,
        u.name as ngo_name,
        u.ngo_id as ngo_identifier
      FROM donation_request_contributions drc
      INNER JOIN donation_requests dr ON drc.request_id = dr.id
      INNER JOIN users u ON dr.ngo_id = u.id
      WHERE drc.donor_id = ?
      ORDER BY drc.created_at DESC
    `, [donorId]);
        // Get donor details
        const donor = await (0, mysql_1.queryOne)(`
      SELECT id, name, email, role, is_blocked, created_at
      FROM donors
      WHERE id = ?
    `, [donorId]);
        if (!donor) {
            return res.status(404).json({ success: false, message: 'Donor not found' });
        }
        // Combine contributions
        const allContributions = [
            ...contributions.map((c) => ({
                contributionId: c.contribution_id,
                donationId: c.donation_id,
                donationType: c.donation_type,
                quantityOrAmount: Number(c.quantity_or_amount) || 0,
                purpose: c.purpose || '',
                contributedDate: c.contributed_date,
                contributionStatus: c.contribution_status,
                ngoId: c.ngo_id,
                ngoName: c.ngo_name,
                ngoIdentifier: c.ngo_identifier,
                contributionSource: 'DONATION',
            })),
            ...requestContributions.map((c) => ({
                contributionId: c.contribution_id,
                donationId: c.donation_id,
                donationType: c.donation_type,
                quantityOrAmount: Number(c.quantity_or_amount) || 0,
                purpose: c.purpose || '',
                contributedDate: c.contributed_date,
                contributionStatus: c.contribution_status,
                ngoId: c.ngo_id,
                ngoName: c.ngo_name,
                ngoIdentifier: c.ngo_identifier,
                contributionSource: 'DONATION_REQUEST',
            })),
        ];
        allContributions.sort((a, b) => new Date(b.contributedDate).getTime() - new Date(a.contributedDate).getTime());
        return (0, response_1.sendSuccess)(res, {
            donor: {
                donorId: donor.id,
                name: donor.name,
                email: donor.email,
                role: donor.role || 'DONOR',
                status: donor.is_blocked === 1 ? 'BLOCKED' : 'ACTIVE',
                createdAt: donor.created_at,
            },
            contributions: allContributions,
            summary: {
                totalContributions: allContributions.length,
                totalAmount: allContributions.reduce((sum, c) => sum + c.quantityOrAmount, 0),
            },
        }, 'Donor contributions fetched successfully');
    }
    catch (error) {
        console.error('Error fetching donor contributions:', error);
        return res.status(500).json({ success: false, message: error.message || 'Failed to fetch donor contributions' });
    }
};
exports.getDonorContributions = getDonorContributions;

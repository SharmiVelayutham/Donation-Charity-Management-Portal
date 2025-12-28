"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAdminAnalytics = void 0;
const response_1 = require("../utils/response");
const mysql_1 = require("../config/mysql");
const getAdminAnalytics = async (req, res) => {
    try {
        const donationsByType = await (0, mysql_1.query)(`
      SELECT 
        'old' as source,
        d.donation_category as donation_type,
        COUNT(DISTINCT c.id) as contribution_count,
        COALESCE(SUM(CASE WHEN d.donation_category = 'FUNDS' THEN d.quantity_or_amount ELSE 0 END), 0) as total_amount
      FROM contributions c
      INNER JOIN donations d ON c.donation_id = d.id
      GROUP BY d.donation_category
      
      UNION ALL
      
      SELECT 
        'new' as source,
        dr.donation_type as donation_type,
        COUNT(DISTINCT drc.id) as contribution_count,
        COALESCE(SUM(CASE WHEN dr.donation_type = 'FUNDS' THEN drc.quantity_or_amount ELSE 0 END), 0) as total_amount
      FROM donation_request_contributions drc
      INNER JOIN donation_requests dr ON drc.request_id = dr.id
      GROUP BY dr.donation_type
    `);
        const donationTypeMap = new Map();
        donationsByType.forEach((item) => {
            const type = item.donation_type;
            if (!donationTypeMap.has(type)) {
                donationTypeMap.set(type, { count: 0, amount: 0 });
            }
            const existing = donationTypeMap.get(type);
            existing.count += Number(item.contribution_count) || 0;
            existing.amount += Number(item.total_amount) || 0;
        });
        const donationsBreakdown = Array.from(donationTypeMap.entries()).map(([type, data]) => ({
            type,
            count: data.count,
            amount: data.amount,
        }));
        const monthlyTrends = await (0, mysql_1.query)(`
      SELECT 
        DATE_FORMAT(c.created_at, '%Y-%m') as month,
        COUNT(DISTINCT c.id) as count,
        COALESCE(SUM(CASE WHEN d.donation_category = 'FUNDS' THEN d.quantity_or_amount ELSE 0 END), 0) as amount
      FROM contributions c
      INNER JOIN donations d ON c.donation_id = d.id
      WHERE c.created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
      GROUP BY DATE_FORMAT(c.created_at, '%Y-%m')
      ORDER BY month ASC
    `);
        const monthlyTrendsNew = await (0, mysql_1.query)(`
      SELECT 
        DATE_FORMAT(drc.created_at, '%Y-%m') as month,
        COUNT(DISTINCT drc.id) as count,
        COALESCE(SUM(CASE WHEN dr.donation_type = 'FUNDS' THEN drc.quantity_or_amount ELSE 0 END), 0) as amount
      FROM donation_request_contributions drc
      INNER JOIN donation_requests dr ON drc.request_id = dr.id
      WHERE drc.created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
      GROUP BY DATE_FORMAT(drc.created_at, '%Y-%m')
      ORDER BY month ASC
    `);
        const monthlyMap = new Map();
        [...monthlyTrends, ...monthlyTrendsNew].forEach((item) => {
            const month = item.month;
            if (!monthlyMap.has(month)) {
                monthlyMap.set(month, { count: 0, amount: 0 });
            }
            const existing = monthlyMap.get(month);
            existing.count += Number(item.count) || 0;
            existing.amount += Number(item.amount) || 0;
        });
        const monthlyData = Array.from(monthlyMap.entries())
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([month, data]) => ({
            month,
            count: data.count,
            amount: data.amount,
        }));
        const ngoStats = await (0, mysql_1.queryOne)(`
      SELECT 
        COUNT(*) as total_ngos,
        SUM(CASE WHEN verification_status = 'VERIFIED' THEN 1 ELSE 0 END) as verified_ngos,
        SUM(CASE WHEN verification_status = 'PENDING' THEN 1 ELSE 0 END) as pending_ngos,
        SUM(CASE WHEN verification_status = 'REJECTED' THEN 1 ELSE 0 END) as rejected_ngos,
        SUM(CASE WHEN is_blocked = 1 THEN 1 ELSE 0 END) as blocked_ngos,
        SUM(CASE WHEN is_blocked = 0 AND verification_status = 'VERIFIED' THEN 1 ELSE 0 END) as active_ngos
      FROM users
      WHERE role = 'NGO'
    `);
        const donorStats = await (0, mysql_1.queryOne)(`
      SELECT 
        COUNT(DISTINCT d.id) as total_donors,
        COUNT(DISTINCT CASE WHEN d.is_blocked = 1 THEN d.id END) as blocked_donors,
        COUNT(DISTINCT CASE WHEN d.is_blocked = 0 THEN d.id END) as active_donors,
        COUNT(DISTINCT CASE WHEN c.id IS NOT NULL OR drc.id IS NOT NULL THEN d.id END) as donors_with_contributions
      FROM donors d
      LEFT JOIN contributions c ON d.id = c.donor_id
      LEFT JOIN donation_request_contributions drc ON d.id = drc.donor_id
    `);
        const totalContributionsResult = await (0, mysql_1.queryOne)(`
      SELECT 
        (SELECT COUNT(*) FROM contributions) +
        (SELECT COUNT(*) FROM donation_request_contributions) as total_contributions
    `);
        const totalFundsResult = await (0, mysql_1.queryOne)(`
      SELECT 
        COALESCE(
          (SELECT SUM(quantity_or_amount) FROM donations WHERE donation_category IN ('FUNDS', 'MONEY')), 0
        ) +
        COALESCE(
          (SELECT SUM(drc.quantity_or_amount) 
           FROM donation_request_contributions drc
           INNER JOIN donation_requests dr ON drc.request_id = dr.id 
           WHERE dr.donation_type IN ('FUNDS', 'MONEY')), 0
        ) as total_funds
    `);
        const fundsSummary = await (0, mysql_1.queryOne)(`
      SELECT 
        COALESCE(SUM(CASE 
          WHEN UPPER(TRIM(drc.status)) = 'ACCEPTED' AND dr.donation_type IN ('FUNDS', 'MONEY') 
          THEN drc.quantity_or_amount 
          ELSE 0 
        END), 0) as funds_received,
        COALESCE(SUM(CASE 
          WHEN (UPPER(TRIM(COALESCE(drc.status, ''))) = 'PENDING' OR drc.status IS NULL OR drc.status = '') 
          AND dr.donation_type IN ('FUNDS', 'MONEY') 
          THEN drc.quantity_or_amount 
          ELSE 0 
        END), 0) as funds_pending
      FROM donation_request_contributions drc
      INNER JOIN donation_requests dr ON drc.request_id = dr.id
      WHERE dr.donation_type IN ('FUNDS', 'MONEY')
    `);
        const topNgos = await (0, mysql_1.query)(`
      SELECT 
        u.id,
        u.name,
        COUNT(DISTINCT c.id) + COUNT(DISTINCT CASE WHEN UPPER(TRIM(COALESCE(drc.status, ''))) = 'ACCEPTED' THEN drc.id END) as contribution_count,
        COALESCE(SUM(CASE 
          WHEN c.status = 'COMPLETED' AND d.donation_category IN ('FUNDS', 'MONEY') 
          THEN d.quantity_or_amount 
          ELSE 0 
        END), 0) +
        COALESCE(SUM(CASE 
          WHEN UPPER(TRIM(COALESCE(drc.status, ''))) = 'ACCEPTED' AND dr.donation_type IN ('FUNDS', 'MONEY') 
          THEN drc.quantity_or_amount 
          ELSE 0 
        END), 0) as total_amount
      FROM users u
      LEFT JOIN donations d ON u.id = d.ngo_id
      LEFT JOIN contributions c ON d.id = c.donation_id AND c.status = 'COMPLETED'
      LEFT JOIN donation_requests dr ON u.id = dr.ngo_id
      LEFT JOIN donation_request_contributions drc ON dr.id = drc.request_id
      WHERE u.role = 'NGO'
        AND (c.status = 'COMPLETED' OR UPPER(TRIM(COALESCE(drc.status, ''))) = 'ACCEPTED')
      GROUP BY u.id, u.name
      HAVING total_amount > 0
      ORDER BY total_amount DESC, contribution_count DESC
      LIMIT 100
    `);
        const topDonors = await (0, mysql_1.query)(`
      SELECT 
        d.id,
        d.name,
        d.email,
        COUNT(DISTINCT c.id) + COUNT(DISTINCT CASE WHEN UPPER(TRIM(COALESCE(drc.status, ''))) = 'ACCEPTED' THEN drc.id END) as contribution_count,
        COALESCE(SUM(CASE 
          WHEN c.status = 'COMPLETED' AND don.donation_category IN ('FUNDS', 'MONEY') 
          THEN don.quantity_or_amount 
          ELSE 0 
        END), 0) +
        COALESCE(SUM(CASE 
          WHEN UPPER(TRIM(COALESCE(drc.status, ''))) = 'ACCEPTED' AND dr.donation_type IN ('FUNDS', 'MONEY') 
          THEN drc.quantity_or_amount 
          ELSE 0 
        END), 0) as total_amount
      FROM donors d
      LEFT JOIN contributions c ON d.id = c.donor_id AND c.status = 'COMPLETED'
      LEFT JOIN donations don ON c.donation_id = don.id
      LEFT JOIN donation_request_contributions drc ON d.id = drc.donor_id
      LEFT JOIN donation_requests dr ON drc.request_id = dr.id
      WHERE (c.status = 'COMPLETED' OR UPPER(TRIM(COALESCE(drc.status, ''))) = 'ACCEPTED')
      GROUP BY d.id, d.name, d.email
      HAVING total_amount > 0
      ORDER BY total_amount DESC, contribution_count DESC
      LIMIT 100
    `);
        const analytics = {
            donations: {
                breakdown: donationsBreakdown,
                totalContributions: Number(totalContributionsResult === null || totalContributionsResult === void 0 ? void 0 : totalContributionsResult.total_contributions) || 0,
                totalFunds: Number(totalFundsResult === null || totalFundsResult === void 0 ? void 0 : totalFundsResult.total_funds) || 0,
                fundsReceived: Number(fundsSummary === null || fundsSummary === void 0 ? void 0 : fundsSummary.funds_received) || 0,
                fundsPending: Number(fundsSummary === null || fundsSummary === void 0 ? void 0 : fundsSummary.funds_pending) || 0,
                monthlyTrends: monthlyData,
            },
            ngos: {
                total: Number(ngoStats === null || ngoStats === void 0 ? void 0 : ngoStats.total_ngos) || 0,
                verified: Number(ngoStats === null || ngoStats === void 0 ? void 0 : ngoStats.verified_ngos) || 0,
                pending: Number(ngoStats === null || ngoStats === void 0 ? void 0 : ngoStats.pending_ngos) || 0,
                rejected: Number(ngoStats === null || ngoStats === void 0 ? void 0 : ngoStats.rejected_ngos) || 0,
                blocked: Number(ngoStats === null || ngoStats === void 0 ? void 0 : ngoStats.blocked_ngos) || 0,
                active: Number(ngoStats === null || ngoStats === void 0 ? void 0 : ngoStats.active_ngos) || 0,
                topNgos: topNgos.map((ngo) => ({
                    id: ngo.id,
                    name: ngo.name,
                    contributionCount: Number(ngo.contribution_count) || 0,
                    totalAmount: Number(ngo.total_amount) || 0,
                })),
            },
            donors: {
                total: Number(donorStats === null || donorStats === void 0 ? void 0 : donorStats.total_donors) || 0,
                active: Number(donorStats === null || donorStats === void 0 ? void 0 : donorStats.active_donors) || 0,
                blocked: Number(donorStats === null || donorStats === void 0 ? void 0 : donorStats.blocked_donors) || 0,
                withContributions: Number(donorStats === null || donorStats === void 0 ? void 0 : donorStats.donors_with_contributions) || 0,
                topDonors: topDonors.map((donor) => ({
                    id: donor.id,
                    name: donor.name,
                    email: donor.email,
                    contributionCount: Number(donor.contribution_count) || 0,
                    totalAmount: Number(donor.total_amount) || 0,
                })),
            },
        };
        return (0, response_1.sendSuccess)(res, analytics, 'Analytics fetched successfully');
    }
    catch (error) {
        console.error('Error fetching admin analytics:', error);
        return res.status(500).json({ success: false, message: error.message || 'Failed to fetch analytics' });
    }
};
exports.getAdminAnalytics = getAdminAnalytics;

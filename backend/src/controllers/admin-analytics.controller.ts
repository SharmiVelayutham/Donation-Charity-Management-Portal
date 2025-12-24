import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { sendSuccess } from '../utils/response';
import { query, queryOne } from '../config/mysql';

/**
 * Get comprehensive platform analytics for admin dashboard
 * GET /api/admin/analytics
 */
export const getAdminAnalytics = async (req: AuthRequest, res: Response) => {
  try {
    // 1. Total Donations Analysis - by type
    const donationsByType = await query<any>(`
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

    // Aggregate donation types
    const donationTypeMap = new Map<string, { count: number; amount: number }>();
    donationsByType.forEach((item: any) => {
      const type = item.donation_type;
      if (!donationTypeMap.has(type)) {
        donationTypeMap.set(type, { count: 0, amount: 0 });
      }
      const existing = donationTypeMap.get(type)!;
      existing.count += Number(item.contribution_count) || 0;
      existing.amount += Number(item.total_amount) || 0;
    });

    const donationsBreakdown = Array.from(donationTypeMap.entries()).map(([type, data]) => ({
      type,
      count: data.count,
      amount: data.amount,
    }));

    // 2. Monthly Trends - Last 6 months
    const monthlyTrends = await query<any>(`
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

    const monthlyTrendsNew = await query<any>(`
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

    // Combine monthly trends
    const monthlyMap = new Map<string, { count: number; amount: number }>();
    [...monthlyTrends, ...monthlyTrendsNew].forEach((item: any) => {
      const month = item.month;
      if (!monthlyMap.has(month)) {
        monthlyMap.set(month, { count: 0, amount: 0 });
      }
      const existing = monthlyMap.get(month)!;
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

    // 3. NGO Statistics
    const ngoStats = await queryOne<any>(`
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

    // 4. Donor Statistics
    const donorStats = await queryOne<any>(`
      SELECT 
        COUNT(DISTINCT d.id) as total_donors,
        COUNT(DISTINCT CASE WHEN d.is_blocked = 1 THEN d.id END) as blocked_donors,
        COUNT(DISTINCT CASE WHEN d.is_blocked = 0 THEN d.id END) as active_donors,
        COUNT(DISTINCT CASE WHEN c.id IS NOT NULL OR drc.id IS NOT NULL THEN d.id END) as donors_with_contributions
      FROM donors d
      LEFT JOIN contributions c ON d.id = c.donor_id
      LEFT JOIN donation_request_contributions drc ON d.id = drc.donor_id
    `);

    // 5. Total Contributions Summary
    const totalContributions = await queryOne<any>(`
      SELECT 
        (SELECT COUNT(*) FROM contributions) +
        (SELECT COUNT(*) FROM donation_request_contributions) as total_contributions,
        (SELECT COALESCE(SUM(quantity_or_amount), 0) FROM donations WHERE donation_category = 'FUNDS') +
        (SELECT COALESCE(SUM(drc.quantity_or_amount), 0) FROM donation_request_contributions drc
         INNER JOIN donation_requests dr ON drc.request_id = dr.id WHERE dr.donation_type = 'FUNDS') as total_funds
    `);

    // 6. Top NGOs by contributions
    const topNgos = await query<any>(`
      SELECT 
        u.id,
        u.name,
        COUNT(DISTINCT c.id) + COUNT(DISTINCT drc.id) as contribution_count,
        COALESCE(SUM(CASE WHEN d.donation_category = 'FUNDS' THEN d.quantity_or_amount ELSE 0 END), 0) +
        COALESCE(SUM(CASE WHEN dr.donation_type = 'FUNDS' THEN drc.quantity_or_amount ELSE 0 END), 0) as total_amount
      FROM users u
      LEFT JOIN donations d ON u.id = d.ngo_id
      LEFT JOIN contributions c ON d.id = c.donation_id
      LEFT JOIN donation_requests dr ON u.id = dr.ngo_id
      LEFT JOIN donation_request_contributions drc ON dr.id = drc.request_id
      WHERE u.role = 'NGO'
      GROUP BY u.id, u.name
      HAVING contribution_count > 0
      ORDER BY contribution_count DESC
      LIMIT 5
    `);

    // 7. Top Donors by contributions
    const topDonors = await query<any>(`
      SELECT 
        d.id,
        d.name,
        d.email,
        COUNT(DISTINCT c.id) + COUNT(DISTINCT drc.id) as contribution_count,
        COALESCE(SUM(CASE WHEN don.donation_category = 'FUNDS' THEN don.quantity_or_amount ELSE 0 END), 0) +
        COALESCE(SUM(CASE WHEN dr.donation_type = 'FUNDS' THEN drc.quantity_or_amount ELSE 0 END), 0) as total_amount
      FROM donors d
      LEFT JOIN contributions c ON d.id = c.donor_id
      LEFT JOIN donations don ON c.donation_id = don.id
      LEFT JOIN donation_request_contributions drc ON d.id = drc.donor_id
      LEFT JOIN donation_requests dr ON drc.request_id = dr.id
      GROUP BY d.id, d.name, d.email
      HAVING contribution_count > 0
      ORDER BY contribution_count DESC
      LIMIT 5
    `);

    const analytics = {
      donations: {
        breakdown: donationsBreakdown,
        totalContributions: Number(totalContributions?.total_contributions) || 0,
        totalFunds: Number(totalContributions?.total_funds) || 0,
        monthlyTrends: monthlyData,
      },
      ngos: {
        total: Number(ngoStats?.total_ngos) || 0,
        verified: Number(ngoStats?.verified_ngos) || 0,
        pending: Number(ngoStats?.pending_ngos) || 0,
        rejected: Number(ngoStats?.rejected_ngos) || 0,
        blocked: Number(ngoStats?.blocked_ngos) || 0,
        active: Number(ngoStats?.active_ngos) || 0,
        topNgos: topNgos.map((ngo: any) => ({
          id: ngo.id,
          name: ngo.name,
          contributionCount: Number(ngo.contribution_count) || 0,
          totalAmount: Number(ngo.total_amount) || 0,
        })),
      },
      donors: {
        total: Number(donorStats?.total_donors) || 0,
        active: Number(donorStats?.active_donors) || 0,
        blocked: Number(donorStats?.blocked_donors) || 0,
        withContributions: Number(donorStats?.donors_with_contributions) || 0,
        topDonors: topDonors.map((donor: any) => ({
          id: donor.id,
          name: donor.name,
          email: donor.email,
          contributionCount: Number(donor.contribution_count) || 0,
          totalAmount: Number(donor.total_amount) || 0,
        })),
      },
    };

    return sendSuccess(res, analytics, 'Analytics fetched successfully');
  } catch (error: any) {
    console.error('Error fetching admin analytics:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to fetch analytics' });
  }
};


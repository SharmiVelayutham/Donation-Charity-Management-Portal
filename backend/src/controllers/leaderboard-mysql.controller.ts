import { Request, Response } from 'express';
import { sendSuccess } from '../utils/response';
import { query } from '../config/mysql';

/**
 * MySQL-based Leaderboard Controller
 * Ranks donors and NGOs based on contributions/donations
 */

/**
 * Get leaderboard (ranked by total donations or amount)
 * GET /api/leaderboard
 * Query params: type=donors|ngos, sortBy=count|amount, period=all|monthly|weekly
 */
export const getLeaderboard = async (req: Request, res: Response) => {
  try {
    const { type = 'donors', sortBy = 'count', period = 'all' } = req.query;

    // Calculate date filter based on period
    let dateFilter: Date | null = null;
    const now = new Date();
    if (period === 'monthly') {
      dateFilter = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (period === 'weekly') {
      const dayOfWeek = now.getDay();
      const diff = now.getDate() - dayOfWeek;
      dateFilter = new Date(now.setDate(diff));
      dateFilter.setHours(0, 0, 0, 0);
    }

    if (type === 'donors') {
      // Rank donors by contributions
      let sql = `
        SELECT 
          d.id as donor_id,
          d.name as donor_name,
          d.email as donor_email,
          COUNT(c.id) as total_contributions,
          COALESCE(SUM(dr.quantity_or_amount), 0) as total_amount,
          SUM(CASE WHEN c.status = 'COMPLETED' THEN 1 ELSE 0 END) as completed_contributions,
          MAX(c.created_at) as last_contribution_date
        FROM donors d
        LEFT JOIN contributions c ON d.id = c.donor_id
        LEFT JOIN donations dr ON c.donation_id = dr.id
      `;

      const params: any[] = [];

      if (dateFilter) {
        sql += ` WHERE c.created_at >= ?`;
        params.push(dateFilter);
      }

      sql += `
        GROUP BY d.id, d.name, d.email
        HAVING total_contributions > 0
        ORDER BY ${sortBy === 'amount' ? 'total_amount DESC, total_contributions DESC' : 'total_contributions DESC, total_amount DESC'}
        LIMIT 100
      `;

      const leaderboard = await query<any>(sql, params);

      const rankedLeaderboard = leaderboard.map((donor: any, index: number) => ({
        rank: index + 1,
        donorId: donor.donor_id,
        donorName: donor.donor_name,
        donorEmail: donor.donor_email,
        totalContributions: parseInt(donor.total_contributions) || 0,
        totalAmount: parseFloat(donor.total_amount) || 0,
        completedContributions: parseInt(donor.completed_contributions) || 0,
        lastContributionDate: donor.last_contribution_date,
      }));

      return sendSuccess(res, {
        type: 'donors',
        sortBy,
        period,
        leaderboard: rankedLeaderboard,
      }, 'Leaderboard fetched successfully');
    } else if (type === 'ngos') {
      // Rank NGOs by donations posted
      let sql = `
        SELECT 
          u.id as ngo_id,
          u.name as ngo_name,
          u.email as ngo_email,
          u.contact_info as ngo_contact_info,
          COUNT(d.id) as total_donations,
          COALESCE(SUM(d.quantity_or_amount), 0) as total_amount,
          SUM(CASE WHEN d.status = 'COMPLETED' THEN 1 ELSE 0 END) as completed_donations,
          SUM(CASE WHEN d.priority = 'URGENT' THEN 1 ELSE 0 END) as urgent_donations
        FROM users u
        LEFT JOIN donations d ON u.id = d.ngo_id
      `;

      const params: any[] = [];

      if (dateFilter) {
        sql += ` WHERE d.created_at >= ?`;
        params.push(dateFilter);
        sql += ` AND u.role = 'NGO'`;
      } else {
        sql += ` WHERE u.role = 'NGO'`;
      }

      sql += `
        GROUP BY u.id, u.name, u.email, u.contact_info
        HAVING total_donations > 0
        ORDER BY ${sortBy === 'amount' ? 'total_amount DESC, total_donations DESC' : 'total_donations DESC, total_amount DESC'}
        LIMIT 50
      `;

      const leaderboard = await query<any>(sql, params);

      const rankedLeaderboard = leaderboard.map((ngo: any, index: number) => ({
        rank: index + 1,
        ngoId: ngo.ngo_id,
        ngoName: ngo.ngo_name,
        ngoEmail: ngo.ngo_email,
        contactInfo: ngo.ngo_contact_info,
        totalDonations: parseInt(ngo.total_donations) || 0,
        totalAmount: parseFloat(ngo.total_amount) || 0,
        completedDonations: parseInt(ngo.completed_donations) || 0,
        urgentDonations: parseInt(ngo.urgent_donations) || 0,
      }));

      return sendSuccess(res, {
        type: 'ngos',
        sortBy,
        period,
        leaderboard: rankedLeaderboard,
      }, 'Leaderboard fetched successfully');
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid type. Must be "donors" or "ngos"',
      });
    }
  } catch (error: any) {
    console.error('Error fetching leaderboard:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch leaderboard',
    });
  }
};


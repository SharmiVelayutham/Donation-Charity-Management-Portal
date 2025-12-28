import { Request, Response } from 'express';
import { sendSuccess } from '../utils/response';
import { query } from '../config/mysql';
export const getLeaderboard = async (req: Request, res: Response) => {
  try {
    const { type = 'donors', sortBy = 'count', period = 'all' } = req.query;
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
      let sql = `
        SELECT 
          d.id as donor_id,
          d.name as donor_name,
          d.email as donor_email,
          COUNT(DISTINCT c.id) + COUNT(DISTINCT drc.id) as total_contributions,
          COALESCE(SUM(CASE 
            WHEN c.status = 'COMPLETED' AND dr.donation_category = 'FUNDS' THEN dr.quantity_or_amount 
            ELSE 0 
          END), 0) +
          COALESCE(SUM(CASE 
            WHEN UPPER(TRIM(COALESCE(drc.status, ''))) = 'ACCEPTED' AND dr_new.donation_type IN ('FUNDS', 'MONEY') 
            THEN drc.quantity_or_amount 
            ELSE 0 
          END), 0) as total_amount,
          SUM(CASE WHEN c.status = 'COMPLETED' THEN 1 ELSE 0 END) +
          SUM(CASE WHEN UPPER(TRIM(COALESCE(drc.status, ''))) = 'ACCEPTED' THEN 1 ELSE 0 END) as completed_contributions,
          GREATEST(MAX(c.created_at), MAX(drc.created_at)) as last_contribution_date
        FROM donors d
        LEFT JOIN contributions c ON d.id = c.donor_id
        LEFT JOIN donations dr ON c.donation_id = dr.id
        LEFT JOIN donation_request_contributions drc ON d.id = drc.donor_id
        LEFT JOIN donation_requests dr_new ON drc.request_id = dr_new.id
      `;

      const params: any[] = [];
      const whereConditions: string[] = [];

      if (dateFilter) {
        whereConditions.push(`(c.created_at >= ? OR drc.created_at >= ?)`);
        params.push(dateFilter, dateFilter);
      }

      if (whereConditions.length > 0) {
        sql += ` WHERE ${whereConditions.join(' AND ')}`;
      }

      sql += `
        GROUP BY d.id, d.name, d.email
        HAVING total_amount > 0
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
      let sql = `
        SELECT 
          u.id as ngo_id,
          u.name as ngo_name,
          u.email as ngo_email,
          u.contact_info as ngo_contact_info,
          COUNT(DISTINCT d.id) + COUNT(DISTINCT dr.id) as total_donations,
          COALESCE(SUM(CASE 
            WHEN d.status = 'COMPLETED' AND d.donation_category = 'FUNDS' THEN d.quantity_or_amount 
            ELSE 0 
          END), 0) +
          COALESCE(SUM(CASE 
            WHEN UPPER(TRIM(COALESCE(drc.status, ''))) = 'ACCEPTED' AND dr.donation_type IN ('FUNDS', 'MONEY') 
            THEN drc.quantity_or_amount 
            ELSE 0 
          END), 0) as total_amount,
          SUM(CASE WHEN d.status = 'COMPLETED' THEN 1 ELSE 0 END) +
          SUM(CASE WHEN UPPER(TRIM(COALESCE(drc.status, ''))) = 'ACCEPTED' THEN 1 ELSE 0 END) as completed_donations,
          SUM(CASE WHEN d.priority = 'URGENT' THEN 1 ELSE 0 END) as urgent_donations
        FROM users u
        LEFT JOIN donations d ON u.id = d.ngo_id
        LEFT JOIN donation_requests dr ON u.id = dr.ngo_id
        LEFT JOIN donation_request_contributions drc ON dr.id = drc.request_id
      `;

      const params: any[] = [];
      const whereConditions: string[] = ['u.role = \'NGO\''];

      if (dateFilter) {
        whereConditions.push(`(d.created_at >= ? OR dr.created_at >= ?)`);
        params.push(dateFilter, dateFilter);
      }

      sql += ` WHERE ${whereConditions.join(' AND ')}`;

      sql += `
        GROUP BY u.id, u.name, u.email, u.contact_info
        HAVING total_amount > 0
        ORDER BY ${sortBy === 'amount' ? 'total_amount DESC, total_donations DESC' : 'total_donations DESC, total_amount DESC'}
        LIMIT 100
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
    console.error('[Leaderboard] Error fetching leaderboard:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch leaderboard',
    });
  }
};


import { Request, Response } from 'express';
import { query, queryOne } from '../config/mysql';
import { sendSuccess } from '../utils/response';
export const getPlatformStats = async (req: Request, res: Response) => {
  try {

    const totalDonationsResult = await queryOne<{ count: number }>(
      'SELECT COUNT(*) as count FROM donation_requests WHERE status = "ACTIVE"'
    );
    const totalDonations = totalDonationsResult?.count || 0;

    const activeNGOsResult = await queryOne<{ count: number }>(
      `SELECT COUNT(*) as count 
       FROM users 
       WHERE role = 'NGO' 
       AND verification_status = 'VERIFIED' 
       AND is_blocked = 0`
    );
    const activeNGOs = activeNGOsResult?.count || 0;

    const activeDonorsResult = await queryOne<{ count: number }>(
      `SELECT COUNT(*) as count 
       FROM donors 
       WHERE is_blocked = 0 OR is_blocked IS NULL`
    );
    const activeDonors = activeDonorsResult?.count || 0;

    // Total contributions across both legacy contributions (COMPLETED) and
    // new donation_request_contributions (ACCEPTED)
    const completedContributionsResult = await queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM contributions WHERE status = 'COMPLETED'`
    );
    const acceptedRequestContributionsResult = await queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM donation_request_contributions 
       WHERE UPPER(TRIM(COALESCE(status, ''))) = 'ACCEPTED'`
    );
    const totalContributions = (completedContributionsResult?.count || 0) + (acceptedRequestContributionsResult?.count || 0);

    const stats = {
      totalDonations,
      totalContributions,
      activeNGOs,
      activeDonors
    };

    return sendSuccess(res, stats, 'Platform stats fetched successfully');
  } catch (error: any) {
    console.error('[Platform Stats] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch platform stats',
      error: error.message
    });
  }
};


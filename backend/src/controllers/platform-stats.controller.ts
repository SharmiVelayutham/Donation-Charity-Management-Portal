import { Request, Response } from 'express';
import { query, queryOne } from '../config/mysql';
import { sendSuccess } from '../utils/response';

/**
 * Get platform-wide statistics (Public endpoint)
 * GET /api/platform/stats
 */
export const getPlatformStats = async (req: Request, res: Response) => {
  try {
    // Get total donations (from donation_requests table)
    const totalDonationsResult = await queryOne<{ count: number }>(
      'SELECT COUNT(*) as count FROM donation_requests WHERE status = "ACTIVE"'
    );
    const totalDonations = totalDonationsResult?.count || 0;

    // Get active NGOs (verified and not blocked)
    const activeNGOsResult = await queryOne<{ count: number }>(
      `SELECT COUNT(*) as count 
       FROM users 
       WHERE role = 'NGO' 
       AND verification_status = 'VERIFIED' 
       AND is_blocked = 0`
    );
    const activeNGOs = activeNGOsResult?.count || 0;

    // Get active donors (not blocked) - donors are in separate donors table
    const activeDonorsResult = await queryOne<{ count: number }>(
      `SELECT COUNT(*) as count 
       FROM donors 
       WHERE is_blocked = 0 OR is_blocked IS NULL`
    );
    const activeDonors = activeDonorsResult?.count || 0;

    const stats = {
      totalDonations,
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


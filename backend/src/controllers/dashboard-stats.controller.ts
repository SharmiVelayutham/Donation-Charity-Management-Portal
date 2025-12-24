import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { sendSuccess } from '../utils/response';
import { queryOne } from '../config/mysql';

/**
 * Get NGO dashboard statistics (Real-Time)
 * GET /api/ngo/dashboard-stats
 * 
 * Returns:
 * - totalDonationRequests: Count of donation requests created by this NGO
 * - totalDonors: Count of distinct donors who contributed to this NGO's requests
 */
export const getNgoDashboardStats = async (req: AuthRequest, res: Response) => {
  try {
    const ngoId = parseInt(req.user!.id);

    // Count total donation requests created by this NGO
    const totalRequestsResult = await queryOne<{ count: number }>(
      'SELECT COUNT(*) as count FROM donation_requests WHERE ngo_id = ?',
      [ngoId]
    );

    // Count distinct donors who contributed to this NGO's donation requests
    const totalDonorsResult = await queryOne<{ count: number }>(
      `SELECT COUNT(DISTINCT drc.donor_id) as count
       FROM donation_request_contributions drc
       INNER JOIN donation_requests dr ON drc.request_id = dr.id
       WHERE dr.ngo_id = ?`,
      [ngoId]
    );

    const stats = {
      totalDonationRequests: totalRequestsResult?.count || 0,
      totalDonors: totalDonorsResult?.count || 0,
    };

    return sendSuccess(res, stats, 'NGO dashboard stats fetched successfully');
  } catch (error: any) {
    console.error('Error fetching NGO dashboard stats:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch NGO dashboard stats',
    });
  }
};

/**
 * Get Donor dashboard statistics (Real-Time)
 * GET /api/donor/dashboard-stats
 * 
 * Returns:
 * - totalDonations: Count of times this donor has contributed
 */
export const getDonorDashboardStats = async (req: AuthRequest, res: Response) => {
  try {
    const donorId = parseInt(req.user!.id);

    // Count total contributions by this donor
    const totalDonationsResult = await queryOne<{ count: number }>(
      'SELECT COUNT(*) as count FROM donation_request_contributions WHERE donor_id = ?',
      [donorId]
    );

    const stats = {
      totalDonations: totalDonationsResult?.count || 0,
    };

    return sendSuccess(res, stats, 'Donor dashboard stats fetched successfully');
  } catch (error: any) {
    console.error('Error fetching Donor dashboard stats:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch Donor dashboard stats',
    });
  }
};


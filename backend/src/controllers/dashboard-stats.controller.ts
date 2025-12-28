import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { sendSuccess } from '../utils/response';
import { queryOne } from '../config/mysql';
export const getNgoDashboardStats = async (req: AuthRequest, res: Response) => {
  try {
    const ngoId = parseInt(req.user!.id);
    const totalRequestsResult = await queryOne<{ count: number }>(
      'SELECT COUNT(*) as count FROM donation_requests WHERE ngo_id = ?',
      [ngoId]
    );
    const totalDonorsResult = await queryOne<{ count: number }>(
      'SELECT COUNT(*) as count FROM donors'
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
export const getDonorDashboardStats = async (req: AuthRequest, res: Response) => {
  try {
    const donorId = parseInt(req.user!.id);
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


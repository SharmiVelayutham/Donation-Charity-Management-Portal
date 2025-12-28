import { Request, Response } from 'express';
import { ContributionModel } from '../models/Contribution.model';
import { DonationModel } from '../models/Donation.model';
import { UserModel } from '../models/User.model';
import { AuthRequest } from '../middleware/auth.middleware';
import { sendSuccess } from '../utils/response';
export const getPlatformStats = async (req: Request, res: Response) => {
  const [
    totalDonors,
    totalNgos,
    totalDonations,
    totalContributions,
    totalAmountDonated,
    pendingDonations,
    completedDonations,
    urgentDonations,
  ] = await Promise.all([
    UserModel.countDocuments({ role: 'DONOR' }),
    UserModel.countDocuments({ role: 'NGO' }),
    DonationModel.countDocuments(),
    ContributionModel.countDocuments({ status: { $in: ['APPROVED', 'COMPLETED'] } }),
    DonationModel.aggregate([
      { $match: { status: 'COMPLETED' } },
      { $group: { _id: null, total: { $sum: '$quantityOrAmount' } } },
    ]),
    DonationModel.countDocuments({ status: 'PENDING' }),
    DonationModel.countDocuments({ status: 'COMPLETED' }),
    DonationModel.countDocuments({ priority: 'URGENT', status: { $ne: 'COMPLETED' } }),
  ]);

  const stats = {
    users: {
      totalDonors,
      totalNgos,
      totalUsers: totalDonors + totalNgos,
    },
    donations: {
      total: totalDonations,
      pending: pendingDonations,
      completed: completedDonations,
      urgent: urgentDonations,
    },
    contributions: {
      total: totalContributions,
      totalAmountDonated: totalAmountDonated[0]?.total || 0,
    },
  };

  return sendSuccess(res, stats, 'Platform stats fetched');
};
export const getDonorStats = async (req: AuthRequest, res: Response) => {
  const donorId = req.user!.id;

  const [
    totalContributions,
    approvedContributions,
    completedContributions,
    pendingContributions,
    totalAmount,
    recentContributions,
  ] = await Promise.all([
    ContributionModel.countDocuments({ donorId }),
    ContributionModel.countDocuments({ donorId, status: 'APPROVED' }),
    ContributionModel.countDocuments({ donorId, status: 'COMPLETED' }),
    ContributionModel.countDocuments({ donorId, status: 'PENDING' }),
    ContributionModel.aggregate([
      { $match: { donorId: donorId, status: { $in: ['APPROVED', 'COMPLETED'] } } },
      {
        $lookup: {
          from: 'donations',
          localField: 'donationId',
          foreignField: '_id',
          as: 'donation',
        },
      },
      { $unwind: '$donation' },
      { $group: { _id: null, total: { $sum: '$donation.quantityOrAmount' } } },
    ]),
    ContributionModel.find({ donorId })
      .populate('donationId')
      .sort({ createdAt: -1 })
      .limit(5),
  ]);

  const stats = {
    contributions: {
      total: totalContributions,
      approved: approvedContributions,
      completed: completedContributions,
      pending: pendingContributions,
    },
    totalAmountContributed: totalAmount[0]?.total || 0,
    recentContributions,
  };

  return sendSuccess(res, stats, 'Donor stats fetched');
};
export const getNgoStats = async (req: AuthRequest, res: Response) => {
  const ngoId = req.user!.id;

  const [
    totalDonations,
    pendingDonations,
    confirmedDonations,
    completedDonations,
    totalContributions,
    totalAmount,
    recentDonations,
  ] = await Promise.all([
    DonationModel.countDocuments({ ngoId }),
    DonationModel.countDocuments({ ngoId, status: 'PENDING' }),
    DonationModel.countDocuments({ ngoId, status: 'CONFIRMED' }),
    DonationModel.countDocuments({ ngoId, status: 'COMPLETED' }),
    DonationModel.find({ ngoId }).select('_id').then((donations) => {
      const donationIds = donations.map((d) => d._id);
      return ContributionModel.countDocuments({ donationId: { $in: donationIds } });
    }),
    DonationModel.aggregate([
      { $match: { ngoId: ngoId, status: 'COMPLETED' } },
      { $group: { _id: null, total: { $sum: '$quantityOrAmount' } } },
    ]),
    DonationModel.find({ ngoId }).sort({ createdAt: -1 }).limit(5),
  ]);

  const stats = {
    donations: {
      total: totalDonations,
      pending: pendingDonations,
      confirmed: confirmedDonations,
      completed: completedDonations,
    },
    contributions: {
      total: totalContributions,
    },
    totalAmountReceived: totalAmount[0]?.total || 0,
    recentDonations,
  };

  return sendSuccess(res, stats, 'NGO stats fetched');
};


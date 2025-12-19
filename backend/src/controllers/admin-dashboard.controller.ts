import { Response } from 'express';
import { Types } from 'mongoose';
import { DonorModel } from '../models/Donor.model';
import { UserModel } from '../models/User.model';
import { ContributionModel } from '../models/Contribution.model';
import { DonationModel } from '../models/Donation.model';
import { AuthRequest } from '../middleware/auth.middleware';
import { sendSuccess } from '../utils/response';

/**
 * Get all NGOs with detailed information
 * GET /api/admin/dashboard/ngos
 */
export const getAllNgos = async (req: AuthRequest, res: Response) => {
  const { isBlocked, search } = req.query;

  const filter: Record<string, unknown> = {};
  if (isBlocked !== undefined) {
    filter.isBlocked = isBlocked === 'true';
  }
  if (search) {
    filter.$or = [
      { name: { $regex: search as string, $options: 'i' } },
      { email: { $regex: search as string, $options: 'i' } },
      { contactInfo: { $regex: search as string, $options: 'i' } },
    ];
  }

  const ngos = await UserModel.find(filter)
    .select('-password') // Exclude password
    .sort({ createdAt: -1 })
    .lean();

  // Add donation statistics for each NGO
  const ngosWithStats = await Promise.all(
    ngos.map(async (ngo) => {
      const donationCount = await DonationModel.countDocuments({ ngoId: ngo._id });
      const totalContributions = await DonationModel.find({ ngoId: ngo._id })
        .select('_id')
        .then((donations) => {
          const donationIds = donations.map((d) => d._id);
          return ContributionModel.countDocuments({ donationId: { $in: donationIds } });
        });

      return {
        ...ngo,
        statistics: {
          totalDonations: donationCount,
          totalContributions,
        },
      };
    })
  );

  return sendSuccess(res, { count: ngosWithStats.length, ngos: ngosWithStats }, 'NGOs fetched successfully');
};

/**
 * Get all Donors with detailed information
 * GET /api/admin/dashboard/donors
 */
export const getAllDonors = async (req: AuthRequest, res: Response) => {
  const { isBlocked, search } = req.query;

  const filter: Record<string, unknown> = {};
  if (isBlocked !== undefined) {
    filter.isBlocked = isBlocked === 'true';
  }
  if (search) {
    filter.$or = [
      { name: { $regex: search as string, $options: 'i' } },
      { email: { $regex: search as string, $options: 'i' } },
      { contactInfo: { $regex: search as string, $options: 'i' } },
    ];
  }

  const donors = await DonorModel.find(filter)
    .select('-password') // Exclude password
    .sort({ createdAt: -1 })
    .lean();

  // Add contribution statistics for each donor
  const donorsWithStats = await Promise.all(
    donors.map(async (donor) => {
      const contributionCount = await ContributionModel.countDocuments({ donorId: donor._id });
      const approvedContributions = await ContributionModel.countDocuments({
        donorId: donor._id,
        status: { $in: ['APPROVED', 'COMPLETED'] },
      });

      return {
        ...donor,
        statistics: {
          totalContributions: contributionCount,
          approvedContributions,
        },
      };
    })
  );

  return sendSuccess(res, { count: donorsWithStats.length, donors: donorsWithStats }, 'Donors fetched successfully');
};

/**
 * Get detailed information about a specific NGO
 * GET /api/admin/dashboard/ngos/:id
 */
export const getNgoDetails = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  if (!Types.ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, message: 'Invalid NGO id' });
  }

  const ngo = await UserModel.findById(id).select('-password').lean();
  if (!ngo) {
    return res.status(404).json({ success: false, message: 'NGO not found' });
  }

  // Get all donations by this NGO
  const donations = await DonationModel.find({ ngoId: id })
    .sort({ createdAt: -1 })
    .lean();

  // Get contribution statistics
  const donationIds = donations.map((d) => d._id);
  const totalContributions = await ContributionModel.countDocuments({
    donationId: { $in: donationIds },
  });

  const ngoDetails = {
    ...ngo,
    donations: {
      total: donations.length,
      list: donations,
    },
    statistics: {
      totalDonations: donations.length,
      totalContributions,
    },
  };

  return sendSuccess(res, ngoDetails, 'NGO details fetched successfully');
};

/**
 * Get detailed information about a specific Donor
 * GET /api/admin/dashboard/donors/:id
 */
export const getDonorDetails = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  if (!Types.ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, message: 'Invalid donor id' });
  }

  const donor = await DonorModel.findById(id).select('-password').lean();
  if (!donor) {
    return res.status(404).json({ success: false, message: 'Donor not found' });
  }

  // Get all contributions by this donor
  const contributions = await ContributionModel.find({ donorId: id })
    .populate('donationId')
    .sort({ createdAt: -1 })
    .lean();

  const donorDetails = {
    ...donor,
    contributions: {
      total: contributions.length,
      list: contributions,
    },
    statistics: {
      totalContributions: contributions.length,
      approvedContributions: contributions.filter((c) => c.status === 'APPROVED' || c.status === 'COMPLETED').length,
    },
  };

  return sendSuccess(res, donorDetails, 'Donor details fetched successfully');
};

/**
 * Block an NGO
 * PUT /api/admin/dashboard/ngos/:id/block
 */
export const blockNgo = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  if (!Types.ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, message: 'Invalid NGO id' });
  }

  const ngo = await UserModel.findByIdAndUpdate(id, { isBlocked: true }, { new: true })
    .select('-password');

  if (!ngo) {
    return res.status(404).json({ success: false, message: 'NGO not found' });
  }

  return sendSuccess(res, ngo, 'NGO blocked successfully');
};

/**
 * Unblock an NGO
 * PUT /api/admin/dashboard/ngos/:id/unblock
 */
export const unblockNgo = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  if (!Types.ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, message: 'Invalid NGO id' });
  }

  const ngo = await UserModel.findByIdAndUpdate(id, { isBlocked: false }, { new: true })
    .select('-password');

  if (!ngo) {
    return res.status(404).json({ success: false, message: 'NGO not found' });
  }

  return sendSuccess(res, ngo, 'NGO unblocked successfully');
};

/**
 * Block a Donor
 * PUT /api/admin/dashboard/donors/:id/block
 */
export const blockDonor = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  if (!Types.ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, message: 'Invalid donor id' });
  }

  const donor = await DonorModel.findByIdAndUpdate(id, { isBlocked: true }, { new: true })
    .select('-password');

  if (!donor) {
    return res.status(404).json({ success: false, message: 'Donor not found' });
  }

  return sendSuccess(res, donor, 'Donor blocked successfully');
};

/**
 * Unblock a Donor
 * PUT /api/admin/dashboard/donors/:id/unblock
 */
export const unblockDonor = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  if (!Types.ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, message: 'Invalid donor id' });
  }

  const donor = await DonorModel.findByIdAndUpdate(id, { isBlocked: false }, { new: true })
    .select('-password');

  if (!donor) {
    return res.status(404).json({ success: false, message: 'Donor not found' });
  }

  return sendSuccess(res, donor, 'Donor unblocked successfully');
};


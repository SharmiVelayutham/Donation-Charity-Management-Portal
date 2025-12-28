import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { ContributionModel } from '../models/Contribution.model';
import { DonationModel } from '../models/Donation.model';
import { AuthRequest } from '../middleware/auth.middleware';
import { sendSuccess } from '../utils/response';
export const trackDonation = async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!Types.ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, message: 'Invalid donation id' });
  }

  const donation = await DonationModel.findById(id)
    .populate('ngoId', 'name email contactInfo')
    .lean();

  if (!donation) {
    return res.status(404).json({ success: false, message: 'Donation not found' });
  }
  const contributions = await ContributionModel.find({ donationId: id })
    .populate('donorId', 'name email contactInfo')
    .sort({ createdAt: -1 })
    .lean();

  const tracking = {
    donation: {
      id: donation._id,
      donationType: donation.donationType,
      quantityOrAmount: donation.quantityOrAmount,
      location: donation.location,
      status: donation.status,
      priority: donation.priority,
      pickupDateTime: donation.pickupDateTime,
      createdAt: donation.createdAt,
      ngo: donation.ngoId,
    },
    contributions: contributions.map((c) => ({
      id: c._id,
      donor: c.donorId,
      status: c.status,
      scheduledPickupTime: c.scheduledPickupTime,
      notes: c.notes,
      createdAt: c.createdAt,
    })),
    summary: {
      totalContributions: contributions.length,
      approvedContributions: contributions.filter((c) => c.status === 'APPROVED').length,
      completedContributions: contributions.filter((c) => c.status === 'COMPLETED').length,
      pendingContributions: contributions.filter((c) => c.status === 'PENDING').length,
    },
  };

  return sendSuccess(res, tracking, 'Donation tracking info');
};
export const trackMyContributions = async (req: AuthRequest, res: Response) => {
  const donorId = req.user!.id;
  const { status } = req.query;

  const filter: Record<string, unknown> = { donorId };
  if (status) filter.status = status;

  const contributions = await ContributionModel.find(filter)
    .populate({
      path: 'donationId',
      populate: { path: 'ngoId', select: 'name email contactInfo' },
    })
    .sort({ createdAt: -1 })
    .lean();

  const tracking = contributions.map((c) => ({
    contribution: {
      id: c._id,
      status: c.status,
      scheduledPickupTime: c.scheduledPickupTime,
      notes: c.notes,
      createdAt: c.createdAt,
    },
    donation: c.donationId,
  }));

  return sendSuccess(res, { contributions: tracking }, 'Contribution tracking');
};
export const getUpcomingPickups = async (req: AuthRequest, res: Response) => {
  const donorId = req.user!.id;
  const now = new Date();

  const pickups = await ContributionModel.find({
    donorId,
    status: { $in: ['APPROVED', 'PENDING'] },
    scheduledPickupTime: { $gte: now },
  })
    .populate({
      path: 'donationId',
      populate: { path: 'ngoId', select: 'name email contactInfo' },
    })
    .sort({ scheduledPickupTime: 1 })
    .limit(20)
    .lean();

  return sendSuccess(res, { pickups }, 'Upcoming pickups');
};
export const getNgoUpcomingPickups = async (req: AuthRequest, res: Response) => {
  const ngoId = req.user!.id;
  const now = new Date();
  const donations = await DonationModel.find({ ngoId }).select('_id');
  const donationIds = donations.map((d) => d._id);

  const pickups = await ContributionModel.find({
    donationId: { $in: donationIds },
    status: { $in: ['APPROVED', 'PENDING'] },
    scheduledPickupTime: { $gte: now },
  })
    .populate('donorId', 'name email contactInfo')
    .populate('donationId')
    .sort({ scheduledPickupTime: 1 })
    .limit(50)
    .lean();

  return sendSuccess(res, { pickups }, 'Upcoming pickups for NGO');
};


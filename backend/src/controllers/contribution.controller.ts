import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { ContributionModel } from '../models/Contribution.model';
import { DonationModel } from '../models/Donation.model';
import { AuthRequest } from '../middleware/auth.middleware';
import { sendSuccess } from '../utils/response';

const isFutureDate = (value: string | Date) => new Date(value).getTime() > Date.now();

export const createContribution = async (req: AuthRequest, res: Response) => {
  const { donationId, notes, scheduledPickupTime } = req.body;
  if (!donationId || !scheduledPickupTime) {
    return res.status(400).json({ success: false, message: 'Missing required fields' });
  }
  if (!Types.ObjectId.isValid(donationId)) {
    return res.status(400).json({ success: false, message: 'Invalid donation id' });
  }
  if (!isFutureDate(scheduledPickupTime)) {
    return res.status(400).json({ success: false, message: 'Scheduled pickup must be in the future' });
  }
  const donation = await DonationModel.findById(donationId);
  if (!donation) {
    return res.status(404).json({ success: false, message: 'Donation not found' });
  }

  const contribution = await ContributionModel.create({
    donationId,
    donorId: req.user!.id,
    notes,
    scheduledPickupTime,
  });

  return sendSuccess(res, contribution, 'Contribution created', 201);
};

export const getMyContributions = async (req: AuthRequest, res: Response) => {
  const contributions = await ContributionModel.find({ donorId: req.user!.id })
    .populate('donationId')
    .sort({ createdAt: -1 });
  return sendSuccess(res, contributions, 'My contributions');
};

export const getNgoContributions = async (req: AuthRequest, res: Response) => {
  // Fetch contributions for donations owned by this NGO
  const donations = await DonationModel.find({ ngoId: req.user!.id }).select('_id');
  const donationIds = donations.map((d) => d._id);
  const contributions = await ContributionModel.find({ donationId: { $in: donationIds } })
    .populate('donorId')
    .populate('donationId')
    .sort({ createdAt: -1 });
  return sendSuccess(res, contributions, 'NGO contributions');
};


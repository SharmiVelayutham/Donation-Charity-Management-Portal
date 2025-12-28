import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { ContributionModel, ContributionStatus } from '../models/Contribution.model';
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

  const populated = await ContributionModel.findById(contribution._id)
    .populate('donorId', 'name email contactInfo')
    .populate('donationId');

  return sendSuccess(res, populated, 'Contribution created', 201);
};

export const getMyContributions = async (req: AuthRequest, res: Response) => {
  const contributions = await ContributionModel.find({ donorId: req.user!.id })
    .populate('donationId')
    .sort({ createdAt: -1 });
  return sendSuccess(res, contributions, 'My contributions');
};

export const getNgoContributions = async (req: AuthRequest, res: Response) => {
  const donations = await DonationModel.find({ ngoId: req.user!.id }).select('_id');
  const donationIds = donations.map((d) => d._id);
  const contributions = await ContributionModel.find({ donationId: { $in: donationIds } })
    .populate('donorId', 'name email contactInfo')
    .populate('donationId')
    .sort({ createdAt: -1 });
  return sendSuccess(res, contributions, 'NGO contributions');
};
export const approveContribution = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { status } = req.body as { status: ContributionStatus };

  if (!Types.ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, message: 'Invalid contribution id' });
  }

  if (!['APPROVED', 'REJECTED', 'COMPLETED'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid status. Use APPROVED, REJECTED, or COMPLETED' });
  }

  const contribution = await ContributionModel.findById(id).populate('donationId');
  if (!contribution) {
    return res.status(404).json({ success: false, message: 'Contribution not found' });
  }

  const donation = contribution.donationId as any;
  if (donation.ngoId.toString() !== req.user!.id && req.user!.role !== 'ADMIN') {
    return res.status(403).json({ success: false, message: 'Forbidden: You can only approve contributions for your own donations' });
  }

  contribution.status = status;
  await contribution.save();
  if (status === 'APPROVED') {
    await DonationModel.findByIdAndUpdate(donation._id, { status: 'CONFIRMED' });
  }

  const updated = await ContributionModel.findById(id)
    .populate('donorId', 'name email contactInfo')
    .populate('donationId');

  return sendSuccess(res, updated, `Contribution ${status.toLowerCase()}`);
};
export const updatePickupSchedule = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { scheduledPickupTime } = req.body as { scheduledPickupTime: string | Date };

  if (!Types.ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, message: 'Invalid contribution id' });
  }

  if (!scheduledPickupTime) {
    return res.status(400).json({ success: false, message: 'Missing scheduledPickupTime' });
  }

  if (!isFutureDate(scheduledPickupTime)) {
    return res.status(400).json({ success: false, message: 'Scheduled pickup must be in the future' });
  }

  const contribution = await ContributionModel.findById(id).populate('donationId');
  if (!contribution) {
    return res.status(404).json({ success: false, message: 'Contribution not found' });
  }

  const donation = contribution.donationId as any;
  if (donation.ngoId.toString() !== req.user!.id && req.user!.role !== 'ADMIN') {
    return res.status(403).json({ success: false, message: 'Forbidden: You can only update schedules for your own donations' });
  }

  contribution.scheduledPickupTime = new Date(scheduledPickupTime);
  await contribution.save();

  const updated = await ContributionModel.findById(id)
    .populate('donorId', 'name email contactInfo')
    .populate('donationId');

  return sendSuccess(res, updated, 'Pickup schedule updated');
};


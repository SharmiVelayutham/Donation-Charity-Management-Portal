import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { DonationModel } from '../models/Donation.model';
import { AuthRequest } from '../middleware/auth.middleware';
import { sendSuccess } from '../utils/response';

const isFutureDate = (value: string | Date) => new Date(value).getTime() > Date.now();

export const createDonation = async (req: AuthRequest, res: Response) => {
  const { donationType, quantityOrAmount, location, pickupDateTime, status, priority } = req.body;

  if (!donationType || !quantityOrAmount || !location || !pickupDateTime) {
    return res.status(400).json({ success: false, message: 'Missing required fields' });
  }
  const quantity = Number(quantityOrAmount);
  if (Number.isNaN(quantity) || quantity <= 0) {
    return res.status(400).json({ success: false, message: 'Quantity/Amount must be greater than 0' });
  }
  if (!isFutureDate(pickupDateTime)) {
    return res.status(400).json({ success: false, message: 'Pickup date must be in the future' });
  }

  const files = (req.files as Express.Multer.File[]) || [];
  const imagePaths = files.map((file) => file.path);

  const donation = await DonationModel.create({
    ngoId: req.user!.id,
    donationType,
    quantityOrAmount: quantity,
    location,
    pickupDateTime,
    status: status || 'PENDING',
    images: imagePaths,
    priority: priority || 'NORMAL',
  });

  return sendSuccess(res, donation, 'Donation created', 201);
};

export const getDonations = async (_req: Request, res: Response) => {
  const donations = await DonationModel.find().sort({ createdAt: -1 });
  return sendSuccess(res, donations, 'Donations fetched');
};

export const getDonationById = async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!Types.ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, message: 'Invalid id' });
  }
  const donation = await DonationModel.findById(id);
  if (!donation) {
    return res.status(404).json({ success: false, message: 'Donation not found' });
  }
  return sendSuccess(res, donation, 'Donation fetched');
};

export const updateDonation = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  if (!Types.ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, message: 'Invalid id' });
  }
  const donation = await DonationModel.findById(id);
  if (!donation) {
    return res.status(404).json({ success: false, message: 'Donation not found' });
  }
  if (donation.ngoId.toString() !== req.user!.id && req.user!.role !== 'ADMIN') {
    return res.status(403).json({ success: false, message: 'Forbidden' });
  }

  const updates: Record<string, unknown> = {};
  const { donationType, quantityOrAmount, location, pickupDateTime, status, priority } = req.body;
  if (donationType) updates.donationType = donationType;
  if (location) updates.location = location;
  if (status) updates.status = status;
  if (priority) updates.priority = priority;
  if (quantityOrAmount !== undefined) {
    const quantity = Number(quantityOrAmount);
    if (Number.isNaN(quantity) || quantity <= 0) {
      return res.status(400).json({ success: false, message: 'Quantity/Amount must be greater than 0' });
    }
    updates.quantityOrAmount = quantity;
  }
  if (pickupDateTime) {
    if (!isFutureDate(pickupDateTime)) {
      return res.status(400).json({ success: false, message: 'Pickup date must be in the future' });
    }
    updates.pickupDateTime = pickupDateTime;
  }

  const files = (req.files as Express.Multer.File[]) || [];
  if (files.length) {
    updates.images = [...donation.images, ...files.map((file) => file.path)];
  }

  const updated = await DonationModel.findByIdAndUpdate(id, updates, { new: true });
  return sendSuccess(res, updated, 'Donation updated');
};

export const deleteDonation = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  if (!Types.ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, message: 'Invalid id' });
  }
  const donation = await DonationModel.findById(id);
  if (!donation) {
    return res.status(404).json({ success: false, message: 'Donation not found' });
  }
  if (donation.ngoId.toString() !== req.user!.id && req.user!.role !== 'ADMIN') {
    return res.status(403).json({ success: false, message: 'Forbidden' });
  }
  await DonationModel.findByIdAndDelete(id);
  return sendSuccess(res, null, 'Donation deleted');
};


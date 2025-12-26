import { Response } from 'express';
import { Types } from 'mongoose';
import { PaymentModel, PaymentStatus } from '../models/Payment.model';
import { DonationModel } from '../models/Donation.model';
import { AuthRequest } from '../middleware/auth.middleware';
import { sendSuccess } from '../utils/response';

/**
 * Donor confirms payment after completing external payment
 * POST /api/payments/confirm
 */
export const confirmPayment = async (req: AuthRequest, res: Response) => {
  const { paymentId, donorProvidedReference } = req.body as {
    paymentId: string;
    donorProvidedReference?: string;
  };

  if (!paymentId) {
    return res.status(400).json({ success: false, message: 'Payment ID is required' });
  }

  if (!Types.ObjectId.isValid(paymentId)) {
    return res.status(400).json({ success: false, message: 'Invalid payment ID' });
  }

  // Find payment and verify ownership
  const payment = await PaymentModel.findById(paymentId);
  if (!payment) {
    return res.status(404).json({ success: false, message: 'Payment not found' });
  }

  // Verify payment belongs to the logged-in donor
  if (payment.donorId.toString() !== req.user!.id) {
    return res.status(403).json({
      success: false,
      message: 'Forbidden: You can only confirm your own payments',
    });
  }

  // Prevent duplicate confirmations
  if (payment.paymentStatus !== 'PENDING') {
    return res.status(400).json({
      success: false,
      message: `Payment is already ${payment.paymentStatus.toLowerCase()}. Cannot confirm again.`,
    });
  }

  // Update payment with donor-provided reference if provided
  if (donorProvidedReference) {
    payment.donorProvidedReference = donorProvidedReference.trim();
  }

  // Payment remains PENDING until verified by NGO/Admin
  await payment.save();

  const updated = await PaymentModel.findById(paymentId)
    .populate('donorId', 'name email')
    .populate({
      path: 'donationId',
      select: 'donationCategory purpose description quantityOrAmount paymentDetails',
    });

  return sendSuccess(res, updated, 'Payment confirmation submitted. Waiting for verification.');
};

/**
 * Get all payments for NGO's donations
 * GET /api/ngo/payments
 */
export const getNgoPayments = async (req: AuthRequest, res: Response) => {
  const ngoId = req.user!.id;
  const { paymentStatus, donationId } = req.query;

  // Build filter
  const filter: Record<string, unknown> = { ngoId };

  if (paymentStatus) {
    filter.paymentStatus = paymentStatus;
  }
  if (donationId) {
    if (!Types.ObjectId.isValid(donationId as string)) {
      return res.status(400).json({ success: false, message: 'Invalid donation id' });
    }
    // Verify this donation belongs to the NGO
    const donation = await DonationModel.findOne({ _id: donationId, ngoId });
    if (!donation) {
      return res.status(403).json({ success: false, message: 'You do not have access to this donation' });
    }
    filter.donationId = donationId;
  }

  const payments = await PaymentModel.find(filter)
    .populate('donorId', 'name email contactInfo')
    .populate({
      path: 'donationId',
      select: 'donationCategory purpose description quantityOrAmount paymentDetails',
    })
    .sort({ createdAt: -1 })
    .lean();

  return sendSuccess(res, { count: payments.length, payments }, 'Payments fetched successfully');
};

/**
 * Get payment details
 * GET /api/ngo/payments/:id
 */
export const getNgoPaymentDetails = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const ngoId = req.user!.id;

  if (!Types.ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, message: 'Invalid payment id' });
  }

  const payment = await PaymentModel.findById(id)
    .populate('donorId', 'name email contactInfo')
    .populate({
      path: 'donationId',
      select: 'donationCategory purpose description quantityOrAmount paymentDetails',
    })
    .lean();

  if (!payment) {
    return res.status(404).json({ success: false, message: 'Payment not found' });
  }

  // Verify payment belongs to NGO's donation
  if ((payment as any).ngoId.toString() !== ngoId) {
    return res.status(403).json({
      success: false,
      message: 'Forbidden: You can only view payments for your own donations',
    });
  }

  return sendSuccess(res, payment, 'Payment details fetched successfully');
};

/**
 * NGO verifies payment for their own donation
 * PATCH /api/ngo/payments/:id/verify
 */
export const verifyNgoPayment = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { paymentStatus } = req.body as { paymentStatus: PaymentStatus };
  const ngoId = req.user!.id;

  if (!Types.ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, message: 'Invalid payment id' });
  }

  if (!paymentStatus || !['SUCCESS', 'FAILED'].includes(paymentStatus)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid payment status. Must be SUCCESS or FAILED',
    });
  }

  // Find payment and verify ownership
  const payment = await PaymentModel.findById(id);
  if (!payment) {
    return res.status(404).json({ success: false, message: 'Payment not found' });
  }

  // Verify payment belongs to NGO's donation
  if (payment.ngoId.toString() !== ngoId) {
    return res.status(403).json({
      success: false,
      message: 'Forbidden: You can only verify payments for your own donations',
    });
  }

  // Cannot verify already verified payments
  if (payment.paymentStatus !== 'PENDING') {
    return res.status(400).json({
      success: false,
      message: `Payment is already ${payment.paymentStatus.toLowerCase()}. Cannot verify again.`,
    });
  }

  // Update payment status
  payment.paymentStatus = paymentStatus;
  payment.verifiedByRole = 'NGO';
  payment.verifiedById = new Types.ObjectId(ngoId);
  payment.verifiedAt = new Date();

  await payment.save();

  // If payment successful, update donation status
  if (paymentStatus === 'SUCCESS') {
    const donation = await DonationModel.findById(payment.donationId);
    if (donation && donation.status === 'PENDING') {
      donation.status = 'CONFIRMED';
      await donation.save();
    }
  }

  const updated = await PaymentModel.findById(id)
    .populate('donorId', 'name email contactInfo')
    .populate({
      path: 'donationId',
      select: 'donationCategory purpose description quantityOrAmount paymentDetails',
    });

  return sendSuccess(res, updated, `Payment marked as ${paymentStatus.toLowerCase()}`);
};

/**
 * Organization Admin verifies any payment
 * PATCH /api/org/payments/:id/verify
 */
export const verifyOrgPayment = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { paymentStatus } = req.body as { paymentStatus: PaymentStatus };
  const adminId = req.user!.id;

  if (!Types.ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, message: 'Invalid payment id' });
  }

  if (!paymentStatus || !['SUCCESS', 'FAILED'].includes(paymentStatus)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid payment status. Must be SUCCESS or FAILED',
    });
  }

  // Find payment
  const payment = await PaymentModel.findById(id);
  if (!payment) {
    return res.status(404).json({ success: false, message: 'Payment not found' });
  }

  // Cannot verify already verified payments
  if (payment.paymentStatus !== 'PENDING') {
    return res.status(400).json({
      success: false,
      message: `Payment is already ${payment.paymentStatus.toLowerCase()}. Cannot verify again.`,
    });
  }

  // Update payment status
  payment.paymentStatus = paymentStatus;
  payment.verifiedByRole = 'ADMIN';
  payment.verifiedById = new Types.ObjectId(adminId);
  payment.verifiedAt = new Date();

  await payment.save();

  // If payment successful, update donation status
  if (paymentStatus === 'SUCCESS') {
    const donation = await DonationModel.findById(payment.donationId);
    if (donation && donation.status === 'PENDING') {
      donation.status = 'CONFIRMED';
      await donation.save();
    }
  }

  const updated = await PaymentModel.findById(id)
    .populate('donorId', 'name email contactInfo')
    .populate({
      path: 'donationId',
      select: 'donationCategory purpose description quantityOrAmount paymentDetails',
    });

  return sendSuccess(res, updated, `Payment marked as ${paymentStatus.toLowerCase()}`);
};

/**
 * Get all payments (Organization Admin)
 * GET /api/org/payments
 */
export const getAllOrgPayments = async (req: AuthRequest, res: Response) => {
  const { paymentStatus, ngoId, donationId } = req.query;

  const filter: Record<string, unknown> = {};

  if (paymentStatus) {
    filter.paymentStatus = paymentStatus;
  }
  if (ngoId) {
    if (!Types.ObjectId.isValid(ngoId as string)) {
      return res.status(400).json({ success: false, message: 'Invalid NGO id' });
    }
    filter.ngoId = ngoId;
  }
  if (donationId) {
    if (!Types.ObjectId.isValid(donationId as string)) {
      return res.status(400).json({ success: false, message: 'Invalid donation id' });
    }
    filter.donationId = donationId;
  }

  const payments = await PaymentModel.find(filter)
    .populate('donorId', 'name email contactInfo')
    .populate('ngoId', 'name email contactInfo')
    .populate({
      path: 'donationId',
      select: 'donationCategory purpose description quantityOrAmount paymentDetails',
    })
    .sort({ createdAt: -1 })
    .lean();

  return sendSuccess(res, { count: payments.length, payments }, 'All payments fetched successfully');
};


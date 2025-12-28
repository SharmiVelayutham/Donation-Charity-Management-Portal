import { Response } from 'express';
import { Types } from 'mongoose';
import { ContributionModel, PickupStatus } from '../models/Contribution.model';
import { PaymentModel, PaymentStatus } from '../models/Payment.model';
import { DonationModel } from '../models/Donation.model';
import { DonorModel } from '../models/Donor.model';
import { AuthRequest } from '../middleware/auth.middleware';
import { sendSuccess } from '../utils/response';

const isFutureDate = (value: string | Date) => new Date(value).getTime() > Date.now();
const generateTransactionReferenceId = (): string => {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `PAY-${timestamp}-${random}`;
};
export const contributeToDonation = async (req: AuthRequest, res: Response) => {
  const { id: donationId } = req.params;
  const {
    pickupScheduledDateTime,
    donorAddress,
    donorContactNumber,
    notes,
    amount,
    donorProvidedReference,
  } = req.body;
  if (!Types.ObjectId.isValid(donationId)) {
    return res.status(400).json({ success: false, message: 'Invalid donation id' });
  }
  const donation = await DonationModel.findById(donationId);
  if (!donation) {
    return res.status(404).json({ success: false, message: 'Donation not found' });
  }

  if (donation.status === 'CANCELLED' || donation.status === 'COMPLETED') {
    return res.status(400).json({
      success: false,
      message: `Cannot contribute to ${donation.status.toLowerCase()} donation`,
    });
  }

  const donationCategory = donation.donationCategory || donation.donationType;
  if (donationCategory === 'MONEY' || donationCategory === 'FUNDS') {
    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ success: false, message: 'Amount is required and must be greater than 0' });
    }
    if (!donation.paymentDetails) {
      return res.status(400).json({
        success: false,
        message: 'Payment details not configured for this donation. Please contact the NGO.',
      });
    }

    const paymentDetails = donation.paymentDetails as any;
    if (
      !paymentDetails.qrCodeImage ||
      !paymentDetails.bankAccountNumber ||
      !paymentDetails.bankName ||
      !paymentDetails.ifscCode ||
      !paymentDetails.accountHolderName
    ) {
      return res.status(400).json({
        success: false,
        message: 'Payment details incomplete. QR code and bank details are required.',
      });
    }
    const existingPayment = await PaymentModel.findOne({
      donationId,
      donorId: req.user!.id,
    });
    if (existingPayment) {
      return res.status(409).json({
        success: false,
        message: 'You have already submitted a payment for this donation',
      });
    }
    let transactionReferenceId = generateTransactionReferenceId();
    let isUnique = false;
    while (!isUnique) {
      const exists = await PaymentModel.findOne({ transactionReferenceId });
      if (!exists) {
        isUnique = true;
      } else {
        transactionReferenceId = generateTransactionReferenceId();
      }
    }
    const payment = await PaymentModel.create({
      donationId,
      donorId: req.user!.id,
      ngoId: donation.ngoId,
      amount: Number(amount),
      transactionReferenceId,
      donorProvidedReference: donorProvidedReference?.trim(),
      paymentStatus: 'PENDING',
    });

    const populated = await PaymentModel.findById(payment._id)
      .populate('donorId', 'name email')
      .populate('donationId', 'donationCategory purpose description quantityOrAmount paymentDetails');

    return sendSuccess(
      res,
      {
        ...populated?.toObject(),
        paymentDetails: {
          qrCodeImage: paymentDetails.qrCodeImage,
          bankAccountNumber: paymentDetails.bankAccountNumber,
          bankName: paymentDetails.bankName,
          ifscCode: paymentDetails.ifscCode,
          accountHolderName: paymentDetails.accountHolderName,
        },
      },
      'Payment submitted successfully. Please complete payment externally and confirm.',
      201
    );
  }
  if (!pickupScheduledDateTime || !donorAddress || !donorContactNumber) {
    return res.status(400).json({
      success: false,
      message: 'Missing required fields: pickupScheduledDateTime, donorAddress, donorContactNumber',
    });
  }
  const pickupDate = new Date(pickupScheduledDateTime);
  if (isNaN(pickupDate.getTime())) {
    return res.status(400).json({ success: false, message: 'Invalid pickup date/time format' });
  }
  if (!isFutureDate(pickupDate)) {
    return res.status(400).json({ success: false, message: 'Pickup date must be in the future' });
  }
  if (typeof donorAddress !== 'string' || donorAddress.trim().length === 0) {
    return res.status(400).json({ success: false, message: 'Donor address cannot be empty' });
  }
  if (typeof donorContactNumber !== 'string' || donorContactNumber.trim().length === 0) {
    return res.status(400).json({ success: false, message: 'Donor contact number cannot be empty' });
  }
  const existingContribution = await ContributionModel.findOne({
    donationId,
    donorId: req.user!.id,
  });
  if (existingContribution) {
    return res.status(409).json({ success: false, message: 'You have already contributed to this donation' });
  }
  const donor = await DonorModel.findById(req.user!.id);
  if (!donor) {
    return res.status(404).json({ success: false, message: 'Donor not found' });
  }
  const donorUpdates: Record<string, unknown> = {};
  if (!donor.fullAddress) {
    donorUpdates.fullAddress = donorAddress.trim();
  }
  if (!donor.phoneNumber) {
    donorUpdates.phoneNumber = donorContactNumber.trim();
  }
  if (Object.keys(donorUpdates).length > 0) {
    await DonorModel.findByIdAndUpdate(req.user!.id, donorUpdates);
  }
  const contribution = await ContributionModel.create({
    donationId,
    donorId: req.user!.id,
    pickupScheduledDateTime: pickupDate,
    scheduledPickupTime: pickupDate, // Legacy field
    donorAddress: donorAddress.trim(),
    donorContactNumber: donorContactNumber.trim(),
    pickupStatus: 'SCHEDULED',
    notes: notes?.trim(),
    status: 'PENDING',
  });

  const populated = await ContributionModel.findById(contribution._id)
    .populate('donorId', 'name email')
    .populate('donationId');

  return sendSuccess(res, populated, 'Contribution submitted successfully', 201);
};
export const getNgoPickups = async (req: AuthRequest, res: Response) => {
  const ngoId = req.user!.id;
  const { pickupStatus, donationId } = req.query;
  const donations = await DonationModel.find({ ngoId }).select('_id');
  const donationIds = donations.map((d) => d._id);

  if (donationIds.length === 0) {
    return sendSuccess(res, { count: 0, pickups: [] }, 'No pickups found');
  }
  const filter: Record<string, unknown> = {
    donationId: { $in: donationIds },
  };

  if (pickupStatus) {
    filter.pickupStatus = pickupStatus;
  }
  if (donationId) {
    if (!Types.ObjectId.isValid(donationId as string)) {
      return res.status(400).json({ success: false, message: 'Invalid donation id' });
    }
    const donation = await DonationModel.findOne({ _id: donationId, ngoId });
    if (!donation) {
      return res.status(403).json({ success: false, message: 'You do not have access to this donation' });
    }
    filter.donationId = donationId;
  }

  const pickups = await ContributionModel.find(filter)
    .populate('donorId', 'name email') // Donor name and email
    .populate({
      path: 'donationId',
      select: 'donationCategory donationType purpose quantityOrAmount location pickupDateTime',
    })
    .sort({ pickupScheduledDateTime: 1 }) // Sort by pickup date
    .lean();
  const formattedPickups = pickups.map((pickup: any) => {
    const donor = pickup.donorId || {};
    return {
      _id: pickup._id,
      donation: {
        id: pickup.donationId?._id,
        donationCategory: pickup.donationId?.donationCategory || pickup.donationId?.donationType,
        donationType: pickup.donationId?.donationType,
        purpose: pickup.donationId?.purpose,
        quantityOrAmount: pickup.donationId?.quantityOrAmount,
        pickupLocation: pickup.donationId?.location,
        pickupDateTime: pickup.donationId?.pickupDateTime,
      },
      donor: {
        id: donor._id,
        name: donor.name,
        email: donor.email,
        address: pickup.donorAddress, // Donor address from contribution
        contactNumber: pickup.donorContactNumber, // Donor contact from contribution
      },
      pickupScheduledDateTime: pickup.pickupScheduledDateTime || pickup.scheduledPickupTime,
      pickupStatus: pickup.pickupStatus,
      contributionStatus: pickup.status,
      notes: pickup.notes,
      createdAt: pickup.createdAt,
    };
  });

  return sendSuccess(res, { count: formattedPickups.length, pickups: formattedPickups }, 'Pickups fetched successfully');
};
export const updatePickupStatus = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { pickupStatus } = req.body as { pickupStatus: PickupStatus };
  const ngoId = req.user!.id;

  if (!Types.ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, message: 'Invalid pickup id' });
  }

  if (!pickupStatus || !['SCHEDULED', 'PICKED_UP', 'CANCELLED'].includes(pickupStatus)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid pickup status. Must be SCHEDULED, PICKED_UP, or CANCELLED',
    });
  }
  const contribution = await ContributionModel.findById(id).populate('donationId');
  if (!contribution) {
    return res.status(404).json({ success: false, message: 'Pickup not found' });
  }

  const donation = contribution.donationId as any;
  if (donation.ngoId.toString() !== ngoId) {
    return res.status(403).json({
      success: false,
      message: 'Forbidden: You can only manage pickups for your own donations',
    });
  }
  contribution.pickupStatus = pickupStatus;
  if (pickupStatus === 'PICKED_UP') {
    contribution.status = 'COMPLETED';
  }
  
  await contribution.save();
  const updated = await ContributionModel.findById(id)
    .populate('donorId', 'name email')
    .populate({
      path: 'donationId',
      select: 'donationCategory donationType purpose quantityOrAmount location pickupDateTime',
    })
    .lean();

  const formattedPickup = {
    _id: updated!._id,
    donation: {
      id: updated!.donationId?._id,
      donationCategory: (updated!.donationId as any)?.donationCategory || (updated!.donationId as any)?.donationType,
      donationType: (updated!.donationId as any)?.donationType,
      purpose: (updated!.donationId as any)?.purpose,
      quantityOrAmount: (updated!.donationId as any)?.quantityOrAmount,
      pickupLocation: (updated!.donationId as any)?.location,
      pickupDateTime: (updated!.donationId as any)?.pickupDateTime,
    },
    donor: {
      id: (updated!.donorId as any)?._id,
      name: (updated!.donorId as any)?.name,
      email: (updated!.donorId as any)?.email,
      address: updated!.donorAddress,
      contactNumber: updated!.donorContactNumber,
    },
    pickupScheduledDateTime: updated!.pickupScheduledDateTime || updated!.scheduledPickupTime,
    pickupStatus: updated!.pickupStatus,
    contributionStatus: updated!.status,
    notes: updated!.notes,
    createdAt: updated!.createdAt,
  };

  return sendSuccess(res, formattedPickup, 'Pickup status updated successfully');
};


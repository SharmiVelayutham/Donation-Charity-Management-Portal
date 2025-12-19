import { Response } from 'express';
import { Types } from 'mongoose';
import { DonationModel, DonationCategory } from '../models/Donation.model';
import { ContributionModel } from '../models/Contribution.model';
import { AuthRequest } from '../middleware/auth.middleware';
import { sendSuccess } from '../utils/response';
import { normalizeLocation, isValidTimezone } from '../utils/location';
import fs from 'fs';
import path from 'path';

const isFutureDate = (value: string | Date) => new Date(value).getTime() > Date.now();

// Valid donation categories for NGO Admin Dashboard
const VALID_DONATION_CATEGORIES: DonationCategory[] = ['CLOTHES', 'FOOD', 'MONEY'];

/**
 * Create donation request (NGO Admin Dashboard)
 * POST /api/ngo/donations
 */
export const createNgoDonation = async (req: AuthRequest, res: Response) => {
  const {
    donationCategory,
    purpose,
    description,
    quantityOrAmount,
    pickupLocation,
    pickupDateTime,
    timezone,
    priority,
    // Payment details for MONEY donations
    qrCodeImage,
    bankAccountNumber,
    bankName,
    ifscCode,
    accountHolderName,
  } = req.body;

  // Validation: Required fields
  if (!donationCategory || !purpose || !description || !quantityOrAmount) {
    return res.status(400).json({
      success: false,
      message: 'Missing required fields: donationCategory, purpose, description, quantityOrAmount',
    });
  }

  // Validate donation category
  const normalizedCategory = (donationCategory as string).toUpperCase() as DonationCategory;
  if (!VALID_DONATION_CATEGORIES.includes(normalizedCategory)) {
    return res.status(400).json({
      success: false,
      message: `Invalid donation category. Valid categories: ${VALID_DONATION_CATEGORIES.join(', ')}`,
    });
  }

  // Validate purpose and description (cannot be empty)
  if (typeof purpose !== 'string' || purpose.trim().length === 0) {
    return res.status(400).json({ success: false, message: 'Purpose cannot be empty' });
  }
  if (typeof description !== 'string' || description.trim().length === 0) {
    return res.status(400).json({ success: false, message: 'Description cannot be empty' });
  }

  // Validate quantity/amount
  const quantity = Number(quantityOrAmount);
  if (Number.isNaN(quantity) || quantity <= 0) {
    return res.status(400).json({ success: false, message: 'Quantity/Amount must be greater than 0' });
  }

  // For MONEY donations, validate payment details
  if (normalizedCategory === 'MONEY') {
    if (!qrCodeImage || !bankAccountNumber || !bankName || !ifscCode || !accountHolderName) {
      return res.status(400).json({
        success: false,
        message:
          'Missing payment details for MONEY donation: qrCodeImage, bankAccountNumber, bankName, ifscCode, accountHolderName are required',
      });
    }
  } else {
    // For FOOD/CLOTHES donations, validate pickup details
    if (!pickupLocation || !pickupDateTime) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields for FOOD/CLOTHES donation: pickupLocation, pickupDateTime',
      });
    }
  }

  // Validate and normalize location (for FOOD/CLOTHES only)
  let normalizedLocation;
  if (normalizedCategory !== 'MONEY') {
    try {
      // Support both string and object format for pickupLocation
      normalizedLocation = normalizeLocation(pickupLocation);
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message || 'Invalid pickup location format' });
    }
  }

  // Validate pickup date/time (for FOOD/CLOTHES only)
  let pickupDate: Date | undefined;
  if (normalizedCategory !== 'MONEY') {
    pickupDate = new Date(pickupDateTime);
    if (isNaN(pickupDate.getTime())) {
      return res.status(400).json({ success: false, message: 'Invalid pickup date/time format' });
    }
    if (!isFutureDate(pickupDate)) {
      return res.status(400).json({ success: false, message: 'Pickup date must be in the future' });
    }
  }

  // Validate timezone if provided
  if (timezone && !isValidTimezone(timezone)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid timezone format. Use IANA timezone (e.g., America/New_York, Europe/London)',
    });
  }

  // Handle image uploads
  const files = (req.files as Express.Multer.File[]) || [];
  const imagePaths = files.map((file) => file.path);

  // Build donation data
  const donationData: any = {
    ngoId: req.user!.id,
    donationType: normalizedCategory, // Map category to legacy type for backward compatibility
    donationCategory: normalizedCategory,
    purpose: purpose.trim(),
    description: description.trim(),
    quantityOrAmount: quantity,
    status: 'PENDING', // Default status
    images: imagePaths,
    priority: priority || 'NORMAL',
  };

  // Add location and pickup date for FOOD/CLOTHES donations
  if (normalizedCategory !== 'MONEY') {
    donationData.location = normalizedLocation;
    donationData.pickupDateTime = pickupDate;
    if (timezone) {
      donationData.timezone = timezone;
    }
  }

  // Add payment details for MONEY donations
  if (normalizedCategory === 'MONEY') {
    donationData.paymentDetails = {
      qrCodeImage: qrCodeImage.trim(),
      bankAccountNumber: bankAccountNumber.trim(),
      bankName: bankName.trim(),
      ifscCode: ifscCode.trim(),
      accountHolderName: accountHolderName.trim(),
    };
  }

  // Create donation
  const donation = await DonationModel.create(donationData);

  const populated = await DonationModel.findById(donation._id)
    .populate('ngoId', 'name email contactInfo role');

  return sendSuccess(res, populated, 'Donation request created successfully', 201);
};

/**
 * Get all donations created by logged-in NGO
 * GET /api/ngo/donations
 */
export const getNgoDonations = async (req: AuthRequest, res: Response) => {
  const { status, priority, donationCategory } = req.query;
  const ngoId = req.user!.id;

  // Build filter - only this NGO's donations
  const filter: Record<string, unknown> = { ngoId };

  if (status) {
    filter.status = status;
  }
  if (priority) {
    filter.priority = priority;
  }
  if (donationCategory) {
    filter.donationCategory = donationCategory;
  }

  const donations = await DonationModel.find(filter)
    .populate('ngoId', 'name email contactInfo role')
    .sort({ createdAt: -1 })
    .lean();

  // Add contribution counts for each donation
  const donationsWithCounts = await Promise.all(
    donations.map(async (donation) => {
      const contributionCount = await ContributionModel.countDocuments({
        donationId: donation._id,
      });
      const approvedCount = await ContributionModel.countDocuments({
        donationId: donation._id,
        status: { $in: ['APPROVED', 'COMPLETED'] },
      });
      return {
        ...donation,
        contributionCount,
        approvedContributions: approvedCount,
      };
    })
  );

  return sendSuccess(res, donationsWithCounts, 'NGO donations fetched successfully');
};

/**
 * Get donation details (only own donation)
 * GET /api/ngo/donations/:id
 */
export const getNgoDonationById = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const ngoId = req.user!.id;

  if (!Types.ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, message: 'Invalid donation id' });
  }

  const donation = await DonationModel.findOne({ _id: id, ngoId })
    .populate('ngoId', 'name email contactInfo role')
    .lean();

  if (!donation) {
    return res.status(404).json({
      success: false,
      message: 'Donation not found or you do not have permission to access it',
    });
  }

  // Add contribution counts
  const contributionCount = await ContributionModel.countDocuments({ donationId: id });
  const approvedCount = await ContributionModel.countDocuments({
    donationId: id,
    status: { $in: ['APPROVED', 'COMPLETED'] },
  });

  const donationWithCounts = {
    ...donation,
    contributionCount,
    approvedContributions: approvedCount,
  };

  return sendSuccess(res, donationWithCounts, 'Donation details fetched successfully');
};

/**
 * Update donation request
 * PUT /api/ngo/donations/:id
 */
export const updateNgoDonation = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const ngoId = req.user!.id;

  if (!Types.ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, message: 'Invalid donation id' });
  }

  // Find donation and verify ownership
  const donation = await DonationModel.findOne({ _id: id, ngoId });
  if (!donation) {
    return res.status(404).json({
      success: false,
      message: 'Donation not found or you do not have permission to update it',
    });
  }

  // Cannot update cancelled or completed donations
  if (donation.status === 'CANCELLED' || donation.status === 'COMPLETED') {
    return res.status(400).json({
      success: false,
      message: `Cannot update ${donation.status.toLowerCase()} donation`,
    });
  }

  const {
    donationCategory,
    purpose,
    description,
    quantityOrAmount,
    pickupLocation,
    pickupDateTime,
    timezone,
    status,
    priority,
    images,
    removeImages,
  } = req.body;

  const updates: Record<string, unknown> = {};

  // Update donation category
  if (donationCategory) {
    const normalizedCategory = (donationCategory as string).toUpperCase() as DonationCategory;
    if (!VALID_DONATION_CATEGORIES.includes(normalizedCategory)) {
      return res.status(400).json({
        success: false,
        message: `Invalid donation category. Valid categories: ${VALID_DONATION_CATEGORIES.join(', ')}`,
      });
    }
    updates.donationCategory = normalizedCategory;
    updates.donationType = normalizedCategory; // Update legacy field
  }

  // Update purpose
  if (purpose !== undefined) {
    if (typeof purpose !== 'string' || purpose.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Purpose cannot be empty' });
    }
    updates.purpose = purpose.trim();
  }

  // Update description
  if (description !== undefined) {
    if (typeof description !== 'string' || description.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Description cannot be empty' });
    }
    updates.description = description.trim();
  }

  // Update quantity/amount
  if (quantityOrAmount !== undefined) {
    const quantity = Number(quantityOrAmount);
    if (Number.isNaN(quantity) || quantity <= 0) {
      return res.status(400).json({ success: false, message: 'Quantity/Amount must be greater than 0' });
    }
    updates.quantityOrAmount = quantity;
  }

  // Update location
  if (pickupLocation) {
    try {
      updates.location = normalizeLocation(pickupLocation);
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message || 'Invalid pickup location format' });
    }
  }

  // Update pickup date/time
  if (pickupDateTime) {
    const pickupDate = new Date(pickupDateTime);
    if (isNaN(pickupDate.getTime())) {
      return res.status(400).json({ success: false, message: 'Invalid pickup date/time format' });
    }
    if (!isFutureDate(pickupDate)) {
      return res.status(400).json({ success: false, message: 'Pickup date must be in the future' });
    }
    updates.pickupDateTime = pickupDate;
  }

  // Update timezone
  if (timezone !== undefined) {
    if (timezone === null || timezone === '') {
      updates.timezone = undefined;
    } else if (!isValidTimezone(timezone)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid timezone format. Use IANA timezone (e.g., America/New_York, Europe/London)',
      });
    } else {
      updates.timezone = timezone;
    }
  }

  // Update status (NGO can change status)
  if (status && ['PENDING', 'CONFIRMED', 'COMPLETED'].includes(status)) {
    updates.status = status;
  }

  // Update priority
  if (priority && ['NORMAL', 'URGENT'].includes(priority)) {
    updates.priority = priority;
  }

  // Handle image updates
  let updatedImages = [...donation.images];

  // Remove specified images
  if (removeImages && Array.isArray(removeImages)) {
    removeImages.forEach((imagePath: string) => {
      const fullPath = path.join(process.cwd(), imagePath);
      if (fs.existsSync(fullPath)) {
        try {
          fs.unlinkSync(fullPath);
        } catch (error) {
          console.error(`Error deleting image: ${imagePath}`, error);
        }
      }
      updatedImages = updatedImages.filter((img) => img !== imagePath);
    });
  }

  // Add new images
  const files = (req.files as Express.Multer.File[]) || [];
  if (files.length) {
    updatedImages = [...updatedImages, ...files.map((file) => file.path)];
  }

  // Replace images if new array provided
  if (images && Array.isArray(images)) {
    updatedImages = images;
  }

  updates.images = updatedImages;

  // Update donation
  const updated = await DonationModel.findByIdAndUpdate(id, updates, { new: true })
    .populate('ngoId', 'name email contactInfo role');

  return sendSuccess(res, updated, 'Donation request updated successfully');
};

/**
 * Update donation priority only
 * PATCH /api/ngo/donations/:id/priority
 */
export const updateNgoDonationPriority = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { priority } = req.body;
  const ngoId = req.user!.id;

  if (!Types.ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, message: 'Invalid donation id' });
  }

  if (!priority || !['NORMAL', 'URGENT'].includes(priority)) {
    return res.status(400).json({
      success: false,
      message: 'Priority is required and must be either NORMAL or URGENT',
    });
  }

  // Find donation and verify ownership
  const donation = await DonationModel.findOne({ _id: id, ngoId });
  if (!donation) {
    return res.status(404).json({
      success: false,
      message: 'Donation not found or you do not have permission to update it',
    });
  }

  donation.priority = priority as 'NORMAL' | 'URGENT';
  await donation.save();

  const updated = await DonationModel.findById(id).populate('ngoId', 'name email contactInfo role');

  return sendSuccess(res, updated, 'Donation priority updated successfully');
};

/**
 * Cancel donation request
 * DELETE /api/ngo/donations/:id
 */
export const cancelNgoDonation = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const ngoId = req.user!.id;

  if (!Types.ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, message: 'Invalid donation id' });
  }

  // Find donation and verify ownership
  const donation = await DonationModel.findOne({ _id: id, ngoId });
  if (!donation) {
    return res.status(404).json({
      success: false,
      message: 'Donation not found or you do not have permission to cancel it',
    });
  }

  // Cannot cancel already completed donations
  if (donation.status === 'COMPLETED') {
    return res.status(400).json({ success: false, message: 'Cannot cancel completed donation' });
  }

  // Set status to CANCELLED (preserves history)
  donation.status = 'CANCELLED';
  await donation.save();

  const updated = await DonationModel.findById(id).populate('ngoId', 'name email contactInfo role');

  return sendSuccess(res, updated, 'Donation request cancelled successfully');
};


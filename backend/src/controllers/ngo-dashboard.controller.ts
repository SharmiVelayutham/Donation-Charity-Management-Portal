import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { sendSuccess } from '../utils/response';
import { query, queryOne, insert, update } from '../config/mysql';
import fs from 'fs';
import path from 'path';

const isFutureDate = (value: string | Date) => new Date(value).getTime() > Date.now();

// Valid donation categories for NGO Admin Dashboard
const VALID_DONATION_CATEGORIES = ['CLOTHES', 'FOOD', 'MONEY'] as const;
type DonationCategory = typeof VALID_DONATION_CATEGORIES[number];

/**
 * Create donation request (NGO Admin Dashboard)
 * POST /api/ngo/donations
 */
export const createNgoDonation = async (req: AuthRequest, res: Response) => {
  try {
    const ngoId = parseInt(req.user!.id);
    const {
      donationCategory,
      purpose,
      description,
      quantityOrAmount,
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

    // Validate purpose and description
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

    // Get NGO profile to use registered address
    const ngoProfile = await queryOne<any>(
      'SELECT address, city, state, pincode FROM users WHERE id = ?',
      [ngoId]
    );

    if (!ngoProfile) {
      return res.status(404).json({ success: false, message: 'NGO profile not found' });
    }

    // Build address from NGO profile
    const ngoAddress = [
      ngoProfile.address,
      ngoProfile.city,
      ngoProfile.state,
      ngoProfile.pincode
    ].filter(Boolean).join(', ');

    if (!ngoAddress) {
      return res.status(400).json({
        success: false,
        message: 'NGO address not found. Please complete your profile with address details first.',
      });
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
      // For FOOD/CLOTHES donations, validate pickup date/time
      if (!pickupDateTime) {
        return res.status(400).json({
          success: false,
          message: 'Missing required field for FOOD/CLOTHES donation: pickupDateTime',
        });
      }
    }

    // Validate pickup date/time (for FOOD/CLOTHES only)
    let pickupDate: Date | null = null;
    if (normalizedCategory !== 'MONEY') {
      pickupDate = new Date(pickupDateTime);
      if (isNaN(pickupDate.getTime())) {
        return res.status(400).json({ success: false, message: 'Invalid pickup date/time format' });
      }
      if (!isFutureDate(pickupDate)) {
        return res.status(400).json({ success: false, message: 'Pickup date must be in the future' });
      }
    }

    // Handle image uploads
    const files = (req.files as Express.Multer.File[]) || [];
    const imagePaths = files.map((file) => file.path);

    // Insert donation into MySQL
    const donationId = await insert(
      `INSERT INTO donations (
        ngo_id, donation_type, donation_category, purpose, description,
        quantity_or_amount, location_address, pickup_date_time, timezone,
        status, priority
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        ngoId,
        normalizedCategory, // donation_type (legacy)
        normalizedCategory, // donation_category
        purpose.trim(),
        description.trim(),
        quantity,
        ngoAddress, // Use NGO's registered address
        pickupDate || null,
        timezone || null,
        'ACTIVE',
        priority || 'NORMAL',
      ]
    );

    // Insert images if any
    if (imagePaths.length > 0) {
      for (let i = 0; i < imagePaths.length; i++) {
        await insert(
          'INSERT INTO donation_images (donation_id, image_path, image_order) VALUES (?, ?, ?)',
          [donationId, imagePaths[i], i]
        );
      }
    }

    // Insert payment details for MONEY donations
    if (normalizedCategory === 'MONEY') {
      await insert(
        `INSERT INTO donation_payment_details (
          donation_id, qr_code_image, bank_account_number, bank_name, ifsc_code, account_holder_name
        ) VALUES (?, ?, ?, ?, ?, ?)`,
        [
          donationId,
          qrCodeImage.trim(),
          bankAccountNumber.trim(),
          bankName.trim(),
          ifscCode.trim(),
          accountHolderName.trim(),
        ]
      );
    }

    // Fetch created donation with NGO details
    const donation = await queryOne<any>(
      `SELECT d.*, 
        u.name as ngo_name, u.email as ngo_email, u.contact_info as ngo_contact_info,
        (SELECT COUNT(*) FROM donation_images di WHERE di.donation_id = d.id) as image_count
       FROM donations d
       INNER JOIN users u ON d.ngo_id = u.id
       WHERE d.id = ?`,
      [donationId]
    );

    // Get images
    const images = await query<any>(
      'SELECT image_path FROM donation_images WHERE donation_id = ? ORDER BY image_order',
      [donationId]
    );

    const donationWithDetails = {
      ...donation,
      images: images.map((img: any) => img.image_path),
    };

    return sendSuccess(res, donationWithDetails, 'Donation request created successfully', 201);
  } catch (error: any) {
    console.error('Error creating donation:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to create donation request',
    });
  }
};

/**
 * Get all donations created by logged-in NGO
 * GET /api/ngo/donations
 */
export const getNgoDonations = async (req: AuthRequest, res: Response) => {
  try {
    const ngoId = parseInt(req.user!.id);
    const { status, priority, donationCategory } = req.query;

    let sql = `
      SELECT d.*,
        (SELECT COUNT(*) FROM contributions c WHERE c.donation_id = d.id) as contribution_count,
        (SELECT COUNT(*) FROM contributions c WHERE c.donation_id = d.id AND c.status IN ('APPROVED', 'COMPLETED')) as approved_contributions
      FROM donations d
      WHERE d.ngo_id = ?
    `;
    const params: any[] = [ngoId];

    if (status) {
      sql += ' AND d.status = ?';
      params.push(status);
    }
    if (priority) {
      sql += ' AND d.priority = ?';
      params.push(priority);
    }
    if (donationCategory) {
      sql += ' AND d.donation_category = ?';
      params.push(donationCategory);
    }

    sql += ' ORDER BY d.created_at DESC';

    const donations = await query<any>(sql, params);

    // Get images for each donation
    const donationsWithImages = await Promise.all(
      donations.map(async (donation: any) => {
        const images = await query<any>(
          'SELECT image_path FROM donation_images WHERE donation_id = ? ORDER BY image_order',
          [donation.id]
        );
        return {
          ...donation,
          images: images.map((img: any) => img.image_path),
        };
      })
    );

    return sendSuccess(res, donationsWithImages, 'NGO donations fetched successfully');
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch donations',
    });
  }
};

/**
 * Get donation details (only own donation)
 * GET /api/ngo/donations/:id
 */
export const getNgoDonationById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const donationId = parseInt(id);
    const ngoId = parseInt(req.user!.id);

    if (isNaN(donationId)) {
      return res.status(400).json({ success: false, message: 'Invalid donation id' });
    }

    const donation = await queryOne<any>(
      `SELECT d.*, 
        u.name as ngo_name, u.email as ngo_email, u.contact_info as ngo_contact_info
       FROM donations d
       INNER JOIN users u ON d.ngo_id = u.id
       WHERE d.id = ? AND d.ngo_id = ?`,
      [donationId, ngoId]
    );

    if (!donation) {
      return res.status(404).json({
        success: false,
        message: 'Donation not found or you do not have permission to access it',
      });
    }

    // Get images
    const images = await query<any>(
      'SELECT image_path FROM donation_images WHERE donation_id = ? ORDER BY image_order',
      [donationId]
    );

    // Get contribution counts
    const contributionCount = await queryOne<{ count: number }>(
      'SELECT COUNT(*) as count FROM contributions WHERE donation_id = ?',
      [donationId]
    );
    const approvedCount = await queryOne<{ count: number }>(
      'SELECT COUNT(*) as count FROM contributions WHERE donation_id = ? AND status IN (?, ?)',
      [donationId, 'APPROVED', 'COMPLETED']
    );

    const donationWithDetails = {
      ...donation,
      images: images.map((img: any) => img.image_path),
      contributionCount: contributionCount?.count || 0,
      approvedContributions: approvedCount?.count || 0,
    };

    return sendSuccess(res, donationWithDetails, 'Donation details fetched successfully');
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch donation details',
    });
  }
};

/**
 * Update donation request
 * PUT /api/ngo/donations/:id
 */
export const updateNgoDonation = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const donationId = parseInt(id);
    const ngoId = parseInt(req.user!.id);

    if (isNaN(donationId)) {
      return res.status(400).json({ success: false, message: 'Invalid donation id' });
    }

    // Verify ownership
    const existingDonation = await queryOne<any>(
      'SELECT status FROM donations WHERE id = ? AND ngo_id = ?',
      [donationId, ngoId]
    );

    if (!existingDonation) {
      return res.status(404).json({
        success: false,
        message: 'Donation not found or you do not have permission to update it',
      });
    }

    // Cannot update cancelled or completed donations
    if (existingDonation.status === 'CANCELLED' || existingDonation.status === 'COMPLETED') {
      return res.status(400).json({
        success: false,
        message: `Cannot update ${existingDonation.status.toLowerCase()} donation`,
      });
    }

    const {
      donationCategory,
      purpose,
      description,
      quantityOrAmount,
      pickupDateTime,
      timezone,
      status,
      priority,
    } = req.body;

    const updates: string[] = [];
    const params: any[] = [];

    // Update donation category
    if (donationCategory) {
      const normalizedCategory = (donationCategory as string).toUpperCase();
      if (!VALID_DONATION_CATEGORIES.includes(normalizedCategory as DonationCategory)) {
        return res.status(400).json({
          success: false,
          message: `Invalid donation category. Valid categories: ${VALID_DONATION_CATEGORIES.join(', ')}`,
        });
      }
      updates.push('donation_category = ?', 'donation_type = ?');
      params.push(normalizedCategory, normalizedCategory);
    }

    // Update purpose
    if (purpose !== undefined) {
      if (typeof purpose !== 'string' || purpose.trim().length === 0) {
        return res.status(400).json({ success: false, message: 'Purpose cannot be empty' });
      }
      updates.push('purpose = ?');
      params.push(purpose.trim());
    }

    // Update description
    if (description !== undefined) {
      if (typeof description !== 'string' || description.trim().length === 0) {
        return res.status(400).json({ success: false, message: 'Description cannot be empty' });
      }
      updates.push('description = ?');
      params.push(description.trim());
    }

    // Update quantity/amount
    if (quantityOrAmount !== undefined) {
      const quantity = Number(quantityOrAmount);
      if (Number.isNaN(quantity) || quantity <= 0) {
        return res.status(400).json({ success: false, message: 'Quantity/Amount must be greater than 0' });
      }
      updates.push('quantity_or_amount = ?');
      params.push(quantity);
    }

    // Update pickup date/time
    if (pickupDateTime !== undefined) {
      const pickupDate = new Date(pickupDateTime);
      if (isNaN(pickupDate.getTime())) {
        return res.status(400).json({ success: false, message: 'Invalid pickup date/time format' });
      }
      if (!isFutureDate(pickupDate)) {
        return res.status(400).json({ success: false, message: 'Pickup date must be in the future' });
      }
      updates.push('pickup_date_time = ?');
      params.push(pickupDate);
    }

    // Update timezone
    if (timezone !== undefined) {
      updates.push('timezone = ?');
      params.push(timezone || null);
    }

    // Update status
    if (status && ['PENDING', 'CONFIRMED', 'COMPLETED'].includes(status)) {
      updates.push('status = ?');
      params.push(status);
    }

    // Update priority
    if (priority && ['NORMAL', 'URGENT'].includes(priority)) {
      updates.push('priority = ?');
      params.push(priority);
    }

    // Handle image updates
    const files = (req.files as Express.Multer.File[]) || [];
    if (files.length > 0) {
      // Delete old images
      const oldImages = await query<any>(
        'SELECT image_path FROM donation_images WHERE donation_id = ?',
        [donationId]
      );
      oldImages.forEach((img: any) => {
        const fullPath = path.join(process.cwd(), img.image_path);
        if (fs.existsSync(fullPath)) {
          try {
            fs.unlinkSync(fullPath);
          } catch (error) {
            console.error(`Error deleting image: ${img.image_path}`, error);
          }
        }
      });
      await query('DELETE FROM donation_images WHERE donation_id = ?', [donationId]);

      // Insert new images
      for (let i = 0; i < files.length; i++) {
        await insert(
          'INSERT INTO donation_images (donation_id, image_path, image_order) VALUES (?, ?, ?)',
          [donationId, files[i].path, i]
        );
      }
    }

    // Update donation if there are updates
    if (updates.length > 0) {
      params.push(donationId);
      await update(
        `UPDATE donations SET ${updates.join(', ')} WHERE id = ?`,
        params
      );
    }

    // Fetch updated donation
    const updated = await queryOne<any>(
      `SELECT d.*, 
        u.name as ngo_name, u.email as ngo_email, u.contact_info as ngo_contact_info
       FROM donations d
       INNER JOIN users u ON d.ngo_id = u.id
       WHERE d.id = ?`,
      [donationId]
    );

    // Get images
    const images = await query<any>(
      'SELECT image_path FROM donation_images WHERE donation_id = ? ORDER BY image_order',
      [donationId]
    );

    const donationWithDetails = {
      ...updated,
      images: images.map((img: any) => img.image_path),
    };

    return sendSuccess(res, donationWithDetails, 'Donation request updated successfully');
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to update donation request',
    });
  }
};

/**
 * Update donation priority only
 * PATCH /api/ngo/donations/:id/priority
 */
export const updateNgoDonationPriority = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const donationId = parseInt(id);
    const ngoId = parseInt(req.user!.id);
    const { priority } = req.body;

    if (isNaN(donationId)) {
      return res.status(400).json({ success: false, message: 'Invalid donation id' });
    }

    if (!priority || !['NORMAL', 'URGENT'].includes(priority)) {
      return res.status(400).json({
        success: false,
        message: 'Priority is required and must be either NORMAL or URGENT',
      });
    }

    // Verify ownership
    const donation = await queryOne<any>(
      'SELECT id FROM donations WHERE id = ? AND ngo_id = ?',
      [donationId, ngoId]
    );

    if (!donation) {
      return res.status(404).json({
        success: false,
        message: 'Donation not found or you do not have permission to update it',
      });
    }

    await update('UPDATE donations SET priority = ? WHERE id = ?', [priority, donationId]);

    const updated = await queryOne<any>(
      `SELECT d.*, 
        u.name as ngo_name, u.email as ngo_email, u.contact_info as ngo_contact_info
       FROM donations d
       INNER JOIN users u ON d.ngo_id = u.id
       WHERE d.id = ?`,
      [donationId]
    );

    return sendSuccess(res, updated, 'Donation priority updated successfully');
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to update donation priority',
    });
  }
};

/**
 * Cancel donation request
 * DELETE /api/ngo/donations/:id
 */
export const cancelNgoDonation = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const donationId = parseInt(id);
    const ngoId = parseInt(req.user!.id);

    if (isNaN(donationId)) {
      return res.status(400).json({ success: false, message: 'Invalid donation id' });
    }

    // Verify ownership
    const donation = await queryOne<any>(
      'SELECT status FROM donations WHERE id = ? AND ngo_id = ?',
      [donationId, ngoId]
    );

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

    await update('UPDATE donations SET status = ? WHERE id = ?', ['CANCELLED', donationId]);

    const updated = await queryOne<any>(
      `SELECT d.*, 
        u.name as ngo_name, u.email as ngo_email, u.contact_info as ngo_contact_info
       FROM donations d
       INNER JOIN users u ON d.ngo_id = u.id
       WHERE d.id = ?`,
      [donationId]
    );

    return sendSuccess(res, updated, 'Donation request cancelled successfully');
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to cancel donation request',
    });
  }
};

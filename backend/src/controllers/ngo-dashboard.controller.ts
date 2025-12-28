import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { sendSuccess } from '../utils/response';
import { query, queryOne, insert, update } from '../config/mysql';
import fs from 'fs';
import path from 'path';

const isFutureDate = (value: string | Date) => new Date(value).getTime() > Date.now();
const VALID_DONATION_CATEGORIES = ['CLOTHES', 'FOOD', 'MONEY'] as const;
type DonationCategory = typeof VALID_DONATION_CATEGORIES[number];
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
      qrCodeImage,
      bankAccountNumber,
      bankName,
      ifscCode,
      accountHolderName,
    } = req.body;
    if (!donationCategory || !purpose || !description || !quantityOrAmount) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: donationCategory, purpose, description, quantityOrAmount',
      });
    }
    const normalizedCategory = (donationCategory as string).toUpperCase() as DonationCategory;
    if (!VALID_DONATION_CATEGORIES.includes(normalizedCategory)) {
      return res.status(400).json({
        success: false,
        message: `Invalid donation category. Valid categories: ${VALID_DONATION_CATEGORIES.join(', ')}`,
      });
    }
    if (typeof purpose !== 'string' || purpose.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Purpose cannot be empty' });
    }
    if (typeof description !== 'string' || description.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Description cannot be empty' });
    }
    const quantity = Number(quantityOrAmount);
    if (Number.isNaN(quantity) || quantity <= 0) {
      return res.status(400).json({ success: false, message: 'Quantity/Amount must be greater than 0' });
    }
    const ngoProfile = await queryOne<any>(
      'SELECT address, city, state, pincode FROM users WHERE id = ?',
      [ngoId]
    );

    if (!ngoProfile) {
      return res.status(404).json({ success: false, message: 'NGO profile not found' });
    }
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
    if (normalizedCategory === 'MONEY') {
      if (!qrCodeImage || !bankAccountNumber || !bankName || !ifscCode || !accountHolderName) {
        return res.status(400).json({
          success: false,
          message:
            'Missing payment details for MONEY donation: qrCodeImage, bankAccountNumber, bankName, ifscCode, accountHolderName are required',
        });
      }
    } else {
      if (!pickupDateTime) {
        return res.status(400).json({
          success: false,
          message: 'Missing required field for FOOD/CLOTHES donation: pickupDateTime',
        });
      }
    }
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
    const files = (req.files as Express.Multer.File[]) || [];
    const imagePaths = files.map((file) => file.path);
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
    if (imagePaths.length > 0) {
      for (let i = 0; i < imagePaths.length; i++) {
        await insert(
          'INSERT INTO donation_images (donation_id, image_path, image_order) VALUES (?, ?, ?)',
          [donationId, imagePaths[i], i]
        );
      }
    }
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
    const donation = await queryOne<any>(
      `SELECT d.*, 
        u.name as ngo_name, u.email as ngo_email, u.contact_info as ngo_contact_info,
        (SELECT COUNT(*) FROM donation_images di WHERE di.donation_id = d.id) as image_count
       FROM donations d
       INNER JOIN users u ON d.ngo_id = u.id
       WHERE d.id = ?`,
      [donationId]
    );
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
export const getNgoDonations = async (req: AuthRequest, res: Response) => {
  try {
    const ngoId = parseInt(req.user!.id);
    const { status, priority, donationCategory } = req.query;

    console.log(`[NGO Donations] 🔍 Fetching donations for NGO ID: ${ngoId}`);

    let sql = `
      SELECT d.*,
        (SELECT COUNT(*) FROM donation_request_contributions drc WHERE drc.donation_request_id = d.id) as contribution_count,
        (SELECT COUNT(*) FROM donation_request_contributions drc WHERE drc.donation_request_id = d.id AND drc.status IN ('APPROVED', 'COMPLETED', 'ACCEPTED')) as approved_contributions
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

    console.log(`[NGO Donations] 📝 SQL Query:`, sql);
    console.log(`[NGO Donations] 📝 SQL Params:`, params);

    const donations = await query<any>(sql, params);

    console.log(`[NGO Donations] 📊 Found ${donations.length} donations in database`);
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

    console.log(`[NGO Donations] ✅ Returning ${donationsWithImages.length} donations with images`);

    return sendSuccess(res, donationsWithImages, 'NGO donations fetched successfully');
  } catch (error: any) {
    console.error('[NGO Donations] ❌ Error fetching donations:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch donations',
    });
  }
};
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
    const images = await query<any>(
      'SELECT image_path FROM donation_images WHERE donation_id = ? ORDER BY image_order',
      [donationId]
    );
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
export const getNgoDonationDetails = async (req: AuthRequest, res: Response) => {
  try {
    const ngoId = parseInt(req.user!.id);
    const contributions = await query<any>(`
      SELECT 
        drc.id as contribution_id,
        drc.quantity_or_amount,
        drc.status,
        drc.created_at as contribution_date,
        drc.pickup_location,
        drc.pickup_date,
        drc.pickup_time,
        drc.notes,
        dr.id as request_id,
        dr.donation_type,
        dr.description as request_description,
        d.name as donor_name,
        d.email as donor_email,
        d.phone_number as donor_phone,
        d.full_address as donor_address
      FROM donation_request_contributions drc
      INNER JOIN donation_requests dr ON drc.request_id = dr.id
      INNER JOIN donors d ON drc.donor_id = d.id
      WHERE dr.ngo_id = ?
      ORDER BY drc.created_at DESC
    `, [ngoId]);
    const formattedContributions = contributions.map((cont: any) => ({
      contributionId: cont.contribution_id,
      requestId: cont.request_id,
      donationType: cont.donation_type,
      quantityOrAmount: parseFloat(cont.quantity_or_amount),
      status: cont.status,
      contributionDate: cont.contribution_date,
      pickupLocation: cont.pickup_location,
      pickupDate: cont.pickup_date,
      pickupTime: cont.pickup_time,
      notes: cont.notes,
      donor: {
        name: cont.donor_name,
        email: cont.donor_email,
        phone: cont.donor_phone,
        address: cont.donor_address
      },
      request: {
        id: cont.request_id,
        description: cont.request_description
      }
    }));
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    return sendSuccess(res, formattedContributions, 'Donation details fetched successfully');
  } catch (error: any) {
    console.error('Error fetching NGO donation details:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch donation details'
    });
  }
};
export const updateDonationRequestContributionStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const contributionId = parseInt(id);
    const ngoId = parseInt(req.user!.id);

    console.log('[updateContributionStatus] Route hit!');
    console.log('[updateContributionStatus] Params:', { contributionId });
    console.log('[updateContributionStatus] Body:', { status });
    console.log('[updateContributionStatus] User:', req.user);

    if (isNaN(contributionId)) {
      return res.status(400).json({ success: false, message: 'Invalid contribution id' });
    }

    if (!status || !['ACCEPTED', 'NOT_RECEIVED'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be ACCEPTED or NOT_RECEIVED'
      });
    }

    console.log('[updateContributionStatus] Parsed - NGO ID:', ngoId, 'Contribution ID:', contributionId, 'Status:', status);
    const contribution = await queryOne<any>(`
      SELECT drc.*, dr.ngo_id
      FROM donation_request_contributions drc
      INNER JOIN donation_requests dr ON drc.request_id = dr.id
      WHERE drc.id = ? AND dr.ngo_id = ?
    `, [contributionId, ngoId]);

    if (!contribution) {
      return res.status(404).json({
        success: false,
        message: 'Contribution not found or you do not have permission to update it'
      });
    }
    await update(
      'UPDATE donation_request_contributions SET status = ? WHERE id = ?',
      [status, contributionId]
    );

    console.log('[NGO Donations] Updated contribution', contributionId, 'status to', status);
    const updated = await queryOne<any>(`
      SELECT 
        drc.id as contribution_id,
        drc.quantity_or_amount,
        drc.status,
        drc.created_at as contribution_date,
        dr.id as request_id,
        dr.donation_type,
        d.name as donor_name,
        d.email as donor_email
      FROM donation_request_contributions drc
      INNER JOIN donation_requests dr ON drc.request_id = dr.id
      INNER JOIN donors d ON drc.donor_id = d.id
      WHERE drc.id = ?
    `, [contributionId]);

    return sendSuccess(res, {
      contributionId: updated.contribution_id,
      requestId: updated.request_id,
      donationType: updated.donation_type,
      quantityOrAmount: parseFloat(updated.quantity_or_amount),
      status: updated.status,
      contributionDate: updated.contribution_date,
      donor: {
        name: updated.donor_name,
        email: updated.donor_email
      }
    }, `Status updated to ${status} successfully`);
  } catch (error: any) {
    console.error('Error updating contribution status:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to update contribution status'
    });
  }
};
export const updateNgoDonation = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const donationId = parseInt(id);
    const ngoId = parseInt(req.user!.id);

    if (isNaN(donationId)) {
      return res.status(400).json({ success: false, message: 'Invalid donation id' });
    }
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
    if (purpose !== undefined) {
      if (typeof purpose !== 'string' || purpose.trim().length === 0) {
        return res.status(400).json({ success: false, message: 'Purpose cannot be empty' });
      }
      updates.push('purpose = ?');
      params.push(purpose.trim());
    }
    if (description !== undefined) {
      if (typeof description !== 'string' || description.trim().length === 0) {
        return res.status(400).json({ success: false, message: 'Description cannot be empty' });
      }
      updates.push('description = ?');
      params.push(description.trim());
    }
    if (quantityOrAmount !== undefined) {
      const quantity = Number(quantityOrAmount);
      if (Number.isNaN(quantity) || quantity <= 0) {
        return res.status(400).json({ success: false, message: 'Quantity/Amount must be greater than 0' });
      }
      updates.push('quantity_or_amount = ?');
      params.push(quantity);
    }
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
    if (timezone !== undefined) {
      updates.push('timezone = ?');
      params.push(timezone || null);
    }
    if (status && ['PENDING', 'CONFIRMED', 'COMPLETED'].includes(status)) {
      updates.push('status = ?');
      params.push(status);
    }
    if (priority && ['NORMAL', 'URGENT'].includes(priority)) {
      updates.push('priority = ?');
      params.push(priority);
    }
    const files = (req.files as Express.Multer.File[]) || [];
    if (files.length > 0) {
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
      for (let i = 0; i < files.length; i++) {
        await insert(
          'INSERT INTO donation_images (donation_id, image_path, image_order) VALUES (?, ?, ?)',
          [donationId, files[i].path, i]
        );
      }
    }
    if (updates.length > 0) {
      params.push(donationId);
      await update(
        `UPDATE donations SET ${updates.join(', ')} WHERE id = ?`,
        params
      );
    }
    const updated = await queryOne<any>(
      `SELECT d.*, 
        u.name as ngo_name, u.email as ngo_email, u.contact_info as ngo_contact_info
       FROM donations d
       INNER JOIN users u ON d.ngo_id = u.id
       WHERE d.id = ?`,
      [donationId]
    );
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
export const cancelNgoDonation = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const donationId = parseInt(id);
    const ngoId = parseInt(req.user!.id);

    if (isNaN(donationId)) {
      return res.status(400).json({ success: false, message: 'Invalid donation id' });
    }
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

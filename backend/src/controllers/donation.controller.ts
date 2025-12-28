import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { sendSuccess } from '../utils/response';
import { query, queryOne, insert, update } from '../config/mysql';
import { normalizeLocation, isValidTimezone, calculateDistance, isValidCoordinates } from '../utils/location';
import fs from 'fs';
import path from 'path';

const isFutureDate = (value: string | Date) => new Date(value).getTime() > Date.now();
const VALID_DONATION_TYPES = ['FOOD', 'FUNDS', 'CLOTHES', 'MEDICINE', 'BOOKS', 'TOYS', 'OTHER'] as const;
type DonationType = typeof VALID_DONATION_TYPES[number];

export const createDonation = async (req: AuthRequest, res: Response) => {
  try {
    const { donationType, quantityOrAmount, location, pickupDateTime, timezone, status, priority } = req.body;

    if (!donationType || !quantityOrAmount) {
      return res.status(400).json({ success: false, message: 'Missing required fields: donationType, quantityOrAmount' });
    }
    const normalizedType = (donationType as string).toUpperCase() as DonationType;
    if (!VALID_DONATION_TYPES.includes(normalizedType)) {
      return res.status(400).json({
        success: false,
        message: `Invalid donation type. Valid types: ${VALID_DONATION_TYPES.join(', ')}`,
      });
    }

    const quantity = Number(quantityOrAmount);
    if (Number.isNaN(quantity) || quantity <= 0) {
      return res.status(400).json({ success: false, message: 'Quantity/Amount must be greater than 0' });
    }

    const isFunds = normalizedType === 'FUNDS';
    const requiresPickup = !isFunds;
    if (requiresPickup) {
      if (!location || !pickupDateTime) {
        return res.status(400).json({ 
          success: false, 
          message: 'Missing required fields for FOOD/CLOTHES donations: location, pickupDateTime' 
        });
      }
    }
    let normalizedLocation;
    if (requiresPickup) {
      try {
        normalizedLocation = normalizeLocation(location);
      } catch (error: any) {
        return res.status(400).json({ success: false, message: error.message || 'Invalid location format' });
      }
    }
    let pickupDate: Date | null = null;
    if (requiresPickup) {
      pickupDate = new Date(pickupDateTime);
      if (isNaN(pickupDate.getTime())) {
        return res.status(400).json({ success: false, message: 'Invalid pickup date/time format' });
      }
      if (!isFutureDate(pickupDate)) {
        return res.status(400).json({ success: false, message: 'Pickup date must be in the future' });
      }
    }
    if (timezone && !isValidTimezone(timezone)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid timezone format. Use IANA timezone (e.g., America/New_York, Europe/London)',
      });
    }

    const files = (req.files as Express.Multer.File[]) || [];
    const imagePaths = files.map((file) => file.path);
    const ngoId = parseInt(req.user!.id);
    const locationAddress = requiresPickup ? (normalizedLocation.address || '') : null;
    const locationLat = requiresPickup ? (normalizedLocation.coordinates?.latitude || null) : null;
    const locationLng = requiresPickup ? (normalizedLocation.coordinates?.longitude || null) : null;
    const donationId = await insert(
      `INSERT INTO donations (
        ngo_id, donation_type, donation_category, purpose, description,
        quantity_or_amount, location_address, location_latitude, location_longitude,
        pickup_date_time, timezone, status, priority
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        ngoId,
        normalizedType,
        normalizedType, // donation_category
        '', // purpose - not provided in this function
        '', // description - not provided in this function
        quantity,
        locationAddress,
        locationLat,
        locationLng,
        pickupDate,
        timezone || null,
        status || 'PENDING',
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
    const populated = await queryOne<any>(
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
      ...populated,
      images: images.map((img: any) => img.image_path),
    };

    return sendSuccess(res, donationWithDetails, 'Donation created', 201);
  } catch (error: any) {
    console.error('Error creating donation:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to create donation',
    });
  }
};

export const getDonations = async (req: Request, res: Response) => {
  try {
    const { status, priority, donationType, category, includeCancelled } = req.query;
    
    let sql = `
      SELECT d.*,
        u.name as ngo_name, u.email as ngo_email, u.contact_info as ngo_contact_info,
        (SELECT COUNT(*) FROM contributions c WHERE c.donation_id = d.id) as contribution_count,
        (SELECT COUNT(*) FROM contributions c WHERE c.donation_id = d.id AND c.status IN ('APPROVED', 'COMPLETED')) as approved_contributions
      FROM donations d
      INNER JOIN users u ON d.ngo_id = u.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (status) {
      sql += ' AND d.status = ?';
      params.push(status);
    } else {
      if (includeCancelled !== 'true') {
        sql += ' AND d.status = ?';
        params.push('ACTIVE');
      } else {
        sql += ' AND d.status != ?';
        params.push('CANCELLED');
      }
    }
    
    if (priority) {
      sql += ' AND d.priority = ?';
      params.push(priority);
    }
    
    if (donationType) {
      sql += ' AND d.donation_type LIKE ?';
      params.push(`%${donationType}%`);
    }
    
    if (category) {
      sql += ' AND d.donation_category = ?';
      params.push(category);
    }

    sql += ' ORDER BY d.created_at DESC';

    const donations = await query<any>(sql, params);
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

    return sendSuccess(res, donationsWithImages, 'Donations fetched');
  } catch (error: any) {
    console.error('Error fetching donations:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch donations',
    });
  }
};

export const getDonationById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const donationId = parseInt(id);
    
    if (isNaN(donationId)) {
      return res.status(400).json({ success: false, message: 'Invalid donation id' });
    }
    
    const donation = await queryOne<any>(
      `SELECT d.*,
        u.name as ngo_name, u.email as ngo_email, u.contact_info as ngo_contact_info
       FROM donations d
       INNER JOIN users u ON d.ngo_id = u.id
       WHERE d.id = ?`,
      [donationId]
    );
    
    if (!donation) {
      return res.status(404).json({ success: false, message: 'Donation not found' });
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

    return sendSuccess(res, donationWithDetails, 'Donation fetched');
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch donation',
    });
  }
};

export const updateDonation = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const donationId = parseInt(id);
    const ngoId = parseInt(req.user!.id);

    if (isNaN(donationId)) {
      return res.status(400).json({ success: false, message: 'Invalid donation id' });
    }
    const donation = await queryOne<any>(
      'SELECT * FROM donations WHERE id = ?',
      [donationId]
    );

    if (!donation) {
      return res.status(404).json({ success: false, message: 'Donation not found' });
    }

    if (donation.ngo_id !== ngoId && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    if (donation.status === 'CANCELLED' || donation.status === 'COMPLETED') {
      return res.status(400).json({
        success: false,
        message: `Cannot update ${donation.status.toLowerCase()} donation`,
      });
    }

    const {
      donationType,
      quantityOrAmount,
      location,
      pickupDateTime,
      timezone,
      status,
      priority,
      images,
      removeImages,
    } = req.body;

    const updates: string[] = [];
    const params: any[] = [];

    if (donationType) {
      const normalizedType = (donationType as string).toUpperCase() as DonationType;
      if (!VALID_DONATION_TYPES.includes(normalizedType)) {
        return res.status(400).json({
          success: false,
          message: `Invalid donation type. Valid types: ${VALID_DONATION_TYPES.join(', ')}`,
        });
      }
      updates.push('donation_type = ?', 'donation_category = ?');
      params.push(normalizedType, normalizedType);
    }
    if (location) {
      try {
        const normalizedLocation = normalizeLocation(location);
        updates.push('location_address = ?', 'location_latitude = ?', 'location_longitude = ?');
        params.push(
          normalizedLocation.address || '',
          normalizedLocation.coordinates?.latitude || null,
          normalizedLocation.coordinates?.longitude || null
        );
      } catch (error: any) {
        return res.status(400).json({ success: false, message: error.message || 'Invalid location format' });
      }
    }

    if (status && ['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'].includes(status)) {
      updates.push('status = ?');
      params.push(status);
    }
    if (priority && ['NORMAL', 'URGENT'].includes(priority)) {
      updates.push('priority = ?');
      params.push(priority);
    }
    if (quantityOrAmount !== undefined) {
      const quantity = Number(quantityOrAmount);
      if (Number.isNaN(quantity) || quantity <= 0) {
        return res.status(400).json({ success: false, message: 'Quantity/Amount must be greater than 0' });
      }
      updates.push('quantity_or_amount = ?');
      params.push(quantity);
    }
    if (pickupDateTime) {
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
      if (timezone === null || timezone === '') {
        updates.push('timezone = ?');
        params.push(null);
      } else if (!isValidTimezone(timezone)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid timezone format. Use IANA timezone (e.g., America/New_York, Europe/London)',
        });
      } else {
        updates.push('timezone = ?');
        params.push(timezone);
      }
    }
    if (removeImages && Array.isArray(removeImages)) {
      const existingImages = await query<any>(
        'SELECT image_path FROM donation_images WHERE donation_id = ?',
        [donationId]
      );
      
      existingImages.forEach((img: any) => {
        if (removeImages.includes(img.image_path)) {
          const fullPath = path.join(process.cwd(), img.image_path);
          if (fs.existsSync(fullPath)) {
            try {
              fs.unlinkSync(fullPath);
            } catch (error) {
              console.error(`Error deleting image: ${img.image_path}`, error);
            }
          }
        }
      });
      for (const imagePath of removeImages) {
        await query('DELETE FROM donation_images WHERE donation_id = ? AND image_path = ?', [donationId, imagePath]);
      }
    }
    const files = (req.files as Express.Multer.File[]) || [];
    if (files.length > 0) {
      const existingCount = await queryOne<{ count: number }>(
        'SELECT COUNT(*) as count FROM donation_images WHERE donation_id = ?',
        [donationId]
      );
      let orderIndex = existingCount?.count || 0;

      for (const file of files) {
        await insert(
          'INSERT INTO donation_images (donation_id, image_path, image_order) VALUES (?, ?, ?)',
          [donationId, file.path, orderIndex++]
        );
      }
    }
    if (images && Array.isArray(images)) {
      const existingImages = await query<any>(
        'SELECT image_path FROM donation_images WHERE donation_id = ?',
        [donationId]
      );
      existingImages.forEach((img: any) => {
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
      for (let i = 0; i < images.length; i++) {
        await insert(
          'INSERT INTO donation_images (donation_id, image_path, image_order) VALUES (?, ?, ?)',
          [donationId, images[i], i]
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
    const donationImages = await query<any>(
      'SELECT image_path FROM donation_images WHERE donation_id = ? ORDER BY image_order',
      [donationId]
    );

    const donationWithDetails = {
      ...updated,
      images: donationImages.map((img: any) => img.image_path),
    };

    return sendSuccess(res, donationWithDetails, 'Donation updated');
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to update donation',
    });
  }
};
export const cancelDonation = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const donationId = parseInt(id);
    const ngoId = parseInt(req.user!.id);

    if (isNaN(donationId)) {
      return res.status(400).json({ success: false, message: 'Invalid donation id' });
    }

    const donation = await queryOne<any>(
      'SELECT * FROM donations WHERE id = ?',
      [donationId]
    );

    if (!donation) {
      return res.status(404).json({ success: false, message: 'Donation not found' });
    }

    if (donation.ngo_id !== ngoId && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Forbidden' });
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

    return sendSuccess(res, updated, 'Donation cancelled');
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to cancel donation',
    });
  }
};
export const deleteDonation = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const donationId = parseInt(id);
    const ngoId = parseInt(req.user!.id);

    if (isNaN(donationId)) {
      return res.status(400).json({ success: false, message: 'Invalid donation id' });
    }

    const donation = await queryOne<any>(
      'SELECT * FROM donations WHERE id = ?',
      [donationId]
    );

    if (!donation) {
      return res.status(404).json({ success: false, message: 'Donation not found' });
    }

    if (donation.ngo_id !== ngoId && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    const contributionCount = await queryOne<{ count: number }>(
      'SELECT COUNT(*) as count FROM contributions WHERE donation_id = ?',
      [donationId]
    );

    if ((contributionCount?.count || 0) > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete donation with existing contributions. Use cancel instead.',
      });
    }
    const images = await query<any>(
      'SELECT image_path FROM donation_images WHERE donation_id = ?',
      [donationId]
    );

    images.forEach((img: any) => {
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
    await query('DELETE FROM donations WHERE id = ?', [donationId]);

    return sendSuccess(res, null, 'Donation deleted');
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete donation',
    });
  }
};
export const getMyDonations = async (req: AuthRequest, res: Response) => {
  try {
    const { status, priority, donationType } = req.query;
    const ngoId = parseInt(req.user!.id);

    let sql = `
      SELECT d.*,
        u.name as ngo_name, u.email as ngo_email, u.contact_info as ngo_contact_info
      FROM donations d
      INNER JOIN users u ON d.ngo_id = u.id
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
    if (donationType) {
      sql += ' AND d.donation_type LIKE ?';
      params.push(`%${donationType}%`);
    }

    sql += ' ORDER BY d.created_at DESC';

    const donations = await query<any>(sql, params);
    const donationsWithDetails = await Promise.all(
      donations.map(async (donation: any) => {
        const images = await query<any>(
          'SELECT image_path FROM donation_images WHERE donation_id = ? ORDER BY image_order',
          [donation.id]
        );
        const contributionCount = await queryOne<{ count: number }>(
          'SELECT COUNT(*) as count FROM contributions WHERE donation_id = ?',
          [donation.id]
        );
        const approvedCount = await queryOne<{ count: number }>(
          'SELECT COUNT(*) as count FROM contributions WHERE donation_id = ? AND status IN (?, ?)',
          [donation.id, 'APPROVED', 'COMPLETED']
        );
        return {
          ...donation,
          images: images.map((img: any) => img.image_path),
          contributionCount: contributionCount?.count || 0,
          approvedContributions: approvedCount?.count || 0,
        };
      })
    );

    return sendSuccess(res, donationsWithDetails, 'My donations fetched');
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch donations',
    });
  }
};
export const getNearbyDonations = async (req: Request, res: Response) => {
  try {
    const { latitude, longitude, radius = 10, status, priority, donationType } = req.query;
    const lat = Number(latitude);
    const lng = Number(longitude);
    const radiusKm = Number(radius) || 10;

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required for nearby search',
      });
    }

    if (!isValidCoordinates(lat, lng)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid coordinates. Latitude must be between -90 and 90, longitude between -180 and 180',
      });
    }

    if (radiusKm <= 0 || radiusKm > 1000) {
      return res.status(400).json({
        success: false,
        message: 'Radius must be between 1 and 1000 kilometers',
      });
    }
    let sql = `
      SELECT d.*,
        u.name as ngo_name, u.email as ngo_email, u.contact_info as ngo_contact_info
      FROM donations d
      INNER JOIN users u ON d.ngo_id = u.id
      WHERE d.location_latitude IS NOT NULL AND d.location_longitude IS NOT NULL
    `;
    const params: any[] = [];

    if (status) {
      sql += ' AND d.status = ?';
      params.push(status);
    } else {
      sql += ' AND d.status != ?';
      params.push('CANCELLED');
    }

    if (priority) {
      sql += ' AND d.priority = ?';
      params.push(priority);
    }
    if (donationType) {
      sql += ' AND d.donation_type LIKE ?';
      params.push(`%${donationType}%`);
    }

    sql += ' ORDER BY d.created_at DESC';
    const donations = await query<any>(sql, params);
    const nearbyDonations = donations
      .map((donation: any) => {
        if (!donation.location_latitude || !donation.location_longitude) {
          return null;
        }

        const distance = calculateDistance(
          lat,
          lng,
          donation.location_latitude,
          donation.location_longitude
        );

        if (distance <= radiusKm) {
          return {
            ...donation,
            distance: Math.round(distance * 100) / 100, // Round to 2 decimal places
          };
        }
        return null;
      })
      .filter((donation: any) => donation !== null)
      .sort((a: any, b: any) => a.distance - b.distance); // Sort by distance
    const donationsWithCounts = await Promise.all(
      nearbyDonations.map(async (donation: any) => {
        const images = await query<any>(
          'SELECT image_path FROM donation_images WHERE donation_id = ? ORDER BY image_order',
          [donation.id]
        );
        const contributionCount = await queryOne<{ count: number }>(
          'SELECT COUNT(*) as count FROM contributions WHERE donation_id = ?',
          [donation.id]
        );
        const approvedCount = await queryOne<{ count: number }>(
          'SELECT COUNT(*) as count FROM contributions WHERE donation_id = ? AND status IN (?, ?)',
          [donation.id, 'APPROVED', 'COMPLETED']
        );
        return {
          ...donation,
          images: images.map((img: any) => img.image_path),
          contributionCount: contributionCount?.count || 0,
          approvedContributions: approvedCount?.count || 0,
        };
      })
    );

    return sendSuccess(
      res,
      {
        center: { latitude: lat, longitude: lng },
        radius: radiusKm,
        count: donationsWithCounts.length,
        donations: donationsWithCounts,
      },
      'Nearby donations fetched'
    );
  } catch (error: any) {
    console.error('Error fetching nearby donations:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch nearby donations',
    });
  }
};


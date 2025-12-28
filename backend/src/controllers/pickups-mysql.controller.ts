import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { sendSuccess } from '../utils/response';
import { query, queryOne, insert, update } from '../config/mysql';
export const createPickup = async (req: AuthRequest, res: Response) => {
  try {
    const donorId = parseInt(req.user!.id);
    const { donationId, pickupScheduledDateTime, donorAddress, donorContactNumber, notes } = req.body;

    if (!donationId || !pickupScheduledDateTime || !donorAddress || !donorContactNumber) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: donationId, pickupScheduledDateTime, donorAddress, donorContactNumber',
      });
    }

    const donation = await queryOne<any>(
      `SELECT d.*, u.id as ngo_id 
       FROM donations d
       INNER JOIN users u ON d.ngo_id = u.id
       WHERE d.id = ?`,
      [donationId]
    );

    if (!donation) {
      return res.status(404).json({ success: false, message: 'Donation not found' });
    }

    const donationCategory = donation.donation_category || donation.donation_type;
    const isFunds = donationCategory === 'FUNDS' || donationCategory === 'MONEY';
    if (isFunds) {
      return res.status(400).json({
        success: false,
        message: 'Pickup is not required for FUNDS donations. Please use the payment endpoint instead.',
      });
    }
    const pickupDate = new Date(pickupScheduledDateTime);
    if (isNaN(pickupDate.getTime())) {
      return res.status(400).json({ success: false, message: 'Invalid pickup date/time format' });
    }
    if (pickupDate.getTime() <= Date.now()) {
      return res.status(400).json({ success: false, message: 'Pickup date must be in the future' });
    }
    const overlappingPickup = await queryOne<any>(
      `SELECT c.id, c.pickup_scheduled_date_time, dr.ngo_id
       FROM contributions c
       INNER JOIN donations dr ON c.donation_id = dr.id
       WHERE dr.ngo_id = ? 
         AND c.pickup_scheduled_date_time BETWEEN DATE_SUB(?, INTERVAL 1 HOUR) AND DATE_ADD(?, INTERVAL 1 HOUR)
         AND c.pickup_status = 'SCHEDULED'
         AND c.status IN ('PENDING', 'APPROVED')`,
      [donation.ngo_id, pickupDate, pickupDate]
    );

    if (overlappingPickup) {
      return res.status(409).json({
        success: false,
        message: 'This NGO already has a pickup scheduled within 1 hour of the requested time. Please choose a different time.',
      });
    }
    const donorOverlappingPickup = await queryOne<any>(
      `SELECT id, pickup_scheduled_date_time
       FROM contributions
       WHERE donor_id = ?
         AND pickup_scheduled_date_time BETWEEN DATE_SUB(?, INTERVAL 1 HOUR) AND DATE_ADD(?, INTERVAL 1 HOUR)
         AND pickup_status = 'SCHEDULED'
         AND status IN ('PENDING', 'APPROVED')`,
      [donorId, pickupDate, pickupDate]
    );

    if (donorOverlappingPickup) {
      return res.status(409).json({
        success: false,
        message: 'You already have a pickup scheduled within 1 hour of this time. Please choose a different time.',
      });
    }
    const existingContribution = await queryOne<any>(
      'SELECT id FROM contributions WHERE donation_id = ? AND donor_id = ?',
      [donationId, donorId]
    );

    if (existingContribution) {
      return res.status(409).json({
        success: false,
        message: 'You have already contributed to this donation',
      });
    }
    const contributionId = await insert(
      `INSERT INTO contributions (
        donation_id, donor_id, notes,
        scheduled_pickup_time, pickup_scheduled_date_time,
        donor_address, donor_contact_number,
        pickup_status, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        donationId,
        donorId,
        notes?.trim() || null,
        pickupDate,
        pickupDate,
        donorAddress.trim(),
        donorContactNumber.trim(),
        'SCHEDULED',
        'PENDING',
      ]
    );

    const contribution = await queryOne<any>(
      `SELECT c.*, d.name as donor_name, d.email as donor_email,
              dr.donation_category, dr.donation_type, dr.purpose,
              u.name as ngo_name
       FROM contributions c
       INNER JOIN donors d ON c.donor_id = d.id
       INNER JOIN donations dr ON c.donation_id = dr.id
       INNER JOIN users u ON dr.ngo_id = u.id
       WHERE c.id = ?`,
      [contributionId]
    );

    return sendSuccess(res, {
      id: contribution.id,
      donationId: contribution.donation_id,
      donor: {
        id: contribution.donor_id,
        name: contribution.donor_name,
        email: contribution.donor_email,
        address: contribution.donor_address,
        contactNumber: contribution.donor_contact_number,
      },
      donation: {
        id: contribution.donation_id,
        donationCategory: contribution.donation_category,
        donationType: contribution.donation_type,
        purpose: contribution.purpose,
        ngoName: contribution.ngo_name,
      },
      pickupScheduledDateTime: contribution.pickup_scheduled_date_time,
      pickupStatus: contribution.pickup_status,
      status: contribution.status,
      notes: contribution.notes,
      createdAt: contribution.created_at,
    }, 'Pickup scheduled successfully', 201);
  } catch (error: any) {
    console.error('Error creating pickup:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to schedule pickup',
    });
  }
};
export const getNgoPickups = async (req: AuthRequest, res: Response) => {
  try {
    const ngoId = parseInt(req.user!.id);
    const { pickupStatus, donationId } = req.query;

    let sql = `
      SELECT c.*, 
             d.name as donor_name, d.email as donor_email, d.contact_info as donor_contact_info,
             dr.donation_category, dr.donation_type, dr.purpose, dr.quantity_or_amount,
             dr.location_address
      FROM contributions c
      INNER JOIN donors d ON c.donor_id = d.id
      INNER JOIN donations dr ON c.donation_id = dr.id
      WHERE dr.ngo_id = ?
    `;
    const params: any[] = [ngoId];

    if (pickupStatus) {
      sql += ' AND c.pickup_status = ?';
      params.push(pickupStatus);
    }

    if (donationId) {
      const donationIdNum = parseInt(donationId as string);
      if (isNaN(donationIdNum)) {
        return res.status(400).json({ success: false, message: 'Invalid donation id' });
      }
      const donation = await queryOne<any>('SELECT id FROM donations WHERE id = ? AND ngo_id = ?', [donationIdNum, ngoId]);
      if (!donation) {
        return res.status(403).json({ success: false, message: 'You do not have access to this donation' });
      }
      sql += ' AND c.donation_id = ?';
      params.push(donationIdNum);
    }

    sql += ' ORDER BY c.pickup_scheduled_date_time ASC';

    const pickups = await query<any>(sql, params);

    const formattedPickups = pickups.map((p: any) => ({
      id: p.id,
      donation: {
        id: p.donation_id,
        donationCategory: p.donation_category,
        donationType: p.donation_type,
        purpose: p.purpose,
        quantityOrAmount: p.quantity_or_amount,
        locationAddress: p.location_address,
      },
      donor: {
        id: p.donor_id,
        name: p.donor_name,
        email: p.donor_email,
        contactInfo: p.donor_contact_info,
        address: p.donor_address,
        contactNumber: p.donor_contact_number,
      },
      pickupScheduledDateTime: p.pickup_scheduled_date_time,
      pickupStatus: p.pickup_status,
      contributionStatus: p.status,
      notes: p.notes,
      createdAt: p.created_at,
    }));

    return sendSuccess(res, { count: formattedPickups.length, pickups: formattedPickups }, 'Pickups fetched successfully');
  } catch (error: any) {
    console.error('Error fetching NGO pickups:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch pickups',
    });
  }
};
export const getDonorPickups = async (req: AuthRequest, res: Response) => {
  try {
    const donorId = parseInt(req.user!.id);
    const { pickupStatus } = req.query;

    let sql = `
      SELECT c.*, 
             dr.donation_category, dr.donation_type, dr.purpose, dr.quantity_or_amount,
             dr.location_address, u.name as ngo_name, u.email as ngo_email
      FROM contributions c
      INNER JOIN donations dr ON c.donation_id = dr.id
      INNER JOIN users u ON dr.ngo_id = u.id
      WHERE c.donor_id = ?
    `;
    const params: any[] = [donorId];

    if (pickupStatus) {
      sql += ' AND c.pickup_status = ?';
      params.push(pickupStatus);
    }

    sql += ' ORDER BY c.pickup_scheduled_date_time ASC';

    const pickups = await query<any>(sql, params);

    const formattedPickups = pickups.map((p: any) => ({
      id: p.id,
      donation: {
        id: p.donation_id,
        donationCategory: p.donation_category,
        donationType: p.donation_type,
        purpose: p.purpose,
        quantityOrAmount: p.quantity_or_amount,
        locationAddress: p.location_address,
      },
      ngo: {
        name: p.ngo_name,
        email: p.ngo_email,
      },
      pickupScheduledDateTime: p.pickup_scheduled_date_time,
      pickupStatus: p.pickup_status,
      contributionStatus: p.status,
      notes: p.notes,
      createdAt: p.created_at,
    }));

    return sendSuccess(res, { count: formattedPickups.length, pickups: formattedPickups }, 'Pickups fetched successfully');
  } catch (error: any) {
    console.error('Error fetching donor pickups:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch pickups',
    });
  }
};
export const updatePickupStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const pickupId = parseInt(id);
    const { pickupStatus } = req.body;

    if (isNaN(pickupId)) {
      return res.status(400).json({ success: false, message: 'Invalid pickup id' });
    }

    if (!pickupStatus || !['SCHEDULED', 'PICKED_UP', 'CANCELLED'].includes(pickupStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid pickup status. Must be SCHEDULED, PICKED_UP, or CANCELLED',
      });
    }
    const contribution = await queryOne<any>(
      `SELECT c.*, dr.ngo_id
       FROM contributions c
       INNER JOIN donations dr ON c.donation_id = dr.id
       WHERE c.id = ?`,
      [pickupId]
    );

    if (!contribution) {
      return res.status(404).json({ success: false, message: 'Pickup not found' });
    }

    const ngoId = parseInt(req.user!.id);
    if (contribution.ngo_id !== ngoId && req.user!.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You can only manage pickups for your own donations',
      });
    }
    await update(
      'UPDATE contributions SET pickup_status = ? WHERE id = ?',
      [pickupStatus, pickupId]
    );
    if (pickupStatus === 'PICKED_UP') {
      await update(
        'UPDATE contributions SET status = ? WHERE id = ?',
        ['COMPLETED', pickupId]
      );
    }
    const updated = await queryOne<any>(
      `SELECT c.*, 
              d.name as donor_name, d.email as donor_email,
              dr.donation_category, dr.donation_type, dr.purpose,
              u.name as ngo_name
       FROM contributions c
       INNER JOIN donors d ON c.donor_id = d.id
       INNER JOIN donations dr ON c.donation_id = dr.id
       INNER JOIN users u ON dr.ngo_id = u.id
       WHERE c.id = ?`,
      [pickupId]
    );

    return sendSuccess(res, {
      id: updated.id,
      donation: {
        id: updated.donation_id,
        donationCategory: updated.donation_category,
        donationType: updated.donation_type,
        purpose: updated.purpose,
        ngoName: updated.ngo_name,
      },
      donor: {
        id: updated.donor_id,
        name: updated.donor_name,
        email: updated.donor_email,
        address: updated.donor_address,
        contactNumber: updated.donor_contact_number,
      },
      pickupScheduledDateTime: updated.pickup_scheduled_date_time,
      pickupStatus: updated.pickup_status,
      contributionStatus: updated.status,
      notes: updated.notes,
      createdAt: updated.created_at,
    }, 'Pickup status updated successfully');
  } catch (error: any) {
    console.error('Error updating pickup status:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to update pickup status',
    });
  }
};


import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { sendSuccess } from '../utils/response';
import { query, queryOne, insert } from '../config/mysql';
import { 
  notifyNgoOnDonation, 
  notifyAdminOnDonation, 
  sendDonorDonationEmail 
} from '../services/notification.service';
export const contributeToDonation = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const donationId = parseInt(id);
    const donorId = parseInt(req.user!.id);

    if (isNaN(donationId)) {
      return res.status(400).json({ success: false, message: 'Invalid donation id' });
    }

    const {
      quantityOrAmount,
      pickupScheduledDateTime,
      donorAddress,
      donorContactNumber,
      notes,
    } = req.body;
    const donation = await queryOne<any>(
      `SELECT d.*, u.name as ngo_name 
       FROM donations d
       INNER JOIN users u ON d.ngo_id = u.id
       WHERE d.id = ?`,
      [donationId]
    );

    if (!donation) {
      return res.status(404).json({ success: false, message: 'Donation not found' });
    }

    if (donation.status === 'CANCELLED' || donation.status === 'COMPLETED') {
      return res.status(400).json({
        success: false,
        message: `Cannot contribute to ${donation.status.toLowerCase()} donation`,
      });
    }

    const donationCategory = donation.donation_category || donation.donation_type;
    const isFunds = donationCategory === 'FUNDS' || donationCategory === 'MONEY';
    const requiresPickup = !isFunds;
    if (!quantityOrAmount) {
      return res.status(400).json({
        success: false,
        message: 'Missing required field: quantityOrAmount',
      });
    }

    const quantity = Number(quantityOrAmount);
    if (Number.isNaN(quantity) || quantity <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Quantity/Amount must be greater than 0',
      });
    }
    if (requiresPickup) {
      if (!pickupScheduledDateTime || !donorAddress || !donorContactNumber) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields for FOOD/CLOTHES donations: pickupScheduledDateTime, donorAddress, donorContactNumber',
        });
      }
      const pickupDate = new Date(pickupScheduledDateTime);
      if (isNaN(pickupDate.getTime())) {
        return res.status(400).json({ success: false, message: 'Invalid pickup date/time format' });
      }
      if (pickupDate.getTime() <= Date.now()) {
        return res.status(400).json({ success: false, message: 'Pickup date must be in the future' });
      }
      if (typeof donorAddress !== 'string' || donorAddress.trim().length === 0) {
        return res.status(400).json({ success: false, message: 'Donor address cannot be empty' });
      }
      if (typeof donorContactNumber !== 'string' || donorContactNumber.trim().length === 0) {
        return res.status(400).json({ success: false, message: 'Donor contact number cannot be empty' });
      }
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
    const donor = await queryOne<any>(
      'SELECT id, name, email, contact_info, phone_number, full_address FROM donors WHERE id = ?',
      [donorId]
    );

    if (!donor) {
      return res.status(404).json({ success: false, message: 'Donor not found' });
    }
    if (requiresPickup) {
      const donorUpdates: string[] = [];
      const donorParams: any[] = [];
      
      if (!donor.full_address && donorAddress) {
        donorUpdates.push('full_address = ?');
        donorParams.push(donorAddress.trim());
      }
      if (!donor.phone_number && donorContactNumber) {
        donorUpdates.push('phone_number = ?');
        donorParams.push(donorContactNumber.trim());
      }
      
      if (donorUpdates.length > 0) {
        donorParams.push(donorId);
        await query(
          `UPDATE donors SET ${donorUpdates.join(', ')} WHERE id = ?`,
          donorParams
        );
      }
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
        requiresPickup ? new Date(pickupScheduledDateTime) : null,
        requiresPickup ? new Date(pickupScheduledDateTime) : new Date(), // For FUNDS, use current date
        requiresPickup ? donorAddress.trim() : (donor.full_address || 'N/A'), // Schema requires NOT NULL
        requiresPickup ? donorContactNumber.trim() : (donor.phone_number || 'N/A'), // Schema requires NOT NULL
        requiresPickup ? 'SCHEDULED' : null,
        'PENDING',
      ]
    );
    const contribution = await queryOne<any>(
      `SELECT c.*, d.name as donor_name, d.email as donor_email,
              dr.donation_category, dr.donation_type, dr.purpose, dr.quantity_or_amount as donation_quantity,
              u.name as ngo_name, u.id as ngo_id
       FROM contributions c
       INNER JOIN donors d ON c.donor_id = d.id
       INNER JOIN donations dr ON c.donation_id = dr.id
       INNER JOIN users u ON dr.ngo_id = u.id
       WHERE c.id = ?`,
      [contributionId]
    );
    try {
      const ngoId = contribution.ngo_id;
      const donationType = contribution.donation_type || contribution.donation_category || 'OTHER';
      const amount = parseFloat(contribution.donation_quantity || quantityOrAmount || '0');
      await notifyNgoOnDonation(
        ngoId,
        donorId,
        contribution.donor_name,
        contribution.donor_email,
        donationType,
        amount,
        contributionId
      );
      await notifyAdminOnDonation(
        donorId,
        contribution.donor_name,
        contribution.ngo_name,
        donationType,
        amount,
        contributionId
      );
      await sendDonorDonationEmail(
        contribution.donor_email,
        contribution.donor_name,
        contribution.ngo_name,
        donationType,
        amount
      );
    } catch (notificationError) {
      console.error('Error sending notifications:', notificationError);
    }

    return sendSuccess(res, {
      id: contribution.id,
      donationId: contribution.donation_id,
      donorId: contribution.donor_id,
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
        quantityOrAmount: contribution.donation_quantity,
        ngoName: contribution.ngo_name,
      },
      notes: contribution.notes,
      scheduledPickupTime: contribution.scheduled_pickup_time,
      pickupScheduledDateTime: contribution.pickup_scheduled_date_time,
      donorAddress: contribution.donor_address,
      donorContactNumber: contribution.donor_contact_number,
      pickupStatus: contribution.pickup_status,
      status: contribution.status,
      createdAt: contribution.created_at,
    }, 'Contribution submitted successfully', 201);
  } catch (error: any) {
    console.error('Error creating contribution:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to submit contribution',
    });
  }
};
export const getMyContributions = async (req: AuthRequest, res: Response) => {
  try {
    const donorId = parseInt(req.user!.id);

    const contributions = await query<any>(
      `SELECT c.*, 
              d.name as donor_name, d.email as donor_email,
              dr.donation_category, dr.donation_type, dr.purpose, dr.quantity_or_amount as donation_quantity,
              u.name as ngo_name, u.email as ngo_email
       FROM contributions c
       INNER JOIN donors d ON c.donor_id = d.id
       INNER JOIN donations dr ON c.donation_id = dr.id
       INNER JOIN users u ON dr.ngo_id = u.id
       WHERE c.donor_id = ?
       ORDER BY c.created_at DESC`,
      [donorId]
    );

    const formattedContributions = contributions.map((c: any) => ({
      id: c.id,
      donationId: c.donation_id,
      donorId: c.donor_id,
      donation: {
        id: c.donation_id,
        donationCategory: c.donation_category,
        donationType: c.donation_type,
        purpose: c.purpose,
        quantityOrAmount: c.donation_quantity,
        ngoName: c.ngo_name,
        ngoEmail: c.ngo_email,
      },
      notes: c.notes,
      scheduledPickupTime: c.scheduled_pickup_time,
      pickupScheduledDateTime: c.pickup_scheduled_date_time,
      donorAddress: c.donor_address,
      donorContactNumber: c.donor_contact_number,
      pickupStatus: c.pickup_status,
      status: c.status,
      createdAt: c.created_at,
    }));

    return sendSuccess(res, formattedContributions, 'Contributions fetched successfully');
  } catch (error: any) {
    console.error('Error fetching contributions:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch contributions',
    });
  }
};
export const getNgoContributions = async (req: AuthRequest, res: Response) => {
  try {
    const { ngoId: paramNgoId } = req.params;
    const authenticatedNgoId = parseInt(req.user!.id);
    const requestedNgoId = parseInt(paramNgoId);

    if (isNaN(requestedNgoId)) {
      return res.status(400).json({ success: false, message: 'Invalid NGO id' });
    }
    if (req.user!.role !== 'ADMIN' && authenticatedNgoId !== requestedNgoId) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You can only view contributions for your own donations',
      });
    }
    const ngo = await queryOne<any>('SELECT id, name FROM users WHERE id = ? AND role = "NGO"', [requestedNgoId]);
    if (!ngo) {
      return res.status(404).json({ success: false, message: 'NGO not found' });
    }

    const contributions = await query<any>(
      `SELECT c.*, 
              d.name as donor_name, d.email as donor_email, d.contact_info as donor_contact_info,
              dr.donation_category, dr.donation_type, dr.purpose, dr.quantity_or_amount as donation_quantity
       FROM contributions c
       INNER JOIN donors d ON c.donor_id = d.id
       INNER JOIN donations dr ON c.donation_id = dr.id
       WHERE dr.ngo_id = ?
       ORDER BY c.created_at DESC`,
      [requestedNgoId]
    );

    const formattedContributions = contributions.map((c: any) => ({
      id: c.id,
      donationId: c.donation_id,
      donorId: c.donor_id,
      donor: {
        id: c.donor_id,
        name: c.donor_name,
        email: c.donor_email,
        contactInfo: c.donor_contact_info,
        address: c.donor_address,
        contactNumber: c.donor_contact_number,
      },
      donation: {
        id: c.donation_id,
        donationCategory: c.donation_category,
        donationType: c.donation_type,
        purpose: c.purpose,
        quantityOrAmount: c.donation_quantity,
      },
      notes: c.notes,
      scheduledPickupTime: c.scheduled_pickup_time,
      pickupScheduledDateTime: c.pickup_scheduled_date_time,
      donorAddress: c.donor_address,
      donorContactNumber: c.donor_contact_number,
      pickupStatus: c.pickup_status,
      status: c.status,
      createdAt: c.created_at,
    }));

    return sendSuccess(res, formattedContributions, 'NGO contributions fetched successfully');
  } catch (error: any) {
    console.error('Error fetching NGO contributions:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch contributions',
    });
  }
};


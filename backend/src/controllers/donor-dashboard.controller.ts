import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { sendSuccess } from '../utils/response';
import { query, queryOne, update } from '../config/mysql';
import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

/**
 * Get donor dashboard overview
 * GET /api/donor/dashboard
 */
export const getDonorDashboard = async (req: AuthRequest, res: Response) => {
  try {
    const donorId = typeof req.user!.id === 'string' ? parseInt(req.user!.id) : req.user!.id;

    // Get donor profile
    const donor = await queryOne<any>('SELECT id, name, email, contact_info, phone_number, full_address, role, created_at FROM donors WHERE id = ?', [donorId]);
    if (!donor) {
      return res.status(404).json({ success: false, message: 'Donor not found' });
    }

    // Get statistics using SQL queries
    const [
      totalContributions,
      pendingContributions,
      approvedContributions,
      completedContributions,
      totalAmountResult,
    ] = await Promise.all([
      queryOne<{ count: number }>('SELECT COUNT(*) as count FROM contributions WHERE donor_id = ?', [donorId]),
      queryOne<{ count: number }>('SELECT COUNT(*) as count FROM contributions WHERE donor_id = ? AND status = ?', [donorId, 'PENDING']),
      queryOne<{ count: number }>('SELECT COUNT(*) as count FROM contributions WHERE donor_id = ? AND status = ?', [donorId, 'APPROVED']),
      queryOne<{ count: number }>('SELECT COUNT(*) as count FROM contributions WHERE donor_id = ? AND status = ?', [donorId, 'COMPLETED']),
      queryOne<{ total: number }>(`
        SELECT COALESCE(SUM(d.quantity_or_amount), 0) as total
        FROM contributions c
        INNER JOIN donations d ON c.donation_id = d.id
        WHERE c.donor_id = ? AND c.status IN ('APPROVED', 'COMPLETED')
      `, [donorId]),
    ]);

    // Get recent contributions
    const recentContributions = await query<any>(`
      SELECT c.*,
        d.donation_category, d.purpose, d.quantity_or_amount, d.status as donation_status,
        u.name as ngo_name, u.email as ngo_email, u.contact_info as ngo_contact_info
      FROM contributions c
      INNER JOIN donations d ON c.donation_id = d.id
      INNER JOIN users u ON d.ngo_id = u.id
      WHERE c.donor_id = ?
      ORDER BY c.created_at DESC
      LIMIT 5
    `, [donorId]);

    // Get upcoming pickups
    const upcomingPickups = await query<any>(`
      SELECT c.*,
        d.donation_category, d.purpose, d.quantity_or_amount,
        u.name as ngo_name, u.email as ngo_email, u.contact_info as ngo_contact_info
      FROM contributions c
      INNER JOIN donations d ON c.donation_id = d.id
      INNER JOIN users u ON d.ngo_id = u.id
      WHERE c.donor_id = ?
        AND c.status IN ('APPROVED', 'PENDING')
        AND c.pickup_scheduled_date_time >= NOW()
      ORDER BY c.pickup_scheduled_date_time ASC
      LIMIT 5
    `, [donorId]);

    const dashboard = {
      profile: {
        id: donor.id,
        name: donor.name,
        email: donor.email,
        contactInfo: donor.contact_info,
        phoneNumber: donor.phone_number,
        fullAddress: donor.full_address,
        role: donor.role,
        createdAt: donor.created_at,
      },
      statistics: {
        contributions: {
          total: totalContributions?.count || 0,
          pending: pendingContributions?.count || 0,
          approved: approvedContributions?.count || 0,
          completed: completedContributions?.count || 0,
        },
        totalAmountContributed: totalAmountResult?.total || 0,
      },
      recentContributions: recentContributions || [],
      upcomingPickups: upcomingPickups || [],
      // Frontend expects these fields
      contributions: recentContributions || [],
      totalContributions: totalContributions?.count || 0,
    };

    return sendSuccess(res, dashboard, 'Donor dashboard fetched successfully');
  } catch (error: any) {
    console.error('Donor Dashboard Error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to fetch dashboard' });
  }
};

/**
 * Get donor profile
 * GET /api/donor/dashboard/profile
 */
export const getDonorProfile = async (req: AuthRequest, res: Response) => {
  try {
    const donorId = typeof req.user!.id === 'string' ? parseInt(req.user!.id) : req.user!.id;
    const donor = await queryOne<any>('SELECT id, name, email, contact_info, phone_number, full_address, role, created_at FROM donors WHERE id = ?', [donorId]);
    
    if (!donor) {
      return res.status(404).json({ success: false, message: 'Donor not found' });
    }

    return sendSuccess(res, {
      id: donor.id,
      name: donor.name,
      email: donor.email,
      contactInfo: donor.contact_info,
      phoneNumber: donor.phone_number,
      fullAddress: donor.full_address,
      role: donor.role,
      createdAt: donor.created_at,
    }, 'Donor profile fetched successfully');
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to fetch profile' });
  }
};

/**
 * Update donor profile
 * PUT /api/donor/dashboard/profile
 */
export const updateDonorProfile = async (req: AuthRequest, res: Response) => {
  try {
    const donorId = typeof req.user!.id === 'string' ? parseInt(req.user!.id) : req.user!.id;
    const { name, contactInfo, password, phoneNumber, fullAddress } = req.body;

    const updates: string[] = [];
    const params: any[] = [];

    if (name) {
      updates.push('name = ?');
      params.push(name.trim());
    }

    if (contactInfo) {
      updates.push('contact_info = ?');
      params.push(contactInfo.trim());
    }

    if (phoneNumber !== undefined) {
      updates.push('phone_number = ?');
      params.push(phoneNumber?.trim() || null);
    }

    if (fullAddress !== undefined) {
      updates.push('full_address = ?');
      params.push(fullAddress?.trim() || null);
    }

    if (password) {
      if (password.length < 6) {
        return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
      }
      const hashed = await bcrypt.hash(password, SALT_ROUNDS);
      updates.push('password = ?');
      params.push(hashed);
    }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, message: 'No fields to update' });
    }

    params.push(donorId);
    const sql = `UPDATE donors SET ${updates.join(', ')} WHERE id = ?`;
    await update(sql, params);

    const updated = await queryOne<any>('SELECT id, name, email, contact_info, phone_number, full_address, role, created_at FROM donors WHERE id = ?', [donorId]);

    return sendSuccess(res, {
      id: updated.id,
      name: updated.name,
      email: updated.email,
      contactInfo: updated.contact_info,
      phoneNumber: updated.phone_number,
      fullAddress: updated.full_address,
      role: updated.role,
      createdAt: updated.created_at,
    }, 'Profile updated successfully');
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to update profile' });
  }
};

/**
 * Get all contributions with filters
 * GET /api/donor/dashboard/contributions
 */
export const getDonorContributions = async (req: AuthRequest, res: Response) => {
  try {
    const donorId = typeof req.user!.id === 'string' ? parseInt(req.user!.id) : req.user!.id;
    const { status, limit = 20, page = 1 } = req.query;

    let sql = `
      SELECT c.*,
        d.donation_category, d.purpose, d.quantity_or_amount, d.status as donation_status,
        u.name as ngo_name, u.email as ngo_email, u.contact_info as ngo_contact_info
      FROM contributions c
      INNER JOIN donations d ON c.donation_id = d.id
      INNER JOIN users u ON d.ngo_id = u.id
      WHERE c.donor_id = ?
    `;
    const params: any[] = [donorId];

    if (status) {
      sql += ' AND c.status = ?';
      params.push(status);
    }

    sql += ' ORDER BY c.created_at DESC';
    
    const offset = (Number(page) - 1) * Number(limit);
    sql += ' LIMIT ? OFFSET ?';
    params.push(Number(limit), offset);

    const contributions = await query<any>(sql, params);

    // Get total count
    let countSql = 'SELECT COUNT(*) as total FROM contributions WHERE donor_id = ?';
    const countParams: any[] = [donorId];
    if (status) {
      countSql += ' AND status = ?';
      countParams.push(status);
    }

    const totalResult = await queryOne<{ total: number }>(countSql, countParams);
    const total = totalResult?.total || 0;

    return sendSuccess(
      res,
      {
        contributions: contributions || [],
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(total / Number(limit)),
        },
      },
      'Contributions fetched successfully'
    );
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to fetch contributions' });
  }
};

/**
 * Get available donations to contribute
 * GET /api/donor/dashboard/available-donations
 */
export const getAvailableDonations = async (req: AuthRequest, res: Response) => {
  try {
    const { status, priority, donationCategory, search, limit = 20, page = 1 } = req.query;

    let sql = `
      SELECT d.*,
        u.name as ngo_name, u.email as ngo_email, u.contact_info as ngo_contact_info,
        (SELECT COUNT(*) FROM donation_images di WHERE di.donation_id = d.id) as image_count,
        (SELECT COUNT(*) FROM contributions c WHERE c.donation_id = d.id) as contribution_count
      FROM donations d
      INNER JOIN users u ON d.ngo_id = u.id
      WHERE d.status != 'CANCELLED'
    `;
    const params: any[] = [];

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
    if (search) {
      sql += ' AND (d.donation_type LIKE ? OR d.purpose LIKE ? OR d.description LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    sql += ' ORDER BY d.created_at DESC';
    
    const offset = (Number(page) - 1) * Number(limit);
    sql += ' LIMIT ? OFFSET ?';
    params.push(Number(limit), offset);

    const donations = await query<any>(sql, params);

    // Get total count
    let countSql = 'SELECT COUNT(*) as total FROM donations WHERE status != ?';
    const countParams: any[] = ['CANCELLED'];
    if (status) {
      countSql += ' AND status = ?';
      countParams.push(status);
    }
    if (priority) {
      countSql += ' AND priority = ?';
      countParams.push(priority);
    }
    if (donationCategory) {
      countSql += ' AND donation_category = ?';
      countParams.push(donationCategory);
    }
    if (search) {
      countSql += ' AND (donation_type LIKE ? OR purpose LIKE ? OR description LIKE ?)';
      const searchTerm = `%${search}%`;
      countParams.push(searchTerm, searchTerm, searchTerm);
    }

    const totalResult = await queryOne<{ total: number }>(countSql, countParams);
    const total = totalResult?.total || 0;

    return sendSuccess(
      res,
      {
        donations: donations || [],
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(total / Number(limit)),
        },
      },
      'Available donations fetched successfully'
    );
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to fetch donations' });
  }
};

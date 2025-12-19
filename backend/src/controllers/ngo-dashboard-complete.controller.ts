import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { sendSuccess } from '../utils/response';
import { query, queryOne, update } from '../config/mysql';
import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

/**
 * Get NGO dashboard overview
 * GET /api/ngo/dashboard
 */
export const getNgoDashboard = async (req: AuthRequest, res: Response) => {
  try {
    const ngoId = typeof req.user!.id === 'string' ? parseInt(req.user!.id) : req.user!.id;

    // Get NGO profile
    const ngo = await queryOne<any>(`
      SELECT id, name, email, contact_info, contact_person_name, phone_number, 
             about_ngo, website_url, logo_url, registration_number, address, 
             city, state, pincode, verified, admin_approval_for_edit, role, 
             created_at, updated_at 
      FROM users WHERE id = ?
    `, [ngoId]);
    if (!ngo) {
      return res.status(404).json({ success: false, message: 'NGO not found' });
    }

    // Get statistics using SQL queries
    const [
      totalDonations,
      pendingDonations,
      confirmedDonations,
      completedDonations,
      urgentDonations,
      totalContributionsResult,
      totalAmountResult,
    ] = await Promise.all([
      queryOne<{ count: number }>('SELECT COUNT(*) as count FROM donations WHERE ngo_id = ?', [ngoId]),
      queryOne<{ count: number }>('SELECT COUNT(*) as count FROM donations WHERE ngo_id = ? AND status = ?', [ngoId, 'PENDING']),
      queryOne<{ count: number }>('SELECT COUNT(*) as count FROM donations WHERE ngo_id = ? AND status = ?', [ngoId, 'CONFIRMED']),
      queryOne<{ count: number }>('SELECT COUNT(*) as count FROM donations WHERE ngo_id = ? AND status = ?', [ngoId, 'COMPLETED']),
      queryOne<{ count: number }>('SELECT COUNT(*) as count FROM donations WHERE ngo_id = ? AND priority = ? AND status != ?', [ngoId, 'URGENT', 'COMPLETED']),
      queryOne<{ count: number }>(`
        SELECT COUNT(*) as count 
        FROM contributions c
        INNER JOIN donations d ON c.donation_id = d.id
        WHERE d.ngo_id = ?
      `, [ngoId]),
      queryOne<{ total: number }>(`
        SELECT COALESCE(SUM(quantity_or_amount), 0) as total 
        FROM donations 
        WHERE ngo_id = ? AND status = ?
      `, [ngoId, 'COMPLETED']),
    ]);

    // Get recent donations
    const recentDonations = await query<any>(`
      SELECT d.*, 
        (SELECT COUNT(*) FROM donation_images di WHERE di.donation_id = d.id) as image_count
      FROM donations d
      WHERE d.ngo_id = ?
      ORDER BY d.created_at DESC
      LIMIT 5
    `, [ngoId]);

    // Get upcoming pickups
    const upcomingPickups = await query<any>(`
      SELECT c.*, 
        d.donation_category, d.purpose, d.quantity_or_amount,
        dr.name as donor_name, dr.email as donor_email, dr.contact_info as donor_contact_info
      FROM contributions c
      INNER JOIN donations d ON c.donation_id = d.id
      INNER JOIN donors dr ON c.donor_id = dr.id
      WHERE d.ngo_id = ? 
        AND c.status IN ('APPROVED', 'PENDING')
        AND c.pickup_scheduled_date_time >= NOW()
      ORDER BY c.pickup_scheduled_date_time ASC
      LIMIT 5
    `, [ngoId]);

    const dashboard = {
      profile: {
        id: ngo.id,
        name: ngo.name,
        email: ngo.email,
        contactInfo: ngo.contact_info,
        contactPersonName: ngo.contact_person_name,
        phoneNumber: ngo.phone_number,
        aboutNgo: ngo.about_ngo,
        websiteUrl: ngo.website_url,
        logoUrl: ngo.logo_url,
        registrationNumber: ngo.registration_number,
        address: ngo.address,
        city: ngo.city,
        state: ngo.state,
        pincode: ngo.pincode,
        verified: ngo.verified || false,
        adminApprovalForEdit: ngo.admin_approval_for_edit || false,
        role: ngo.role,
        createdAt: ngo.created_at,
        updatedAt: ngo.updated_at,
      },
      statistics: {
        donations: {
          total: totalDonations?.count || 0,
          pending: pendingDonations?.count || 0,
          confirmed: confirmedDonations?.count || 0,
          completed: completedDonations?.count || 0,
          urgent: urgentDonations?.count || 0,
        },
        contributions: {
          total: totalContributionsResult?.count || 0,
        },
        totalAmountReceived: totalAmountResult?.total || 0,
      },
      recentDonations: recentDonations || [],
      upcomingPickups: upcomingPickups || [],
      // Frontend expects these fields
      totalDonations: totalDonations?.count || 0,
      pendingDonations: pendingDonations?.count || 0,
      confirmedDonations: confirmedDonations?.count || 0,
      completedDonations: completedDonations?.count || 0,
    };

    return sendSuccess(res, dashboard, 'NGO dashboard fetched successfully');
  } catch (error: any) {
    console.error('NGO Dashboard Error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to fetch dashboard' });
  }
};

/**
 * Get NGO profile
 * GET /api/ngo/dashboard/profile
 */
export const getNgoProfile = async (req: AuthRequest, res: Response) => {
  try {
    const ngoId = typeof req.user!.id === 'string' ? parseInt(req.user!.id) : req.user!.id;
    const ngo = await queryOne<any>(`
      SELECT id, name, email, contact_info, contact_person_name, phone_number, 
             about_ngo, website_url, logo_url, registration_number, address, 
             city, state, pincode, verified, admin_approval_for_edit, role, 
             created_at, updated_at 
      FROM users WHERE id = ?
    `, [ngoId]);
    
    if (!ngo) {
      return res.status(404).json({ success: false, message: 'NGO not found' });
    }

    return sendSuccess(res, {
      id: ngo.id,
      name: ngo.name,
      email: ngo.email,
      contactInfo: ngo.contact_info,
      contactPersonName: ngo.contact_person_name,
      phoneNumber: ngo.phone_number,
      aboutNgo: ngo.about_ngo,
      websiteUrl: ngo.website_url,
      logoUrl: ngo.logo_url,
      registrationNumber: ngo.registration_number,
      address: ngo.address,
      city: ngo.city,
      state: ngo.state,
      pincode: ngo.pincode,
      verified: ngo.verified || false,
      adminApprovalForEdit: ngo.admin_approval_for_edit || false,
      role: ngo.role,
      createdAt: ngo.created_at,
      updatedAt: ngo.updated_at,
    }, 'NGO profile fetched successfully');
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to fetch profile' });
  }
};

/**
 * Update NGO profile
 * PUT /api/ngo/dashboard/profile
 */
export const updateNgoProfile = async (req: AuthRequest, res: Response) => {
  try {
    const ngoId = typeof req.user!.id === 'string' ? parseInt(req.user!.id) : req.user!.id;
    const { 
      name, 
      contactInfo, 
      contactPersonName,
      phoneNumber,
      aboutNgo,
      websiteUrl,
      logoUrl,
      password 
    } = req.body;

    const updates: string[] = [];
    const params: any[] = [];

    // Basic fields (if admin allows)
    if (name) {
      updates.push('name = ?');
      params.push(name.trim());
    }

    if (contactInfo) {
      updates.push('contact_info = ?');
      params.push(contactInfo.trim());
    }

    // Profile fields (always editable by NGO)
    if (contactPersonName !== undefined) {
      updates.push('contact_person_name = ?');
      params.push(contactPersonName ? contactPersonName.trim() : null);
    }

    if (phoneNumber !== undefined) {
      updates.push('phone_number = ?');
      params.push(phoneNumber ? phoneNumber.trim() : null);
    }

    if (aboutNgo !== undefined) {
      updates.push('about_ngo = ?');
      params.push(aboutNgo ? aboutNgo.trim() : null);
    }

    if (websiteUrl !== undefined) {
      updates.push('website_url = ?');
      params.push(websiteUrl ? websiteUrl.trim() : null);
    }

    if (logoUrl !== undefined) {
      updates.push('logo_url = ?');
      params.push(logoUrl ? logoUrl.trim() : null);
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

    params.push(ngoId);
    const sql = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;
    await update(sql, params);

    // Return updated profile with all fields
    const updated = await queryOne<any>(`
      SELECT id, name, email, contact_info, contact_person_name, phone_number, 
             about_ngo, website_url, logo_url, registration_number, address, 
             city, state, pincode, verified, admin_approval_for_edit, role, 
             created_at, updated_at 
      FROM users WHERE id = ?
    `, [ngoId]);

    return sendSuccess(res, {
      id: updated.id,
      name: updated.name,
      email: updated.email,
      contactInfo: updated.contact_info,
      contactPersonName: updated.contact_person_name,
      phoneNumber: updated.phone_number,
      aboutNgo: updated.about_ngo,
      websiteUrl: updated.website_url,
      logoUrl: updated.logo_url,
      registrationNumber: updated.registration_number,
      address: updated.address,
      city: updated.city,
      state: updated.state,
      pincode: updated.pincode,
      verified: updated.verified || false,
      adminApprovalForEdit: updated.admin_approval_for_edit || false,
      role: updated.role,
      createdAt: updated.created_at,
      updatedAt: updated.updated_at,
    }, 'Profile updated successfully');
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to update profile' });
  }
};

/**
 * Get all donations with filters
 * GET /api/ngo/dashboard/donations
 */
export const getNgoDashboardDonations = async (req: AuthRequest, res: Response) => {
  try {
    const ngoId = typeof req.user!.id === 'string' ? parseInt(req.user!.id) : req.user!.id;
    const { status, priority, donationCategory, limit = 20, page = 1 } = req.query;

    let sql = `
      SELECT d.*,
        (SELECT COUNT(*) FROM donation_images di WHERE di.donation_id = d.id) as image_count,
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
    
    const offset = (Number(page) - 1) * Number(limit);
    sql += ' LIMIT ? OFFSET ?';
    params.push(Number(limit), offset);

    const donations = await query<any>(sql, params);

    // Get total count
    let countSql = 'SELECT COUNT(*) as total FROM donations WHERE ngo_id = ?';
    const countParams: any[] = [ngoId];
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
      'Donations fetched successfully'
    );
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to fetch donations' });
  }
};

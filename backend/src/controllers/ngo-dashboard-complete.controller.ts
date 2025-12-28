import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { sendSuccess } from '../utils/response';
import { query, queryOne, update } from '../config/mysql';
import { createAndEmitNotification } from '../services/notification.service';
import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;
export const getNgoDashboard = async (req: AuthRequest, res: Response) => {
  try {
    const ngoId = typeof req.user!.id === 'string' ? parseInt(req.user!.id) : req.user!.id;

    const ngo = await queryOne<any>(`
      SELECT id, ngo_id, name, email, contact_info, contact_person_name, phone_number, 
             about_ngo, website_url, logo_url, registration_number, address, 
             city, state, pincode, verification_status, rejection_reason,
             verified, admin_approval_for_edit, address_locked, role, 
             pending_profile_updates, created_at
      FROM users WHERE id = ?
    `, [ngoId]);
    if (!ngo) {
      return res.status(404).json({ success: false, message: 'NGO not found' });
    }

    console.log('[NGO Dashboard] Fetched NGO data from database:', {
      id: ngo.id,
      ngo_id: ngo.ngo_id,
      name: ngo.name,
      email: ngo.email,
      registration_number: ngo.registration_number,
      address: ngo.address,
      city: ngo.city,
      state: ngo.state,
      pincode: ngo.pincode,
      contact_person_name: ngo.contact_person_name,
      phone_number: ngo.phone_number,
      about_ngo: ngo.about_ngo,
      website_url: ngo.website_url,
      verification_status: ngo.verification_status,
      verified: ngo.verified
    });

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

    const recentDonations = await query<any>(`
      SELECT d.*, 
        (SELECT COUNT(*) FROM donation_images di WHERE di.donation_id = d.id) as image_count
      FROM donations d
      WHERE d.ngo_id = ?
      ORDER BY d.created_at DESC
      LIMIT 5
    `, [ngoId]);

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
        ngo_id: ngo.ngo_id,
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
        verificationStatus: ngo.verification_status || 'PENDING',
        rejectionReason: ngo.rejection_reason,
        verified: ngo.verified || false,
        adminApprovalForEdit: ngo.admin_approval_for_edit || false,
        addressLocked: ngo.address_locked || false,
        pendingProfileUpdates: ngo.pending_profile_updates ? JSON.parse(ngo.pending_profile_updates) : null,
        role: ngo.role,
        createdAt: ngo.created_at,
        updatedAt: ngo.updated_at || ngo.created_at, // Fallback if updated_at doesn't exist
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
export const getNgoProfile = async (req: AuthRequest, res: Response) => {
  try {
    const ngoId = typeof req.user!.id === 'string' ? parseInt(req.user!.id) : req.user!.id;
    const ngo = await queryOne<any>(`
      SELECT id, ngo_id, name, email, contact_info, contact_person_name, phone_number, 
             about_ngo, website_url, logo_url, registration_number, address, 
             city, state, pincode, verification_status, rejection_reason,
             verified, admin_approval_for_edit, address_locked, role, 
             created_at
      FROM users WHERE id = ?
    `, [ngoId]);
    
    if (!ngo) {
      return res.status(404).json({ success: false, message: 'NGO not found' });
    }

    return sendSuccess(res, {
      id: ngo.id,
      ngo_id: ngo.ngo_id,
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
      verificationStatus: ngo.verification_status || 'PENDING',
      rejectionReason: ngo.rejection_reason,
      verified: ngo.verified || false,
      adminApprovalForEdit: ngo.admin_approval_for_edit || false,
      addressLocked: ngo.address_locked || false,
        role: ngo.role,
        createdAt: ngo.created_at,
        updatedAt: ngo.updated_at || ngo.created_at, // Fallback if updated_at doesn't exist
    }, 'NGO profile fetched successfully');
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to fetch profile' });
  }
};
export const updateNgoProfile = async (req: AuthRequest, res: Response) => {
  try {
    const ngoId = typeof req.user!.id === 'string' ? parseInt(req.user!.id) : req.user!.id;

    const ngoCheck = await queryOne<{ verified: boolean; verification_status: string }>(
      'SELECT verified, verification_status FROM users WHERE id = ?',
      [ngoId]
    );
    
    if (!ngoCheck) {
      return res.status(404).json({ success: false, message: 'NGO not found' });
    }

    const verifiedValue: any = ngoCheck.verified;
    const isVerified = verifiedValue === true || verifiedValue === 1 || (verifiedValue !== null && verifiedValue !== false && verifiedValue !== 0);
    const isStatusVerified = ngoCheck.verification_status === 'VERIFIED';
    
    if (!isVerified || !isStatusVerified) {
      return res.status(403).json({ 
        success: false, 
        message: 'Your NGO profile must be verified by admin before you can update it.' 
      });
    }
    
    const { 
      name, 
      contactInfo, 
      contactPersonName,
      phoneNumber,
      aboutNgo,
      websiteUrl,
      logoUrl,
      password,
      address,
      city,
      state,
      pincode,
      saveAsPending // Flag to save as pending for admin approval
    } = req.body;

    console.log(`[Update NGO Profile] NGO ID: ${ngoId}, Update payload:`, req.body);

    if (saveAsPending === true) {
      const pendingUpdates: any = {};
      
      if (name !== undefined && name !== null) pendingUpdates.name = name.trim();
      if (contactPersonName !== undefined) pendingUpdates.contactPersonName = contactPersonName?.trim() || null;
      if (phoneNumber !== undefined) pendingUpdates.phoneNumber = phoneNumber?.trim() || null;
      if (address !== undefined) pendingUpdates.address = address?.trim() || null;
      if (city !== undefined) pendingUpdates.city = city?.trim() || null;
      if (state !== undefined) pendingUpdates.state = state?.trim() || null;
      if (pincode !== undefined) pendingUpdates.pincode = pincode?.trim() || null;
      if (websiteUrl !== undefined) pendingUpdates.websiteUrl = websiteUrl?.trim() || null;
      if (aboutNgo !== undefined) pendingUpdates.aboutNgo = aboutNgo?.trim() || null;
      
      if (Object.keys(pendingUpdates).length === 0) {
        return res.status(400).json({ success: false, message: 'No fields to update' });
      }

      const pendingJson = JSON.stringify(pendingUpdates);
      await update('UPDATE users SET pending_profile_updates = ? WHERE id = ?', [pendingJson, ngoId]);
      
      console.log(`[Update NGO Profile] ✅ Saved pending updates for NGO ID: ${ngoId}`);
      // Notify all admins about profile update awaiting approval
      try {
        const ngoInfo = await queryOne<any>('SELECT name, email FROM users WHERE id = ?', [ngoId]);
        const admins = await query<any>('SELECT id FROM admins');
        for (const admin of admins) {
          await createAndEmitNotification({
            userId: admin.id,
            userType: 'ADMIN',
            title: 'NGO Profile Update Pending Approval',
            message: `${ngoInfo?.name || 'An NGO'} submitted profile updates for approval`,
            type: 'INFO',
            relatedEntityType: 'ngo',
            relatedEntityId: ngoId,
            metadata: { pendingUpdates }
          });
        }
        console.log(`[Update NGO Profile] 📡 Admin notifications emitted for NGO ID: ${ngoId}`);
      } catch (notifErr: any) {
        console.error('[Update NGO Profile] Failed to notify admins of pending profile updates:', notifErr);
      }
      
      return sendSuccess(res, {
        message: 'Profile update submitted successfully. Waiting for admin approval.',
        pendingUpdates: pendingUpdates
      }, 'Profile update submitted for admin approval');
    }

    const updates: string[] = [];
    const params: any[] = [];

    if (name !== undefined && name !== null) {
      updates.push('name = ?');
      params.push(name.trim());
    }

    if (contactInfo !== undefined && contactInfo !== null) {
      updates.push('contact_info = ?');
      params.push(contactInfo.trim());
    }

    if (contactPersonName !== undefined) {
      updates.push('contact_person_name = ?');
      params.push(contactPersonName ? contactPersonName.trim() : null);
    }

    if (phoneNumber !== undefined) {
      updates.push('phone_number = ?');
      params.push(phoneNumber ? phoneNumber.trim() : null);
    }

    if (address !== undefined) {
      updates.push('address = ?');
      params.push(address ? address.trim() : null);
    }

    if (city !== undefined) {
      updates.push('city = ?');
      params.push(city ? city.trim() : null);
    }

    if (state !== undefined) {
      updates.push('state = ?');
      params.push(state ? state.trim() : null);
    }

    if (pincode !== undefined) {
      updates.push('pincode = ?');
      params.push(pincode ? pincode.trim() : null);
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
    console.log(`[Update NGO Profile] Executing SQL: ${sql} with params:`, params);
    const affectedRows = await update(sql, params);
    console.log(`[Update NGO Profile] ✅ Updated ${affectedRows} row(s)`);

    const updated = await queryOne<any>(`
      SELECT id, ngo_id, name, email, contact_info, contact_person_name, phone_number, 
             about_ngo, website_url, logo_url, registration_number, address, 
             city, state, pincode, verification_status, rejection_reason,
             verified, admin_approval_for_edit, address_locked, role, 
             created_at, updated_at 
      FROM users WHERE id = ?
    `, [ngoId]);

    if (!updated) {
      return res.status(404).json({ success: false, message: 'NGO not found after update' });
    }

    console.log(`[Update NGO Profile] ✅ Returning updated profile for NGO ID: ${updated.ngo_id}`);

    return sendSuccess(res, {
      id: updated.id,
      ngo_id: updated.ngo_id,
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
      verificationStatus: updated.verification_status || 'PENDING',
      rejectionReason: updated.rejection_reason,
      verified: updated.verified || false,
      adminApprovalForEdit: updated.admin_approval_for_edit || false,
      addressLocked: updated.address_locked || false,
      role: updated.role,
      createdAt: updated.created_at,
      updatedAt: updated.updated_at || updated.created_at,
    }, 'Profile updated successfully');
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to update profile' });
  }
};
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

import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { sendSuccess } from '../utils/response';
import { query, queryOne, update } from '../config/mysql';
import { sendNgoVerificationApprovalEmail, sendNgoVerificationRejectionEmail, sendEmail } from '../utils/email.service';
import { getEmailTemplate, replaceTemplatePlaceholders, getSupportEmail } from '../utils/email-template.service';
export const getAllNgos = async (req: AuthRequest, res: Response) => {
  try {
    const { isBlocked, search } = req.query;

    let sql = `SELECT id, ngo_id, name, email, contact_info, role, is_blocked, 
               registration_number, contact_person_name, verification_status, 
               rejection_reason, pending_profile_updates, created_at 
               FROM users WHERE role = 'NGO'`;
    const params: any[] = [];

    if (isBlocked !== undefined) {
      sql += ' AND is_blocked = ?';
      params.push(isBlocked === 'true' ? 1 : 0);
    }

    if (search) {
      sql += ' AND (name LIKE ? OR email LIKE ? OR contact_info LIKE ? OR ngo_id LIKE ? OR registration_number LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
    }

    sql += ' ORDER BY created_at DESC';

    const ngos = await query<any>(sql, params);
    const ngosWithStats = await Promise.all(
      ngos.map(async (ngo) => {
        const donationCountResult = await queryOne<{ count: number }>(
          'SELECT COUNT(*) as count FROM donations WHERE ngo_id = ?',
          [ngo.id]
        );
        const donationCount = donationCountResult?.count || 0;

        const contributionCountResult = await queryOne<{ count: number }>(
          `SELECT COUNT(*) as count 
           FROM contributions c
           INNER JOIN donations d ON c.donation_id = d.id
           WHERE d.ngo_id = ?`,
          [ngo.id]
        );
        const totalContributions = contributionCountResult?.count || 0;

        return {
          id: ngo.id,
          ngo_id: ngo.ngo_id,
          name: ngo.name,
          email: ngo.email,
          contactInfo: ngo.contact_info,
          contactPersonName: ngo.contact_person_name,
          registrationNumber: ngo.registration_number,
          verificationStatus: ngo.verification_status || 'PENDING',
          rejectionReason: ngo.rejection_reason,
          role: ngo.role,
          isBlocked: ngo.is_blocked === 1,
          hasPendingProfileUpdate: !!(ngo.pending_profile_updates && ngo.pending_profile_updates !== null && ngo.pending_profile_updates !== 'null' && String(ngo.pending_profile_updates).trim() !== ''),
          pendingProfileUpdate: ngo.pending_profile_updates && ngo.pending_profile_updates !== null && ngo.pending_profile_updates !== 'null' && String(ngo.pending_profile_updates).trim() !== '' ? (() => {
            try {
              const parsed = JSON.parse(ngo.pending_profile_updates);
              return Object.keys(parsed).length > 0 ? parsed : null;
            } catch (e) {
              console.error('Error parsing pending_profile_updates:', e);
              return null;
            }
          })() : null,
          createdAt: ngo.created_at,
          statistics: {
            totalDonations: donationCount,
            totalContributions,
          },
        };
      })
    );

    return sendSuccess(res, { count: ngosWithStats.length, ngos: ngosWithStats }, 'NGOs fetched successfully');
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to fetch NGOs' });
  }
};
export const getAllDonors = async (req: AuthRequest, res: Response) => {
  try {
    const { isBlocked, search } = req.query;

    let sql = 'SELECT id, name, email, contact_info, phone_number, full_address, role, is_blocked, created_at FROM donors WHERE 1=1';
    const params: any[] = [];

    if (isBlocked !== undefined) {
      sql += ' AND is_blocked = ?';
      params.push(isBlocked === 'true' ? 1 : 0);
    }

    if (search) {
      sql += ' AND (name LIKE ? OR email LIKE ? OR contact_info LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    sql += ' ORDER BY created_at DESC';

    const donors = await query<any>(sql, params);
    const donorsWithStats = await Promise.all(
      donors.map(async (donor) => {
        const contributionCountResult = await queryOne<{ count: number }>(
          'SELECT COUNT(*) as count FROM contributions WHERE donor_id = ?',
          [donor.id]
        );
        const contributionCount = contributionCountResult?.count || 0;

        const approvedContributionsResult = await queryOne<{ count: number }>(
          'SELECT COUNT(*) as count FROM contributions WHERE donor_id = ? AND status IN (?, ?)',
          [donor.id, 'APPROVED', 'COMPLETED']
        );
        const approvedContributions = approvedContributionsResult?.count || 0;

        return {
          id: donor.id,
          name: donor.name,
          email: donor.email,
          contactInfo: donor.contact_info,
          phoneNumber: donor.phone_number,
          fullAddress: donor.full_address,
          role: donor.role,
          isBlocked: donor.is_blocked === 1,
          createdAt: donor.created_at,
          statistics: {
            totalContributions: contributionCount,
            approvedContributions,
          },
        };
      })
    );

    return sendSuccess(res, { count: donorsWithStats.length, donors: donorsWithStats }, 'Donors fetched successfully');
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to fetch donors' });
  }
};
export const getNgoDetails = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const ngoId = parseInt(id);

    if (isNaN(ngoId)) {
      return res.status(400).json({ success: false, message: 'Invalid NGO id' });
    }

    const ngo = await queryOne<any>(
      `SELECT id, ngo_id, name, email, contact_info, contact_person_name, phone_number,
              registration_number, address, city, state, pincode, website_url, about_ngo,
              verification_status, rejection_reason, pending_profile_updates,
              role, is_blocked, created_at 
       FROM users WHERE id = ?`,
      [ngoId]
    );

    if (!ngo) {
      return res.status(404).json({ success: false, message: 'NGO not found' });
    }
    const donations = await query<any>(
      'SELECT * FROM donations WHERE ngo_id = ? ORDER BY created_at DESC',
      [ngoId]
    );
    const totalContributionsResult = await queryOne<{ count: number }>(
      `SELECT COUNT(*) as count 
       FROM contributions c
       INNER JOIN donations d ON c.donation_id = d.id
       WHERE d.ngo_id = ?`,
      [ngoId]
    );
    const totalContributions = totalContributionsResult?.count || 0;

    const ngoDetails = {
      id: ngo.id,
      ngo_id: ngo.ngo_id,
      name: ngo.name,
      email: ngo.email,
      contactInfo: ngo.contact_info,
      contactPersonName: ngo.contact_person_name,
      phoneNumber: ngo.phone_number,
      registrationNumber: ngo.registration_number,
      address: ngo.address,
      city: ngo.city,
      state: ngo.state,
      pincode: ngo.pincode,
      websiteUrl: ngo.website_url,
      aboutNgo: ngo.about_ngo,
      verificationStatus: ngo.verification_status || 'PENDING',
      rejectionReason: ngo.rejection_reason,
      hasPendingProfileUpdate: !!(ngo.pending_profile_updates && ngo.pending_profile_updates !== null && ngo.pending_profile_updates !== 'null' && ngo.pending_profile_updates.trim() !== ''),
      pendingProfileUpdate: ngo.pending_profile_updates && ngo.pending_profile_updates !== null && ngo.pending_profile_updates !== 'null' && ngo.pending_profile_updates.trim() !== '' ? (() => {
        try {
          const parsed = JSON.parse(ngo.pending_profile_updates);
          return Object.keys(parsed).length > 0 ? parsed : null;
        } catch (e) {
          return null;
        }
      })() : null,
      role: ngo.role,
      isBlocked: ngo.is_blocked === 1,
      createdAt: ngo.created_at,
      donations: {
        total: donations.length,
        list: donations,
      },
      statistics: {
        totalDonations: donations.length,
        totalContributions,
      },
    };

    return sendSuccess(res, ngoDetails, 'NGO details fetched successfully');
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to fetch NGO details' });
  }
};
export const getDonorDetails = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const donorId = parseInt(id);

    if (isNaN(donorId)) {
      return res.status(400).json({ success: false, message: 'Invalid donor id' });
    }

    const donor = await queryOne<any>(
      'SELECT id, name, email, contact_info, phone_number, full_address, role, is_blocked, created_at FROM donors WHERE id = ?',
      [donorId]
    );

    if (!donor) {
      return res.status(404).json({ success: false, message: 'Donor not found' });
    }
    const contributions = await query<any>(
      `SELECT c.*, 
        d.donation_category, d.purpose, d.quantity_or_amount, d.status as donation_status,
        u.name as ngo_name, u.email as ngo_email
       FROM contributions c
       INNER JOIN donations d ON c.donation_id = d.id
       INNER JOIN users u ON d.ngo_id = u.id
       WHERE c.donor_id = ?
       ORDER BY c.created_at DESC`,
      [donorId]
    );

    const donorDetails = {
      id: donor.id,
      name: donor.name,
      email: donor.email,
      contactInfo: donor.contact_info,
      phoneNumber: donor.phone_number,
      fullAddress: donor.full_address,
      role: donor.role,
      isBlocked: donor.is_blocked === 1,
      createdAt: donor.created_at,
      contributions: {
        total: contributions.length,
        list: contributions,
      },
      statistics: {
        totalContributions: contributions.length,
        approvedContributions: contributions.filter((c) => c.status === 'APPROVED' || c.status === 'COMPLETED').length,
      },
    };

    return sendSuccess(res, donorDetails, 'Donor details fetched successfully');
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to fetch donor details' });
  }
};
export const blockNgo = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { blockReason } = req.body as { blockReason?: string };
    const adminId = req.user!.id;
    const ngoId = parseInt(id);

    if (isNaN(ngoId)) {
      return res.status(400).json({ success: false, message: 'Invalid NGO id' });
    }

    if (!blockReason || blockReason.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Block reason is required for admin records',
      });
    }
    const ngo = await queryOne<any>(
      'SELECT id, name, email, contact_info, role, is_blocked FROM users WHERE id = ? AND role = ?',
      [ngoId, 'NGO']
    );

    if (!ngo) {
      return res.status(404).json({ success: false, message: 'NGO not found' });
    }

    if (ngo.is_blocked === 1) {
      return res.status(400).json({ success: false, message: 'NGO is already blocked' });
    }
    const affectedRows = await update('UPDATE users SET is_blocked = 1 WHERE id = ?', [ngoId]);

    if (affectedRows === 0) {
      return res.status(500).json({ success: false, message: 'Failed to block NGO' });
    }
    const blockDate = new Date();
    try {
      await update(
        `INSERT INTO ngo_block_history (ngo_id, block_reason, blocked_by, blocked_at, email_template_version) 
         VALUES (?, ?, ?, ?, 'current')`,
        [ngoId, blockReason.trim(), adminId, blockDate]
      );
    } catch (historyError: any) {
      console.warn('Could not save block history:', historyError.message);
    }
    try {
      console.log(`[Block NGO] Fetching email template for NGO: ${ngo.name} (${ngo.email})`);
      const template = await getEmailTemplate('NGO_BLOCK');
      console.log(`[Block NGO] Template fetched. Subject: ${template.subject.substring(0, 50)}...`);
      
      const supportEmail = getSupportEmail();
      const blockDateStr = blockDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      const emailSubject = replaceTemplatePlaceholders(template.subject, {
        NGO_NAME: ngo.name,
      });

      const emailBody = replaceTemplatePlaceholders(template.bodyHtml, {
        NGO_NAME: ngo.name,
        BLOCK_DATE: blockDateStr,
        SUPPORT_EMAIL: supportEmail,
        BLOCK_REASON: blockReason.trim(),
      });

      console.log(`[Block NGO] Sending email to: ${ngo.email}`);
      await sendEmail({
        to: ngo.email,
        subject: emailSubject,
        html: emailBody,
      });

      console.log(`✅ Block email sent successfully to ${ngo.email}`);
    } catch (emailError: any) {
      console.error('❌ Failed to send block email:', emailError);
      console.error('Error details:', {
        message: emailError.message,
        stack: emailError.stack,
        ngoEmail: ngo.email,
        ngoName: ngo.name,
      });
    }
    const updatedNgo = await queryOne<any>(
      'SELECT id, name, email, contact_info, role, is_blocked, created_at FROM users WHERE id = ?',
      [ngoId]
    );

    return sendSuccess(
      res,
      {
        id: updatedNgo.id,
        name: updatedNgo.name,
        email: updatedNgo.email,
        contactInfo: updatedNgo.contact_info,
        role: updatedNgo.role,
        isBlocked: true,
        createdAt: updatedNgo.created_at,
      },
      'NGO blocked successfully. Notification email sent.'
    );
  } catch (error: any) {
    console.error('Error blocking NGO:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to block NGO' });
  }
};
export const unblockNgo = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { unblockReason } = req.body as { unblockReason?: string };
    const adminId = req.user!.id;
    const ngoId = parseInt(id);

    if (isNaN(ngoId)) {
      return res.status(400).json({ success: false, message: 'Invalid NGO id' });
    }

    if (!unblockReason || unblockReason.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Unblock reason is required for admin records',
      });
    }
    const ngo = await queryOne<any>(
      'SELECT id, name, email, contact_info, role, is_blocked FROM users WHERE id = ? AND role = ?',
      [ngoId, 'NGO']
    );

    if (!ngo) {
      return res.status(404).json({ success: false, message: 'NGO not found' });
    }

    if (ngo.is_blocked === 0) {
      return res.status(400).json({ success: false, message: 'NGO is already unblocked' });
    }
    const affectedRows = await update('UPDATE users SET is_blocked = 0 WHERE id = ?', [ngoId]);

    if (affectedRows === 0) {
      return res.status(500).json({ success: false, message: 'Failed to unblock NGO' });
    }
    const unblockDate = new Date();
    try {
      await update(
        `INSERT INTO ngo_unblock_history (ngo_id, unblock_reason, unblocked_by, unblocked_at, email_template_version) 
         VALUES (?, ?, ?, ?, 'current')`,
        [ngoId, unblockReason.trim(), adminId, unblockDate]
      );
    } catch (historyError: any) {
      console.warn('Could not save unblock history:', historyError.message);
    }
    try {
      console.log(`[Unblock NGO] Fetching email template for NGO: ${ngo.name} (${ngo.email})`);
      const template = await getEmailTemplate('NGO_UNBLOCK');
      console.log(`[Unblock NGO] Template fetched. Subject: ${template.subject.substring(0, 50)}...`);
      
      const supportEmail = getSupportEmail();
      const unblockDateStr = unblockDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      const emailSubject = replaceTemplatePlaceholders(template.subject, {
        NGO_NAME: ngo.name,
      });

      const emailBody = replaceTemplatePlaceholders(template.bodyHtml, {
        NGO_NAME: ngo.name,
        UNBLOCK_DATE: unblockDateStr,
        SUPPORT_EMAIL: supportEmail,
        UNBLOCK_REASON: unblockReason.trim(),
      });

      console.log(`[Unblock NGO] Sending email to: ${ngo.email}`);
      await sendEmail({
        to: ngo.email,
        subject: emailSubject,
        html: emailBody,
      });

      console.log(`✅ Unblock email sent successfully to ${ngo.email}`);
    } catch (emailError: any) {
      console.error('❌ Failed to send unblock email:', emailError);
      console.error('Error details:', {
        message: emailError.message,
        stack: emailError.stack,
        ngoEmail: ngo.email,
        ngoName: ngo.name,
      });
    }
    const updatedNgo = await queryOne<any>(
      'SELECT id, name, email, contact_info, role, is_blocked, created_at FROM users WHERE id = ?',
      [ngoId]
    );

    return sendSuccess(
      res,
      {
        id: updatedNgo.id,
        name: updatedNgo.name,
        email: updatedNgo.email,
        contactInfo: updatedNgo.contact_info,
        role: updatedNgo.role,
        isBlocked: false,
        createdAt: updatedNgo.created_at,
      },
      'NGO unblocked successfully. Notification email sent.'
    );
  } catch (error: any) {
    console.error('Error unblocking NGO:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to unblock NGO' });
  }
};
export const blockDonor = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const donorId = parseInt(id);

    if (isNaN(donorId)) {
      return res.status(400).json({ success: false, message: 'Invalid donor id' });
    }

    const affectedRows = await update(
      'UPDATE donors SET is_blocked = 1 WHERE id = ?',
      [donorId]
    );

    if (affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Donor not found' });
    }

    const donor = await queryOne<any>(
      'SELECT id, name, email, contact_info, phone_number, full_address, role, is_blocked, created_at FROM donors WHERE id = ?',
      [donorId]
    );

    return sendSuccess(
      res,
      {
        id: donor.id,
        name: donor.name,
        email: donor.email,
        contactInfo: donor.contact_info,
        phoneNumber: donor.phone_number,
        fullAddress: donor.full_address,
        role: donor.role,
        isBlocked: true,
        createdAt: donor.created_at,
      },
      'Donor blocked successfully'
    );
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to block donor' });
  }
};
export const unblockDonor = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const donorId = parseInt(id);

    if (isNaN(donorId)) {
      return res.status(400).json({ success: false, message: 'Invalid donor id' });
    }

    const affectedRows = await update(
      'UPDATE donors SET is_blocked = 0 WHERE id = ?',
      [donorId]
    );

    if (affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Donor not found' });
    }

    const donor = await queryOne<any>(
      'SELECT id, name, email, contact_info, phone_number, full_address, role, is_blocked, created_at FROM donors WHERE id = ?',
      [donorId]
    );

    return sendSuccess(
      res,
      {
        id: donor.id,
        name: donor.name,
        email: donor.email,
        contactInfo: donor.contact_info,
        phoneNumber: donor.phone_number,
        fullAddress: donor.full_address,
        role: donor.role,
        isBlocked: false,
        createdAt: donor.created_at,
      },
      'Donor unblocked successfully'
    );
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to unblock donor' });
  }
};
export const approveNgo = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const ngoId = parseInt(id);

    if (isNaN(ngoId)) {
      return res.status(400).json({ success: false, message: 'Invalid NGO id' });
    }
    const ngo = await queryOne<any>(
      `SELECT id, ngo_id, name, email, verification_status 
       FROM users 
       WHERE id = ? AND role = 'NGO'`,
      [ngoId]
    );

    if (!ngo) {
      return res.status(404).json({ success: false, message: 'NGO not found' });
    }

    if (ngo.verification_status === 'VERIFIED') {
      return res.status(400).json({ success: false, message: 'NGO is already verified' });
    }
    const affectedRows = await update(
      `UPDATE users 
       SET verification_status = 'VERIFIED', verified = TRUE, rejection_reason = NULL 
       WHERE id = ? AND role = 'NGO'`,
      [ngoId]
    );

    if (affectedRows === 0) {
      return res.status(500).json({ success: false, message: 'Failed to approve NGO' });
    }
    try {
      await sendNgoVerificationApprovalEmail(ngo.email, ngo.name, ngo.ngo_id || `NGO-${ngo.id}`);
      console.log(`✅ Verification approval email sent to ${ngo.email}`);
    } catch (emailError: any) {
      console.error('Failed to send approval email:', emailError);
    }
    const updatedNgo = await queryOne<any>(
      `SELECT id, ngo_id, name, email, contact_info, contact_person_name, 
              registration_number, verification_status, created_at 
       FROM users 
       WHERE id = ?`,
      [ngoId]
    );

    return sendSuccess(
      res,
      {
        id: updatedNgo.id,
        ngo_id: updatedNgo.ngo_id,
        name: updatedNgo.name,
        email: updatedNgo.email,
        contactInfo: updatedNgo.contact_info,
        contactPersonName: updatedNgo.contact_person_name,
        registrationNumber: updatedNgo.registration_number,
        verificationStatus: 'VERIFIED',
        createdAt: updatedNgo.created_at,
      },
      'NGO approved successfully. Verification email sent.'
    );
  } catch (error: any) {
    console.error('Error approving NGO:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to approve NGO' });
  }
};
export const rejectNgo = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { rejectionReason } = req.body as { rejectionReason?: string };
    const ngoId = parseInt(id);

    if (isNaN(ngoId)) {
      return res.status(400).json({ success: false, message: 'Invalid NGO id' });
    }

    if (!rejectionReason || rejectionReason.trim().length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Rejection reason is required' 
      });
    }
    const ngo = await queryOne<any>(
      `SELECT id, ngo_id, name, email, verification_status 
       FROM users 
       WHERE id = ? AND role = 'NGO'`,
      [ngoId]
    );

    if (!ngo) {
      return res.status(404).json({ success: false, message: 'NGO not found' });
    }

    if (ngo.verification_status === 'REJECTED') {
      return res.status(400).json({ success: false, message: 'NGO is already rejected' });
    }
    const affectedRows = await update(
      `UPDATE users 
       SET verification_status = 'REJECTED', verified = FALSE, rejection_reason = ? 
       WHERE id = ? AND role = 'NGO'`,
      [rejectionReason.trim(), ngoId]
    );

    if (affectedRows === 0) {
      return res.status(500).json({ success: false, message: 'Failed to reject NGO' });
    }
    try {
      await sendNgoVerificationRejectionEmail(ngo.email, ngo.name, rejectionReason.trim());
      console.log(`✅ Verification rejection email sent to ${ngo.email}`);
    } catch (emailError: any) {
      console.error('Failed to send rejection email:', emailError);
    }
    const updatedNgo = await queryOne<any>(
      `SELECT id, ngo_id, name, email, contact_info, contact_person_name, 
              registration_number, verification_status, rejection_reason, created_at 
       FROM users 
       WHERE id = ?`,
      [ngoId]
    );

    return sendSuccess(
      res,
      {
        id: updatedNgo.id,
        ngo_id: updatedNgo.ngo_id,
        name: updatedNgo.name,
        email: updatedNgo.email,
        contactInfo: updatedNgo.contact_info,
        contactPersonName: updatedNgo.contact_person_name,
        registrationNumber: updatedNgo.registration_number,
        verificationStatus: 'REJECTED',
        rejectionReason: updatedNgo.rejection_reason,
        createdAt: updatedNgo.created_at,
      },
      'NGO rejected. Rejection email sent.'
    );
  } catch (error: any) {
    console.error('Error rejecting NGO:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to reject NGO' });
  }
};
export const approveNgoProfileUpdate = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const ngoId = parseInt(id);

    if (isNaN(ngoId)) {
      return res.status(400).json({ success: false, message: 'Invalid NGO id' });
    }
    const ngo = await queryOne<any>(
      'SELECT id, ngo_id, name, email, pending_profile_updates FROM users WHERE id = ?',
      [ngoId]
    );

    if (!ngo) {
      return res.status(404).json({ success: false, message: 'NGO not found' });
    }

    if (!ngo.pending_profile_updates) {
      return res.status(400).json({ success: false, message: 'No pending profile updates found' });
    }

    const pendingUpdates = JSON.parse(ngo.pending_profile_updates);
    const updates: string[] = [];
    const params: any[] = [];

    if (pendingUpdates.name) {
      updates.push('name = ?');
      params.push(pendingUpdates.name);
    }
    if (pendingUpdates.contactPersonName !== undefined) {
      updates.push('contact_person_name = ?');
      params.push(pendingUpdates.contactPersonName);
    }
    if (pendingUpdates.phoneNumber !== undefined) {
      updates.push('phone_number = ?');
      params.push(pendingUpdates.phoneNumber);
    }
    if (pendingUpdates.address !== undefined) {
      updates.push('address = ?');
      params.push(pendingUpdates.address);
    }
    if (pendingUpdates.city !== undefined) {
      updates.push('city = ?');
      params.push(pendingUpdates.city);
    }
    if (pendingUpdates.state !== undefined) {
      updates.push('state = ?');
      params.push(pendingUpdates.state);
    }
    if (pendingUpdates.pincode !== undefined) {
      updates.push('pincode = ?');
      params.push(pendingUpdates.pincode);
    }
    if (pendingUpdates.websiteUrl !== undefined) {
      updates.push('website_url = ?');
      params.push(pendingUpdates.websiteUrl);
    }
    if (pendingUpdates.aboutNgo !== undefined) {
      updates.push('about_ngo = ?');
      params.push(pendingUpdates.aboutNgo);
    }
    updates.push('pending_profile_updates = NULL');
    params.push(ngoId);

    const sql = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;
    await update(sql, params);
    const updatedNgo = await queryOne<any>(
      'SELECT id, ngo_id, name, email, contact_person_name, phone_number, address, city, state, pincode, website_url, about_ngo FROM users WHERE id = ?',
      [ngoId]
    );

    return sendSuccess(res, {
      id: updatedNgo.id,
      ngo_id: updatedNgo.ngo_id,
      name: updatedNgo.name,
      email: updatedNgo.email,
      contactPersonName: updatedNgo.contact_person_name,
      phoneNumber: updatedNgo.phone_number,
      address: updatedNgo.address,
      city: updatedNgo.city,
      state: updatedNgo.state,
      pincode: updatedNgo.pincode,
      websiteUrl: updatedNgo.website_url,
      aboutNgo: updatedNgo.about_ngo,
    }, 'Profile update approved successfully');
  } catch (error: any) {
    console.error('Error approving profile update:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to approve profile update' });
  }
};
export const rejectNgoProfileUpdate = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const ngoId = parseInt(id);

    if (isNaN(ngoId)) {
      return res.status(400).json({ success: false, message: 'Invalid NGO id' });
    }
    await update(
      'UPDATE users SET pending_profile_updates = NULL WHERE id = ?',
      [ngoId]
    );

    return sendSuccess(res, { id: ngoId }, 'Profile update rejected successfully');
  } catch (error: any) {
    console.error('Error rejecting profile update:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to reject profile update' });
  }
};


import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { sendSuccess } from '../utils/response';
import { query, queryOne, update } from '../config/mysql';
import { sendEmail } from '../utils/email.service';

/**
 * Get detailed donor contributions for an NGO
 * GET /api/ngo/donations/details
 */
export const getNgoDonationDetails = async (req: AuthRequest, res: Response) => {
  try {
    const ngoId = parseInt(req.user!.id);
    console.log(`[NGO Donations] Fetching donation details for NGO ID: ${ngoId}`);

    // Get all contributions to this NGO's donation requests
    const contributions = await query<any>(`
      SELECT 
        drc.id as contribution_id,
        drc.quantity_or_amount,
        drc.pickup_location,
        drc.pickup_date,
        drc.pickup_time,
        drc.notes,
        drc.status as contribution_status,
        drc.created_at as donation_date,
        dr.id as request_id,
        dr.donation_type,
        dr.description as request_description,
        d.id as donor_id,
        d.name as donor_name,
        d.email as donor_email,
        d.contact_info as donor_contact,
        d.phone_number as donor_phone
      FROM donation_request_contributions drc
      INNER JOIN donation_requests dr ON drc.request_id = dr.id
      INNER JOIN donors d ON drc.donor_id = d.id
      WHERE dr.ngo_id = ?
      ORDER BY drc.created_at DESC
    `, [ngoId]);

    console.log(`[NGO Donations] Found ${contributions.length} contributions`);

    // Format the response
    const formattedContributions = contributions.map((cont: any) => ({
      contributionId: cont.contribution_id,
      donor: {
        id: cont.donor_id,
        name: cont.donor_name,
        email: cont.donor_email,
        contact: cont.donor_contact || cont.donor_phone,
        phone: cont.donor_phone
      },
      donationType: cont.donation_type,
      quantityOrAmount: parseFloat(cont.quantity_or_amount),
      donationDate: cont.donation_date,
      pickupLocation: cont.pickup_location,
      pickupDate: cont.pickup_date,
      pickupTime: cont.pickup_time,
      notes: cont.notes,
      status: cont.contribution_status,
      request: {
        id: cont.request_id,
        description: cont.request_description
      }
    }));

    return sendSuccess(res, formattedContributions, 'Donation details fetched successfully');
  } catch (error: any) {
    console.error('Error fetching NGO donation details:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch donation details'
    });
  }
};

/**
 * Get aggregated donation summary for an NGO
 * GET /api/ngo/donations/summary
 */
export const getNgoDonationSummary = async (req: AuthRequest, res: Response) => {
  try {
    const ngoId = parseInt(req.user!.id);
    console.log(`[NGO Donations] Fetching donation summary for NGO ID: ${ngoId}`);

    // Get total distinct donors
    const totalDonorsResult = await queryOne<{ count: number }>(`
      SELECT COUNT(DISTINCT drc.donor_id) as count
      FROM donation_request_contributions drc
      INNER JOIN donation_requests dr ON drc.request_id = dr.id
      WHERE dr.ngo_id = ?
    `, [ngoId]);

    // Get total donations count
    const totalDonationsResult = await queryOne<{ count: number }>(`
      SELECT COUNT(*) as count
      FROM donation_request_contributions drc
      INNER JOIN donation_requests dr ON drc.request_id = dr.id
      WHERE dr.ngo_id = ?
    `, [ngoId]);

    // Get total funds collected (MONEY/FUNDS donations)
    const totalFundsResult = await queryOne<{ total: number }>(`
      SELECT COALESCE(SUM(drc.quantity_or_amount), 0) as total
      FROM donation_request_contributions drc
      INNER JOIN donation_requests dr ON drc.request_id = dr.id
      WHERE dr.ngo_id = ? AND dr.donation_type IN ('FUNDS', 'MONEY')
    `, [ngoId]);

    // Get breakdown by donation type
    const breakdownByType = await query<any>(`
      SELECT 
        dr.donation_type,
        COUNT(*) as donation_count,
        COALESCE(SUM(drc.quantity_or_amount), 0) as total_quantity_or_amount
      FROM donation_request_contributions drc
      INNER JOIN donation_requests dr ON drc.request_id = dr.id
      WHERE dr.ngo_id = ?
      GROUP BY dr.donation_type
      ORDER BY dr.donation_type
    `, [ngoId]);

    // Format breakdown
    const breakdown: Record<string, { count: number; total: number }> = {};
    breakdownByType.forEach((item: any) => {
      breakdown[item.donation_type] = {
        count: item.donation_count,
        total: parseFloat(item.total_quantity_or_amount)
      };
    });

    // Ensure all common types are present (even if 0)
    const commonTypes = ['FOOD', 'CLOTHES', 'MONEY', 'FUNDS', 'MEDICINE', 'BOOKS', 'TOYS', 'OTHER'];
    commonTypes.forEach(type => {
      if (!breakdown[type]) {
        breakdown[type] = { count: 0, total: 0 };
      }
    });

    const summary = {
      totalDonors: totalDonorsResult?.count || 0,
      totalDonations: totalDonationsResult?.count || 0,
      totalFundsCollected: parseFloat(totalFundsResult?.total?.toString() || '0'),
      breakdownByType: breakdown
    };

    console.log(`[NGO Donations] Summary:`, summary);
    return sendSuccess(res, summary, 'Donation summary fetched successfully');
  } catch (error: any) {
    console.error('Error fetching NGO donation summary:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch donation summary'
    });
  }
};

/**
 * Update contribution status (NGO can approve/reject/complete)
 * PUT /api/ngo/dashboard/donations/:contributionId/status
 */
export const updateContributionStatus = async (req: AuthRequest, res: Response) => {
  try {
    console.log('[updateContributionStatus] Route hit!');
    console.log('[updateContributionStatus] Params:', req.params);
    console.log('[updateContributionStatus] Body:', req.body);
    console.log('[updateContributionStatus] User:', req.user);
    
    const ngoId = parseInt(req.user!.id);
    const contributionId = parseInt(req.params.contributionId);
    const { status } = req.body;

    console.log('[updateContributionStatus] Parsed - NGO ID:', ngoId, 'Contribution ID:', contributionId, 'Status:', status);

    if (isNaN(contributionId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid contribution ID'
      });
    }

    // Validate status - Only ACCEPTED and NOT_RECEIVED are allowed
    const validStatuses = ['ACCEPTED', 'NOT_RECEIVED'];
    const statusUpper = typeof status === 'string' ? status.toUpperCase() : String(status).toUpperCase();
    
    if (!validStatuses.includes(statusUpper)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    // Verify that this contribution belongs to an NGO's donation request
    const contribution = await queryOne<any>(`
      SELECT drc.id, dr.ngo_id
      FROM donation_request_contributions drc
      INNER JOIN donation_requests dr ON drc.request_id = dr.id
      WHERE drc.id = ?
    `, [contributionId]);

    if (!contribution) {
      return res.status(404).json({
        success: false,
        message: 'Contribution not found'
      });
    }

    if (contribution.ngo_id !== ngoId) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to update this contribution'
      });
    }

    // Update status
    await update(
      'UPDATE donation_request_contributions SET status = ? WHERE id = ?',
      [statusUpper, contributionId]
    );

    // Fetch updated contribution with donor and request details
    const updatedContribution = await queryOne<any>(`
      SELECT 
        drc.*, 
        dr.donation_type,
        dr.description as request_description,
        d.name as donor_name,
        d.email as donor_email
      FROM donation_request_contributions drc
      INNER JOIN donation_requests dr ON drc.request_id = dr.id
      INNER JOIN donors d ON drc.donor_id = d.id
      WHERE drc.id = ?
    `, [contributionId]);

    console.log(`[NGO Donations] Updated contribution ${contributionId} status to ${statusUpper}`);

    // Send email to donor based on status
    if (updatedContribution.donor_email) {
      try {
        let emailSubject = '';
        let emailHtml = '';

        if (statusUpper === 'ACCEPTED') {
          emailSubject = 'Your Donation Has Been Received';
          emailHtml = `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Donation Received</title>
            </head>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                <h1 style="color: white; margin: 0; font-size: 28px;">✅ Donation Received</h1>
              </div>
              
              <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e2e8f0;">
                <p style="font-size: 16px; color: #0f172a;">Hello <strong>${updatedContribution.donor_name}</strong>,</p>
                
                <p style="font-size: 16px; color: #0f172a;">
                  Great news! Your donation has been <strong style="color: #10b981;">received</strong> successfully by our team.
                </p>
                
                <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0;">
                  <h3 style="color: #0f172a; margin-top: 0;">Donation Details:</h3>
                  <p style="margin: 10px 0;"><strong>Type:</strong> ${updatedContribution.donation_type}</p>
                  <p style="margin: 10px 0;"><strong>Quantity/Amount:</strong> ${updatedContribution.quantity_or_amount}</p>
                  ${updatedContribution.request_description ? `<p style="margin: 10px 0;"><strong>Request:</strong> ${updatedContribution.request_description}</p>` : ''}
                  <p style="margin: 10px 0;"><strong>Status:</strong> <span style="color: #10b981; font-weight: bold;">RECEIVED</span></p>
                </div>
                
                <p style="font-size: 16px; color: #0f172a;">
                  Thank you for your generous contribution! Your donation has made a positive impact in our community.
                </p>
                
                <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
                
                <p style="font-size: 14px; color: #64748b; margin: 0;">
                  Regards,<br>
                  <strong>Donation & Charity Platform Team</strong>
                </p>
                
                <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
                
                <p style="font-size: 12px; color: #94a3b8; text-align: center; margin: 0;">
                  This is an automated email. Please do not reply to this message.<br>
                  © ${new Date().getFullYear()} Donation & Charity Management Portal
                </p>
              </div>
            </body>
            </html>
          `;
        } else if (statusUpper === 'NOT_RECEIVED') {
          emailSubject = 'Donation Pickup Update';
          emailHtml = `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Donation Pickup Update</title>
            </head>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                <h1 style="color: white; margin: 0; font-size: 28px;">⚠️ Pickup Update</h1>
              </div>
              
              <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e2e8f0;">
                <p style="font-size: 16px; color: #0f172a;">Hello <strong>${updatedContribution.donor_name}</strong>,</p>
                
                <p style="font-size: 16px; color: #0f172a;">
                  We regret to inform you that our team was <strong style="color: #f59e0b;">unable to reach your location</strong> to collect your donation.
                </p>
                
                <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0;">
                  <h3 style="color: #0f172a; margin-top: 0;">Donation Details:</h3>
                  <p style="margin: 10px 0;"><strong>Type:</strong> ${updatedContribution.donation_type}</p>
                  <p style="margin: 10px 0;"><strong>Quantity/Amount:</strong> ${updatedContribution.quantity_or_amount}</p>
                  ${updatedContribution.request_description ? `<p style="margin: 10px 0;"><strong>Request:</strong> ${updatedContribution.request_description}</p>` : ''}
                  <p style="margin: 10px 0;"><strong>Status:</strong> <span style="color: #f59e0b; font-weight: bold;">NOT RECEIVED</span></p>
                </div>
                
                <p style="font-size: 16px; color: #0f172a;">
                  This could be due to incorrect address, unavailability at the scheduled time, or accessibility issues. Please contact us if you would like to reschedule the pickup or update your location details.
                </p>
                
                <p style="font-size: 16px; color: #0f172a;">
                  We appreciate your willingness to contribute and hope we can arrange a successful pickup in the future.
                </p>
                
                <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
                
                <p style="font-size: 14px; color: #64748b; margin: 0;">
                  Regards,<br>
                  <strong>Donation & Charity Platform Team</strong>
                </p>
                
                <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
                
                <p style="font-size: 12px; color: #94a3b8; text-align: center; margin: 0;">
                  This is an automated email. Please do not reply to this message.<br>
                  © ${new Date().getFullYear()} Donation & Charity Management Portal
                </p>
              </div>
            </body>
            </html>
          `;
        }

        if (emailSubject && emailHtml) {
          await sendEmail({
            to: updatedContribution.donor_email,
            subject: emailSubject,
            html: emailHtml,
          });

          console.log(`[NGO Donations] Status update email sent to donor: ${updatedContribution.donor_email} (Status: ${statusUpper})`);
        }
      } catch (emailError: any) {
        console.error('[NGO Donations] Failed to send status update email:', emailError);
        // Don't fail the request if email fails
      }
    }

    return sendSuccess(res, {
      contributionId: updatedContribution.id,
      status: updatedContribution.status
    }, 'Contribution status updated successfully');
  } catch (error: any) {
    console.error('Error updating contribution status:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to update contribution status'
    });
  }
};


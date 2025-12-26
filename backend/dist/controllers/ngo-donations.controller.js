"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateContributionStatus = exports.getNgoDonationSummary = exports.getNgoDonationDetails = void 0;
const response_1 = require("../utils/response");
const mysql_1 = require("../config/mysql");
const email_service_1 = require("../utils/email.service");
/**
 * Get detailed donor contributions for an NGO
 * GET /api/ngo/donations/details
 */
const getNgoDonationDetails = async (req, res) => {
    try {
        const ngoId = parseInt(req.user.id);
        console.log(`[NGO Donations] Fetching donation details for NGO ID: ${ngoId}`);
        // Get all contributions to this NGO's donation requests
        // Use COALESCE to ensure status is never NULL - default to PENDING if NULL
        const contributions = await (0, mysql_1.query)(`
      SELECT 
        drc.id as contribution_id,
        drc.quantity_or_amount,
        drc.pickup_location,
        drc.pickup_date,
        drc.pickup_time,
        drc.notes,
        COALESCE(NULLIF(drc.status, ''), 'PENDING') as contribution_status,
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
        // Log status values from database for debugging
        contributions.forEach((cont) => {
            console.log(`[NGO Donations] 🔍 Contribution ${cont.contribution_id} status from DB: "${cont.contribution_status}" (type: ${typeof cont.contribution_status})`);
        });
        // Format the response
        const formattedContributions = contributions.map((cont) => ({
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
            status: cont.contribution_status ? cont.contribution_status.toUpperCase().trim() : 'PENDING',
            request: {
                id: cont.request_id,
                description: cont.request_description
            }
        }));
        // Log formatted contributions to verify status mapping
        formattedContributions.forEach((fc) => {
            console.log(`[NGO Donations] 📋 Formatted contribution ${fc.contributionId} - Final status: "${fc.status}"`);
        });
        // Set cache-control headers to prevent caching
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        return (0, response_1.sendSuccess)(res, formattedContributions, 'Donation details fetched successfully');
    }
    catch (error) {
        console.error('Error fetching NGO donation details:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to fetch donation details'
        });
    }
};
exports.getNgoDonationDetails = getNgoDonationDetails;
/**
 * Get aggregated donation summary for an NGO
 * GET /api/ngo/donations/summary
 */
const getNgoDonationSummary = async (req, res) => {
    var _a;
    try {
        const ngoId = parseInt(req.user.id);
        console.log(`[NGO Donations] Fetching donation summary for NGO ID: ${ngoId}`);
        // Get total distinct donors
        const totalDonorsResult = await (0, mysql_1.queryOne)(`
      SELECT COUNT(DISTINCT drc.donor_id) as count
      FROM donation_request_contributions drc
      INNER JOIN donation_requests dr ON drc.request_id = dr.id
      WHERE dr.ngo_id = ?
    `, [ngoId]);
        // Get total donations count
        const totalDonationsResult = await (0, mysql_1.queryOne)(`
      SELECT COUNT(*) as count
      FROM donation_request_contributions drc
      INNER JOIN donation_requests dr ON drc.request_id = dr.id
      WHERE dr.ngo_id = ?
    `, [ngoId]);
        // Get total funds collected (MONEY/FUNDS donations)
        const totalFundsResult = await (0, mysql_1.queryOne)(`
      SELECT COALESCE(SUM(drc.quantity_or_amount), 0) as total
      FROM donation_request_contributions drc
      INNER JOIN donation_requests dr ON drc.request_id = dr.id
      WHERE dr.ngo_id = ? AND dr.donation_type IN ('FUNDS', 'MONEY')
    `, [ngoId]);
        // Get breakdown by donation type
        const breakdownByType = await (0, mysql_1.query)(`
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
        const breakdown = {};
        breakdownByType.forEach((item) => {
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
            totalDonors: (totalDonorsResult === null || totalDonorsResult === void 0 ? void 0 : totalDonorsResult.count) || 0,
            totalDonations: (totalDonationsResult === null || totalDonationsResult === void 0 ? void 0 : totalDonationsResult.count) || 0,
            totalFundsCollected: parseFloat(((_a = totalFundsResult === null || totalFundsResult === void 0 ? void 0 : totalFundsResult.total) === null || _a === void 0 ? void 0 : _a.toString()) || '0'),
            breakdownByType: breakdown
        };
        console.log(`[NGO Donations] Summary:`, summary);
        // Set cache-control headers to prevent caching
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        return (0, response_1.sendSuccess)(res, summary, 'Donation summary fetched successfully');
    }
    catch (error) {
        console.error('Error fetching NGO donation summary:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to fetch donation summary'
        });
    }
};
exports.getNgoDonationSummary = getNgoDonationSummary;
/**
 * Update contribution status (NGO can approve/reject/complete)
 * PUT /api/ngo/dashboard/donations/:contributionId/status
 */
const updateContributionStatus = async (req, res) => {
    try {
        console.log('[updateContributionStatus] Route hit!');
        console.log('[updateContributionStatus] Params:', req.params);
        console.log('[updateContributionStatus] Body:', req.body);
        console.log('[updateContributionStatus] User:', req.user);
        const ngoId = parseInt(req.user.id);
        const contributionId = parseInt(req.params.contributionId);
        const { status } = req.body;
        console.log('[updateContributionStatus] Parsed - NGO ID:', ngoId, 'Contribution ID:', contributionId, 'Status:', status);
        if (isNaN(contributionId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid contribution ID'
            });
        }
        // Validate status - PENDING, ACCEPTED, and NOT_RECEIVED are allowed
        const validStatuses = ['PENDING', 'ACCEPTED', 'NOT_RECEIVED'];
        const statusUpper = typeof status === 'string' ? status.toUpperCase() : String(status).toUpperCase();
        if (!validStatuses.includes(statusUpper)) {
            return res.status(400).json({
                success: false,
                message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
            });
        }
        // Verify that this contribution belongs to an NGO's donation request
        const contribution = await (0, mysql_1.queryOne)(`
      SELECT drc.id, drc.status, dr.ngo_id
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
        // Once status is set to ACCEPTED or NOT_RECEIVED, it cannot be changed back to PENDING
        if (contribution.status === 'ACCEPTED' || contribution.status === 'NOT_RECEIVED') {
            if (statusUpper === 'PENDING') {
                return res.status(400).json({
                    success: false,
                    message: 'Cannot change status back to PENDING once it has been set to Received or Not Received'
                });
            }
        }
        // Update status - Use explicit column name and verify
        console.log(`[NGO Donations] 🔄 Executing UPDATE: SET status='${statusUpper}' WHERE id=${contributionId}`);
        // First check current status before update
        const beforeUpdate = await (0, mysql_1.queryOne)(`
      SELECT id, status FROM donation_request_contributions WHERE id = ?
    `, [contributionId]);
        console.log(`[NGO Donations] 📋 BEFORE UPDATE - ID: ${beforeUpdate === null || beforeUpdate === void 0 ? void 0 : beforeUpdate.id}, Current Status: "${beforeUpdate === null || beforeUpdate === void 0 ? void 0 : beforeUpdate.status}"`);
        if (!beforeUpdate) {
            console.error(`[NGO Donations] ❌ ERROR: Contribution ${contributionId} not found in database!`);
            return res.status(404).json({
                success: false,
                message: 'Contribution not found'
            });
        }
        // Execute UPDATE
        const affectedRows = await (0, mysql_1.update)('UPDATE donation_request_contributions SET status = ? WHERE id = ?', [statusUpper, contributionId]);
        console.log(`[NGO Donations] 🔄 UPDATE executed for contribution ${contributionId}`);
        console.log(`[NGO Donations] 📊 Affected rows: ${affectedRows}, Status set to: ${statusUpper}`);
        if (affectedRows === 0) {
            console.error(`[NGO Donations] ❌ ERROR: No rows affected! Contribution ${contributionId} may not exist in database.`);
            return res.status(404).json({
                success: false,
                message: 'Contribution not found or could not be updated'
            });
        }
        // Wait a tiny bit to ensure database commit
        await new Promise(resolve => setTimeout(resolve, 50));
        // Immediately verify the update with a direct SELECT - use CAST to get string value
        const verifyUpdate = await (0, mysql_1.queryOne)(`
      SELECT id, CAST(status AS CHAR) as status FROM donation_request_contributions WHERE id = ?
    `, [contributionId]);
        console.log(`[NGO Donations] 🔍 AFTER UPDATE - ID: ${verifyUpdate === null || verifyUpdate === void 0 ? void 0 : verifyUpdate.id}, Status from DB: "${verifyUpdate === null || verifyUpdate === void 0 ? void 0 : verifyUpdate.status}" (type: ${typeof (verifyUpdate === null || verifyUpdate === void 0 ? void 0 : verifyUpdate.status)})`);
        console.log(`[NGO Donations] 🔍 Full verify result:`, JSON.stringify(verifyUpdate));
        if (!verifyUpdate) {
            console.error(`[NGO Donations] ❌ ERROR: Contribution ${contributionId} not found after update!`);
            return res.status(404).json({
                success: false,
                message: 'Contribution not found after update'
            });
        }
        const dbStatus = verifyUpdate.status ? verifyUpdate.status.toString().toUpperCase().trim() : '';
        console.log(`[NGO Donations] 🔍 Comparing: Expected="${statusUpper}", Got="${dbStatus}", Match=${dbStatus === statusUpper}`);
        if (dbStatus !== statusUpper) {
            console.error(`[NGO Donations] ❌ STATUS MISMATCH! Expected: "${statusUpper}", Got from DB: "${dbStatus}"`);
            console.error(`[NGO Donations] ❌ Raw status value:`, JSON.stringify(verifyUpdate.status));
            console.error(`[NGO Donations] ❌ Status length - Expected: ${statusUpper.length}, Got: ${dbStatus.length}`);
            // Still continue to return response, but use the actual DB status
            console.log(`[NGO Donations] ⚠️ WARNING: Using DB status "${dbStatus}" instead of expected "${statusUpper}"`);
        }
        else {
            console.log(`[NGO Donations] ✅ Status verified successfully in database: ${statusUpper}`);
        }
        // Fetch updated contribution with donor and request details - USE CAST to ensure string status
        const updatedContribution = await (0, mysql_1.queryOne)(`
      SELECT 
        drc.id,
        drc.request_id,
        drc.donor_id,
        drc.quantity_or_amount,
        drc.pickup_location,
        drc.pickup_date,
        drc.pickup_time,
        drc.notes,
        CAST(drc.status AS CHAR) as status,
        drc.created_at,
        dr.donation_type,
        dr.description as request_description,
        d.name as donor_name,
        d.email as donor_email
      FROM donation_request_contributions drc
      INNER JOIN donation_requests dr ON drc.request_id = dr.id
      INNER JOIN donors d ON drc.donor_id = d.id
      WHERE drc.id = ?
    `, [contributionId]);
        console.log(`[NGO Donations] 🔍 Updated contribution query result - status: "${updatedContribution === null || updatedContribution === void 0 ? void 0 : updatedContribution.status}"`);
        console.log(`[NGO Donations] ✅ Updated contribution ${contributionId} status to ${statusUpper}`);
        // Emit socket event to notify donor about status update
        try {
            const { emitToDonor } = require('../socket/socket.server');
            // Get donor ID for the contribution
            const donorInfo = await (0, mysql_1.queryOne)(`
        SELECT donor_id FROM donation_request_contributions WHERE id = ?
      `, [contributionId]);
            if (donorInfo === null || donorInfo === void 0 ? void 0 : donorInfo.donor_id) {
                emitToDonor(donorInfo.donor_id, 'contribution:status-updated', {
                    contributionId,
                    status: statusUpper,
                    message: `Status updated to ${statusUpper}`
                });
                console.log(`[NGO Donations] 📡 Socket event emitted to donor ${donorInfo.donor_id} for contribution ${contributionId}`);
            }
        }
        catch (socketError) {
            console.error('[NGO Donations] Failed to emit socket event:', socketError);
            // Don't fail the request if socket emission fails
        }
        // Send email to donor based on status
        console.log(`[NGO Donations] 📧 Email check: donor_email = ${updatedContribution.donor_email}, status = ${statusUpper}`);
        if (updatedContribution.donor_email) {
            try {
                console.log(`[NGO Donations] 📧 Attempting to send email to ${updatedContribution.donor_email} for status ${statusUpper}`);
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
                }
                else if (statusUpper === 'NOT_RECEIVED') {
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
                    await (0, email_service_1.sendEmail)({
                        to: updatedContribution.donor_email,
                        subject: emailSubject,
                        html: emailHtml,
                    });
                    console.log(`[NGO Donations] Status update email sent to donor: ${updatedContribution.donor_email} (Status: ${statusUpper})`);
                }
            }
            catch (emailError) {
                console.error('[NGO Donations] Failed to send status update email:', emailError);
                // Don't fail the request if email fails
            }
        }
        // Use the actual verified status from database
        const finalStatus = dbStatus || statusUpper;
        console.log(`[NGO Donations] ✅ Returning updated contribution:`, {
            contributionId: contributionId,
            status: finalStatus,
            verifiedFromDB: dbStatus === statusUpper
        });
        return (0, response_1.sendSuccess)(res, {
            contributionId: contributionId,
            status: finalStatus // Use actual DB status
        }, 'Contribution status updated successfully');
    }
    catch (error) {
        console.error('Error updating contribution status:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to update contribution status'
        });
    }
};
exports.updateContributionStatus = updateContributionStatus;

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rejectNgoProfileUpdate = exports.approveNgoProfileUpdate = exports.rejectNgo = exports.approveNgo = exports.unblockDonor = exports.blockDonor = exports.unblockNgo = exports.blockNgo = exports.getDonorDetails = exports.getNgoDetails = exports.getAllDonors = exports.getAllNgos = void 0;
const response_1 = require("../utils/response");
const mysql_1 = require("../config/mysql");
const email_service_1 = require("../utils/email.service");
const email_template_service_1 = require("../utils/email-template.service");
const getAllNgos = async (req, res) => {
    try {
        const { isBlocked, search } = req.query;
        let sql = `SELECT id, ngo_id, name, email, contact_info, role, is_blocked, 
               registration_number, contact_person_name, verification_status, 
               rejection_reason, pending_profile_updates, created_at 
               FROM users WHERE role = 'NGO'`;
        const params = [];
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
        const ngos = await (0, mysql_1.query)(sql, params);
        const ngosWithStats = await Promise.all(ngos.map(async (ngo) => {
            const donationCountResult = await (0, mysql_1.queryOne)('SELECT COUNT(*) as count FROM donations WHERE ngo_id = ?', [ngo.id]);
            const donationCount = (donationCountResult === null || donationCountResult === void 0 ? void 0 : donationCountResult.count) || 0;
            const contributionCountResult = await (0, mysql_1.queryOne)(`SELECT COUNT(*) as count 
           FROM contributions c
           INNER JOIN donations d ON c.donation_id = d.id
           WHERE d.ngo_id = ?`, [ngo.id]);
            const totalContributions = (contributionCountResult === null || contributionCountResult === void 0 ? void 0 : contributionCountResult.count) || 0;
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
                    }
                    catch (e) {
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
        }));
        return (0, response_1.sendSuccess)(res, { count: ngosWithStats.length, ngos: ngosWithStats }, 'NGOs fetched successfully');
    }
    catch (error) {
        return res.status(500).json({ success: false, message: error.message || 'Failed to fetch NGOs' });
    }
};
exports.getAllNgos = getAllNgos;
const getAllDonors = async (req, res) => {
    try {
        const { isBlocked, search } = req.query;
        let sql = 'SELECT id, name, email, contact_info, phone_number, full_address, role, is_blocked, created_at FROM donors WHERE 1=1';
        const params = [];
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
        const donors = await (0, mysql_1.query)(sql, params);
        const donorsWithStats = await Promise.all(donors.map(async (donor) => {
            const contributionCountResult = await (0, mysql_1.queryOne)('SELECT COUNT(*) as count FROM contributions WHERE donor_id = ?', [donor.id]);
            const contributionCount = (contributionCountResult === null || contributionCountResult === void 0 ? void 0 : contributionCountResult.count) || 0;
            const approvedContributionsResult = await (0, mysql_1.queryOne)('SELECT COUNT(*) as count FROM contributions WHERE donor_id = ? AND status IN (?, ?)', [donor.id, 'APPROVED', 'COMPLETED']);
            const approvedContributions = (approvedContributionsResult === null || approvedContributionsResult === void 0 ? void 0 : approvedContributionsResult.count) || 0;
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
        }));
        return (0, response_1.sendSuccess)(res, { count: donorsWithStats.length, donors: donorsWithStats }, 'Donors fetched successfully');
    }
    catch (error) {
        return res.status(500).json({ success: false, message: error.message || 'Failed to fetch donors' });
    }
};
exports.getAllDonors = getAllDonors;
const getNgoDetails = async (req, res) => {
    try {
        const { id } = req.params;
        const ngoId = parseInt(id);
        if (isNaN(ngoId)) {
            return res.status(400).json({ success: false, message: 'Invalid NGO id' });
        }
        const ngo = await (0, mysql_1.queryOne)(`SELECT id, ngo_id, name, email, contact_info, contact_person_name, phone_number,
              registration_number, address, city, state, pincode, website_url, about_ngo,
              verification_status, rejection_reason, pending_profile_updates,
              role, is_blocked, created_at 
       FROM users WHERE id = ?`, [ngoId]);
        if (!ngo) {
            return res.status(404).json({ success: false, message: 'NGO not found' });
        }
        const donations = await (0, mysql_1.query)('SELECT * FROM donations WHERE ngo_id = ? ORDER BY created_at DESC', [ngoId]);
        const totalContributionsResult = await (0, mysql_1.queryOne)(`SELECT COUNT(*) as count 
       FROM contributions c
       INNER JOIN donations d ON c.donation_id = d.id
       WHERE d.ngo_id = ?`, [ngoId]);
        const totalContributions = (totalContributionsResult === null || totalContributionsResult === void 0 ? void 0 : totalContributionsResult.count) || 0;
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
                }
                catch (e) {
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
        return (0, response_1.sendSuccess)(res, ngoDetails, 'NGO details fetched successfully');
    }
    catch (error) {
        return res.status(500).json({ success: false, message: error.message || 'Failed to fetch NGO details' });
    }
};
exports.getNgoDetails = getNgoDetails;
const getDonorDetails = async (req, res) => {
    try {
        const { id } = req.params;
        const donorId = parseInt(id);
        if (isNaN(donorId)) {
            return res.status(400).json({ success: false, message: 'Invalid donor id' });
        }
        const donor = await (0, mysql_1.queryOne)('SELECT id, name, email, contact_info, phone_number, full_address, role, is_blocked, created_at FROM donors WHERE id = ?', [donorId]);
        if (!donor) {
            return res.status(404).json({ success: false, message: 'Donor not found' });
        }
        const contributions = await (0, mysql_1.query)(`SELECT c.*, 
        d.donation_category, d.purpose, d.quantity_or_amount, d.status as donation_status,
        u.name as ngo_name, u.email as ngo_email
       FROM contributions c
       INNER JOIN donations d ON c.donation_id = d.id
       INNER JOIN users u ON d.ngo_id = u.id
       WHERE c.donor_id = ?
       ORDER BY c.created_at DESC`, [donorId]);
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
        return (0, response_1.sendSuccess)(res, donorDetails, 'Donor details fetched successfully');
    }
    catch (error) {
        return res.status(500).json({ success: false, message: error.message || 'Failed to fetch donor details' });
    }
};
exports.getDonorDetails = getDonorDetails;
const blockNgo = async (req, res) => {
    try {
        const { id } = req.params;
        const { blockReason } = req.body;
        const adminId = req.user.id;
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
        const ngo = await (0, mysql_1.queryOne)('SELECT id, name, email, contact_info, role, is_blocked FROM users WHERE id = ? AND role = ?', [ngoId, 'NGO']);
        if (!ngo) {
            return res.status(404).json({ success: false, message: 'NGO not found' });
        }
        if (ngo.is_blocked === 1) {
            return res.status(400).json({ success: false, message: 'NGO is already blocked' });
        }
        const affectedRows = await (0, mysql_1.update)('UPDATE users SET is_blocked = 1 WHERE id = ?', [ngoId]);
        if (affectedRows === 0) {
            return res.status(500).json({ success: false, message: 'Failed to block NGO' });
        }
        const blockDate = new Date();
        try {
            await (0, mysql_1.update)(`INSERT INTO ngo_block_history (ngo_id, block_reason, blocked_by, blocked_at, email_template_version) 
         VALUES (?, ?, ?, ?, 'current')`, [ngoId, blockReason.trim(), adminId, blockDate]);
        }
        catch (historyError) {
            console.warn('Could not save block history:', historyError.message);
        }
        try {
            console.log(`[Block NGO] Fetching email template for NGO: ${ngo.name} (${ngo.email})`);
            const template = await (0, email_template_service_1.getEmailTemplate)('NGO_BLOCK');
            console.log(`[Block NGO] Template fetched. Subject: ${template.subject.substring(0, 50)}...`);
            const supportEmail = (0, email_template_service_1.getSupportEmail)();
            const blockDateStr = blockDate.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
            });
            const emailSubject = (0, email_template_service_1.replaceTemplatePlaceholders)(template.subject, {
                NGO_NAME: ngo.name,
            });
            const emailBody = (0, email_template_service_1.replaceTemplatePlaceholders)(template.bodyHtml, {
                NGO_NAME: ngo.name,
                BLOCK_DATE: blockDateStr,
                SUPPORT_EMAIL: supportEmail,
                BLOCK_REASON: blockReason.trim(),
            });
            console.log(`[Block NGO] Sending email to: ${ngo.email}`);
            await (0, email_service_1.sendEmail)({
                to: ngo.email,
                subject: emailSubject,
                html: emailBody,
            });
            console.log(`✅ Block email sent successfully to ${ngo.email}`);
        }
        catch (emailError) {
            console.error('❌ Failed to send block email:', emailError);
            console.error('Error details:', {
                message: emailError.message,
                stack: emailError.stack,
                ngoEmail: ngo.email,
                ngoName: ngo.name,
            });
        }
        const updatedNgo = await (0, mysql_1.queryOne)('SELECT id, name, email, contact_info, role, is_blocked, created_at FROM users WHERE id = ?', [ngoId]);
        return (0, response_1.sendSuccess)(res, {
            id: updatedNgo.id,
            name: updatedNgo.name,
            email: updatedNgo.email,
            contactInfo: updatedNgo.contact_info,
            role: updatedNgo.role,
            isBlocked: true,
            createdAt: updatedNgo.created_at,
        }, 'NGO blocked successfully. Notification email sent.');
    }
    catch (error) {
        console.error('Error blocking NGO:', error);
        return res.status(500).json({ success: false, message: error.message || 'Failed to block NGO' });
    }
};
exports.blockNgo = blockNgo;
const unblockNgo = async (req, res) => {
    try {
        const { id } = req.params;
        const { unblockReason } = req.body;
        const adminId = req.user.id;
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
        const ngo = await (0, mysql_1.queryOne)('SELECT id, name, email, contact_info, role, is_blocked FROM users WHERE id = ? AND role = ?', [ngoId, 'NGO']);
        if (!ngo) {
            return res.status(404).json({ success: false, message: 'NGO not found' });
        }
        if (ngo.is_blocked === 0) {
            return res.status(400).json({ success: false, message: 'NGO is already unblocked' });
        }
        const affectedRows = await (0, mysql_1.update)('UPDATE users SET is_blocked = 0 WHERE id = ?', [ngoId]);
        if (affectedRows === 0) {
            return res.status(500).json({ success: false, message: 'Failed to unblock NGO' });
        }
        const unblockDate = new Date();
        try {
            await (0, mysql_1.update)(`INSERT INTO ngo_unblock_history (ngo_id, unblock_reason, unblocked_by, unblocked_at, email_template_version) 
         VALUES (?, ?, ?, ?, 'current')`, [ngoId, unblockReason.trim(), adminId, unblockDate]);
        }
        catch (historyError) {
            console.warn('Could not save unblock history:', historyError.message);
        }
        try {
            console.log(`[Unblock NGO] Fetching email template for NGO: ${ngo.name} (${ngo.email})`);
            const template = await (0, email_template_service_1.getEmailTemplate)('NGO_UNBLOCK');
            console.log(`[Unblock NGO] Template fetched. Subject: ${template.subject.substring(0, 50)}...`);
            const supportEmail = (0, email_template_service_1.getSupportEmail)();
            const unblockDateStr = unblockDate.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
            });
            const emailSubject = (0, email_template_service_1.replaceTemplatePlaceholders)(template.subject, {
                NGO_NAME: ngo.name,
            });
            const emailBody = (0, email_template_service_1.replaceTemplatePlaceholders)(template.bodyHtml, {
                NGO_NAME: ngo.name,
                UNBLOCK_DATE: unblockDateStr,
                SUPPORT_EMAIL: supportEmail,
                UNBLOCK_REASON: unblockReason.trim(),
            });
            console.log(`[Unblock NGO] Sending email to: ${ngo.email}`);
            await (0, email_service_1.sendEmail)({
                to: ngo.email,
                subject: emailSubject,
                html: emailBody,
            });
            console.log(`✅ Unblock email sent successfully to ${ngo.email}`);
        }
        catch (emailError) {
            console.error('❌ Failed to send unblock email:', emailError);
            console.error('Error details:', {
                message: emailError.message,
                stack: emailError.stack,
                ngoEmail: ngo.email,
                ngoName: ngo.name,
            });
        }
        const updatedNgo = await (0, mysql_1.queryOne)('SELECT id, name, email, contact_info, role, is_blocked, created_at FROM users WHERE id = ?', [ngoId]);
        return (0, response_1.sendSuccess)(res, {
            id: updatedNgo.id,
            name: updatedNgo.name,
            email: updatedNgo.email,
            contactInfo: updatedNgo.contact_info,
            role: updatedNgo.role,
            isBlocked: false,
            createdAt: updatedNgo.created_at,
        }, 'NGO unblocked successfully. Notification email sent.');
    }
    catch (error) {
        console.error('Error unblocking NGO:', error);
        return res.status(500).json({ success: false, message: error.message || 'Failed to unblock NGO' });
    }
};
exports.unblockNgo = unblockNgo;
const blockDonor = async (req, res) => {
    try {
        const { id } = req.params;
        const donorId = parseInt(id);
        if (isNaN(donorId)) {
            return res.status(400).json({ success: false, message: 'Invalid donor id' });
        }
        const affectedRows = await (0, mysql_1.update)('UPDATE donors SET is_blocked = 1 WHERE id = ?', [donorId]);
        if (affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Donor not found' });
        }
        const donor = await (0, mysql_1.queryOne)('SELECT id, name, email, contact_info, phone_number, full_address, role, is_blocked, created_at FROM donors WHERE id = ?', [donorId]);
        return (0, response_1.sendSuccess)(res, {
            id: donor.id,
            name: donor.name,
            email: donor.email,
            contactInfo: donor.contact_info,
            phoneNumber: donor.phone_number,
            fullAddress: donor.full_address,
            role: donor.role,
            isBlocked: true,
            createdAt: donor.created_at,
        }, 'Donor blocked successfully');
    }
    catch (error) {
        return res.status(500).json({ success: false, message: error.message || 'Failed to block donor' });
    }
};
exports.blockDonor = blockDonor;
const unblockDonor = async (req, res) => {
    try {
        const { id } = req.params;
        const donorId = parseInt(id);
        if (isNaN(donorId)) {
            return res.status(400).json({ success: false, message: 'Invalid donor id' });
        }
        const affectedRows = await (0, mysql_1.update)('UPDATE donors SET is_blocked = 0 WHERE id = ?', [donorId]);
        if (affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Donor not found' });
        }
        const donor = await (0, mysql_1.queryOne)('SELECT id, name, email, contact_info, phone_number, full_address, role, is_blocked, created_at FROM donors WHERE id = ?', [donorId]);
        return (0, response_1.sendSuccess)(res, {
            id: donor.id,
            name: donor.name,
            email: donor.email,
            contactInfo: donor.contact_info,
            phoneNumber: donor.phone_number,
            fullAddress: donor.full_address,
            role: donor.role,
            isBlocked: false,
            createdAt: donor.created_at,
        }, 'Donor unblocked successfully');
    }
    catch (error) {
        return res.status(500).json({ success: false, message: error.message || 'Failed to unblock donor' });
    }
};
exports.unblockDonor = unblockDonor;
const approveNgo = async (req, res) => {
    try {
        const { id } = req.params;
        const ngoId = parseInt(id);
        if (isNaN(ngoId)) {
            return res.status(400).json({ success: false, message: 'Invalid NGO id' });
        }
        const ngo = await (0, mysql_1.queryOne)(`SELECT id, ngo_id, name, email, verification_status 
       FROM users 
       WHERE id = ? AND role = 'NGO'`, [ngoId]);
        if (!ngo) {
            return res.status(404).json({ success: false, message: 'NGO not found' });
        }
        if (ngo.verification_status === 'VERIFIED') {
            return res.status(400).json({ success: false, message: 'NGO is already verified' });
        }
        const affectedRows = await (0, mysql_1.update)(`UPDATE users 
       SET verification_status = 'VERIFIED', verified = TRUE, rejection_reason = NULL 
       WHERE id = ? AND role = 'NGO'`, [ngoId]);
        if (affectedRows === 0) {
            return res.status(500).json({ success: false, message: 'Failed to approve NGO' });
        }
        try {
            await (0, email_service_1.sendNgoVerificationApprovalEmail)(ngo.email, ngo.name, ngo.ngo_id || `NGO-${ngo.id}`);
            console.log(`✅ Verification approval email sent to ${ngo.email}`);
        }
        catch (emailError) {
            console.error('Failed to send approval email:', emailError);
        }
        const updatedNgo = await (0, mysql_1.queryOne)(`SELECT id, ngo_id, name, email, contact_info, contact_person_name, 
              registration_number, verification_status, created_at 
       FROM users 
       WHERE id = ?`, [ngoId]);
        return (0, response_1.sendSuccess)(res, {
            id: updatedNgo.id,
            ngo_id: updatedNgo.ngo_id,
            name: updatedNgo.name,
            email: updatedNgo.email,
            contactInfo: updatedNgo.contact_info,
            contactPersonName: updatedNgo.contact_person_name,
            registrationNumber: updatedNgo.registration_number,
            verificationStatus: 'VERIFIED',
            createdAt: updatedNgo.created_at,
        }, 'NGO approved successfully. Verification email sent.');
    }
    catch (error) {
        console.error('Error approving NGO:', error);
        return res.status(500).json({ success: false, message: error.message || 'Failed to approve NGO' });
    }
};
exports.approveNgo = approveNgo;
const rejectNgo = async (req, res) => {
    try {
        const { id } = req.params;
        const { rejectionReason } = req.body;
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
        const ngo = await (0, mysql_1.queryOne)(`SELECT id, ngo_id, name, email, verification_status 
       FROM users 
       WHERE id = ? AND role = 'NGO'`, [ngoId]);
        if (!ngo) {
            return res.status(404).json({ success: false, message: 'NGO not found' });
        }
        if (ngo.verification_status === 'REJECTED') {
            return res.status(400).json({ success: false, message: 'NGO is already rejected' });
        }
        const affectedRows = await (0, mysql_1.update)(`UPDATE users 
       SET verification_status = 'REJECTED', verified = FALSE, rejection_reason = ? 
       WHERE id = ? AND role = 'NGO'`, [rejectionReason.trim(), ngoId]);
        if (affectedRows === 0) {
            return res.status(500).json({ success: false, message: 'Failed to reject NGO' });
        }
        try {
            await (0, email_service_1.sendNgoVerificationRejectionEmail)(ngo.email, ngo.name, rejectionReason.trim());
            console.log(`✅ Verification rejection email sent to ${ngo.email}`);
        }
        catch (emailError) {
            console.error('Failed to send rejection email:', emailError);
        }
        const updatedNgo = await (0, mysql_1.queryOne)(`SELECT id, ngo_id, name, email, contact_info, contact_person_name, 
              registration_number, verification_status, rejection_reason, created_at 
       FROM users 
       WHERE id = ?`, [ngoId]);
        return (0, response_1.sendSuccess)(res, {
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
        }, 'NGO rejected. Rejection email sent.');
    }
    catch (error) {
        console.error('Error rejecting NGO:', error);
        return res.status(500).json({ success: false, message: error.message || 'Failed to reject NGO' });
    }
};
exports.rejectNgo = rejectNgo;
const approveNgoProfileUpdate = async (req, res) => {
    try {
        const { id } = req.params;
        const ngoId = parseInt(id);
        if (isNaN(ngoId)) {
            return res.status(400).json({ success: false, message: 'Invalid NGO id' });
        }
        const ngo = await (0, mysql_1.queryOne)('SELECT id, ngo_id, name, email, pending_profile_updates FROM users WHERE id = ?', [ngoId]);
        if (!ngo) {
            return res.status(404).json({ success: false, message: 'NGO not found' });
        }
        if (!ngo.pending_profile_updates) {
            return res.status(400).json({ success: false, message: 'No pending profile updates found' });
        }
        const pendingUpdates = JSON.parse(ngo.pending_profile_updates);
        const updates = [];
        const params = [];
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
        await (0, mysql_1.update)(sql, params);
        const updatedNgo = await (0, mysql_1.queryOne)('SELECT id, ngo_id, name, email, contact_person_name, phone_number, address, city, state, pincode, website_url, about_ngo FROM users WHERE id = ?', [ngoId]);
        return (0, response_1.sendSuccess)(res, {
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
    }
    catch (error) {
        console.error('Error approving profile update:', error);
        return res.status(500).json({ success: false, message: error.message || 'Failed to approve profile update' });
    }
};
exports.approveNgoProfileUpdate = approveNgoProfileUpdate;
const rejectNgoProfileUpdate = async (req, res) => {
    try {
        const { id } = req.params;
        const ngoId = parseInt(id);
        if (isNaN(ngoId)) {
            return res.status(400).json({ success: false, message: 'Invalid NGO id' });
        }
        await (0, mysql_1.update)('UPDATE users SET pending_profile_updates = NULL WHERE id = ?', [ngoId]);
        return (0, response_1.sendSuccess)(res, { id: ngoId }, 'Profile update rejected successfully');
    }
    catch (error) {
        console.error('Error rejecting profile update:', error);
        return res.status(500).json({ success: false, message: error.message || 'Failed to reject profile update' });
    }
};
exports.rejectNgoProfileUpdate = rejectNgoProfileUpdate;

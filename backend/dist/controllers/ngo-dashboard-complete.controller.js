"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNgoDashboardDonations = exports.updateNgoProfile = exports.getNgoProfile = exports.getNgoDashboard = void 0;
const response_1 = require("../utils/response");
const mysql_1 = require("../config/mysql");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const SALT_ROUNDS = 10;
/**
 * Get NGO dashboard overview
 * GET /api/ngo/dashboard
 */
const getNgoDashboard = async (req, res) => {
    try {
        const ngoId = typeof req.user.id === 'string' ? parseInt(req.user.id) : req.user.id;
        // Get NGO profile (updated_at may not exist in older databases)
        const ngo = await (0, mysql_1.queryOne)(`
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
        // Log all registration data for debugging
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
        // Get statistics using SQL queries
        const [totalDonations, pendingDonations, confirmedDonations, completedDonations, urgentDonations, totalContributionsResult, totalAmountResult,] = await Promise.all([
            (0, mysql_1.queryOne)('SELECT COUNT(*) as count FROM donations WHERE ngo_id = ?', [ngoId]),
            (0, mysql_1.queryOne)('SELECT COUNT(*) as count FROM donations WHERE ngo_id = ? AND status = ?', [ngoId, 'PENDING']),
            (0, mysql_1.queryOne)('SELECT COUNT(*) as count FROM donations WHERE ngo_id = ? AND status = ?', [ngoId, 'CONFIRMED']),
            (0, mysql_1.queryOne)('SELECT COUNT(*) as count FROM donations WHERE ngo_id = ? AND status = ?', [ngoId, 'COMPLETED']),
            (0, mysql_1.queryOne)('SELECT COUNT(*) as count FROM donations WHERE ngo_id = ? AND priority = ? AND status != ?', [ngoId, 'URGENT', 'COMPLETED']),
            (0, mysql_1.queryOne)(`
        SELECT COUNT(*) as count 
        FROM contributions c
        INNER JOIN donations d ON c.donation_id = d.id
        WHERE d.ngo_id = ?
      `, [ngoId]),
            (0, mysql_1.queryOne)(`
        SELECT COALESCE(SUM(quantity_or_amount), 0) as total 
        FROM donations 
        WHERE ngo_id = ? AND status = ?
      `, [ngoId, 'COMPLETED']),
        ]);
        // Get recent donations
        const recentDonations = await (0, mysql_1.query)(`
      SELECT d.*, 
        (SELECT COUNT(*) FROM donation_images di WHERE di.donation_id = d.id) as image_count
      FROM donations d
      WHERE d.ngo_id = ?
      ORDER BY d.created_at DESC
      LIMIT 5
    `, [ngoId]);
        // Get upcoming pickups
        const upcomingPickups = await (0, mysql_1.query)(`
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
                    total: (totalDonations === null || totalDonations === void 0 ? void 0 : totalDonations.count) || 0,
                    pending: (pendingDonations === null || pendingDonations === void 0 ? void 0 : pendingDonations.count) || 0,
                    confirmed: (confirmedDonations === null || confirmedDonations === void 0 ? void 0 : confirmedDonations.count) || 0,
                    completed: (completedDonations === null || completedDonations === void 0 ? void 0 : completedDonations.count) || 0,
                    urgent: (urgentDonations === null || urgentDonations === void 0 ? void 0 : urgentDonations.count) || 0,
                },
                contributions: {
                    total: (totalContributionsResult === null || totalContributionsResult === void 0 ? void 0 : totalContributionsResult.count) || 0,
                },
                totalAmountReceived: (totalAmountResult === null || totalAmountResult === void 0 ? void 0 : totalAmountResult.total) || 0,
            },
            recentDonations: recentDonations || [],
            upcomingPickups: upcomingPickups || [],
            // Frontend expects these fields
            totalDonations: (totalDonations === null || totalDonations === void 0 ? void 0 : totalDonations.count) || 0,
            pendingDonations: (pendingDonations === null || pendingDonations === void 0 ? void 0 : pendingDonations.count) || 0,
            confirmedDonations: (confirmedDonations === null || confirmedDonations === void 0 ? void 0 : confirmedDonations.count) || 0,
            completedDonations: (completedDonations === null || completedDonations === void 0 ? void 0 : completedDonations.count) || 0,
        };
        return (0, response_1.sendSuccess)(res, dashboard, 'NGO dashboard fetched successfully');
    }
    catch (error) {
        console.error('NGO Dashboard Error:', error);
        return res.status(500).json({ success: false, message: error.message || 'Failed to fetch dashboard' });
    }
};
exports.getNgoDashboard = getNgoDashboard;
/**
 * Get NGO profile
 * GET /api/ngo/dashboard/profile
 */
const getNgoProfile = async (req, res) => {
    try {
        const ngoId = typeof req.user.id === 'string' ? parseInt(req.user.id) : req.user.id;
        const ngo = await (0, mysql_1.queryOne)(`
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
        return (0, response_1.sendSuccess)(res, {
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
    }
    catch (error) {
        return res.status(500).json({ success: false, message: error.message || 'Failed to fetch profile' });
    }
};
exports.getNgoProfile = getNgoProfile;
/**
 * Update NGO profile
 * PUT /api/ngo/dashboard/profile
 */
const updateNgoProfile = async (req, res) => {
    try {
        const ngoId = typeof req.user.id === 'string' ? parseInt(req.user.id) : req.user.id;
        // Check if NGO is verified - only verified NGOs can update profile
        const ngoCheck = await (0, mysql_1.queryOne)('SELECT verified, verification_status FROM users WHERE id = ?', [ngoId]);
        if (!ngoCheck) {
            return res.status(404).json({ success: false, message: 'NGO not found' });
        }
        // Handle both boolean and number (0/1) from MySQL
        const verifiedValue = ngoCheck.verified;
        const isVerified = verifiedValue === true || verifiedValue === 1 || (verifiedValue !== null && verifiedValue !== false && verifiedValue !== 0);
        const isStatusVerified = ngoCheck.verification_status === 'VERIFIED';
        if (!isVerified || !isStatusVerified) {
            return res.status(403).json({
                success: false,
                message: 'Your NGO profile must be verified by admin before you can update it.'
            });
        }
        const { name, contactInfo, contactPersonName, phoneNumber, aboutNgo, websiteUrl, logoUrl, password, address, city, state, pincode, saveAsPending // Flag to save as pending for admin approval
         } = req.body;
        console.log(`[Update NGO Profile] NGO ID: ${ngoId}, Update payload:`, req.body);
        // If saveAsPending is true, save updates to pending_profile_updates JSON field
        if (saveAsPending === true) {
            const pendingUpdates = {};
            if (name !== undefined && name !== null)
                pendingUpdates.name = name.trim();
            if (contactPersonName !== undefined)
                pendingUpdates.contactPersonName = (contactPersonName === null || contactPersonName === void 0 ? void 0 : contactPersonName.trim()) || null;
            if (phoneNumber !== undefined)
                pendingUpdates.phoneNumber = (phoneNumber === null || phoneNumber === void 0 ? void 0 : phoneNumber.trim()) || null;
            if (address !== undefined)
                pendingUpdates.address = (address === null || address === void 0 ? void 0 : address.trim()) || null;
            if (city !== undefined)
                pendingUpdates.city = (city === null || city === void 0 ? void 0 : city.trim()) || null;
            if (state !== undefined)
                pendingUpdates.state = (state === null || state === void 0 ? void 0 : state.trim()) || null;
            if (pincode !== undefined)
                pendingUpdates.pincode = (pincode === null || pincode === void 0 ? void 0 : pincode.trim()) || null;
            if (websiteUrl !== undefined)
                pendingUpdates.websiteUrl = (websiteUrl === null || websiteUrl === void 0 ? void 0 : websiteUrl.trim()) || null;
            if (aboutNgo !== undefined)
                pendingUpdates.aboutNgo = (aboutNgo === null || aboutNgo === void 0 ? void 0 : aboutNgo.trim()) || null;
            if (Object.keys(pendingUpdates).length === 0) {
                return res.status(400).json({ success: false, message: 'No fields to update' });
            }
            // Save pending updates as JSON
            const pendingJson = JSON.stringify(pendingUpdates);
            await (0, mysql_1.update)('UPDATE users SET pending_profile_updates = ? WHERE id = ?', [pendingJson, ngoId]);
            console.log(`[Update NGO Profile] ✅ Saved pending updates for NGO ID: ${ngoId}`);
            return (0, response_1.sendSuccess)(res, {
                message: 'Profile update submitted successfully. Waiting for admin approval.',
                pendingUpdates: pendingUpdates
            }, 'Profile update submitted for admin approval');
        }
        // Otherwise, update directly (existing behavior)
        const updates = [];
        const params = [];
        // Basic fields (if admin allows) - only if verified
        if (name !== undefined && name !== null) {
            updates.push('name = ?');
            params.push(name.trim());
        }
        if (contactInfo !== undefined && contactInfo !== null) {
            updates.push('contact_info = ?');
            params.push(contactInfo.trim());
        }
        // Profile fields (always editable by verified NGO)
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
            const hashed = await bcryptjs_1.default.hash(password, SALT_ROUNDS);
            updates.push('password = ?');
            params.push(hashed);
        }
        if (updates.length === 0) {
            return res.status(400).json({ success: false, message: 'No fields to update' });
        }
        params.push(ngoId);
        const sql = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;
        console.log(`[Update NGO Profile] Executing SQL: ${sql} with params:`, params);
        const affectedRows = await (0, mysql_1.update)(sql, params);
        console.log(`[Update NGO Profile] ✅ Updated ${affectedRows} row(s)`);
        // Return updated profile with all fields (same structure as getNgoDashboard)
        const updated = await (0, mysql_1.queryOne)(`
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
        return (0, response_1.sendSuccess)(res, {
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
    }
    catch (error) {
        return res.status(500).json({ success: false, message: error.message || 'Failed to update profile' });
    }
};
exports.updateNgoProfile = updateNgoProfile;
/**
 * Get all donations with filters
 * GET /api/ngo/dashboard/donations
 */
const getNgoDashboardDonations = async (req, res) => {
    try {
        const ngoId = typeof req.user.id === 'string' ? parseInt(req.user.id) : req.user.id;
        const { status, priority, donationCategory, limit = 20, page = 1 } = req.query;
        let sql = `
      SELECT d.*,
        (SELECT COUNT(*) FROM donation_images di WHERE di.donation_id = d.id) as image_count,
        (SELECT COUNT(*) FROM contributions c WHERE c.donation_id = d.id) as contribution_count,
        (SELECT COUNT(*) FROM contributions c WHERE c.donation_id = d.id AND c.status IN ('APPROVED', 'COMPLETED')) as approved_contributions
      FROM donations d
      WHERE d.ngo_id = ?
    `;
        const params = [ngoId];
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
        const donations = await (0, mysql_1.query)(sql, params);
        // Get total count
        let countSql = 'SELECT COUNT(*) as total FROM donations WHERE ngo_id = ?';
        const countParams = [ngoId];
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
        const totalResult = await (0, mysql_1.queryOne)(countSql, countParams);
        const total = (totalResult === null || totalResult === void 0 ? void 0 : totalResult.total) || 0;
        return (0, response_1.sendSuccess)(res, {
            donations: donations || [],
            pagination: {
                total,
                page: Number(page),
                limit: Number(limit),
                totalPages: Math.ceil(total / Number(limit)),
            },
        }, 'Donations fetched successfully');
    }
    catch (error) {
        return res.status(500).json({ success: false, message: error.message || 'Failed to fetch donations' });
    }
};
exports.getNgoDashboardDonations = getNgoDashboardDonations;

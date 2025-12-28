"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserProfile = void 0;
const response_1 = require("../utils/response");
const mysql_1 = require("../config/mysql");
const getUserProfile = async (req, res) => {
    try {
        const userId = parseInt(req.user.id);
        const userRole = req.user.role;
        if (!userId || !userRole) {
            return res.status(400).json({ success: false, message: 'Invalid user information' });
        }
        let profile = null;
        if (userRole === 'DONOR') {
            profile = await (0, mysql_1.queryOne)(`SELECT id, name, email, contact_info, phone_number, full_address, role, created_at 
         FROM donors WHERE id = ?`, [userId]);
            if (!profile) {
                return res.status(404).json({ success: false, message: 'Donor profile not found' });
            }
            return (0, response_1.sendSuccess)(res, {
                id: profile.id,
                name: profile.name,
                email: profile.email,
                contactInfo: profile.contact_info,
                phoneNumber: profile.phone_number,
                fullAddress: profile.full_address,
                role: profile.role,
                createdAt: profile.created_at,
            }, 'User profile fetched successfully');
        }
        else if (userRole === 'NGO') {
            profile = await (0, mysql_1.queryOne)(`SELECT id, ngo_id, name, email, contact_info, contact_person_name, phone_number, 
                about_ngo, website_url, logo_url, registration_number, address, 
                city, state, pincode, verification_status, rejection_reason,
                verified, admin_approval_for_edit, address_locked, role, created_at
         FROM users WHERE id = ?`, [userId]);
            if (!profile) {
                return res.status(404).json({ success: false, message: 'NGO profile not found' });
            }
            return (0, response_1.sendSuccess)(res, {
                id: profile.id,
                ngo_id: profile.ngo_id,
                name: profile.name,
                email: profile.email,
                contactInfo: profile.contact_info,
                contactPersonName: profile.contact_person_name,
                phoneNumber: profile.phone_number,
                aboutNgo: profile.about_ngo,
                websiteUrl: profile.website_url,
                logoUrl: profile.logo_url,
                registrationNumber: profile.registration_number,
                address: profile.address,
                city: profile.city,
                state: profile.state,
                pincode: profile.pincode,
                verificationStatus: profile.verification_status,
                rejectionReason: profile.rejection_reason,
                verified: profile.verified,
                adminApprovalForEdit: profile.admin_approval_for_edit,
                addressLocked: profile.address_locked,
                role: profile.role,
                createdAt: profile.created_at,
            }, 'User profile fetched successfully');
        }
        else {
            return res.status(400).json({ success: false, message: 'Invalid user role' });
        }
    }
    catch (error) {
        console.error('Error fetching user profile:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to fetch user profile',
        });
    }
};
exports.getUserProfile = getUserProfile;

"use strict";
/**
 * Unified authentication helper
 * Checks Donor, Admin, and User (NGO) collections
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailExists = exports.findUserWithPasswordByEmail = exports.findUserByEmail = exports.findUserById = void 0;
const Donor_model_1 = require("../models/Donor.model");
const Admin_model_1 = require("../models/Admin.model");
const User_model_1 = require("../models/User.model");
/**
 * Find user by ID across all collections (Donor, Admin, User/NGO)
 * Checks blocked status for Donors and NGOs
 */
const findUserById = async (userId) => {
    // Try Donor collection
    const donor = await Donor_model_1.DonorModel.findById(userId);
    if (donor) {
        // Check if donor is blocked
        if (donor.isBlocked) {
            return null; // Blocked users cannot authenticate
        }
        return {
            id: donor.id,
            role: 'DONOR',
            email: donor.email,
            name: donor.name,
        };
    }
    // Try Admin collection
    const admin = await Admin_model_1.AdminModel.findById(userId);
    if (admin) {
        return {
            id: admin.id,
            role: 'ADMIN',
            email: admin.email,
            name: admin.name,
        };
    }
    // Try User/NGO collection
    const user = await User_model_1.UserModel.findById(userId);
    if (user) {
        // Check if NGO is blocked
        if (user.isBlocked) {
            return null; // Blocked users cannot authenticate
        }
        return {
            id: user.id,
            role: 'NGO',
            email: user.email,
            name: user.name,
        };
    }
    return null;
};
exports.findUserById = findUserById;
/**
 * Find user by email across all collections
 * Checks blocked status for Donors and NGOs
 */
const findUserByEmail = async (email) => {
    // Try Donor collection
    const donor = await Donor_model_1.DonorModel.findOne({ email: email.toLowerCase() });
    if (donor) {
        // Check if donor is blocked
        if (donor.isBlocked) {
            return null; // Blocked users cannot authenticate
        }
        return {
            id: donor.id,
            role: 'DONOR',
            email: donor.email,
            name: donor.name,
        };
    }
    // Try Admin collection
    const admin = await Admin_model_1.AdminModel.findOne({ email: email.toLowerCase() });
    if (admin) {
        return {
            id: admin.id,
            role: 'ADMIN',
            email: admin.email,
            name: admin.name,
        };
    }
    // Try User/NGO collection
    const user = await User_model_1.UserModel.findOne({ email: email.toLowerCase() });
    if (user) {
        // Check if NGO is blocked
        if (user.isBlocked) {
            return null; // Blocked users cannot authenticate
        }
        return {
            id: user.id,
            role: 'NGO',
            email: user.email,
            name: user.name,
        };
    }
    return null;
};
exports.findUserByEmail = findUserByEmail;
const findUserWithPasswordByEmail = async (email) => {
    // Try Donor collection
    const donor = await Donor_model_1.DonorModel.findOne({ email: email.toLowerCase() });
    if (donor) {
        // Check if donor is blocked
        if (donor.isBlocked) {
            return null; // Blocked users cannot login
        }
        return {
            id: donor.id,
            role: 'DONOR',
            email: donor.email,
            password: donor.password,
            name: donor.name,
        };
    }
    // Try Admin collection
    const admin = await Admin_model_1.AdminModel.findOne({ email: email.toLowerCase() });
    if (admin) {
        return {
            id: admin.id,
            role: 'ADMIN',
            email: admin.email,
            password: admin.password,
            name: admin.name,
        };
    }
    // Try User/NGO collection
    const user = await User_model_1.UserModel.findOne({ email: email.toLowerCase() });
    if (user) {
        // Check if NGO is blocked
        if (user.isBlocked) {
            return null; // Blocked users cannot login
        }
        return {
            id: user.id,
            role: 'NGO',
            email: user.email,
            password: user.password,
            name: user.name,
        };
    }
    return null;
};
exports.findUserWithPasswordByEmail = findUserWithPasswordByEmail;
/**
 * Check if email exists in any collection
 */
const emailExists = async (email) => {
    const donor = await Donor_model_1.DonorModel.findOne({ email: email.toLowerCase() });
    if (donor)
        return true;
    const admin = await Admin_model_1.AdminModel.findOne({ email: email.toLowerCase() });
    if (admin)
        return true;
    const user = await User_model_1.UserModel.findOne({ email: email.toLowerCase() });
    if (user)
        return true;
    return false;
};
exports.emailExists = emailExists;

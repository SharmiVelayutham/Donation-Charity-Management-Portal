"use strict";
/**
 * MySQL-based authentication helper
 * Replaces MongoDB auth-helper for MySQL database
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailExists = exports.findUserWithPasswordByEmail = exports.findUserByEmail = exports.findUserById = void 0;
const mysql_1 = require("../config/mysql");
/**
 * Find user by ID across all tables (donors, users/NGOs, admins)
 * @param userId - User ID to lookup
 * @param tokenRole - Role from JWT token (optional, used to prioritize table lookup)
 */
const findUserById = async (userId, tokenRole) => {
    const id = typeof userId === 'string' ? parseInt(userId) : userId;
    const normalizedTokenRole = tokenRole ? tokenRole.toUpperCase() : '';
    // If token role is provided, check that table first
    if (normalizedTokenRole === 'NGO') {
        // Try User/NGO table first
        const user = await (0, mysql_1.queryOne)('SELECT id, name, email, role, is_blocked FROM users WHERE id = ?', [id]);
        if (user) {
            if (user.is_blocked) {
                console.log(`[findUserById] User ID ${id} is blocked.`);
                return null; // Blocked users cannot authenticate
            }
            // All users in users table are NGOs - ensure role is always 'NGO'
            const dbRole = user.role || 'NGO';
            const normalizedRole = (dbRole.toString().toUpperCase() === 'NGO') ? 'NGO' : 'NGO';
            console.log(`[findUserById] Found user ID ${id} in 'users' table (token role: NGO) - DB Role: "${dbRole}" (type: ${typeof dbRole}), Normalized Role: "${normalizedRole}"`);
            return {
                id: user.id,
                role: normalizedRole, // Always 'NGO' for users table
                email: user.email,
                name: user.name,
                isBlocked: user.is_blocked || false,
            };
        }
    }
    else if (normalizedTokenRole === 'ADMIN') {
        // Try Admin table first
        const admin = await (0, mysql_1.queryOne)('SELECT id, name, email FROM admins WHERE id = ?', [id]);
        if (admin) {
            console.log(`[findUserById] Found admin ID ${id} in 'admins' table (token role: ADMIN)`);
            return {
                id: admin.id,
                role: 'ADMIN', // Always ADMIN for admins table
                email: admin.email,
                name: admin.name,
                isBlocked: false,
            };
        }
    }
    else if (normalizedTokenRole === 'DONOR') {
        // Try Donor table first
        const donor = await (0, mysql_1.queryOne)('SELECT id, name, email, role, is_blocked FROM donors WHERE id = ?', [id]);
        if (donor) {
            if (donor.is_blocked)
                return null; // Blocked users cannot authenticate
            console.log(`[findUserById] Found donor ID ${id} in 'donors' table (token role: DONOR)`);
            return {
                id: donor.id,
                role: 'DONOR',
                email: donor.email,
                name: donor.name,
                isBlocked: donor.is_blocked || false,
            };
        }
    }
    // If token role not provided or not found in prioritized table, check all tables
    // Try Donor table
    const donor = await (0, mysql_1.queryOne)('SELECT id, name, email, role, is_blocked FROM donors WHERE id = ?', [id]);
    if (donor) {
        if (donor.is_blocked)
            return null; // Blocked users cannot authenticate
        return {
            id: donor.id,
            role: 'DONOR',
            email: donor.email,
            name: donor.name,
            isBlocked: donor.is_blocked || false,
        };
    }
    // Try Admin table
    const admin = await (0, mysql_1.queryOne)('SELECT id, name, email FROM admins WHERE id = ?', [id]);
    if (admin) {
        return {
            id: admin.id,
            role: 'ADMIN', // Always ADMIN for admins table
            email: admin.email,
            name: admin.name,
            isBlocked: false,
        };
    }
    // Try User/NGO table
    const user = await (0, mysql_1.queryOne)('SELECT id, name, email, role, is_blocked FROM users WHERE id = ?', [id]);
    if (user) {
        if (user.is_blocked) {
            console.log(`[findUserById] User ID ${id} is blocked.`);
            return null; // Blocked users cannot authenticate
        }
        // All users in users table are NGOs - ensure role is always 'NGO'
        const dbRole = user.role || 'NGO';
        const normalizedRole = (dbRole.toString().toUpperCase() === 'NGO') ? 'NGO' : 'NGO';
        console.log(`[findUserById] Found user ID ${id} in 'users' table - DB Role: "${dbRole}" (type: ${typeof dbRole}), Normalized Role: "${normalizedRole}"`);
        return {
            id: user.id,
            role: normalizedRole, // Always 'NGO' for users table
            email: user.email,
            name: user.name,
            isBlocked: user.is_blocked || false,
        };
    }
    return null;
};
exports.findUserById = findUserById;
/**
 * Find user by email across all tables
 */
const findUserByEmail = async (email) => {
    const normalizedEmail = email.toLowerCase();
    // Try Donor table
    const donor = await (0, mysql_1.queryOne)('SELECT id, name, email, role, is_blocked FROM donors WHERE email = ?', [normalizedEmail]);
    if (donor) {
        if (donor.is_blocked)
            return null;
        return {
            id: donor.id,
            role: 'DONOR',
            email: donor.email,
            name: donor.name,
            isBlocked: donor.is_blocked || false,
        };
    }
    // Try Admin table
    const admin = await (0, mysql_1.queryOne)('SELECT id, name, email, role FROM admins WHERE email = ?', [normalizedEmail]);
    if (admin) {
        return {
            id: admin.id,
            role: 'ADMIN',
            email: admin.email,
            name: admin.name,
            isBlocked: false,
        };
    }
    // Try User/NGO table
    const user = await (0, mysql_1.queryOne)('SELECT id, name, email, role, is_blocked FROM users WHERE email = ?', [normalizedEmail]);
    if (user) {
        if (user.is_blocked)
            return null;
        return {
            id: user.id,
            role: 'NGO',
            email: user.email,
            name: user.name,
            isBlocked: user.is_blocked || false,
        };
    }
    return null;
};
exports.findUserByEmail = findUserByEmail;
/**
 * Find user with password for authentication
 */
const findUserWithPasswordByEmail = async (email) => {
    const normalizedEmail = email.toLowerCase();
    // Try Donor table
    const donor = await (0, mysql_1.queryOne)('SELECT id, name, email, password, role, is_blocked FROM donors WHERE email = ?', [normalizedEmail]);
    if (donor) {
        if (donor.is_blocked)
            return null;
        return {
            id: donor.id,
            role: 'DONOR',
            email: donor.email,
            password: donor.password,
            name: donor.name,
            isBlocked: donor.is_blocked || false,
        };
    }
    // Try Admin table
    const admin = await (0, mysql_1.queryOne)('SELECT id, name, email, password, role FROM admins WHERE email = ?', [normalizedEmail]);
    if (admin) {
        return {
            id: admin.id,
            role: 'ADMIN',
            email: admin.email,
            password: admin.password,
            name: admin.name,
            isBlocked: false,
        };
    }
    // Try User/NGO table
    const user = await (0, mysql_1.queryOne)('SELECT id, name, email, password, role, is_blocked FROM users WHERE email = ?', [normalizedEmail]);
    if (user) {
        if (user.is_blocked)
            return null;
        return {
            id: user.id,
            role: 'NGO',
            email: user.email,
            password: user.password,
            name: user.name,
            isBlocked: user.is_blocked || false,
        };
    }
    return null;
};
exports.findUserWithPasswordByEmail = findUserWithPasswordByEmail;
/**
 * Check if email exists in any table
 */
const emailExists = async (email) => {
    const normalizedEmail = email.toLowerCase();
    const donor = await (0, mysql_1.queryOne)('SELECT id FROM donors WHERE email = ?', [normalizedEmail]);
    if (donor)
        return true;
    const admin = await (0, mysql_1.queryOne)('SELECT id FROM admins WHERE email = ?', [normalizedEmail]);
    if (admin)
        return true;
    const user = await (0, mysql_1.queryOne)('SELECT id FROM users WHERE email = ?', [normalizedEmail]);
    if (user)
        return true;
    return false;
};
exports.emailExists = emailExists;

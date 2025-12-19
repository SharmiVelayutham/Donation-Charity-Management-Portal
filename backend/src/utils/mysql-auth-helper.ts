/**
 * MySQL-based authentication helper
 * Replaces MongoDB auth-helper for MySQL database
 */

import { queryOne } from '../config/mysql';

export interface AuthUser {
  id: number;
  role: 'DONOR' | 'NGO' | 'ADMIN';
  email: string;
  name?: string;
  isBlocked?: boolean;
}

export interface UserWithPassword {
  id: number;
  role: 'DONOR' | 'NGO' | 'ADMIN';
  email: string;
  password: string;
  name: string;
  isBlocked?: boolean;
}

/**
 * Find user by ID across all tables (donors, users/NGOs, admins)
 */
export const findUserById = async (userId: number | string): Promise<AuthUser | null> => {
  const id = typeof userId === 'string' ? parseInt(userId) : userId;
  
  // Try Donor table
  const donor = await queryOne<any>('SELECT id, name, email, role, is_blocked FROM donors WHERE id = ?', [id]);
  if (donor) {
    if (donor.is_blocked) return null; // Blocked users cannot authenticate
    return {
      id: donor.id,
      role: 'DONOR',
      email: donor.email,
      name: donor.name,
      isBlocked: donor.is_blocked || false,
    };
  }

  // Try Admin table
  const admin = await queryOne<any>('SELECT id, name, email, role FROM admins WHERE id = ?', [id]);
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
  const user = await queryOne<any>('SELECT id, name, email, role, is_blocked FROM users WHERE id = ?', [id]);
  if (user) {
    if (user.is_blocked) return null; // Blocked users cannot authenticate
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

/**
 * Find user by email across all tables
 */
export const findUserByEmail = async (email: string): Promise<AuthUser | null> => {
  const normalizedEmail = email.toLowerCase();

  // Try Donor table
  const donor = await queryOne<any>('SELECT id, name, email, role, is_blocked FROM donors WHERE email = ?', [normalizedEmail]);
  if (donor) {
    if (donor.is_blocked) return null;
    return {
      id: donor.id,
      role: 'DONOR',
      email: donor.email,
      name: donor.name,
      isBlocked: donor.is_blocked || false,
    };
  }

  // Try Admin table
  const admin = await queryOne<any>('SELECT id, name, email, role FROM admins WHERE email = ?', [normalizedEmail]);
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
  const user = await queryOne<any>('SELECT id, name, email, role, is_blocked FROM users WHERE email = ?', [normalizedEmail]);
  if (user) {
    if (user.is_blocked) return null;
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

/**
 * Find user with password for authentication
 */
export const findUserWithPasswordByEmail = async (email: string): Promise<UserWithPassword | null> => {
  const normalizedEmail = email.toLowerCase();

  // Try Donor table
  const donor = await queryOne<any>('SELECT id, name, email, password, role, is_blocked FROM donors WHERE email = ?', [normalizedEmail]);
  if (donor) {
    if (donor.is_blocked) return null;
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
  const admin = await queryOne<any>('SELECT id, name, email, password, role FROM admins WHERE email = ?', [normalizedEmail]);
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
  const user = await queryOne<any>('SELECT id, name, email, password, role, is_blocked FROM users WHERE email = ?', [normalizedEmail]);
  if (user) {
    if (user.is_blocked) return null;
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

/**
 * Check if email exists in any table
 */
export const emailExists = async (email: string): Promise<boolean> => {
  const normalizedEmail = email.toLowerCase();

  const donor = await queryOne<any>('SELECT id FROM donors WHERE email = ?', [normalizedEmail]);
  if (donor) return true;

  const admin = await queryOne<any>('SELECT id FROM admins WHERE email = ?', [normalizedEmail]);
  if (admin) return true;

  const user = await queryOne<any>('SELECT id FROM users WHERE email = ?', [normalizedEmail]);
  if (user) return true;

  return false;
};


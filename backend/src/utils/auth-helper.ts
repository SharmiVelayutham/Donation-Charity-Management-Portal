/**
 * Unified authentication helper
 * Checks Donor, Admin, and User (NGO) collections
 */

import { DonorModel } from '../models/Donor.model';
import { AdminModel } from '../models/Admin.model';
import { UserModel } from '../models/User.model';

export interface AuthUser {
  id: string;
  role: 'DONOR' | 'NGO' | 'ADMIN';
  email: string;
  name?: string;
}

/**
 * Find user by ID across all collections (Donor, Admin, User/NGO)
 * Checks blocked status for Donors and NGOs
 */
export const findUserById = async (userId: string): Promise<AuthUser | null> => {
  // Try Donor collection
  const donor = await DonorModel.findById(userId);
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
  const admin = await AdminModel.findById(userId);
  if (admin) {
    return {
      id: admin.id,
      role: 'ADMIN',
      email: admin.email,
      name: admin.name,
    };
  }

  // Try User/NGO collection
  const user = await UserModel.findById(userId);
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

/**
 * Find user by email across all collections
 * Checks blocked status for Donors and NGOs
 */
export const findUserByEmail = async (email: string): Promise<AuthUser | null> => {
  // Try Donor collection
  const donor = await DonorModel.findOne({ email: email.toLowerCase() });
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
  const admin = await AdminModel.findOne({ email: email.toLowerCase() });
  if (admin) {
    return {
      id: admin.id,
      role: 'ADMIN',
      email: admin.email,
      name: admin.name,
    };
  }

  // Try User/NGO collection
  const user = await UserModel.findOne({ email: email.toLowerCase() });
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

/**
 * Get user with password for authentication
 */
export interface UserWithPassword {
  id: string;
  role: 'DONOR' | 'NGO' | 'ADMIN';
  email: string;
  password: string;
  name: string;
}

export const findUserWithPasswordByEmail = async (email: string): Promise<UserWithPassword | null> => {
  // Try Donor collection
  const donor = await DonorModel.findOne({ email: email.toLowerCase() });
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
  const admin = await AdminModel.findOne({ email: email.toLowerCase() });
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
  const user = await UserModel.findOne({ email: email.toLowerCase() });
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

/**
 * Check if email exists in any collection
 */
export const emailExists = async (email: string): Promise<boolean> => {
  const donor = await DonorModel.findOne({ email: email.toLowerCase() });
  if (donor) return true;

  const admin = await AdminModel.findOne({ email: email.toLowerCase() });
  if (admin) return true;

  const user = await UserModel.findOne({ email: email.toLowerCase() });
  if (user) return true;

  return false;
};



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
export const findUserById = async (userId: number | string, tokenRole?: string): Promise<AuthUser | null> => {
  const id = typeof userId === 'string' ? parseInt(userId) : userId;
  const normalizedTokenRole = tokenRole ? tokenRole.toUpperCase() : '';
  if (normalizedTokenRole === 'NGO') {
    const user = await queryOne<any>('SELECT id, name, email, role, is_blocked FROM users WHERE id = ?', [id]);
    if (user) {
      if (user.is_blocked) {
        console.log(`[findUserById] User ID ${id} is blocked.`);
        return null; // Blocked users cannot authenticate
      }
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
  } else if (normalizedTokenRole === 'ADMIN') {
    const admin = await queryOne<any>('SELECT id, name, email FROM admins WHERE id = ?', [id]);
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
  } else if (normalizedTokenRole === 'DONOR') {
    const donor = await queryOne<any>('SELECT id, name, email, role, is_blocked FROM donors WHERE id = ?', [id]);
    if (donor) {
      if (donor.is_blocked) return null; // Blocked users cannot authenticate
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
  const admin = await queryOne<any>('SELECT id, name, email FROM admins WHERE id = ?', [id]);
  if (admin) {
    return {
      id: admin.id,
      role: 'ADMIN', // Always ADMIN for admins table
      email: admin.email,
      name: admin.name,
      isBlocked: false,
    };
  }
  const user = await queryOne<any>('SELECT id, name, email, role, is_blocked FROM users WHERE id = ?', [id]);
  if (user) {
    if (user.is_blocked) {
      console.log(`[findUserById] User ID ${id} is blocked.`);
      return null; // Blocked users cannot authenticate
    }
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
export const findUserByEmail = async (email: string): Promise<AuthUser | null> => {
  const normalizedEmail = email.toLowerCase();
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
export const findUserWithPasswordByEmail = async (email: string): Promise<UserWithPassword | null> => {
  const normalizedEmail = email.toLowerCase();
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


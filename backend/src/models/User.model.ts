import { Schema, model, Document } from 'mongoose';

export type UserRole = 'DONOR' | 'NGO' | 'ADMIN';

/**
 * User model - Now only for NGO role
 * Donors use Donor model (donors collection)
 * Admins use Admin model (admins collection)
 * NGOs use User model (users collection)
 */
export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: 'NGO'; // Fixed role for NGOs
  contactInfo: string;
  isBlocked: boolean; // Admin can block/unblock
  createdAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['NGO'], default: 'NGO' },
    contactInfo: { type: String, required: true, trim: true },
    isBlocked: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: false }, collection: 'users' }
);

// Note: email uniqueness is already enforced by unique: true in the field definition

export const UserModel = model<IUser>('User', UserSchema);


import { Schema, model, Document } from 'mongoose';

export interface IDonor extends Document {
  name: string;
  email: string;
  password: string;
  contactInfo: string;
  phoneNumber?: string; // Donor's phone number for pickup
  fullAddress?: string; // Donor's full address for pickup
  role: 'DONOR'; // Fixed role
  isBlocked: boolean; // Admin can block/unblock
  createdAt: Date;
}

const DonorSchema = new Schema<IDonor>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    contactInfo: { type: String, required: true, trim: true },
    phoneNumber: { type: String, trim: true },
    fullAddress: { type: String, trim: true },
    role: { type: String, enum: ['DONOR'], default: 'DONOR' },
    isBlocked: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: false }, collection: 'donors' }
);

// Note: email uniqueness is already enforced by unique: true in the field definition

export const DonorModel = model<IDonor>('Donor', DonorSchema);


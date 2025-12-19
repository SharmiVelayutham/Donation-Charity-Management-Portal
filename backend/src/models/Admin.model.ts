import { Schema, model, Document } from 'mongoose';

export interface IAdmin extends Document {
  name: string;
  email: string;
  password: string;
  contactInfo: string;
  role: 'ADMIN'; // Fixed role
  permissions?: string[]; // Optional: specific admin permissions
  createdAt: Date;
}

const AdminSchema = new Schema<IAdmin>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    contactInfo: { type: String, required: true, trim: true },
    role: { type: String, enum: ['ADMIN'], default: 'ADMIN' },
    permissions: { type: [String], default: [] }, // Optional permissions array
  },
  { timestamps: { createdAt: true, updatedAt: false }, collection: 'admins' }
);

// Note: email uniqueness is already enforced by unique: true in the field definition

export const AdminModel = model<IAdmin>('Admin', AdminSchema);


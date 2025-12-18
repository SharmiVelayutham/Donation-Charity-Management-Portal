import { Schema, model, Document } from 'mongoose';

export type UserRole = 'DONOR' | 'NGO' | 'ADMIN';

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  contactInfo: string;
  createdAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['DONOR', 'NGO', 'ADMIN'], required: true, default: 'DONOR' },
    contactInfo: { type: String, required: true, trim: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const UserModel = model<IUser>('User', UserSchema);


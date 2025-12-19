import { Schema, model, Document, Types } from 'mongoose';

export type ContributionStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED';
export type PickupStatus = 'SCHEDULED' | 'PICKED_UP' | 'CANCELLED';

export interface IContribution extends Document {
  donationId: Types.ObjectId;
  donorId: Types.ObjectId;
  notes?: string;
  scheduledPickupTime: Date; // Legacy field for backward compatibility
  pickupScheduledDateTime: Date; // New field for pickup scheduling
  donorAddress: string; // Donor's address for pickup
  donorContactNumber: string; // Donor's contact number for pickup
  pickupStatus: PickupStatus; // Pickup status: SCHEDULED | PICKED_UP | CANCELLED
  status: ContributionStatus; // Contribution approval status
  createdAt: Date;
}

const ContributionSchema = new Schema<IContribution>(
  {
    donationId: { type: Schema.Types.ObjectId, ref: 'Donation', required: true },
    donorId: { type: Schema.Types.ObjectId, ref: 'Donor', required: true }, // Changed ref to Donor
    notes: { type: String, trim: true },
    scheduledPickupTime: { type: Date }, // Legacy field
    pickupScheduledDateTime: { type: Date, required: true }, // New required field
    donorAddress: { type: String, required: true, trim: true }, // Required for pickup
    donorContactNumber: { type: String, required: true, trim: true }, // Required for pickup
    pickupStatus: { type: String, enum: ['SCHEDULED', 'PICKED_UP', 'CANCELLED'], default: 'SCHEDULED' },
    status: { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED', 'COMPLETED'], default: 'PENDING' },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const ContributionModel = model<IContribution>('Contribution', ContributionSchema);


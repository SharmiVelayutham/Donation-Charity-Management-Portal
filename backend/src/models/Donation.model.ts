import { Schema, model, Document, Types } from 'mongoose';

export type DonationStatus = 'PENDING' | 'CONFIRMED' | 'COMPLETED';
export type DonationPriority = 'NORMAL' | 'URGENT';

export interface IDonation extends Document {
  ngoId: Types.ObjectId;
  donationType: string;
  quantityOrAmount: number;
  location: string;
  pickupDateTime: Date;
  status: DonationStatus;
  images: string[];
  priority: DonationPriority;
  createdAt: Date;
}

const DonationSchema = new Schema<IDonation>(
  {
    ngoId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    donationType: { type: String, required: true, trim: true },
    quantityOrAmount: { type: Number, required: true, min: 1 },
    location: { type: String, required: true, trim: true },
    pickupDateTime: { type: Date, required: true },
    status: { type: String, enum: ['PENDING', 'CONFIRMED', 'COMPLETED'], default: 'PENDING' },
    images: { type: [String], default: [] },
    priority: { type: String, enum: ['NORMAL', 'URGENT'], default: 'NORMAL' },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const DonationModel = model<IDonation>('Donation', DonationSchema);


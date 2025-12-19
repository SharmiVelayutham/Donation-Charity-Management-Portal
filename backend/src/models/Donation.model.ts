import { Schema, model, Document, Types } from 'mongoose';

export type DonationStatus = 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
export type DonationPriority = 'NORMAL' | 'URGENT';
export type DonationType = 'FOOD' | 'FUNDS' | 'CLOTHES' | 'MEDICINE' | 'BOOKS' | 'TOYS' | 'OTHER';
export type DonationCategory = 'CLOTHES' | 'FOOD' | 'MONEY'; // NGO Admin Dashboard specific categories

export interface ILocation {
  address: string; // Human-readable address
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  useCurrentLocation?: boolean; // Flag if location was set from current GPS
}

export interface IPaymentDetails {
  qrCodeImage: string; // UPI QR code image path/URL
  bankAccountNumber: string;
  bankName: string;
  ifscCode: string;
  accountHolderName: string;
}

export interface IDonation extends Document {
  ngoId: Types.ObjectId;
  donationType: string; // Legacy field for backward compatibility
  donationCategory?: DonationCategory; // NGO Admin Dashboard: CLOTHES | FOOD | MONEY
  purpose?: string; // Purpose of donation (e.g., Orphan support, disaster relief)
  description?: string; // Detailed description of why donation is needed
  quantityOrAmount: number;
  location: ILocation; // Enhanced location object (for FOOD/CLOTHES)
  pickupDateTime: Date; // For FOOD/CLOTHES donations
  timezone?: string; // IANA timezone (e.g., 'America/New_York')
  paymentDetails?: IPaymentDetails; // For MONEY donations only
  status: DonationStatus;
  images: string[];
  priority: DonationPriority;
  createdAt: Date;
}

const DonationSchema = new Schema<IDonation>(
  {
    ngoId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    donationType: { type: String, required: true, trim: true }, // Legacy field
    donationCategory: { type: String, enum: ['CLOTHES', 'FOOD', 'MONEY'], trim: true }, // NGO Admin Dashboard
    purpose: { type: String, trim: true }, // Purpose of donation
    description: { type: String, trim: true }, // Detailed description
    quantityOrAmount: { type: Number, required: true, min: 1 },
    location: {
      address: { type: String, required: true, trim: true },
      coordinates: {
        latitude: { type: Number, min: -90, max: 90 },
        longitude: { type: Number, min: -180, max: 180 },
      },
      useCurrentLocation: { type: Boolean, default: false },
    },
    pickupDateTime: { type: Date }, // Optional for MONEY donations
    timezone: { type: String, trim: true }, // IANA timezone identifier
    paymentDetails: {
      qrCodeImage: { type: String, trim: true }, // UPI QR code image path/URL
      bankAccountNumber: { type: String, trim: true },
      bankName: { type: String, trim: true },
      ifscCode: { type: String, trim: true },
      accountHolderName: { type: String, trim: true },
    },
    status: { type: String, enum: ['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'], default: 'PENDING' },
    images: { type: [String], default: [] },
    priority: { type: String, enum: ['NORMAL', 'URGENT'], default: 'NORMAL' },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const DonationModel = model<IDonation>('Donation', DonationSchema);


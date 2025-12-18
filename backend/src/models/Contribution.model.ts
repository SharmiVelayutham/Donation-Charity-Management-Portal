import { Schema, model, Document, Types } from 'mongoose';

export interface IContribution extends Document {
  donationId: Types.ObjectId;
  donorId: Types.ObjectId;
  notes?: string;
  scheduledPickupTime: Date;
  createdAt: Date;
}

const ContributionSchema = new Schema<IContribution>(
  {
    donationId: { type: Schema.Types.ObjectId, ref: 'Donation', required: true },
    donorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    notes: { type: String, trim: true },
    scheduledPickupTime: { type: Date, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const ContributionModel = model<IContribution>('Contribution', ContributionSchema);


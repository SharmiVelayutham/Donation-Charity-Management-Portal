import { Schema, model, Document, Types } from 'mongoose';

export type PaymentStatus = 'PENDING' | 'SUCCESS' | 'FAILED';

export interface IPayment extends Document {
  donationId: Types.ObjectId;
  donorId: Types.ObjectId;
  ngoId: Types.ObjectId;
  amount: number;
  transactionReferenceId: string; // Generated internally, unique
  donorProvidedReference?: string; // Optional reference from donor
  paymentStatus: PaymentStatus;
  verifiedByRole?: 'NGO' | 'ADMIN'; // Who verified the payment
  verifiedById?: Types.ObjectId; // ID of verifier
  verifiedAt?: Date; // When payment was verified
  createdAt: Date;
}

const PaymentSchema = new Schema<IPayment>(
  {
    donationId: { type: Schema.Types.ObjectId, ref: 'Donation', required: true },
    donorId: { type: Schema.Types.ObjectId, ref: 'Donor', required: true },
    ngoId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true, min: 0.01 },
    transactionReferenceId: { type: String, required: true, unique: true, trim: true },
    donorProvidedReference: { type: String, trim: true },
    paymentStatus: {
      type: String,
      enum: ['PENDING', 'SUCCESS', 'FAILED'],
      default: 'PENDING',
    },
    verifiedByRole: { type: String, enum: ['NGO', 'ADMIN'] },
    verifiedById: { type: Schema.Types.ObjectId },
    verifiedAt: { type: Date },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// Note: transactionReferenceId uniqueness is already enforced by unique: true in the field definition
// Compound indexes for faster queries
PaymentSchema.index({ donationId: 1, donorId: 1 });
PaymentSchema.index({ ngoId: 1, paymentStatus: 1 });

export const PaymentModel = model<IPayment>('Payment', PaymentSchema);


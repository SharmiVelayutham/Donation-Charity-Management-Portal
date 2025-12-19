"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentModel = void 0;
const mongoose_1 = require("mongoose");
const PaymentSchema = new mongoose_1.Schema({
    donationId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Donation', required: true },
    donorId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Donor', required: true },
    ngoId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true, min: 0.01 },
    transactionReferenceId: { type: String, required: true, unique: true, trim: true },
    donorProvidedReference: { type: String, trim: true },
    paymentStatus: {
        type: String,
        enum: ['PENDING', 'SUCCESS', 'FAILED'],
        default: 'PENDING',
    },
    verifiedByRole: { type: String, enum: ['NGO', 'ADMIN'] },
    verifiedById: { type: mongoose_1.Schema.Types.ObjectId },
    verifiedAt: { type: Date },
}, { timestamps: { createdAt: true, updatedAt: false } });
// Note: transactionReferenceId uniqueness is already enforced by unique: true in the field definition
// Compound indexes for faster queries
PaymentSchema.index({ donationId: 1, donorId: 1 });
PaymentSchema.index({ ngoId: 1, paymentStatus: 1 });
exports.PaymentModel = (0, mongoose_1.model)('Payment', PaymentSchema);

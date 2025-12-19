"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DonationModel = void 0;
const mongoose_1 = require("mongoose");
const DonationSchema = new mongoose_1.Schema({
    ngoId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
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
}, { timestamps: { createdAt: true, updatedAt: false } });
exports.DonationModel = (0, mongoose_1.model)('Donation', DonationSchema);

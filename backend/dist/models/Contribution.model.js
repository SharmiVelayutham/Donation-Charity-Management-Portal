"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContributionModel = void 0;
const mongoose_1 = require("mongoose");
const ContributionSchema = new mongoose_1.Schema({
    donationId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Donation', required: true },
    donorId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Donor', required: true }, // Changed ref to Donor
    notes: { type: String, trim: true },
    scheduledPickupTime: { type: Date }, // Legacy field
    pickupScheduledDateTime: { type: Date, required: true }, // New required field
    donorAddress: { type: String, required: true, trim: true }, // Required for pickup
    donorContactNumber: { type: String, required: true, trim: true }, // Required for pickup
    pickupStatus: { type: String, enum: ['SCHEDULED', 'PICKED_UP', 'CANCELLED'], default: 'SCHEDULED' },
    status: { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED', 'COMPLETED'], default: 'PENDING' },
}, { timestamps: { createdAt: true, updatedAt: false } });
exports.ContributionModel = (0, mongoose_1.model)('Contribution', ContributionSchema);

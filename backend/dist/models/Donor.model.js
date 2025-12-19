"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DonorModel = void 0;
const mongoose_1 = require("mongoose");
const DonorSchema = new mongoose_1.Schema({
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    contactInfo: { type: String, required: true, trim: true },
    phoneNumber: { type: String, trim: true },
    fullAddress: { type: String, trim: true },
    role: { type: String, enum: ['DONOR'], default: 'DONOR' },
    isBlocked: { type: Boolean, default: false },
}, { timestamps: { createdAt: true, updatedAt: false }, collection: 'donors' });
// Note: email uniqueness is already enforced by unique: true in the field definition
exports.DonorModel = (0, mongoose_1.model)('Donor', DonorSchema);

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminModel = void 0;
const mongoose_1 = require("mongoose");
const AdminSchema = new mongoose_1.Schema({
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    contactInfo: { type: String, required: true, trim: true },
    role: { type: String, enum: ['ADMIN'], default: 'ADMIN' },
    permissions: { type: [String], default: [] }, // Optional permissions array
}, { timestamps: { createdAt: true, updatedAt: false }, collection: 'admins' });
// Note: email uniqueness is already enforced by unique: true in the field definition
exports.AdminModel = (0, mongoose_1.model)('Admin', AdminSchema);

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserModel = void 0;
const mongoose_1 = require("mongoose");
const UserSchema = new mongoose_1.Schema({
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['NGO'], default: 'NGO' },
    contactInfo: { type: String, required: true, trim: true },
    isBlocked: { type: Boolean, default: false },
}, { timestamps: { createdAt: true, updatedAt: false }, collection: 'users' });
// Note: email uniqueness is already enforced by unique: true in the field definition
exports.UserModel = (0, mongoose_1.model)('User', UserSchema);

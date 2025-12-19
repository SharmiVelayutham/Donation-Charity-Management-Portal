"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectDB = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const env_1 = require("./env");
const connectDB = async () => {
    try {
        mongoose_1.default.set('strictQuery', true);
        const conn = await mongoose_1.default.connect(env_1.env.mongoUri);
        console.log(`MongoDB connected: ${conn.connection.host}`);
        return conn;
    }
    catch (error) {
        console.error('MongoDB connection error', error);
        throw error;
    }
};
exports.connectDB = connectDB;

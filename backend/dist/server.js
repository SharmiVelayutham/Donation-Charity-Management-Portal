"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = __importDefault(require("./app"));
const env_1 = require("./config/env");
const mysql_1 = require("./config/mysql");
const email_service_1 = require("./utils/email.service");
const start = async () => {
    try {
        // Initialize MySQL connection
        await (0, mysql_1.initMySQL)();
        // Verify email configuration (warn if missing, but don't fail)
        const emailConfigured = (0, email_service_1.verifyEmailConfig)();
        if (!emailConfigured) {
            console.warn('');
            console.warn('⚠️  WARNING: SMTP email configuration is missing!');
            console.warn('OTP emails will NOT be sent. Please configure SMTP settings in .env file.');
            console.warn('See .env.example for configuration instructions.');
            console.warn('');
        }
        else {
            console.log('✅ Email service configured and ready');
        }
        app_1.default.listen(env_1.env.port, () => {
            console.log(`✓ MySQL connected successfully`);
            console.log(`Server running on port ${env_1.env.port}`);
            console.log(`API available at http://localhost:${env_1.env.port}/api`);
        });
    }
    catch (error) {
        console.error('Failed to start server', error);
        process.exit(1);
    }
};
start();

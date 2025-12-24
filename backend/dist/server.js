"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = require("http");
const app_1 = __importDefault(require("./app"));
const env_1 = require("./config/env");
const mysql_1 = require("./config/mysql");
const email_service_1 = require("./utils/email.service");
const socket_server_1 = require("./socket/socket.server");
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
        // Create HTTP server
        const httpServer = (0, http_1.createServer)(app_1.default);
        // Initialize Socket.IO
        (0, socket_server_1.initSocketIO)(httpServer);
        httpServer.listen(env_1.env.port, () => {
            console.log(`✓ MySQL connected successfully`);
            console.log(`Server running on port ${env_1.env.port}`);
            console.log(`API available at http://localhost:${env_1.env.port}/api`);
            console.log(`Socket.IO ready for real-time updates`);
        });
    }
    catch (error) {
        console.error('Failed to start server', error);
        process.exit(1);
    }
};
start();

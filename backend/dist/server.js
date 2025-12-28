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
        await (0, mysql_1.initMySQL)();
        (0, email_service_1.verifyEmailConfig)();
        const httpServer = (0, http_1.createServer)(app_1.default);
        (0, socket_server_1.initSocketIO)(httpServer);
        httpServer.listen(env_1.env.port, () => {
            console.log(`Server running on port ${env_1.env.port}`);
        });
    }
    catch (error) {
        console.error('Failed to start server', error);
        process.exit(1);
    }
};
start();

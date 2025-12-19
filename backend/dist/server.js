"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = __importDefault(require("./app"));
const env_1 = require("./config/env");
const mysql_1 = require("./config/mysql");
const start = async () => {
    try {
        // Initialize MySQL connection instead of MongoDB
        await (0, mysql_1.initMySQL)();
        app_1.default.listen(env_1.env.port, () => {
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

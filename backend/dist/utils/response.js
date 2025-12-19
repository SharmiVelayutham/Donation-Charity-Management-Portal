"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendError = exports.sendSuccess = void 0;
const sendSuccess = (res, data, message = 'Success', status = 200) => {
    return res.status(status).json({ success: true, message, data });
};
exports.sendSuccess = sendSuccess;
const sendError = (res, message, status = 400, details) => {
    return res.status(status).json({ success: false, message, details });
};
exports.sendError = sendError;

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const errorHandler = (err, req, res, _next) => {
    var _a, _b;
    const status = (res.statusCode && res.statusCode >= 400) ? res.statusCode : 500;
    const errorLog = {
        timestamp: new Date().toISOString(),
        route: `${req.method} ${req.path}`,
        message: err.message || 'Internal Server Error',
        stack: err.stack,
        body: req.body,
        query: req.query,
        params: req.params,
        userId: ((_a = req.user) === null || _a === void 0 ? void 0 : _a.id) || 'anonymous',
        userRole: ((_b = req.user) === null || _b === void 0 ? void 0 : _b.role) || 'anonymous',
    };
    console.error('❌ [Error Handler] Server Error:', JSON.stringify(errorLog, null, 2));
    const userMessage = status >= 500
        ? 'Something went wrong. Please try again later.'
        : (err.message || 'An error occurred');
    return res.status(status).json({
        success: false,
        message: userMessage,
    });
};
exports.errorHandler = errorHandler;

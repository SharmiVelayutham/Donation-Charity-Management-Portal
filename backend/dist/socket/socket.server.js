"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emitToAllNgos = exports.emitToDonor = exports.emitToNgo = exports.getIO = exports.initSocketIO = void 0;
const socket_io_1 = require("socket.io");
const jwt_1 = require("../utils/jwt");
let io = null;
/**
 * Initialize Socket.IO server
 */
const initSocketIO = (httpServer) => {
    io = new socket_io_1.Server(httpServer, {
        cors: {
            origin: process.env.FRONTEND_URL || 'http://localhost:4200',
            methods: ['GET', 'POST'],
            credentials: true,
            allowedHeaders: ['Authorization'],
        },
    });
    // Authentication middleware
    io.use((socket, next) => {
        var _a;
        const token = socket.handshake.auth.token || ((_a = socket.handshake.headers.authorization) === null || _a === void 0 ? void 0 : _a.replace('Bearer ', ''));
        if (!token) {
            return next(new Error('Authentication error: No token provided'));
        }
        try {
            const payload = (0, jwt_1.verifyToken)(token);
            socket.userId = parseInt(payload.userId);
            socket.userRole = payload.role;
            next();
        }
        catch (error) {
            next(new Error('Authentication error: Invalid token'));
        }
    });
    io.on('connection', (socket) => {
        console.log(`[Socket] User connected: ${socket.userId} (${socket.userRole})`);
        // Join role-specific room for targeted updates
        if (socket.userRole === 'NGO') {
            socket.join(`ngo:${socket.userId}`);
        }
        else if (socket.userRole === 'DONOR') {
            socket.join(`donor:${socket.userId}`);
        }
        socket.on('disconnect', () => {
            console.log(`[Socket] User disconnected: ${socket.userId}`);
        });
    });
    console.log('✅ Socket.IO server initialized');
    return io;
};
exports.initSocketIO = initSocketIO;
/**
 * Get Socket.IO instance
 */
const getIO = () => {
    if (!io) {
        throw new Error('Socket.IO not initialized. Call initSocketIO first.');
    }
    return io;
};
exports.getIO = getIO;
/**
 * Emit event to specific NGO
 */
const emitToNgo = (ngoId, event, data) => {
    const socketIO = (0, exports.getIO)();
    socketIO.to(`ngo:${ngoId}`).emit(event, data);
    console.log(`[Socket] Emitted ${event} to NGO ${ngoId}`);
};
exports.emitToNgo = emitToNgo;
/**
 * Emit event to specific Donor
 */
const emitToDonor = (donorId, event, data) => {
    const socketIO = (0, exports.getIO)();
    socketIO.to(`donor:${donorId}`).emit(event, data);
    console.log(`[Socket] Emitted ${event} to Donor ${donorId}`);
};
exports.emitToDonor = emitToDonor;
/**
 * Emit event to all NGOs
 */
const emitToAllNgos = (event, data) => {
    const socketIO = (0, exports.getIO)();
    socketIO.emit(event, data);
    console.log(`[Socket] Emitted ${event} to all NGOs`);
};
exports.emitToAllNgos = emitToAllNgos;

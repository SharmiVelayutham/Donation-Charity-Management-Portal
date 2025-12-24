import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { verifyToken } from '../utils/jwt';

interface AuthenticatedSocket extends Socket {
  userId?: number;
  userRole?: string;
}

let io: SocketIOServer | null = null;

/**
 * Initialize Socket.IO server
 */
export const initSocketIO = (httpServer: HttpServer): SocketIOServer => {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:4200',
      methods: ['GET', 'POST'],
      credentials: true,
      allowedHeaders: ['Authorization'],
    },
  });

  // Authentication middleware
  io.use((socket: AuthenticatedSocket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }

    try {
      const payload = verifyToken(token);
      socket.userId = parseInt(payload.userId);
      socket.userRole = payload.role;
      next();
    } catch (error) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    console.log(`[Socket] User connected: ${socket.userId} (${socket.userRole})`);

    // Join role-specific room for targeted updates
    if (socket.userRole === 'NGO') {
      socket.join(`ngo:${socket.userId}`);
    } else if (socket.userRole === 'DONOR') {
      socket.join(`donor:${socket.userId}`);
    }

    socket.on('disconnect', () => {
      console.log(`[Socket] User disconnected: ${socket.userId}`);
    });
  });

  console.log('✅ Socket.IO server initialized');
  return io;
};

/**
 * Get Socket.IO instance
 */
export const getIO = (): SocketIOServer => {
  if (!io) {
    throw new Error('Socket.IO not initialized. Call initSocketIO first.');
  }
  return io;
};

/**
 * Emit event to specific NGO
 */
export const emitToNgo = (ngoId: number, event: string, data: any) => {
  const socketIO = getIO();
  socketIO.to(`ngo:${ngoId}`).emit(event, data);
  console.log(`[Socket] Emitted ${event} to NGO ${ngoId}`);
};

/**
 * Emit event to specific Donor
 */
export const emitToDonor = (donorId: number, event: string, data: any) => {
  const socketIO = getIO();
  socketIO.to(`donor:${donorId}`).emit(event, data);
  console.log(`[Socket] Emitted ${event} to Donor ${donorId}`);
};

/**
 * Emit event to all NGOs
 */
export const emitToAllNgos = (event: string, data: any) => {
  const socketIO = getIO();
  socketIO.emit(event, data);
  console.log(`[Socket] Emitted ${event} to all NGOs`);
};


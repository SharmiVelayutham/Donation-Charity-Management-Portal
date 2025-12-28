import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { verifyToken } from '../utils/jwt';
import { env } from '../config/env';

interface AuthenticatedSocket extends Socket {
  userId?: number;
  userRole?: string;
}

let io: SocketIOServer | null = null;
export const initSocketIO = (httpServer: HttpServer): SocketIOServer => {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: env.frontendUrl,
      methods: ['GET', 'POST'],
      credentials: true,
      allowedHeaders: ['Authorization'],
    },
  });

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

    if (socket.userRole === 'NGO') {
      socket.join(`ngo:${socket.userId}`);
    } else if (socket.userRole === 'DONOR') {
      socket.join(`donor:${socket.userId}`);
    } else if (socket.userRole === 'ADMIN') {
      socket.join('admin:all');
    }

    socket.on('disconnect', () => {

    });
  });

  return io;
};
export const getIO = (): SocketIOServer => {
  if (!io) {
    throw new Error('Socket.IO not initialized. Call initSocketIO first.');
  }
  return io;
};
export const emitToNgo = (ngoId: number, event: string, data: any) => {
  const socketIO = getIO();
  socketIO.to(`ngo:${ngoId}`).emit(event, data);
};
export const emitToDonor = (donorId: number, event: string, data: any) => {
  const socketIO = getIO();
  socketIO.to(`donor:${donorId}`).emit(event, data);
};
export const emitToAllNgos = (event: string, data: any) => {
  const socketIO = getIO();
  socketIO.emit(event, data);
};
export const emitToAdmin = (event: string, data: any) => {
  const socketIO = getIO();
  socketIO.to('admin:all').emit(event, data);
};


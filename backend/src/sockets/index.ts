import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { pubClient, subClient } from '../config/redis';
import { logger } from '../utils/logger';
import { redis } from '../config/redis';
import jwt from 'jsonwebtoken';

let io: Server;

export function initializeSocket(httpServer: any): Server {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  io.adapter(createAdapter(pubClient, subClient));

  // Public namespace
  io.on('connection', (socket) => {
    logger.debug(`Socket connected: ${socket.id}`);

    socket.on('join:event', async (eventId: string) => {
      await socket.join(`event:${eventId}`);
      // Send current seat map from Redis cache
      const seatMap = await redis.get(`seatmap:${eventId}`);
      if (seatMap) socket.emit('seat:map', JSON.parse(seatMap));
      logger.debug(`Socket ${socket.id} joined event:${eventId}`);
    });

    socket.on('leave:event', async (eventId: string) => {
      await socket.leave(`event:${eventId}`);
    });

    socket.on('disconnect', () => {
      logger.debug(`Socket disconnected: ${socket.id}`);
    });
  });

  // Admin namespace
  const adminNs = io.of('/admin');
  adminNs.use((socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    try {
      if (!token) throw new Error('No token');
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
      if (decoded.role !== 'admin') throw new Error('Not admin');
      next();
    } catch {
      next(new Error('Unauthorized'));
    }
  });

  adminNs.on('connection', (socket) => {
    socket.join('admin-dashboard');
    logger.debug(`Admin socket connected: ${socket.id}`);
  });

  logger.info('✅ Socket.IO initialized');
  return io;
}

export function getIO(): Server {
  if (!io) throw new Error('Socket.IO not initialized');
  return io;
}

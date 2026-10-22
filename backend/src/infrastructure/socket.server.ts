import { createServer } from 'http';
import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import type { Express } from 'express';
import redis from './redis';
import { socketAuthMiddleware } from '../websocket/socket.auth';
import { registerProjectHandlers } from '../websocket/handlers/project.handler';

let io: Server;

export function getIO(): Server {
  if (!io) throw new Error('Socket.IO not initialized');
  return io;
}

export async function initSocketServer(app: Express) {
  const httpServer = createServer(app);

  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // ─── Redis adapter for multi-instance scaling ─────────────────────────────
  const pubClient = redis.duplicate();
  const subClient = redis.duplicate();
  io.adapter(createAdapter(pubClient, subClient));

  // ─── Auth middleware ───────────────────────────────────────────────────────
  io.use(socketAuthMiddleware);

  // ─── Connection handler ───────────────────────────────────────────────────
  io.on('connection', (socket) => {
    const userId = socket.data.userId as string;
    console.log(`🔌 Socket connected: ${socket.id} (user: ${userId})`);

    // Join personal notification room
    socket.join(`user:${userId}`);

    // Register all event handlers
    registerProjectHandlers(io, socket);

    socket.on('disconnect', () => {
      console.log(`🔌 Socket disconnected: ${socket.id}`);
    });
  });

  return httpServer;
}

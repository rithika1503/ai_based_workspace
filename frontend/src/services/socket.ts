import { io, Socket } from 'socket.io-client';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) throw new Error('Socket not initialized — call connectSocket() first');
  return socket;
}

export function connectSocket(accessToken: string): Socket {
  if (socket?.connected) return socket;

  socket = io(API_URL, {
    auth: { token: accessToken },
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 10,
    transports: ['websocket'],
  });

  socket.on('connect', () => {
    console.log('🔌 Socket connected:', socket!.id);
  });

  socket.on('connect_error', (err) => {
    console.warn('Socket connect error:', err.message);
  });

  socket.on('disconnect', (reason) => {
    console.log('🔌 Socket disconnected:', reason);
  });

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

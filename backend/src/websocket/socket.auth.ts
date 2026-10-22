import type { Socket } from 'socket.io';
import jwt from 'jsonwebtoken';

interface JwtPayload {
  userId: string;
}

/**
 * Socket.IO auth middleware — verifies JWT token passed in handshake.auth.token
 * Attaches userId to socket.data so handlers can trust it.
 */
export function socketAuthMiddleware(
  socket: Socket,
  next: (err?: Error) => void
) {
  const token = socket.handshake.auth?.token as string | undefined;

  if (!token) {
    return next(new Error('Authentication required'));
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
    socket.data.userId = payload.userId;
    next();
  } catch {
    next(new Error('Invalid or expired token'));
  }
}

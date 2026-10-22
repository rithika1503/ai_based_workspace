import { v4 as uuid } from 'uuid';
import type { Server } from 'socket.io';

/**
 * Standard event envelope — every WS message uses this shape.
 * eventId enables client-side deduplication on reconnect.
 */
export function buildEnvelope<T>(
  event: string,
  projectId: string,
  payload: T
) {
  return {
    eventId: uuid(),
    event,
    timestamp: new Date().toISOString(),
    projectId,
    payload,
  };
}

/** Emit to every socket in a project room */
export function emitToProject<T>(
  io: Server,
  projectId: string,
  event: string,
  payload: T
) {
  io.to(`project:${projectId}`).emit(event, buildEnvelope(event, projectId, payload));
}

/** Emit to a single user's personal room */
export function emitToUser<T>(
  io: Server,
  userId: string,
  event: string,
  payload: T
) {
  io.to(`user:${userId}`).emit(event, payload);
}

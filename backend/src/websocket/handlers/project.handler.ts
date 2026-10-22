import redis from '../../infrastructure/redis';
import type { Server, Socket } from 'socket.io';
import {
  WS_JOIN_PROJECT, WS_LEAVE_PROJECT, WS_HEARTBEAT, WS_VIEWING_TASK,
} from '../events';
import {
  joinProjectRoom, leaveProjectRoom, handleHeartbeat, handleDisconnect,
} from '../rooms';
import prisma from '../../config/prisma';

export function registerProjectHandlers(io: Server, socket: Socket) {
  const userId = socket.data.userId as string;

  // ─── Join project room ────────────────────────────────────────────────────
  socket.on(WS_JOIN_PROJECT, async ({ projectId }: { projectId: string }) => {
    if (!projectId || typeof projectId !== 'string') return;
    await joinProjectRoom(io, socket, projectId);
  });

  // ─── Leave project room ───────────────────────────────────────────────────
  socket.on(WS_LEAVE_PROJECT, async ({ projectId }: { projectId: string }) => {
    if (!projectId || typeof projectId !== 'string') return;
    await leaveProjectRoom(io, socket, projectId);
  });

  // ─── Heartbeat — refresh presence TTL ────────────────────────────────────
  socket.on(WS_HEARTBEAT, async ({ projectId }: { projectId: string }) => {
    if (!projectId || typeof projectId !== 'string') return;
    // Only refresh if this socket is actually in the room
    if (socket.rooms.has(`project:${projectId}`)) {
      await handleHeartbeat(projectId, userId);
    }
  });

  // ─── Viewing task — track with Redis Set ──────────────────────────────────
  socket.on(WS_VIEWING_TASK, async ({ taskId, projectId }: { taskId: string; projectId: string }) => {
    if (!taskId || !projectId) return;
    // Auth: must be in project room
    if (!socket.rooms.has(`project:${projectId}`)) return;

    // Verify task belongs to this project
    const task = await prisma.task.findFirst({ where: { id: taskId, projectId } });
    if (!task) return;

    const key = `viewers:${taskId}`;
    await redis.sadd(key, userId);
    await redis.expire(key, 60);

    // Broadcast viewer list to project room
    const viewers = await redis.smembers(key);
    io.to(`project:${projectId}`).emit('TASK_VIEWERS_UPDATE', { taskId, viewers });
  });

  // ─── Disconnect ───────────────────────────────────────────────────────────
  socket.on('disconnect', async () => {
    await handleDisconnect(io, socket);
    // Remove from any task viewer sets
    const viewerKeys = await redis.keys('viewers:*');
    for (const key of viewerKeys) {
      await redis.srem(key, userId);
    }
  });
}

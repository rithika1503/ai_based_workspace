import prisma from '../config/prisma';
import redis from '../infrastructure/redis';
import { emitToProject } from './emit';
import { WS_USER_JOINED, WS_USER_LEFT, WS_PRESENCE_UPDATE } from './events';
import type { Server, Socket } from 'socket.io';

const PRESENCE_TTL = 30; // seconds

async function getProjectId(socket: Socket): Promise<string | null> {
  // Retrieve from socket's tracked rooms (project:xxx)
  for (const room of socket.rooms) {
    if (room.startsWith('project:')) return room.replace('project:', '');
  }
  return null;
}

/** Get all online users for a project from Redis */
async function getOnlineUsers(projectId: string): Promise<{ userId: string; name: string; avatar: string | null }[]> {
  const keys = await redis.keys(`presence:${projectId}:*`);
  const users: { userId: string; name: string; avatar: string | null }[] = [];
  for (const key of keys) {
    const raw = await redis.get(key);
    if (raw) users.push(JSON.parse(raw));
  }
  return users;
}

export async function joinProjectRoom(io: Server, socket: Socket, projectId: string) {
  const userId = socket.data.userId as string;

  // ─── Auth check: verify membership ───────────────────────────────────────
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) { socket.emit('error', { message: 'Project not found' }); return; }

  const member = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId: project.workspaceId, userId } },
  });
  if (!member) { socket.emit('error', { message: 'Not authorized for this project' }); return; }

  // ─── Join room ───────────────────────────────────────────────────────────
  socket.join(`project:${projectId}`);

  // ─── Store presence in Redis ─────────────────────────────────────────────
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, avatar: true },
  });
  if (user) {
    await redis.setex(
      `presence:${projectId}:${userId}`,
      PRESENCE_TTL,
      JSON.stringify({ userId, name: user.name, avatar: user.avatar })
    );
  }

  // ─── Broadcast join ──────────────────────────────────────────────────────
  emitToProject(io, projectId, WS_USER_JOINED, { userId, name: user?.name });

  // ─── Send presence list to joiner ────────────────────────────────────────
  const onlineUsers = await getOnlineUsers(projectId);
  emitToProject(io, projectId, WS_PRESENCE_UPDATE, onlineUsers);
}

export async function leaveProjectRoom(io: Server, socket: Socket, projectId: string) {
  const userId = socket.data.userId as string;

  socket.leave(`project:${projectId}`);
  await redis.del(`presence:${projectId}:${userId}`);

  emitToProject(io, projectId, WS_USER_LEFT, { userId });

  const onlineUsers = await getOnlineUsers(projectId);
  emitToProject(io, projectId, WS_PRESENCE_UPDATE, onlineUsers);
}

export async function handleHeartbeat(projectId: string, userId: string) {
  // Refresh TTL — prevents user appearing offline while browser is active
  const key = `presence:${projectId}:${userId}`;
  const existing = await redis.get(key);
  if (existing) await redis.expire(key, PRESENCE_TTL);
}

export async function handleDisconnect(io: Server, socket: Socket) {
  const userId = socket.data.userId as string;
  // Clean up all project rooms this socket was in
  for (const room of socket.rooms) {
    if (room.startsWith('project:')) {
      const projectId = room.replace('project:', '');
      await redis.del(`presence:${projectId}:${userId}`);
      emitToProject(io, projectId, WS_USER_LEFT, { userId });
      const onlineUsers = await getOnlineUsers(projectId);
      emitToProject(io, projectId, WS_PRESENCE_UPDATE, onlineUsers);
    }
  }
}

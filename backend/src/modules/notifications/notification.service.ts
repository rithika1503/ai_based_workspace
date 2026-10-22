import prisma from '../../config/prisma';
import { NotificationType } from '@prisma/client';
import { getIO } from '../../infrastructure/socket.server';
import { emitToUser } from '../../websocket/emit';
import { WS_NOTIFICATION_CREATED } from '../../websocket/events';

export const createNotification = async (
  userId: string,
  type: NotificationType,
  title: string,
  message: string,
  entityId?: string,
  entityType?: string
) => {
  const notification = await prisma.notification.create({
    data: { userId, type, title, message, entityId, entityType },
  });

  // Push to user's personal WebSocket room immediately
  try {
    emitToUser(getIO(), userId, WS_NOTIFICATION_CREATED, notification);
  } catch {}

  return notification;
};

export const getNotifications = async (userId: string) => {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: [{ read: 'asc' }, { createdAt: 'desc' }],
    take: 30,
  });
};

export const markRead = async (notificationId: string, userId: string) => {
  return prisma.notification.update({
    where: { id: notificationId, userId },
    data: { read: true },
  });
};

export const markAllRead = async (userId: string) => {
  return prisma.notification.updateMany({
    where: { userId, read: false },
    data: { read: true },
  });
};

export const getUnreadCount = async (userId: string): Promise<number> => {
  return prisma.notification.count({ where: { userId, read: false } });
};

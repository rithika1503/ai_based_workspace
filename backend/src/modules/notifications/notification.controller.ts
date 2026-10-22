import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth';
import * as notificationService from './notification.service';

export const getNotifications = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const notifications = await notificationService.getNotifications(req.user!.id);
    const unreadCount = await notificationService.getUnreadCount(req.user!.id);
    res.json({ success: true, notifications, unreadCount });
  } catch (err) { next(err); }
};

export const markRead = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const notification = await notificationService.markRead(req.params.id as string, req.user!.id);
    res.json({ success: true, notification });
  } catch (err) { next(err); }
};

export const markAllRead = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await notificationService.markAllRead(req.user!.id);
    res.json({ success: true });
  } catch (err) { next(err); }
};

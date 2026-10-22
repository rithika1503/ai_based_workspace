import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth';
import prisma from '../../config/prisma';

export const getMe = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { id: true, name: true, email: true, avatar: true, createdAt: true },
    });
    res.json({ success: true, user });
  } catch (err) { next(err); }
};

export const updateMe = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { name, avatar } = req.body;
    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: { name, avatar },
      select: { id: true, name: true, email: true, avatar: true },
    });
    res.json({ success: true, user });
  } catch (err) { next(err); }
};

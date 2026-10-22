import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import { AppError } from './errorHandler';
import prisma from '../config/prisma';
import { WorkspaceRole } from '@prisma/client';

const roleHierarchy: Record<WorkspaceRole, number> = {
  VIEWER: 0,
  MEMBER: 1,
  ADMIN: 2,
  OWNER: 3,
};

export const requireWorkspaceRole = (minRole: WorkspaceRole) => {
  return async (req: AuthRequest, _res: Response, next: NextFunction) => {
    try {
      const workspaceId = req.params.workspaceId || req.body.workspaceId;
      const userId = req.user?.id;

      if (!userId || !workspaceId) {
        throw new AppError('Unauthorized', 401);
      }

      const member = await prisma.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId, userId } },
      });

      if (!member) {
        throw new AppError('You are not a member of this workspace', 403);
      }

      if (roleHierarchy[member.role] < roleHierarchy[minRole]) {
        throw new AppError('Insufficient permissions', 403);
      }

      next();
    } catch (err) {
      next(err);
    }
  };
};

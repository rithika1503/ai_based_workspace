import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth';
import * as workspaceService from './workspace.service';
import { WorkspaceRole } from '@prisma/client';

export const createWorkspace = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Name is required' });
    const workspace = await workspaceService.createWorkspace(req.user!.id, name);
    res.status(201).json({ success: true, workspace });
  } catch (err) { next(err); }
};

export const getWorkspaces = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const workspaces = await workspaceService.getUserWorkspaces(req.user!.id);
    res.json({ success: true, workspaces });
  } catch (err) { next(err); }
};

export const getWorkspace = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const workspace = await workspaceService.getWorkspace(req.params.id as string, req.user!.id);
    res.json({ success: true, workspace });
  } catch (err) { next(err); }
};

export const inviteMember = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { email, role } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email is required' });
    const member = await workspaceService.inviteMember(
      req.params.id as string,
      req.user!.id,
      email,
      (role as WorkspaceRole) || WorkspaceRole.MEMBER
    );
    res.status(201).json({ success: true, member });
  } catch (err) { next(err); }
};

export const removeMember = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await workspaceService.removeMember(req.params.id as string, req.user!.id, req.params.userId as string);
    res.json({ success: true, message: 'Member removed' });
  } catch (err) { next(err); }
};

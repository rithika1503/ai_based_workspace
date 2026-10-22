import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth';
import * as projectService from './project.service';

export const createProject = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { name, description, workspaceId } = req.body;
    if (!name || !workspaceId) return res.status(400).json({ success: false, message: 'Name and workspaceId are required' });
    const project = await projectService.createProject(req.user!.id, workspaceId, name, description);
    res.status(201).json({ success: true, project });
  } catch (err) { next(err); }
};

export const getProjects = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { workspaceId } = req.query;
    if (!workspaceId) return res.status(400).json({ success: false, message: 'workspaceId is required' });
    const projects = await projectService.getProjects(workspaceId as string, req.user!.id);
    res.json({ success: true, projects });
  } catch (err) { next(err); }
};

export const getProject = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const project = await projectService.getProject(req.params.id as string, req.user!.id);
    res.json({ success: true, project });
  } catch (err) { next(err); }
};

export const updateProject = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { name, description } = req.body;
    const project = await projectService.updateProject(req.params.id as string, req.user!.id, { name, description });
    res.json({ success: true, project });
  } catch (err) { next(err); }
};

export const deleteProject = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await projectService.deleteProject(req.params.id as string, req.user!.id);
    res.json({ success: true, message: 'Project deleted' });
  } catch (err) { next(err); }
};

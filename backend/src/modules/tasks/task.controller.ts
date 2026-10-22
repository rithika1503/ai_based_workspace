import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth';
import * as taskService from './task.service';
import { TaskStatus, TaskPriority } from '@prisma/client';

export const createTask = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { title, description, projectId, assigneeId, priority, status, dueDate } = req.body;
    if (!title || !projectId) return res.status(400).json({ success: false, message: 'Title and projectId are required' });
    const task = await taskService.createTask(req.user!.id, {
      title, description, projectId, assigneeId,
      priority: priority as TaskPriority,
      status: status as TaskStatus,
      dueDate: dueDate ? new Date(dueDate) : undefined,
    });
    res.status(201).json({ success: true, task });
  } catch (err) { next(err); }
};

export const getTasks = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { projectId } = req.query;
    if (!projectId) return res.status(400).json({ success: false, message: 'projectId is required' });
    const tasks = await taskService.getTasks(projectId as string, req.user!.id);
    res.json({ success: true, tasks });
  } catch (err) { next(err); }
};

export const getTask = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const task = await taskService.getTask(req.params.id as string, req.user!.id);
    res.json({ success: true, task });
  } catch (err) { next(err); }
};

export const updateTask = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const task = await taskService.updateTask(req.params.id as string, req.user!.id, req.body);
    res.json({ success: true, task });
  } catch (err) { next(err); }
};

export const moveTask = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { status, order } = req.body;
    if (!status) return res.status(400).json({ success: false, message: 'status is required' });
    const task = await taskService.moveTask(req.params.id as string, req.user!.id, status as TaskStatus, order);
    res.json({ success: true, task });
  } catch (err) { next(err); }
};

export const deleteTask = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await taskService.deleteTask(req.params.id as string, req.user!.id);
    res.json({ success: true, message: 'Task deleted' });
  } catch (err) { next(err); }
};

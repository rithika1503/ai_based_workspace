import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth';
import * as commentService from './comment.service';

export const createComment = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { content } = req.body;
    const taskId = req.params.taskId as string;
    if (!content) return res.status(400).json({ success: false, message: 'Content is required' });
    const comment = await commentService.createComment(taskId, req.user!.id, content);
    res.status(201).json({ success: true, comment });
  } catch (err) { next(err); }
};

export const getComments = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const comments = await commentService.getComments(req.params.taskId as string, req.user!.id);
    res.json({ success: true, comments });
  } catch (err) { next(err); }
};

export const deleteComment = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await commentService.deleteComment(req.params.id as string, req.user!.id);
    res.json({ success: true, message: 'Comment deleted' });
  } catch (err) { next(err); }
};

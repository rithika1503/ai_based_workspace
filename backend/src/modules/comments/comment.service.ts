import prisma from '../../config/prisma';
import { AppError } from '../../middleware/errorHandler';
import { emitCommentCreated } from '../../websocket/handlers/comment.events';
import { createNotification } from '../notifications/notification.service';

export const createComment = async (taskId: string, userId: string, content: string) => {
  const task = await prisma.task.findUnique({ where: { id: taskId }, include: { project: { select: { workspaceId: true } } } });
  if (!task) throw new AppError('Task not found', 404);

  const member = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId: task.project.workspaceId, userId } },
  });
  if (!member || member.role === 'VIEWER') throw new AppError('Insufficient permissions', 403);

  const comment = await prisma.comment.create({
    data: { content, taskId, authorId: userId },
    include: { author: { select: { id: true, name: true, avatar: true } } },
  });

  await prisma.activityLog.create({
    data: {
      action: 'COMMENT_CREATED',
      entityType: 'comment',
      entityId: comment.id,
      userId,
      taskId,
      projectId: task.projectId,
      workspaceId: task.project.workspaceId,
      metadata: { content: content.substring(0, 100) },
    },
  });

  // Real-time event
  emitCommentCreated(task.projectId, comment);

  // Notify task participants (reporter + assignee, but not the commenter)
  const toNotify = new Set<string>();
  if (task.reporterId && task.reporterId !== userId) toNotify.add(task.reporterId);
  if (task.assigneeId && task.assigneeId !== userId) toNotify.add(task.assigneeId);
  for (const recipientId of toNotify) {
    await createNotification(
      recipientId,
      'COMMENT_ADDED',
      'New comment on a task',
      `Someone commented on "${task.title}"`,
      task.id,
      'task'
    );
  }

  return comment;
};

export const getComments = async (taskId: string, userId: string) => {
  const task = await prisma.task.findUnique({ where: { id: taskId }, include: { project: { select: { workspaceId: true } } } });
  if (!task) throw new AppError('Task not found', 404);

  const member = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId: task.project.workspaceId, userId } },
  });
  if (!member) throw new AppError('Access denied', 403);

  return prisma.comment.findMany({
    where: { taskId },
    include: { author: { select: { id: true, name: true, avatar: true } } },
    orderBy: { createdAt: 'asc' },
  });
};

export const deleteComment = async (commentId: string, userId: string) => {
  const comment = await prisma.comment.findUnique({ where: { id: commentId } });
  if (!comment) throw new AppError('Comment not found', 404);
  if (comment.authorId !== userId) throw new AppError('You can only delete your own comments', 403);
  await prisma.comment.delete({ where: { id: commentId } });
};

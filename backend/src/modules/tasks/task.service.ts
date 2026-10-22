import prisma from '../../config/prisma';
import { AppError } from '../../middleware/errorHandler';
import { TaskStatus, TaskPriority } from '@prisma/client';
import {
  emitTaskCreated, emitTaskUpdated, emitTaskMoved, emitTaskDeleted,
} from '../../websocket/handlers/task.events';
import { createNotification } from '../notifications/notification.service';

const getMaxOrder = async (projectId: string, status: TaskStatus): Promise<number> => {
  const last = await prisma.task.findFirst({
    where: { projectId, status },
    orderBy: { order: 'desc' },
    select: { order: true },
  });
  return last ? last.order + 1 : 0;
};

export const createTask = async (
  userId: string,
  data: {
    title: string;
    description?: string;
    projectId: string;
    assigneeId?: string;
    priority?: TaskPriority;
    status?: TaskStatus;
    dueDate?: Date;
  }
) => {
  const project = await prisma.project.findUnique({ where: { id: data.projectId } });
  if (!project) throw new AppError('Project not found', 404);

  const member = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId: project.workspaceId, userId } },
  });
  if (!member || member.role === 'VIEWER') throw new AppError('Insufficient permissions', 403);

  const status = data.status || TaskStatus.BACKLOG;
  const order = await getMaxOrder(data.projectId, status);

  const task = await prisma.task.create({
    data: {
      title: data.title,
      description: data.description,
      projectId: data.projectId,
      reporterId: userId,
      assigneeId: data.assigneeId,
      priority: data.priority || TaskPriority.MEDIUM,
      status,
      order,
      dueDate: data.dueDate,
    },
    include: {
      assignee: { select: { id: true, name: true, avatar: true } },
      reporter: { select: { id: true, name: true, avatar: true } },
      labels: { include: { label: true } },
      _count: { select: { comments: true } },
    },
  });

  await prisma.activityLog.create({
    data: {
      action: 'TASK_CREATED',
      entityType: 'task',
      entityId: task.id,
      userId,
      projectId: data.projectId,
      workspaceId: project.workspaceId,
      taskId: task.id,
      metadata: { title: task.title },
    },
  });

  // Real-time event
  emitTaskCreated(data.projectId, task);

  // Notify assignee if set
  if (task.assigneeId && task.assigneeId !== userId) {
    await createNotification(
      task.assigneeId,
      'TASK_ASSIGNED',
      'Task assigned to you',
      `"${task.title}" has been assigned to you`,
      task.id,
      'task'
    );
  }

  return task;
};

export const getTasks = async (projectId: string, userId: string) => {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) throw new AppError('Project not found', 404);

  const member = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId: project.workspaceId, userId } },
  });
  if (!member) throw new AppError('Access denied', 403);

  return prisma.task.findMany({
    where: { projectId },
    include: {
      assignee: { select: { id: true, name: true, avatar: true } },
      reporter: { select: { id: true, name: true, avatar: true } },
      labels: { include: { label: true } },
      _count: { select: { comments: true } },
    },
    orderBy: [{ status: 'asc' }, { order: 'asc' }],
  });
};

export const getTask = async (taskId: string, userId: string) => {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      assignee: { select: { id: true, name: true, avatar: true } },
      reporter: { select: { id: true, name: true, avatar: true } },
      labels: { include: { label: true } },
      comments: {
        include: { author: { select: { id: true, name: true, avatar: true } } },
        orderBy: { createdAt: 'asc' },
      },
      dependencies: { include: { dependsOn: { select: { id: true, title: true, status: true } } } },
      project: { select: { workspaceId: true } },
    },
  });

  if (!task) throw new AppError('Task not found', 404);

  const member = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId: task.project.workspaceId, userId } },
  });
  if (!member) throw new AppError('Access denied', 403);

  return task;
};

export const updateTask = async (
  taskId: string,
  userId: string,
  data: Partial<{ title: string; description: string; assigneeId: string; priority: TaskPriority; dueDate: Date }>
) => {
  const task = await prisma.task.findUnique({ where: { id: taskId }, include: { project: { select: { workspaceId: true } } } });
  if (!task) throw new AppError('Task not found', 404);

  const member = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId: task.project.workspaceId, userId } },
  });
  if (!member || member.role === 'VIEWER') throw new AppError('Insufficient permissions', 403);

  const updated = await prisma.task.update({
    where: { id: taskId },
    data,
    include: {
      assignee: { select: { id: true, name: true, avatar: true } },
      reporter: { select: { id: true, name: true, avatar: true } },
      labels: { include: { label: true } },
    },
  });

  await prisma.activityLog.create({
    data: {
      action: 'TASK_UPDATED',
      entityType: 'task',
      entityId: taskId,
      userId,
      taskId,
      projectId: task.projectId,
      workspaceId: task.project.workspaceId,
      metadata: data,
    },
  });

  // Real-time event
  emitTaskUpdated(task.projectId, updated);

  // Notify new assignee if reassigned
  if (data.assigneeId && data.assigneeId !== task.assigneeId && data.assigneeId !== userId) {
    await createNotification(
      data.assigneeId,
      'TASK_ASSIGNED',
      'Task assigned to you',
      `"${updated.title}" has been assigned to you`,
      taskId,
      'task'
    );
  }

  return updated;
};

export const moveTask = async (
  taskId: string,
  userId: string,
  newStatus: TaskStatus,
  newOrder?: number
) => {
  const task = await prisma.task.findUnique({ where: { id: taskId }, include: { project: { select: { workspaceId: true } } } });
  if (!task) throw new AppError('Task not found', 404);

  const member = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId: task.project.workspaceId, userId } },
  });
  if (!member || member.role === 'VIEWER') throw new AppError('Insufficient permissions', 403);

  const order = newOrder !== undefined ? newOrder : await getMaxOrder(task.projectId, newStatus);
  const oldStatus = task.status;

  const updated = await prisma.task.update({
    where: { id: taskId },
    data: { status: newStatus, order },
  });

  await prisma.activityLog.create({
    data: {
      action: 'TASK_MOVED',
      entityType: 'task',
      entityId: taskId,
      userId,
      taskId,
      projectId: task.projectId,
      workspaceId: task.project.workspaceId,
      metadata: { from: oldStatus, to: newStatus },
    },
  });

  // Real-time event with rich payload
  emitTaskMoved(task.projectId, {
    taskId,
    fromStatus: oldStatus,
    toStatus: newStatus,
    position: order,
    version: updated.updatedAt.getTime(),
    updatedAt: updated.updatedAt,
  });

  return updated;
};

export const deleteTask = async (taskId: string, userId: string) => {
  const task = await prisma.task.findUnique({ where: { id: taskId }, include: { project: { select: { workspaceId: true } } } });
  if (!task) throw new AppError('Task not found', 404);

  const member = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId: task.project.workspaceId, userId } },
  });
  if (!member || (member.role !== 'OWNER' && member.role !== 'ADMIN' && task.reporterId !== userId)) {
    throw new AppError('Insufficient permissions', 403);
  }

  await prisma.task.delete({ where: { id: taskId } });

  // Real-time event
  emitTaskDeleted(task.projectId, taskId);
};

import { getIO } from '../../infrastructure/socket.server';
import { emitToProject } from '../emit';
import {
  WS_TASK_CREATED, WS_TASK_UPDATED, WS_TASK_MOVED, WS_TASK_DELETED,
} from '../events';
import type { Task, TaskStatus } from '@prisma/client';

/** Emit after task created in DB */
export function emitTaskCreated(projectId: string, task: Partial<Task> & { id: string }) {
  try { emitToProject(getIO(), projectId, WS_TASK_CREATED, task); } catch {}
}

/** Emit after task fields updated in DB */
export function emitTaskUpdated(projectId: string, task: Partial<Task> & { id: string }) {
  try { emitToProject(getIO(), projectId, WS_TASK_UPDATED, task); } catch {}
}

/** Emit after task moved between columns */
export function emitTaskMoved(
  projectId: string,
  payload: {
    taskId: string;
    fromStatus: TaskStatus;
    toStatus: TaskStatus;
    position: number;
    version: number;
    updatedAt: Date;
  }
) {
  try { emitToProject(getIO(), projectId, WS_TASK_MOVED, payload); } catch {}
}

/** Emit after task deleted */
export function emitTaskDeleted(projectId: string, taskId: string) {
  try { emitToProject(getIO(), projectId, WS_TASK_DELETED, { taskId }); } catch {}
}

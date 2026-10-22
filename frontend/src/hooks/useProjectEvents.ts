import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getSocket } from '../services/socket';
import type { Task } from '../types';

interface WsEnvelope<T> {
  eventId: string;
  event: string;
  timestamp: string;
  projectId: string;
  payload: T;
}

interface TaskMovedPayload {
  taskId: string;
  fromStatus: string;
  toStatus: string;
  position: number;
  version: number;
  updatedAt: string;
}

/**
 * Listens for real-time task/comment events and updates the React Query
 * cache directly — no full re-fetch unless a cache miss occurs.
 *
 * Also:
 * - Emits JOIN_PROJECT on mount, LEAVE_PROJECT on unmount
 * - On reconnect: invalidates to re-sync state (single safe full-fetch)
 */
export function useProjectEvents(projectId: string | undefined) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!projectId) return;

    let socket: ReturnType<typeof getSocket>;
    try {
      socket = getSocket();
    } catch {
      return; // Socket not yet connected
    }

    // ── Join project room ──────────────────────────────────────────────────
    socket.emit('JOIN_PROJECT', { projectId });

    // ── Cache updater helpers ─────────────────────────────────────────────
    const queryKey = ['tasks', projectId];

    const addTask = (envelope: WsEnvelope<Task>) => {
      qc.setQueryData<Task[]>(queryKey, (old = []) => {
        if (old.find((t) => t.id === envelope.payload.id)) return old;
        return [...old, envelope.payload];
      });
    };

    const updateTask = (envelope: WsEnvelope<Partial<Task> & { id: string }>) => {
      qc.setQueryData<Task[]>(queryKey, (old = []) =>
        old.map((t) => (t.id === envelope.payload.id ? { ...t, ...envelope.payload } : t))
      );
    };

    const moveTask = (envelope: WsEnvelope<TaskMovedPayload>) => {
      const { taskId, toStatus, position } = envelope.payload;
      qc.setQueryData<Task[]>(queryKey, (old = []) =>
        old.map((t) =>
          t.id === taskId
            ? { ...t, status: toStatus as Task['status'], order: position }
            : t
        )
      );
    };

    const deleteTask = (envelope: WsEnvelope<{ taskId: string }>) => {
      qc.setQueryData<Task[]>(queryKey, (old = []) =>
        old.filter((t) => t.id !== envelope.payload.taskId)
      );
    };

    const addComment = () => {
      // Invalidate the specific task query to refresh comments
      qc.invalidateQueries({ queryKey });
    };

    // ── Reconnect: full resync ────────────────────────────────────────────
    const onReconnect = () => {
      qc.invalidateQueries({ queryKey });
      socket.emit('JOIN_PROJECT', { projectId }); // Re-join after reconnect
    };

    // ── Register listeners ────────────────────────────────────────────────
    socket.on('TASK_CREATED', addTask);
    socket.on('TASK_UPDATED', updateTask);
    socket.on('TASK_MOVED', moveTask);
    socket.on('TASK_DELETED', deleteTask);
    socket.on('COMMENT_CREATED', addComment);
    socket.on('reconnect', onReconnect);

    return () => {
      socket.emit('LEAVE_PROJECT', { projectId });
      socket.off('TASK_CREATED', addTask);
      socket.off('TASK_UPDATED', updateTask);
      socket.off('TASK_MOVED', moveTask);
      socket.off('TASK_DELETED', deleteTask);
      socket.off('COMMENT_CREATED', addComment);
      socket.off('reconnect', onReconnect);
    };
  }, [projectId, qc]);
}

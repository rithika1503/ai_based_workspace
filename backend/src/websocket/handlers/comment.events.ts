import { getIO } from '../../infrastructure/socket.server';
import { emitToProject } from '../emit';
import { WS_COMMENT_CREATED } from '../events';
import type { Comment } from '@prisma/client';

export function emitCommentCreated(projectId: string, comment: Partial<Comment> & { id: string }) {
  try { emitToProject(getIO(), projectId, WS_COMMENT_CREATED, comment); } catch {}
}

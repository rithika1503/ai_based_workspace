import prisma from '../../config/prisma';
import { AppError } from '../../middleware/errorHandler';
import { WorkspaceRole } from '@prisma/client';

const slugify = (name: string) =>
  name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '-' + Date.now();

export const createWorkspace = async (userId: string, name: string) => {
  const slug = slugify(name);
  const workspace = await prisma.workspace.create({
    data: {
      name,
      slug,
      ownerId: userId,
      members: {
        create: { userId, role: WorkspaceRole.OWNER },
      },
    },
    include: { members: { include: { user: { select: { id: true, name: true, email: true, avatar: true } } } } },
  });
  return workspace;
};

export const getUserWorkspaces = async (userId: string) => {
  return prisma.workspace.findMany({
    where: { members: { some: { userId } } },
    include: {
      members: {
        include: { user: { select: { id: true, name: true, email: true, avatar: true } } },
      },
      _count: { select: { projects: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
};

export const getWorkspace = async (workspaceId: string, userId: string) => {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    include: {
      members: {
        include: { user: { select: { id: true, name: true, email: true, avatar: true } } },
      },
      projects: {
        include: { _count: { select: { tasks: true } } },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!workspace) throw new AppError('Workspace not found', 404);

  const isMember = workspace.members.some((m) => m.userId === userId);
  if (!isMember) throw new AppError('Access denied', 403);

  return workspace;
};

export const inviteMember = async (
  workspaceId: string,
  invitedByUserId: string,
  email: string,
  role: WorkspaceRole
) => {
  const inviterMember = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId: invitedByUserId } },
  });

  if (!inviterMember || (inviterMember.role !== 'OWNER' && inviterMember.role !== 'ADMIN')) {
    throw new AppError('Only OWNER or ADMIN can invite members', 403);
  }

  const userToInvite = await prisma.user.findUnique({ where: { email } });
  if (!userToInvite) throw new AppError('User with this email not found', 404);

  const existing = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId: userToInvite.id } },
  });
  if (existing) throw new AppError('User is already a member', 409);

  return prisma.workspaceMember.create({
    data: { workspaceId, userId: userToInvite.id, role },
    include: { user: { select: { id: true, name: true, email: true, avatar: true } } },
  });
};

export const removeMember = async (
  workspaceId: string,
  removedByUserId: string,
  targetUserId: string
) => {
  const remover = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId: removedByUserId } },
  });

  if (!remover || (remover.role !== 'OWNER' && remover.role !== 'ADMIN')) {
    throw new AppError('Insufficient permissions', 403);
  }

  const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });
  if (workspace?.ownerId === targetUserId) {
    throw new AppError('Cannot remove the workspace owner', 400);
  }

  await prisma.workspaceMember.delete({
    where: { workspaceId_userId: { workspaceId, userId: targetUserId } },
  });
};

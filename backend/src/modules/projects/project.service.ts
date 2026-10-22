import prisma from '../../config/prisma';
import { AppError } from '../../middleware/errorHandler';

export const createProject = async (userId: string, workspaceId: string, name: string, description?: string) => {
  const member = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
  });
  if (!member) throw new AppError('You are not a member of this workspace', 403);
  if (member.role === 'VIEWER') throw new AppError('Viewers cannot create projects', 403);

  return prisma.project.create({
    data: { name, description, workspaceId, createdById: userId },
    include: { createdBy: { select: { id: true, name: true, avatar: true } }, _count: { select: { tasks: true } } },
  });
};

export const getProjects = async (workspaceId: string, userId: string) => {
  const member = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
  });
  if (!member) throw new AppError('Access denied', 403);

  return prisma.project.findMany({
    where: { workspaceId },
    include: {
      createdBy: { select: { id: true, name: true, avatar: true } },
      _count: { select: { tasks: true, members: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
};

export const getProject = async (projectId: string, userId: string) => {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      createdBy: { select: { id: true, name: true, avatar: true } },
      members: { include: { user: { select: { id: true, name: true, email: true, avatar: true } } } },
      _count: { select: { tasks: true } },
    },
  });

  if (!project) throw new AppError('Project not found', 404);

  const member = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId: project.workspaceId, userId } },
  });
  if (!member) throw new AppError('Access denied', 403);

  return project;
};

export const updateProject = async (projectId: string, userId: string, data: { name?: string; description?: string }) => {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) throw new AppError('Project not found', 404);

  const member = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId: project.workspaceId, userId } },
  });
  if (!member || member.role === 'VIEWER' || member.role === 'MEMBER') {
    throw new AppError('Insufficient permissions', 403);
  }

  return prisma.project.update({ where: { id: projectId }, data });
};

export const deleteProject = async (projectId: string, userId: string) => {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) throw new AppError('Project not found', 404);

  const member = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId: project.workspaceId, userId } },
  });
  if (!member || (member.role !== 'OWNER' && member.role !== 'ADMIN')) {
    throw new AppError('Insufficient permissions', 403);
  }

  await prisma.project.delete({ where: { id: projectId } });
};

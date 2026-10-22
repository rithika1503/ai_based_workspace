import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth';
import prisma from '../../config/prisma';
import { AppError } from '../../middleware/errorHandler';
import {
  breakdownFeature, askAssistant, processTranscript, enhanceTask,
} from './ai.proxy';
import * as taskService from '../tasks/task.service';

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getProjectAndVerify(projectId: string, userId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { workspace: true },
  });
  if (!project) throw new AppError('Project not found', 404);

  const member = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId: project.workspaceId, userId } },
  });
  if (!member) throw new AppError('Access denied', 403);

  return project;
}

// ─── 3a: AI Task Breakdown ────────────────────────────────────────────────────

export const generateTaskBreakdown = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { projectId, feature, count = 5 } = req.body;
    if (!projectId || !feature) {
      return res.status(400).json({ success: false, message: 'projectId and feature are required' });
    }

    const project = await getProjectAndVerify(projectId as string, req.user!.id);

    // Build project context from existing tasks
    const existingTasks = await prisma.task.findMany({
      where: { projectId: projectId as string },
      select: { title: true, status: true },
      take: 20,
    });
    const context = existingTasks.length > 0
      ? `Project "${project.name}" already has: ${existingTasks.map(t => t.title).join(', ')}`
      : `Project name: ${project.name}`;

    const result = await breakdownFeature(feature as string, context, count as number);
    res.json({ success: true, ...result });
  } catch (err) { next(err); }
};

// ─── Accept generated tasks → create in DB ────────────────────────────────────

export const acceptGeneratedTasks = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { projectId, tasks } = req.body as {
      projectId: string;
      tasks: Array<{ title: string; description: string; priority: string }>;
    };
    if (!projectId || !tasks?.length) {
      return res.status(400).json({ success: false, message: 'projectId and tasks are required' });
    }

    await getProjectAndVerify(projectId, req.user!.id);

    const created = [];
    for (const t of tasks) {
      const task = await taskService.createTask(req.user!.id, {
        title: t.title,
        description: t.description,
        projectId,
        priority: (t.priority as 'HIGH' | 'MEDIUM' | 'LOW') || 'MEDIUM',
      });
      created.push(task);
    }

    res.status(201).json({ success: true, tasks: created });
  } catch (err) { next(err); }
};

// ─── 3b: Project Assistant ────────────────────────────────────────────────────

export const chat = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { projectId, question, conversationHistory = [] } = req.body;
    if (!projectId || !question) {
      return res.status(400).json({ success: false, message: 'projectId and question are required' });
    }

    const project = await getProjectAndVerify(projectId as string, req.user!.id);

    const [tasks, activity] = await Promise.all([
      prisma.task.findMany({
        where: { projectId: projectId as string },
        include: { assignee: { select: { name: true } } },
        orderBy: { updatedAt: 'desc' },
        take: 30,
      }),
      prisma.activityLog.findMany({
        where: { projectId: projectId as string },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ]);

    const result = await askAssistant(
      question as string,
      project.name,
      tasks as Record<string, unknown>[],
      activity as Record<string, unknown>[],
      conversationHistory
    );

    res.json({ success: true, ...result });
  } catch (err) { next(err); }
};

// ─── 3c: Meeting → Tasks ──────────────────────────────────────────────────────

export const meetingToTasks = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { projectId, transcript, participants = [] } = req.body;
    if (!projectId || !transcript) {
      return res.status(400).json({ success: false, message: 'projectId and transcript are required' });
    }

    const project = await getProjectAndVerify(projectId as string, req.user!.id);
    const result = await processTranscript(
      transcript as string,
      project.name,
      participants as string[]
    );

    res.json({ success: true, ...result });
  } catch (err) { next(err); }
};

// Accept meeting tasks → create in DB

export const acceptMeetingTasks = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { projectId, tasks } = req.body as {
      projectId: string;
      tasks: Array<{ title: string; description: string; priority?: string; due_date?: string }>;
    };

    await getProjectAndVerify(projectId, req.user!.id);

    const created = [];
    for (const t of tasks) {
      const task = await taskService.createTask(req.user!.id, {
        title: t.title,
        description: t.description,
        projectId,
        priority: (t.priority as 'HIGH' | 'MEDIUM' | 'LOW') || 'MEDIUM',
        dueDate: t.due_date ? new Date(t.due_date) : undefined,
      });
      created.push(task);
    }

    res.status(201).json({ success: true, tasks: created });
  } catch (err) { next(err); }
};

// ─── Task Enhancer ────────────────────────────────────────────────────────────

export const enhance = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { title, roughDescription, projectId } = req.body;
    if (!title) return res.status(400).json({ success: false, message: 'title is required' });

    let projectContext: string | undefined;
    if (projectId) {
      const project = await getProjectAndVerify(projectId as string, req.user!.id);
      projectContext = `Project: ${project.name}`;
    }

    const result = await enhanceTask(title as string, roughDescription as string, projectContext);
    res.json({ success: true, ...result });
  } catch (err) { next(err); }
};

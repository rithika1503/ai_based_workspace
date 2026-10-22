import api from './api';

// ─── Task Breakdown ──────────────────────────────────────────────────────────

export interface GeneratedTask {
  title: string;
  description: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  estimated_hours?: number;
}

export interface BreakdownResult {
  tasks: GeneratedTask[];
  summary: string;
}

export const generateBreakdown = (
  projectId: string,
  feature: string,
  count = 5
): Promise<{ data: BreakdownResult }> =>
  api.post('/ai/breakdown', { projectId, feature, count });

export const acceptBreakdown = (projectId: string, tasks: GeneratedTask[]) =>
  api.post('/ai/breakdown/accept', { projectId, tasks });

// ─── Project Assistant ────────────────────────────────────────────────────────

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatResult {
  answer: string;
  suggestions: string[];
}

export const askChat = (
  projectId: string,
  question: string,
  conversationHistory: ChatMessage[]
): Promise<{ data: ChatResult }> =>
  api.post('/ai/chat', { projectId, question, conversationHistory });

// ─── Meeting → Tasks ──────────────────────────────────────────────────────────

export interface MeetingTask {
  title: string;
  description: string;
  assignee_name?: string;
  due_date?: string;
  priority: string;
}

export interface MeetingResult {
  action_items: MeetingTask[];
  decisions: string[];
  summary: string;
}

export const processMeeting = (
  projectId: string,
  transcript: string,
  participants: string[]
): Promise<{ data: MeetingResult }> =>
  api.post('/ai/meeting', { projectId, transcript, participants });

export const acceptMeetingTasks = (projectId: string, tasks: MeetingTask[]) =>
  api.post('/ai/meeting/accept', { projectId, tasks });

// ─── Task Enhancer ────────────────────────────────────────────────────────────

export interface EnhanceResult {
  description: string;
  acceptance_criteria: string[];
}

export const enhanceTask = (
  title: string,
  roughDescription?: string,
  projectId?: string
): Promise<{ data: EnhanceResult }> =>
  api.post('/ai/enhance', { title, roughDescription, projectId });

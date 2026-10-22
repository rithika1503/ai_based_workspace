/**
 * Thin HTTP proxy from Node.js → Python AI service.
 * Keeps AI dependencies isolated in the Python service.
 */

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

async function callAI<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${AI_SERVICE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(60_000), // 60s for LLM calls
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`AI service error (${res.status}): ${err}`);
  }

  return res.json() as Promise<T>;
}

// ─── 3a: Task Breakdown ───────────────────────────────────────────────────────
export interface GeneratedTask {
  title: string;
  description: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  estimated_hours?: number;
}

export interface TaskBreakdownResult {
  tasks: GeneratedTask[];
  summary: string;
}

export const breakdownFeature = (
  feature: string,
  projectContext?: string,
  count = 5
) =>
  callAI<TaskBreakdownResult>('/ai/task-breakdown', {
    feature,
    project_context: projectContext,
    count,
  });

// ─── 3b: Project Assistant ────────────────────────────────────────────────────
export interface AssistantMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AssistantResult {
  answer: string;
  suggestions: string[];
}

export const askAssistant = (
  question: string,
  projectName: string,
  tasks: Record<string, unknown>[],
  recentActivity: Record<string, unknown>[] = [],
  conversationHistory: AssistantMessage[] = []
) =>
  callAI<AssistantResult>('/ai/assistant', {
    question,
    project_name: projectName,
    tasks,
    recent_activity: recentActivity,
    conversation_history: conversationHistory,
  });

// ─── 3c: Meeting → Tasks ──────────────────────────────────────────────────────
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

export const processTranscript = (
  transcript: string,
  projectName: string,
  participants: string[] = []
) =>
  callAI<MeetingResult>('/ai/meeting-to-tasks', {
    transcript,
    project_name: projectName,
    participants,
  });

// ─── Task Enhancer ────────────────────────────────────────────────────────────
export interface EnhanceResult {
  description: string;
  acceptance_criteria: string[];
}

export const enhanceTask = (
  title: string,
  roughDescription?: string,
  projectContext?: string
) =>
  callAI<EnhanceResult>('/ai/enhance-task', {
    title,
    rough_description: roughDescription,
    project_context: projectContext,
  });

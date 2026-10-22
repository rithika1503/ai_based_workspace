// Shared TypeScript types for the frontend

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  members: WorkspaceMember[];
  _count?: { projects: number };
  createdAt: string;
}

export interface WorkspaceMember {
  id: string;
  userId: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';
  user: Pick<User, 'id' | 'name' | 'email' | 'avatar'>;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  workspaceId: string;
  createdById: string;
  createdBy: Pick<User, 'id' | 'name' | 'avatar'>;
  _count?: { tasks: number; members: number };
  createdAt: string;
}

export type TaskStatus = 'BACKLOG' | 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'DONE';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  order: number;
  projectId: string;
  assigneeId?: string;
  reporterId: string;
  dueDate?: string;
  assignee?: Pick<User, 'id' | 'name' | 'avatar'>;
  reporter: Pick<User, 'id' | 'name' | 'avatar'>;
  labels: { label: Label }[];
  _count?: { comments: number };
  comments?: Comment[];
  createdAt: string;
  updatedAt: string;
}

export interface Label {
  id: string;
  name: string;
  color: string;
  projectId: string;
}

export interface Comment {
  id: string;
  content: string;
  taskId: string;
  authorId: string;
  author: Pick<User, 'id' | 'name' | 'avatar'>;
  createdAt: string;
}

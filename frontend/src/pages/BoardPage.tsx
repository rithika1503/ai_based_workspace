import { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ArrowLeft, Plus, MessageSquare, Calendar, Flag } from 'lucide-react';
import api from '../services/api';
import type { Task, TaskStatus, TaskPriority } from '../types';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { useProjectEvents } from '../hooks/useProjectEvents';
import { usePresence } from '../hooks/usePresence';
import NotificationBell from '../components/NotificationBell';
import PresenceDots from '../components/PresenceDots';
import AITaskBreakdown from '../components/ai/AITaskBreakdown';
import AIAssistant from '../components/ai/AIAssistant';
import MeetingToTasks from '../components/ai/MeetingToTasks';

// ─── Constants ──────────────────────────────────────────────────────────────

const COLUMNS: { id: TaskStatus; label: string; color: string }[] = [
  { id: 'BACKLOG',     label: 'Backlog',      color: 'bg-surface-border' },
  { id: 'TODO',        label: 'Todo',         color: 'bg-pastel-blue' },
  { id: 'IN_PROGRESS', label: 'In Progress',  color: 'bg-pastel-purple' },
  { id: 'REVIEW',      label: 'Review',       color: 'bg-pastel-yellow' },
  { id: 'DONE',        label: 'Done',         color: 'bg-pastel-green' },
];

const PRIORITY_COLOR: Record<TaskPriority, string> = {
  LOW:    'bg-priority-low text-green-700',
  MEDIUM: 'bg-priority-medium text-blue-700',
  HIGH:   'bg-priority-high text-red-700',
  URGENT: 'bg-priority-urgent text-pink-700',
};

// ─── Task Card ───────────────────────────────────────────────────────────────

function TaskCard({ task, onClick }: { task: Task; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="task-card"
      onClick={onClick}
    >
      <p className="text-sm text-ink font-medium leading-snug mb-2">{task.title}</p>
      <div className="flex items-center justify-between flex-wrap gap-1">
        <span className={`badge text-[10px] ${PRIORITY_COLOR[task.priority]}`}>
          <Flag size={9} className="mr-0.5" /> {task.priority}
        </span>
        <div className="flex items-center gap-2 text-ink-soft">
          {task._count && task._count.comments > 0 && (
            <span className="flex items-center gap-0.5 text-xs">
              <MessageSquare size={11} /> {task._count.comments}
            </span>
          )}
          {task.dueDate && (
            <span className="flex items-center gap-0.5 text-xs">
              <Calendar size={11} /> {format(new Date(task.dueDate), 'MMM d')}
            </span>
          )}
          {task.assignee && (
            <div className="w-5 h-5 rounded-full bg-pastel-blue flex items-center justify-center text-[9px] font-medium text-blue-600">
              {task.assignee.name.charAt(0)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Column ──────────────────────────────────────────────────────────────────

function KanbanColumn({
  column,
  tasks,
  onTaskClick,
  onAddTask,
}: {
  column: typeof COLUMNS[number];
  tasks: Task[];
  onTaskClick: (t: Task) => void;
  onAddTask: (status: TaskStatus) => void;
}) {
  return (
    <div className="kanban-col">
      <div className="kanban-col-header">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${column.color}`} />
          <span className="text-xs font-semibold text-ink-muted uppercase tracking-wide">{column.label}</span>
          <span className="text-xs text-ink-soft">{tasks.length}</span>
        </div>
        <button
          onClick={() => onAddTask(column.id)}
          className="text-ink-soft hover:text-ink-muted transition-colors"
        >
          <Plus size={14} />
        </button>
      </div>

      <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-2 min-h-[60px]">
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} onClick={() => onTaskClick(task)} />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}

// ─── Task Detail Modal ───────────────────────────────────────────────────────

function TaskDetailModal({ task, onClose, projectId }: { task: Task; onClose: () => void; projectId: string }) {
  const [comment, setComment] = useState('');
  const qc = useQueryClient();

  const addComment = useMutation({
    mutationFn: () => api.post(`/comments/task/${task.id}`, { content: comment }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks', projectId] });
      setComment('');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed'),
  });

  const PRIORITY_LABELS: Record<TaskPriority, string> = {
    LOW: 'Low', MEDIUM: 'Medium', HIGH: 'High', URGENT: 'Urgent',
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal max-w-xl" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2 className="text-base font-semibold text-ink">{task.title}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className={`badge text-[10px] ${PRIORITY_COLOR[task.priority]}`}>{PRIORITY_LABELS[task.priority]}</span>
              <span className="badge badge-blue text-[10px]">{task.status.replace('_', ' ')}</span>
            </div>
          </div>
          <button onClick={onClose} className="btn-ghost btn-sm p-1">✕</button>
        </div>

        <div className="modal-body">
          {task.description && (
            <div>
              <p className="label mb-1">Description</p>
              <p className="text-sm text-ink-muted whitespace-pre-wrap">{task.description}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <p className="label">Assignee</p>
              <p className="text-ink">{task.assignee?.name || 'Unassigned'}</p>
            </div>
            <div>
              <p className="label">Reporter</p>
              <p className="text-ink">{task.reporter?.name}</p>
            </div>
            {task.dueDate && (
              <div>
                <p className="label">Due date</p>
                <p className="text-ink">{format(new Date(task.dueDate), 'PPP')}</p>
              </div>
            )}
          </div>

          {/* Comments */}
          <div>
            <p className="label mb-2">Comments</p>
            {task.comments && task.comments.length > 0 ? (
              <div className="space-y-2 mb-3">
                {task.comments.map((c) => (
                  <div key={c.id} className="bg-surface rounded p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <div className="w-5 h-5 rounded-full bg-pastel-purple flex items-center justify-center text-[9px] text-purple-600 font-medium">
                        {c.author.name.charAt(0)}
                      </div>
                      <span className="text-xs font-medium text-ink">{c.author.name}</span>
                      <span className="text-xs text-ink-soft">{format(new Date(c.createdAt), 'MMM d')}</span>
                    </div>
                    <p className="text-xs text-ink-muted">{c.content}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-ink-soft mb-3">No comments yet</p>
            )}
            <div className="flex gap-2">
              <input
                className="input text-xs"
                placeholder="Add a comment…"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && comment.trim() && addComment.mutate()}
              />
              <button
                className="btn-primary btn-sm"
                disabled={!comment.trim() || addComment.isPending}
                onClick={() => addComment.mutate()}
              >
                Post
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Create Task Modal ───────────────────────────────────────────────────────

function CreateTaskModal({
  status,
  projectId,
  onClose,
}: {
  status: TaskStatus;
  projectId: string;
  onClose: () => void;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('MEDIUM');
  const qc = useQueryClient();

  const createMutation = useMutation({
    mutationFn: () => api.post('/tasks', { title, description, projectId, priority, status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks', projectId] });
      onClose();
      toast.success('Task created');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed'),
  });

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="text-base font-semibold text-ink">New task</h2>
          <button onClick={onClose} className="btn-ghost btn-sm p-1">✕</button>
        </div>
        <div className="modal-body">
          <div>
            <label className="label">Title</label>
            <input
              id="task-title"
              className="input"
              placeholder="What needs to be done?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          </div>
          <div>
            <label className="label">Description <span className="text-ink-soft">(optional)</span></label>
            <textarea
              className="input resize-none"
              rows={2}
              placeholder="Add more details…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Priority</label>
            <select
              id="task-priority"
              className="input"
              value={priority}
              onChange={(e) => setPriority(e.target.value as TaskPriority)}
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button
            id="create-task-confirm"
            className="btn-primary"
            disabled={!title.trim() || createMutation.isPending}
            onClick={() => createMutation.mutate()}
          >
            {createMutation.isPending ? 'Creating…' : 'Create task'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Board Page ──────────────────────────────────────────────────────────────

export default function BoardPage() {
  const { workspaceId, projectId } = useParams<{ workspaceId: string; projectId: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [createStatus, setCreateStatus] = useState<TaskStatus | null>(null);
  const [showAISidebar, setShowAISidebar] = useState(false);

  // ── Real-time hooks ────────────────────────────────────────────────────────
  useProjectEvents(projectId);
  const { onlineUsers } = usePresence(projectId);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['tasks', projectId],
    queryFn: () => api.get(`/tasks?projectId=${projectId}`).then((r) => r.data.tasks as Task[]),
    enabled: !!projectId,
  });

  // ── Optimistic move ────────────────────────────────────────────────────────
  const moveTask = useMutation({
    mutationFn: ({ id, status, order }: { id: string; status: TaskStatus; order?: number }) =>
      api.patch(`/tasks/${id}/move`, { status, order }),
    onMutate: async ({ id, status, order }) => {
      // Cancel outgoing refetches to avoid overwriting optimistic update
      await qc.cancelQueries({ queryKey: ['tasks', projectId] });
      const previous = qc.getQueryData<Task[]>(['tasks', projectId]);
      // Optimistically apply the move
      qc.setQueryData<Task[]>(['tasks', projectId], (old = []) =>
        old.map((t) => t.id === id ? { ...t, status, order: order ?? t.order } : t)
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      // Rollback on failure
      if (ctx?.previous) qc.setQueryData(['tasks', projectId], ctx.previous);
      toast.error('Failed to move task — changes rolled back');
    },
    onSettled: () => {
      // The WS event will update cache; only invalidate if needed
    },
  });

  const getColumnTasks = useCallback(
    (status: TaskStatus) => tasks.filter((t) => t.status === status).sort((a, b) => a.order - b.order),
    [tasks]
  );

  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find((t) => t.id === event.active.id);
    if (task) setActiveTask(task);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);
    if (!over || active.id === over.id) return;

    const targetColumn = COLUMNS.find((c) => c.id === over.id);
    if (targetColumn) {
      const task = tasks.find((t) => t.id === active.id);
      if (task && task.status !== targetColumn.id) {
        moveTask.mutate({ id: task.id, status: targetColumn.id });
      }
      return;
    }

    const overTask = tasks.find((t) => t.id === over.id);
    const draggedTask = tasks.find((t) => t.id === active.id);
    if (overTask && draggedTask && overTask.status !== draggedTask.status) {
      moveTask.mutate({ id: draggedTask.id, status: overTask.status, order: overTask.order });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <p className="text-ink-muted text-sm">Loading board…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      {/* Header */}
      <header className="bg-surface-raised border-b border-surface-border px-6 py-3 flex items-center gap-3 flex-shrink-0">
        <button onClick={() => navigate(`/workspace/${workspaceId}`)} className="btn-ghost btn-sm p-1">
          <ArrowLeft size={16} />
        </button>
        <div className="w-7 h-7 bg-pastel-purple rounded flex items-center justify-center">
          <span className="text-purple-500 font-bold text-sm">B</span>
        </div>
        <span className="font-medium text-sm text-ink">Board</span>
        <span className="text-ink-soft text-sm">· {tasks.length} tasks</span>

        {/* Right side: presence + AI + notifications */}
        <div className="ml-auto flex items-center gap-3">
          <PresenceDots users={onlineUsers} />
          <button
            id="ai-sidebar-toggle"
            onClick={() => setShowAISidebar((s) => !s)}
            className={`btn-ghost btn-sm text-xs flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-colors ${
              showAISidebar ? 'bg-pastel-purple text-purple-600' : ''
            }`}
          >
            <span>✨</span> AI Tools
          </button>
          <NotificationBell />
        </div>
      </header>

      {/* Main content: AI sidebar + Kanban */}
      <div className="flex flex-1 overflow-hidden">
        {/* AI Sidebar */}
        {showAISidebar && (
          <aside className="w-80 flex-shrink-0 border-r border-surface-border overflow-y-auto p-4 bg-surface-raised">
            <p className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-3">✨ AI Tools</p>
            <AITaskBreakdown
              projectId={projectId!}
              onAccepted={() => qc.invalidateQueries({ queryKey: ['tasks', projectId] })}
            />
            <MeetingToTasks
              projectId={projectId!}
              onAccepted={() => qc.invalidateQueries({ queryKey: ['tasks', projectId] })}
            />
          </aside>
        )}

        {/* Kanban */}
        <div className="flex-1 overflow-x-auto p-6">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 h-full min-w-max">
            {COLUMNS.map((col) => (
              <KanbanColumn
                key={col.id}
                column={col}
                tasks={getColumnTasks(col.id)}
                onTaskClick={(task) => setSelectedTask(task)}
                onAddTask={(status) => setCreateStatus(status)}
              />
            ))}
          </div>

          <DragOverlay>
            {activeTask && (
              <div className="task-card opacity-90 rotate-1 shadow-md">
                <p className="text-sm text-ink font-medium">{activeTask.title}</p>
              </div>
            )}
          </DragOverlay>
        </DndContext>
        </div>
      </div>

      {/* Floating AI Assistant */}
      <AIAssistant projectId={projectId!} />

      {/* Task detail modal */}
      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          projectId={projectId!}
          onClose={() => setSelectedTask(null)}
        />
      )}

      {/* Create task modal */}
      {createStatus && (
        <CreateTaskModal
          status={createStatus}
          projectId={projectId!}
          onClose={() => setCreateStatus(null)}
        />
      )}
    </div>
  );
}

import { useState } from 'react';
import { Wand2, Plus, Check, X, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { generateBreakdown, acceptBreakdown, type GeneratedTask } from '../../services/ai';
import toast from 'react-hot-toast';

interface Props {
  projectId: string;
  onAccepted: () => void;
}

const PRIORITY_COLORS: Record<string, string> = {
  HIGH:   'text-red-500   bg-red-50   border-red-200',
  MEDIUM: 'text-amber-500 bg-amber-50 border-amber-200',
  LOW:    'text-green-500 bg-green-50 border-green-200',
};

export default function AITaskBreakdown({ projectId, onAccepted }: Props) {
  const [open, setOpen] = useState(false);
  const [feature, setFeature] = useState('');
  const [count, setCount] = useState(5);
  const [loading, setLoading] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [summary, setSummary] = useState('');
  const [tasks, setTasks] = useState<GeneratedTask[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [expanded, setExpanded] = useState<number | null>(null);

  const handleGenerate = async () => {
    if (!feature.trim()) return;
    setLoading(true);
    setTasks([]);
    setSummary('');
    try {
      const { data } = await generateBreakdown(projectId, feature, count);
      setTasks(data.tasks);
      setSummary(data.summary);
      setSelected(new Set(data.tasks.map((_, i) => i)));
    } catch {
      toast.error('AI generation failed. Check GEMINI_API_KEY in ai-service/.env');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    const selectedTasks = tasks.filter((_, i) => selected.has(i));
    if (!selectedTasks.length) return;
    setAccepting(true);
    try {
      await acceptBreakdown(projectId, selectedTasks);
      toast.success(`${selectedTasks.length} tasks created!`);
      setTasks([]);
      setFeature('');
      setSummary('');
      setSelected(new Set());
      onAccepted();
    } catch {
      toast.error('Failed to create tasks');
    } finally {
      setAccepting(false);
    }
  };

  const toggleSelect = (i: number) => {
    const next = new Set(selected);
    next.has(i) ? next.delete(i) : next.add(i);
    setSelected(next);
  };

  return (
    <div className="card mb-4">
      {/* Header */}
      <button
        id="ai-breakdown-toggle"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 px-4 py-3 text-left"
      >
        <div className="w-6 h-6 rounded bg-pastel-purple flex items-center justify-center flex-shrink-0">
          <Wand2 size={12} className="text-purple-600" />
        </div>
        <span className="text-sm font-medium text-ink">AI Task Breakdown</span>
        <span className="text-xs text-ink-soft ml-1">— Generate tasks from a feature description</span>
        <ChevronDown size={14} className={`ml-auto text-ink-muted transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="px-4 pb-4 border-t border-surface-border pt-3 space-y-3">
          {/* Input */}
          <div className="flex gap-2">
            <input
              id="ai-feature-input"
              className="input flex-1 text-sm"
              placeholder='e.g. "Build user authentication with OAuth"'
              value={feature}
              onChange={(e) => setFeature(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
            />
            <select
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="input w-20 text-sm"
            >
              {[3, 4, 5, 6, 7, 8].map((n) => (
                <option key={n} value={n}>{n} tasks</option>
              ))}
            </select>
            <button
              id="ai-generate-btn"
              onClick={handleGenerate}
              disabled={!feature.trim() || loading}
              className="btn-primary text-sm flex items-center gap-1.5"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}
              {loading ? 'Generating…' : 'Generate'}
            </button>
          </div>

          {/* Summary */}
          {summary && (
            <p className="text-xs text-ink-muted bg-pastel-purple/30 rounded px-3 py-2 italic">
              {summary}
            </p>
          )}

          {/* Generated Tasks */}
          {tasks.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-ink-muted">
                  {selected.size}/{tasks.length} tasks selected
                </span>
                <div className="flex gap-2">
                  <button onClick={() => setSelected(new Set(tasks.map((_, i) => i)))} className="text-xs text-accent hover:underline">All</button>
                  <button onClick={() => setSelected(new Set())} className="text-xs text-ink-soft hover:underline">None</button>
                </div>
              </div>

              {tasks.map((task, i) => (
                <div
                  key={i}
                  className={`rounded-lg border p-3 cursor-pointer transition-colors ${
                    selected.has(i) ? 'border-accent-light bg-accent-light/20' : 'border-surface-border bg-surface'
                  }`}
                  onClick={() => toggleSelect(i)}
                >
                  <div className="flex items-start gap-2">
                    <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      selected.has(i) ? 'bg-accent border-accent' : 'border-surface-border'
                    }`}>
                      {selected.has(i) && <Check size={10} className="text-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-ink">{task.title}</span>
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${PRIORITY_COLORS[task.priority]}`}>
                          {task.priority}
                        </span>
                        {task.estimated_hours && (
                          <span className="text-[10px] text-ink-soft">~{task.estimated_hours}h</span>
                        )}
                        <button
                          onClick={(e) => { e.stopPropagation(); setExpanded(expanded === i ? null : i); }}
                          className="ml-auto text-ink-soft hover:text-ink"
                        >
                          {expanded === i ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        </button>
                      </div>
                      {expanded === i && (
                        <p className="text-xs text-ink-muted mt-1.5 leading-relaxed">{task.description}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {/* Accept */}
              <div className="flex justify-end gap-2 pt-1">
                <button onClick={() => { setTasks([]); setSummary(''); }} className="btn-ghost btn-sm flex items-center gap-1 text-xs">
                  <X size={12} /> Discard
                </button>
                <button
                  id="ai-accept-tasks-btn"
                  onClick={handleAccept}
                  disabled={!selected.size || accepting}
                  className="btn-primary text-xs flex items-center gap-1.5"
                >
                  {accepting ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                  {accepting ? 'Creating…' : `Create ${selected.size} task${selected.size !== 1 ? 's' : ''}`}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

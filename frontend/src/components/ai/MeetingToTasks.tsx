import { useState } from 'react';
import { FileText, Loader2, Check, X, Plus, Users } from 'lucide-react';
import { processMeeting, acceptMeetingTasks, type MeetingTask } from '../../services/ai';
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

const SAMPLE_TRANSCRIPT = `Alice: We need to finish the payment integration by next Friday.
Bob: I'll handle the Stripe webhook setup. Should take about 2 days.
Alice: Great. Also, we need to write unit tests for the auth module before merging.
Charlie: I can do the tests — I'll aim to finish by Wednesday.
Alice: Decided: we'll use PostgreSQL for the session store instead of Redis for now.
Bob: One more thing — we need to update the API documentation for the new endpoints.
Alice: Agreed, Bob can you do that after the webhook work?
Bob: Sure, I'll have it done by end of next week.`;

export default function MeetingToTasks({ projectId, onAccepted }: Props) {
  const [open, setOpen] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [participants, setParticipants] = useState('');
  const [loading, setLoading] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [result, setResult] = useState<{
    action_items: MeetingTask[];
    decisions: string[];
    summary: string;
  } | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const handleProcess = async () => {
    if (!transcript.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const participantList = participants.split(',').map((p) => p.trim()).filter(Boolean);
      const { data } = await processMeeting(projectId, transcript, participantList);
      setResult(data);
      setSelected(new Set(data.action_items.map((_, i) => i)));
    } catch {
      toast.error('Failed to process meeting. Check GEMINI_API_KEY.');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!result) return;
    const selectedTasks = result.action_items.filter((_, i) => selected.has(i));
    setAccepting(true);
    try {
      await acceptMeetingTasks(projectId, selectedTasks);
      toast.success(`${selectedTasks.length} action items created as tasks!`);
      setResult(null);
      setTranscript('');
      setParticipants('');
      setOpen(false);
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
        id="meeting-to-tasks-toggle"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 px-4 py-3 text-left"
      >
        <div className="w-6 h-6 rounded bg-pastel-green flex items-center justify-center flex-shrink-0">
          <FileText size={12} className="text-green-600" />
        </div>
        <span className="text-sm font-medium text-ink">Meeting → Tasks</span>
        <span className="text-xs text-ink-soft ml-1">— Extract action items from a transcript</span>
        <span className={`ml-auto text-ink-muted transition-transform ${open ? 'rotate-180' : ''}`}>▾</span>
      </button>

      {open && (
        <div className="px-4 pb-4 border-t border-surface-border pt-3 space-y-3">
          {!result ? (
            <>
              {/* Participants */}
              <div>
                <label className="label">Participants (comma-separated)</label>
                <input
                  className="input w-full text-sm"
                  placeholder="Alice, Bob, Charlie"
                  value={participants}
                  onChange={(e) => setParticipants(e.target.value)}
                />
              </div>

              {/* Transcript */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="label">Meeting Transcript</label>
                  <button
                    onClick={() => setTranscript(SAMPLE_TRANSCRIPT)}
                    className="text-[10px] text-accent hover:underline"
                  >
                    Load sample
                  </button>
                </div>
                <textarea
                  id="meeting-transcript-input"
                  className="input w-full text-sm resize-none"
                  rows={6}
                  placeholder="Paste your meeting transcript here…"
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                />
              </div>

              <button
                id="meeting-process-btn"
                onClick={handleProcess}
                disabled={!transcript.trim() || loading}
                className="btn-primary w-full flex items-center justify-center gap-2 text-sm"
              >
                {loading ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
                {loading ? 'Extracting action items…' : 'Extract Action Items'}
              </button>
            </>
          ) : (
            <div className="space-y-3">
              {/* Summary */}
              <div className="bg-pastel-green/30 rounded-lg px-3 py-2">
                <p className="text-xs text-ink-muted italic">{result.summary}</p>
              </div>

              {/* Decisions */}
              {result.decisions.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-ink mb-1.5">Decisions made</p>
                  <ul className="space-y-1">
                    {result.decisions.map((d, i) => (
                      <li key={i} className="text-xs text-ink-muted flex items-start gap-1.5">
                        <span className="text-green-500 mt-0.5">✓</span> {d}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Action Items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-ink">Action Items ({result.action_items.length})</p>
                  <span className="text-xs text-ink-soft">{selected.size} selected</span>
                </div>
                <div className="space-y-2">
                  {result.action_items.map((task, i) => (
                    <div
                      key={i}
                      onClick={() => toggleSelect(i)}
                      className={`rounded-lg border p-2.5 cursor-pointer transition-colors ${
                        selected.has(i) ? 'border-accent-light bg-accent-light/20' : 'border-surface-border'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 mt-0.5 ${
                          selected.has(i) ? 'bg-accent border-accent' : 'border-surface-border'
                        }`}>
                          {selected.has(i) && <Check size={10} className="text-white" />}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-medium text-ink">{task.title}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded border ${PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.MEDIUM}`}>
                              {task.priority}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 mt-1">
                            {task.assignee_name && (
                              <span className="text-[10px] text-ink-soft flex items-center gap-0.5">
                                <Users size={9} /> {task.assignee_name}
                              </span>
                            )}
                            {task.due_date && (
                              <span className="text-[10px] text-ink-soft">Due {task.due_date}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 justify-end">
                <button onClick={() => setResult(null)} className="btn-ghost btn-sm text-xs flex items-center gap-1">
                  <X size={12} /> Back
                </button>
                <button
                  id="meeting-accept-btn"
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

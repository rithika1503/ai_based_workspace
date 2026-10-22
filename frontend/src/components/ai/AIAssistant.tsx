import { useState, useRef, useEffect } from 'react';
import { Bot, Send, X, Loader2, Lightbulb } from 'lucide-react';
import { askChat, type ChatMessage } from '../../services/ai';
import toast from 'react-hot-toast';

interface Props {
  projectId: string;
}

const SUGGESTIONS = [
  'What should I work on today?',
  'What is blocking the project?',
  'Summarize overall project status',
  'Which tasks are overdue?',
  'What are the high priority items?',
];

export default function AIAssistant({ projectId }: Props) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const send = async (question: string) => {
    if (!question.trim() || loading) return;
    const userMsg: ChatMessage = { role: 'user', content: question };
    setMessages((m) => [...m, userMsg]);
    setInput('');
    setSuggestions([]);
    setLoading(true);

    try {
      const { data } = await askChat(projectId, question, messages);
      const assistantMsg: ChatMessage = { role: 'assistant', content: data.answer };
      setMessages((m) => [...m, assistantMsg]);
      setSuggestions(data.suggestions || []);
    } catch {
      toast.error('AI assistant failed. Check API key.');
      setMessages((m) => [...m, { role: 'assistant', content: '⚠️ Failed to get response. Check your GEMINI_API_KEY.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating button */}
      <button
        id="ai-assistant-toggle"
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 w-12 h-12 rounded-full bg-accent shadow-lg flex items-center justify-center hover:bg-accent/90 transition-all hover:scale-105 z-40"
        title="AI Assistant"
      >
        <Bot size={20} className="text-white" />
      </button>

      {/* Panel */}
      {open && (
        <div className="fixed bottom-20 right-6 w-96 max-h-[70vh] card shadow-modal flex flex-col z-50">
          {/* Header */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-surface-border flex-shrink-0">
            <div className="w-6 h-6 rounded bg-pastel-purple flex items-center justify-center">
              <Bot size={12} className="text-purple-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-ink">AI Project Assistant</p>
              <p className="text-[10px] text-ink-soft">Ask about your project</p>
            </div>
            <div className="ml-auto flex gap-1">
              {messages.length > 0 && (
                <button onClick={() => { setMessages([]); setSuggestions([]); }} className="btn-ghost btn-sm p-1 text-xs text-ink-soft">
                  Clear
                </button>
              )}
              <button onClick={() => setOpen(false)} className="btn-ghost btn-sm p-1">
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
            {messages.length === 0 && (
              <div className="space-y-2">
                <p className="text-xs text-ink-muted text-center mb-3">
                  Ask me anything about your project
                </p>
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="w-full text-left text-xs text-ink-muted bg-surface hover:bg-pastel-purple/30 rounded-lg px-3 py-2 transition-colors border border-surface-border"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-accent text-white rounded-br-none'
                    : 'bg-surface border border-surface-border text-ink rounded-bl-none'
                }`}>
                  {m.content}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-surface border border-surface-border rounded-2xl rounded-bl-none px-3 py-2">
                  <Loader2 size={14} className="animate-spin text-ink-muted" />
                </div>
              </div>
            )}

            {/* AI suggestions */}
            {suggestions.length > 0 && !loading && (
              <div className="space-y-1">
                <p className="text-[10px] text-ink-soft flex items-center gap-1">
                  <Lightbulb size={10} /> Suggestions
                </p>
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => send(s)}
                    className="w-full text-left text-xs text-accent bg-accent-light/30 hover:bg-accent-light/60 rounded-lg px-2 py-1.5 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="px-3 py-3 border-t border-surface-border flex-shrink-0">
            <div className="flex gap-2">
              <input
                id="ai-chat-input"
                className="input flex-1 text-xs"
                placeholder="Ask anything about this project…"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && send(input)}
                disabled={loading}
              />
              <button
                id="ai-chat-send"
                onClick={() => send(input)}
                disabled={!input.trim() || loading}
                className="btn-primary p-2"
              >
                <Send size={14} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

import { useState, useRef, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { useNotifications } from '../hooks/useNotifications';
import { format } from 'date-fns';

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const ICON_MAP: Record<string, string> = {
    TASK_ASSIGNED: '📋',
    COMMENT_ADDED: '💬',
    MENTIONED: '@',
    DEADLINE_APPROACHING: '⏰',
  };

  return (
    <div className="relative" ref={ref}>
      {/* Bell button */}
      <button
        id="notification-bell"
        onClick={() => setOpen((o) => !o)}
        className="btn-ghost btn-sm relative p-2"
      >
        <Bell size={16} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-accent text-white text-[9px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-9 w-80 card shadow-modal z-50">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-surface-border">
            <span className="text-sm font-semibold text-ink">Notifications</span>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs text-accent hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-surface-border">
            {notifications.length === 0 ? (
              <div className="px-4 py-6 text-center text-xs text-ink-soft">
                No notifications yet
              </div>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => !n.read && markRead(n.id)}
                  className={`w-full text-left px-4 py-3 hover:bg-surface flex items-start gap-3 transition-colors ${
                    !n.read ? 'bg-accent-light/40' : ''
                  }`}
                >
                  <span className="text-base mt-0.5 flex-shrink-0">
                    {ICON_MAP[n.type] ?? '🔔'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-medium text-ink ${!n.read ? 'font-semibold' : ''}`}>
                      {n.title}
                    </p>
                    <p className="text-xs text-ink-muted mt-0.5 truncate">{n.message}</p>
                    <p className="text-[10px] text-ink-soft mt-1">
                      {format(new Date(n.createdAt), 'MMM d, h:mm a')}
                    </p>
                  </div>
                  {!n.read && (
                    <span className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0 mt-1.5" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

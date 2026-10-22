interface PresenceUser {
  userId: string;
  name: string;
  avatar: string | null;
}

interface PresenceDotsProps {
  users: PresenceUser[];
  max?: number;
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

const COLORS = [
  'bg-pastel-blue text-blue-600',
  'bg-pastel-purple text-purple-600',
  'bg-pastel-green text-green-600',
  'bg-pastel-yellow text-yellow-600',
  'bg-pastel-pink text-pink-600',
];

export default function PresenceDots({ users, max = 5 }: PresenceDotsProps) {
  const visible = users.slice(0, max);
  const extra = users.length - max;

  if (users.length === 0) return null;

  return (
    <div className="flex items-center gap-1">
      <div className="flex -space-x-1.5">
        {visible.map((u, i) => (
          <div
            key={u.userId}
            title={u.name}
            className={`relative w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-semibold border-2 border-white ${
              COLORS[i % COLORS.length]
            }`}
          >
            {u.avatar ? (
              <img src={u.avatar} alt={u.name} className="w-full h-full rounded-full object-cover" />
            ) : (
              getInitials(u.name)
            )}
            {/* Online dot */}
            <span className="absolute bottom-0 right-0 w-2 h-2 bg-green-400 rounded-full border border-white" />
          </div>
        ))}
        {extra > 0 && (
          <div className="w-7 h-7 rounded-full bg-surface-border flex items-center justify-center text-[10px] font-medium text-ink-muted border-2 border-white">
            +{extra}
          </div>
        )}
      </div>
      <span className="text-xs text-ink-soft ml-1">
        {users.length === 1 ? '1 online' : `${users.length} online`}
      </span>
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';
import { getSocket } from '../services/socket';

interface PresenceUser {
  userId: string;
  name: string;
  avatar: string | null;
}

/**
 * Tracks online users in a project room.
 * - Emits HEARTBEAT every 15s to keep Redis presence key alive
 * - Listens for PRESENCE_UPDATE, USER_JOINED, USER_LEFT
 */
export function usePresence(projectId: string | undefined) {
  const [onlineUsers, setOnlineUsers] = useState<PresenceUser[]>([]);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!projectId) return;

    let socket: ReturnType<typeof getSocket>;
    try {
      socket = getSocket();
    } catch {
      return;
    }

    const onPresenceUpdate = (envelope: { payload: PresenceUser[] }) => {
      setOnlineUsers(envelope.payload ?? []);
    };

    socket.on('PRESENCE_UPDATE', onPresenceUpdate);

    // Heartbeat every 15s — refreshes Redis TTL (30s) so user stays online
    heartbeatRef.current = setInterval(() => {
      socket.emit('HEARTBEAT', { projectId });
    }, 15_000);

    return () => {
      socket.off('PRESENCE_UPDATE', onPresenceUpdate);
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    };
  }, [projectId]);

  return { onlineUsers };
}

import { useEffect, useRef } from 'react';
import { useAuthStore } from '../store/authStore';
import { connectSocket, disconnectSocket, getSocket } from '../services/socket';

/**
 * Connects socket on mount (using stored access token), disconnects on logout/unmount.
 * Call once at the app root level (App.tsx) when user is authenticated.
 */
export function useSocket() {
  const { user, accessToken } = useAuthStore();
  const initialized = useRef(false);

  useEffect(() => {
    if (!user || !accessToken) {
      disconnectSocket();
      initialized.current = false;
      return;
    }

    if (!initialized.current) {
      connectSocket(accessToken);
      initialized.current = true;
    }

    return () => {
      // Don't disconnect on every re-render — only when user logs out
    };
  }, [user, accessToken]);
}

export { getSocket };

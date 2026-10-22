// All WebSocket event name constants — single source of truth

// Client → Server
export const WS_JOIN_PROJECT = 'JOIN_PROJECT';
export const WS_LEAVE_PROJECT = 'LEAVE_PROJECT';
export const WS_VIEWING_TASK = 'VIEWING_TASK';
export const WS_HEARTBEAT = 'HEARTBEAT';

// Server → Client: task events (broadcast to project room)
export const WS_TASK_CREATED = 'TASK_CREATED';
export const WS_TASK_UPDATED = 'TASK_UPDATED';
export const WS_TASK_MOVED = 'TASK_MOVED';
export const WS_TASK_DELETED = 'TASK_DELETED';

// Server → Client: comment events
export const WS_COMMENT_CREATED = 'COMMENT_CREATED';

// Server → Client: presence events
export const WS_USER_JOINED = 'USER_JOINED';
export const WS_USER_LEFT = 'USER_LEFT';
export const WS_PRESENCE_UPDATE = 'PRESENCE_UPDATE';

// Server → Client: personal notification
export const WS_NOTIFICATION_CREATED = 'NOTIFICATION_CREATED';

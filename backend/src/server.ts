import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';

import { errorHandler } from './middleware/errorHandler';
import authRoutes from './modules/auth/auth.routes';
import workspaceRoutes from './modules/workspaces/workspace.routes';
import projectRoutes from './modules/projects/project.routes';
import taskRoutes from './modules/tasks/task.routes';
import commentRoutes from './modules/comments/comment.routes';
import userRoutes from './modules/users/user.routes';
import notificationRoutes from './modules/notifications/notification.routes';
import aiRoutes from './modules/ai/ai.routes';
import { initSocketServer } from './infrastructure/socket.server';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(helmet());
app.use(morgan('dev'));
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use('/auth', authRoutes);
app.use('/users', userRoutes);
app.use('/workspaces', workspaceRoutes);
app.use('/projects', projectRoutes);
app.use('/tasks', taskRoutes);
app.use('/comments', commentRoutes);
app.use('/notifications', notificationRoutes);
app.use('/ai', aiRoutes);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Error Handler ────────────────────────────────────────────────────────────
app.use(errorHandler);

// ─── Start server with Socket.IO ──────────────────────────────────────────────
initSocketServer(app).then((httpServer) => {
  httpServer.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
}).catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

export default app;

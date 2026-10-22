import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import {
  generateTaskBreakdown,
  acceptGeneratedTasks,
  chat,
  meetingToTasks,
  acceptMeetingTasks,
  enhance,
} from './ai.controller';

const router = Router();
router.use(authenticate);

// 3a — Task breakdown
router.post('/breakdown',        generateTaskBreakdown);
router.post('/breakdown/accept', acceptGeneratedTasks);

// 3b — Project assistant chat
router.post('/chat',             chat);

// 3c — Meeting → Tasks
router.post('/meeting',          meetingToTasks);
router.post('/meeting/accept',   acceptMeetingTasks);

// Task enhancer
router.post('/enhance',          enhance);

export default router;

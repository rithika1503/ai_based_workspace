import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { getNotifications, markRead, markAllRead } from './notification.controller';

const router = Router();

router.use(authenticate);

router.get('/', getNotifications);
router.patch('/:id/read', markRead);
router.patch('/read-all', markAllRead);

export default router;

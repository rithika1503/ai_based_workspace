import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import * as commentController from './comment.controller';

const router = Router();
router.use(authenticate);

// Mounted under /comments
router.get('/task/:taskId', commentController.getComments);
router.post('/task/:taskId', commentController.createComment);
router.delete('/:id', commentController.deleteComment);

export default router;

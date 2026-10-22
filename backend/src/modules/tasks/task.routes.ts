import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import * as taskController from './task.controller';

const router = Router();
router.use(authenticate);

router.get('/', taskController.getTasks);
router.post('/', taskController.createTask);
router.get('/:id', taskController.getTask);
router.put('/:id', taskController.updateTask);
router.patch('/:id/move', taskController.moveTask);
router.delete('/:id', taskController.deleteTask);

export default router;

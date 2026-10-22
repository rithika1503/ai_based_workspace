import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import * as projectController from './project.controller';

const router = Router();
router.use(authenticate);

router.get('/', projectController.getProjects);
router.post('/', projectController.createProject);
router.get('/:id', projectController.getProject);
router.put('/:id', projectController.updateProject);
router.delete('/:id', projectController.deleteProject);

export default router;

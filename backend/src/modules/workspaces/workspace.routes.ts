import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import * as workspaceController from './workspace.controller';

const router = Router();

router.use(authenticate);

router.get('/', workspaceController.getWorkspaces);
router.post('/', workspaceController.createWorkspace);
router.get('/:id', workspaceController.getWorkspace);
router.post('/:id/invite', workspaceController.inviteMember);
router.delete('/:id/members/:userId', workspaceController.removeMember);

export default router;

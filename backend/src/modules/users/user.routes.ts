import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import * as userController from './user.controller';

const router = Router();
router.use(authenticate);

router.get('/me', userController.getMe);
router.patch('/me', userController.updateMe);

export default router;

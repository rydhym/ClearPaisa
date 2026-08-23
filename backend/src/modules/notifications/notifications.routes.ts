import { Router } from 'express';
import { NotificationsController } from './notifications.controller';
import { authenticateJWT } from '../../shared/middleware/auth';

const router = Router();
const controller = new NotificationsController();

router.use(authenticateJWT);

router.get('/', (req, res) => controller.getNotifications(req, res));
router.patch('/:id/read', (req, res) => controller.markRead(req, res));

export default router;

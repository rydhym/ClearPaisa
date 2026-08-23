import { Router } from 'express';
import { SubscriptionsController } from './subscriptions.controller';
import { authenticateJWT } from '../../shared/middleware/auth';

const router = Router();
const controller = new SubscriptionsController();

router.use(authenticateJWT);

router.get('/', (req, res) => controller.getSubs(req, res));
router.post('/', (req, res) => controller.createSub(req, res));
router.post('/detect', (req, res) => controller.runDetection(req, res));
router.delete('/:id', (req, res) => controller.deleteSub(req, res));

export default router;

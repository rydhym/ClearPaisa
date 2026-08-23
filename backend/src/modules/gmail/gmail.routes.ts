import { Router } from 'express';
import { GmailController } from './gmail.controller';
import { authenticateJWT } from '../../shared/middleware/auth';

const router = Router();
const controller = new GmailController();

router.use(authenticateJWT);

router.post('/sync', (req, res) => controller.sync(req, res));
router.get('/auth-url', (req, res) => controller.getAuthUrl(req, res));

export default router;

import { Router } from 'express';
import { AIController } from './ai.controller';
import { authenticateJWT } from '../../shared/middleware/auth';

const router = Router();
const controller = new AIController();

router.use(authenticateJWT);

router.post('/ask', (req, res) => controller.ask(req, res));

export default router;

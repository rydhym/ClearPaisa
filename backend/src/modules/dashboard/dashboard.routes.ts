import { Router } from 'express';
import { DashboardController } from './dashboard.controller';
import { authenticateJWT } from '../../shared/middleware/auth';

const router = Router();
const controller = new DashboardController();

router.use(authenticateJWT);

router.get('/', (req, res) => controller.getDashboard(req, res));

export default router;

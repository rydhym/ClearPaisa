import { Router } from 'express';
import { AccountAggregatorController } from './accountAggregator.controller';
import { authenticateJWT } from '../../shared/middleware/auth';

const router = Router();
const controller = new AccountAggregatorController();

router.use(authenticateJWT);

router.post('/initiate', (req, res) => controller.initiate(req, res));
router.post('/sandbox/approve', (req, res) => controller.approveSandbox(req, res));
router.post('/sync', (req, res) => controller.sync(req, res));
router.get('/accounts', (req, res) => controller.getAccounts(req, res));

export default router;

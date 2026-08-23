import { Router } from 'express';
import { BudgetsController } from './budgets.controller';
import { authenticateJWT } from '../../shared/middleware/auth';

const router = Router();
const controller = new BudgetsController();

router.use(authenticateJWT);

router.get('/', (req, res) => controller.getBudgets(req, res));
router.post('/', (req, res) => controller.upsertBudget(req, res));

export default router;

import { Router } from 'express';
import { UsersController } from './users.controller';
import { authenticateJWT } from '../../shared/middleware/auth';

const router = Router();
const controller = new UsersController();

router.use(authenticateJWT);

router.get('/consents', (req, res) => controller.getConsents(req, res));
router.post('/consents/:id/revoke', (req, res) => controller.revokeConsent(req, res));
router.get('/export', (req, res) => controller.exportData(req, res));
router.delete('/delete', (req, res) => controller.deleteAccount(req, res));

export default router;

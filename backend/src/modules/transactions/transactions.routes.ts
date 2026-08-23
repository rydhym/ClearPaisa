import { Router } from 'express';
import { TransactionsController } from './transactions.controller';
import { authenticateJWT } from '../../shared/middleware/auth';
import { upload } from '../../shared/middleware/upload';

const router = Router();
const controller = new TransactionsController();

router.use(authenticateJWT);

router.get('/', (req, res) => controller.getTransactions(req, res));
router.post('/manual', (req, res) => controller.createManual(req, res));
router.post('/upload-csv', upload.single('file'), (req, res) => controller.uploadCsv(req, res));
router.post('/upload-pdf', upload.single('file'), (req, res) => controller.uploadPdf(req, res));
router.patch('/:id', (req, res) => controller.updateTransaction(req, res));
router.delete('/:id', (req, res) => controller.deleteTransaction(req, res));

export default router;

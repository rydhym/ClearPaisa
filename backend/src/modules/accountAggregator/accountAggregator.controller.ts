import { Response } from 'express';
import { AuthRequest } from '../../shared/middleware/auth';
import { AccountAggregatorService } from './accountAggregator.service';
import { TransactionEngine } from '../transactions/transaction.engine';

const aaService = new AccountAggregatorService();
const txEngine = new TransactionEngine();

export class AccountAggregatorController {
  
  async initiate(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const { mobileNumber } = req.body;
      if (!mobileNumber) return res.status(400).json({ error: 'Mobile number is required' });

      const result = await aaService.initiateConsent(userId, mobileNumber);
      return res.status(200).json(result);
    } catch (e: any) {
      return res.status(500).json({ error: e.message || 'Failed to initiate consent' });
    }
  }

  async status(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });
      const consent = await aaService.refreshConsentStatus(userId, req.params.consentId);
      return res.status(200).json(consent);
    } catch (e: any) {
      return res.status(500).json({ error: e.message || 'Failed to refresh consent status' });
    }
  }

  async sync(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      // 1. Fetch transactions from Setu
      const transactions = await aaService.fetchTransactions(userId);
      
      // 2. Feed into Transaction Engine to merge/deduplicate and save
      const mergeResult = await txEngine.processAndMergeTransactions(userId, transactions);
      
      // 3. Log sync result
      await aaService.sync(userId);

      return res.status(200).json({
        message: 'Account Aggregator transactions synced successfully',
        transactionsCount: transactions.length,
        ...mergeResult
      });
    } catch (e: any) {
      return res.status(500).json({ error: e.message || 'Failed to sync transactions' });
    }
  }

  async getAccounts(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const accounts = await aaService.fetchAccounts(userId);
      return res.status(200).json(accounts);
    } catch (e: any) {
      return res.status(500).json({ error: e.message || 'Failed to retrieve accounts' });
    }
  }
}

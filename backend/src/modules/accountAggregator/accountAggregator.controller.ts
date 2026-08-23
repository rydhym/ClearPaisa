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

      const { bankId } = req.body;
      if (!bankId) return res.status(400).json({ error: 'Bank ID is required' });

      const result = await aaService.initiateConsent(userId, bankId);
      return res.status(200).json(result);
    } catch (e: any) {
      return res.status(500).json({ error: e.message || 'Failed to initiate consent' });
    }
  }

  async approveSandbox(req: AuthRequest, res: Response) {
    try {
      const { consentId } = req.body;
      if (!consentId) return res.status(400).json({ error: 'Consent ID is required' });

      const updatedConsent = await aaService.approveConsentSandbox(consentId);
      return res.status(200).json({
        message: 'Consent approved in Sandbox successfully. Mock bank accounts loaded.',
        consent: updatedConsent
      });
    } catch (e: any) {
      return res.status(500).json({ error: e.message || 'Failed to approve consent' });
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

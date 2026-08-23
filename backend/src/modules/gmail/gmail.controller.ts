import { Response } from 'express';
import { AuthRequest } from '../../shared/middleware/auth';
import { GmailService } from './gmail.service';
import { TransactionEngine } from '../transactions/transaction.engine';

const gmailService = new GmailService();
const txEngine = new TransactionEngine();

export class GmailController {
  
  async sync(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      // 1. Sync messages from Mail API (saves parsed EmailMessage objects)
      const syncResult = await gmailService.sync(userId);
      if (!syncResult.success) {
        return res.status(400).json({ error: syncResult.error });
      }

      // 2. Read transactions from all parsed EmailMessages
      const transactions = await gmailService.fetchTransactions(userId);

      // 3. Feed to Transaction Engine to merge/deduplicate and save
      const mergeResult = await txEngine.processAndMergeTransactions(userId, transactions);

      return res.status(200).json({
        message: 'Gmail transactions synced successfully',
        parsedEmailsCount: transactions.length,
        ...mergeResult
      });
    } catch (e: any) {
      return res.status(500).json({ error: e.message || 'Gmail sync failed' });
    }
  }

  // Google OAuth URL generation helper
  async getAuthUrl(req: AuthRequest, res: Response) {
    try {
      const googleClientId = process.env.GOOGLE_CLIENT_ID;
      const callbackUrl = process.env.GOOGLE_CALLBACK_URL;
      
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${googleClientId}&` +
        `redirect_uri=${encodeURIComponent(callbackUrl || '')}&` +
        `response_type=code&` +
        `scope=https://www.googleapis.com/auth/gmail.readonly&` +
        `access_type=offline&` +
        `prompt=consent`;

      return res.status(200).json({ authUrl });
    } catch (e: any) {
      return res.status(500).json({ error: e.message || 'Failed to generate OAuth URL' });
    }
  }
}

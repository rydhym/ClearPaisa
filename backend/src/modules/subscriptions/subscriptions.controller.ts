import { Response } from 'express';
import { AuthRequest } from '../../shared/middleware/auth';
import { SubscriptionsService } from './subscriptions.service';

const subsService = new SubscriptionsService();

export class SubscriptionsController {
  async getSubs(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const subs = await subsService.getSubscriptions(userId);
      return res.status(200).json(subs);
    } catch (e: any) {
      return res.status(500).json({ error: e.message || 'Failed to fetch subscriptions' });
    }
  }

  async createSub(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const { name, amount, billingCycle, nextBillingDate } = req.body;
      if (!name || amount === undefined || !billingCycle || !nextBillingDate) {
        return res.status(400).json({ error: 'All fields (name, amount, billingCycle, nextBillingDate) are required' });
      }

      const sub = await subsService.createSubscriptionManual(
        userId,
        name,
        parseFloat(amount),
        billingCycle,
        new Date(nextBillingDate)
      );

      return res.status(201).json(sub);
    } catch (e: any) {
      return res.status(500).json({ error: e.message || 'Failed to create subscription' });
    }
  }

  async runDetection(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const result = await subsService.autoDetectSubscriptions(userId);
      return res.status(200).json(result);
    } catch (e: any) {
      return res.status(500).json({ error: e.message || 'Failed to run subscription auto-detection' });
    }
  }

  async deleteSub(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const { id } = req.params;
      await subsService.deleteSubscription(userId, id);
      return res.status(200).json({ message: 'Subscription removed successfully' });
    } catch (e: any) {
      return res.status(500).json({ error: e.message || 'Failed to remove subscription' });
    }
  }
}

import { Response } from 'express';
import { AuthRequest } from '../../shared/middleware/auth';
import { BudgetsService } from './budgets.service';

const budgetsService = new BudgetsService();

export class BudgetsController {
  async getBudgets(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const budgets = await budgetsService.getBudgets(userId);
      return res.status(200).json(budgets);
    } catch (e: any) {
      return res.status(500).json({ error: e.message || 'Failed to fetch budgets' });
    }
  }

  async upsertBudget(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const { category, amount } = req.body;
      if (!category || amount === undefined) {
        return res.status(400).json({ error: 'Category and amount are required' });
      }

      const budget = await budgetsService.createOrUpdateBudget(userId, category, parseFloat(amount));
      return res.status(200).json({
        message: 'Budget saved successfully',
        budget
      });
    } catch (e: any) {
      return res.status(500).json({ error: e.message || 'Failed to update budget' });
    }
  }
}

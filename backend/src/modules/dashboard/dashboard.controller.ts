import { Response } from 'express';
import { AuthRequest } from '../../shared/middleware/auth';
import { DashboardService } from './dashboard.service';

const dashboardService = new DashboardService();

export class DashboardController {
  async getDashboard(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const data = await dashboardService.getDashboardData(userId);
      return res.status(200).json(data);
    } catch (e: any) {
      return res.status(500).json({ error: e.message || 'Failed to generate dashboard data' });
    }
  }
}

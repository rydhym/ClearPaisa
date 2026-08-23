import { Response } from 'express';
import { AuthRequest } from '../../shared/middleware/auth';
import prisma from '../../shared/utils/db';

export class NotificationsController {
  async getNotifications(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const notifications = await prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' }
      });

      return res.status(200).json(notifications);
    } catch (e: any) {
      return res.status(500).json({ error: e.message || 'Failed to fetch notifications' });
    }
  }

  async markRead(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const { id } = req.params;

      await prisma.notification.updateMany({
        where: { id, userId },
        data: { isRead: true }
      });

      return res.status(200).json({ message: 'Notification marked as read' });
    } catch (e: any) {
      return res.status(500).json({ error: e.message || 'Failed to update notification' });
    }
  }
}

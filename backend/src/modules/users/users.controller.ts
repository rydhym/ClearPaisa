import { Response } from 'express';
import { AuthRequest } from '../../shared/middleware/auth';
import prisma from '../../shared/utils/db';

export class UsersController {
  async getConsents(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const consents = await prisma.consent.findMany({
        where: { userId }
      });

      return res.status(200).json(consents);
    } catch (e: any) {
      return res.status(500).json({ error: e.message || 'Failed to retrieve consents' });
    }
  }

  async revokeConsent(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const { id } = req.params;

      await prisma.consent.updateMany({
        where: { id, userId },
        data: { status: 'REVOKED' }
      });

      // Log audit trail
      await prisma.auditLog.create({
        data: {
          userId,
          action: `REVOKED_CONSENT_${id}`,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent']
        }
      });

      return res.status(200).json({ message: 'Consent revoked successfully' });
    } catch (e: any) {
      return res.status(500).json({ error: e.message || 'Failed to revoke consent' });
    }
  }

  async exportData(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const transactions = await prisma.transaction.findMany({
        where: { userId },
        include: {
          category: { select: { name: true } },
          merchant: { select: { name: true } }
        },
        orderBy: { timestamp: 'desc' }
      });

      return res.status(200).json({
        user: req.user,
        exportedAt: new Date(),
        transactions
      });
    } catch (e: any) {
      return res.status(500).json({ error: e.message || 'Failed to export transactions' });
    }
  }

  async deleteAccount(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      // Cascade deletion is handled by foreign key configuration in schema.prisma (onDelete: Cascade)
      await prisma.user.delete({
        where: { id: userId }
      });

      return res.status(200).json({ message: 'User account and all associated financial records deleted successfully' });
    } catch (e: any) {
      return res.status(500).json({ error: e.message || 'Failed to delete account' });
    }
  }
}

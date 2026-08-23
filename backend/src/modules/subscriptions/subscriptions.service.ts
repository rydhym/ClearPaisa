import prisma from '../../shared/utils/db';
import { TransactionType } from '@prisma/client';

export class SubscriptionsService {
  async getSubscriptions(userId: string) {
    return prisma.subscription.findMany({
      where: { userId }
    });
  }

  async createSubscriptionManual(userId: string, name: string, amount: number, billingCycle: string, nextBillingDate: Date) {
    return prisma.subscription.create({
      data: {
        userId,
        name,
        amount,
        billingCycle,
        nextBillingDate
      }
    });
  }

  async deleteSubscription(userId: string, id: string) {
    return prisma.subscription.delete({
      where: { id, userId }
    });
  }

  // Scans transactions history to auto-detect recurring subscription services (e.g. Netflix, Spotify, ChatGPT)
  async autoDetectSubscriptions(userId: string) {
    const transactions = await prisma.transaction.findMany({
      where: {
        userId,
        type: TransactionType.DEBIT
      },
      include: {
        merchant: true
      },
      orderBy: { timestamp: 'asc' }
    });

    // Group transactions by merchant name
    const merchantGroups: Record<string, typeof transactions> = {};
    for (const tx of transactions) {
      if (!tx.merchant) continue;
      const mName = tx.merchant.name;
      if (!merchantGroups[mName]) {
        merchantGroups[mName] = [];
      }
      merchantGroups[mName].push(tx);
    }

    const detectedCount = 0;

    for (const [mName, txs] of Object.entries(merchantGroups)) {
      if (txs.length < 2) continue; // Needs at least 2 logs to detect frequency

      // Check differences in intervals
      let isRecurring = true;
      const intervalsDays: number[] = [];
      const amounts: number[] = [];

      for (let i = 1; i < txs.length; i++) {
        const diffMs = txs[i].timestamp.getTime() - txs[i-1].timestamp.getTime();
        const diffDays = diffMs / (1000 * 60 * 60 * 24);
        intervalsDays.push(diffDays);
        amounts.push(txs[i].amount);
      }

      // Check if average interval is around 30 days (+/- 4 days)
      const avgInterval = intervalsDays.reduce((a, b) => a + b, 0) / intervalsDays.length;
      const amountDiffs = amounts.map(a => Math.abs(a - txs[0].amount) / txs[0].amount);
      const isConstantAmount = amountDiffs.every(diff => diff < 0.15); // within 15% diff

      if (avgInterval >= 25 && avgInterval <= 35 && isConstantAmount) {
        // Exists check
        const existing = await prisma.subscription.findFirst({
          where: { userId, name: mName }
        });

        if (!existing) {
          const lastTx = txs[txs.length - 1];
          const nextBillingDate = new Date(lastTx.timestamp.getTime() + 30 * 24 * 60 * 60 * 1000);
          
          await prisma.subscription.create({
            data: {
              userId,
              name: mName,
              amount: lastTx.amount,
              billingCycle: 'MONTHLY',
              nextBillingDate,
              status: 'ACTIVE'
            }
          });
        }
      }
    }

    return { success: true, count: detectedCount };
  }
}

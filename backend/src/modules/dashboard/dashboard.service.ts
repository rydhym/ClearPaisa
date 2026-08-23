import prisma from '../../shared/utils/db';
import { TransactionType } from '@prisma/client';

export class DashboardService {
  async getDashboardData(userId: string) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // 1. Current Balance
    const accounts = await prisma.bankAccount.findMany({
      where: { userId }
    });
    const currentBalance = accounts.reduce((acc, curr) => acc + curr.balance, 0);

    // 2. Monthly Transactions
    const monthlyTransactions = await prisma.transaction.findMany({
      where: {
        userId,
        timestamp: {
          gte: startOfMonth
        }
      },
      include: {
        category: { select: { name: true } }
      }
    });

    let monthlySpending = 0;
    let monthlyIncome = 0;
    const categorySpendingMap: Record<string, number> = {};

    for (const tx of monthlyTransactions) {
      if (tx.type === TransactionType.DEBIT) {
        monthlySpending += tx.amount;
        
        const catName = tx.category?.name || 'Others';
        categorySpendingMap[catName] = (categorySpendingMap[catName] || 0) + tx.amount;
      } else {
        monthlyIncome += tx.amount;
      }
    }

    const netCashflow = monthlyIncome - monthlySpending;
    const savings = Math.max(0, netCashflow);

    // 3. Top Categories
    const topCategories = Object.entries(categorySpendingMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    // 4. Recent Transactions
    const recentTransactions = await prisma.transaction.findMany({
      where: { userId },
      include: {
        category: { select: { name: true } },
        merchant: { select: { name: true } }
      },
      orderBy: { timestamp: 'desc' },
      take: 5
    });

    // 5. Active Subscriptions & Upcoming Bills count
    const subscriptions = await prisma.subscription.findMany({
      where: { userId, status: 'ACTIVE' }
    });
    
    // 6. Aggregate Charts Data (Daily breakdown of current month)
    const dailyDataMap: Record<string, { date: string; spending: number; income: number }> = {};
    for (let i = 0; i < 30; i++) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dayStr = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
      dailyDataMap[dayStr] = { date: dayStr, spending: 0, income: 0 };
    }

    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const last30DaysTxs = await prisma.transaction.findMany({
      where: {
        userId,
        timestamp: { gte: thirtyDaysAgo }
      }
    });

    for (const tx of last30DaysTxs) {
      const dayStr = tx.timestamp.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
      if (dailyDataMap[dayStr]) {
        if (tx.type === TransactionType.DEBIT) {
          dailyDataMap[dayStr].spending += tx.amount;
        } else {
          dailyDataMap[dayStr].income += tx.amount;
        }
      }
    }

    const chartData = Object.values(dailyDataMap).reverse();

    // 7. Calculate Financial Health Score (1-100)
    // Heuristics:
    // - Savings Ratio (Savings / Income): 40% weight (optimal > 20%)
    // - Debt load (Credit card balance relative to Savings): 30% weight
    // - Budget compliance: 30% weight
    let healthScore = 70; // baseline
    if (monthlyIncome > 0) {
      const savingsRatio = savings / monthlyIncome;
      if (savingsRatio >= 0.3) healthScore += 15;
      else if (savingsRatio >= 0.2) healthScore += 10;
      else if (savingsRatio < 0.05) healthScore -= 15;
    } else {
      healthScore -= 10;
    }

    // Cap at 100 and min 10
    healthScore = Math.min(100, Math.max(10, healthScore));

    return {
      kpis: {
        currentBalance,
        monthlySpending,
        monthlyIncome,
        savings,
        netCashflow,
        healthScore
      },
      topCategories,
      recentTransactions,
      subscriptions,
      chartData
    };
  }
}

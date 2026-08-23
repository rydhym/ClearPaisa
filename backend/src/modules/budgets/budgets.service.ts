import prisma from '../../shared/utils/db';
import { TransactionType } from '@prisma/client';

export class BudgetsService {
  async getBudgets(userId: string) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const budgets = await prisma.budget.findMany({
      where: {
        userId,
        startDate: { gte: startOfMonth },
        endDate: { lte: endOfMonth }
      },
      include: {
        category: { select: { name: true } }
      }
    });

    // For each budget, calculate current month spending on that category
    const enrichedBudgets = [];
    for (const b of budgets) {
      const aggregateSpent = await prisma.transaction.aggregate({
        where: {
          userId,
          categoryId: b.categoryId,
          type: TransactionType.DEBIT,
          timestamp: {
            gte: startOfMonth,
            lte: endOfMonth
          }
        },
        _sum: {
          amount: true
        }
      });

      const spent = aggregateSpent._sum.amount || 0;
      
      // Update DB cached spent field
      const updatedBudget = await prisma.budget.update({
        where: { id: b.id },
        data: { spent },
        include: { category: { select: { name: true } } }
      });

      enrichedBudgets.push({
        ...updatedBudget,
        progress: updatedBudget.amount > 0 ? (spent / updatedBudget.amount) * 100 : 0
      });
    }

    return enrichedBudgets;
  }

  async createOrUpdateBudget(userId: string, categoryName: string, amount: number) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    let category = await prisma.category.findUnique({
      where: { name: categoryName }
    });

    if (!category) {
      category = await prisma.category.create({
        data: { name: categoryName, description: 'Category created during budget setup' }
      });
    }

    const budget = await prisma.budget.upsert({
      where: {
        userId_categoryId_startDate: {
          userId,
          categoryId: category.id,
          startDate: startOfMonth
        }
      },
      update: {
        amount,
        endDate: endOfMonth
      },
      create: {
        userId,
        categoryId: category.id,
        amount,
        startDate: startOfMonth,
        endDate: endOfMonth
      },
      include: {
        category: { select: { name: true } }
      }
    });

    // Check alerts immediately
    await this.checkAndCreateAlerts(userId, budget.id);

    return budget;
  }

  async checkAndCreateAlerts(userId: string, budgetId: string) {
    const budget = await prisma.budget.findUnique({
      where: { id: budgetId },
      include: { category: true }
    });

    if (!budget || budget.amount === 0) return;

    const ratio = budget.spent / budget.amount;

    if (ratio >= 1.0) {
      // Exceeded limit notification
      const message = `Alert: You have exceeded your budget of ₹${budget.amount} for category "${budget.category.name}"! Spent: ₹${budget.spent.toFixed(2)}`;
      
      const existing = await prisma.notification.findFirst({
        where: { userId, message }
      });

      if (!existing) {
        await prisma.notification.create({
          data: {
            userId,
            title: `Budget Exceeded - ${budget.category.name}`,
            message,
            type: 'BUDGET_ALERT'
          }
        });
      }
    } else if (ratio >= 0.8) {
      // 80% Warning notification
      const message = `Warning: You have used 80%+ of your budget of ₹${budget.amount} for category "${budget.category.name}". Spent: ₹${budget.spent.toFixed(2)}`;
      
      const existing = await prisma.notification.findFirst({
        where: { userId, message }
      });

      if (!existing) {
        await prisma.notification.create({
          data: {
            userId,
            title: `Budget Warning - ${budget.category.name}`,
            message,
            type: 'BUDGET_ALERT'
          }
        });
      }
    }
  }
}

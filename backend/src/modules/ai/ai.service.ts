import { GoogleGenerativeAI } from '@google/generative-ai';
import prisma from '../../shared/utils/db';
import { TransactionType } from '@prisma/client';

export class AIService {
  private genAI: GoogleGenerativeAI;

  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'mock_key');
  }

  async askAssistant(userId: string, question: string): Promise<string> {
    // 1. Collect user data context to feed to Gemini
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [transactions, budgets, subscriptions] = await Promise.all([
      prisma.transaction.findMany({
        where: { userId },
        include: { category: { select: { name: true } }, merchant: { select: { name: true } } },
        orderBy: { timestamp: 'desc' },
        take: 100 // Feed the latest 100 transactions for cost/token bounds
      }),
      prisma.budget.findMany({
        where: { userId, startDate: { gte: startOfMonth } },
        include: { category: { select: { name: true } } }
      }),
      prisma.subscription.findMany({
        where: { userId, status: 'ACTIVE' }
      })
    ]);

    // Format transaction context
    const transactionsContext = transactions.map(t => 
      `- ${t.timestamp.toLocaleDateString()}: ${t.type} of ₹${t.amount} at ${t.merchant?.name || 'Unknown'} (${t.category?.name || 'Others'}). Desc: ${t.description || ''}`
    ).join('\n');

    // Format budget context
    const budgetsContext = budgets.map(b => 
      `- ${b.category.name}: Budget ₹${b.amount}, Spent ₹${b.spent}`
    ).join('\n');

    // Format subscription context
    const subscriptionsContext = subscriptions.map(s => 
      `- ${s.name}: ₹${s.amount} (${s.billingCycle}), Next billing: ${s.nextBillingDate.toLocaleDateString()}`
    ).join('\n');

    const prompt = `
You are Antigravity, ClearPaisa's highly capable AI Personal Finance Assistant.
Analyze the user's financial profile and answer their question accurately. 
Use a friendly, professional, Apple-inspired tone. Keep formatting clean, using bold text, bullet points, and tables where appropriate.

USER QUESTION: "${question}"

FINANCIAL CONTEXT PROVIDED:
---
USER'S TRANSACTION LOGS (RECENT 100):
${transactionsContext || 'No transactions logged.'}

CURRENT MONTH BUDGETS:
${budgetsContext || 'No active budgets.'}

ACTIVE SUBSCRIPTIONS:
${subscriptionsContext || 'No active subscriptions.'}
---

Provide a helpful, precise summary. If calculations are requested (e.g. food spend, totals), compute them based on the transaction logs provided. Show the math/breakdown if helpful. Always use Rupee symbol (₹) for currencies.
`;

    // 2. Perform Gemini query if key is configured, else use rules-based mock engine
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && apiKey !== 'placeholder_gemini_api_key' && apiKey !== 'mock_key') {
      try {
        const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const result = await model.generateContent(prompt);
        return result.response.text();
      } catch (err) {
        console.error('Gemini query failed. Falling back to rule-based parser:', err);
      }
    }

    return this.fallbackMockEngine(question, transactions, budgets, subscriptions);
  }

  private fallbackMockEngine(question: string, transactions: any[], budgets: any[], subscriptions: any[]): string {
    const q = question.toLowerCase();

    if (q.includes('food')) {
      const foodSpend = transactions
        .filter(t => t.category?.name === 'Food' && t.type === TransactionType.DEBIT)
        .reduce((sum, t) => sum + t.amount, 0);
      return `Based on your recent logs, you spent a total of **₹${foodSpend.toFixed(2)}** on **Food** (restaurants and grocery orders).`;
    }

    if (q.includes('biggest') || q.includes('expenses') || q.includes('largest')) {
      const sorted = [...transactions]
        .filter(t => t.type === TransactionType.DEBIT)
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 3);

      if (sorted.length === 0) return 'No expenses found in your account.';
      
      let res = `Here are your biggest recent expenses:\n\n`;
      sorted.forEach((tx, idx) => {
        res += `${idx + 1}. **₹${tx.amount.toFixed(2)}** at *${tx.merchant?.name || 'Merchant'}* on ${tx.timestamp.toLocaleDateString()} (${tx.category?.name || 'Others'})\n`;
      });
      return res;
    }

    if (q.includes('salary') || q.includes('income')) {
      const salary = transactions
        .filter(t => t.category?.name === 'Salary' || t.type === TransactionType.CREDIT)
        .reduce((sum, t) => sum + t.amount, 0);
      return `You received a total income/salary of **₹${salary.toFixed(2)}** over the last billing period.`;
    }

    if (q.includes('subscription') || q.includes('cancel')) {
      if (subscriptions.length === 0) return `We did not detect any active subscriptions in your profile.`;
      let res = `You have **${subscriptions.length}** active subscription(s) totaling **₹${subscriptions.reduce((sum, s) => sum + s.amount, 0).toFixed(2)}** per month:\n\n`;
      subscriptions.forEach(s => {
        res += `- **${s.name}**: ₹${s.amount}/month (Next renewal: ${s.nextBillingDate.toLocaleDateString()})\n`;
      });
      res += `\n*Tip: If you do not use them frequently, cancelling unused accounts could save you extra cash!*`;
      return res;
    }

    if (q.includes('save')) {
      return `To save ₹5,000 this month, we recommend making the following adjustments:\n\n` +
        `1. **Reduce Food delivery**: You currently spend heavily on Swiggy/Zomato. Cutting back 2 orders per week saves ~₹1,600.\n` +
        `2. **Optimize Subscriptions**: Cancel unused memberships. Saves ~₹600.\n` +
        `3. **Set spending caps**: You have active budgets. Limiting miscellaneous shopping can save ~₹2,800.`;
    }

    return `Here is a quick overview of your finances:\n` +
      `- Total recent transactions evaluated: **${transactions.length}**\n` +
      `- Set budgets: **${budgets.length}**\n` +
      `- Subscriptions: **${subscriptions.length}**\n\n` +
      `How else can I assist you with your financial timeline today?`;
  }
}

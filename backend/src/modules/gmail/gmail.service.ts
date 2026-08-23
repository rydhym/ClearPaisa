import { google } from 'googleapis';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { IDataProvider, IAccount, ITransaction } from '../../shared/interfaces/IDataProvider';
import prisma from '../../shared/utils/db';
import { SourceType, PaymentMode } from '@prisma/client';

export class GmailService implements IDataProvider {
  private genAI: GoogleGenerativeAI;

  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'mock_key');
  }

  // IDataProvider sync implementation
  async sync(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const consent = await prisma.consent.findFirst({
        where: {
          userId,
          provider: 'GOOGLE_GMAIL',
          status: 'ACTIVE'
        }
      });

      if (!consent || !consent.rawConsentData) {
        return { success: false, error: 'Gmail Google OAuth is not linked.' };
      }

      // In real-world, we instantiate OAuth client using the stored token
      // For sandbox/demo we simulate fetching emails from a mock Google mailbox
      const mockEmails = this.generateMockEmails(userId);
      let newTxCount = 0;

      for (const email of mockEmails) {
        // Prevent duplicate syncs
        const existing = await prisma.emailMessage.findUnique({
          where: { messageId: email.messageId }
        });

        if (existing) continue;

        await prisma.emailMessage.create({
          data: {
            userId,
            messageId: email.messageId,
            threadId: email.threadId,
            from: email.from,
            date: email.date,
            snippet: email.snippet,
            bodyRaw: email.bodyRaw,
            parsedSuccess: true
          }
        });

        newTxCount++;
      }

      await prisma.syncLogs.create({
        data: {
          userId,
          provider: 'GMAIL',
          status: 'SUCCESS',
          records: newTxCount
        }
      });

      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message || 'Gmail sync failed' };
    }
  }

  // Fetch parsed transactions from Gmail messages
  async fetchTransactions(userId: string, fromDate?: Date, toDate?: Date): Promise<ITransaction[]> {
    const emails = await prisma.emailMessage.findMany({
      where: { userId, parsedSuccess: true }
    });

    const parsedTransactions: ITransaction[] = [];

    for (const email of emails) {
      if (fromDate && email.date < fromDate) continue;
      if (toDate && email.date > toDate) continue;

      try {
        const tx = await this.parseEmailContent(email.bodyRaw || email.snippet || '');
        if (tx) {
          parsedTransactions.push({
            ...tx,
            timestamp: email.date,
            source: SourceType.GMAIL,
            rawMetadata: { messageId: email.messageId }
          });
        }
      } catch (err) {
        console.error(`Failed to parse email ${email.messageId}:`, err);
      }
    }

    return parsedTransactions;
  }

  // Regex and Gemini AI Email Parser
  private async parseEmailContent(body: string): Promise<Omit<ITransaction, 'timestamp' | 'source' | 'rawMetadata'> | null> {
    // 1. Quick regex check for standard UPI alerts (e.g. GooglePay/PhonePe alerts)
    // "Sent Rs. 150 to Swiggy using UPI..."
    const upiSentRegex = /sent\s+rs\.\s*([\d,]+(?:\.\d{2})?)\s+to\s+([^.\n]+)/i;
    const upiReceivedRegex = /received\s+rs\.\s*([\d,]+(?:\.\d{2})?)\s+from\s+([^.\n]+)/i;
    const debitRegex = /debited\s+for\s+rs\.\s*([\d,]+(?:\.\d{2})?)\s+to\s+([^.\n]+)/i;

    let match = body.match(upiSentRegex);
    if (match) {
      return {
        amount: parseFloat(match[1].replace(/,/g, '')),
        type: 'DEBIT',
        merchantName: match[2].trim(),
        category: 'Others',
        paymentMode: PaymentMode.UPI,
        confidenceScore: 0.9,
        description: body
      };
    }

    match = body.match(debitRegex);
    if (match) {
      return {
        amount: parseFloat(match[1].replace(/,/g, '')),
        type: 'DEBIT',
        merchantName: match[2].trim(),
        category: 'Others',
        paymentMode: PaymentMode.UPI,
        confidenceScore: 0.9,
        description: body
      };
    }

    match = body.match(upiReceivedRegex);
    if (match) {
      return {
        amount: parseFloat(match[1].replace(/,/g, '')),
        type: 'CREDIT',
        merchantName: match[2].trim(),
        category: 'Others',
        paymentMode: PaymentMode.UPI,
        confidenceScore: 0.9,
        description: body
      };
    }

    // 2. AI Fallback (Gemini API) if regex fails and a valid API key is set
    if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'placeholder_gemini_api_key' && process.env.GEMINI_API_KEY !== 'mock_key') {
      try {
        const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const prompt = `
          Extract transactional data from this email content.
          Return ONLY a JSON block with the following schema:
          {
            "amount": number,
            "type": "DEBIT" | "CREDIT",
            "merchantName": string,
            "category": string,
            "paymentMode": "UPI" | "CARD" | "NET_BANKING" | "CASH" | "WALLET",
            "referenceNumber": string or null
          }
          Email Content:
          "${body}"
        `;
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const jsonMatch = text.match(/\{[\s\S]*?\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return {
            amount: parsed.amount,
            type: parsed.type,
            merchantName: parsed.merchantName,
            category: parsed.category || 'Others',
            paymentMode: parsed.paymentMode || PaymentMode.NET_BANKING,
            referenceNumber: parsed.referenceNumber || undefined,
            confidenceScore: 0.95,
            description: body
          };
        }
      } catch (err) {
        console.error('Gemini parser failed, falling back to basic extraction:', err);
      }
    }

    // 3. Fallback mock parser if AI is unavailable
    if (body.includes('Netflix')) {
      return {
        amount: 649.00,
        type: 'DEBIT',
        merchantName: 'Netflix',
        category: 'Entertainment',
        paymentMode: PaymentMode.CARD,
        confidenceScore: 0.7,
        description: 'Netflix subscription invoice'
      };
    }

    return null;
  }

  // Generates mock transactional emails for Sandbox testing
  private generateMockEmails(userId: string) {
    const baseDate = new Date();
    return [
      {
        messageId: `msg_gmail_1_${userId.slice(0, 4)}`,
        threadId: `th_gmail_1_${userId.slice(0, 4)}`,
        from: 'alerts@hdfcbank.net',
        date: new Date(baseDate.getTime() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
        snippet: 'Your HDFC Bank account has been debited for Rs. 549.00 to Netflix Premium.',
        bodyRaw: 'Dear Customer, Your HDFC Bank account ending in XXXXXX5012 has been debited for Rs. 549.00 to Netflix Premium on 20-Aug-2026. Ref: 7788123.'
      },
      {
        messageId: `msg_gmail_2_${userId.slice(0, 4)}`,
        threadId: `th_gmail_2_${userId.slice(0, 4)}`,
        from: 'payments@swiggy.com',
        date: new Date(baseDate.getTime() - 1 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000), // 1 day ago
        snippet: 'Thank you for your order at Swiggy. Amount Rs. 420.00 paid via UPI.',
        bodyRaw: 'Order Placed! Thank you for ordering from Swiggy. Total amount Rs. 420.00 was paid via UPI (ref: 1122334455).'
      }
    ];
  }

  // Not used in Gmail, required by interface
  async fetchAccounts(userId: string): Promise<IAccount[]> {
    return [];
  }

  async fetchBalances(userId: string): Promise<Record<string, number>> {
    return {};
  }

  async refresh(userId: string): Promise<{ success: boolean; error?: string }> {
    return this.sync(userId);
  }
}

import { Response } from 'express';
import { AuthRequest } from '../../shared/middleware/auth';
import prisma from '../../shared/utils/db';
import { CsvParser } from './parsers/csv.parser';
import { PdfParser } from './parsers/pdf.parser';
import { TransactionEngine } from './transaction.engine';
import { PaymentMode, SourceType, TransactionType } from '@prisma/client';

const txEngine = new TransactionEngine();

export class TransactionsController {

  async getTransactions(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const { search, category, merchant, minAmount, maxAmount, type, page = 1, limit = 50 } = req.query;
      const skip = (Number(page) - 1) * Number(limit);

      const where: any = { userId };

      if (category) {
        where.category = { name: String(category) };
      }
      if (merchant) {
        where.merchant = { name: { contains: String(merchant), mode: 'insensitive' } };
      }
      if (type) {
        where.type = type === 'DEBIT' ? TransactionType.DEBIT : TransactionType.CREDIT;
      }
      if (minAmount || maxAmount) {
        where.amount = {};
        if (minAmount) where.amount.gte = parseFloat(String(minAmount));
        if (maxAmount) where.amount.lte = parseFloat(String(maxAmount));
      }
      if (search) {
        where.OR = [
          { description: { contains: String(search), mode: 'insensitive' } },
          { merchant: { name: { contains: String(search), mode: 'insensitive' } } },
          { category: { name: { contains: String(search), mode: 'insensitive' } } },
          { referenceNumber: { contains: String(search), mode: 'insensitive' } }
        ];
      }

      const [transactions, total] = await Promise.all([
        prisma.transaction.findMany({
          where,
          include: {
            category: { select: { name: true } },
            merchant: { select: { name: true, normalizedName: true } },
            account: { select: { bankName: true, accountType: true } }
          },
          orderBy: { timestamp: 'desc' },
          skip,
          take: Number(limit)
        }),
        prisma.transaction.count({ where })
      ]);

      return res.status(200).json({
        total,
        page: Number(page),
        limit: Number(limit),
        transactions
      });
    } catch (e: any) {
      return res.status(500).json({ error: e.message || 'Failed to fetch transactions' });
    }
  }

  async createManual(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const { amount, type, merchantName, category, timestamp, paymentMode, description, referenceNumber } = req.body;

      if (!amount || !type || !merchantName) {
        return res.status(400).json({ error: 'Amount, transaction type, and merchant name are required' });
      }

      const inputTx = {
        amount: parseFloat(amount),
        type: type === 'DEBIT' ? TransactionType.DEBIT : TransactionType.CREDIT,
        merchantName,
        category: category || 'Others',
        timestamp: timestamp ? new Date(timestamp) : new Date(),
        paymentMode: (paymentMode || PaymentMode.CASH) as PaymentMode,
        description,
        referenceNumber,
        confidenceScore: 1.0,
        source: SourceType.MANUAL
      };

      const result = await txEngine.processAndMergeTransactions(userId, [inputTx]);
      return res.status(201).json({
        message: 'Manual transaction created successfully',
        ...result
      });
    } catch (e: any) {
      return res.status(500).json({ error: e.message || 'Failed to create transaction' });
    }
  }

  async uploadCsv(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      if (!req.file) {
        return res.status(400).json({ error: 'No CSV file uploaded' });
      }

      const parsedTxs = CsvParser.parseStatement(req.file.buffer);
      const result = await txEngine.processAndMergeTransactions(userId, parsedTxs);

      return res.status(200).json({
        message: 'CSV statement uploaded and merged successfully',
        parsedCount: parsedTxs.length,
        ...result
      });
    } catch (e: any) {
      return res.status(400).json({ error: e.message || 'Failed to parse CSV statement' });
    }
  }

  async uploadPdf(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      if (!req.file) {
        return res.status(400).json({ error: 'No PDF file uploaded' });
      }

      const parsedTxs = await PdfParser.parseStatement(req.file.buffer);
      const result = await txEngine.processAndMergeTransactions(userId, parsedTxs);

      return res.status(200).json({
        message: 'PDF statement uploaded and merged successfully',
        parsedCount: parsedTxs.length,
        ...result
      });
    } catch (e: any) {
      return res.status(400).json({ error: e.message || 'Failed to parse PDF statement' });
    }
  }

  async updateTransaction(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const { id } = req.params;
      const { categoryName, merchantName, description, amount, timestamp } = req.body;

      const tx = await prisma.transaction.findFirst({
        where: { id, userId }
      });

      if (!tx) {
        return res.status(404).json({ error: 'Transaction not found' });
      }

      const updateData: any = {};

      if (categoryName) {
        let category = await prisma.category.findUnique({
          where: { name: categoryName }
        });
        if (!category) {
          category = await prisma.category.create({
            data: { name: categoryName, description: 'User-created category' }
          });
        }
        updateData.categoryId = category.id;
      }

      if (merchantName) {
        let merchant = await prisma.merchant.findUnique({
          where: { name: merchantName }
        });
        if (!merchant) {
          merchant = await prisma.merchant.create({
            data: { name: merchantName, normalizedName: merchantName }
          });
        }
        updateData.merchantId = merchant.id;
      }

      if (description !== undefined) updateData.description = description;
      if (amount !== undefined) updateData.amount = parseFloat(amount);
      if (timestamp !== undefined) updateData.timestamp = new Date(timestamp);

      const updated = await prisma.transaction.update({
        where: { id },
        data: updateData,
        include: {
          category: { select: { name: true } },
          merchant: { select: { name: true } }
        }
      });

      return res.status(200).json({
        message: 'Transaction updated successfully',
        transaction: updated
      });
    } catch (e: any) {
      return res.status(500).json({ error: e.message || 'Failed to update transaction' });
    }
  }

  async deleteTransaction(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const { id } = req.params;

      const tx = await prisma.transaction.findFirst({
        where: { id, userId }
      });

      if (!tx) {
        return res.status(404).json({ error: 'Transaction not found' });
      }

      await prisma.transaction.delete({
        where: { id }
      });

      return res.status(200).json({ message: 'Transaction deleted successfully' });
    } catch (e: any) {
      return res.status(500).json({ error: e.message || 'Failed to delete transaction' });
    }
  }
}

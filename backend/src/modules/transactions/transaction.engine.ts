import { SourceType, PaymentMode } from '@prisma/client';
import prisma from '../../shared/utils/db';
import { ITransaction } from '../../shared/interfaces/IDataProvider';
import { MerchantNormalizer } from '../../shared/utils/merchantNormalizer';
import { Categorizer } from '../../shared/utils/categorizer';

const SOURCE_PRECEDENCE: Record<SourceType, number> = {
  SETU: 5,
  GMAIL: 4,
  PDF: 3,
  CSV: 2,
  MANUAL: 1
};

export class TransactionEngine {
  private categoryCache: Map<string, string> = new Map();

  private async getCategoryId(name: string): Promise<string> {
    if (this.categoryCache.has(name)) {
      return this.categoryCache.get(name)!;
    }

    let category = await prisma.category.findUnique({
      where: { name }
    });

    if (!category) {
      category = await prisma.category.create({
        data: { name, description: 'Auto-created category' }
      });
    }

    this.categoryCache.set(name, category.id);
    return category.id;
  }

  private async getMerchantId(rawName: string): Promise<string> {
    const normalized = MerchantNormalizer.normalize(rawName);

    let merchant = await prisma.merchant.findUnique({
      where: { name: normalized }
    });

    if (!merchant) {
      merchant = await prisma.merchant.create({
        data: {
          name: normalized,
          normalizedName: normalized
        }
      });
    }

    return merchant.id;
  }

  async processAndMergeTransactions(userId: string, rawTransactions: ITransaction[]) {
    console.log(`Processing ${rawTransactions.length} transactions for user ${userId}...`);
    let addedCount = 0;
    let updatedCount = 0;

    for (const rawTx of rawTransactions) {
      const normalizedMerchant = MerchantNormalizer.normalize(rawTx.merchantName);
      const merchantId = await this.getMerchantId(normalizedMerchant);
      
      const resolvedCategoryName = rawTx.category && rawTx.category !== 'Others' 
        ? rawTx.category 
        : Categorizer.categorize(rawTx.description || '', normalizedMerchant);
      
      const categoryId = await this.getCategoryId(resolvedCategoryName);

      // Look for a potential duplicate in the database
      // Criteria: Same userId, same amount (+/- 0.01), within 10 mins timestamp window
      const timeWindowStart = new Date(rawTx.timestamp.getTime() - 10 * 60 * 1000);
      const timeWindowEnd = new Date(rawTx.timestamp.getTime() + 10 * 60 * 1000);

      const existingDuplicate = await prisma.transaction.findFirst({
        where: {
          userId,
          amount: {
            gte: rawTx.amount - 0.01,
            lte: rawTx.amount + 0.01
          },
          timestamp: {
            gte: timeWindowStart,
            lte: timeWindowEnd
          }
        }
      });

      if (existingDuplicate) {
        const existingPrecedence = SOURCE_PRECEDENCE[existingDuplicate.source] || 0;
        const incomingPrecedence = SOURCE_PRECEDENCE[rawTx.source] || 0;

        if (incomingPrecedence > existingPrecedence) {
          // Update the duplicate with the higher precedence source's data
          await prisma.transaction.update({
            where: { id: existingDuplicate.id },
            data: {
              accountId: rawTx.accountId || existingDuplicate.accountId,
              paymentMode: rawTx.paymentMode,
              referenceNumber: rawTx.referenceNumber || existingDuplicate.referenceNumber,
              description: rawTx.description || existingDuplicate.description,
              confidenceScore: rawTx.confidenceScore,
              source: rawTx.source,
              categoryId,
              merchantId,
              rawMetadata: rawTx.rawMetadata ? JSON.stringify(rawTx.rawMetadata) : undefined,
              timestamp: rawTx.timestamp
            }
          });
          updatedCount++;
        }
        // If incoming has lower precedence, skip/ignore as it is already captured by a higher quality source
      } else {
        // Create new transaction record
        await prisma.transaction.create({
          data: {
            userId,
            accountId: rawTx.accountId,
            amount: rawTx.amount,
            type: rawTx.type,
            merchantId,
            categoryId,
            timestamp: rawTx.timestamp,
            paymentMode: rawTx.paymentMode as PaymentMode,
            referenceNumber: rawTx.referenceNumber,
            description: rawTx.description,
            confidenceScore: rawTx.confidenceScore,
            source: rawTx.source,
            rawMetadata: rawTx.rawMetadata ? JSON.stringify(rawTx.rawMetadata) : undefined
          }
        });
        addedCount++;
      }
    }

    return { addedCount, updatedCount };
  }
}

import pdf from 'pdf-parse';
import { ITransaction } from '../../../shared/interfaces/IDataProvider';
import { PaymentMode } from '@prisma/client';

export class PdfParser {
  static async parseStatement(pdfBuffer: Buffer): Promise<ITransaction[]> {
    const data = await pdf(pdfBuffer);
    const text = data.text;
    const lines = text.split('\n');
    const transactions: ITransaction[] = [];

    // Regex for standard bank statement line:
    // e.g. "23-08-2026 Swiggy UPI Transfer 150.00 Dr" or "2026/08/23 AMAZON PAY 500.00 Cr"
    // Also captures DD-MMM-YYYY format e.g. "23-Aug-2026"
    const dateRegex = /\b\d{1,2}[-/.](\d{1,2}|[A-Za-z]{3})[-/.]\d{2,4}\b|\b\d{4}[-/.]\d{1,2}[-/.]\d{1,2}\b/;
    const amountRegex = /\b\d{1,7}\.\d{2}\b/;

    for (const line of lines) {
      const dateMatch = line.match(dateRegex);
      if (!dateMatch) continue;

      const dateStr = dateMatch[0];
      const remainder = line.replace(dateStr, '').trim();

      // Look for float amount
      const amountMatch = remainder.match(amountRegex);
      if (!amountMatch) continue;

      const amountStr = amountMatch[0];
      const amount = parseFloat(amountStr);
      
      // Determine description (remaining text without amount)
      let description = remainder.replace(amountStr, '').trim();
      
      // Determine Debit/Credit
      let type: 'DEBIT' | 'CREDIT' = 'DEBIT';
      if (description.toLowerCase().includes('cr') || description.toLowerCase().includes('credit') || description.toLowerCase().includes('deposit')) {
        type = 'CREDIT';
        description = description.replace(/cr|credit|deposit/gi, '').trim();
      } else if (description.toLowerCase().includes('dr') || description.toLowerCase().includes('debit') || description.toLowerCase().includes('withdrawal')) {
        type = 'DEBIT';
        description = description.replace(/dr|debit|withdrawal/gi, '').trim();
      }

      const timestamp = this.parseDate(dateStr);
      if (isNaN(timestamp.getTime())) continue;

      // Deduce Payment Mode
      let paymentMode: PaymentMode = PaymentMode.NET_BANKING;
      const lowerDesc = description.toLowerCase();
      if (lowerDesc.includes('upi') || lowerDesc.includes('gpay') || lowerDesc.includes('phonepe') || lowerDesc.includes('paytm')) {
        paymentMode = PaymentMode.UPI;
      } else if (lowerDesc.includes('atm') || lowerDesc.includes('cash')) {
        paymentMode = PaymentMode.CASH;
      } else if (lowerDesc.includes('pos') || lowerDesc.includes('card') || lowerDesc.includes('visa')) {
        paymentMode = PaymentMode.CARD;
      }

      // Infer merchant name from description
      const merchantName = this.extractMerchant(description);

      transactions.push({
        amount,
        type,
        merchantName,
        category: 'Others',
        timestamp,
        paymentMode,
        confidenceScore: 0.75, // PDF parsing confidence score
        source: 'PDF',
        description
      });
    }

    if (transactions.length === 0) {
      console.log('Regex table match missed. Falling back to generic word scan parser...');
      // Fallback: parse transactions using structured text blocks if standard inline regex failed
      return this.parseFallback(lines);
    }

    return transactions;
  }

  private static parseFallback(lines: string[]): ITransaction[] {
    const transactions: ITransaction[] = [];
    // Basic fallback parsing details
    for (const line of lines) {
      const parts = line.split(/\s+/).filter(Boolean);
      if (parts.length >= 4) {
        // Assume first part might be date, last part might be amount
        const dateMatch = parts[0].match(/\b\d{1,2}[-/.](\d{1,2}|[A-Za-z]{3})[-/.]\d{2,4}\b/);
        const amount = parseFloat(parts[parts.length - 1].replace(/,/g, ''));
        if (dateMatch && !isNaN(amount) && amount > 0) {
          const timestamp = this.parseDate(parts[0]);
          const description = parts.slice(1, parts.length - 1).join(' ');
          const type = description.toLowerCase().includes('credit') || description.toLowerCase().includes('cr') ? 'CREDIT' : 'DEBIT';

          transactions.push({
            amount,
            type,
            merchantName: this.extractMerchant(description),
            category: 'Others',
            timestamp,
            paymentMode: PaymentMode.NET_BANKING,
            confidenceScore: 0.6,
            source: 'PDF',
            description
          });
        }
      }
    }
    return transactions;
  }

  private static parseDate(str: string): Date {
    const parts = str.split(/[-/.]/);
    if (parts.length === 3) {
      // e.g. 23-Aug-2026
      if (isNaN(Number(parts[1]))) {
        const months: Record<string, number> = {
          jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
        };
        const m = months[parts[1].toLowerCase().slice(0, 3)];
        if (m !== undefined) {
          return new Date(parseInt(parts[2]), m, parseInt(parts[0]));
        }
      }
      if (parts[0].length === 4) {
        return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      }
      return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
    }
    return new Date(str);
  }

  private static extractMerchant(description: string): string {
    const clean = description.replace(/upi|netbanking|pos|imps|neft|rtgs|payment|transfer/gi, '').replace(/[^a-zA-Z0-9\s]/g, ' ');
    const tokens = clean.split(/\s+/).filter(t => t.length > 2);
    return tokens[0] || 'Others';
  }
}

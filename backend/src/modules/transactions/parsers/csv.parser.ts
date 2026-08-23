import { parse } from 'csv-parse/sync';
import { ITransaction } from '../../../shared/interfaces/IDataProvider';
import { PaymentMode } from '@prisma/client';

export class CsvParser {
  static parseStatement(csvBuffer: Buffer): ITransaction[] {
    const csvContent = csvBuffer.toString('utf-8');
    const records = parse(csvContent, {
      skip_empty_lines: true,
      trim: true
    }) as string[][];

    if (records.length < 2) {
      throw new Error('CSV is empty or missing headers');
    }

    // Attempt to locate headers
    // We scan lines until we find headers resembling Date, Narration/Description, Amount / Debit / Credit
    let headerIndex = 0;
    let headers: string[] = [];
    
    for (let i = 0; i < Math.min(records.length, 10); i++) {
      const row = records[i];
      const hasDate = row.some(cell => /date/i.test(cell));
      const hasDesc = row.some(cell => /desc|narrat|particular/i.test(cell));
      const hasAmount = row.some(cell => /amount|debit|credit|withdrawal|deposit/i.test(cell));
      
      if (hasDate && hasDesc && hasAmount) {
        headerIndex = i;
        headers = row.map(h => h.toLowerCase().trim());
        break;
      }
    }

    // Default mapping if headers are not auto-detected
    if (headers.length === 0) {
      headers = records[0].map(h => h.toLowerCase().trim());
      headerIndex = 0;
    }

    const dateCol = headers.findIndex(h => h.includes('date'));
    const descCol = headers.findIndex(h => h.includes('desc') || h.includes('narrat') || h.includes('particular'));
    const amountCol = headers.findIndex(h => h.includes('amount') || h.includes('value'));
    const debitCol = headers.findIndex(h => h.includes('debit') || h.includes('withdraw'));
    const creditCol = headers.findIndex(h => h.includes('credit') || h.includes('deposit'));
    const refCol = headers.findIndex(h => h.includes('ref') || h.includes('cheque') || h.includes('txn id'));

    if (dateCol === -1 || descCol === -1 || (amountCol === -1 && debitCol === -1)) {
      throw new Error('Could not identify essential banking columns (Date, Description, and Amount)');
    }

    const transactions: ITransaction[] = [];

    // Parse data rows
    for (let i = headerIndex + 1; i < records.length; i++) {
      const row = records[i];
      if (row.length < headers.length) continue;

      const rawDate = row[dateCol];
      const description = row[descCol];
      const referenceNumber = refCol !== -1 ? row[refCol] : undefined;

      if (!rawDate || !description) continue;

      const timestamp = this.parseDate(rawDate);
      if (isNaN(timestamp.getTime())) continue; // Skip invalid dates

      let amount = 0;
      let type: 'DEBIT' | 'CREDIT' = 'DEBIT';

      if (amountCol !== -1 && row[amountCol]) {
        const val = parseFloat(row[amountCol].replace(/,/g, ''));
        amount = Math.abs(val);
        type = val < 0 ? 'DEBIT' : 'CREDIT';
      } else {
        const debitVal = debitCol !== -1 && row[debitCol] ? parseFloat(row[debitCol].replace(/,/g, '')) : 0;
        const creditVal = creditCol !== -1 && row[creditCol] ? parseFloat(row[creditCol].replace(/,/g, '')) : 0;

        if (debitVal > 0) {
          amount = debitVal;
          type = 'DEBIT';
        } else if (creditVal > 0) {
          amount = creditVal;
          type = 'CREDIT';
        } else {
          continue; // Skip transactions with 0 amount
        }
      }

      // Infer Payment Mode
      let paymentMode: PaymentMode = PaymentMode.NET_BANKING;
      const lowerDesc = description.toLowerCase();
      if (lowerDesc.includes('upi') || lowerDesc.includes('googlepay') || lowerDesc.includes('gpay') || lowerDesc.includes('phonepe') || lowerDesc.includes('paytm')) {
        paymentMode = PaymentMode.UPI;
      } else if (lowerDesc.includes('atm') || lowerDesc.includes('cash wdl')) {
        paymentMode = PaymentMode.CASH;
      } else if (lowerDesc.includes('pos') || lowerDesc.includes('card') || lowerDesc.includes('visa') || lowerDesc.includes('mastercard') || lowerDesc.includes('rupay')) {
        paymentMode = PaymentMode.CARD;
      } else if (lowerDesc.includes('wallet') || lowerDesc.includes('paytm wallet')) {
        paymentMode = PaymentMode.WALLET;
      }

      // Infer merchant name from description
      const merchantName = this.extractMerchant(description);

      transactions.push({
        amount,
        type,
        merchantName,
        category: 'Others', // Resolved later by Categorizer
        timestamp,
        paymentMode,
        referenceNumber,
        description,
        confidenceScore: 0.8, // CSV parsing confidence
        source: 'CSV'
      });
    }

    return transactions;
  }

  private static parseDate(str: string): Date {
    // Attempt standard formats e.g. DD-MM-YYYY, DD/MM/YYYY, YYYY-MM-DD
    const parts = str.split(/[-/.]/);
    if (parts.length === 3) {
      // If YYYY is first
      if (parts[0].length === 4) {
        return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      }
      // Assuming DD-MM-YYYY
      return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
    }
    return new Date(str);
  }

  private static extractMerchant(description: string): string {
    // Basic heuristics to clean description to find merchant name
    // e.g. "UPI/SWIGGY/123456/PAYMENT" -> Swiggy
    const clean = description.replace(/upi|netbanking|pos|imps|neft|rtgs|payment|transfer/gi, '').replace(/[^a-zA-Z0-9\s]/g, ' ');
    const tokens = clean.split(/\s+/).filter(t => t.length > 2);
    return tokens[0] || 'Others';
  }
}

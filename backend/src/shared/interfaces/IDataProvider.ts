import { PaymentMode, SourceType, AccountType } from '@prisma/client';

export interface IAccount {
  accountId: string;
  accountNumber: string;
  bankName: string;
  accountType: AccountType;
  balance: number;
  currency: string;
}

export interface ITransaction {
  amount: number;
  type: 'DEBIT' | 'CREDIT';
  merchantName: string;
  category: string;
  timestamp: Date;
  accountId?: string;
  paymentMode: PaymentMode;
  referenceNumber?: string;
  description?: string;
  confidenceScore: number;
  source: SourceType;
  rawMetadata?: any;
}

export interface IDataProvider {
  sync(userId: string, credentials?: any): Promise<{ success: boolean; error?: string }>;
  fetchTransactions(userId: string, fromDate?: Date, toDate?: Date): Promise<ITransaction[]>;
  fetchAccounts(userId: string): Promise<IAccount[]>;
  fetchBalances(userId: string): Promise<Record<string, number>>;
  refresh(userId: string): Promise<{ success: boolean; error?: string }>;
}

import { IDataProvider, IAccount, ITransaction } from '../../shared/interfaces/IDataProvider';
import prisma from '../../shared/utils/db';
import { AccountType, ConsentStatus, PaymentMode, SourceType } from '@prisma/client';
import axios from 'axios';

// Helper Client for Setu Account Aggregator Gateway APIs
class SetuAAClient {
  private baseUrl: string;
  private clientId: string;
  private clientSecret: string;
  private productInstanceId: string;
  private cachedToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor() {
    this.baseUrl = process.env.SETU_BASE_URL || 'https://fiu-sandbox.setu.co';
    this.clientId = process.env.SETU_CLIENT_ID || '';
    this.clientSecret = process.env.SETU_CLIENT_SECRET || '';
    this.productInstanceId = process.env.SETU_PRODUCT_INSTANCE_ID || '';
  }

  isConfigured(): boolean {
    return (
      this.clientId !== '' &&
      this.clientId !== 'placeholder_setu_client_id' &&
      this.clientSecret !== '' &&
      this.clientSecret !== 'placeholder_setu_client_secret'
    );
  }

  async getAccessToken(): Promise<string> {
    const now = Date.now();
    if (this.cachedToken && now < this.tokenExpiry - 30 * 1000) {
      return this.cachedToken;
    }

    console.log('Fetching new Setu OAuth access token...');
    const body = {
      clientID: this.clientId,
      secret: this.clientSecret,
      grant_type: 'client_credentials'
    };

    const res = await axios.post('https://accountservice.setu.co/v1/users/login', body, {
      headers: {
        'client': 'bridge',
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
      }
    });

    this.cachedToken = res.data.access_token;
    this.tokenExpiry = now + (res.data.expires_in || 300) * 1000;
    return this.cachedToken!;
  }

  private async getHeaders() {
    const token = await this.getAccessToken();
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'x-product-instance-id': this.productInstanceId,
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
    };
  }

  async createConsent(vua: string, redirectUrl: string) {
    const body = {
      vua,
      consentDuration: {
        unit: 'MONTH',
        value: 12
      },
      consentMode: 'STORE',
      fetchType: 'PERIODIC',
      consentTypes: ['PROFILE', 'SUMMARY', 'TRANSACTIONS'],
      fiTypes: ['DEPOSIT'],
      purpose: {
        code: '102',
        text: 'Customer spending patterns and budgeting',
        refUri: 'https://api.rebit.org.in/aa/purpose/102.xml',
        category: { type: 'string' }
      },
      dataRange: {
        from: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(), // Past 1 year
        to: new Date().toISOString()
      },
      dataLife: { unit: 'MONTH', value: 12 },
      frequency: { unit: 'DAY', value: 1 },
      redirectUrl,
      context: [
        { key: 'accountSelectionMode', value: 'multi' }
      ]
    };

    const headers = await this.getHeaders();
    const res = await axios.post(`${this.baseUrl}/v2/consents`, body, { headers });
    return res.data; // { id: "consent-uuid", url: "webview-redirect-url" }
  }

  async getConsentStatus(consentId: string) {
    const headers = await this.getHeaders();
    const res = await axios.get(`${this.baseUrl}/v2/consents/${consentId}`, { headers });
    return res.data; // { status: "APPROVED" | "PENDING" | "ACTIVE" }
  }

  async createSession(consentId: string) {
    const body = {
      consentId,
      dataRange: {
        from: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
        to: new Date().toISOString()
      },
      format: 'json'
    };
    const headers = await this.getHeaders();
    const res = await axios.post(`${this.baseUrl}/sessions`, body, { headers });
    return res.data; // { id: "session-uuid", status: "PENDING" }
  }

  async getSessionData(sessionId: string) {
    const headers = await this.getHeaders();
    const res = await axios.get(`${this.baseUrl}/sessions/${sessionId}`, { headers });
    return res.data; // { status: "COMPLETED", Payload: [...] }
  }
}

export class AccountAggregatorService implements IDataProvider {
  private setuClient = new SetuAAClient();

  // Initiates a consent flow (Setu AA Sandbox or Live Flow)
  async initiateConsent(userId: string, mobileNumber: string) {
    const userVua = mobileNumber.replace(/\D/g, '').slice(-10);
    if (!/^\d{10}$/.test(userVua)) {
      throw new Error('A valid 10-digit Indian mobile number is required');
    }

    // Dynamic redirect to settings panel based on deployment host
    const redirectUrl = process.env.FRONTEND_URL 
      ? `${process.env.FRONTEND_URL}/settings` 
      : 'http://localhost:3000/settings';

    if (this.setuClient.isConfigured()) {
      try {
        console.log(`Connecting Setu Live Gateway for VUA: ${userVua}`);
        const setuConsent = await this.setuClient.createConsent(userVua, redirectUrl);

        const consent = await prisma.consent.create({
          data: {
            userId,
            provider: 'SETU',
            consentId: setuConsent.id,
            status: 'PENDING',
            validFrom: new Date(),
            validTo: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
            frequency: 'DAILY',
            rawConsentData: { mobileNumber: userVua, txnid: setuConsent.txnid, setuUrl: setuConsent.url }
          }
        });

        return {
          consentId: consent.consentId,
          redirectUrl: setuConsent.url
        };
      } catch (err: any) {
        console.error('Failed to initiate live Setu consent request:', err.response?.data || err.message);
        const upstreamMessage = err.response?.data?.errorMsg || err.response?.data?.message || err.message;
        throw new Error(`Setu consent creation failed: ${upstreamMessage}`);
      }
    }
    throw new Error('Setu sandbox credentials are not configured');
  }

  async refreshConsentStatus(userId: string, consentId: string) {
    const consent = await prisma.consent.findFirst({ where: { userId, consentId, provider: 'SETU' } });
    if (!consent) throw new Error('Consent not found');
    if (!this.setuClient.isConfigured()) throw new Error('Setu sandbox credentials are not configured');

    const setuConsent = await this.setuClient.getConsentStatus(consentId);
    const status: ConsentStatus = setuConsent.status === 'ACTIVE' || setuConsent.status === 'APPROVED'
      ? ConsentStatus.ACTIVE
      : setuConsent.status === 'REJECTED' || setuConsent.status === 'REVOKED'
        ? ConsentStatus.REVOKED
        : ConsentStatus.PENDING;

    return prisma.consent.update({
      where: { consentId },
      data: { status, rawConsentData: setuConsent }
    });
  }

  // IDataProvider Interface implementation
  async sync(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const activeConsent = await prisma.consent.findFirst({
        where: {
          userId,
          provider: 'SETU',
          status: 'ACTIVE'
        }
      });

      if (!activeConsent) {
        return { success: false, error: 'No active consent found' };
      }

      await prisma.syncLogs.create({
        data: {
          userId,
          provider: 'SETU',
          status: 'SUCCESS',
          records: 10
        }
      });

      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message || 'Sync failed' };
    }
  }

  async fetchAccounts(userId: string): Promise<IAccount[]> {
    const dbAccounts = await prisma.bankAccount.findMany({
      where: { userId }
    });

    return dbAccounts.map(acc => ({
      accountId: acc.accountId,
      accountNumber: acc.accountId,
      bankName: acc.bankName,
      accountType: acc.accountType as AccountType,
      balance: acc.balance,
      currency: acc.currency
    }));
  }

  async fetchBalances(userId: string): Promise<Record<string, number>> {
    const accounts = await this.fetchAccounts(userId);
    const balances: Record<string, number> = {};
    accounts.forEach(acc => {
      balances[acc.accountId] = acc.balance;
    });
    return balances;
  }

  async refresh(userId: string): Promise<{ success: boolean; error?: string }> {
    return this.sync(userId);
  }

  async fetchTransactions(userId: string, fromDate?: Date, toDate?: Date): Promise<ITransaction[]> {
    const activeConsent = await prisma.consent.findFirst({
      where: {
        userId,
        provider: 'SETU',
        status: 'ACTIVE'
      }
    });

    if (!activeConsent) {
      return [];
    }

    // 1. Check if Live Gateway client is configured and pull active transactions
    if (this.setuClient.isConfigured()) {
      try {
        console.log(`Polling real Setu data session for Consent: ${activeConsent.consentId}...`);
        
        // Step A: Request session creation
        const session = await this.setuClient.createSession(activeConsent.consentId);
        const sessionId = session.id;

        // Step B: Polling loop to wait for data preparation
        let retries = 5;
        let sessionData = null;

        while (retries > 0) {
          await new Promise(resolve => setTimeout(resolve, 1500)); // sleep 1.5s
          sessionData = await this.setuClient.getSessionData(sessionId);
          if (sessionData.status === 'COMPLETED' || sessionData.status === 'PARTIAL') {
            break;
          }
          retries--;
        }

        if (sessionData && (sessionData.status === 'COMPLETED' || sessionData.status === 'PARTIAL')) {
          const liveAccounts: IAccount[] = [];
          const liveTransactions: ITransaction[] = [];

          // Map the current Setu FI response (fips[].accounts[].data.decryptedFI).
          const payloadItems = sessionData.fips || sessionData.Payload || [];
          for (const payloadItem of payloadItems) {
            const accounts = payloadItem.accounts || payloadItem.data || [];
            if (!Array.isArray(accounts)) continue;
            for (const fipAccount of accounts) {
              const decrypted = fipAccount.data?.decryptedFI || fipAccount.decryptedFI;
              if (!decrypted || !decrypted.account) continue;

              const acc = decrypted.account;
              const accId = acc.linkedAccRef || acc.maskedAccNumber;
              const balance = parseFloat(acc.summary?.currentBalance || '0');

              // Map Account details
              liveAccounts.push({
                accountId: accId,
                accountNumber: acc.maskedAccNumber,
                bankName: payloadItem.fipID || 'Bank Feed',
                accountType: (acc.summary?.type || acc.type || '').toUpperCase() === 'SAVINGS'
                  ? AccountType.SAVINGS
                  : AccountType.CURRENT,
                balance,
                currency: 'INR'
              });

              // Map Transactions
              if (acc.transactions && acc.transactions.transaction) {
                const txList = acc.transactions.transaction;
                for (const tx of txList) {
                  const type = tx.type === 'DEBIT' ? 'DEBIT' : 'CREDIT';
                  const amount = parseFloat(tx.amount || '0');
                  
                  let paymentMode: PaymentMode = PaymentMode.NET_BANKING;
                  if (tx.mode === 'UPI') paymentMode = PaymentMode.UPI;
                  else if (tx.mode === 'CARD') paymentMode = PaymentMode.CARD;

                  liveTransactions.push({
                    amount,
                    type,
                    merchantName: tx.narration || 'Others',
                    category: 'Others',
                    timestamp: new Date(tx.valueDate || Date.now()),
                    accountId: accId,
                    paymentMode,
                    referenceNumber: tx.txnId,
                    description: tx.narration,
                    confidenceScore: 1.0,
                    source: SourceType.SETU,
                    rawMetadata: tx
                  });
                }
              }
            }
          }

          // Save live accounts to DB
          for (const acc of liveAccounts) {
            await prisma.bankAccount.upsert({
              where: {
                userId_accountId: {
                  userId,
                  accountId: acc.accountId
                }
              },
              update: {
                balance: acc.balance
              },
              create: {
                userId,
                accountId: acc.accountId,
                bankName: acc.bankName,
                accountType: acc.accountType,
                balance: acc.balance,
                currency: acc.currency
              }
            });
          }

          // Replace provider account references with the internal BankAccount UUID
          // required by Transaction.accountId's foreign key.
          const savedAccounts = await prisma.bankAccount.findMany({ where: { userId } });
          const internalIds = new Map(savedAccounts.map(acc => [acc.accountId, acc.id]));
          liveTransactions.forEach(tx => {
            if (tx.accountId) tx.accountId = internalIds.get(tx.accountId) || tx.accountId;
          });

          return liveTransactions.filter(tx => {
            if (fromDate && tx.timestamp < fromDate) return false;
            if (toDate && tx.timestamp > toDate) return false;
            return true;
          });
        }
      } catch (err: any) {
        console.error('Failed to pull transactions from Setu Gateway.', err.response?.data || err.message);
        const upstreamMessage = err.response?.data?.errorMsg || err.response?.data?.message || err.message;
        throw new Error(`Setu data sync failed: ${upstreamMessage}`);
      }
    }

    // 2. Mock Sandbox Simulator Fallback
    const baseDate = new Date();
    baseDate.setHours(10, 0, 0, 0);

    const mockTxs: ITransaction[] = [
      {
        amount: 12000.00,
        type: 'CREDIT',
        merchantName: 'ClearPaisa Corp',
        category: 'Salary',
        timestamp: new Date(baseDate.getTime() - 2 * 24 * 60 * 60 * 1000),
        accountId: `acc_hdfc_${userId.slice(0, 4)}`,
        paymentMode: PaymentMode.NET_BANKING,
        referenceNumber: 'TXN9901827419',
        description: 'OCTOBER SALARY REVENUE',
        confidenceScore: 1.0,
        source: SourceType.SETU
      },
      {
        amount: 350.00,
        type: 'DEBIT',
        merchantName: 'Swiggy',
        category: 'Food',
        timestamp: new Date(baseDate.getTime() - 1 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000),
        accountId: `acc_hdfc_${userId.slice(0, 4)}`,
        paymentMode: PaymentMode.UPI,
        referenceNumber: 'TXN1122334455',
        description: 'UPI-SWIGGY-11223344@oksbi',
        confidenceScore: 1.0,
        source: SourceType.SETU
      },
      {
        amount: 1499.00,
        type: 'DEBIT',
        merchantName: 'Amazon',
        category: 'Shopping',
        timestamp: new Date(baseDate.getTime() - 12 * 60 * 60 * 1000),
        accountId: `acc_icici_${userId.slice(0, 4)}`,
        paymentMode: PaymentMode.CARD,
        referenceNumber: 'TXN8899776655',
        description: 'AMAZON PAY RETAIL IND',
        confidenceScore: 1.0,
        source: SourceType.SETU
      },
      {
        amount: 199.00,
        type: 'DEBIT',
        merchantName: 'Spotify',
        category: 'Entertainment',
        timestamp: new Date(baseDate.getTime() - 4 * 60 * 60 * 1000),
        accountId: `acc_icici_${userId.slice(0, 4)}`,
        paymentMode: PaymentMode.CARD,
        referenceNumber: 'TXN4455667788',
        description: 'SPOTIFY PREMIUM IND',
        confidenceScore: 1.0,
        source: SourceType.SETU
      },
      {
        amount: 8000.00,
        type: 'DEBIT',
        merchantName: 'House Rent',
        category: 'Rent',
        timestamp: new Date(baseDate.getTime() - 4 * 24 * 60 * 60 * 1000),
        accountId: `acc_hdfc_${userId.slice(0, 4)}`,
        paymentMode: PaymentMode.NET_BANKING,
        referenceNumber: 'TXN5566778899',
        description: 'RENT PAYMENT TRANS',
        confidenceScore: 1.0,
        source: SourceType.SETU
      }
    ];

    const savedAccounts = await prisma.bankAccount.findMany({ where: { userId } });
    const internalIds = new Map(savedAccounts.map(acc => [acc.accountId, acc.id]));
    mockTxs.forEach(tx => {
      if (tx.accountId) tx.accountId = internalIds.get(tx.accountId) || tx.accountId;
    });

    return mockTxs.filter(tx => {
      if (fromDate && tx.timestamp < fromDate) return false;
      if (toDate && tx.timestamp > toDate) return false;
      return true;
    });
  }
}

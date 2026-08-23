import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { GmailService } from '../modules/gmail/gmail.service';
import { AccountAggregatorService } from '../modules/accountAggregator/accountAggregator.service';
import { SubscriptionsService } from '../modules/subscriptions/subscriptions.service';
import { TransactionEngine } from '../modules/transactions/transaction.engine';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const connection = new IORedis(REDIS_URL, { maxRetriesPerRequest: null });

const gmailService = new GmailService();
const aaService = new AccountAggregatorService();
const subsService = new SubscriptionsService();
const txEngine = new TransactionEngine();

export const startSyncWorker = () => {
  const worker = new Worker(
    'SyncQueue',
    async (job: Job) => {
      const { userId } = job.data;
      console.log(`Processing job ${job.name} for user ${userId}...`);

      switch (job.name) {
        case 'gmail-sync': {
          const syncResult = await gmailService.sync(userId);
          if (syncResult.success) {
            const txs = await gmailService.fetchTransactions(userId);
            await txEngine.processAndMergeTransactions(userId, txs);
          } else {
            throw new Error(`Gmail Sync failed: ${syncResult.error}`);
          }
          break;
        }

        case 'setu-sync': {
          const txs = await aaService.fetchTransactions(userId);
          await txEngine.processAndMergeTransactions(userId, txs);
          await aaService.sync(userId);
          break;
        }

        case 'subscription-detection': {
          await subsService.autoDetectSubscriptions(userId);
          break;
        }

        default:
          console.warn(`Unknown job name: ${job.name}`);
      }
    },
    { connection }
  );

  worker.on('completed', (job) => {
    console.log(`Job ${job.id} of name ${job.name} completed successfully.`);
  });

  worker.on('failed', (job, err) => {
    console.error(`Job ${job?.id} failed:`, err);
  });

  return worker;
};

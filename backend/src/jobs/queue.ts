import { Queue } from 'bullmq';
import IORedis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const connection = new IORedis(REDIS_URL, { maxRetriesPerRequest: null });

export const syncQueue = new Queue('SyncQueue', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000
    },
    removeOnComplete: true,
    removeOnFail: 1000
  }
});

export const addSyncJob = async (userId: string, provider: 'GMAIL' | 'SETU') => {
  await syncQueue.add(`${provider.toLowerCase()}-sync`, { userId }, {
    jobId: `${userId}-${provider.toLowerCase()}-${Date.now()}`
  });
};

export const addSubscriptionDetectionJob = async (userId: string) => {
  await syncQueue.add('subscription-detection', { userId }, {
    jobId: `${userId}-sub-detect-${Date.now()}`
  });
};

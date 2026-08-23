import dotenv from 'dotenv';
// Load environment variables before routing imports
dotenv.config();

import app from './app';
import { startSyncWorker } from './jobs/worker';

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(`🚀 ClearPaisa Backend Server running on port ${PORT}`);
  console.log(`🚀 API: http://localhost:${PORT}/api`);
  console.log(`===============================================`);

  // Start background task processing worker
  try {
    startSyncWorker();
    console.log(`⚙️  BullMQ sync background worker active.`);
  } catch (err) {
    console.error(`⚠️ Failed to launch background worker:`, err);
  }
});

process.on('SIGTERM', () => {
  console.log('SIGTERM signal received. Closing HTTP server...');
  server.close(() => {
    console.log('HTTP server closed.');
    process.exit(0);
  });
});

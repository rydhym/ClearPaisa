import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';

// Route Imports
import authRoutes from './modules/auth/auth.routes';
import transactionsRoutes from './modules/transactions/transactions.routes';
import gmailRoutes from './modules/gmail/gmail.routes';
import aaRoutes from './modules/accountAggregator/accountAggregator.routes';
import dashboardRoutes from './modules/dashboard/dashboard.routes';
import budgetsRoutes from './modules/budgets/budgets.routes';
import subscriptionsRoutes from './modules/subscriptions/subscriptions.routes';
import aiRoutes from './modules/ai/ai.routes';
import notificationsRoutes from './modules/notifications/notifications.routes';
import usersRoutes from './modules/users/users.routes';

const app = express();

// Security Middlewares
app.use(helmet());
app.use(cors({
  origin: '*', // Allow all origins for dev sandbox setup
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Parsing Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', timestamp: new Date() });
});

// Mounting Module Routers
app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionsRoutes);
app.use('/api/gmail', gmailRoutes);
app.use('/api/account-aggregator', aaRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/budgets', budgetsRoutes);
app.use('/api/subscriptions', subscriptionsRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/users', usersRoutes);

// Global Error Handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error'
  });
});

export default app;

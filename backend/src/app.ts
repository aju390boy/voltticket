import 'dotenv/config';
import http from 'http';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';

import { connectMongoDB } from './config/mongodb';
import { connectRedis } from './config/redis';
import { initializeSocket } from './sockets';
import { checkoutQueue, emailQueue, seatReleaseQueue, dlq } from './config/bullmq';
import { errorHandler, notFound } from './middleware/errorHandler';
import { logger } from './utils/logger';
import passport from './config/passport';

import authRoutes from './routes/auth.routes';
import eventsRoutes from './routes/events.routes';
import seatsRoutes from './routes/seats.routes';
import checkoutRoutes from './routes/checkout.routes';
import ordersRoutes from './routes/orders.routes';
import adminRoutes from './routes/admin.routes';
import webhookRoutes from './routes/webhook.routes';

const app = express();
const httpServer = http.createServer(app);

// Webhook route needs raw body — MUST be before express.json()
app.use('/webhooks', express.raw({ type: 'application/json' }), webhookRoutes);

app.use(helmet({ contentSecurityPolicy: false }));
app.use(passport.initialize());

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, server-to-server)
    if (!origin) return callback(null, true);
    const allowed = [
      process.env.CLIENT_URL,
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:5175',
      'http://127.0.0.1:5173',
    ].filter(Boolean) as string[];
    if (allowed.includes(origin)) return callback(null, true);
    // In production, reject unknown origins
    if (process.env.NODE_ENV === 'production') {
      return callback(new Error(`CORS: origin ${origin} not allowed`));
    }
    // In dev, allow all
    callback(null, true);
  },
  credentials: true,
}));
app.use(express.json());
app.use(morgan('dev'));

// Bull Board visual dashboard
const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');
createBullBoard({
  queues: [
    new BullMQAdapter(checkoutQueue),
    new BullMQAdapter(emailQueue),
    new BullMQAdapter(seatReleaseQueue),
    new BullMQAdapter(dlq),
  ],
  serverAdapter,
});
app.use('/admin/queues', serverAdapter.getRouter());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/seats', seatsRoutes);
app.use('/api/checkout', checkoutRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/admin', adminRoutes);

app.get('/api/health', async (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), service: 'VoltTicket API' });
});

app.use(notFound);
app.use(errorHandler);

async function start() {
  try {
    await connectRedis();
    await connectMongoDB();
    initializeSocket(httpServer);

    const PORT = process.env.PORT || 3001;
    httpServer.listen(PORT, () => {
      logger.info(`⚡ VoltTicket API running on http://localhost:${PORT}`);
      logger.info(`📊 Bull Board: http://localhost:${PORT}/admin/queues`);
    });
  } catch (err) {
    logger.error('Startup failed:', err);
    process.exit(1);
  }
}

start();

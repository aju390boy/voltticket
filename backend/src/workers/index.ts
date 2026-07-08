import 'dotenv/config';
import { connectMongoDB } from '../config/mongodb';
import { connectRedis } from '../config/redis';
import { startCheckoutWorker } from './checkoutWorker';
import { startEmailWorker } from './emailWorker';
import { startSeatReleaseWorker } from './seatReleaseWorker';
import { logger } from '../utils/logger';

async function startWorkers() {
  logger.info('Starting VoltTicket workers...');
  await connectRedis();
  await connectMongoDB();

  startCheckoutWorker();
  startEmailWorker();
  startSeatReleaseWorker();

  logger.info('✅ All workers running');

  process.on('SIGTERM', async () => {
    logger.info('Workers shutting down...');
    process.exit(0);
  });
}

startWorkers().catch((err) => {
  logger.error('Worker startup failed:', err);
  process.exit(1);
});

import { Worker, Job } from 'bullmq';
import { bullmqConnection } from '../config/bullmq';
import { CheckoutService } from '../services/CheckoutService';
import { Order } from '../models/Order';
import { dlq } from '../config/bullmq';
import { logger } from '../utils/logger';

export function startCheckoutWorker() {
  const worker = new Worker(
    'checkout',
    async (job: Job) => {
      logger.info(`Processing checkout job ${job.id}`, { orderId: job.data.orderId });
      const result = await CheckoutService.processCheckout(job.data);
      logger.info(`Checkout job ${job.id} completed`);
      return result;
    },
    {
      connection: bullmqConnection,
      concurrency: 10,
      limiter: { max: 50, duration: 1000 },
    }
  );

  worker.on('completed', (job) => {
    logger.info(`✅ Job ${job.id} completed`);
  });

  worker.on('failed', async (job, err) => {
    logger.error(`❌ Job ${job?.id} failed:`, err.message);
    if (job && job.attemptsMade >= (job.opts.attempts || 3)) {
      await dlq.add('failed-checkout', {
        ...job.data,
        error: err.message,
        originalJobId: job.id,
      });
      if (job.data.orderId) {
        await Order.findByIdAndUpdate(job.data.orderId, { $set: { status: 'failed' } });
      }
    }
  });

  worker.on('error', (err) => logger.error('Worker error:', err));
  logger.info('✅ Checkout worker started');
  return worker;
}

import { Worker, Job } from 'bullmq';
import { bullmqConnection } from '../config/bullmq';
import { CheckoutService } from '../services/CheckoutService';
import { logger } from '../utils/logger';

export function startSeatReleaseWorker() {
  const worker = new Worker(
    'seat-release',
    async (job: Job) => {
      const { seatId, eventId, userId, token } = job.data;
      logger.info(`Auto-releasing expired seat ${seatId}`);
      await CheckoutService.releaseSeat(eventId, seatId, userId, token);
    },
    { connection: bullmqConnection, concurrency: 50 }
  );

  worker.on('failed', (job, err) =>
    logger.error(`Seat release job ${job?.id} failed:`, err.message)
  );
  logger.info('✅ Seat release worker started');
  return worker;
}

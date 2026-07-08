import { Queue, FlowProducer } from 'bullmq';

// BullMQ bundles its own ioredis — use connection options object to avoid type conflicts
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const url = new URL(REDIS_URL);

const connection = {
  host: url.hostname,
  port: parseInt(url.port || '6379', 10),
  password: url.password || undefined,
  maxRetriesPerRequest: null as null,
  enableReadyCheck: false,
};

export const checkoutQueue = new Queue('checkout', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: { count: 200 },
    removeOnFail: { age: 86400 },
  },
});

export const emailQueue = new Queue('email', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 },
    removeOnComplete: { count: 100 },
    removeOnFail: { age: 86400 },
  },
});

export const seatReleaseQueue = new Queue('seat-release', {
  connection,
  defaultJobOptions: {
    removeOnComplete: true,
    removeOnFail: { age: 3600 },
  },
});

export const dlq = new Queue('dead-letter', {
  connection,
  defaultJobOptions: {
    removeOnComplete: false,
    removeOnFail: false,
  },
});

export const flowProducer = new FlowProducer({ connection });
export { connection as bullmqConnection };

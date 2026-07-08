import { Queue, FlowProducer } from 'bullmq';

// BullMQ bundles its own ioredis — use connection options object to avoid type conflicts
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const isTLS = REDIS_URL.startsWith('rediss://');
// For parsing: convert rediss:// to redis:// so URL parser doesn't choke
const url = new URL(REDIS_URL.replace('rediss://', 'redis://'));

const connection: any = {
  host: url.hostname,
  port: parseInt(url.port || '6379', 10),
  password: url.password || undefined,
  username: url.username || 'default',
  maxRetriesPerRequest: null as null,
  enableReadyCheck: false,
  ...(isTLS ? { tls: { rejectUnauthorized: false } } : {}),
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

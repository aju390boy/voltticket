import Redis from 'ioredis';
import { logger } from '../utils/logger';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Upstash and other cloud Redis providers use rediss:// (TLS)
const isTLS = REDIS_URL.startsWith('rediss://');

const baseOpts: any = {
  maxRetriesPerRequest: null, // Required for BullMQ
  enableReadyCheck: false,
  lazyConnect: true,
  ...(isTLS ? { tls: { rejectUnauthorized: false } } : {}),
};

export const redis = new Redis(REDIS_URL, { ...baseOpts });

export const pubClient = new Redis(REDIS_URL, { ...baseOpts });

export const subClient = pubClient.duplicate();

redis.on('connect', () => logger.info('✅ Redis connected'));
redis.on('error', (err) => logger.error('❌ Redis error:', err));

export async function connectRedis(): Promise<void> {
  await redis.connect();
  await pubClient.connect();
  await subClient.connect();
}

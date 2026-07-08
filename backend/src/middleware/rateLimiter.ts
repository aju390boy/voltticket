import { Response, NextFunction } from 'express';
import { redis } from '../config/redis';
import { AuthRequest } from './auth';

const SLIDING_WINDOW_SCRIPT = `
  local key = KEYS[1]
  local now = tonumber(ARGV[1])
  local window = tonumber(ARGV[2])
  local limit = tonumber(ARGV[3])
  local request_id = ARGV[4]
  redis.call('ZREMRANGEBYSCORE', key, 0, now - window)
  local count = redis.call('ZCARD', key)
  if count < limit then
    redis.call('ZADD', key, now, request_id)
    redis.call('EXPIRE', key, math.ceil(window / 1000))
    return {1, limit - count - 1}
  else
    return {0, 0}
  end
`;

export function createRateLimiter(options: {
  windowMs: number;
  max: number;
  keyPrefix?: string;
}) {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const userId = req.user?.id || req.ip || 'anonymous';
    const prefix = options.keyPrefix || 'rate';
    const key = `${prefix}:${userId}`;
    const requestId = `${Date.now()}-${Math.random()}`;

    try {
      const result = (await redis.eval(
        SLIDING_WINDOW_SCRIPT,
        1,
        key,
        Date.now().toString(),
        options.windowMs.toString(),
        options.max.toString(),
        requestId
      )) as [number, number];

      const [allowed, remaining] = result;

      res.setHeader('X-RateLimit-Limit', options.max);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, remaining));
      res.setHeader('X-RateLimit-Window', options.windowMs);

      if (!allowed) {
        res.status(429).json({
          error: 'RATE_LIMITED',
          message: 'Too many requests. Please slow down.',
          retryAfter: Math.ceil(options.windowMs / 1000),
        });
        return;
      }
      next();
    } catch {
      next(); // Fail open — don't block if Redis is down
    }
  };
}

export const flashSaleRateLimiter = createRateLimiter({
  windowMs: 60_000,
  max: 5,
  keyPrefix: 'flash_rate',
});

export const generalRateLimiter = createRateLimiter({
  windowMs: 60_000,
  max: 100,
  keyPrefix: 'general_rate',
});

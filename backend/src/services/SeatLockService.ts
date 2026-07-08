import { redis } from '../config/redis';
import { logger } from '../utils/logger';

const LOCK_TTL_MS = 5 * 60 * 1000; // 5 minutes

const RELEASE_SCRIPT = `
  if redis.call("get", KEYS[1]) == ARGV[1] then
    return redis.call("del", KEYS[1])
  else
    return 0
  end
`;

const EXTEND_SCRIPT = `
  if redis.call("get", KEYS[1]) == ARGV[1] then
    return redis.call("pexpire", KEYS[1], ARGV[2])
  else
    return 0
  end
`;

const CHECK_SCRIPT = `
  local val = redis.call("get", KEYS[1])
  if val == ARGV[1] then
    return 1
  else
    return 0
  end
`;

export class SeatLockService {
  static lockKey(eventId: string, seatId: string): string {
    return `lock:seat:${eventId}:${seatId}`;
  }

  static async acquireLock(
    eventId: string,
    seatId: string,
    token: string,
    ttlMs = LOCK_TTL_MS
  ): Promise<boolean> {
    const key = this.lockKey(eventId, seatId);
    const result = await (redis as any).set(key, token, 'NX', 'PX', ttlMs);
    const acquired = result === 'OK';
    if (acquired) {
      logger.debug(`Lock acquired: ${key} (token: ${token.slice(0, 8)}...)`);
    }
    return acquired;
  }

  static async releaseLock(
    eventId: string,
    seatId: string,
    token: string
  ): Promise<boolean> {
    const key = this.lockKey(eventId, seatId);
    const result = (await redis.eval(RELEASE_SCRIPT, 1, key, token)) as number;
    const released = result === 1;
    if (released) {
      logger.debug(`Lock released: ${key}`);
    } else {
      logger.warn(`Lock release failed (expired or stolen): ${key}`);
    }
    return released;
  }

  static async verifyLock(
    eventId: string,
    seatId: string,
    token: string
  ): Promise<boolean> {
    const key = this.lockKey(eventId, seatId);
    const result = (await redis.eval(CHECK_SCRIPT, 1, key, token)) as number;
    return result === 1;
  }

  static async extendLock(
    eventId: string,
    seatId: string,
    token: string,
    ttlMs = LOCK_TTL_MS
  ): Promise<boolean> {
    const key = this.lockKey(eventId, seatId);
    const result = (await redis.eval(
      EXTEND_SCRIPT,
      1,
      key,
      token,
      ttlMs.toString()
    )) as number;
    return result === 1;
  }

  static async releaseAllLocksForUser(userId: string): Promise<void> {
    const pattern = `lock:seat:*`;
    const keys = await redis.keys(pattern);
    for (const key of keys) {
      const val = await redis.get(key);
      if (val && val.includes(userId)) {
        await redis.del(key);
      }
    }
  }

  static async getLockTTL(eventId: string, seatId: string): Promise<number> {
    const key = this.lockKey(eventId, seatId);
    return redis.pttl(key);
  }
}

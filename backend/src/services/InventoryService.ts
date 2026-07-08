import mongoose from 'mongoose';
import { redis } from '../config/redis';
import { Event } from '../models/Event';
import { Seat } from '../models/Seat';
import { logger } from '../utils/logger';

export class InventoryService {
  static inventoryKey(eventId: string): string {
    return `inventory:${eventId}`;
  }

  static async initializeInventory(eventId: string, count: number): Promise<void> {
    const key = this.inventoryKey(eventId);
    await redis.set(key, count.toString());
    logger.info(`Inventory initialized: ${eventId} = ${count}`);
  }

  /**
   * Try to decrement the inventory counter.
   * Auto-heals from Redis restarts or stale/incorrect counters
   * by re-checking the actual available seat count from MongoDB.
   */
  static async tryDecrement(eventId: string): Promise<boolean> {
    const key = this.inventoryKey(eventId);

    // Check current Redis value
    const currentVal = await redis.get(key);
    const currentCount = currentVal !== null ? parseInt(currentVal, 10) : -1;

    // Re-sync from real MongoDB seat count if:
    //  - key doesn't exist (Redis restarted)
    //  - value is 0 or negative (might be stale from failed prev attempt)
    if (currentCount <= 0) {
      const eid = new mongoose.Types.ObjectId(eventId);
      const realCount = await Seat.countDocuments({ eventId: eid, status: 'available' });
      logger.info(`Re-syncing inventory for ${eventId}: Redis=${currentCount} → DB=${realCount}`);

      if (realCount <= 0) return false; // Genuinely sold out

      // Set to actual count
      await redis.set(key, realCount.toString());
    }

    // Atomic decrement
    const result = await redis.decr(key);
    if (result < 0) {
      await redis.incr(key); // Undo
      return false;
    }
    return true;
  }

  static async increment(eventId: string): Promise<void> {
    const key = this.inventoryKey(eventId);
    await redis.incr(key);
  }

  static async getCount(eventId: string): Promise<number> {
    const key = this.inventoryKey(eventId);
    const val = await redis.get(key);
    return val ? parseInt(val, 10) : 0;
  }

  static async syncFromDatabase(eventId: string): Promise<void> {
    const event = await Event.findById(eventId).lean();
    if (!event) throw new Error(`Event not found: ${eventId}`);
    const eid = new mongoose.Types.ObjectId(eventId);
    const realCount = await Seat.countDocuments({ eventId: eid, status: 'available' });
    await this.initializeInventory(eventId, realCount);
  }
}

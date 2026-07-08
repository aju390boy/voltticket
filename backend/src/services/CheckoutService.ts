import { v4 as uuidv4 } from 'uuid';
import { SeatLockService } from './SeatLockService';
import { InventoryService } from './InventoryService';
import { PaymentService } from './PaymentService';
import { Seat } from '../models/Seat';
import { Order } from '../models/Order';
import { Event } from '../models/Event';
import { AuditLog } from '../models/AuditLog';
import { seatReleaseQueue, emailQueue } from '../config/bullmq';
import { logger } from '../utils/logger';
import { getIO } from '../sockets';

export interface ReserveRequest {
  eventId: string;
  seatId: string;
  userId: string;
}

export interface CheckoutRequest {
  orderId: string;
  userId: string;
  seatIds: string[];
  eventId: string;
  paymentMethodId?: string;
  lockTokens: Record<string, string>;
}

export const CheckoutService = {
  async reserveSeat({ eventId, seatId, userId }: ReserveRequest) {
    // Layer 1: Check Redis inventory (fast gate)
    const hasInventory = await InventoryService.tryDecrement(eventId);
    if (!hasInventory) {
      throw Object.assign(new Error('Event is sold out'), { code: 'SOLD_OUT' });
    }

    // Layer 2: Acquire distributed seat lock
    const token = uuidv4();
    const acquired = await SeatLockService.acquireLock(eventId, seatId, token);
    if (!acquired) {
      await InventoryService.increment(eventId); // Compensate
      throw Object.assign(new Error('Seat is currently reserved by another user'), {
        code: 'SEAT_LOCKED',
      });
    }

    // Layer 3: Atomic MongoDB seat state transition
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    const seat = await Seat.findOneAndUpdate(
      { _id: seatId, eventId, status: 'available' },
      {
        $set: { status: 'locked', lockedBy: userId, lockedUntil: expiresAt },
        $inc: { fencingToken: 1 },
      },
      { returnDocument: 'after' }
    );

    if (!seat) {
      await SeatLockService.releaseLock(eventId, seatId, token);
      await InventoryService.increment(eventId);
      throw Object.assign(new Error('Seat unavailable'), { code: 'SEAT_UNAVAILABLE' });
    }

    // Update event locked count
    await Event.findByIdAndUpdate(eventId, {
      $inc: { lockedSeats: 1, availableSeats: -1 },
    });

    // Schedule auto-release after 5 minutes
    await seatReleaseQueue.add(
      'release-expired-seat',
      { seatId, eventId, userId, token },
      { delay: 5 * 60 * 1000, jobId: `release-${seatId}` }
    );

    // Broadcast seat lock via Socket.IO
    try {
      const io = getIO();
      io.to(`event:${eventId}`).emit('seat:updated', {
        seatId,
        status: 'locked',
        lockedUntil: expiresAt.toISOString(),
      });
    } catch {
      // Socket.IO might not be initialized in worker context
    }

    await AuditLog.create({
      entityType: 'seat',
      entityId: seatId,
      action: 'SEAT_LOCKED',
      userId,
      newState: { status: 'locked', lockedBy: userId },
    });

    return { token, expiresAt, seat };
  },

  async processCheckout(data: CheckoutRequest) {
    const { orderId, userId, seatIds, eventId, lockTokens } = data;

    try {
      // ── Step 1: Verify all seat locks are still held ──────────────────────
      for (const seatId of seatIds) {
        const token = lockTokens[seatId];
        if (!token) throw Object.assign(new Error(`No lock token for seat ${seatId}`), { code: 'NO_TOKEN' });
        const valid = await SeatLockService.verifyLock(eventId, seatId, token);
        if (!valid) {
          throw Object.assign(new Error(`Lock expired for seat ${seatId}`), {
            code: 'LOCK_EXPIRED',
          });
        }
      }

      // ── Step 2: Calculate total ───────────────────────────────────────────
      const seats = await Seat.find({ _id: { $in: seatIds } }).lean();
      if (seats.length !== seatIds.length) {
        throw Object.assign(new Error('One or more seats not found'), { code: 'SEATS_NOT_FOUND' });
      }
      const totalAmount = seats.reduce((sum, s) => sum + s.price, 0);

      // ── Step 3: Create Payment (mock in dev, real Stripe in production) ───
      const paymentIntent = await PaymentService.createPaymentIntent(orderId, totalAmount);

      // ── Step 4: Mark seats as sold (atomic per-document, no session needed) ─
      const updateResult = await Seat.updateMany(
        { _id: { $in: seatIds }, status: 'locked', lockedBy: userId },
        {
          $set: {
            status: 'sold',
            orderId,
            lockedBy: undefined,
            lockedUntil: undefined,
          },
        }
      );

      if (updateResult.modifiedCount !== seatIds.length) {
        throw Object.assign(
          new Error('Seat state conflict — some seats were modified by another process'),
          { code: 'SEAT_CONFLICT' }
        );
      }

      // ── Step 5: Confirm order ─────────────────────────────────────────────
      await Order.findByIdAndUpdate(orderId, {
        $set: {
          status: 'confirmed',
          stripePaymentIntentId: paymentIntent.id,
          totalAmount,
        },
      });

      // ── Step 6: Update event counters ─────────────────────────────────────
      await Event.findByIdAndUpdate(eventId, {
        $inc: { soldSeats: seatIds.length, lockedSeats: -seatIds.length },
      });

      // ── Step 7: Release Redis locks + cancel auto-release jobs ────────────
      for (const seatId of seatIds) {
        await SeatLockService.releaseLock(eventId, seatId, lockTokens[seatId]);
        const releaseJob = await seatReleaseQueue.getJob(`release-${seatId}`);
        if (releaseJob) await releaseJob.remove();
      }

      // ── Step 8: Broadcast sold seats via Socket.IO ────────────────────────
      try {
        const io = getIO();
        seatIds.forEach((seatId) => {
          io.to(`event:${eventId}`).emit('seat:updated', { seatId, status: 'sold' });
        });
      } catch {
        // Socket.IO not available in worker context — safe to ignore
      }

      // ── Step 9: Queue confirmation email ──────────────────────────────────
      await emailQueue.add('send-ticket-email', { orderId, userId, eventId, seatIds });

      await AuditLog.create({
        entityType: 'order',
        entityId: orderId,
        action: 'ORDER_CONFIRMED',
        userId,
        newState: { status: 'confirmed', totalAmount },
      });

      return {
        success: true,
        paymentIntentId: paymentIntent.id,
        clientSecret: (paymentIntent as any).client_secret,
        totalAmount,
      };
    } catch (error: any) {
      // ── SAGA compensation — only release locks on non-retryable errors ────
      // LOCK_EXPIRED means lock is already gone — no need to release
      // For other errors: release lock + revert state so user can retry
      logger.error('Checkout failed, running compensations', { error: { code: error.code }, orderId });

      if (error.code !== 'LOCK_EXPIRED' && error.code !== 'NO_TOKEN') {
        for (const seatId of seatIds) {
          const token = lockTokens[seatId];
          if (token) await SeatLockService.releaseLock(eventId, seatId, token);
          await Seat.findOneAndUpdate(
            { _id: seatId, status: { $in: ['locked', 'sold'] }, lockedBy: userId },
            {
              $set: {
                status: 'available',
                lockedBy: undefined,
                lockedUntil: undefined,
                orderId: undefined,
              },
            }
          );
          await InventoryService.increment(eventId);
        }

        await Event.findByIdAndUpdate(eventId, {
          $inc: { lockedSeats: -seatIds.length, availableSeats: seatIds.length },
        });

        try {
          const io = getIO();
          seatIds.forEach((seatId) => {
            io.to(`event:${eventId}`).emit('seat:updated', { seatId, status: 'available' });
          });
        } catch { /* ignore */ }
      }

      await Order.findByIdAndUpdate(orderId, { $set: { status: 'failed' } });
      throw error;
    }
  },


  async releaseSeat(
    eventId: string,
    seatId: string,
    userId: string,
    token: string
  ) {
    await SeatLockService.releaseLock(eventId, seatId, token);
    await Seat.findOneAndUpdate(
      { _id: seatId, lockedBy: userId },
      {
        $set: {
          status: 'available',
          lockedBy: undefined,
          lockedUntil: undefined,
        },
      }
    );
    await InventoryService.increment(eventId);
    await Event.findByIdAndUpdate(eventId, {
      $inc: { lockedSeats: -1, availableSeats: 1 },
    });

    try {
      const io = getIO();
      io.to(`event:${eventId}`).emit('seat:updated', { seatId, status: 'available' });
    } catch {
      // ignore
    }

    await AuditLog.create({
      entityType: 'seat',
      entityId: seatId,
      action: 'SEAT_RELEASED',
      userId,
      newState: { status: 'available' },
    });
  },
};

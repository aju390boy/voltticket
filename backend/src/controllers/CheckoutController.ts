import { Response } from 'express';
import mongoose from 'mongoose';
import { AuthRequest } from '../middleware/auth';
import { checkoutQueue } from '../config/bullmq';
import { Order } from '../models/Order';
import { Seat } from '../models/Seat';

export const CheckoutController = {
  async initiate(req: AuthRequest, res: Response) {
    try {
      const { eventId, seatIds, lockTokens } = req.body;
      const userId = req.user!.id;

      // Use MongoDB ObjectId — not UUID (UUID breaks _id cast)
      const orderId = new mongoose.Types.ObjectId();
      const orderIdStr = orderId.toString();

      const idempotencyKey = `order-${userId}-${JSON.stringify([...seatIds].sort())}`;

      // Idempotency check — prevent double submissions
      const existing = await Order.findOne({
        idempotencyKey,
        status: { $in: ['pending', 'confirmed'] },
      });
      if (existing) {
        return res.json({ orderId: existing._id, jobId: existing.jobId, existing: true });
      }

      const seatDocs = await Seat.find({ _id: { $in: seatIds } }).lean();
      const totalAmount = seatDocs.reduce((sum, s) => sum + s.price, 0);

      await Order.create({
        _id: orderId,
        userId,
        eventId,
        seatIds,
        status: 'pending',
        idempotencyKey,
        totalAmount,
      });

      // VIP users get priority 1 (lowest = processed first), regular = 100
      const priority = req.user!.role === 'vip' ? 1 : 100;

      // BullMQ v5: no colons allowed in jobId — use hyphens
      const job = await checkoutQueue.add(
        'process-checkout',
        { orderId: orderIdStr, userId, seatIds, eventId, lockTokens },
        { priority, jobId: `checkout-${orderIdStr}` }
      );

      await Order.findByIdAndUpdate(orderId, { $set: { jobId: job.id } });

      res.status(202).json({ orderId: orderIdStr, jobId: job.id, message: 'Checkout queued' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  async getJobStatus(req: AuthRequest, res: Response) {
    try {
      const { jobId } = req.params;
      const job = await checkoutQueue.getJob(jobId as string);
      if (!job) return res.status(404).json({ error: 'Job not found' });

      const state = await job.getState();
      res.json({ jobId, state, result: job.returnvalue, failedReason: job.failedReason });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },
};

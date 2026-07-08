import { Request, Response } from 'express';
import { Event } from '../models/Event';
import { Order } from '../models/Order';
import { AuditLog } from '../models/AuditLog';
import { checkoutQueue, emailQueue, seatReleaseQueue } from '../config/bullmq';
import { PaymentService } from '../services/PaymentService';
import { buildDashboardPipeline, buildRecentOrdersPipeline } from '../aggregations/dashboardPipeline';
import { InventoryService } from '../services/InventoryService';
import { logger } from '../utils/logger';

export const AdminController = {
  async getStats(req: Request, res: Response) {
    try {
      const { eventId } = req.query as { eventId: string };
      if (!eventId) return res.status(400).json({ error: 'eventId required' });

      const [eventStats, recentOrders] = await Promise.all([
        Event.aggregate(buildDashboardPipeline(eventId)),
        Order.aggregate(buildRecentOrdersPipeline(eventId)),
      ]);

      res.json({ event: eventStats[0] || {}, recentOrders });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  async getQueueStats(req: Request, res: Response) {
    try {
      const [checkoutCounts, emailCounts, releaseCounts] = await Promise.all([
        checkoutQueue.getJobCounts(),
        emailQueue.getJobCounts(),
        seatReleaseQueue.getJobCounts(),
      ]);

      res.json({
        checkout: checkoutCounts,
        email: emailCounts,
        seatRelease: releaseCounts,
        stripeCircuit: PaymentService.getCircuitState(),
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  async getAuditLog(req: Request, res: Response) {
    try {
      const { page = 1, limit = 50, entityType } = req.query;
      const filter: any = entityType ? { entityType } : {};
      const logs = await AuditLog.find(filter)
        .sort({ createdAt: -1 })
        .limit(Number(limit))
        .skip((Number(page) - 1) * Number(limit))
        .lean();
      const total = await AuditLog.countDocuments(filter);
      res.json({ logs, total, page: Number(page) });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  async pauseSale(req: Request, res: Response) {
    try {
      const { eventId } = req.params;
      await Event.findByIdAndUpdate(eventId, { $set: { status: 'paused' } });
      res.json({ message: 'Sale paused' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  async resumeSale(req: Request, res: Response) {
    try {
      const { eventId } = req.params;
      await Event.findByIdAndUpdate(eventId, { $set: { status: 'live' } });
      res.json({ message: 'Sale resumed' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  async refundOrder(req: Request, res: Response) {
    try {
      const { orderId } = req.params;
      const order = await Order.findById(orderId);
      if (!order) return res.status(404).json({ error: 'Order not found' });
      if (!order.stripePaymentIntentId) return res.status(400).json({ error: 'No payment to refund' });

      const refund = await PaymentService.refundPayment(order.stripePaymentIntentId);
      await Order.findByIdAndUpdate(orderId, { $set: { status: 'refunded', refundId: refund.id } });

      res.json({ message: 'Refund processed', refundId: refund.id });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  async createEvent(req: Request, res: Response) {
    try {
      const event = await Event.create(req.body);
      await InventoryService.initializeInventory(event._id.toString(), event.availableSeats);
      res.status(201).json({ event });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },
};

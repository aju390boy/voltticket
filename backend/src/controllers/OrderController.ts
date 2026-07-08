import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { Order } from '../models/Order';

export const OrderController = {
  async getMyOrders(req: AuthRequest, res: Response) {
    try {
      const orders = await Order.find({ userId: req.user!.id })
        .populate('eventId', 'title artist venue venueCity date')
        .populate('seatIds', 'label section tier price')
        .sort({ createdAt: -1 })
        .lean();
      res.json({ orders });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  async getOrder(req: AuthRequest, res: Response) {
    try {
      const order = await Order.findOne({ _id: req.params.id, userId: req.user!.id })
        .populate('eventId')
        .populate('seatIds')
        .lean();
      if (!order) return res.status(404).json({ error: 'Order not found' });
      res.json({ order });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },
};

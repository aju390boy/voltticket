import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { CheckoutService } from '../services/CheckoutService';

export const SeatController = {
  async reserve(req: AuthRequest, res: Response) {
    try {
      const { seatId } = req.params;
      const { eventId } = req.body;
      const userId = req.user!.id;

      const result = await CheckoutService.reserveSeat({ eventId: eventId as string, seatId: seatId as string, userId });

      res.json({
        success: true,
        token: result.token,
        expiresAt: result.expiresAt,
        seat: {
          id: result.seat._id,
          label: result.seat.label,
          tier: result.seat.tier,
          price: result.seat.price,
        },
      });
    } catch (err: any) {
      const status =
        err.code === 'SOLD_OUT' ? 409 :
        err.code === 'SEAT_LOCKED' ? 409 :
        err.code === 'SEAT_UNAVAILABLE' ? 409 : 500;
      res.status(status).json({ error: err.code || 'RESERVE_FAILED', message: err.message });
    }
  },

  async release(req: AuthRequest, res: Response) {
    try {
      const { seatId } = req.params;
      const { eventId, token } = req.body;
      const userId = req.user!.id;
      await CheckoutService.releaseSeat(eventId as string, seatId as string, userId, token as string);
      res.json({ success: true, message: 'Seat released' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },
};

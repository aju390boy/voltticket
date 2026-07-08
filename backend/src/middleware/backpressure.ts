import { Request, Response, NextFunction } from 'express';
import { checkoutQueue } from '../config/bullmq';

const MAX_QUEUE_DEPTH = 50_000;

export async function backpressureGuard(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const waiting = await checkoutQueue.getWaitingCount();
    if (waiting > MAX_QUEUE_DEPTH) {
      res.setHeader('Retry-After', '30');
      res.status(503).json({
        error: 'SERVICE_OVERLOADED',
        message: 'System is under heavy load. Please try again in 30 seconds.',
        queueDepth: waiting,
        retryAfter: 30,
      });
      return;
    }
    next();
  } catch {
    next(); // Fail open
  }
}

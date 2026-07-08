import { Router, Request, Response } from 'express';
import { stripe } from '../config/stripe';
import { redis } from '../config/redis';
import { Order } from '../models/Order';
import { logger } from '../utils/logger';

const router = Router();

router.post('/stripe', async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'] as string;

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    logger.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Idempotency — prevent double-processing if Stripe retries
  const processed = await (redis as any).set(`webhook:${event.id}`, '1', 'NX', 'EX', 86400);
  if (!processed) {
    logger.debug(`Webhook ${event.id} already processed`);
    return res.json({ received: true });
  }

  try {
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const pi = event.data.object as any;
        const orderId = pi.metadata?.orderId;
        if (orderId) {
          await Order.findByIdAndUpdate(orderId, {
            $set: { status: 'confirmed', stripePaymentIntentId: pi.id },
          });
          logger.info(`Payment confirmed for order ${orderId}`);
        }
        break;
      }
      case 'payment_intent.payment_failed': {
        const pi = event.data.object as any;
        const orderId = pi.metadata?.orderId;
        if (orderId) {
          await Order.findByIdAndUpdate(orderId, { $set: { status: 'failed' } });
          logger.warn(`Payment failed for order ${orderId}`);
        }
        break;
      }
      default:
        logger.debug(`Unhandled webhook event: ${event.type}`);
    }
  } catch (err) {
    logger.error('Webhook handler error:', err);
    return res.status(500).json({ error: 'Webhook processing failed' });
  }

  res.json({ received: true });
});

export default router;

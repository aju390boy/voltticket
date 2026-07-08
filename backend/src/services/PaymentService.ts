// eslint-disable-next-line @typescript-eslint/no-var-requires
const CircuitBreaker = require('opossum');
import { stripe } from '../config/stripe';
import Stripe from 'stripe';
import { logger } from '../utils/logger';

// ─────────────────────────────────────────────────────────────────────────────
// DEV MODE: Return a mock PaymentIntent so checkout works without real Stripe
// ─────────────────────────────────────────────────────────────────────────────
function createMockPaymentIntent(orderId: string, amount: number, currency: string): Stripe.PaymentIntent {
  return {
    id: `pi_mock_${orderId}`,
    object: 'payment_intent',
    amount: Math.round(amount * 100),
    currency,
    status: 'succeeded',
    client_secret: `pi_mock_${orderId}_secret_dev`,
    metadata: { orderId },
    created: Math.floor(Date.now() / 1000),
    livemode: false,
    // Minimal required fields — cast to satisfy TypeScript
  } as unknown as Stripe.PaymentIntent;
}

async function createStripePaymentIntent(
  orderId: string,
  amount: number,
  currency: string
): Promise<Stripe.PaymentIntent> {
  // In development, skip real Stripe to avoid invalid key errors
  if (process.env.NODE_ENV !== 'production') {
    logger.debug(`[DEV] Mock payment for order ${orderId} — $${amount}`);
    return createMockPaymentIntent(orderId, amount, currency);
  }

  const idempotencyKey = `pi_${orderId}`;
  return stripe.paymentIntents.create(
    {
      amount: Math.round(amount * 100),
      currency,
      metadata: { orderId },
      automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
    },
    { idempotencyKey }
  );
}

const circuitBreakerOptions = {
  timeout: 8000,
  errorThresholdPercentage: 50,
  resetTimeout: 30_000,
  volumeThreshold: 5,
  name: 'stripe-payment',
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const paymentBreaker: any = new CircuitBreaker(
  createStripePaymentIntent,
  circuitBreakerOptions
);

paymentBreaker.fallback(async (_orderId: string, _amount: number) => {
  logger.error(`Circuit open — payment service unavailable`);
  throw new Error('PAYMENT_SERVICE_UNAVAILABLE');
});

paymentBreaker.on('open', () => logger.error('🔴 Stripe circuit breaker OPENED'));
paymentBreaker.on('halfOpen', () => logger.warn('🟡 Stripe circuit breaker HALF-OPEN'));
paymentBreaker.on('close', () => logger.info('🟢 Stripe circuit breaker CLOSED'));
paymentBreaker.on('fallback', () =>
  logger.error('⚡ Stripe circuit breaker FALLBACK triggered')
);

export const PaymentService = {
  async createPaymentIntent(orderId: string, amount: number, currency = 'usd'): Promise<Stripe.PaymentIntent> {
    return paymentBreaker.fire(orderId, amount, currency);
  },

  async refundPayment(paymentIntentId: string, amount?: number): Promise<Stripe.Refund> {
    if (process.env.NODE_ENV !== 'production') {
      logger.debug(`[DEV] Mock refund for ${paymentIntentId}`);
      return { id: `re_mock_${Date.now()}`, object: 'refund', amount: amount || 0 } as unknown as Stripe.Refund;
    }
    return stripe.refunds.create({
      payment_intent: paymentIntentId,
      ...(amount ? { amount: Math.round(amount * 100) } : {}),
    });
  },

  getCircuitState(): 'open' | 'half_open' | 'closed' {
    if (paymentBreaker.opened) return 'open';
    if (paymentBreaker.halfOpen) return 'half_open';
    return 'closed';
  },
};

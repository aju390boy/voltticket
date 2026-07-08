import Stripe from 'stripe';

const isTestMode = process.env.NODE_ENV === 'development';

export const stripe: Stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-05-27.dahlia',
  ...(isTestMode && process.env.STRIPE_MOCK_HOST ? {
    host: process.env.STRIPE_MOCK_HOST.replace('http://', '').split(':')[0],
    port: parseInt(process.env.STRIPE_MOCK_HOST.split(':')[2] || '12111'),
    protocol: 'http' as 'http',
  } : {}),
});

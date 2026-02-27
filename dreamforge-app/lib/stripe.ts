import Stripe from 'stripe';

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error('STRIPE_SECRET_KEY is not configured');
    _stripe = new Stripe(key, {
      apiVersion: '2024-12-18.acacia' as Stripe.LatestApiVersion,
    });
  }
  return _stripe;
}

// Keep backward-compatible export that lazily initializes
export const stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    return (getStripe() as unknown as Record<string | symbol, unknown>)[prop];
  },
});

export const SUBSCRIPTION_PRICES: Record<string, string> = {
  lite: process.env.STRIPE_LITE_MONTHLY_PRICE_ID || '',
  premium: process.env.STRIPE_PREMIUM_MONTHLY_PRICE_ID || '',
  ultimate: process.env.STRIPE_ULTIMATE_MONTHLY_PRICE_ID || '',
};

export const TIER_FROM_PRICE: Record<string, string> = {};
// Populate reverse mapping
Object.entries(SUBSCRIPTION_PRICES).forEach(([tier, priceId]) => {
  if (priceId) TIER_FROM_PRICE[priceId] = tier;
});

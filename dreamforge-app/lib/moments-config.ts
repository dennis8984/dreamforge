export const MOMENTS_COSTS = {
  IMAGE_GENERATION: 50,
  VIDEO_GENERATION: 600,
  AUDIO_CALL_PER_MINUTE: 100,
  CHARACTER_CREATION: 500,
} as const;

export const SIGNUP_BONUS = 200;

export const SUBSCRIPTION_MONTHLY_MOMENTS: Record<string, number> = {
  free: 0,
  lite: 500,
  premium: 2000,
  ultimate: 5000,
};

export const MOMENTS_PACKAGES = [
  { name: 'Starter', amount: 500, priceCents: 499 },
  { name: 'Popular', amount: 1500, priceCents: 999, isPopular: true },
  { name: 'Pro', amount: 5000, priceCents: 2499 },
  { name: 'Mega', amount: 15000, priceCents: 4999 },
] as const;

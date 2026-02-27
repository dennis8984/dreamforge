-- Update subscription tiers to new 4-tier model

-- Update subscription_tier check constraint
DO $$ BEGIN
  ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_subscription_tier_check;
  ALTER TABLE profiles ADD CONSTRAINT profiles_subscription_tier_check
    CHECK (subscription_tier IN ('free', 'lite', 'premium', 'ultimate'));
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- Migrate old tier names
UPDATE profiles SET subscription_tier = 'lite' WHERE subscription_tier = 'basic';
UPDATE profiles SET subscription_tier = 'lite' WHERE subscription_tier = 'pro';

-- Subscription tier config table
CREATE TABLE IF NOT EXISTS subscription_tiers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  price_cents INTEGER NOT NULL DEFAULT 0,
  daily_messages INTEGER NOT NULL DEFAULT 20,
  monthly_moments INTEGER NOT NULL DEFAULT 0,
  features JSONB DEFAULT '[]',
  stripe_price_id TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true
);

INSERT INTO subscription_tiers (id, name, price_cents, daily_messages, monthly_moments, features) VALUES
  ('free', 'Free', 0, 20, 0, '["Basic chat", "Limited gallery"]'),
  ('lite', 'Lite', 599, 100, 500, '["More messages", "Basic media generation"]'),
  ('premium', 'Premium', 1499, -1, 2000, '["Unlimited messages", "All content modes", "All media types"]'),
  ('ultimate', 'Ultimate', 2999, -1, 5000, '["Everything in Premium", "Group chats", "Priority generation"]')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  price_cents = EXCLUDED.price_cents,
  daily_messages = EXCLUDED.daily_messages,
  monthly_moments = EXCLUDED.monthly_moments,
  features = EXCLUDED.features;

-- Moments (credits) system

-- Add moments columns to profiles
DO $$ BEGIN
  ALTER TABLE profiles ADD COLUMN moments_balance INTEGER NOT NULL DEFAULT 0;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE profiles ADD COLUMN total_moments_earned INTEGER NOT NULL DEFAULT 0;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE profiles ADD COLUMN total_moments_spent INTEGER NOT NULL DEFAULT 0;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE profiles ADD COLUMN characters_created_count INTEGER NOT NULL DEFAULT 0;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Moments ledger
CREATE TABLE IF NOT EXISTS moments_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  transaction_type TEXT NOT NULL,
  reference_id TEXT,
  description TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Moments packages
CREATE TABLE IF NOT EXISTS moments_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  moments_amount INTEGER NOT NULL,
  price_cents INTEGER NOT NULL,
  stripe_price_id TEXT,
  is_popular BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insert default packages
INSERT INTO moments_packages (name, moments_amount, price_cents, is_popular) VALUES
  ('Starter', 500, 499, false),
  ('Popular', 1500, 999, true),
  ('Pro', 5000, 2499, false),
  ('Mega', 15000, 4999, false)
ON CONFLICT DO NOTHING;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ledger_user ON moments_ledger(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ledger_type ON moments_ledger(transaction_type);

-- RLS
ALTER TABLE moments_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE moments_packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own ledger" ON moments_ledger FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System manages ledger" ON moments_ledger FOR INSERT WITH CHECK (true);
CREATE POLICY "Admin full access ledger" ON moments_ledger FOR ALL USING (public.is_admin());

CREATE POLICY "Anyone can view packages" ON moments_packages FOR SELECT USING (true);
CREATE POLICY "Admin manages packages" ON moments_packages FOR ALL USING (public.is_admin());

-- Atomic debit function (with row lock)
CREATE OR REPLACE FUNCTION debit_moments(p_user_id UUID, p_amount INTEGER, p_type TEXT, p_ref TEXT DEFAULT NULL, p_desc TEXT DEFAULT '')
RETURNS TABLE(success BOOLEAN, new_balance INTEGER) AS $$
DECLARE
  v_balance INTEGER;
  v_new_balance INTEGER;
BEGIN
  -- Lock the row
  SELECT moments_balance INTO v_balance
  FROM profiles WHERE id = p_user_id FOR UPDATE;

  IF v_balance IS NULL THEN
    RETURN QUERY SELECT false, 0;
    RETURN;
  END IF;

  IF v_balance < p_amount THEN
    RETURN QUERY SELECT false, v_balance;
    RETURN;
  END IF;

  v_new_balance := v_balance - p_amount;

  UPDATE profiles
  SET moments_balance = v_new_balance,
      total_moments_spent = total_moments_spent + p_amount
  WHERE id = p_user_id;

  INSERT INTO moments_ledger (user_id, amount, balance_after, transaction_type, reference_id, description)
  VALUES (p_user_id, -p_amount, v_new_balance, p_type, p_ref, p_desc);

  RETURN QUERY SELECT true, v_new_balance;
END;
$$ LANGUAGE plpgsql;

-- Atomic credit function
CREATE OR REPLACE FUNCTION credit_moments(p_user_id UUID, p_amount INTEGER, p_type TEXT, p_ref TEXT DEFAULT NULL, p_desc TEXT DEFAULT '')
RETURNS TABLE(new_balance INTEGER) AS $$
DECLARE
  v_new_balance INTEGER;
BEGIN
  UPDATE profiles
  SET moments_balance = moments_balance + p_amount,
      total_moments_earned = total_moments_earned + p_amount
  WHERE id = p_user_id
  RETURNING moments_balance INTO v_new_balance;

  INSERT INTO moments_ledger (user_id, amount, balance_after, transaction_type, reference_id, description)
  VALUES (p_user_id, p_amount, v_new_balance, p_type, p_ref, p_desc);

  RETURN QUERY SELECT v_new_balance;
END;
$$ LANGUAGE plpgsql;

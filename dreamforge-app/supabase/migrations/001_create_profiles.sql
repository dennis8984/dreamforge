-- ============================================================
-- 0. Create profiles table (prerequisite - not in any migration)
-- ============================================================

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  subscription_tier TEXT NOT NULL DEFAULT 'free',
  subscription_active BOOLEAN NOT NULL DEFAULT false,
  subscription_start_date TIMESTAMPTZ,
  subscription_end_date TIMESTAMPTZ,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  total_credits INTEGER DEFAULT 0,
  role TEXT NOT NULL DEFAULT 'user',
  moments_balance INTEGER NOT NULL DEFAULT 0,
  total_moments_earned INTEGER NOT NULL DEFAULT 0,
  total_moments_spent INTEGER NOT NULL DEFAULT 0,
  characters_created_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
CREATE POLICY "Users can read own profile" ON profiles FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Service role bypass for admin operations
DROP POLICY IF EXISTS "Service role full access" ON profiles;
CREATE POLICY "Service role full access" ON profiles FOR ALL USING (true);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Insert profiles for any existing users who don't have one
INSERT INTO profiles (id, email)
SELECT id, email FROM auth.users
WHERE id NOT IN (SELECT id FROM profiles)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 006: Fix security - admin role, is_admin function
-- ============================================================

DO $$ BEGIN
  ALTER TABLE profiles ADD CONSTRAINT valid_role CHECK (role IN ('user', 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Fix ai_models RLS if table exists
DO $$ BEGIN
  DROP POLICY IF EXISTS "Admin insert models" ON ai_models;
  CREATE POLICY "Admin insert models" ON ai_models FOR INSERT WITH CHECK (public.is_admin());
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Admin update models" ON ai_models;
  CREATE POLICY "Admin update models" ON ai_models FOR UPDATE USING (public.is_admin());
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Admin delete models" ON ai_models;
  CREATE POLICY "Admin delete models" ON ai_models FOR DELETE USING (public.is_admin());
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- ============================================================
-- 007: Chat system
-- ============================================================

CREATE TABLE IF NOT EXISTS character_personas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  system_prompt TEXT NOT NULL DEFAULT '',
  personality_description TEXT NOT NULL DEFAULT '',
  speaking_style TEXT NOT NULL DEFAULT '',
  emotional_range TEXT[] DEFAULT '{}',
  content_mode_prompts JSONB DEFAULT '{}',
  example_messages JSONB DEFAULT '[]',
  greeting_message TEXT NOT NULL DEFAULT 'Hello! How are you today?',
  topics_of_interest TEXT[] DEFAULT '{}',
  forbidden_topics TEXT[] DEFAULT '{}',
  voice_description TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(character_id)
);

CREATE TABLE IF NOT EXISTS chat_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'New Conversation',
  content_mode TEXT NOT NULL DEFAULT 'S1E',
  is_group BOOLEAN NOT NULL DEFAULT false,
  branched_from_message_id UUID,
  branched_from_conversation_id UUID,
  status TEXT NOT NULL DEFAULT 'active',
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  message_count INTEGER NOT NULL DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'user',
  character_id UUID REFERENCES characters(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  content_mode TEXT NOT NULL DEFAULT 'S1E',
  parent_message_id UUID REFERENCES chat_messages(id) ON DELETE SET NULL,
  sequence_number INTEGER NOT NULL DEFAULT 0,
  token_count INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  is_hidden BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chat_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  join_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(conversation_id, character_id)
);

CREATE TABLE IF NOT EXISTS user_memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  category TEXT NOT NULL DEFAULT 'fact',
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  confidence FLOAT NOT NULL DEFAULT 0.8,
  source_message_id UUID REFERENCES chat_messages(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chat_rate_limits (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period_date DATE NOT NULL DEFAULT CURRENT_DATE,
  message_count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, period_date)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_conversations_user ON chat_conversations(user_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_character ON chat_conversations(character_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON chat_messages(conversation_id, sequence_number);
CREATE INDEX IF NOT EXISTS idx_messages_parent ON chat_messages(parent_message_id);
CREATE INDEX IF NOT EXISTS idx_memories_user_character ON user_memories(user_id, character_id);
CREATE INDEX IF NOT EXISTS idx_participants_conversation ON chat_participants(conversation_id);

-- RLS
ALTER TABLE chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE character_personas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own conversations" ON chat_conversations;
CREATE POLICY "Users view own conversations" ON chat_conversations FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users create own conversations" ON chat_conversations;
CREATE POLICY "Users create own conversations" ON chat_conversations FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users update own conversations" ON chat_conversations;
CREATE POLICY "Users update own conversations" ON chat_conversations FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users delete own conversations" ON chat_conversations;
CREATE POLICY "Users delete own conversations" ON chat_conversations FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users view own messages" ON chat_messages;
CREATE POLICY "Users view own messages" ON chat_messages FOR SELECT
  USING (EXISTS (SELECT 1 FROM chat_conversations WHERE id = conversation_id AND user_id = auth.uid()));
DROP POLICY IF EXISTS "Users create messages in own conversations" ON chat_messages;
CREATE POLICY "Users create messages in own conversations" ON chat_messages FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM chat_conversations WHERE id = conversation_id AND user_id = auth.uid()));

DROP POLICY IF EXISTS "Users view participants" ON chat_participants;
CREATE POLICY "Users view participants" ON chat_participants FOR SELECT
  USING (EXISTS (SELECT 1 FROM chat_conversations WHERE id = conversation_id AND user_id = auth.uid()));
DROP POLICY IF EXISTS "Users manage participants" ON chat_participants;
CREATE POLICY "Users manage participants" ON chat_participants FOR ALL
  USING (EXISTS (SELECT 1 FROM chat_conversations WHERE id = conversation_id AND user_id = auth.uid()));

DROP POLICY IF EXISTS "Users view own memories" ON user_memories;
CREATE POLICY "Users view own memories" ON user_memories FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users manage own memories" ON user_memories;
CREATE POLICY "Users manage own memories" ON user_memories FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users view own rate limits" ON chat_rate_limits;
CREATE POLICY "Users view own rate limits" ON chat_rate_limits FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "System manages rate limits" ON chat_rate_limits;
CREATE POLICY "System manages rate limits" ON chat_rate_limits FOR ALL USING (true);

DROP POLICY IF EXISTS "Anyone can read personas" ON character_personas;
CREATE POLICY "Anyone can read personas" ON character_personas FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admin manages personas" ON character_personas;
CREATE POLICY "Admin manages personas" ON character_personas FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Admin full access conversations" ON chat_conversations;
CREATE POLICY "Admin full access conversations" ON chat_conversations FOR ALL USING (public.is_admin());
DROP POLICY IF EXISTS "Admin full access messages" ON chat_messages;
CREATE POLICY "Admin full access messages" ON chat_messages FOR ALL USING (public.is_admin());
DROP POLICY IF EXISTS "Admin full access memories" ON user_memories;
CREATE POLICY "Admin full access memories" ON user_memories FOR ALL USING (public.is_admin());

-- Trigger: auto-update conversation on new message
CREATE OR REPLACE FUNCTION update_conversation_on_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE chat_conversations
  SET message_count = message_count + 1,
      last_message_at = NEW.created_at,
      updated_at = now()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_conversation_on_message ON chat_messages;
CREATE TRIGGER trigger_update_conversation_on_message
  AFTER INSERT ON chat_messages
  FOR EACH ROW EXECUTE FUNCTION update_conversation_on_message();

-- Atomic rate limit increment
CREATE OR REPLACE FUNCTION increment_chat_rate_limit(p_user_id UUID)
RETURNS TABLE(current_count INTEGER) AS $$
BEGIN
  INSERT INTO chat_rate_limits (user_id, period_date, message_count)
  VALUES (p_user_id, CURRENT_DATE, 1)
  ON CONFLICT (user_id, period_date)
  DO UPDATE SET message_count = chat_rate_limits.message_count + 1;

  RETURN QUERY
  SELECT chat_rate_limits.message_count
  FROM chat_rate_limits
  WHERE chat_rate_limits.user_id = p_user_id AND chat_rate_limits.period_date = CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 008: Moments system
-- ============================================================

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

INSERT INTO moments_packages (name, moments_amount, price_cents, is_popular) VALUES
  ('Starter', 500, 499, false),
  ('Popular', 1500, 999, true),
  ('Pro', 5000, 2499, false),
  ('Mega', 15000, 4999, false)
ON CONFLICT DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_ledger_user ON moments_ledger(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ledger_type ON moments_ledger(transaction_type);

ALTER TABLE moments_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE moments_packages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own ledger" ON moments_ledger;
CREATE POLICY "Users view own ledger" ON moments_ledger FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "System manages ledger" ON moments_ledger;
CREATE POLICY "System manages ledger" ON moments_ledger FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Admin full access ledger" ON moments_ledger;
CREATE POLICY "Admin full access ledger" ON moments_ledger FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Anyone can view packages" ON moments_packages;
CREATE POLICY "Anyone can view packages" ON moments_packages FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admin manages packages" ON moments_packages;
CREATE POLICY "Admin manages packages" ON moments_packages FOR ALL USING (public.is_admin());

-- Atomic debit function
CREATE OR REPLACE FUNCTION debit_moments(p_user_id UUID, p_amount INTEGER, p_type TEXT, p_ref TEXT DEFAULT NULL, p_desc TEXT DEFAULT '')
RETURNS TABLE(success BOOLEAN, new_balance INTEGER) AS $$
DECLARE
  v_balance INTEGER;
  v_new_balance INTEGER;
BEGIN
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

-- ============================================================
-- 009: Subscription tiers
-- ============================================================

DO $$ BEGIN
  ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_subscription_tier_check;
  ALTER TABLE profiles ADD CONSTRAINT profiles_subscription_tier_check
    CHECK (subscription_tier IN ('free', 'lite', 'premium', 'ultimate'));
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

UPDATE profiles SET subscription_tier = 'lite' WHERE subscription_tier = 'basic';
UPDATE profiles SET subscription_tier = 'lite' WHERE subscription_tier = 'pro';

DROP TABLE IF EXISTS subscription_tiers;
CREATE TABLE subscription_tiers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  price_cents INTEGER NOT NULL DEFAULT 0,
  daily_messages INTEGER NOT NULL DEFAULT 20,
  monthly_moments INTEGER NOT NULL DEFAULT 0,
  features JSONB DEFAULT '[]',
  stripe_price_id TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Add columns that may be missing from an older version of the table
DO $$ BEGIN ALTER TABLE subscription_tiers ADD COLUMN daily_messages INTEGER NOT NULL DEFAULT 20; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE subscription_tiers ADD COLUMN monthly_moments INTEGER NOT NULL DEFAULT 0; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE subscription_tiers ADD COLUMN features JSONB DEFAULT '[]'; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE subscription_tiers ADD COLUMN stripe_price_id TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE subscription_tiers ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true; EXCEPTION WHEN duplicate_column THEN NULL; END $$;

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

-- ============================================================
-- 010: Social feed
-- ============================================================

CREATE TABLE IF NOT EXISTS feed_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  post_type TEXT NOT NULL DEFAULT 'status',
  content TEXT NOT NULL DEFAULT '',
  media_urls TEXT[] DEFAULT '{}',
  visibility TEXT NOT NULL DEFAULT 'public',
  like_count INTEGER NOT NULL DEFAULT 0,
  comment_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS feed_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES feed_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reaction_type TEXT NOT NULL DEFAULT 'like',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id)
);

CREATE TABLE IF NOT EXISTS feed_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES feed_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  followed_character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(follower_user_id, followed_character_id)
);

CREATE INDEX IF NOT EXISTS idx_posts_character ON feed_posts(character_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_type ON feed_posts(post_type);
CREATE INDEX IF NOT EXISTS idx_reactions_post ON feed_reactions(post_id);
CREATE INDEX IF NOT EXISTS idx_reactions_user ON feed_reactions(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_post ON feed_comments(post_id, created_at);
CREATE INDEX IF NOT EXISTS idx_follows_user ON user_follows(follower_user_id);
CREATE INDEX IF NOT EXISTS idx_follows_character ON user_follows(followed_character_id);

ALTER TABLE feed_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE feed_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE feed_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_follows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read posts" ON feed_posts;
CREATE POLICY "Anyone can read posts" ON feed_posts FOR SELECT USING (visibility = 'public');
DROP POLICY IF EXISTS "Admin manages posts" ON feed_posts;
CREATE POLICY "Admin manages posts" ON feed_posts FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Users view reactions" ON feed_reactions;
CREATE POLICY "Users view reactions" ON feed_reactions FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users create own reactions" ON feed_reactions;
CREATE POLICY "Users create own reactions" ON feed_reactions FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users delete own reactions" ON feed_reactions;
CREATE POLICY "Users delete own reactions" ON feed_reactions FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Anyone reads comments" ON feed_comments;
CREATE POLICY "Anyone reads comments" ON feed_comments FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users create own comments" ON feed_comments;
CREATE POLICY "Users create own comments" ON feed_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users delete own comments" ON feed_comments;
CREATE POLICY "Users delete own comments" ON feed_comments FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users view own follows" ON user_follows;
CREATE POLICY "Users view own follows" ON user_follows FOR SELECT USING (auth.uid() = follower_user_id);
DROP POLICY IF EXISTS "Users manage follows" ON user_follows;
CREATE POLICY "Users manage follows" ON user_follows FOR ALL USING (auth.uid() = follower_user_id);

-- Trigger: auto-update like_count
CREATE OR REPLACE FUNCTION update_post_like_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE feed_posts SET like_count = like_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE feed_posts SET like_count = GREATEST(0, like_count - 1) WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_like_count ON feed_reactions;
CREATE TRIGGER trigger_update_like_count
  AFTER INSERT OR DELETE ON feed_reactions
  FOR EACH ROW EXECUTE FUNCTION update_post_like_count();

-- Trigger: auto-update comment_count
CREATE OR REPLACE FUNCTION update_post_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE feed_posts SET comment_count = comment_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE feed_posts SET comment_count = GREATEST(0, comment_count - 1) WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_comment_count ON feed_comments;
CREATE TRIGGER trigger_update_comment_count
  AFTER INSERT OR DELETE ON feed_comments
  FOR EACH ROW EXECUTE FUNCTION update_post_comment_count();

-- ============================================================
-- 011: Character enhancements
-- ============================================================

DO $$ BEGIN ALTER TABLE characters ADD COLUMN gender TEXT DEFAULT 'female'; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE characters ADD COLUMN style TEXT DEFAULT 'realistic'; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE characters ADD COLUMN appearance JSONB DEFAULT '{}'; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE characters ADD COLUMN voice_id TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE characters ADD COLUMN voice_name TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE characters ADD COLUMN is_custom BOOLEAN DEFAULT false; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE characters ADD COLUMN creator_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE characters ADD COLUMN category TEXT DEFAULT 'friend'; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE characters ADD COLUMN is_featured BOOLEAN DEFAULT false; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE characters ADD COLUMN is_trending BOOLEAN DEFAULT false; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE characters ADD COLUMN fan_count INTEGER DEFAULT 0; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE characters ADD COLUMN interaction_count INTEGER DEFAULT 0; EXCEPTION WHEN duplicate_column THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_characters_category ON characters(category);
CREATE INDEX IF NOT EXISTS idx_characters_featured ON characters(is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_characters_trending ON characters(is_trending) WHERE is_trending = true;
CREATE INDEX IF NOT EXISTS idx_characters_creator ON characters(creator_user_id);

-- ============================================================
-- 012: Voice calls
-- ============================================================

CREATE TABLE IF NOT EXISTS voice_call_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active',
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  moments_charged INTEGER NOT NULL DEFAULT 0,
  transcript JSONB DEFAULT '[]',
  voice_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_voice_sessions_user ON voice_call_sessions(user_id, created_at DESC);

ALTER TABLE voice_call_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users view own voice sessions" ON voice_call_sessions;
CREATE POLICY "Users view own voice sessions" ON voice_call_sessions FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users create own voice sessions" ON voice_call_sessions;
CREATE POLICY "Users create own voice sessions" ON voice_call_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users update own voice sessions" ON voice_call_sessions;
CREATE POLICY "Users update own voice sessions" ON voice_call_sessions FOR UPDATE USING (auth.uid() = user_id);

-- ============================================================
-- 013: Moderation
-- ============================================================

CREATE TABLE IF NOT EXISTS content_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL,
  content_id UUID NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS moderation_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type TEXT NOT NULL,
  content_id UUID NOT NULL,
  automated_result JSONB,
  human_decision TEXT,
  moderator_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE content_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE moderation_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users create own reports" ON content_reports;
CREATE POLICY "Users create own reports" ON content_reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);
DROP POLICY IF EXISTS "Admin manages reports" ON content_reports;
CREATE POLICY "Admin manages reports" ON content_reports FOR ALL USING (public.is_admin());
DROP POLICY IF EXISTS "Admin manages moderation log" ON moderation_log;
CREATE POLICY "Admin manages moderation log" ON moderation_log FOR ALL USING (public.is_admin());

-- ============================================================
-- Grant admin to your account
-- ============================================================

UPDATE profiles SET role = 'admin' WHERE email = 'mnights@tutanota.com';

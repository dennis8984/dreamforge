-- Add NSFW and membership fields to existing tables

-- Add subscription tier and membership status to profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro', 'premium')),
ADD COLUMN IF NOT EXISTS subscription_start_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS subscription_end_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
ADD COLUMN IF NOT EXISTS total_credits INTEGER DEFAULT 0;

-- Add NSFW flag to generated_images
ALTER TABLE generated_images
ADD COLUMN IF NOT EXISTS is_nsfw BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'public' CHECK (visibility IN ('public', 'private', 'members_only')),
ADD COLUMN IF NOT EXISTS views INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS likes INTEGER DEFAULT 0;

-- Add NSFW and profile fields to characters
ALTER TABLE characters
ADD COLUMN IF NOT EXISTS is_nsfw BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS profile_description TEXT,
ADD COLUMN IF NOT EXISTS personality_traits TEXT[],
ADD COLUMN IF NOT EXISTS subscription_tier_required TEXT DEFAULT 'free' CHECK (subscription_tier_required IN ('free', 'pro', 'premium')),
ADD COLUMN IF NOT EXISTS total_generations INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT true;

-- Create table for character gallery (full NSFW content)
CREATE TABLE IF NOT EXISTS character_gallery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID REFERENCES characters(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  thumbnail_url TEXT,
  caption TEXT,
  tags TEXT[],
  is_nsfw BOOLEAN DEFAULT true,
  visibility TEXT DEFAULT 'members_only' CHECK (visibility IN ('public', 'private', 'members_only')),
  view_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create table for user subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_subscription_id TEXT UNIQUE,
  stripe_price_id TEXT,
  status TEXT CHECK (status IN ('active', 'canceled', 'past_due', 'trialing', 'incomplete')),
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  cancel_at_period_end BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create table for user likes
CREATE TABLE IF NOT EXISTS user_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  image_id UUID REFERENCES generated_images(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, image_id)
);

-- Create table for user views
CREATE TABLE IF NOT EXISTS user_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  image_id UUID REFERENCES generated_images(id) ON DELETE CASCADE,
  character_id UUID REFERENCES characters(id) ON DELETE CASCADE,
  viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_generated_images_nsfw ON generated_images(is_nsfw);
CREATE INDEX IF NOT EXISTS idx_generated_images_visibility ON generated_images(visibility);
CREATE INDEX IF NOT EXISTS idx_generated_images_views ON generated_images(views DESC);
CREATE INDEX IF NOT EXISTS idx_generated_images_likes ON generated_images(likes DESC);
CREATE INDEX IF NOT EXISTS idx_character_gallery_character ON character_gallery(character_id);
CREATE INDEX IF NOT EXISTS idx_character_gallery_visibility ON character_gallery(visibility);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_user_likes_user ON user_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_user_likes_image ON user_likes(image_id);
CREATE INDEX IF NOT EXISTS idx_user_views_user ON user_views(user_id);

-- Update RLS policies for new tables

-- Character gallery policies
ALTER TABLE character_gallery ENABLE ROW LEVEL SECURITY;

-- Public can view public gallery items
CREATE POLICY "Public can view public gallery items" ON character_gallery
FOR SELECT
TO PUBLIC
USING (visibility = 'public');

-- Members can view members_only content
CREATE POLICY "Members can view members_only gallery items" ON character_gallery
FOR SELECT
TO authenticated
USING (
  visibility IN ('public', 'members_only')
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.subscription_tier != 'free'
  )
);

-- Character owners can manage their gallery
CREATE POLICY "Character owners can manage gallery" ON character_gallery
FOR ALL
TO authenticated
USING (
  character_id IN (
    SELECT id FROM characters
    WHERE user_id = auth.uid()
  )
);

-- Subscription policies
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can view their own subscriptions
CREATE POLICY "Users can view own subscriptions" ON subscriptions
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- User likes policies
ALTER TABLE user_likes ENABLE ROW LEVEL SECURITY;

-- Users can manage their own likes
CREATE POLICY "Users can manage own likes" ON user_likes
FOR ALL
TO authenticated
USING (user_id = auth.uid());

-- User views policies
ALTER TABLE user_views ENABLE ROW LEVEL SECURITY;

-- System can insert views for authenticated users
CREATE POLICY "System can track views" ON user_views
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Update existing generated_images policies for NSFW content
DROP POLICY IF EXISTS "Public read access to generated_images" ON generated_images;

-- Non-members see only non-NSFW public content
CREATE POLICY "Public can view non-NSFW public images" ON generated_images
FOR SELECT
TO PUBLIC
USING (is_nsfw = false AND visibility = 'public');

-- Members can see all public and members_only content
CREATE POLICY "Members can view all available images" ON generated_images
FOR SELECT
TO authenticated
USING (
  visibility != 'private'
  OR user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.subscription_tier != 'free'
  )
);

-- Function to check membership status
CREATE OR REPLACE FUNCTION is_member(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = user_id
    AND profiles.subscription_tier != 'free'
    AND (
      profiles.subscription_end_date IS NULL
      OR profiles.subscription_end_date > NOW()
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment view count
CREATE OR REPLACE FUNCTION increment_view_count()
RETURNS TRIGGER AS $$
BEGIN
  -- Increment view count for images
  IF NEW.image_id IS NOT NULL THEN
    UPDATE generated_images
    SET views = views + 1
    WHERE id = NEW.image_id;
  END IF;

  -- Increment view count for characters
  IF NEW.character_id IS NOT NULL THEN
    UPDATE characters
    SET total_generations = total_generations + 1
    WHERE id = NEW.character_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update view counts
CREATE TRIGGER update_view_counts
AFTER INSERT ON user_views
FOR EACH ROW
EXECUTE FUNCTION increment_view_count();

-- Function to update like count
CREATE OR REPLACE FUNCTION update_like_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE generated_images
    SET likes = likes + 1
    WHERE id = NEW.image_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE generated_images
    SET likes = likes - 1
    WHERE id = OLD.image_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update like counts
CREATE TRIGGER manage_like_counts
AFTER INSERT OR DELETE ON user_likes
FOR EACH ROW
EXECUTE FUNCTION update_like_count();
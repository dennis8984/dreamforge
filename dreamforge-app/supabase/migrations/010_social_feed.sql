-- Social feed tables

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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_posts_character ON feed_posts(character_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_type ON feed_posts(post_type);
CREATE INDEX IF NOT EXISTS idx_reactions_post ON feed_reactions(post_id);
CREATE INDEX IF NOT EXISTS idx_reactions_user ON feed_reactions(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_post ON feed_comments(post_id, created_at);
CREATE INDEX IF NOT EXISTS idx_follows_user ON user_follows(follower_user_id);
CREATE INDEX IF NOT EXISTS idx_follows_character ON user_follows(followed_character_id);

-- RLS
ALTER TABLE feed_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE feed_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE feed_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_follows ENABLE ROW LEVEL SECURITY;

-- Posts: public read, admin write
DROP POLICY IF EXISTS "Anyone can read posts" ON feed_posts;
CREATE POLICY "Anyone can read posts" ON feed_posts FOR SELECT USING (visibility = 'public');
DROP POLICY IF EXISTS "Admin manages posts" ON feed_posts;
CREATE POLICY "Admin manages posts" ON feed_posts FOR ALL USING (public.is_admin());

-- Reactions: users manage own
DROP POLICY IF EXISTS "Users view reactions" ON feed_reactions;
CREATE POLICY "Users view reactions" ON feed_reactions FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users create own reactions" ON feed_reactions;
CREATE POLICY "Users create own reactions" ON feed_reactions FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users delete own reactions" ON feed_reactions;
CREATE POLICY "Users delete own reactions" ON feed_reactions FOR DELETE USING (auth.uid() = user_id);

-- Comments: public read, users manage own
DROP POLICY IF EXISTS "Anyone reads comments" ON feed_comments;
CREATE POLICY "Anyone reads comments" ON feed_comments FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users create own comments" ON feed_comments;
CREATE POLICY "Users create own comments" ON feed_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users delete own comments" ON feed_comments;
CREATE POLICY "Users delete own comments" ON feed_comments FOR DELETE USING (auth.uid() = user_id);

-- Follows: users manage own
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

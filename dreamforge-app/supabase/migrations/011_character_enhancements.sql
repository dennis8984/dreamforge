-- Character enhancements

DO $$ BEGIN ALTER TABLE characters ADD COLUMN gender TEXT DEFAULT 'female'; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE characters ADD COLUMN style TEXT DEFAULT 'realistic'; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE characters ADD COLUMN appearance JSONB DEFAULT '{}'; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE characters ADD COLUMN personality_traits TEXT[] DEFAULT '{}'; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
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

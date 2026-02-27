-- Secrets.ai-style character enhancements: location, age, animated avatar
DO $$ BEGIN ALTER TABLE characters ADD COLUMN location TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE characters ADD COLUMN age TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE characters ADD COLUMN avatar_gif_url TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE characters ADD COLUMN message_count INTEGER DEFAULT 0; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE characters ADD COLUMN like_count INTEGER DEFAULT 0; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE characters ADD COLUMN is_new BOOLEAN DEFAULT false; EXCEPTION WHEN duplicate_column THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_characters_location ON characters(location) WHERE location IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_characters_is_new ON characters(is_new) WHERE is_new = true;

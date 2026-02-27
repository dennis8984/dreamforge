-- Fix file_path column issue in ai_models table
-- This migration makes file_path nullable or provides a default value

-- Make file_path nullable (wrapped for safety)
DO $$ BEGIN
  ALTER TABLE ai_models ALTER COLUMN file_path DROP NOT NULL;
EXCEPTION WHEN undefined_column THEN NULL;
          WHEN undefined_table THEN NULL;
END $$;

-- If file_path column doesn't exist, add it as nullable
DO $$ BEGIN
  ALTER TABLE ai_models ADD COLUMN IF NOT EXISTS file_path TEXT;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- Update existing rows that have NULL file_path
UPDATE ai_models
SET file_path = 'models/' || id || '.safetensors'
WHERE file_path IS NULL;

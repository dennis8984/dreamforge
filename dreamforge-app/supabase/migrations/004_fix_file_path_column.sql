-- Fix file_path column issue in ai_models table
-- This migration makes file_path nullable or provides a default value

-- Option 1: Make file_path nullable (recommended)
ALTER TABLE ai_models
ALTER COLUMN file_path DROP NOT NULL;

-- Option 2: Set a default value for file_path (alternative)
-- ALTER TABLE ai_models
-- ALTER COLUMN file_path SET DEFAULT 'default/model.safetensors';

-- If file_path column doesn't exist, add it as nullable
ALTER TABLE ai_models
ADD COLUMN IF NOT EXISTS file_path TEXT;

-- Update existing rows that have NULL file_path
UPDATE ai_models
SET file_path = 'models/' || id || '.safetensors'
WHERE file_path IS NULL;

-- Verify the column state
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'ai_models'
AND column_name = 'file_path';
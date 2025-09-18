-- Add capabilities column to ai_models table
ALTER TABLE ai_models
ADD COLUMN IF NOT EXISTS capabilities JSONB DEFAULT '{"max_resolution": "1024x1024", "styles": [], "speed": "fast"}'::jsonb;

-- Add nano_banana_model column if it doesn't exist
ALTER TABLE ai_models
ADD COLUMN IF NOT EXISTS nano_banana_model VARCHAR(255) DEFAULT 'gemini-2.5-flash-image-preview';

-- Update existing rows with default capabilities
UPDATE ai_models
SET capabilities = '{"max_resolution": "1024x1024", "styles": [], "speed": "fast"}'::jsonb
WHERE capabilities IS NULL;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_ai_models_category ON ai_models(category);
CREATE INDEX IF NOT EXISTS idx_ai_models_featured ON ai_models(is_featured);
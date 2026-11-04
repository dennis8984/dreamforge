-- LoRA training pipeline: model releases, training data, LoRA library, generation profiles.
--
-- Access: RLS is on with no policies, so only the service role can read or write these
-- tables. Admin routes use it after requireBetterAuthAdmin(). The is_admin() policies used
-- elsewhere rely on auth.uid(), which BetterAuth sessions don't set.
--
-- characters.training_status is deliberately left alone. The public select policy on
-- characters depends on it being 'ready', so changing it would hide live characters.
-- identity_status tracks the trained likeness instead, and defaults to 'none'.

-- Adult performers with a signed release. No raw ID documents or dates of birth are stored
-- here: the verification vendor holds them, and this keeps the result and a reference.
CREATE TABLE IF NOT EXISTS public.model_releases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legal_name TEXT NOT NULL,
  stage_name TEXT,
  age_verified_21_at TIMESTAMPTZ,
  verification_provider TEXT,
  verification_ref TEXT,
  release_document_path TEXT,
  signed_at TIMESTAMPTZ,
  scope_ai_training BOOLEAN NOT NULL DEFAULT FALSE,
  scope_adult_content BOOLEAN NOT NULL DEFAULT FALSE,
  scope_video BOOLEAN NOT NULL DEFAULT FALSE,
  revoked_at TIMESTAMPTZ,
  revoked_reason TEXT,
  notes TEXT,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Where each character's likeness comes from.
CREATE TABLE IF NOT EXISTS public.character_sources (
  character_id UUID PRIMARY KEY REFERENCES public.characters(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL CHECK (source_type IN ('ai_generated', 'licensed_model')),
  model_release_id UUID REFERENCES public.model_releases(id) ON DELETE RESTRICT,
  attested_by TEXT NOT NULL,
  attested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT,
  CONSTRAINT licensed_source_needs_release CHECK (
    source_type <> 'licensed_model' OR model_release_id IS NOT NULL
  )
);

-- Private training data. Kept apart from character_media, which is publicly readable.
CREATE TABLE IF NOT EXISTS public.training_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID NOT NULL REFERENCES public.characters(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  sha256 TEXT NOT NULL,
  width INTEGER,
  height INTEGER,
  caption TEXT,
  screening_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (screening_status IN ('pending', 'passed', 'flagged', 'rejected')),
  screening_result JSONB NOT NULL DEFAULT '{}',
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (character_id, sha256)
);

-- LoRA library: trained character LoRAs plus style and detail LoRAs set by admins.
CREATE TABLE IF NOT EXISTS public.lora_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('character', 'style', 'detail')),
  base_model TEXT NOT NULL,
  provider TEXT,
  weights_path TEXT,
  sha256 TEXT,
  trigger_word TEXT,
  default_strength NUMERIC(3,2) NOT NULL DEFAULT 1.00 CHECK (default_strength BETWEEN 0 AND 2),
  max_strength NUMERIC(3,2) NOT NULL DEFAULT 1.50 CHECK (max_strength BETWEEN 0 AND 2),
  licence TEXT,
  source_url TEXT,
  is_nsfw BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'training', 'ready', 'failed', 'disabled')),
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT default_within_max CHECK (default_strength <= max_strength)
);

-- Ordered per-character LoRA stack. Wan 2.2 can take separate high-noise and low-noise entries.
-- base_model on lora_models must match the keys in lib/ai-providers/spicyapi.ts, such as
-- 'minimax-h3-image', 'minimax-h3', 'qwen-image-2512', 'z-image-turbo' or 'wan-2.2'.
CREATE TABLE IF NOT EXISTS public.character_loras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID NOT NULL REFERENCES public.characters(id) ON DELETE CASCADE,
  lora_id UUID NOT NULL REFERENCES public.lora_models(id) ON DELETE CASCADE,
  target TEXT NOT NULL DEFAULT 'image' CHECK (target IN ('image', 'video', 'video_high_noise', 'video_low_noise')),
  strength NUMERIC(3,2) NOT NULL DEFAULT 1.00 CHECK (strength BETWEEN 0 AND 2),
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (character_id, lora_id, target)
);

-- Admin-set generation defaults.
CREATE TABLE IF NOT EXISTS public.generation_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  media_type TEXT NOT NULL DEFAULT 'image' CHECK (media_type IN ('image', 'video')),
  provider TEXT NOT NULL,
  base_model TEXT NOT NULL,
  sampler TEXT,
  steps INTEGER CHECK (steps IS NULL OR steps > 0),
  guidance NUMERIC(4,2),
  width INTEGER,
  height INTEGER,
  negative_prompt TEXT,
  nsfw_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- At most one active profile per media type.
CREATE UNIQUE INDEX IF NOT EXISTS generation_profiles_one_active
  ON public.generation_profiles (media_type) WHERE is_active;

CREATE TABLE IF NOT EXISTS public.training_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID NOT NULL REFERENCES public.characters(id) ON DELETE CASCADE,
  lora_id UUID REFERENCES public.lora_models(id) ON DELETE SET NULL,
  provider TEXT NOT NULL,
  external_job_id TEXT,
  status TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'running', 'succeeded', 'failed', 'cancelled')),
  params JSONB NOT NULL DEFAULT '{}',
  cost_usd NUMERIC(10,4),
  error TEXT,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  UNIQUE (provider, external_job_id)
);

-- Paid generations in flight and their results. Private: users read their own through
-- /api/generations/[taskId]. The claim and refund columns keep webhook retries and polling
-- from saving a result twice or refunding twice.
CREATE TABLE IF NOT EXISTS public.generation_tasks (
  task_id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('image', 'video')),
  character_id UUID REFERENCES public.characters(id) ON DELETE SET NULL,
  user_id UUID,
  charged_moments INTEGER NOT NULL DEFAULT 0,
  prompt TEXT,
  state TEXT NOT NULL DEFAULT 'pending' CHECK (state IN ('pending', 'claimed', 'succeeded', 'failed')),
  claimed_at TIMESTAMPTZ,
  media_url TEXT,
  error TEXT,
  refunded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS generation_tasks_user ON public.generation_tasks (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS training_images_character ON public.training_images (character_id);
CREATE INDEX IF NOT EXISTS character_loras_character ON public.character_loras (character_id, position);
CREATE INDEX IF NOT EXISTS training_jobs_active ON public.training_jobs (status) WHERE status IN ('queued', 'running');
CREATE INDEX IF NOT EXISTS character_sources_release ON public.character_sources (model_release_id);

DO $$ BEGIN
  ALTER TABLE public.characters ADD COLUMN identity_status TEXT NOT NULL DEFAULT 'none'
    CHECK (identity_status IN ('none', 'training', 'ready', 'failed', 'revoked'));
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- moderator_id references auth.users, but admins are BetterAuth users with text ids.
DO $$ BEGIN
  ALTER TABLE public.moderation_log ADD COLUMN actor_user_id TEXT;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

ALTER TABLE public.model_releases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.character_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lora_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.character_loras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generation_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generation_tasks ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS set_updated_at ON public.model_releases;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.model_releases
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
DROP TRIGGER IF EXISTS set_updated_at ON public.lora_models;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.lora_models
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
DROP TRIGGER IF EXISTS set_updated_at ON public.generation_profiles;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.generation_profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON public.generation_tasks;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.generation_tasks
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Private buckets. Files are only reachable through short-lived signed URLs.
-- generated-media is public-read so results can be shown directly, but paths are random
-- and there is no listing policy, so a file can only be opened with its exact URL.
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('character-datasets', 'character-datasets', FALSE),
  ('character-loras', 'character-loras', FALSE),
  ('model-release-documents', 'model-release-documents', FALSE),
  ('generated-media', 'generated-media', TRUE)
ON CONFLICT (id) DO NOTHING;

-- The settings /api/generate uses today, kept as the comparison baseline.
INSERT INTO public.generation_profiles (name, provider, base_model, sampler, steps, guidance, width, height, is_active)
VALUES ('Current SDXL baseline', 'runpod', 'sdxl', 'DPM++ 2M', 35, 4.5, 1024, 1024, TRUE)
ON CONFLICT (name) DO NOTHING;

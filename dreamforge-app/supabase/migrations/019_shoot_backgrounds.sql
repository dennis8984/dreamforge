-- The one or two locations a character is shot in. They stay in place until an admin changes
-- them. Only the server reads this table, so row level security is on with no policies.
-- Requires 018, which creates the character-datasets bucket these files are stored in.

CREATE TABLE IF NOT EXISTS public.shoot_backgrounds (
  character_id UUID NOT NULL REFERENCES public.characters(id) ON DELETE CASCADE,
  slot SMALLINT NOT NULL CHECK (slot IN (1, 2)),
  storage_path TEXT NOT NULL,
  in_use BOOLEAN NOT NULL DEFAULT TRUE,
  uploaded_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (character_id, slot)
);

ALTER TABLE public.shoot_backgrounds ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS set_updated_at ON public.shoot_backgrounds;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.shoot_backgrounds
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Bring the two under-21 seed characters in line with the 21+ policy.
-- Their avatars were generated from under-21 profiles, so they are cleared too.
-- Re-running the admin seed generates new avatars for them.
-- Safe to re-run: rows that already have the corrected age no longer match.

DO $$
BEGIN
  UPDATE characters SET age = '24', avatar_url = NULL, updated_at = NOW()
    WHERE slug = 'molly' AND age = '19';

  UPDATE characters SET age = '23', avatar_url = NULL, updated_at = NOW()
    WHERE slug = 'mia' AND age = '20';
EXCEPTION
  WHEN undefined_column THEN NULL;
  WHEN undefined_table THEN NULL;
END $$;

-- Fix security vulnerabilities: RLS policies, admin role, remove hardcoded keys

-- Add role column to profiles table (if not exists)
DO $$ BEGIN
  ALTER TABLE profiles ADD COLUMN role TEXT NOT NULL DEFAULT 'user';
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Add check constraint for valid roles
DO $$ BEGIN
  ALTER TABLE profiles ADD CONSTRAINT valid_role CHECK (role IN ('user', 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Create or replace is_admin function to check role from profiles
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Fix ai_models RLS: only admins can insert/update/delete
DO $$ BEGIN
  DROP POLICY IF EXISTS "Admin insert models" ON ai_models;
  CREATE POLICY "Admin insert models" ON ai_models FOR INSERT WITH CHECK (public.is_admin());
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Admin update models" ON ai_models;
  CREATE POLICY "Admin update models" ON ai_models FOR UPDATE USING (public.is_admin());
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Admin delete models" ON ai_models;
  CREATE POLICY "Admin delete models" ON ai_models FOR DELETE USING (public.is_admin());
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- Fix Row Level Security (RLS) policies for ai_models table
-- This allows the application to insert, update, and select models

-- First, ensure RLS is enabled on the table
ALTER TABLE ai_models ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Enable read access for all users" ON ai_models;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON ai_models;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON ai_models;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON ai_models;
DROP POLICY IF EXISTS "Enable all operations for service role" ON ai_models;
DROP POLICY IF EXISTS "Enable insert for anon users" ON ai_models;
DROP POLICY IF EXISTS "Enable update for anon users" ON ai_models;
DROP POLICY IF EXISTS "Enable delete for anon users" ON ai_models;

-- Create new policies

-- 1. Allow everyone to read models (public access)
CREATE POLICY "Enable read access for all users"
ON ai_models FOR SELECT
USING (true);

-- 2. For development/demo: Allow anon users to insert
-- In production, you should restrict this to authenticated admin users
CREATE POLICY "Enable insert for anon users"
ON ai_models FOR INSERT
WITH CHECK (true);

-- 3. For development/demo: Allow anon users to update
-- In production, you should restrict this to authenticated admin users
CREATE POLICY "Enable update for anon users"
ON ai_models FOR UPDATE
USING (true)
WITH CHECK (true);

-- 4. Optional: If you need delete functionality
CREATE POLICY "Enable delete for anon users"
ON ai_models FOR DELETE
USING (true);

-- Alternative for production (commented out):
-- These policies would require authentication and admin role

/*
-- Production policies (requires auth setup):

-- Allow authenticated users to read
CREATE POLICY "Enable read access for all users"
ON ai_models FOR SELECT
USING (true);

-- Only allow admins to insert
CREATE POLICY "Enable insert for admin users only"
ON ai_models FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);

-- Only allow admins to update
CREATE POLICY "Enable update for admin users only"
ON ai_models FOR UPDATE
USING (
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);

-- Only allow admins to delete
CREATE POLICY "Enable delete for admin users only"
ON ai_models FOR DELETE
USING (
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);
*/

-- Verify the policies are created
SELECT tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'ai_models';
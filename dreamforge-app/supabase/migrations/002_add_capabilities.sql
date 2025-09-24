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

-- Add indexes for performance
create index if not exists idx_ai_models_category on ai_models(category);
create index if not exists idx_ai_models_featured on ai_models(is_featured);

-- Create user role type if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE public.user_role AS ENUM ('admin', 'user');
    END IF;
END$$;

create table if not exists public.users (
    id uuid references auth.users not null primary key
);

-- Add role column to users table if it doesn't exist
alter table public.users
add column if not exists role public.user_role not null default 'user';


create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
    select coalesce(
        (select role from public.users where id = auth.uid()) = 'admin'::public.user_role,
        false
    )
$$;
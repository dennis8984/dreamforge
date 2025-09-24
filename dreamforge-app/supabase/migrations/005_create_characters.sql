-- Create characters table
create table if not exists public.characters (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  description text,
  avatar_url text,
  cover_url text,
  tags text[] default '{}',
  owner_id text,
  training_status text default 'draft' check (training_status in ('draft', 'queued', 'training', 'ready', 'failed')),
  training_job_id text,
  model_ref jsonb default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Create character_media table
create table if not exists public.character_media (
  id uuid primary key default gen_random_uuid(),
  character_id uuid references public.characters(id) on delete cascade,
  type text not null check (type in ('image', 'video')),
  url text not null,
  width int,
  height int,
  duration_ms int,
  is_hd boolean default true,
  visibility text default 'public' check (visibility in ('public', 'members')),
  prompt text,
  metadata jsonb default '{}',
  created_at timestamptz default now()
);

-- Create indexes for performance
create index if not exists idx_characters_slug on public.characters(slug);
create index if not exists idx_characters_owner on public.characters(owner_id);
create index if not exists idx_characters_status on public.characters(training_status);
create index if not exists idx_media_character on public.character_media(character_id);
create index if not exists idx_media_visibility on public.character_media(visibility);

-- Enable Row Level Security
alter table public.characters enable row level security;
alter table public.character_media enable row level security;

-- RLS Policies for characters (public read, admin write)
drop policy if exists "Characters are viewable by everyone" on public.characters;
create policy "Characters are viewable by everyone"
  on public.characters for select
  using (
    training_status = 'ready' or public.is_admin()
  );

drop policy if exists "Characters are insertable by admins" on public.characters;
create policy "Characters are insertable by admins"
  on public.characters for insert
  with check (public.is_admin());

drop policy if exists "Characters are updatable by admins" on public.characters;
create policy "Characters are updatable by admins"
  on public.characters for update
  using (public.is_admin());

drop policy if exists "Characters are deletable by admins" on public.characters;
create policy "Characters are deletable by admins"
  on public.characters for delete
  using (public.is_admin());

-- RLS Policies for character_media (public read, admin write)
drop policy if exists "Character media is viewable by everyone" on public.character_media;
create policy "Character media is viewable by everyone"
  on public.character_media for select
  using (true);

drop policy if exists "Character media is insertable by admins" on public.character_media;
create policy "Character media is insertable by admins"
  on public.character_media for insert
  with check (public.is_admin());

drop policy if exists "Character media is updatable by admins" on public.character_media;
create policy "Character media is updatable by admins"
  on public.character_media for update
  using (public.is_admin());

drop policy if exists "Character media is deletable by admins" on public.character_media;
create policy "Character media is deletable by admins"
  on public.character_media for delete
  using (public.is_admin());

-- Function to update updated_at timestamp
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Trigger for updated_at
drop trigger if exists handle_characters_updated_at on public.characters;
create trigger handle_characters_updated_at
  before update on public.characters
  for each row
  execute procedure public.handle_updated_at();
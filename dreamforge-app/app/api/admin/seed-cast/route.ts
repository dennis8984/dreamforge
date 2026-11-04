import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { requireBetterAuthAdmin, isAdminUser } from '@/lib/admin-auth-helpers';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { DATASET_BUCKET, screenReference } from '@/lib/character-references';
import { LAYOUT_CAST, type LayoutCharacter } from '@/lib/layout-cast';

export const maxDuration = 300;

const BATCH_SIZE = 4;

interface CastResult {
  slug: string;
  status: string;
}

async function addCharacter(cast: LayoutCharacter, origin: string, adminId: string, adminEmail: string): Promise<CastResult> {
  const supabase = getSupabaseAdmin();

  const { data: existing } = await supabase.from('characters').select('id').eq('slug', cast.slug).maybeSingle();
  if (existing) return { slug: cast.slug, status: 'skipped: already in the database' };

  const portrait = await fetch(new URL(cast.avatar_url, origin));
  if (!portrait.ok) return { slug: cast.slug, status: `failed: portrait returned HTTP ${portrait.status}` };

  const { data: character, error } = await supabase
    .from('characters')
    .insert({
      slug: cast.slug,
      name: cast.name,
      description: cast.description,
      avatar_url: cast.avatar_url,
      age: cast.age,
      tags: cast.tags,
      gender: cast.gender,
      style: cast.style,
      category: cast.category,
      personality_traits: cast.personality_traits,
      is_new: cast.is_new === true,
      is_public: true,
      training_status: 'draft',
    })
    .select('id')
    .single();
  if (error) return { slug: cast.slug, status: `failed: ${error.message}` };

  const path = `${character.id}/${randomUUID()}.jpg`;
  const { error: uploadError } = await supabase.storage
    .from(DATASET_BUCKET)
    .upload(path, await portrait.arrayBuffer(), { contentType: 'image/jpeg' });
  if (uploadError) return { slug: cast.slug, status: `failed: ${uploadError.message}` };

  await supabase.from('character_sources').upsert({
    character_id: character.id,
    source_type: 'ai_generated',
    attested_by: adminEmail,
  });

  const screened = await screenReference(character.id, path, adminId);
  if (screened.status !== 'passed') {
    return { slug: cast.slug, status: `not live: screening ${screened.status} ${screened.flags.join(', ')}`.trim() };
  }

  const { error: readyError } = await supabase
    .from('characters')
    .update({ training_status: 'ready', identity_status: 'ready' })
    .eq('id', character.id);
  if (readyError) return { slug: cast.slug, status: `failed: ${readyError.message}` };

  return { slug: cast.slug, status: 'added' };
}

// POST: adds the home page cast to the database, with each portrait as its reference
// image, so stills and clips can be made from them. Safe to run again: existing rows
// are never overwritten.
export async function POST(request: NextRequest) {
  const auth = await requireBetterAuthAdmin(request);
  if (!isAdminUser(auth)) return auth;

  const body = await request.json().catch(() => ({}));
  if (body?.attestAiGenerated !== true) {
    return NextResponse.json({ error: 'Confirm the cast portraits are AI-generated and show fictional adults.' }, { status: 400 });
  }

  const results: CastResult[] = [];
  for (let start = 0; start < LAYOUT_CAST.length; start += BATCH_SIZE) {
    const batch = LAYOUT_CAST.slice(start, start + BATCH_SIZE);
    results.push(
      ...(await Promise.all(
        batch.map((cast) =>
          addCharacter(cast, request.nextUrl.origin, auth.id, auth.email).catch((error) => ({
            slug: cast.slug,
            status: `failed: ${error instanceof Error ? error.message : 'unknown error'}`,
          }))
        )
      ))
    );
  }

  return NextResponse.json({ results });
}

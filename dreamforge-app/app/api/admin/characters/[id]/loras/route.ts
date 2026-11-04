import { NextRequest, NextResponse } from 'next/server';
import { requireBetterAuthAdmin, isAdminUser } from '@/lib/admin-auth-helpers';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { isAtLeast21 } from '@/lib/character-age';
import { MAX_LORA_STRENGTH, assignmentError, validStrength, type AssignableLora } from '@/lib/lora-library';

interface AssignmentItem {
  lora_id: unknown;
  target: unknown;
  strength: unknown;
}

const MAX_ITEMS = 2; // A high and low pair.

// GET: this character's LoRAs, in the order they're sent.
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireBetterAuthAdmin(request);
  if (!isAdminUser(auth)) return auth;

  const { id } = await params;
  const { data, error } = await getSupabaseAdmin()
    .from('character_loras')
    .select('id, target, strength, position, lora_models(id, name, base_model, status, trigger_word)')
    .eq('character_id', id)
    .order('position');
  if (error) return NextResponse.json({ error: 'Could not load this character\'s LoRAs.' }, { status: 500 });
  return NextResponse.json({ assignments: data || [] });
}

// POST: assigns one file, or both files of a pair, to a character.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireBetterAuthAdmin(request);
  if (!isAdminUser(auth)) return auth;

  const { id } = await params;
  const { items } = (await request.json()) as { items?: AssignmentItem[] };
  if (!Array.isArray(items) || items.length === 0 || items.length > MAX_ITEMS) {
    return NextResponse.json({ error: 'Choose a LoRA to assign.' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { data: character } = await supabase.from('characters').select('*').eq('id', id).maybeSingle();
  if (!character) return NextResponse.json({ error: 'Character not found.' }, { status: 404 });
  if (!isAtLeast21(character)) return NextResponse.json({ error: 'Characters must be 21 or older.' }, { status: 400 });
  if (character.identity_status === 'revoked') {
    return NextResponse.json({ error: 'This character is no longer available.' }, { status: 403 });
  }

  const { data: existing, error: existingError } = await supabase
    .from('character_loras')
    .select('lora_id, target, lora_models(base_model)')
    .eq('character_id', id);
  if (existingError) return NextResponse.json({ error: 'Could not read this character\'s LoRAs.' }, { status: 500 });
  const current = (existing || []) as unknown as { lora_id: string; target: string; lora_models: { base_model: string } | null }[];

  const { data: loraRows } = await supabase
    .from('lora_models')
    .select('id, name, base_model, status')
    .in('id', items.map((item) => String(item.lora_id)));
  const loras = new Map((loraRows || []).map((row) => [row.id as string, row as AssignableLora]));

  for (const item of items) {
    const lora = loras.get(String(item.lora_id));
    if (!lora) return NextResponse.json({ error: 'That LoRA could not be found.' }, { status: 404 });

    // Only one base runs per generation, so each base has its own three places in a slot.
    const used = current.filter(
      (row) => row.target === item.target && row.lora_models?.base_model === lora.base_model && row.lora_id !== item.lora_id
    ).length;
    const problem = assignmentError(lora, item.target, item.strength, used);
    if (problem) return NextResponse.json({ error: problem }, { status: 400 });
  }

  const { error } = await supabase.from('character_loras').upsert(
    items.map((item, index) => ({
      character_id: id,
      lora_id: item.lora_id,
      target: item.target,
      strength: item.strength,
      position: current.length + index,
    })),
    { onConflict: 'character_id,lora_id,target' }
  );
  if (error) {
    console.error('Could not assign LoRA:', error.message);
    return NextResponse.json({ error: 'Could not assign this LoRA.' }, { status: 500 });
  }
  return NextResponse.json({ ok: true }, { status: 201 });
}

// PATCH: changes one assignment's strength.
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireBetterAuthAdmin(request);
  if (!isAdminUser(auth)) return auth;

  const { id } = await params;
  const { assignmentId, strength } = await request.json();
  if (typeof assignmentId !== 'string') return NextResponse.json({ error: 'Choose a LoRA.' }, { status: 400 });
  if (!validStrength(strength)) {
    return NextResponse.json({ error: `Strength must be between 0 and ${MAX_LORA_STRENGTH}.` }, { status: 400 });
  }

  const { error } = await getSupabaseAdmin()
    .from('character_loras')
    .update({ strength })
    .eq('id', assignmentId)
    .eq('character_id', id);
  if (error) return NextResponse.json({ error: 'Could not change the strength.' }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// DELETE ?assignment=a,b: removes one file, or both files of a pair, from this character.
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireBetterAuthAdmin(request);
  if (!isAdminUser(auth)) return auth;

  const { id } = await params;
  const assignmentIds = (request.nextUrl.searchParams.get('assignment') || '').split(',').filter(Boolean).slice(0, MAX_ITEMS);
  if (assignmentIds.length === 0) return NextResponse.json({ error: 'Choose a LoRA.' }, { status: 400 });

  const { error } = await getSupabaseAdmin()
    .from('character_loras')
    .delete()
    .in('id', assignmentIds)
    .eq('character_id', id);
  if (error) return NextResponse.json({ error: 'Could not remove this LoRA.' }, { status: 500 });
  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from 'next/server';
import { requireBetterAuthAdmin, isAdminUser } from '@/lib/admin-auth-helpers';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { MAX_LORA_STRENGTH, validStrength } from '@/lib/lora-library';

// PATCH: enable or disable a LoRA, or change its default strength.
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireBetterAuthAdmin(request);
  if (!isAdminUser(auth)) return auth;

  const { id } = await params;
  const body = await request.json();
  const supabase = getSupabaseAdmin();

  const { data: lora } = await supabase.from('lora_models').select('kind, status').eq('id', id).maybeSingle();
  if (!lora) return NextResponse.json({ error: 'LoRA not found.' }, { status: 404 });

  const update: Record<string, unknown> = {};
  if (body.status !== undefined) {
    if (body.status !== 'ready' && body.status !== 'disabled') {
      return NextResponse.json({ error: 'Choose enable or disable.' }, { status: 400 });
    }
    // Revoking a model's release disables their character LoRAs, and that must stick.
    if (body.status === 'ready' && lora.status === 'disabled' && lora.kind === 'character') {
      return NextResponse.json(
        { error: 'A disabled character LoRA cannot be turned back on, in case its release was revoked. Add it again if the release is valid.' },
        { status: 400 }
      );
    }
    update.status = body.status;
  }
  if (body.default_strength !== undefined) {
    if (!validStrength(body.default_strength)) {
      return NextResponse.json({ error: `Strength must be between 0 and ${MAX_LORA_STRENGTH}.` }, { status: 400 });
    }
    update.default_strength = body.default_strength;
  }
  if (Object.keys(update).length === 0) return NextResponse.json({ error: 'Nothing to change.' }, { status: 400 });

  const { error } = await supabase.from('lora_models').update(update).eq('id', id);
  if (error) return NextResponse.json({ error: 'Could not update this LoRA.' }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// DELETE: removes a LoRA that no character is using.
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireBetterAuthAdmin(request);
  if (!isAdminUser(auth)) return auth;

  const { id } = await params;
  const supabase = getSupabaseAdmin();

  const { count, error: countError } = await supabase
    .from('character_loras')
    .select('id', { count: 'exact', head: true })
    .eq('lora_id', id);
  if (countError) return NextResponse.json({ error: 'Could not check where this LoRA is used.' }, { status: 500 });
  if (count) {
    return NextResponse.json({ error: `Remove this LoRA from ${count} character(s) first.` }, { status: 400 });
  }

  const { error } = await supabase.from('lora_models').delete().eq('id', id);
  if (error) return NextResponse.json({ error: 'Could not delete this LoRA.' }, { status: 500 });
  return NextResponse.json({ ok: true });
}

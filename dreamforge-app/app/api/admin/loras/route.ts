import { NextRequest, NextResponse } from 'next/server';
import { requireBetterAuthAdmin, isAdminUser } from '@/lib/admin-auth-helpers';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { moderateText } from '@/lib/moderation';
import { IMAGE_MODELS, VIDEO_MODELS, activeImageModel, activeVideoModel } from '@/lib/ai-providers/spicyapi';
import { LORA_FAMILIES, loraFamily, newLoraError, normalizeLoraLink, pairedName } from '@/lib/lora-library';

// GET: the library, with how many characters use each LoRA and what the site runs right now.
export async function GET(request: NextRequest) {
  const auth = await requireBetterAuthAdmin(request);
  if (!isAdminUser(auth)) return auth;

  const { data, error } = await getSupabaseAdmin()
    .from('lora_models')
    .select('id, name, kind, base_model, weights_path, trigger_word, default_strength, licence, source_url, is_nsfw, status, created_at, character_loras(character_id)')
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: 'Could not load the LoRA library.' }, { status: 500 });

  return NextResponse.json({
    loras: data || [],
    families: LORA_FAMILIES,
    active: {
      image: IMAGE_MODELS[activeImageModel()].baseModel,
      video: VIDEO_MODELS[activeVideoModel()].baseModel,
    },
  });
}

// POST: adds one file, or a high and low pair, as 'pending' until an admin enables it.
export async function POST(request: NextRequest) {
  const auth = await requireBetterAuthAdmin(request);
  if (!isAdminUser(auth)) return auth;

  try {
    const body = await request.json();
    const problem = newLoraError(body);
    if (problem) return NextResponse.json({ error: problem }, { status: 400 });

    const name = body.name.trim() as string;
    const isPair = Boolean(body.high_link || body.low_link);
    if (isPair && !loraFamily(body.base_model)?.hasPairs) {
      return NextResponse.json({ error: 'This model family takes a single file.' }, { status: 400 });
    }

    const files = isPair
      ? [
          { name: pairedName(name, 'high'), link: normalizeLoraLink(body.high_link) },
          { name: pairedName(name, 'low'), link: normalizeLoraLink(body.low_link) },
        ]
      : [{ name, link: normalizeLoraLink(body.link) }];
    for (const file of files) {
      if ('error' in file.link) return NextResponse.json({ error: file.link.error }, { status: 400 });
    }

    const trigger = typeof body.trigger_word === 'string' ? body.trigger_word.trim() : '';
    const sourceUrl = typeof body.source_url === 'string' ? body.source_url.trim() : '';

    // Catches LoRAs named for a real person or a youthful look. The file itself can't be read
    // from here, which is why the admin also confirms this and tests the result.
    const check = await moderateText(`LoRA name: ${name}\nTrigger word: ${trigger}\nSource: ${sourceUrl}`);
    if (!check.approved) {
      const unavailable = check.flags.includes('checker_unavailable');
      return NextResponse.json(
        {
          error: unavailable
            ? 'The content checker is unavailable, so this LoRA was not added. Try again later.'
            : 'This LoRA did not pass the content check.',
          flags: check.flags,
        },
        { status: unavailable ? 503 : 400 }
      );
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('lora_models')
      .insert(
        files.map((file) => ({
          name: file.name,
          kind: body.kind,
          base_model: body.base_model,
          provider: 'spicyapi',
          weights_path: 'link' in file.link ? file.link.link : null,
          trigger_word: trigger || null,
          default_strength: body.default_strength,
          max_strength: 2,
          licence: body.licence.trim(),
          source_url: sourceUrl || null,
          is_nsfw: body.is_nsfw === true,
          status: 'pending',
          created_by: auth.email,
        }))
      )
      .select('id');
    if (error || !data) {
      console.error('Could not save LoRA:', error?.message);
      return NextResponse.json({ error: 'Could not save this LoRA.' }, { status: 500 });
    }

    const { error: logError } = await supabase.from('moderation_log').insert(
      data.map((row) => ({
        content_type: 'lora_model',
        content_id: row.id,
        automated_result: { ...check, confirmed_licence: true, confirmed_people: true },
        actor_user_id: auth.id,
      }))
    );
    if (logError) console.error('Could not write moderation log:', logError.message);

    return NextResponse.json({ ids: data.map((row) => row.id) }, { status: 201 });
  } catch (error) {
    console.error('Add LoRA error:', error);
    return NextResponse.json({ error: 'Could not add this LoRA.' }, { status: 500 });
  }
}

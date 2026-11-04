import { NextRequest, NextResponse } from 'next/server';
import { requireBetterAuthAdmin, isAdminUser } from '@/lib/admin-auth-helpers';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { ageNumber } from '@/lib/character-age';
import { isSpicyConfigured } from '@/lib/ai-providers/spicyapi';
import { generateWithNanoBanana } from '@/lib/nano-banana';
import { buildCharacterPhotoPrompt } from '@/lib/character-prompts';
import { countReferencesByStatus, getCharacterReferences } from '@/lib/character-references';
import { trackTask, waitForTask } from '@/lib/generation-tasks';

export const maxDuration = 150;

// This image goes public, so it names an outfit and a crop instead of leaving them to the model.
const AVATAR_SCENE = 'waist-up portrait photo, wearing a simple fitted top';
const WAIT_FOR_AVATAR_MS = 130_000;

// POST: every check must pass before a character goes live. A failed check returns a
// reason, and it's safe to run again after fixing it.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireBetterAuthAdmin(request);
  if (!isAdminUser(auth)) return auth;
  if (!isSpicyConfigured()) {
    return NextResponse.json({ error: 'SPICY_API_KEY is not configured.' }, { status: 503 });
  }

  const { id } = await params;
  const supabase = getSupabaseAdmin();

  try {
    const { data: character } = await supabase.from('characters').select('*').eq('id', id).maybeSingle();
    if (!character) return NextResponse.json({ error: 'Character not found.' }, { status: 404 });

    const age = ageNumber(character.age);
    if (age === null || age < 21) {
      return NextResponse.json({ error: 'Characters must have an age of 21 or older.' }, { status: 400 });
    }

    const { data: source } = await supabase
      .from('character_sources')
      .select('source_type, model_release_id')
      .eq('character_id', id)
      .maybeSingle();
    if (!source) {
      return NextResponse.json({ error: 'Record where the images come from first.' }, { status: 400 });
    }

    if (source.source_type === 'licensed_model') {
      const { data: release } = await supabase
        .from('model_releases')
        .select('age_verified_21_at, revoked_at, scope_ai_training, scope_adult_content, scope_video')
        .eq('id', source.model_release_id)
        .maybeSingle();
      const complete = release?.age_verified_21_at && !release.revoked_at
        && release.scope_ai_training && release.scope_adult_content && release.scope_video;
      if (!complete) {
        return NextResponse.json({ error: "This model's release is incomplete or revoked." }, { status: 400 });
      }
    }

    const counts = await countReferencesByStatus(id);
    if (counts.blocked) {
      return NextResponse.json(
        { error: 'An image was flagged as possibly showing someone under 21, so this character is blocked.' },
        { status: 400 }
      );
    }
    if (counts.passed === 0) {
      return NextResponse.json(
        {
          error: counts.pending > 0
            ? 'The image checker is unavailable, so nothing could be approved. Check SPICY_API_KEY and try again.'
            : 'No reference images passed screening.',
        },
        { status: 400 }
      );
    }

    const references = await getCharacterReferences(id);
    const avatarPrompt = buildCharacterPhotoPrompt(AVATAR_SCENE, { age, hasReferences: true });
    const result = await generateWithNanoBanana(avatarPrompt, 'spicyapi', {
      enhance: false,
      referenceImages: references,
      width: 768,
      height: 1024,
      webhook: true,
    });
    if (!result.success || !result.jobId) throw new Error(result.error || 'Avatar generation failed');

    await trackTask({
      taskId: result.jobId,
      kind: 'image',
      characterId: id,
      userId: null,
      chargedMoments: 0,
      prompt: avatarPrompt,
    });

    const task = await waitForTask(result.jobId, WAIT_FOR_AVATAR_MS);
    if (task?.state !== 'succeeded' || !task.media_url) {
      return NextResponse.json({ error: 'The first portrait did not finish. Try again.' }, { status: 502 });
    }

    const { data: updated, error: updateError } = await supabase
      .from('characters')
      .update({
        avatar_url: task.media_url,
        training_status: 'ready',
        identity_status: 'ready',
        is_public: true,
      })
      .eq('id', id)
      .select()
      .single();
    if (updateError) throw new Error(updateError.message);

    return NextResponse.json({ character: updated, references: counts.passed });
  } catch (error) {
    console.error('Character activation error:', error);
    return NextResponse.json({ error: 'Could not activate this character.' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { generateWithNanoBanana } from '@/lib/nano-banana';
import { getServerSession, type AuthUser } from '@/lib/auth-helpers';
import { moderateText } from '@/lib/moderation';
import { IMAGE_MODELS, activeImageModel, isSpicyConfigured } from '@/lib/ai-providers/spicyapi';
import { getCharacterLoras } from '@/lib/character-loras';
import { getCharacterReferences } from '@/lib/character-references';
import { debitMoments, refundMoments, trackTask, waitForTask } from '@/lib/generation-tasks';
import { isAtLeast21 } from '@/lib/character-age';

// Fast images come back in the same request. Slower ones return a task ID to poll.
export const maxDuration = 60;

const IMAGE_COST = 50;
const MAX_PROMPT_LENGTH = 2000;
const WAIT_FOR_RESULT_MS = 50_000;

interface CharacterRow {
  id: string;
  name?: string;
  age?: string | null;
  avatar_url?: string | null;
  is_nsfw?: boolean;
  identity_status?: string;
}

async function generateWithSpicy(character: CharacterRow, prompt: string, user: AuthUser, slug: string) {
  const baseModel = IMAGE_MODELS[activeImageModel()].baseModel;
  const [loras, references] = await Promise.all([
    getCharacterLoras(character.id, baseModel),
    getCharacterReferences(character.id),
  ]);

  // Identity comes from reference images and LoRA trigger words. The age keeps the subject
  // clearly adult. A name alone means nothing to the model, so it's only the last resort.
  const identity = loras.triggerWords.length > 0
    ? loras.triggerWords.join(', ')
    : references.length === 0 && character.name ? `in the style of ${character.name}` : '';
  const age = character.age ? `adult, ${character.age} years old` : '';
  const fullPrompt = [identity, age, prompt].filter(Boolean).join(', ');

  const charged = await debitMoments({
    userId: user.id,
    amount: IMAGE_COST,
    type: 'image_generation',
    ref: slug,
    description: `Image generation for ${slug}`,
  });
  if (!charged) {
    return NextResponse.json({ error: `Insufficient moments. You need ${IMAGE_COST} moments.` }, { status: 402 });
  }

  let jobId: string | undefined;
  try {
    const result = await generateWithNanoBanana(fullPrompt, 'spicyapi', {
      enhance: true,
      nsfw: character.is_nsfw === true,
      loras: loras.image,
      referenceImages: references,
      width: 768,
      height: 1024,
      webhook: true,
    });
    if (!result.success || !result.jobId) throw new Error(result.error || 'Generation failed');
    jobId = result.jobId;
    await trackTask({
      taskId: jobId,
      kind: 'image',
      characterId: character.id,
      userId: user.id,
      chargedMoments: IMAGE_COST,
      prompt,
    });
  } catch (error) {
    console.error('Image generation failed to start:', error);
    // If tracking failed, the task exists but nothing can refund it later, so refund here.
    await refundMoments(user.id, IMAGE_COST, jobId || slug, `Refund for failed image generation for ${slug}`);
    return NextResponse.json({ error: 'Generation failed. Your moments were refunded.' }, { status: 502 });
  }

  const task = await waitForTask(jobId, WAIT_FOR_RESULT_MS);
  if (task?.state === 'succeeded' && task.media_url) {
    return NextResponse.json({ image_url: task.media_url, jobId });
  }
  if (task?.state === 'failed') {
    return NextResponse.json({ error: 'Generation failed. Your moments were refunded.' }, { status: 502 });
  }
  return NextResponse.json({ jobId, tracked: true });
}

// POST /api/characters/[slug]/generate
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  try {
    const body = await request.json();
    const prompt: string = body?.prompt || '';
    const visibility: 'public' | 'members' = body?.visibility === 'members' ? 'members' : 'public';
    if (!prompt) return NextResponse.json({ error: 'prompt required' }, { status: 400 });
    if (prompt.length > MAX_PROMPT_LENGTH) {
      return NextResponse.json({ error: `Prompts can be up to ${MAX_PROMPT_LENGTH} characters.` }, { status: 400 });
    }

    const textCheck = await moderateText(prompt);
    if (!textCheck.approved) {
      return NextResponse.json(
        { error: 'This prompt did not pass the content check.', flags: textCheck.flags },
        { status: 400 }
      );
    }

    const user = await getServerSession(request);
    const useSpicy = isSpicyConfigured();
    // Every SpicyAPI image costs real money, so it needs an account that can be charged.
    if (useSpicy && !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    if (!useSpicy && user) {
      // Debit moments if user is authenticated
      try {
        const { getSupabaseAdmin } = await import('@/lib/supabase-server');
        const supabaseAdmin = getSupabaseAdmin();
        const { data } = await supabaseAdmin.rpc('debit_moments', {
          p_user_id: user.id,
          p_amount: IMAGE_COST,
          p_type: 'image_generation',
          p_ref: slug,
          p_desc: `Image generation for ${slug}`,
        });
        if (data?.[0] && !data[0].success) {
          return NextResponse.json({ error: `Insufficient moments. You need ${IMAGE_COST} moments.` }, { status: 402 });
        }
      } catch (e) {
        console.error('Moments debit failed (non-blocking):', e);
      }
    }

    if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 503 });

    // Fetch character for style hint
    const { data: character, error: charErr } = await supabase
      .from('characters')
      .select('*')
      .eq('slug', slug)
      .single();
    if (charErr || !character) return NextResponse.json({ error: 'Character not found' }, { status: 404 });
    if (!isAtLeast21(character)) return NextResponse.json({ error: 'Character not found' }, { status: 404 });
    if (character.identity_status === 'revoked') {
      return NextResponse.json({ error: 'This character is no longer available.' }, { status: 403 });
    }

    if (useSpicy && user) {
      return await generateWithSpicy(character, prompt, user, slug);
    }

    const styleHint = character?.name ? `in the style of ${character.name}` : '';
    const fullPrompt = styleHint ? `${styleHint}, ${prompt}` : prompt;

    const result = await generateWithNanoBanana(fullPrompt, 'stable-diffusion-xl', {
      enhance: true,
      nsfw: character.is_nsfw === true,
    });
    if (!result.success) {
      return NextResponse.json({ error: result.error || 'generation failed' }, { status: 500 });
    }

    // Handle async job
    if (result.jobId) {
      return NextResponse.json({ jobId: result.jobId, characterId: character.id });
    }

    if (!result.imageUrl) {
      return NextResponse.json({ error: 'Generation did not return an image URL or a job ID' }, { status: 500 });
    }

    // Save media row for direct result
    const { data: media, error: mediaErr } = await supabase
      .from('character_media')
      .insert([
        {
          character_id: character.id,
          type: 'image',
          url: result.imageUrl,
          is_hd: true,
          visibility,
          prompt,
        },
      ])
      .select()
      .single();
    if (mediaErr) return NextResponse.json({ error: mediaErr.message }, { status: 500 });

    if (!character.avatar_url && result.imageUrl) {
      await supabase.from('characters').update({ avatar_url: result.imageUrl }).eq('id', character.id);
    }

    return NextResponse.json({ image_url: result.imageUrl, media });
  } catch (error) {
    console.error('Error generating image for character:', error);
    return NextResponse.json({ error: 'Failed to generate image' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthUser } from '@/lib/auth-helpers';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { queueVideoGeneration } from '@/lib/video-generation';
import { MOMENTS_COSTS } from '@/lib/moments-config';
import { moderateImage, moderateText } from '@/lib/moderation';
import { isSpicyConfigured, supportsVideoReferences } from '@/lib/ai-providers/spicyapi';
import { getCharacterVideoSetup } from '@/lib/character-loras';
import { getCharacterReferences } from '@/lib/character-references';
import { debitMoments, refundMoments, trackTask } from '@/lib/generation-tasks';
import { isAtLeast21 } from '@/lib/character-age';

const MAX_PROMPT_LENGTH = 2000;

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!isAuthUser(auth)) return auth;

  try {
    const body = await request.json();
    const { prompt, sourceImageUrl, durationSeconds, width, height } = body;

    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return NextResponse.json(
        { error: 'A text prompt is required' },
        { status: 400 }
      );
    }

    if (!sourceImageUrl || typeof sourceImageUrl !== 'string') {
      return NextResponse.json(
        { error: 'A still is required. Make an image first, then turn that still into a clip.' },
        { status: 400 }
      );
    }

    const duration = 5;
    if (durationSeconds && durationSeconds !== 5) {
      return NextResponse.json(
        { error: 'Character clips are 5 seconds.' },
        { status: 400 }
      );
    }

    // Clips can only start from a character's own images, never an arbitrary photo,
    // which could be a real person with no release on file.
    const supabase = getSupabaseAdmin();
    const [{ data: avatarMatch }, { data: mediaMatch }] = await Promise.all([
      supabase.from('characters').select('id').eq('avatar_url', sourceImageUrl).limit(1).maybeSingle(),
      supabase.from('character_media').select('character_id').eq('url', sourceImageUrl).limit(1).maybeSingle(),
    ]);
    const characterId: string | null = avatarMatch?.id ?? mediaMatch?.character_id ?? null;
    if (!characterId) {
      return NextResponse.json(
        { error: 'Clips can only be made from a character image.' },
        { status: 400 }
      );
    }
    const useSpicy = isSpicyConfigured();
    if (useSpicy && prompt.length > MAX_PROMPT_LENGTH) {
      return NextResponse.json({ error: `Prompts can be up to ${MAX_PROMPT_LENGTH} characters.` }, { status: 400 });
    }
    const { data: character } = await supabase
      .from('characters')
      .select('*')
      .eq('id', characterId)
      .maybeSingle();
    if (!character || !isAtLeast21(character)) {
      return NextResponse.json({ error: 'Clips can only be made from a character image.' }, { status: 400 });
    }
    if (character.identity_status === 'revoked') {
      return NextResponse.json({ error: 'This character is no longer available.' }, { status: 403 });
    }

    const textCheck = await moderateText(prompt);
    if (!textCheck.approved) {
      return NextResponse.json(
        { error: 'This prompt did not pass the content check.', flags: textCheck.flags },
        { status: 400 }
      );
    }

    // Cast portraits are stored as site paths, but the checker and models need full URLs.
    const absoluteSource = sourceImageUrl.startsWith('/')
      ? new URL(sourceImageUrl, request.nextUrl.origin).toString()
      : sourceImageUrl;

    const setup = useSpicy ? await getCharacterVideoSetup(characterId) : null;

    // Reference images were screened when uploaded, so the still only skips its check when
    // the model builds from those references rather than animating the still itself.
    const references = setup && supportsVideoReferences(setup.modelKey) ? await getCharacterReferences(characterId) : [];
    if (references.length === 0) {
      const imageCheck = await moderateImage(absoluteSource);
      if (!imageCheck.approved) {
        return NextResponse.json(
          { error: 'This still did not pass the content check.', flags: imageCheck.flags },
          { status: 400 }
        );
      }
    }

    // Debit moments
    const charged = await debitMoments({
      userId: auth.id,
      amount: MOMENTS_COSTS.VIDEO_GENERATION,
      type: 'video_generation',
      description: `Video generation (${duration}s)`,
    });

    if (!charged) {
      return NextResponse.json(
        { error: `Insufficient moments. You need ${MOMENTS_COSTS.VIDEO_GENERATION} moments for video generation.` },
        { status: 402 }
      );
    }

    // Queue video generation job. If it can't start or be tracked, nothing else can
    // refund it later, so refund here.
    let jobId: string | undefined;
    try {
      const loras = setup?.loras;
      const trimmed = prompt.trim();
      const result = await queueVideoGeneration({
        modelKey: setup?.modelKey,
        prompt: loras?.triggerWords.length ? `${loras.triggerWords.join(', ')}, ${trimmed}` : trimmed,
        sourceImageUrl: absoluteSource,
        referenceImages: references,
        durationSeconds: duration,
        width: width || 512,
        height: height || 512,
        loras: loras?.video,
        highNoiseLoras: loras?.videoHighNoise,
        lowNoiseLoras: loras?.videoLowNoise,
      });
      jobId = result.jobId;

      if (useSpicy) {
        await trackTask({
          taskId: result.jobId,
          kind: 'video',
          characterId,
          userId: auth.id,
          chargedMoments: MOMENTS_COSTS.VIDEO_GENERATION,
          prompt: trimmed,
        });
      }

      return NextResponse.json({
        jobId: result.jobId,
        tracked: useSpicy,
        status: result.status,
        message: 'Video generation queued successfully',
        momentsCharged: MOMENTS_COSTS.VIDEO_GENERATION,
      });
    } catch (error) {
      console.error('Video generation failed to start:', error);
      await refundMoments(
        auth.id,
        MOMENTS_COSTS.VIDEO_GENERATION,
        jobId || 'video_generation',
        'Refund for failed video generation'
      );
      return NextResponse.json({ error: 'Video could not start. Your moments were refunded.' }, { status: 502 });
    }
  } catch (error) {
    console.error('Video generation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to start video generation' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthUser } from '@/lib/auth-helpers';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { queueVideoGeneration } from '@/lib/video-generation';
import { MOMENTS_COSTS } from '@/lib/moments-config';
import { moderateImage, moderateText } from '@/lib/moderation';

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

    const textCheck = await moderateText(prompt);
    if (!textCheck.approved) {
      return NextResponse.json(
        { error: 'This prompt did not pass the content check.', flags: textCheck.flags },
        { status: 400 }
      );
    }
    const imageCheck = await moderateImage(sourceImageUrl);
    if (!imageCheck.approved) {
      return NextResponse.json(
        { error: 'This still did not pass the content check.', flags: imageCheck.flags },
        { status: 400 }
      );
    }

    // Debit moments
    const supabase = getSupabaseAdmin();
    const { data: debitResult } = await supabase.rpc('debit_moments', {
      p_user_id: auth.id,
      p_amount: MOMENTS_COSTS.VIDEO_GENERATION,
      p_type: 'video_generation',
      p_desc: `Video generation (${duration}s)`,
    });

    if (debitResult?.[0] && !debitResult[0].success) {
      return NextResponse.json(
        { error: `Insufficient moments. You need ${MOMENTS_COSTS.VIDEO_GENERATION} moments for video generation.` },
        { status: 402 }
      );
    }

    // Queue video generation job
    const result = await queueVideoGeneration({
      prompt: prompt.trim(),
      sourceImageUrl,
      durationSeconds: duration,
      width: width || 512,
      height: height || 512,
    });

    return NextResponse.json({
      jobId: result.jobId,
      status: result.status,
      message: 'Video generation queued successfully',
      momentsCharged: MOMENTS_COSTS.VIDEO_GENERATION,
    });
  } catch (error) {
    console.error('Video generation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to start video generation' },
      { status: 500 }
    );
  }
}

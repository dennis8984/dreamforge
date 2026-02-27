import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthUser } from '@/lib/auth-helpers';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { queueVideoGeneration } from '@/lib/video-generation';
import { MOMENTS_COSTS } from '@/lib/moments-config';

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

    const duration = durationSeconds || 4;
    if (![2, 4, 6].includes(duration)) {
      return NextResponse.json(
        { error: 'Duration must be 2, 4, or 6 seconds' },
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

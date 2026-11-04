/**
 * POST /api/characters/[slug]/generate-gif
 * Generate animated GIF for a character using Seedream 4.0 Edit Sequential.
 * Requires auth. Uses character avatar as source image.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthUser } from '@/lib/auth-helpers';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { generateSeedreamSequence } from '@/lib/seedream';
import { moderateImage, moderateText } from '@/lib/moderation';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const auth = await requireAuth(request);
  if (!isAuthUser(auth)) return auth;

  const { slug } = await params;
  const body = await request.json().catch(() => ({}));
  const prompt = body?.prompt || 'subtle smile, gentle movement, natural expression';

  const supabase = getSupabaseAdmin();
  const { data: character, error: charErr } = await supabase
    .from('characters')
    .select('id, avatar_url, name')
    .eq('slug', slug)
    .single();

  if (charErr || !character?.avatar_url) {
    return NextResponse.json(
      { error: 'Character not found or has no avatar' },
      { status: 404 }
    );
  }

  const textCheck = await moderateText(prompt);
  if (!textCheck.approved) {
    return NextResponse.json(
      { error: 'This prompt did not pass the content check.', flags: textCheck.flags },
      { status: 400 }
    );
  }
  const imageCheck = await moderateImage(character.avatar_url);
  if (!imageCheck.approved) {
    return NextResponse.json(
      { error: 'This image did not pass the content check.', flags: imageCheck.flags },
      { status: 400 }
    );
  }

  const result = await generateSeedreamSequence({
    sourceImageUrl: character.avatar_url,
    prompt: `${character.name}, ${prompt}`,
    numFrames: 6,
    width: 512,
    height: 512,
  });

  if (!result.success) {
    return NextResponse.json(
      { error: result.error || 'GIF generation failed' },
      { status: 500 }
    );
  }

  // If we have frames, we could upload to storage and create GIF.
  // For now, return first frame URL or job ID for polling.
  // In production: use sharp/gif-encoder or Cloudinary to assemble GIF.
  return NextResponse.json({
    success: true,
    frames: result.frames?.length || 0,
    jobId: result.jobId,
    message: result.frames?.length
      ? 'Frames generated. GIF assembly requires additional setup (e.g. Cloudinary, sharp).'
      : 'Seedream not configured. Set RUNCOMFY_API_URL and RUNCOMFY_API_KEY.',
  });
}

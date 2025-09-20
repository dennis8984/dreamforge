import { NextRequest, NextResponse } from 'next/server';
import { generateWithNanoBanana } from '@/lib/nano-banana';

export const runtime = 'edge';

// POST /api/characters/synthesize
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { image, prompt } = body;

    if (!image) {
      return NextResponse.json({ error: 'Input image is required' }, { status: 400 });
    }

    const result = await generateWithNanoBanana(
      prompt || 'portrait photo, same person, different angle',
      'stable-diffusion-xl',
      {
        input_image: image,
        strength: 0.75,
        enhance: true,
      }
    );

    if (!result.success || !result.imageUrl) {
      return NextResponse.json({ error: result.error || 'Synthesis failed' }, { status: 500 });
    }

    return NextResponse.json({ imageUrl: result.imageUrl });

  } catch (error) {
    console.error('Synthesis error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to synthesize image' },
      { status: 500 }
    );
  }
}

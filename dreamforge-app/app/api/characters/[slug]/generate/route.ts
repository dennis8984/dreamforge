import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { generateWithNanoBanana } from '@/lib/nano-banana';

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

    if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 503 });

    // Fetch character for style hint
    const { data: character, error: charErr } = await supabase
      .from('characters')
      .select('*')
      .eq('slug', slug)
      .single();
    if (charErr || !character) return NextResponse.json({ error: 'Character not found' }, { status: 404 });

    const styleHint = character?.name ? `in the style of ${character.name}` : '';
    const fullPrompt = styleHint ? `${styleHint}, ${prompt}` : prompt;

    const result = await generateWithNanoBanana(fullPrompt, 'stable-diffusion-xl', { enhance: true });
    if (!result.success || !result.imageUrl) {
      return NextResponse.json({ error: result.error || 'generation failed' }, { status: 500 });
    }

    // Save media row
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

    return NextResponse.json({ image_url: result.imageUrl, media });
  } catch (error) {
    console.error('Error generating image for character:', error);
    return NextResponse.json({ error: 'Failed to generate image' }, { status: 500 });
  }
}



import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { generateWithNanoBanana } from '@/lib/nano-banana';
import { getServerSession } from '@/lib/auth-helpers';

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

    // Debit moments if user is authenticated
    const user = await getServerSession(request);
    if (user) {
      try {
        const { getSupabaseAdmin } = await import('@/lib/supabase-server');
        const supabaseAdmin = getSupabaseAdmin();
        const { data } = await supabaseAdmin.rpc('debit_moments', {
          p_user_id: user.id,
          p_amount: 50,
          p_type: 'image_generation',
          p_ref: slug,
          p_desc: `Image generation for ${slug}`,
        });
        if (data?.[0] && !data[0].success) {
          return NextResponse.json({ error: 'Insufficient moments. You need 50 moments.' }, { status: 402 });
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

    const styleHint = character?.name ? `in the style of ${character.name}` : '';
    const fullPrompt = styleHint ? `${styleHint}, ${prompt}` : prompt;

    const result = await generateWithNanoBanana(fullPrompt, 'stable-diffusion-xl', { enhance: true });
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

    return NextResponse.json({ image_url: result.imageUrl, media });
  } catch (error) {
    console.error('Error generating image for character:', error);
    return NextResponse.json({ error: 'Failed to generate image' }, { status: 500 });
  }
}



import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET /api/characters/[slug]?page=1&pageSize=24
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  try {
    if (!supabase) return NextResponse.json({ character: null, media: { items: [], total: 0, page: 1, pageSize: 24 } });

    const { data: character, error: charErr } = await supabase
      .from('characters')
      .select('*')
      .eq('slug', slug)
      .single();
    if (charErr) throw charErr;

    // Paginate media
    const page = 1;
    const pageSize = 48;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    const { data: media, error: mediaErr, count } = await supabase
      .from('character_media')
      .select('*', { count: 'exact' })
      .eq('character_id', character.id)
      .order('created_at', { ascending: false })
      .range(from, to);
    if (mediaErr) throw mediaErr;

    return NextResponse.json({ character, media: { items: media || [], total: count || 0, page, pageSize } });
  } catch (error) {
    console.error('Error getting character by slug:', error);
    return NextResponse.json({ character: null, media: { items: [], total: 0, page: 1, pageSize: 24 } });
  }
}



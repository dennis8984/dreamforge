import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAuthUser } from '@/lib/auth-helpers';
import { getSupabaseAdmin } from '@/lib/supabase-server';

// GET /api/feed?page=1&pageSize=20&filter=all
export async function GET(request: NextRequest) {
  try {
    const page = parseInt(request.nextUrl.searchParams.get('page') || '1', 10);
    const pageSize = parseInt(request.nextUrl.searchParams.get('pageSize') || '20', 10);
    const filter = request.nextUrl.searchParams.get('filter') || 'all';
    const userId = request.nextUrl.searchParams.get('userId') || null;

    const supabase = getSupabaseAdmin();
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from('feed_posts')
      .select(`
        *,
        character:characters(id, slug, name, avatar_url)
      `, { count: 'exact' })
      .eq('visibility', 'public')
      .order('created_at', { ascending: false });

    // Filter by post type
    if (filter === 'images') {
      query = query.not('media_urls', 'eq', '{}');
      query = query.eq('post_type', 'image');
    } else if (filter === 'videos') {
      query = query.eq('post_type', 'video');
    } else if (filter === 'following' && userId) {
      // Get followed character IDs first
      const { data: follows } = await supabase
        .from('user_follows')
        .select('followed_character_id')
        .eq('follower_user_id', userId);

      const followedIds = (follows || []).map((f) => f.followed_character_id);
      if (followedIds.length > 0) {
        query = query.in('character_id', followedIds);
      } else {
        // No follows, return empty
        return NextResponse.json({ items: [], total: 0, page, pageSize });
      }
    }

    const { data, error, count } = await query.range(from, to);

    if (error) {
      console.error('Feed query error:', error);
      return NextResponse.json({ items: [], total: 0, page, pageSize });
    }

    // If user is authenticated, also fetch their reactions for these posts
    const userReactions: Record<string, string> = {};
    if (userId && data && data.length > 0) {
      const postIds = data.map((p) => p.id);
      const { data: reactions } = await supabase
        .from('feed_reactions')
        .select('post_id, reaction_type')
        .eq('user_id', userId)
        .in('post_id', postIds);

      if (reactions) {
        for (const r of reactions) {
          userReactions[r.post_id] = r.reaction_type;
        }
      }
    }

    const items = (data || []).map((post) => ({
      ...post,
      user_reaction: userReactions[post.id] || null,
    }));

    return NextResponse.json({ items, total: count || 0, page, pageSize });
  } catch (error) {
    console.error('Error fetching feed:', error);
    return NextResponse.json({ items: [], total: 0, page: 1, pageSize: 20 });
  }
}

// POST /api/feed - Create a new post (admin only)
export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!isAuthUser(auth)) return auth;

  try {
    const body = await request.json();
    const { character_id, post_type, content, media_urls, visibility } = body;

    if (!character_id) {
      return NextResponse.json({ error: 'character_id is required' }, { status: 400 });
    }
    if (!content && (!media_urls || media_urls.length === 0)) {
      return NextResponse.json({ error: 'Content or media is required' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // Verify the character exists
    const { data: character, error: charError } = await supabase
      .from('characters')
      .select('id')
      .eq('id', character_id)
      .single();

    if (charError || !character) {
      return NextResponse.json({ error: 'Character not found' }, { status: 404 });
    }

    const { data: post, error } = await supabase
      .from('feed_posts')
      .insert([{
        character_id,
        post_type: post_type || 'status',
        content: content || '',
        media_urls: media_urls || [],
        visibility: visibility || 'public',
      }])
      .select(`
        *,
        character:characters(id, slug, name, avatar_url)
      `)
      .single();

    if (error) {
      console.error('Error creating post:', error);
      return NextResponse.json({ error: 'Failed to create post' }, { status: 500 });
    }

    return NextResponse.json(post, { status: 201 });
  } catch (error) {
    console.error('Error creating post:', error);
    return NextResponse.json({ error: 'Failed to create post' }, { status: 500 });
  }
}

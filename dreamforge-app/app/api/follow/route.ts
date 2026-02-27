import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthUser } from '@/lib/auth-helpers';
import { getSupabaseAdmin } from '@/lib/supabase-server';

// GET /api/follow - List user's followed characters
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!isAuthUser(auth)) return auth;

  try {
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from('user_follows')
      .select(`
        id,
        followed_character_id,
        created_at,
        character:characters(id, slug, name, avatar_url)
      `)
      .eq('follower_user_id', auth.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching follows:', error);
      return NextResponse.json({ error: 'Failed to fetch follows' }, { status: 500 });
    }

    return NextResponse.json({ follows: data || [] });
  } catch (error) {
    console.error('Error fetching follows:', error);
    return NextResponse.json({ error: 'Failed to fetch follows' }, { status: 500 });
  }
}

// POST /api/follow - Follow a character
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!isAuthUser(auth)) return auth;

  try {
    const body = await request.json();
    const { character_id } = body;

    if (!character_id) {
      return NextResponse.json({ error: 'character_id is required' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // Verify character exists
    const { data: character, error: charError } = await supabase
      .from('characters')
      .select('id')
      .eq('id', character_id)
      .single();

    if (charError || !character) {
      return NextResponse.json({ error: 'Character not found' }, { status: 404 });
    }

    // Check if already following
    const { data: existing } = await supabase
      .from('user_follows')
      .select('id')
      .eq('follower_user_id', auth.id)
      .eq('followed_character_id', character_id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: 'Already following this character' }, { status: 409 });
    }

    const { data: follow, error } = await supabase
      .from('user_follows')
      .insert([{
        follower_user_id: auth.id,
        followed_character_id: character_id,
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating follow:', error);
      return NextResponse.json({ error: 'Failed to follow character' }, { status: 500 });
    }

    return NextResponse.json(follow, { status: 201 });
  } catch (error) {
    console.error('Error following character:', error);
    return NextResponse.json({ error: 'Failed to follow character' }, { status: 500 });
  }
}

// DELETE /api/follow - Unfollow a character
export async function DELETE(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!isAuthUser(auth)) return auth;

  try {
    const body = await request.json();
    const { character_id } = body;

    if (!character_id) {
      return NextResponse.json({ error: 'character_id is required' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    const { error } = await supabase
      .from('user_follows')
      .delete()
      .eq('follower_user_id', auth.id)
      .eq('followed_character_id', character_id);

    if (error) {
      console.error('Error unfollowing:', error);
      return NextResponse.json({ error: 'Failed to unfollow character' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error unfollowing character:', error);
    return NextResponse.json({ error: 'Failed to unfollow character' }, { status: 500 });
  }
}

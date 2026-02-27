import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthUser } from '@/lib/auth-helpers';
import { getSupabaseAdmin } from '@/lib/supabase-server';

// POST /api/feed/[postId]/react - Toggle reaction on a post
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  const auth = await requireAuth(request);
  if (!isAuthUser(auth)) return auth;

  try {
    const { postId } = await params;
    const body = await request.json();
    const reactionType = body.reaction_type || 'like';
    const supabase = getSupabaseAdmin();

    // Check if post exists
    const { data: post, error: postError } = await supabase
      .from('feed_posts')
      .select('id')
      .eq('id', postId)
      .single();

    if (postError || !post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    // Check if user already reacted to this post
    const { data: existing } = await supabase
      .from('feed_reactions')
      .select('id, reaction_type')
      .eq('post_id', postId)
      .eq('user_id', auth.id)
      .maybeSingle();

    if (existing) {
      if (existing.reaction_type === reactionType) {
        // Same reaction type: toggle off (remove)
        const { error: deleteError } = await supabase
          .from('feed_reactions')
          .delete()
          .eq('id', existing.id);

        if (deleteError) {
          console.error('Error removing reaction:', deleteError);
          return NextResponse.json({ error: 'Failed to remove reaction' }, { status: 500 });
        }

        return NextResponse.json({ action: 'removed', reaction_type: reactionType });
      } else {
        // Different reaction type: update
        const { error: updateError } = await supabase
          .from('feed_reactions')
          .update({ reaction_type: reactionType })
          .eq('id', existing.id);

        if (updateError) {
          console.error('Error updating reaction:', updateError);
          return NextResponse.json({ error: 'Failed to update reaction' }, { status: 500 });
        }

        return NextResponse.json({ action: 'updated', reaction_type: reactionType });
      }
    } else {
      // No existing reaction: create new
      const { error: insertError } = await supabase
        .from('feed_reactions')
        .insert([{
          post_id: postId,
          user_id: auth.id,
          reaction_type: reactionType,
        }]);

      if (insertError) {
        console.error('Error creating reaction:', insertError);
        return NextResponse.json({ error: 'Failed to create reaction' }, { status: 500 });
      }

      return NextResponse.json({ action: 'added', reaction_type: reactionType });
    }
  } catch (error) {
    console.error('Error toggling reaction:', error);
    return NextResponse.json({ error: 'Failed to toggle reaction' }, { status: 500 });
  }
}

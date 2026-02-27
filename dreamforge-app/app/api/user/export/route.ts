import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthUser } from '@/lib/auth-helpers';
import { getSupabaseAdmin } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!isAuthUser(auth)) return auth;

  try {
    const supabase = getSupabaseAdmin();

    // Gather all user data
    const [profileRes, conversationsRes, memoriesRes, reactionsRes, commentsRes, followsRes, ledgerRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', auth.id).single(),
      supabase.from('chat_conversations').select('*, chat_messages(*)').eq('user_id', auth.id),
      supabase.from('user_memories').select('*').eq('user_id', auth.id),
      supabase.from('feed_reactions').select('*').eq('user_id', auth.id),
      supabase.from('feed_comments').select('*').eq('user_id', auth.id),
      supabase.from('user_follows').select('*').eq('follower_user_id', auth.id),
      supabase.from('moments_ledger').select('*').eq('user_id', auth.id).order('created_at', { ascending: false }),
    ]);

    const exportData = {
      exported_at: new Date().toISOString(),
      user: {
        id: auth.id,
        email: auth.email,
        profile: profileRes.data,
      },
      conversations: conversationsRes.data || [],
      memories: memoriesRes.data || [],
      reactions: reactionsRes.data || [],
      comments: commentsRes.data || [],
      follows: followsRes.data || [],
      moments_history: ledgerRes.data || [],
    };

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="dreamforge-data-export-${auth.id}.json"`,
      },
    });
  } catch (error) {
    console.error('Data export error:', error);
    return NextResponse.json({ error: 'Failed to export data' }, { status: 500 });
  }
}

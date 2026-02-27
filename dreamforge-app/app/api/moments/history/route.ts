import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthUser } from '@/lib/auth-helpers';
import { getSupabaseAdmin } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!isAuthUser(auth)) return auth;

  try {
    const page = parseInt(request.nextUrl.searchParams.get('page') || '1', 10);
    const pageSize = parseInt(request.nextUrl.searchParams.get('pageSize') || '20', 10);
    const clampedPageSize = Math.min(Math.max(pageSize, 1), 100);

    const from = (page - 1) * clampedPageSize;
    const to = from + clampedPageSize - 1;

    const supabase = getSupabaseAdmin();

    const { data, error, count } = await supabase
      .from('moments_ledger')
      .select('*', { count: 'exact' })
      .eq('user_id', auth.id)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      console.error('Error fetching moments history:', error);
      return NextResponse.json(
        { error: 'Failed to fetch history' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      items: data || [],
      total: count || 0,
      page,
      pageSize: clampedPageSize,
    });
  } catch (error) {
    console.error('Moments history error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch history' },
      { status: 500 }
    );
  }
}

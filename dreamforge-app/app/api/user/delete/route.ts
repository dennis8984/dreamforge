import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthUser } from '@/lib/auth-helpers';
import { getSupabaseAdmin } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!isAuthUser(auth)) return auth;

  try {
    const supabase = getSupabaseAdmin();

    // Soft delete: mark profile as deleted with 30-day grace period
    const deleteDate = new Date();
    deleteDate.setDate(deleteDate.getDate() + 30);

    await supabase
      .from('profiles')
      .update({
        deleted_at: new Date().toISOString(),
        scheduled_deletion: deleteDate.toISOString(),
      })
      .eq('id', auth.id);

    return NextResponse.json({
      message: 'Account scheduled for deletion',
      scheduled_deletion: deleteDate.toISOString(),
      grace_period_days: 30,
    });
  } catch (error) {
    console.error('Account deletion error:', error);
    return NextResponse.json({ error: 'Failed to schedule deletion' }, { status: 500 });
  }
}

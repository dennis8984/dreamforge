import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthUser } from '@/lib/auth-helpers';
import { checkRateLimit } from '@/lib/rate-limiter';

// GET /api/chat/rate-limit - Get current rate limit status
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!isAuthUser(auth)) return auth;

  try {
    const rateLimit = await checkRateLimit(auth.id, auth.tier);

    return NextResponse.json({
      rateLimit,
      tier: auth.tier,
    });
  } catch (error) {
    console.error('Error in GET /api/chat/rate-limit:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

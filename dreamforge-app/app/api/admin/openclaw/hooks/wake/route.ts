import { NextRequest, NextResponse } from 'next/server';
import { sendWakeHook } from '@/lib/openclaw';
import type { WakeHookPayload } from '@/types/openclaw';
import { requireAdmin, isAuthUser } from '@/lib/auth-helpers';

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!isAuthUser(auth)) return auth;

  try {
    const body: WakeHookPayload = await request.json();
    const result = await sendWakeHook(body);
    return NextResponse.json(result, { status: result.success ? 200 : 502 });
  } catch (error) {
    console.error('Wake hook error:', error);
    return NextResponse.json(
      { error: 'Failed to send wake hook' },
      { status: 500 }
    );
  }
}

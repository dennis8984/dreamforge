import { NextRequest, NextResponse } from 'next/server';
import { sendWakeHook } from '@/lib/openclaw';
import type { WakeHookPayload } from '@/types/openclaw';
import { requireBetterAuthAdmin, isAdminUser } from '@/lib/admin-auth-helpers';

export async function POST(request: NextRequest) {
  const auth = await requireBetterAuthAdmin(request);
  if (!isAdminUser(auth)) return auth;

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

import { NextRequest, NextResponse } from 'next/server';
import { sendWakeHook } from '@/lib/openclaw';
import type { WakeHookPayload } from '@/types/openclaw';

function isAdminAuthenticated(request: NextRequest): boolean {
  const adminKey = request.headers.get('x-admin-key');
  const referrer = request.headers.get('referer');
  const isFromAdmin = referrer?.includes('admin=true');
  return adminKey === 'dreamforge_admin_2024' ||
         request.nextUrl.searchParams.get('admin') === 'true' ||
         isFromAdmin === true;
}

export async function POST(request: NextRequest) {
  if (!isAdminAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

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

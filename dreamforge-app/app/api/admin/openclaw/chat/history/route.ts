import { NextRequest, NextResponse } from 'next/server';
import { getChatHistory } from '@/lib/openclaw-chat-store';

function isAdminAuthenticated(request: NextRequest): boolean {
  const adminKey = request.headers.get('x-admin-key');
  const referrer = request.headers.get('referer');
  const isFromAdmin = referrer?.includes('admin=true');
  return adminKey === 'dreamforge_admin_2024' ||
         request.nextUrl.searchParams.get('admin') === 'true' ||
         isFromAdmin === true;
}

export async function GET(request: NextRequest) {
  if (!isAdminAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const channel = request.nextUrl.searchParams.get('channel') || undefined;
  const limit = parseInt(request.nextUrl.searchParams.get('limit') || '50', 10);

  return NextResponse.json({
    messages: getChatHistory(channel, limit),
    channel,
  });
}

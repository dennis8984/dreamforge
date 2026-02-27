import { NextRequest, NextResponse } from 'next/server';
import { getChatHistory } from '@/lib/openclaw-chat-store';
import { requireAdmin, isAuthUser } from '@/lib/auth-helpers';

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!isAuthUser(auth)) return auth;

  const channel = request.nextUrl.searchParams.get('channel') || undefined;
  const limit = parseInt(request.nextUrl.searchParams.get('limit') || '50', 10);

  return NextResponse.json({
    messages: getChatHistory(channel, limit),
    channel,
  });
}

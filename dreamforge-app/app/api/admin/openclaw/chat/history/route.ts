import { NextRequest, NextResponse } from 'next/server';
import { getChatHistory } from '@/lib/openclaw-chat-store';
import { requireBetterAuthAdmin, isAdminUser } from '@/lib/admin-auth-helpers';

export async function GET(request: NextRequest) {
  const auth = await requireBetterAuthAdmin(request);
  if (!isAdminUser(auth)) return auth;

  const channel = request.nextUrl.searchParams.get('channel') || undefined;
  const limit = parseInt(request.nextUrl.searchParams.get('limit') || '50', 10);

  return NextResponse.json({
    messages: getChatHistory(channel, limit),
    channel,
  });
}

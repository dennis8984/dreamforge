import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthUser } from '@/lib/auth-helpers';
import { fetchGreeterMedia, greeterConfigured } from '@/lib/greeter-client';
import { getOwnedGreeterSession } from '@/lib/greeter-sessions';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!isAuthUser(auth)) return auth;

  if (!greeterConfigured()) {
    return NextResponse.json({ error: 'The studio is offline.' }, { status: 503 });
  }

  const sessionId = request.nextUrl.searchParams.get('sessionId') || '';
  const kind = request.nextUrl.searchParams.get('kind');
  const index = Number(request.nextUrl.searchParams.get('index'));
  if (!sessionId || (kind !== 'chunk' && kind !== 'idle') || !Number.isInteger(index) || index < 0 || index > 999) {
    return NextResponse.json({ error: 'Invalid media request' }, { status: 400 });
  }

  const session = await getOwnedGreeterSession(sessionId, auth.id);
  if (!session || session.status === 'ended') {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  const upstream = await fetchGreeterMedia(session.rnv_session_id, kind, index);
  if (!upstream.ok) {
    return NextResponse.json({ error: 'Clip is not ready' }, { status: upstream.status === 404 ? 404 : 502 });
  }

  const bytes = await upstream.arrayBuffer();
  return new NextResponse(bytes, {
    headers: {
      'Content-Type': 'video/mp4',
      'Cache-Control': 'private, no-store',
    },
  });
}

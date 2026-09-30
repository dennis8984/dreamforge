import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthUser } from '@/lib/auth-helpers';
import { sanitizeGreeterText } from '@/lib/greeter';
import { GreeterRequestError, sendGreeterAudio, sendGreeterText } from '@/lib/greeter-client';
import { getOwnedGreeterSession, touchGreeterSession } from '@/lib/greeter-sessions';

export const dynamic = 'force-dynamic';

const MAX_AUDIO = 8_000_000;

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!isAuthUser(auth)) return auth;

  try {
    const body = await request.json();
    const sessionId = typeof body?.sessionId === 'string' ? body.sessionId : '';
    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
    }

    const session = await getOwnedGreeterSession(sessionId, auth.id);
    if (!session || session.status !== 'active') {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const audio = typeof body?.audioBase64 === 'string'
      ? body.audioBase64.replace(/^data:audio\/[\w.+-]+;base64,/, '')
      : '';
    const text = typeof body?.text === 'string' ? sanitizeGreeterText(body.text) : '';

    if (audio) {
      if (audio.length > MAX_AUDIO) {
        return NextResponse.json({ error: 'That recording is too long.' }, { status: 400 });
      }
      const format = body?.format === 'mp3' ? 'mp3' : 'wav';
      await sendGreeterAudio(session.conversation_id, audio, format);
    } else if (text) {
      if (text.length > 2000) {
        return NextResponse.json({ error: 'Keep it shorter than 2,000 characters.' }, { status: 400 });
      }
      await sendGreeterText(session.conversation_id, text);
    } else {
      return NextResponse.json({ error: 'Say something or send a recording.' }, { status: 400 });
    }

    await touchGreeterSession(sessionId, auth.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof GreeterRequestError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Greeter turn error', error);
    return NextResponse.json({ error: 'The studio is offline.' }, { status: 503 });
  }
}

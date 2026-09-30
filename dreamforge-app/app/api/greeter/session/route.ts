import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthUser } from '@/lib/auth-helpers';
import { GreeterRequestError } from '@/lib/greeter-client';
import { endGreeterSession, startGreeterSession } from '@/lib/greeter-sessions';

export const dynamic = 'force-dynamic';

function errorResponse(error: unknown) {
  if (error instanceof GreeterRequestError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  console.error('Greeter session error', error);
  return NextResponse.json({ error: 'The studio is offline.' }, { status: 503 });
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!isAuthUser(auth)) return auth;

  try {
    const { session, resumed } = await startGreeterSession(auth.id);
    return NextResponse.json({
      sessionId: session.id,
      resumed,
    }, { status: resumed ? 200 : 201 });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!isAuthUser(auth)) return auth;

  try {
    const body = await request.json();
    const sessionId = typeof body?.sessionId === 'string' ? body.sessionId : '';
    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
    }
    const result = await endGreeterSession(sessionId, auth.id);
    if (!result) {
      return NextResponse.json({ error: 'Session is already ended' }, { status: 400 });
    }
    return NextResponse.json(result);
  } catch (error) {
    return errorResponse(error);
  }
}

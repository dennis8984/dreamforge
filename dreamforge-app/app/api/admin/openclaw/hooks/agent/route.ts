import { NextRequest, NextResponse } from 'next/server';
import { sendAgentMessage } from '@/lib/openclaw';
import type { AgentHookPayload } from '@/types/openclaw';
import { requireAdmin, isAuthUser } from '@/lib/auth-helpers';

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!isAuthUser(auth)) return auth;

  try {
    const body: AgentHookPayload = await request.json();

    if (!body.message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    const result = await sendAgentMessage(body);
    return NextResponse.json(result, { status: result.success ? 200 : 502 });
  } catch (error) {
    console.error('Agent hook error:', error);
    return NextResponse.json(
      { error: 'Failed to send agent message' },
      { status: 500 }
    );
  }
}

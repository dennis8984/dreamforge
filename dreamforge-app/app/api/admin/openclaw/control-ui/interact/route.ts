import { NextRequest, NextResponse } from 'next/server';
import { interactWithControlUI } from '@/lib/openclaw';
import type { BrowserInteraction } from '@/types/openclaw';
import { requireAdmin, isAuthUser } from '@/lib/auth-helpers';

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!isAuthUser(auth)) return auth;

  try {
    const body: BrowserInteraction = await request.json();

    if (!body.type) {
      return NextResponse.json(
        { error: 'Interaction type is required' },
        { status: 400 }
      );
    }

    const result = await interactWithControlUI(body);
    return NextResponse.json(result, { status: result.success ? 200 : 502 });
  } catch (error) {
    console.error('Interaction error:', error);
    return NextResponse.json(
      { error: 'Failed to perform interaction' },
      { status: 500 }
    );
  }
}

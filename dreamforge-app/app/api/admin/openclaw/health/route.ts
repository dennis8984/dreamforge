import { NextRequest, NextResponse } from 'next/server';
import { checkOpenClawHealth, getConfigStatus } from '@/lib/openclaw';
import { requireAdmin, isAuthUser } from '@/lib/auth-helpers';

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!isAuthUser(auth)) return auth;

  try {
    const [health, config] = await Promise.all([
      checkOpenClawHealth(),
      Promise.resolve(getConfigStatus()),
    ]);

    return NextResponse.json({ health, config });
  } catch (error) {
    console.error('Health check error:', error);
    return NextResponse.json(
      { error: 'Health check failed' },
      { status: 500 }
    );
  }
}

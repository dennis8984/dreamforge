import { NextRequest, NextResponse } from 'next/server';
import { requireBetterAuthAdmin, isAdminUser } from '@/lib/admin-auth-helpers';
import { revokeModelRelease } from '@/lib/model-releases';

export const maxDuration = 120;

// POST: a model withdrew consent. This can't be undone.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireBetterAuthAdmin(request);
  if (!isAdminUser(auth)) return auth;

  const { id } = await params;
  const { reason } = await request.json();
  if (typeof reason !== 'string' || !reason.trim()) {
    return NextResponse.json({ error: 'A reason is required.' }, { status: 400 });
  }

  try {
    return NextResponse.json(await revokeModelRelease(id, reason.trim(), auth.id));
  } catch (error) {
    console.error('Release revocation error:', error);
    return NextResponse.json({ error: 'Revocation did not finish. Run it again.' }, { status: 500 });
  }
}

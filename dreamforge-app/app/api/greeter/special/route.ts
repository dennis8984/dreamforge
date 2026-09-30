import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthUser } from '@/lib/auth-helpers';
import { findGreeterSpecial, premiumTier, specialNarrationText } from '@/lib/greeter';
import { GreeterRequestError, sendGreeterNarration } from '@/lib/greeter-client';
import { MOMENTS_COSTS } from '@/lib/moments-config';
import {
  creditMoments,
  debitMoments,
  getOwnedGreeterSession,
  touchGreeterSession,
} from '@/lib/greeter-sessions';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!isAuthUser(auth)) return auth;

  if (!premiumTier(auth.tier)) {
    return NextResponse.json(
      { error: 'Special requests are for Premium and Ultimate.' },
      { status: 403 },
    );
  }

  try {
    const body = await request.json();
    const sessionId = typeof body?.sessionId === 'string' ? body.sessionId : '';
    const requestId = typeof body?.requestId === 'string' ? body.requestId : '';
    const special = findGreeterSpecial(requestId);
    if (!sessionId || !special) {
      return NextResponse.json({ error: 'Choose a special request.' }, { status: 400 });
    }

    const session = await getOwnedGreeterSession(sessionId, auth.id);
    if (!session || session.status !== 'active') {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const amount = MOMENTS_COSTS.GREETER_SPECIAL;
    const debit = await debitMoments(auth.id, amount, 'greeter_special', `Greeter special: ${special.label}`);
    if (!debit.success) {
      return NextResponse.json(
        { error: `You need ${amount} Moments for ${special.label}.` },
        { status: 402 },
      );
    }

    try {
      await sendGreeterNarration(session.rnv_session_id, specialNarrationText(special));
    } catch (error) {
      try {
        await creditMoments(auth.id, amount, 'greeter_special_refund', `Refund: ${special.label}`);
      } catch (refundError) {
        console.error('Greeter special refund failed', refundError);
        return NextResponse.json(
          { error: "The scene didn't start. The Moments charge may still be on your account." },
          { status: 502 },
        );
      }
      if (error instanceof GreeterRequestError) {
        const message = error.status === 409
          ? "She's still answering. Your Moments were returned."
          : "The scene didn't start. Your Moments were returned.";
        return NextResponse.json({ error: message }, { status: error.status === 409 ? 409 : 503 });
      }
      throw error;
    }

    await touchGreeterSession(sessionId, auth.id);
    return NextResponse.json({
      ok: true,
      label: special.label,
      momentsCharged: amount,
      balance: debit.balance,
    });
  } catch (error) {
    if (error instanceof GreeterRequestError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Greeter special error', error);
    return NextResponse.json({ error: 'The studio is offline.' }, { status: 503 });
  }
}

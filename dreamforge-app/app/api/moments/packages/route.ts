import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthUser } from '@/lib/auth-helpers';
import { MOMENTS_PACKAGES } from '@/lib/moments-config';

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!isAuthUser(auth)) return auth;

  try {
    const packages = MOMENTS_PACKAGES.map((pkg, index) => ({
      index,
      name: pkg.name,
      amount: pkg.amount,
      priceCents: pkg.priceCents,
      priceDisplay: `$${(pkg.priceCents / 100).toFixed(2)}`,
      isPopular: 'isPopular' in pkg ? pkg.isPopular : false,
    }));

    return NextResponse.json({ packages });
  } catch (error) {
    console.error('Moments packages error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch packages' },
      { status: 500 }
    );
  }
}

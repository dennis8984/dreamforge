import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthUser } from '@/lib/auth-helpers';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { stripe } from '@/lib/stripe';
import { MOMENTS_PACKAGES } from '@/lib/moments-config';

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!isAuthUser(auth)) return auth;

  try {
    const { packageIndex } = await request.json();

    if (typeof packageIndex !== 'number' || packageIndex < 0 || packageIndex >= MOMENTS_PACKAGES.length) {
      return NextResponse.json(
        { error: 'Invalid package selection' },
        { status: 400 }
      );
    }

    const pkg = MOMENTS_PACKAGES[packageIndex];
    const supabase = getSupabaseAdmin();

    // Look up or create Stripe customer
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', auth.id)
      .single();

    let customerId = profile?.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: auth.email,
        metadata: { user_id: auth.id },
      });
      customerId = customer.id;

      await supabase
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', auth.id);
    }

    const origin = request.headers.get('origin') || 'http://localhost:3000';

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `${pkg.name} Moments Pack - ${pkg.amount.toLocaleString()} Moments`,
              description: `${pkg.amount.toLocaleString()} Moments for DreamForge`,
            },
            unit_amount: pkg.priceCents,
          },
          quantity: 1,
        },
      ],
      success_url: `${origin}/account?purchase=success&moments=${pkg.amount}`,
      cancel_url: `${origin}/pricing?purchase=cancelled`,
      metadata: {
        user_id: auth.id,
        moments_amount: pkg.amount.toString(),
        package_name: pkg.name,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Moments purchase error:', error);
    return NextResponse.json(
      { error: 'Failed to create purchase session' },
      { status: 500 }
    );
  }
}

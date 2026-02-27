import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { stripe, TIER_FROM_PRICE } from '@/lib/stripe';
import { SUBSCRIPTION_MONTHLY_MOMENTS } from '@/lib/moments-config';
import Stripe from 'stripe';

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET is not set');
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.user_id;
        const tier = session.metadata?.tier;

        if (!userId) {
          console.error('No user_id in checkout session metadata');
          break;
        }

        // Handle subscription checkout
        if (session.mode === 'subscription' && tier) {
          const subscriptionId = session.subscription as string;

          await supabase
            .from('profiles')
            .update({
              subscription_tier: tier,
              stripe_subscription_id: subscriptionId,
              stripe_customer_id: session.customer as string,
            })
            .eq('id', userId);

          // Grant initial monthly moments
          const monthlyMoments = SUBSCRIPTION_MONTHLY_MOMENTS[tier] || 0;
          if (monthlyMoments > 0) {
            await supabase.rpc('add_moments', {
              p_user_id: userId,
              p_amount: monthlyMoments,
              p_reason: `${tier} subscription activated`,
            });
          }
        }

        // Handle one-time moments purchase
        if (session.mode === 'payment') {
          const momentsAmount = session.metadata?.moments_amount;
          if (momentsAmount && userId) {
            await supabase.rpc('add_moments', {
              p_user_id: userId,
              p_amount: parseInt(momentsAmount, 10),
              p_reason: 'Moments package purchase',
            });
          }
        }

        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        // Look up user by Stripe customer ID
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single();

        if (!profile) {
          console.error('No profile found for Stripe customer:', customerId);
          break;
        }

        // Determine the new tier from the price
        const priceId = subscription.items.data[0]?.price?.id;
        const newTier = priceId ? (TIER_FROM_PRICE[priceId] || 'free') : 'free';

        await supabase
          .from('profiles')
          .update({
            subscription_tier: subscription.status === 'active' ? newTier : 'free',
            stripe_subscription_id: subscription.id,
          })
          .eq('id', profile.id);

        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single();

        if (!profile) {
          console.error('No profile found for Stripe customer:', customerId);
          break;
        }

        // Downgrade to free
        await supabase
          .from('profiles')
          .update({
            subscription_tier: 'free',
            stripe_subscription_id: null,
          })
          .eq('id', profile.id);

        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        // Skip the first invoice (handled by checkout.session.completed)
        if (invoice.billing_reason === 'subscription_create') {
          break;
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('id, subscription_tier')
          .eq('stripe_customer_id', customerId)
          .single();

        if (!profile) {
          console.error('No profile found for Stripe customer:', customerId);
          break;
        }

        // Grant monthly moments for recurring payments
        const tier = profile.subscription_tier || 'free';
        const monthlyMoments = SUBSCRIPTION_MONTHLY_MOMENTS[tier] || 0;

        if (monthlyMoments > 0) {
          await supabase.rpc('add_moments', {
            p_user_id: profile.id,
            p_amount: monthlyMoments,
            p_reason: `Monthly ${tier} subscription renewal`,
          });
        }

        break;
      }

      default:
        // Unhandled event type
        console.log(`Unhandled Stripe event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });

    // Get the current user
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({
        isAuthenticated: false,
        isMember: false,
        tier: 'free'
      });
    }

    // Get user profile with subscription info
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*, subscriptions(*)')
      .eq('id', session.user.id)
      .single();

    if (error || !profile) {
      return NextResponse.json({
        isAuthenticated: true,
        isMember: false,
        tier: 'free',
        error: 'Profile not found'
      });
    }

    // Check if user has active subscription
    const hasActiveSubscription = profile.subscription_tier !== 'free' &&
      (!profile.subscription_end_date || new Date(profile.subscription_end_date) > new Date());

    return NextResponse.json({
      isAuthenticated: true,
      isMember: hasActiveSubscription,
      tier: profile.subscription_tier || 'free',
      subscriptionEndDate: profile.subscription_end_date,
      credits: profile.total_credits || 0,
      profile: {
        id: profile.id,
        email: session.user.email,
        created_at: profile.created_at
      }
    });

  } catch (error) {
    console.error('Error checking membership:', error);
    return NextResponse.json(
      { error: 'Failed to check membership status' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { tier, duration } = await request.json();

    // Get the current user
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Validate tier
    if (!['pro', 'premium'].includes(tier)) {
      return NextResponse.json({ error: 'Invalid tier' }, { status: 400 });
    }

    // Calculate end date based on duration
    const startDate = new Date();
    const endDate = new Date();
    if (duration === 'monthly') {
      endDate.setMonth(endDate.getMonth() + 1);
    } else if (duration === 'yearly') {
      endDate.setFullYear(endDate.getFullYear() + 1);
    } else {
      return NextResponse.json({ error: 'Invalid duration' }, { status: 400 });
    }

    // Update user profile with new subscription
    const { data, error } = await supabase
      .from('profiles')
      .update({
        subscription_tier: tier,
        subscription_start_date: startDate.toISOString(),
        subscription_end_date: endDate.toISOString(),
        total_credits: tier === 'premium' ? 10000 : 5000
      })
      .eq('id', session.user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating subscription:', error);
      return NextResponse.json({ error: 'Failed to update subscription' }, { status: 500 });
    }

    // Create subscription record
    await supabase
      .from('subscriptions')
      .insert({
        user_id: session.user.id,
        status: 'active',
        current_period_start: startDate.toISOString(),
        current_period_end: endDate.toISOString()
      });

    return NextResponse.json({
      success: true,
      subscription: {
        tier,
        startDate,
        endDate,
        credits: data.total_credits
      }
    });

  } catch (error) {
    console.error('Error creating subscription:', error);
    return NextResponse.json(
      { error: 'Failed to create subscription' },
      { status: 500 }
    );
  }
}
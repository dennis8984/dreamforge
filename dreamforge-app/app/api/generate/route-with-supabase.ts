import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

const RUNPOD_API_URL = process.env.RUNPOD_API_URL || 'https://api.runpod.ai/v2/xez46ruk06q834/run';
const RUNPOD_API_KEY = process.env.RUNPOD_API_KEY!;

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, model_id, parameters } = body;

    // Get user from auth header
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Check rate limits
    const { data: usage } = await supabase
      .from('usage_tracking')
      .select('*')
      .eq('user_id', user.id)
      .gte('timestamp', new Date(new Date().setDate(1)).toISOString())
      .order('timestamp', { ascending: false });

    const monthlyGenerations = usage?.length || 0;

    // Get user tier
    const { data: userData } = await supabase
      .from('users')
      .select('subscription_tier')
      .eq('id', user.id)
      .single();

    const tier = userData?.subscription_tier || 'free';
    const limits = {
      free: 5,
      basic: 100,
      premium: 500
    };

    if (monthlyGenerations >= limits[tier as keyof typeof limits]) {
      return NextResponse.json(
        { error: 'Monthly generation limit exceeded' },
        { status: 429 }
      );
    }

    // Call Runpod API
    const runpodResponse = await fetch(RUNPOD_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RUNPOD_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: {
          prompt,
          user_id: user.id,
          model_id,
          parameters
        }
      })
    });

    if (!runpodResponse.ok) {
      throw new Error('Generation failed');
    }

    const result = await runpodResponse.json();

    // Save to database
    const { data: generation, error: dbError } = await supabase
      .from('generated_images')
      .insert({
        user_id: user.id,
        model_id,
        prompt,
        image_url: result.output.image_url,
        generation_time_ms: result.output.generation_time_ms,
        parameters
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
    }

    // Track usage
    await supabase.from('usage_tracking').insert({
      user_id: user.id,
      action_type: 'generation',
      model_id,
      credits_used: 1,
      usage_metadata: { prompt: prompt.substring(0, 100) }
    });

    return NextResponse.json({
      id: generation?.id,
      image_url: result.output.image_url,
      cached: result.output.cached,
      generation_time_ms: result.output.generation_time_ms
    });

  } catch (error) {
    console.error('Generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate image' },
      { status: 500 }
    );
  }
}
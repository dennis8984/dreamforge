import { NextRequest, NextResponse } from 'next/server';

const RUNPOD_API_URL = process.env.RUNPOD_API_URL || 'https://api.runpod.ai/v2/xez46ruk06q834/run';
const RUNPOD_API_KEY = process.env.RUNPOD_API_KEY || '';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, model_id, parameters } = body;

    // Simple validation
    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    // Call Runpod API directly
    const runpodResponse = await fetch(RUNPOD_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RUNPOD_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: {
          prompt,
          model_id: model_id || 'default',
          parameters: parameters || {
            temperature: 0.7,
            guidance_scale: 7.5
          }
        }
      })
    });

    if (!runpodResponse.ok) {
      const error = await runpodResponse.text();
      console.error('Runpod error:', error);
      throw new Error('Generation failed');
    }

    const result = await runpodResponse.json();

    // Handle async response (job queued)
    if (result.id && result.status === 'IN_QUEUE') {
      return NextResponse.json({
        id: result.id,
        status: result.status,
        message: 'Job queued for processing'
      });
    }

    // Handle sync response (direct result)
    if (result.output) {
      return NextResponse.json({
        id: result.id || Math.random().toString(36).substr(2, 9),
        image_url: result.output.image_url,
        image_base64: result.output.image_base64,
        generation_time_ms: result.output.generation_time_ms,
        width: result.output.width,
        height: result.output.height,
        status: 'success'
      });
    }

    // Fallback response
    return NextResponse.json({
      id: Math.random().toString(36).substr(2, 9),
      status: 'processing',
      message: 'Image is being generated'
    });

  } catch (error) {
    console.error('Generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate image' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  // Health check endpoint
  return NextResponse.json({
    status: 'healthy',
    endpoint: RUNPOD_API_URL,
    hasApiKey: !!RUNPOD_API_KEY
  });
}
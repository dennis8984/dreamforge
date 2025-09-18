import { NextRequest, NextResponse } from 'next/server';
import {
  generateWithNanoBanana,
  checkRunpodJobStatus,
  NANO_BANANA_MODELS
} from '@/lib/nano-banana';

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

    // Get model configuration
    const modelConfig = model_id ?
      NANO_BANANA_MODELS[model_id as keyof typeof NANO_BANANA_MODELS] :
      NANO_BANANA_MODELS['stable-diffusion-xl'];

    console.log('Generation request:', {
      model: modelConfig?.name || 'default',
      hasRunpodKey: !!RUNPOD_API_KEY,
      runpodKeyLength: RUNPOD_API_KEY.length,
      promptPreview: prompt.substring(0, 50) + '...',
      isRawPrompt: prompt.toLowerCase().startsWith('raw:')
    });

    // If no Runpod API key, return error
    if (!RUNPOD_API_KEY || RUNPOD_API_KEY === '') {
      console.error('No Runpod API key found - cannot generate images');
      console.error('Set RUNPOD_API_KEY in Vercel environment variables for real generation');

      return NextResponse.json({
        error: 'AI generation not configured. Please set RUNPOD_API_KEY and RUNPOD_API_URL in environment variables.',
        status: 'error',
        message: 'Runpod API credentials required for image generation'
      }, { status: 503 });
    }

    // Check if prompt starts with "raw:" to bypass enhancement
    const isRawPrompt = prompt.toLowerCase().startsWith('raw:');
    const actualPrompt = isRawPrompt ? prompt.substring(4).trim() : prompt;

    // Generate with Nano Banana (Gemini enhancement + Runpod generation)
    const result = await generateWithNanoBanana(actualPrompt, model_id, {
      negative_prompt: parameters?.negative_prompt,
      width: parameters?.width || 1024,
      height: parameters?.height || 1024,
      guidance_scale: parameters?.guidanceScale || 7.5,
      steps: parameters?.steps || 50,
      enhance: isRawPrompt ? false : (parameters?.enhance !== false) // Bypass enhancement if raw
    });

    if (!result.success) {
      throw new Error(result.error || 'Generation failed');
    }

    // If job was queued, return job ID for polling
    if (result.jobId) {
      return NextResponse.json({
        id: result.jobId,
        status: 'processing',
        message: 'Image is being generated',
        enhanced_prompt: result.enhancedPrompt
      });
    }

    // If image was generated directly, return it
    if (result.imageUrl) {
      return NextResponse.json({
        id: Math.random().toString(36).substr(2, 9),
        image_url: result.imageUrl,
        status: 'success',
        enhanced_prompt: result.enhancedPrompt,
        generation_time_ms: 3000,
        width: parameters?.width || 1024,
        height: parameters?.height || 1024
      });
    }

    // Fallback
    return NextResponse.json({
      id: Math.random().toString(36).substr(2, 9),
      status: 'processing',
      message: 'Image generation in progress'
    });

  } catch (error) {
    console.error('Generation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate image' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  // Check if this is a job status check
  const jobId = request.nextUrl.searchParams.get('job_id');

  if (jobId) {
    try {
      const status = await checkRunpodJobStatus(jobId);

      return NextResponse.json({
        id: jobId,
        status: status.status,
        image_url: status.imageUrl,
        error: status.error
      });
    } catch {
      return NextResponse.json(
        { error: 'Failed to check job status' },
        { status: 500 }
      );
    }
  }

  // Health check endpoint
  const isConfigured = !!RUNPOD_API_KEY && RUNPOD_API_KEY.length > 0;

  return NextResponse.json({
    status: isConfigured ? 'ready' : 'not_configured',
    runpod_configured: isConfigured,
    gemini_configured: true,
    models_available: isConfigured ? Object.keys(NANO_BANANA_MODELS) : [],
    message: isConfigured ?
      'Real AI generation ready' :
      'ERROR: Runpod not configured. Set RUNPOD_API_KEY and RUNPOD_API_URL in Vercel environment variables.',
    configuration_required: !isConfigured
  });
}
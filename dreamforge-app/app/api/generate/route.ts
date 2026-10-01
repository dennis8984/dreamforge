import { NextRequest, NextResponse } from 'next/server';
import {
  generateWithNanoBanana,
  checkRunpodJobStatus,
  NANO_BANANA_MODELS
} from '@/lib/nano-banana';
import { getServerSession } from '@/lib/auth-helpers';
import { moderateImage, moderateText } from '@/lib/moderation';

const RUNPOD_API_KEY = process.env.RUNPOD_API_KEY || '';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, model_id, parameters, input_image } = body;

    // Simple validation for text-to-image
    if (!prompt && !input_image) {
      return NextResponse.json({ error: 'Prompt or input image is required' }, { status: 400 });
    }

    if (prompt) {
      const textCheck = await moderateText(prompt);
      if (!textCheck.approved) {
        return NextResponse.json(
          { error: 'This prompt did not pass the content check.', flags: textCheck.flags },
          { status: 400 }
        );
      }
    }
    if (input_image && typeof input_image === 'string' && input_image.startsWith('http')) {
      const imageCheck = await moderateImage(input_image);
      if (!imageCheck.approved) {
        return NextResponse.json(
          { error: 'This image did not pass the content check.', flags: imageCheck.flags },
          { status: 400 }
        );
      }
    }

    // Debit moments if user is authenticated
    const user = await getServerSession(request);
    if (user) {
      try {
        const { getSupabaseAdmin } = await import('@/lib/supabase-server');
        const supabaseAdmin = getSupabaseAdmin();
        const { data } = await supabaseAdmin.rpc('debit_moments', {
          p_user_id: user.id,
          p_amount: 50,
          p_type: 'image_generation',
          p_desc: 'Image generation',
        });
        if (data?.[0] && !data[0].success) {
          return NextResponse.json({ error: 'Insufficient moments. You need 50 moments for image generation.' }, { status: 402 });
        }
      } catch (e) {
        console.error('Moments debit failed (non-blocking):', e);
      }
    }

    // Get model configuration
    const modelConfig = model_id ?
      NANO_BANANA_MODELS[model_id as keyof typeof NANO_BANANA_MODELS] :
      NANO_BANANA_MODELS['stable-diffusion-xl'];

    console.log('Generation request:', {
      model: modelConfig?.name || 'default',
      hasRunpodKey: !!RUNPOD_API_KEY,
      runpodKeyLength: RUNPOD_API_KEY.length,
      promptPreview: prompt.substring(0, 50) + '...'
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

    // Generate with Nano Banana (with genur.art optimized settings)
    const result = await generateWithNanoBanana(prompt || 'beautiful nude model', model_id, {
      negative_prompt: parameters?.negative_prompt,
      width: parameters?.width || 1024,
      height: parameters?.height || 1024,
      guidance_scale: parameters?.guidanceScale || 4.5, // Lowered from 7.5 to match genur.art
      steps: parameters?.steps || 35, // Optimized from 50 to 35 for faster generation
      enhance: true, // Enable adult-oriented prompt enhancement
      sampler: parameters?.sampler || 'DPM++ 2M',
      input_image: input_image, // For image-to-image
      strength: parameters?.strength || 0.75 // How much to transform the image
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
        original_prompt: prompt
      });
    }

    // If image was generated directly, return it
    if (result.imageUrl) {
      return NextResponse.json({
        id: Math.random().toString(36).substr(2, 9),
        image_url: result.imageUrl,
        status: 'success',
        original_prompt: prompt,
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
  const isConfigured = !!RUNPOD_API_KEY && RUNPOD_API_KEY.length > 0 && RUNPOD_API_KEY !== 'your_runpod_api_key_here';
  const apiUrl = process.env.RUNPOD_API_URL || '';

  return NextResponse.json({
    status: isConfigured ? 'ready' : 'not_configured',
    runpod_configured: isConfigured,
    gemini_configured: true,
    models_available: isConfigured ? Object.keys(NANO_BANANA_MODELS) : [],
    message: isConfigured ?
      'Real AI generation ready' :
      'ERROR: Runpod not configured. Set RUNPOD_API_KEY and RUNPOD_API_URL in Vercel environment variables.',
    configuration_required: !isConfigured,
    // Debug info (remove in production)
    debug: {
      hasKey: !!RUNPOD_API_KEY,
      keyLength: RUNPOD_API_KEY?.length || 0,
      isPlaceholder: RUNPOD_API_KEY === 'your_runpod_api_key_here',
      hasUrl: !!apiUrl,
      urlValue: apiUrl ? apiUrl.substring(0, 40) + '...' : 'NOT SET'
    }
  });
}
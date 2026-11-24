// Gemini imports removed - no longer using prompt enhancement
import {
  buildImageRequest,
  createTask,
  getTask,
  imageModelFor,
  isSpicyConfigured,
  prepareImageInput,
  webhookUrl,
  withImageReferences,
  type ImageModelKey,
  type SpicyLora,
} from './ai-providers/spicyapi';

// Runpod configuration - values from env / Nubeku secrets
const RUNPOD_API_URL = process.env.RUNPOD_API_URL || process.env.NEXT_PUBLIC_RUNPOD_API_URL || '';
const RUNPOD_API_KEY = process.env.RUNPOD_API_KEY || process.env.NEXT_PUBLIC_RUNPOD_API_KEY || '';
// Optional dedicated endpoint for LoRA training jobs
const RUNPOD_TRAIN_API_URL = process.env.RUNPOD_TRAIN_API_URL || process.env.NEXT_PUBLIC_RUNPOD_TRAIN_API_URL || '';

// Model configurations for Nano Banana
export const NANO_BANANA_MODELS = {
  'gemini-2.5-flash-image-preview': {
    name: 'Gemini 2.5 Flash Image Preview',
    provider: 'google',
    modelId: 'gemini-1.5-flash',
    supportsImage: true
  },
  'gemini-2.0-flash-exp': {
    name: 'Gemini 2.0 Flash Experimental',
    provider: 'google',
    modelId: 'gemini-1.5-flash',
    supportsImage: true
  },
  'gemini-1.5-pro': {
    name: 'Gemini 1.5 Pro',
    provider: 'google',
    modelId: 'gemini-1.5-pro',
    supportsImage: true
  },
  'stable-diffusion-xl': {
    name: 'Stable Diffusion XL',
    provider: 'runpod',
    modelId: 'stabilityai/stable-diffusion-xl-base-1.0',
    supportsImage: true
  }
};

// Adds quality terms to a prompt. Explicit prompts pass through unchanged in content.
// The adult tags are only added when the caller sets `nsfw`, so a non-explicit prompt
// such as a profile photo stays non-explicit.
export async function enhancePromptWithGemini(
  prompt: string,
  { nsfw = false }: { nsfw?: boolean } = {}
): Promise<string> {
  // Skip enhancement for already explicit prompts
  if (prompt.includes('nude') || prompt.includes('naked') || prompt.includes('nsfw') || prompt.includes('explicit')) {
    // Just add quality enhancements
    return `${prompt}, high quality, detailed, realistic, professional photography`;
  }

  // Quality enhancements for photorealism
  const qualityEnhancements = [
    'photorealistic',
    'hyperrealistic',
    '8k resolution',
    'high quality',
    'detailed',
    'professional photography',
    'ultra realistic',
    'realistic skin texture',
    'skin pores',
    'imperfect skin'
  ];

  // Add quality enhancements
  const selectedEnhancements = qualityEnhancements
    .sort(() => Math.random() - 0.5)
    .slice(0, 3)
    .join(', ');

  return `${prompt}, ${selectedEnhancements}${nsfw ? ', adult content, nsfw' : ''}`;
}

// Generate image using Runpod
export async function generateImageWithRunpod(
  prompt: string,
  parameters: {
    negative_prompt?: string;
    width?: number;
    height?: number;
    guidance_scale?: number;
    num_inference_steps?: number;
    seed?: number;
    scheduler?: string;
    sampler?: string;
    input_image?: string; // Base64 encoded image for image-to-image
    strength?: number; // How much to transform the input image (0-1)
  } = {}
): Promise<{
  success: boolean;
  jobId?: string;
  imageUrl?: string;
  error?: string;
}> {
  console.log('generateImageWithRunpod called with:', {
    prompt: prompt.substring(0, 50) + '...',
    hasApiKey: !!RUNPOD_API_KEY,
    apiUrl: RUNPOD_API_URL,
    apiKeyLength: RUNPOD_API_KEY.length
  });

  if (!RUNPOD_API_KEY || RUNPOD_API_KEY === 'your_runpod_api_key_here') {
    const errorMessage = 'Runpod API key not configured. Please add your API key in Nubeku secrets. See NUBEKU_ENV_SETUP.md for instructions.';
    console.error('='.repeat(80));
    console.error('ERROR: Runpod API key not configured!');
    console.error('The API key is still set to the placeholder value.');
    console.error('');
    console.error('To fix this:');
    console.error('1. Get your API key from https://runpod.io');
    console.error('2. For local dev: Update RUNPOD_API_KEY in .env.local');
    console.error('3. For production: Set RUNPOD_API_KEY in Nubeku secrets (dash.nubeku.com)');
    console.error('4. See NUBEKU_ENV_SETUP.md for detailed instructions');
    console.error('='.repeat(80));
    return {
      success: false,
      error: errorMessage
    };
  }

  if (!RUNPOD_API_URL || RUNPOD_API_URL === '') {
    console.error('No Runpod API URL configured. Set RUNPOD_API_URL in Nubeku secrets.');
    console.error('Format: https://api.runpod.ai/v2/YOUR_ENDPOINT_ID/run');
    return {
      success: false,
      error: 'Runpod API URL not configured'
    };
  }

  // Request body for SDXL on Runpod
  const requestBody = {
    input: {
      prompt: prompt,
      negative_prompt: parameters.negative_prompt || 'two girls, multiple girls, group, 3D render, illustration, cartoon, (low quality:1), makeup, drawing, painting, crayon, sketch, graphite, impressionist, noisy, blurry, soft, deformed, ugly, text, watermark, hollywood, child, minor, underage, perfect skin, airbrushed, smooth skin, flawless skin',
      width: parameters.width || 1024,
      height: parameters.height || 1024,
      num_inference_steps: parameters.num_inference_steps || 40,
      guidance_scale: parameters.guidance_scale || 5.5,
      sampler: parameters.sampler || 'Euler a',
      seed: parameters.seed && parameters.seed !== -1 ? parameters.seed : Math.floor(Math.random() * 1000000),
      // Image-to-image parameters
      ...(parameters.input_image ? {
        init_image: parameters.input_image,
        strength: parameters.strength || 0.75
      } : {})
    }
  };

  console.log('='.repeat(60));
  console.log('📤 SENDING REQUEST TO RUNPOD');
  console.log('='.repeat(60));
  console.log('URL:', RUNPOD_API_URL);
  console.log('API Key:', RUNPOD_API_KEY ? 'set' : 'NOT SET');
  console.log('Prompt:', prompt.substring(0, 100) + '...');
  console.log('Mode:', parameters.input_image ? 'Image-to-Image' : 'Text-to-Image');
  console.log('='.repeat(60));

  try {
    const response = await fetch(RUNPOD_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RUNPOD_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Runpod API error response:', errorText);
      throw new Error(`Runpod API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const result = await response.json();
    console.log('='.repeat(60));
    console.log('✅ RUNPOD RESPONSE RECEIVED');
    console.log('='.repeat(60));
    console.log('Job ID:', result.id || 'No ID');
    console.log('Status:', result.status || 'No status');
    console.log('Has Output:', !!result.output);
    if (result.error) {
      console.error('Error from Runpod:', result.error);
    }
    console.log('Full response:', JSON.stringify(result, null, 2));
    console.log('='.repeat(60));

    // Handle async job response
    if (result.id && result.status === 'IN_QUEUE') {
      return {
        success: true,
        jobId: result.id
      };
    }

    // Handle direct result
    if (result.output) {
      let imageUrl = null;

      // Check various output formats
      if (typeof result.output === 'string') {
        // If it's a base64 string, add data URI prefix
        if (!result.output.startsWith('http') && !result.output.startsWith('data:')) {
          imageUrl = `data:image/png;base64,${result.output}`;
        } else {
          imageUrl = result.output;
        }
      } else if (Array.isArray(result.output) && result.output.length > 0) {
        const firstImage = result.output[0];
        if (!firstImage.startsWith('http') && !firstImage.startsWith('data:')) {
          imageUrl = `data:image/png;base64,${firstImage}`;
        } else {
          imageUrl = firstImage;
        }
      } else if (result.output.image_url) {
        imageUrl = result.output.image_url;
      } else if (result.output.images && Array.isArray(result.output.images)) {
        const firstImage = result.output.images[0];
        if (!firstImage.startsWith('http') && !firstImage.startsWith('data:')) {
          imageUrl = `data:image/png;base64,${firstImage}`;
        } else {
          imageUrl = firstImage;
        }
      }

      if (imageUrl) {
        return {
          success: true,
          imageUrl: imageUrl
        };
      }
    }

    return {
      success: false,
      error: 'Unexpected response from Runpod'
    };
  } catch (error) {
    console.error('Runpod generation error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate image'
    };
  }
}

// Check Runpod job status
export async function checkRunpodJobStatus(jobId: string): Promise<{
  status: string;
  imageUrl?: string;
  error?: string;
}> {
  try {
    if (isSpicyConfigured()) {
      const task = await getTask(jobId);
      if (task.state === 'succeeded') return { status: 'completed', imageUrl: task.asset?.url };
      if (task.state === 'queued' || task.state === 'running') return { status: 'processing' };
      return { status: 'failed', error: task.errorMessage || task.errorCode || task.state };
    }

    // Extract endpoint ID from the API URL
    const endpointId = RUNPOD_API_URL.match(/\/v2\/([^\/]+)\/run/)?.[1] || 'ga8coh1zc01r57';
    const statusUrl = `https://api.runpod.ai/v2/${endpointId}/status/${jobId}`;

    const response = await fetch(statusUrl, {
      headers: {
        'Authorization': `Bearer ${RUNPOD_API_KEY}`,
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to check job status: ${response.statusText}`);
    }

    const result = await response.json();
    console.log('Job status check result:', JSON.stringify(result, null, 2));

    if (result.status === 'COMPLETED' && result.output) {
      // Handle different output formats from Runpod
      let imageUrl = null;

      if (typeof result.output === 'string') {
        // If it's a base64 string, add data URI prefix
        if (!result.output.startsWith('http') && !result.output.startsWith('data:')) {
          imageUrl = `data:image/png;base64,${result.output}`;
        } else {
          imageUrl = result.output;
        }
      } else if (Array.isArray(result.output) && result.output.length > 0) {
        // If array, take first item and check if it's base64
        const firstImage = result.output[0];
        if (!firstImage.startsWith('http') && !firstImage.startsWith('data:')) {
          imageUrl = `data:image/png;base64,${firstImage}`;
        } else {
          imageUrl = firstImage;
        }
      } else if (result.output.image_url) {
        imageUrl = result.output.image_url;
      } else if (result.output.images && Array.isArray(result.output.images)) {
        const firstImage = result.output.images[0];
        if (!firstImage.startsWith('http') && !firstImage.startsWith('data:')) {
          imageUrl = `data:image/png;base64,${firstImage}`;
        } else {
          imageUrl = firstImage;
        }
      }

      return {
        status: 'completed',
        imageUrl: imageUrl
      };
    }

    return {
      status: result.status ? result.status.toLowerCase() : 'processing',
      error: result.error
    };
  } catch (error) {
    console.error('Error checking job status:', error);
    return {
      status: 'error',
      error: error instanceof Error ? error.message : 'Failed to check status'
    };
  }
}

// Queue a LoRA training job on Runpod
export async function queueRunpodTrainingJob(
  images: string[],
  options: {
    instanceName?: string;
    rank?: number;
    steps?: number;
    learningRate?: number;
  } = {}
): Promise<{ success: boolean; jobId?: string; error?: string }> {
  if (!RUNPOD_API_KEY) {
    return { success: false, error: 'Runpod API key not configured' };
  }
  if (!RUNPOD_TRAIN_API_URL) {
    return { success: false, error: 'RUNPOD_TRAIN_API_URL is not configured' };
  }

  const requestBody = {
    input: {
      action: 'train_lora',
      images,
      params: {
        instance_name: options.instanceName || 'character',
        rank: options.rank || 16,
        steps: options.steps || 800,
        learning_rate: options.learningRate || 1e-4
      }
    }
  };

  try {
    const response = await fetch(RUNPOD_TRAIN_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RUNPOD_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });
    const result = await response.json();
    if (!response.ok) {
      return { success: false, error: result?.error || 'Runpod training error' };
    }
    if (result.id) {
      return { success: true, jobId: result.id };
    }
    return { success: false, error: 'Unexpected training response' };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to queue training' };
  }
}

// Check training status
export async function checkRunpodTrainingStatus(
  jobId: string
): Promise<{ status: 'queued' | 'in_progress' | 'completed' | 'failed'; modelRef?: unknown; error?: string }> {
  try {
    if (!RUNPOD_TRAIN_API_URL || !RUNPOD_API_KEY) {
      return { status: 'failed', error: 'Training endpoint not configured' } as const;
    }
    const endpointId = RUNPOD_TRAIN_API_URL.match(/\/v2\/([^\/]+)\/run/)?.[1];
    if (!endpointId) {
      return { status: 'failed', error: 'Invalid RUNPOD_TRAIN_API_URL' } as const;
    }
    const statusUrl = `https://api.runpod.ai/v2/${endpointId}/status/${jobId}`;
    const res = await fetch(statusUrl, {
      headers: { 'Authorization': `Bearer ${RUNPOD_API_KEY}` }
    });
    const json = await res.json();
    if (!res.ok) {
      return { status: 'failed', error: json?.error || 'Status error' } as const;
    }
    if (json.status === 'COMPLETED') {
      const modelRef = json.output?.model || json.output?.lora || json.output || null;
      return { status: 'completed', modelRef } as const;
    }
    if (json.status === 'FAILED' || json.status === 'ERROR') {
      return { status: 'failed', error: json?.error || 'Training failed' } as const;
    }
    return { status: 'in_progress' } as const;
  } catch (err) {
    return { status: 'failed', error: err instanceof Error ? err.message : 'Failed to check training' } as const;
  }
}

// Main Nano Banana generation function
export async function generateWithNanoBanana(
  prompt: string,
  _modelId: string = 'stable-diffusion-xl',
  options: {
    enhance?: boolean;
    nsfw?: boolean; // Adds adult tags during enhancement. Explicit prompts work either way.
    negative_prompt?: string;
    width?: number;
    height?: number;
    guidance_scale?: number;
    steps?: number;
    seed?: number;
    sampler?: string;
    scheduler?: string;
    input_image?: string; // For image-to-image
    strength?: number; // How much to transform (0-1)
    loras?: SpicyLora[]; // SpicyAPI only
    referenceImages?: string[]; // SpicyAPI only: screened images of this character
    imageModel?: ImageModelKey; // SpicyAPI only: overrides the automatic choice
    backgroundImage?: string; // SpicyAPI only: the location, used with referenceImages
    webhook?: boolean; // SpicyAPI only: set when the task is tracked in generation_tasks
  } = {}
): Promise<{
  success: boolean;
  imageUrl?: string;
  jobId?: string;
  originalPrompt?: string;
  error?: string;
}> {
  try {
    // Enhance prompt if requested (default is true for better results)
    const shouldEnhance = options.enhance !== false;
    const finalPrompt = shouldEnhance
      ? await enhancePromptWithGemini(prompt, { nsfw: options.nsfw })
      : prompt;

    if (shouldEnhance && finalPrompt !== prompt) {
      console.log('Prompt enhanced:', {
        original: prompt,
        enhanced: finalPrompt
      });
    }

    // With a SpicyAPI key set, every server route generates there instead of on Runpod.
    if (isSpicyConfigured()) {
      const references = options.referenceImages || [];
      const modelKey = options.imageModel ?? imageModelFor({
        hasReferences: references.length > 0,
        hasLoras: Boolean(options.loras?.length),
      });
      const request = buildImageRequest({
        modelKey,
        prompt: references.length > 0
          ? withImageReferences(modelKey, references.length, finalPrompt, { hasBackground: Boolean(options.backgroundImage) })
          : finalPrompt,
        width: options.width,
        height: options.height,
        seed: options.seed,
        loras: options.loras,
        referenceImages: references,
        backgroundImage: options.backgroundImage,
        sourceImage: options.input_image ? await prepareImageInput(options.input_image) : undefined,
        strength: options.strength,
        resolution: process.env.SPICY_IMAGE_RESOLUTION,
      });
      const task = await createTask(request, {
        idempotencyKey: crypto.randomUUID(),
        callBackUrl: options.webhook ? webhookUrl() : undefined,
      });
      return { success: true, jobId: task.taskId, originalPrompt: finalPrompt };
    }

    // Minimal negative prompt - focus on avoiding quality issues, not content
    const defaultNegative = 'two girls, multiple girls, group, 3D render, illustration, cartoon, (low quality:1), makeup, drawing, painting, crayon, sketch, graphite, impressionist, noisy, blurry, soft, deformed, ugly, text, watermark, hollywood, child, minor, underage, bad quality, cropped, morphed, blender, 3d_model, oil, perfect skin, airbrushed, smooth skin, flawless skin';

    // Generate image with Runpod
    const result = await generateImageWithRunpod(finalPrompt, {
      negative_prompt: options.negative_prompt ?
        `${options.negative_prompt}, ${defaultNegative}` :
        defaultNegative,
      width: options.width,
      height: options.height,
      guidance_scale: options.guidance_scale,
      num_inference_steps: options.steps,
      seed: options.seed,
      scheduler: options.scheduler,
      sampler: options.sampler,
      input_image: options.input_image,
      strength: options.strength
    });

    return {
      ...result,
      originalPrompt: finalPrompt
    };
  } catch (error) {
    console.error('Nano Banana generation error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Generation failed'
    };
  }
}


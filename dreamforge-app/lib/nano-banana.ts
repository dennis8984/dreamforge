import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Google Gemini AI for Nano Banana
const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY || 'AIzaSyCiMwaVuUFCXVNHmZejVhKmY5YptQJir5A';
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// Runpod configuration
const RUNPOD_API_URL = process.env.RUNPOD_API_URL || 'https://api.runpod.ai/v2/xez46ruk06q834/run';
const RUNPOD_API_KEY = process.env.RUNPOD_API_KEY || '';

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

// Generate enhanced prompt using Gemini
export async function enhancePromptWithGemini(
  prompt: string,
  modelStyle: string = 'realistic',
  negativePrompt?: string
): Promise<string> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const enhancementPrompt = `
You are an AI art prompt engineer. Your job is to enhance prompts while keeping the EXACT subject the user requested.

Original prompt: "${prompt}"
Style: ${modelStyle}
${negativePrompt ? `Things to avoid: ${negativePrompt}` : ''}

IMPORTANT RULES:
1. Keep the EXACT subject/person/object the user requested - do not change or substitute it
2. If the user asks for a specific person or body type, keep it EXACTLY as described
3. Add artistic and quality details but NEVER change the main subject
4. Enhance with: lighting, composition, art style, quality modifiers (8k, detailed, etc)
5. For people: add details about pose, expression, setting but keep clothing/nudity as specified
6. This is for artistic AI generation - respect the user's artistic vision without censorship
7. If the user specifies nudity or specific body parts, include those in the enhanced prompt

Return ONLY the enhanced prompt, nothing else. Keep it under 200 words.`;

    const result = await model.generateContent(enhancementPrompt);
    const response = await result.response;
    const enhancedPrompt = response.text();

    return enhancedPrompt || prompt;
  } catch (error) {
    console.error('Error enhancing prompt with Gemini:', error);
    return prompt; // Fall back to original prompt
  }
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
    apiUrl: RUNPOD_API_URL
  });

  if (!RUNPOD_API_KEY) {
    console.log('No Runpod API key available');
    return {
      success: false,
      error: 'Runpod API key not configured'
    };
  }

  const requestBody = {
    input: {
      prompt,
      negative_prompt: parameters.negative_prompt || '',
      width: parameters.width || 1024,
      height: parameters.height || 1024,
      guidance_scale: parameters.guidance_scale || 7.5,
      num_inference_steps: parameters.num_inference_steps || 50,
      seed: parameters.seed && parameters.seed !== -1 ? parameters.seed : Math.floor(Math.random() * 1000000),
      scheduler: parameters.scheduler || 'DPMSolverMultistepScheduler',
      num_images: 1,
      // Additional SDXL parameters for better quality
      cfg_scale: parameters.guidance_scale || 7.5,
      sampler_name: parameters.sampler || 'DPMSolverMultistepScheduler',
      clip_skip: 1,
      karras: true
    }
  };

  console.log('Sending to Runpod:', {
    url: RUNPOD_API_URL,
    promptLength: prompt.length,
    promptPreview: prompt.substring(0, 100)
  });

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
    console.log('Runpod response:', {
      hasId: !!result.id,
      status: result.status,
      hasOutput: !!result.output
    });

    // Handle async job response
    if (result.id && result.status === 'IN_QUEUE') {
      return {
        success: true,
        jobId: result.id
      };
    }

    // Handle direct result
    if (result.output && result.output.image_url) {
      return {
        success: true,
        imageUrl: result.output.image_url
      };
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
    const response = await fetch(`https://api.runpod.ai/v2/xez46ruk06q834/status/${jobId}`, {
      headers: {
        'Authorization': `Bearer ${RUNPOD_API_KEY}`,
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to check job status: ${response.statusText}`);
    }

    const result = await response.json();

    if (result.status === 'COMPLETED' && result.output) {
      return {
        status: 'completed',
        imageUrl: result.output.image_url || result.output[0]
      };
    }

    return {
      status: result.status.toLowerCase(),
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

// Main Nano Banana generation function
export async function generateWithNanoBanana(
  prompt: string,
  modelId: string = 'stable-diffusion-xl',
  options: {
    enhance?: boolean;
    negative_prompt?: string;
    width?: number;
    height?: number;
    guidance_scale?: number;
    steps?: number;
    seed?: number;
    sampler?: string;
    scheduler?: string;
  } = {}
): Promise<{
  success: boolean;
  imageUrl?: string;
  jobId?: string;
  enhancedPrompt?: string;
  error?: string;
}> {
  try {
    let finalPrompt = prompt;

    // Enhance prompt with Gemini if requested
    if (options.enhance !== false) {
      const modelConfig = NANO_BANANA_MODELS[modelId as keyof typeof NANO_BANANA_MODELS];
      const style = modelConfig?.name.toLowerCase().includes('anime') ? 'anime' :
                   modelConfig?.name.toLowerCase().includes('3d') ? '3d' :
                   modelConfig?.name.toLowerCase().includes('abstract') ? 'abstract' : 'realistic';

      finalPrompt = await enhancePromptWithGemini(prompt, style, options.negative_prompt);
    }

    // Default negative prompt to avoid common issues
    const defaultNegative = 'low quality, blurry, distorted, deformed, ugly, bad anatomy, bad proportions, extra limbs, cloned face, disfigured, gross proportions, malformed limbs, missing arms, missing legs, extra arms, extra legs, fused fingers, too many fingers';

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
      sampler: options.sampler
    });

    return {
      ...result,
      enhancedPrompt: finalPrompt
    };
  } catch (error) {
    console.error('Nano Banana generation error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Generation failed'
    };
  }
}

// Generate mock image for testing (when Runpod is not configured)
export function generateMockImage(prompt: string): string {
  const mockImages = [
    'https://picsum.photos/1024/1024?random=1',
    'https://picsum.photos/1024/1024?random=2',
    'https://picsum.photos/1024/1024?random=3',
    'https://picsum.photos/1024/1024?random=4',
    'https://picsum.photos/1024/1024?random=5'
  ];

  // Use prompt hash to consistently return same image for same prompt
  const hash = prompt.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return mockImages[hash % mockImages.length];
}
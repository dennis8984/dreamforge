// Gemini imports removed - no longer using prompt enhancement

// Runpod configuration - gets values from Vercel environment variables
const RUNPOD_API_URL = process.env.RUNPOD_API_URL || process.env.NEXT_PUBLIC_RUNPOD_API_URL || '';
const RUNPOD_API_KEY = process.env.RUNPOD_API_KEY || process.env.NEXT_PUBLIC_RUNPOD_API_KEY || '';

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

// Removed prompt enhancement - now just returns the original prompt
// Prompt enhancement has been completely removed
// This function is kept for backward compatibility but now just returns the original prompt
export async function enhancePromptWithGemini(
  prompt: string
): Promise<string> {
  return prompt;
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
    console.error('='.repeat(80));
    console.error('ERROR: Runpod API key not configured!');
    console.error('The API key is still set to the placeholder value.');
    console.error('');
    console.error('To fix this:');
    console.error('1. Get your API key from https://runpod.io');
    console.error('2. For local dev: Update RUNPOD_API_KEY in .env.local');
    console.error('3. For production: Set RUNPOD_API_KEY in Vercel environment variables');
    console.error('4. See RUNPOD_SETUP.md for detailed instructions');
    console.error('='.repeat(80));
    return {
      success: false,
      error: 'Runpod API key not configured. Please add your API key in Vercel environment variables. See RUNPOD_SETUP.md for instructions.'
    };
  }

  if (!RUNPOD_API_URL || RUNPOD_API_URL === '') {
    console.error('No Runpod API URL configured. Set RUNPOD_API_URL in Vercel environment variables.');
    console.error('Format: https://api.runpod.ai/v2/YOUR_ENDPOINT_ID/run');
    return {
      success: false,
      error: 'Runpod API URL not configured'
    };
  }

  // Simplified request body for SDXL on Runpod
  const requestBody = {
    input: {
      prompt: prompt,
      negative_prompt: parameters.negative_prompt || '',
      width: parameters.width || 1024,
      height: parameters.height || 1024,
      num_inference_steps: parameters.num_inference_steps || 30,
      guidance_scale: parameters.guidance_scale || 7.5,
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
  console.log('API Key:', RUNPOD_API_KEY ? `${RUNPOD_API_KEY.substring(0, 10)}...` : 'NOT SET');
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

// Main Nano Banana generation function
export async function generateWithNanoBanana(
  prompt: string,
  _modelId: string = 'stable-diffusion-xl',
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
    input_image?: string; // For image-to-image
    strength?: number; // How much to transform (0-1)
  } = {}
): Promise<{
  success: boolean;
  imageUrl?: string;
  jobId?: string;
  originalPrompt?: string;
  error?: string;
}> {
  try {
    const finalPrompt = prompt;

    // Using original prompt directly without enhancement

    // Default negative prompt for NSFW generation - only quality issues, no content restrictions
    const defaultNegative = 'child, minor, underage, low quality, blurry, distorted, deformed, ugly, bad anatomy, bad proportions, extra limbs, cloned face, disfigured, gross proportions, malformed limbs, missing arms, missing legs, extra arms, extra legs, fused fingers, too many fingers';

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

// Generate mock image for testing (when Runpod is not configured)
// Now returns null to indicate no generation available
export function generateMockImage(prompt: string): string | null {
  console.error('ERROR: Cannot generate images - Runpod not configured');
  console.error('To enable real AI generation:');
  console.error('1. Set RUNPOD_API_KEY in Vercel environment variables');
  console.error('2. Set RUNPOD_API_URL in Vercel environment variables');
  console.error('Attempted prompt:', prompt);
  return null;
}
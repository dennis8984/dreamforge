export interface GenerationPreset {
  name: string;
  description: string;
  category: string;
  settings: {
    guidanceScale: number;
    steps: number;
    width: number;
    height: number;
    negativePrompt?: string;
    promptPrefix?: string;
    promptSuffix?: string;
    sampler?: string;
  };
}

export const GENERATION_PRESETS: Record<string, GenerationPreset> = {
  'artistic-portrait': {
    name: 'Artistic Portrait',
    description: 'High-quality artistic portraits with soft lighting',
    category: 'portrait',
    settings: {
      guidanceScale: 7.5,
      steps: 40,
      width: 768,
      height: 1024,
      negativePrompt: 'cartoon, anime, sketch, worst quality, low quality, blurry',
      promptSuffix: ', portrait photography, soft lighting, high quality, 8k, detailed face, professional photography'
    }
  },
  'anime-character': {
    name: 'Anime Character',
    description: 'Anime/manga style character art',
    category: 'anime',
    settings: {
      guidanceScale: 12,
      steps: 50,
      width: 768,
      height: 1024,
      negativePrompt: 'realistic, photo, ugly, bad anatomy, bad proportions',
      promptSuffix: ', anime style, manga art, detailed anime, vibrant colors, high quality'
    }
  },
  'photorealistic': {
    name: 'Photorealistic',
    description: 'Ultra-realistic photographic quality',
    category: 'photo',
    settings: {
      guidanceScale: 8,
      steps: 50,
      width: 1024,
      height: 1024,
      negativePrompt: 'cartoon, drawing, anime, sketch, worst quality, low quality',
      promptSuffix: ', photorealistic, hyperrealistic, professional photography, 8k uhd, dslr, high quality, film grain'
    }
  },
  'artistic-nsfw': {
    name: 'Artistic Figure',
    description: 'Artistic figure studies and portraits',
    category: 'artistic',
    settings: {
      guidanceScale: 9,
      steps: 60,
      width: 768,
      height: 1024,
      negativePrompt: 'worst quality, low quality, blurry, bad anatomy, bad proportions, extra limbs',
      promptSuffix: ', artistic, beautiful lighting, high quality, detailed, professional art'
    }
  },
  'fantasy-art': {
    name: 'Fantasy Art',
    description: 'Fantasy and concept art style',
    category: 'fantasy',
    settings: {
      guidanceScale: 10,
      steps: 45,
      width: 1024,
      height: 1024,
      negativePrompt: 'photo, realistic, modern, mundane',
      promptSuffix: ', fantasy art, concept art, digital painting, highly detailed, artstation'
    }
  },
  'cinematic': {
    name: 'Cinematic',
    description: 'Cinematic shots with dramatic lighting',
    category: 'cinematic',
    settings: {
      guidanceScale: 7,
      steps: 40,
      width: 1280,
      height: 768,
      negativePrompt: 'cartoon, anime, low quality, amateur',
      promptSuffix: ', cinematic lighting, movie still, film photography, dramatic, atmospheric'
    }
  },
  'oil-painting': {
    name: 'Oil Painting',
    description: 'Classical oil painting style',
    category: 'painting',
    settings: {
      guidanceScale: 8.5,
      steps: 55,
      width: 1024,
      height: 1024,
      negativePrompt: 'photo, digital, modern, cartoon',
      promptSuffix: ', oil painting, classical art, brush strokes, canvas texture, masterpiece'
    }
  },
  'quick-draft': {
    name: 'Quick Draft',
    description: 'Fast generation for testing ideas',
    category: 'draft',
    settings: {
      guidanceScale: 7,
      steps: 20,
      width: 512,
      height: 512,
      negativePrompt: 'worst quality, low quality'
    }
  },
  'high-detail': {
    name: 'High Detail',
    description: 'Maximum quality and detail',
    category: 'quality',
    settings: {
      guidanceScale: 10,
      steps: 80,
      width: 1024,
      height: 1024,
      negativePrompt: 'low quality, blurry, pixelated, compression artifacts',
      promptSuffix: ', extremely detailed, intricate details, masterpiece, best quality, high resolution'
    }
  }
};

export function applyPreset(preset: GenerationPreset, currentPrompt: string): {
  prompt: string;
  negativePrompt: string;
  parameters: {
    guidanceScale: number;
    steps: number;
    width: number;
    height: number;
    sampler: string;
  };
} {
  let enhancedPrompt = currentPrompt;

  if (preset.settings.promptPrefix) {
    enhancedPrompt = preset.settings.promptPrefix + enhancedPrompt;
  }

  if (preset.settings.promptSuffix) {
    enhancedPrompt = enhancedPrompt + preset.settings.promptSuffix;
  }

  return {
    prompt: enhancedPrompt,
    negativePrompt: preset.settings.negativePrompt || '',
    parameters: {
      guidanceScale: preset.settings.guidanceScale,
      steps: preset.settings.steps,
      width: preset.settings.width,
      height: preset.settings.height,
      sampler: preset.settings.sampler || 'DPMSolverMultistepScheduler'
    }
  };
}
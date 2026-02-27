/**
 * Seedream 4.0 Edit Sequential - Animated GIF generation via image sequences
 * Uses RunComfy / ByteDance Seedream API for cohesive frame sequences
 * @see https://www.runcomfy.com/models/bytedance/seedream-4-0/edit-sequential
 */

const RUNCOMFY_API_URL = process.env.RUNCOMFY_API_URL || process.env.SEEDREAM_API_URL || '';
const RUNCOMFY_API_KEY = process.env.RUNCOMFY_API_KEY || process.env.SEEDREAM_API_KEY || '';

export interface SeedreamSequenceOptions {
  /** Base image URL (for image-to-image) */
  sourceImageUrl: string;
  /** Prompt describing the animation (e.g. "woman smiling, slight head turn") */
  prompt: string;
  /** Number of frames to generate (4-10) */
  numFrames?: number;
  /** Width */
  width?: number;
  /** Height */
  height?: number;
  /** Seed for reproducibility */
  seed?: number;
}

export interface SeedreamSequenceResult {
  success: boolean;
  frames?: string[];
  jobId?: string;
  gifUrl?: string;
  error?: string;
}

/**
 * Generate a sequence of images using Seedream 4.0 Edit Sequential.
 * Frames maintain character identity and style consistency.
 * Combine frames into GIF client-side or via a serverless function.
 */
export async function generateSeedreamSequence(
  options: SeedreamSequenceOptions
): Promise<SeedreamSequenceResult> {
  if (!RUNCOMFY_API_KEY || !RUNCOMFY_API_URL) {
    return {
      success: false,
      error: 'Seedream/RunComfy not configured. Set RUNCOMFY_API_URL and RUNCOMFY_API_KEY.',
    };
  }

  const numFrames = Math.min(10, Math.max(4, options.numFrames || 6));
  const prompt = `${options.prompt}, generate ${numFrames} sequential frames, subtle motion, consistent character`;

  try {
    const response = await fetch(RUNCOMFY_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RUNCOMFY_API_KEY}`,
      },
      body: JSON.stringify({
        prompt,
        image_url: options.sourceImageUrl,
        num_images: numFrames,
        width: options.width || 512,
        height: options.height || 512,
        seed: options.seed ?? Math.floor(Math.random() * 1e9),
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return {
        success: false,
        error: `Seedream API error: ${response.status} - ${errText}`,
      };
    }

    const data = (await response.json()) as {
      images?: string[];
      output?: string | string[];
      job_id?: string;
    };

    const frames: string[] = [];
    if (Array.isArray(data.images)) {
      frames.push(...data.images);
    } else if (data.output) {
      const out = Array.isArray(data.output) ? data.output : [data.output];
      frames.push(...out.filter(Boolean));
    }

    return {
      success: frames.length > 0,
      frames,
      jobId: data.job_id,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Seedream generation failed',
    };
  }
}

/**
 * Create animated GIF from frames (client-side or via API).
 * For server-side: use sharp/gif-encoder or a service like Cloudinary.
 * This returns the frames; GIF assembly can be done elsewhere.
 */
export function framesToGifDataUrl(frames: string[]): string {
  // Placeholder: in production, use gif-encoder or a service
  // For now return first frame as fallback
  return frames[0] || '';
}

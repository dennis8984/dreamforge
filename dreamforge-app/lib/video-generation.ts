import {
  VIDEO_MODELS,
  activeVideoModel,
  buildVideoRequest,
  createTask,
  isSpicyConfigured,
  prepareImageInput,
  supportsVideoReferences,
  webhookUrl,
  type SpicyLora,
  type VideoModelKey,
} from './ai-providers/spicyapi';

interface VideoGenerationParams {
  prompt: string;
  sourceImageUrl?: string;
  durationSeconds?: number;
  width?: number;
  height?: number;
  loras?: SpicyLora[];
  highNoiseLoras?: SpicyLora[];
  lowNoiseLoras?: SpicyLora[];
  referenceImages?: string[];
  modelKey?: VideoModelKey; // SpicyAPI only: overrides the site's video model
  resolution?: string; // SpicyAPI only
  seed?: number; // SpicyAPI only
}

interface VideoJobResult {
  jobId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  videoUrl?: string;
  error?: string;
}

export async function queueVideoGeneration(params: VideoGenerationParams): Promise<VideoJobResult> {
  if (!params.sourceImageUrl) {
    throw new Error('A still is required. Video animates that image.');
  }

  if (isSpicyConfigured()) {
    const modelKey = params.modelKey ?? activeVideoModel();
    // The site-wide setting may name a resolution this particular model doesn't have.
    const envResolution = process.env.SPICY_VIDEO_RESOLUTION;
    const allowed: string[] = VIDEO_MODELS[modelKey].resolutions;
    const useReferences = supportsVideoReferences(modelKey) && Boolean(params.referenceImages?.length);
    const request = buildVideoRequest({
      modelKey,
      prompt: params.prompt,
      imageUrl: useReferences ? undefined : await prepareImageInput(params.sourceImageUrl),
      referenceImages: useReferences ? params.referenceImages : undefined,
      durationSeconds: params.durationSeconds,
      resolution: params.resolution ?? (envResolution && allowed.includes(envResolution) ? envResolution : undefined),
      seed: params.seed,
      loras: params.loras,
      highNoiseLoras: params.highNoiseLoras,
      lowNoiseLoras: params.lowNoiseLoras,
    });
    const task = await createTask(request, {
      idempotencyKey: crypto.randomUUID(),
      callBackUrl: webhookUrl(),
    });
    return { jobId: task.taskId, status: 'queued' };
  }

  const url = process.env.RUNPOD_VIDEO_API_URL;
  if (!url) throw new Error('RUNPOD_VIDEO_API_URL not configured');

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.RUNPOD_API_KEY}`,
    },
    body: JSON.stringify({
      input: {
        prompt: params.prompt,
        source_image: params.sourceImageUrl,
        num_frames: (params.durationSeconds || 5) * 8,
        width: params.width || 512,
        height: params.height || 512,
      },
    }),
  });

  if (!response.ok) throw new Error(`Video generation failed: ${response.status}`);
  const data = await response.json();
  return { jobId: data.id, status: 'queued' };
}

export async function checkVideoJobStatus(jobId: string): Promise<VideoJobResult> {
  const url = process.env.RUNPOD_VIDEO_API_URL;
  if (!url) throw new Error('RUNPOD_VIDEO_API_URL not configured');

  const statusUrl = url.replace('/run', `/status/${jobId}`);
  const response = await fetch(statusUrl, {
    headers: { 'Authorization': `Bearer ${process.env.RUNPOD_API_KEY}` },
  });

  if (!response.ok) throw new Error(`Status check failed: ${response.status}`);
  const data = await response.json();

  if (data.status === 'COMPLETED') {
    return { jobId, status: 'completed', videoUrl: data.output?.video_url || data.output };
  } else if (data.status === 'FAILED') {
    return { jobId, status: 'failed', error: data.error || 'Unknown error' };
  }
  return { jobId, status: data.status === 'IN_QUEUE' ? 'queued' : 'processing' };
}

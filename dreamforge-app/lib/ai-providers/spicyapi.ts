// SpicyAPI client: https://docs.spicyapi.ai/docs
//
// Tasks are asynchronous. createTask returns a task ID, and the result arrives through
// recordInfo or a webhook. Result links expire after about 20 minutes, so anything worth
// keeping must be copied to our own storage (see lib/generation-tasks.ts).
//
// This module also gets bundled for the browser through lib/nano-banana.ts. It must stay
// free of Node-only imports, and SPICY_API_KEY must never get a NEXT_PUBLIC_ prefix.

const API_BASE = 'https://api.spicyapi.ai/api/v1';
const CHAT_COMPLETIONS_URL = 'https://api.spicyapi.ai/v1/chat/completions';
const REQUEST_TIMEOUT_MS = 30_000;
const MAX_LORAS_PER_SLOT = 3;
const MAX_SEED = 2_147_483_647;
const MAX_UPLOAD_IMAGE_BYTES = 10 * 1024 * 1024;
const UPLOADABLE_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const RETRYABLE_CODES = new Set([429, 500, 503, 50301]);

export interface SpicyLora {
  path: string;
  scale: number;
}

const H3_RATIOS = ['1:1', '16:9', '9:16', '4:3', '3:4', '3:2', '2:3', '21:9', '9:21', '2:1', '1:2', '3:1', '1:3', '5:4', '4:5'];
const STANDARD_RATIOS = ['1:1', '16:9', '9:16', '4:3', '3:4', '3:2', '2:3', '21:9', '9:21'];

interface ImageModelSpec {
  baseModel: string;
  textToImage: string;
  edit: string;
  ratios: string[];
  hasResolution: boolean;
  editImageField: 'image_url' | 'image_urls';
  editMaxScale: number;
  editHasStrength: boolean;
  editHasAspectRatio: boolean;
  // SpicyAPI's guidance is that two or three distinct references beat nine overlapping
  // ones, so MiniMax is held to 3 even though it accepts 9.
  maxReferences: number;
  pictureLabel: (index: number) => string;
  // Endpoints without these fields reject requests that include them.
  hasLoras: boolean;
  hasSeed: boolean;
  extraInput?: Record<string, unknown>;
  // Takes a location image alongside the references. Only tested on Seedream.
  hasBackgroundImage?: boolean;
}

export const IMAGE_MODELS = {
  'minimax-h3-image': {
    baseModel: 'minimax-h3-image',
    textToImage: 'minimax/h3-image-lora/text-to-image',
    edit: 'minimax/h3-image-lora/edit',
    ratios: H3_RATIOS,
    hasResolution: true,
    editImageField: 'image_urls',
    editMaxScale: 4,
    editHasStrength: false,
    editHasAspectRatio: true,
    maxReferences: 3,
    pictureLabel: (index: number) => `<Picture ${index}>`,
    hasLoras: true,
    hasSeed: true,
  },
  'qwen-image-2512': {
    baseModel: 'qwen-image-2512',
    textToImage: 'alibaba/qwen-image-2512-lora/text-to-image',
    edit: 'alibaba/qwen-image-2512-lora/edit',
    ratios: STANDARD_RATIOS,
    hasResolution: false,
    editImageField: 'image_urls',
    editMaxScale: 2,
    editHasStrength: false,
    editHasAspectRatio: true,
    maxReferences: 3,
    pictureLabel: (index: number) => `Picture ${index}`,
    hasLoras: true,
    hasSeed: true,
  },
  'z-image-turbo': {
    baseModel: 'z-image-turbo',
    textToImage: 'alibaba/z-image-turbo-lora/text-to-image',
    edit: 'alibaba/z-image-turbo-lora/edit',
    ratios: STANDARD_RATIOS,
    hasResolution: false,
    editImageField: 'image_url',
    editMaxScale: 4,
    editHasStrength: true,
    editHasAspectRatio: false,
    maxReferences: 1,
    pictureLabel: () => 'The source image',
    hasLoras: true,
    hasSeed: true,
  },
  'seedream-5-pro': {
    baseModel: 'seedream-5.0-pro',
    textToImage: 'bytedance/seedream-5.0-pro/text-to-image',
    edit: 'bytedance/seedream-5.0-pro/edit',
    ratios: H3_RATIOS,
    hasResolution: true,
    editImageField: 'image_urls',
    editMaxScale: 0,
    editHasStrength: false,
    editHasAspectRatio: true,
    maxReferences: 3,
    pictureLabel: (index: number) => `Image ${index}`,
    hasLoras: false,
    hasSeed: false,
    // The thinking pass rewrites the prompt and makes tasks much slower.
    extraInput: { enable_thinking: false },
    hasBackgroundImage: true,
  },
} satisfies Record<string, ImageModelSpec>;

const MAX_VIDEO_REFERENCES = 3;
const REFERENCE_VIDEO_ASPECT_RATIO = '3:4';

interface VideoModelSpec {
  baseModel: string;
  imageToVideo: string;
  referenceToVideo?: string;
  defaultResolution: string;
  resolutions: string[];
  isDurationAllowed: (seconds: number) => boolean;
  durationHint: string;
  hasNoiseSlots: boolean;
}

const H3_VIDEO_RESOLUTIONS = ['480p', '540p', '768p', '1080p'];
const isH3Duration = (seconds: number) => Number.isInteger(seconds) && seconds >= 3 && seconds <= 15;

export const VIDEO_MODELS = {
  'minimax-h3': {
    baseModel: 'minimax-h3',
    imageToVideo: 'minimax/h3-lora/image-to-video',
    referenceToVideo: 'minimax/h3-lora/reference-to-video',
    defaultResolution: '768p',
    resolutions: H3_VIDEO_RESOLUTIONS,
    isDurationAllowed: isH3Duration,
    durationHint: '3 to 15 seconds',
    hasNoiseSlots: false,
  },
  'minimax-h3-singularity': {
    baseModel: 'minimax-h3',
    imageToVideo: 'minimax/h3-singularity-lora/image-to-video',
    referenceToVideo: 'minimax/h3-singularity-lora/reference-to-video',
    defaultResolution: '768p',
    resolutions: H3_VIDEO_RESOLUTIONS,
    isDurationAllowed: isH3Duration,
    durationHint: '3 to 15 seconds',
    hasNoiseSlots: false,
  },
  'wan-2.2': {
    baseModel: 'wan-2.2',
    imageToVideo: 'alibaba/wan-2.2-lora/image-to-video',
    defaultResolution: '720p',
    resolutions: ['480p', '720p'],
    isDurationAllowed: (seconds: number) => seconds === 5 || seconds === 8,
    durationHint: '5 or 8 seconds',
    hasNoiseSlots: true,
  },
} satisfies Record<string, VideoModelSpec>;

export type ImageModelKey = keyof typeof IMAGE_MODELS;
export type VideoModelKey = keyof typeof VIDEO_MODELS;

export class SpicyApiError extends Error {
  code: number;
  requestId?: string;

  constructor(message: string, code: number, requestId?: string) {
    super(message);
    this.name = 'SpicyApiError';
    this.code = code;
    this.requestId = requestId;
  }
}

export function isSpicyConfigured(): boolean {
  return Boolean(process.env.SPICY_API_KEY);
}

function imageModelFromEnv(variable: string, fallback: ImageModelKey): ImageModelKey {
  const key = process.env[variable] || fallback;
  if (!(key in IMAGE_MODELS)) {
    throw new Error(`Unknown ${variable} "${key}". Use one of: ${Object.keys(IMAGE_MODELS).join(', ')}`);
  }
  return key as ImageModelKey;
}

export function activeImageModel(): ImageModelKey {
  return imageModelFromEnv('SPICY_IMAGE_MODEL', 'qwen-image-2512');
}

export function activeReferenceImageModel(): ImageModelKey {
  return imageModelFromEnv('SPICY_REFERENCE_IMAGE_MODEL', 'seedream-5-pro');
}

// Reference images go to the model that holds a person's likeness best. A LoRA only runs on
// the base model it was trained for, so a request carrying LoRAs stays on the main model.
export function imageModelFor(request: { hasReferences: boolean; hasLoras: boolean }): ImageModelKey {
  return request.hasReferences && !request.hasLoras ? activeReferenceImageModel() : activeImageModel();
}

export function activeVideoModel(): VideoModelKey {
  const key = process.env.SPICY_VIDEO_MODEL || 'minimax-h3';
  if (!(key in VIDEO_MODELS)) {
    throw new Error(`Unknown SPICY_VIDEO_MODEL "${key}". Use one of: ${Object.keys(VIDEO_MODELS).join(', ')}`);
  }
  return key as VideoModelKey;
}

export function closestAspectRatio(width: number, height: number, ratios: string[]): string {
  const target = Math.log(width / height);
  let best = ratios[0];
  let bestDistance = Infinity;
  for (const ratio of ratios) {
    const [w, h] = ratio.split(':').map(Number);
    const distance = Math.abs(Math.log(w / h) - target);
    if (distance < bestDistance) {
      best = ratio;
      bestDistance = distance;
    }
  }
  return best;
}

function normalizeLoras(loras: SpicyLora[] | undefined, maxScale = 4): SpicyLora[] {
  return (loras || []).slice(0, MAX_LORAS_PER_SLOT).map(({ path, scale }) => ({
    path,
    scale: Math.min(Math.max(scale, 0), maxScale),
  }));
}

function validSeed(seed?: number): number | undefined {
  return seed !== undefined && Number.isInteger(seed) && seed >= 0 && seed <= MAX_SEED ? seed : undefined;
}

export interface ImageRequestOptions {
  modelKey: ImageModelKey;
  prompt: string;
  width?: number;
  height?: number;
  seed?: number;
  loras?: SpicyLora[];
  sourceImage?: string;
  referenceImages?: string[];
  backgroundImage?: string;
  strength?: number;
  resolution?: string;
}

function samePersonIntro(labels: string[]): string {
  if (labels.length === 1) return `${labels[0]} shows the person to use.`;
  const last = labels[labels.length - 1];
  return `${labels.slice(0, -1).join(', ')} and ${last} all show the same person.`;
}

// References only hold identity if the prompt says what each picture is for.
export function withImageReferences(
  modelKey: ImageModelKey,
  referenceCount: number,
  prompt: string,
  { hasBackground = false }: { hasBackground?: boolean } = {}
): string {
  const spec: ImageModelSpec = IMAGE_MODELS[modelKey];
  const count = Math.min(referenceCount, spec.maxReferences);
  const labels = Array.from({ length: count }, (_, index) => spec.pictureLabel(index + 1));
  const location = hasBackground
    ? ` ${spec.pictureLabel(count + 1)} shows the location. Place the person in this exact location, keeping its background, light and perspective unchanged, and leave out any people shown in it.`
    : '';
  return `${samePersonIntro(labels)} Keep this person's exact face, hair and body.${location} New image: ${prompt}`;
}

export interface TaskRequest {
  model: string;
  input: Record<string, unknown>;
}

// Steps, guidance, sampler and negative prompt aren't sent, because these endpoints
// don't have those fields.
export function buildImageRequest(options: ImageRequestOptions): TaskRequest {
  const spec: ImageModelSpec = IMAGE_MODELS[options.modelKey];
  const seed = validSeed(options.seed);
  const input: Record<string, unknown> = { prompt: options.prompt, ...spec.extraInput };

  if (spec.hasSeed && seed !== undefined) input.seed = seed;

  const sources = (options.referenceImages?.length
    ? options.referenceImages
    : options.sourceImage ? [options.sourceImage] : []
  ).slice(0, spec.maxReferences);

  if (options.backgroundImage) {
    if (!spec.hasBackgroundImage) throw new Error(`${options.modelKey} can't use a background image.`);
    if (sources.length === 0) throw new Error('A background image needs a reference image of the person.');
    // Goes last, because withImageReferences labels it after the references.
    sources.push(options.backgroundImage);
  }

  if (sources.length > 0) {
    input[spec.editImageField] = spec.editImageField === 'image_urls' ? sources : sources[0];
    if (spec.hasLoras) input.loras = normalizeLoras(options.loras, spec.editMaxScale);
    if (spec.editHasStrength && options.strength !== undefined) input.strength = options.strength;
    if (spec.editHasAspectRatio && options.width && options.height) {
      input.aspect_ratio = closestAspectRatio(options.width, options.height, spec.ratios);
    }
    if (spec.hasResolution && options.resolution) input.resolution = options.resolution;
    return { model: spec.edit, input };
  }

  if (spec.hasLoras) input.loras = normalizeLoras(options.loras);
  if (options.width && options.height) {
    input.aspect_ratio = closestAspectRatio(options.width, options.height, spec.ratios);
  }
  if (spec.hasResolution && options.resolution) input.resolution = options.resolution;
  return { model: spec.textToImage, input };
}

export interface VideoRequestOptions {
  modelKey: VideoModelKey;
  prompt: string;
  imageUrl?: string;
  referenceImages?: string[];
  durationSeconds?: number;
  resolution?: string;
  seed?: number;
  loras?: SpicyLora[];
  highNoiseLoras?: SpicyLora[];
  lowNoiseLoras?: SpicyLora[];
}

export function supportsVideoReferences(modelKey: VideoModelKey): boolean {
  const spec: VideoModelSpec = VIDEO_MODELS[modelKey];
  return Boolean(spec.referenceToVideo);
}

export function buildVideoRequest(options: VideoRequestOptions): TaskRequest {
  const spec: VideoModelSpec = VIDEO_MODELS[options.modelKey];
  const duration = options.durationSeconds ?? 5;
  if (!spec.isDurationAllowed(duration)) {
    throw new Error(`${options.modelKey} clips must be ${spec.durationHint}.`);
  }

  const resolution = options.resolution || spec.defaultResolution;
  if (!spec.resolutions.includes(resolution)) {
    throw new Error(`${options.modelKey} supports these resolutions: ${spec.resolutions.join(', ')}.`);
  }

  const seed = validSeed(options.seed);
  const references = (options.referenceImages || []).slice(0, MAX_VIDEO_REFERENCES);

  if (spec.referenceToVideo && references.length > 0) {
    const labels = references.map((_, index) => `<Picture ${index + 1}>`);
    return {
      model: spec.referenceToVideo,
      input: {
        prompt: `${samePersonIntro(labels)} Keep this person's exact face, hair and body. ${options.prompt}`,
        reference_image_urls: references,
        aspect_ratio: REFERENCE_VIDEO_ASPECT_RATIO,
        resolution,
        duration_seconds: duration,
        loras: normalizeLoras(options.loras),
        ...(seed !== undefined ? { seed } : {}),
      },
    };
  }

  if (!options.imageUrl) {
    throw new Error(`${options.modelKey} needs a starting image.`);
  }

  const input: Record<string, unknown> = {
    prompt: options.prompt,
    image_url: options.imageUrl,
    resolution,
    duration_seconds: duration,
    loras: normalizeLoras(options.loras),
  };

  if (seed !== undefined) input.seed = seed;

  if (spec.hasNoiseSlots) {
    input.high_noise_loras = normalizeLoras(options.highNoiseLoras);
    input.low_noise_loras = normalizeLoras(options.lowNoiseLoras);
  }

  return { model: spec.imageToVideo, input };
}

interface Envelope<T> {
  code: number;
  msg?: string;
  data?: T;
  request_id?: string;
}

async function spicyFetch<T>(
  path: string,
  init: { method?: string; body?: unknown; headers?: Record<string, string> } = {}
): Promise<T> {
  const apiKey = process.env.SPICY_API_KEY;
  if (!apiKey) throw new SpicyApiError('SPICY_API_KEY is not configured', 0);

  const response = await fetch(`${API_BASE}${path}`, {
    method: init.method || 'GET',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      ...(init.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...init.headers,
    },
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  let envelope: Envelope<T>;
  try {
    envelope = (await response.json()) as Envelope<T>;
  } catch {
    throw new SpicyApiError(`SpicyAPI returned HTTP ${response.status} without JSON`, response.status);
  }

  if (envelope.code !== 200 || envelope.data === undefined) {
    throw new SpicyApiError(
      envelope.msg || `SpicyAPI request failed (${envelope.code})`,
      envelope.code ?? response.status,
      envelope.request_id
    );
  }
  return envelope.data;
}

function isRetryable(error: unknown): boolean {
  // Anything that isn't a SpicyApiError is a network failure or timeout.
  return error instanceof SpicyApiError ? RETRYABLE_CODES.has(error.code) : true;
}

export interface CreatedTask {
  taskId: string;
  state: string;
  estimatedCost?: string;
}

// Retries reuse the idempotency key, so a retry can't create a second paid task.
export async function createTask(
  request: TaskRequest,
  options: { idempotencyKey: string; callBackUrl?: string; maxAttempts?: number; retryDelayMs?: number }
): Promise<CreatedTask> {
  const maxAttempts = options.maxAttempts ?? 3;
  const retryDelayMs = options.retryDelayMs ?? 1000;

  for (let attempt = 1; ; attempt++) {
    try {
      return await spicyFetch<CreatedTask>('/jobs/createTask', {
        method: 'POST',
        headers: { 'Idempotency-Key': options.idempotencyKey },
        body: { ...request, ...(options.callBackUrl ? { callBackUrl: options.callBackUrl } : {}) },
      });
    } catch (error) {
      if (attempt >= maxAttempts || !isRetryable(error)) throw error;
      await new Promise((resolve) => setTimeout(resolve, retryDelayMs * attempt));
    }
  }
}

export interface SpicyAsset {
  url: string;
  mime?: string;
  expiresAt?: string;
}

export interface SpicyTaskSnapshot {
  taskId: string;
  state: 'queued' | 'running' | 'succeeded' | 'failed' | 'expired' | 'canceled';
  asset?: SpicyAsset;
  cost?: string;
  errorCode?: string;
  errorMessage?: string;
}

interface RecordInfo {
  taskId: string;
  state: SpicyTaskSnapshot['state'];
  output?: { assets?: SpicyAsset[] };
  cost?: string;
  errorCode?: string;
  errorMessage?: string;
}

export async function getTask(taskId: string): Promise<SpicyTaskSnapshot> {
  const data = await spicyFetch<RecordInfo>(`/jobs/recordInfo?taskId=${encodeURIComponent(taskId)}`);
  return {
    taskId: data.taskId,
    state: data.state,
    asset: data.output?.assets?.[0],
    cost: data.cost,
    errorCode: data.errorCode,
    errorMessage: data.errorMessage,
  };
}

export function isTerminal(state: SpicyTaskSnapshot['state']): boolean {
  return state === 'succeeded' || state === 'failed' || state === 'expired' || state === 'canceled';
}

// Free and reserves nothing. Used by the smoke test to confirm the key and a request body.
export async function quoteTask(request: TaskRequest): Promise<{ estimatedCost?: string }> {
  return spicyFetch('/jobs/quote', { method: 'POST', body: request });
}

// The model needs a URL it can fetch. Data URLs go through SpicyAPI's upload flow, because
// inline base64 is capped at 1 MiB per image and 2 MiB per request.
export async function prepareImageInput(image: string): Promise<string> {
  const match = image.match(/^data:([^;,]+);base64,([\s\S]+)$/);
  if (!match) {
    if (/^(https:\/\/|spicy:\/\/)/.test(image)) return image;
    throw new Error('Input image must be an HTTPS URL or a base64 data URL.');
  }

  const contentType = match[1];
  if (!UPLOADABLE_IMAGE_TYPES.has(contentType)) {
    throw new Error(`Unsupported image type: ${contentType}`);
  }
  const bytes = Uint8Array.from(atob(match[2]), (char) => char.charCodeAt(0));
  if (bytes.length > MAX_UPLOAD_IMAGE_BYTES) {
    throw new Error('Input image is larger than the 10 MiB upload limit.');
  }

  const ticket = await spicyFetch<{
    fileId: string;
    uploadUrl: string;
    method?: string;
    headers?: Record<string, string>;
  }>('/common/upload-url', { method: 'POST', body: { contentType, bytes: bytes.length } });

  // This is pre-signed storage: the docs say not to send Authorization here.
  const upload = await fetch(ticket.uploadUrl, {
    method: ticket.method || 'PUT',
    headers: ticket.headers,
    body: bytes,
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!upload.ok) throw new SpicyApiError(`Image upload failed with HTTP ${upload.status}`, upload.status);

  const committed = await spicyFetch<{ uri: string }>(`/files/${encodeURIComponent(ticket.fileId)}/commit`, {
    method: 'POST',
    body: {},
  });
  return committed.uri;
}

export type ChatContent = string | Array<
  { type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } }
>;

// The provider refused to process the content, as opposed to failing to answer.
export class SpicyContentRejectedError extends SpicyApiError {}

// Text models answer in the same request, so there's no task to poll.
export async function createChatCompletion(
  model: string,
  content: ChatContent,
  options: { maxTokens: number; timeoutMs: number }
): Promise<string> {
  const apiKey = process.env.SPICY_API_KEY;
  if (!apiKey) throw new SpicyApiError('SPICY_API_KEY is not configured', 0);

  const response = await fetch(CHAT_COMPLETIONS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': crypto.randomUUID(),
    },
    body: JSON.stringify({ model, messages: [{ role: 'user', content }], max_tokens: options.maxTokens }),
    signal: AbortSignal.timeout(options.timeoutMs),
  });

  const body = (await response.json().catch(() => ({}))) as {
    choices?: { message?: { content?: unknown } }[];
    error?: { code?: string; message?: string };
  };
  const text = body.choices?.[0]?.message?.content;
  if (response.ok && typeof text === 'string') return text;

  const message = body.error?.message || `${model} returned HTTP ${response.status}`;
  if (body.error?.code === 'content_rejected') throw new SpicyContentRejectedError(message, response.status);
  throw new SpicyApiError(message, response.status);
}

// Only set when a signing secret exists, because unsigned callbacks would be rejected anyway.
export function webhookUrl(): string | undefined {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!process.env.SPICY_WEBHOOK_SECRET || !appUrl?.startsWith('https://')) return undefined;
  return `${appUrl.replace(/\/$/, '')}/api/webhooks/spicyapi`;
}

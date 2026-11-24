import { randomInt } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { requireBetterAuthAdmin, isAdminUser } from '@/lib/admin-auth-helpers';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { moderateImage, moderateText } from '@/lib/moderation';
import { IMAGE_MODELS, VIDEO_MODELS, isSpicyConfigured, type ImageModelKey, type SpicyLora, type VideoModelKey } from '@/lib/ai-providers/spicyapi';
import { generateWithNanoBanana } from '@/lib/nano-banana';
import { queueVideoGeneration } from '@/lib/video-generation';
import { getTrackedTask, syncTask, trackTask } from '@/lib/generation-tasks';
import { isAtLeast21 } from '@/lib/character-age';
import { loraFamily, testSlot } from '@/lib/lora-library';

export const maxDuration = 60;

const MAX_PROMPT_LENGTH = 1000;
const MAX_FILES_PER_TEST = 3;
const CLIP_SECONDS = 5;
const TEST_RESOLUTION = '480p';
const MAX_SEED = 2_147_483_647;

interface TestLora {
  name: string;
  base_model: string;
  weights_path: string | null;
  trigger_word: string | null;
  default_strength: number | string;
}

function badRequest(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}

function asLora(row: TestLora): SpicyLora {
  return { path: row.weights_path as string, scale: Number(row.default_strength) };
}

async function startStill(modelKey: ImageModelKey, prompt: string, seed: number, loras: SpicyLora[]) {
  const result = await generateWithNanoBanana(prompt, 'spicyapi', {
    enhance: false,
    imageModel: modelKey,
    seed,
    loras,
    width: 768,
    height: 1024,
    webhook: true,
  });
  if (!result.success || !result.jobId) throw new Error(result.error || 'The test image could not start.');
  await trackTask({ taskId: result.jobId, kind: 'image', characterId: null, userId: null, chargedMoments: 0, prompt });
  return result.jobId;
}

async function startClip(modelKey: VideoModelKey, prompt: string, seed: number, source: string, rows: TestLora[]) {
  const inSlot = (slot: string) => rows.filter((row) => testSlot(row) === slot).map(asLora);
  const result = await queueVideoGeneration({
    modelKey,
    prompt,
    seed,
    sourceImageUrl: source,
    durationSeconds: CLIP_SECONDS,
    resolution: TEST_RESOLUTION,
    loras: inSlot('video'),
    highNoiseLoras: inSlot('video_high_noise'),
    lowNoiseLoras: inSlot('video_low_noise'),
  });
  // No character here, so test clips stay out of that character's shoot results.
  await trackTask({ taskId: result.jobId, kind: 'video', characterId: null, userId: null, chargedMoments: 0, prompt });
  return result.jobId;
}

// POST: starts the same generation twice, with and without the LoRA, at one seed. Comparing
// them is the only way to see a LoRA doing nothing: SpicyAPI reports some pairs that load
// fine and change nothing.
export async function POST(request: NextRequest) {
  const auth = await requireBetterAuthAdmin(request);
  if (!isAdminUser(auth)) return auth;
  if (!isSpicyConfigured()) return badRequest('SPICY_API_KEY is not configured.', 503);

  try {
    const { loraIds, prompt, characterId } = await request.json();
    if (!Array.isArray(loraIds) || loraIds.length === 0 || loraIds.length > MAX_FILES_PER_TEST) {
      return badRequest('Choose the LoRA to test.');
    }
    if (typeof prompt !== 'string' || !prompt.trim() || prompt.length > MAX_PROMPT_LENGTH) {
      return badRequest(`Describe the test in up to ${MAX_PROMPT_LENGTH} characters.`);
    }

    const supabase = getSupabaseAdmin();
    const { data } = await supabase
      .from('lora_models')
      .select('name, base_model, weights_path, trigger_word, default_strength')
      .in('id', loraIds);
    const rows = (data || []) as TestLora[];
    if (rows.length !== loraIds.length || rows.some((row) => !row.weights_path)) {
      return badRequest('That LoRA could not be found.', 404);
    }
    const base = rows[0].base_model;
    const family = loraFamily(base);
    if (!family || rows.some((row) => row.base_model !== base)) {
      return badRequest('These files are for different model families.');
    }

    const check = await moderateText(prompt, { trustAdultContent: true });
    if (!check.approved) {
      return badRequest('This prompt did not pass the content check.', 400);
    }

    const triggers = [...new Set(rows.flatMap((row) => (row.trigger_word ? [row.trigger_word] : [])))];
    const withTrigger = (text: string) => (triggers.length ? `${triggers.join(', ')}, ${text}` : text);
    const seed = randomInt(MAX_SEED);

    if (family.media === 'image') {
      const adultPrompt = `Fictional adult, clearly aged 21 or older. ${prompt.trim()}`;
      const modelKey = base as ImageModelKey;
      if (!(modelKey in IMAGE_MODELS)) return badRequest('This model family cannot be tested yet.');
      const [withLora, without] = await Promise.all([
        startStill(modelKey, withTrigger(adultPrompt), seed, rows.map(asLora)),
        startStill(modelKey, adultPrompt, seed, []),
      ]);
      return NextResponse.json({ withLora, without, kind: 'image' });
    }

    // A clip animates a still, so it starts from an adult character's own portrait.
    if (typeof characterId !== 'string') return badRequest('Choose a character to animate.');
    const { data: character } = await supabase.from('characters').select('*').eq('id', characterId).maybeSingle();
    if (!character || !isAtLeast21(character)) return badRequest('Choose a character aged 21 or older.');
    if (character.identity_status === 'revoked') return badRequest('This character is no longer available.', 403);
    const avatar = typeof character.avatar_url === 'string' ? character.avatar_url : '';
    const source = avatar.startsWith('/') ? new URL(avatar, request.nextUrl.origin).toString() : avatar;
    if (!source.startsWith('https://')) return badRequest('This character needs a portrait at a public https:// address.');

    const imageCheck = await moderateImage(source, { trustAdultContent: true });
    if (!imageCheck.approved) return badRequest('This portrait did not pass the content check.');

    const modelKey = base as VideoModelKey;
    if (!(modelKey in VIDEO_MODELS)) return badRequest('This model family cannot be tested yet.');
    const [withLora, without] = await Promise.all([
      startClip(modelKey, withTrigger(prompt.trim()), seed, source, rows),
      startClip(modelKey, prompt.trim(), seed, source, []),
    ]);
    return NextResponse.json({ withLora, without, kind: 'video' });
  } catch (error) {
    console.error('LoRA test error:', error);
    return badRequest(error instanceof Error ? error.message : 'The test could not start.', 502);
  }
}

// GET ?tasks=a,b: progress of test runs. Member generations stay private to that member.
export async function GET(request: NextRequest) {
  const auth = await requireBetterAuthAdmin(request);
  if (!isAdminUser(auth)) return auth;

  const taskIds = (request.nextUrl.searchParams.get('tasks') || '').split(',').filter(Boolean).slice(0, 2);
  try {
    const tasks = await Promise.all(
      taskIds.map(async (taskId) => {
        const tracked = await getTrackedTask(taskId);
        if (!tracked || tracked.user_id !== null) return null;
        const task = await syncTask(taskId);
        return task && { task_id: task.task_id, state: task.state, url: task.media_url, error: task.error };
      })
    );
    return NextResponse.json({ tasks: tasks.filter(Boolean) });
  } catch (error) {
    console.error('LoRA test status error:', error);
    return badRequest('Could not check the test.', 500);
  }
}

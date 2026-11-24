import { NextRequest, NextResponse } from 'next/server';
import { requireBetterAuthAdmin, isAdminUser } from '@/lib/admin-auth-helpers';
import { activeReferenceImageModel, isSpicyConfigured } from '@/lib/ai-providers/spicyapi';
import { ageNumber } from '@/lib/character-age';
import { getCharacterVideoSetup } from '@/lib/character-loras';
import { buildShootPhotoPrompt } from '@/lib/character-prompts';
import { getCharacterReferences } from '@/lib/character-references';
import { getTrackedTask, syncTask, trackTask } from '@/lib/generation-tasks';
import { moderateText } from '@/lib/moderation';
import { generateWithNanoBanana } from '@/lib/nano-banana';
import { backgroundForShot, listBackgrounds } from '@/lib/shoot-backgrounds';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { queueVideoGeneration } from '@/lib/video-generation';

export const maxDuration = 60;

const MAX_DIRECTION_LENGTH = 2000;
const MAX_SHOTS = 4;
const MAX_TASKS_PER_CHECK = 12;
const RECENT_RESULTS = 40;
const CLIP_SECONDS = 5;
const SHOT_SIZES = {
  portrait: { width: 1024, height: 1536 },
  landscape: { width: 1536, height: 1024 },
};

function badRequest(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}

// Returns the character's age, or a reason it can't be shot.
async function checkCharacter(id: string): Promise<{ age: number } | { problem: string }> {
  const { data: character } = await getSupabaseAdmin()
    .from('characters')
    .select('age, identity_status')
    .eq('id', id)
    .maybeSingle();
  if (!character) return { problem: 'Character not found.' };

  const age = ageNumber(character.age);
  if (age === null || age < 21) return { problem: 'Characters must have an age of 21 or older.' };
  if (character.identity_status === 'revoked') return { problem: 'This character is no longer available.' };
  return { age };
}

// GET: the saved backgrounds and recent results, or the status of tasks with ?tasks=a,b.
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireBetterAuthAdmin(request);
  if (!isAdminUser(auth)) return auth;

  const { id } = await params;
  try {
    const taskIds = request.nextUrl.searchParams.get('tasks')?.split(',').filter(Boolean);
    if (taskIds) {
      const tasks = await Promise.all(
        taskIds.slice(0, MAX_TASKS_PER_CHECK).map(async (taskId) => {
          const tracked = await getTrackedTask(taskId);
          if (tracked?.character_id !== id || tracked.user_id !== null) return null;
          const task = await syncTask(taskId);
          return task && { task_id: task.task_id, kind: task.kind, state: task.state, url: task.media_url, error: task.error };
        })
      );
      return NextResponse.json({ tasks: tasks.filter(Boolean) });
    }

    // Member generations have a user_id and stay private to that member.
    const { data, error } = await getSupabaseAdmin()
      .from('generation_tasks')
      .select('task_id, kind, media_url')
      .eq('character_id', id)
      .is('user_id', null)
      .eq('state', 'succeeded')
      .order('created_at', { ascending: false })
      .limit(RECENT_RESULTS);
    if (error) throw new Error(error.message);

    return NextResponse.json({ backgrounds: await listBackgrounds(id), results: data || [] });
  } catch (error) {
    console.error('Shoot read error:', error);
    return badRequest('Could not load this shoot.', 500);
  }
}

async function shootPhotos(id: string, age: number, direction: string, body: { orientation?: unknown; count?: unknown }) {
  const size = body.orientation === 'landscape' ? SHOT_SIZES.landscape : SHOT_SIZES.portrait;
  const count = Number(body.count) || 1;
  if (!Number.isInteger(count) || count < 1 || count > MAX_SHOTS) return badRequest(`Choose 1 to ${MAX_SHOTS} photos.`);

  const [references, backgrounds] = await Promise.all([getCharacterReferences(id), listBackgrounds(id)]);
  if (references.length === 0) return badRequest('This character has no screened reference images.');

  const inUse = backgrounds.filter((background) => background.in_use);
  if (inUse.length === 0) return badRequest('Upload a background and mark it as in use first.');

  const prompt = buildShootPhotoPrompt(direction, { age });
  const started = await Promise.allSettled(
    Array.from({ length: count }, async (_, shot) => {
      const result = await generateWithNanoBanana(prompt, 'spicyapi', {
        enhance: false,
        nsfw: true,
        imageModel: activeReferenceImageModel(),
        referenceImages: references,
        backgroundImage: backgroundForShot(inUse, shot).url,
        webhook: true,
        ...size,
      });
      if (!result.success || !result.jobId) throw new Error(result.error || 'Generation failed');
      await trackTask({ taskId: result.jobId, kind: 'image', characterId: id, userId: null, chargedMoments: 0, prompt: direction });
      return result.jobId;
    })
  );

  const taskIds = started.flatMap((result) => (result.status === 'fulfilled' ? [result.value] : []));
  const failures = started.flatMap((result) => {
    if (result.status !== 'rejected') return [];
    const reason = result.reason instanceof Error ? result.reason.message : String(result.reason);
    console.error('Shoot photo failed to start:', result.reason);
    return [reason];
  });
  if (taskIds.length === 0) {
    const detail = failures[0] || 'Generation failed';
    const balance = /insufficient balance/i.test(detail);
    return badRequest(
      balance
        ? 'SpicyAPI balance is empty. Top up credits at spicyapi.ai, then try again.'
        : `The photos could not start: ${detail}`,
      balance ? 402 : 502
    );
  }
  return NextResponse.json({ taskIds, failedToStart: count - taskIds.length });
}

// A clip animates a finished photo rather than using references, which keeps the location.
async function shootVideo(id: string, direction: string, sourceTaskId: unknown) {
  if (typeof sourceTaskId !== 'string') return badRequest('Choose a photo to animate.');

  const source = await getTrackedTask(sourceTaskId);
  if (source?.character_id !== id || source.kind !== 'image' || !source.media_url) {
    return badRequest('Clips can only be made from a finished photo of this character.');
  }

  const { modelKey, loras } = await getCharacterVideoSetup(id);
  const trigger = loras.triggerWords.length ? `${loras.triggerWords.join(', ')}, ` : '';
  const result = await queueVideoGeneration({
    modelKey,
    prompt: `${trigger}${direction} The location stays exactly as it is in the photo.`,
    sourceImageUrl: source.media_url,
    durationSeconds: CLIP_SECONDS,
    loras: loras.video,
    highNoiseLoras: loras.videoHighNoise,
    lowNoiseLoras: loras.videoLowNoise,
  });
  await trackTask({ taskId: result.jobId, kind: 'video', characterId: id, userId: null, chargedMoments: 0, prompt: direction });
  return NextResponse.json({ taskIds: [result.jobId], failedToStart: 0 });
}

// POST: start photos in the current backgrounds, or a clip from a finished photo.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireBetterAuthAdmin(request);
  if (!isAdminUser(auth)) return auth;
  if (!isSpicyConfigured()) return badRequest('SPICY_API_KEY is not configured.', 503);

  const { id } = await params;
  try {
    const body = await request.json();
    const direction = typeof body.direction === 'string' ? body.direction.trim() : '';
    if (!direction || direction.length > MAX_DIRECTION_LENGTH) {
      return badRequest(`Describe the shot in up to ${MAX_DIRECTION_LENGTH} characters.`);
    }

    const character = await checkCharacter(id);
    if ('problem' in character) return badRequest(character.problem);

    const check = await moderateText(direction, { trustAdultContent: true });
    if (!check.approved) {
      return NextResponse.json(
        {
          error: 'This direction did not pass the content check.',
          flags: check.flags,
        },
        { status: 400 }
      );
    }

    return body.kind === 'video'
      ? await shootVideo(id, direction, body.sourceTaskId)
      : await shootPhotos(id, character.age, direction, body);
  } catch (error) {
    console.error('Shoot error:', error);
    return badRequest('Could not start this shoot.', 500);
  }
}

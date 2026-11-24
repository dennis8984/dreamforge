import { NextRequest, NextResponse } from 'next/server';
import { requireBetterAuthAdmin, isAdminUser } from '@/lib/admin-auth-helpers';
import { moderateText } from '@/lib/moderation';
import { activeReferenceImageModel, isSpicyConfigured } from '@/lib/ai-providers/spicyapi';
import { generateWithNanoBanana } from '@/lib/nano-banana';
import { buildCharacterPhotoPrompt } from '@/lib/character-prompts';
import { trackTask, waitForTask } from '@/lib/generation-tasks';

export const maxDuration = 180;

const MAX_DESCRIPTION_LENGTH = 1500;
// Together these must stay under maxDuration, because variations start after the base image.
const BASE_WAIT_MS = 85_000;
const VARIATION_WAIT_MS = 90_000;
const VARIATIONS = [
  'three-quarter view, upper body',
  'full body, standing',
  'close-up portrait from the side',
];

async function generateOne(
  prompt: string,
  waitMs: number,
  options: Parameters<typeof generateWithNanoBanana>[2]
): Promise<string | null> {
  const result = await generateWithNanoBanana(prompt, 'spicyapi', {
    enhance: false,
    width: 768,
    height: 1024,
    webhook: true,
    ...options,
  });
  if (!result.success || !result.jobId) throw new Error(result.error || 'Generation failed');

  await trackTask({
    taskId: result.jobId,
    kind: 'image',
    characterId: null,
    userId: null,
    chargedMoments: 0,
    prompt,
  });
  const task = await waitForTask(result.jobId, waitMs);
  return task?.state === 'succeeded' ? task.media_url : null;
}

// POST: builds a starter set for "Start with Description": one base image, then
// variations of that same person.
export async function POST(request: NextRequest) {
  const auth = await requireBetterAuthAdmin(request);
  if (!isAdminUser(auth)) return auth;
  if (!isSpicyConfigured()) {
    return NextResponse.json({ error: 'SPICY_API_KEY is not configured.' }, { status: 503 });
  }

  const { description } = await request.json();
  if (typeof description !== 'string' || !description.trim() || description.length > MAX_DESCRIPTION_LENGTH) {
    return NextResponse.json({ error: `Describe the character in up to ${MAX_DESCRIPTION_LENGTH} characters.` }, { status: 400 });
  }

  const check = await moderateText(description, { trustAdultContent: true });
  if (!check.approved) {
    return NextResponse.json({ error: 'This description did not pass the content check.', flags: check.flags }, { status: 400 });
  }

  try {
    const basePrompt = buildCharacterPhotoPrompt(
      `Waist-up portrait photo of a fictional adult, clearly aged 21 or older: ${description.trim()}`
    );
    // The base image becomes the reference for the rest, so it uses the reference model too.
    const base = await generateOne(basePrompt, BASE_WAIT_MS, { imageModel: activeReferenceImageModel() });
    if (!base) return NextResponse.json({ error: 'The base image did not finish. Try again.' }, { status: 502 });

    const variations = await Promise.all(
      VARIATIONS.map((scene) =>
        generateOne(buildCharacterPhotoPrompt(scene, { hasReferences: true }), VARIATION_WAIT_MS, {
          referenceImages: [base],
        }).catch(() => null)
      )
    );
    return NextResponse.json({ images: [base, ...variations.filter((image): image is string => Boolean(image))] });
  } catch (error) {
    console.error('Dataset generation error:', error);
    return NextResponse.json({ error: 'Could not generate images.' }, { status: 500 });
  }
}

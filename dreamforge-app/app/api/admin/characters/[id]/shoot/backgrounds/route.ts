import { NextRequest, NextResponse } from 'next/server';
import { requireBetterAuthAdmin, isAdminUser } from '@/lib/admin-auth-helpers';
import { createReferenceUpload, referenceUploadError } from '@/lib/character-references';
import {
  isBackgroundSlot,
  listBackgrounds,
  removeBackground,
  saveBackground,
  setBackgroundInUse,
} from '@/lib/shoot-backgrounds';

// Screening a background calls the image checker, which can take a while.
export const maxDuration = 60;

function failure(context: string, error: unknown, message: string) {
  console.error(`${context}:`, error);
  return NextResponse.json({ error: message }, { status: 500 });
}

// POST: get a direct upload link, so large images don't pass through this server.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireBetterAuthAdmin(request);
  if (!isAdminUser(auth)) return auth;

  const { id } = await params;
  const { contentType, bytes } = await request.json();
  const problem = referenceUploadError(contentType, bytes);
  if (problem) return NextResponse.json({ error: problem.replace('Reference images', 'Backgrounds') }, { status: 400 });

  try {
    return NextResponse.json(await createReferenceUpload(id, contentType));
  } catch (error) {
    return failure('Background upload error', error, 'Could not prepare the upload.');
  }
}

// PUT: screen an uploaded file and put it in a slot.
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireBetterAuthAdmin(request);
  if (!isAdminUser(auth)) return auth;

  const { id } = await params;
  const { slot, path } = await request.json();
  if (!isBackgroundSlot(slot)) return NextResponse.json({ error: 'Choose background 1 or 2.' }, { status: 400 });
  if (typeof path !== 'string' || !path.startsWith(`${id}/`) || path.includes('..')) {
    return NextResponse.json({ error: 'Invalid file path.' }, { status: 400 });
  }

  try {
    const result = await saveBackground(id, slot, path, auth.id);
    if (!result.saved) {
      const message = result.flags.includes('checker_unavailable')
        ? 'The image checker is unavailable, so this background was not saved. Try again.'
        : 'This background did not pass the content check.';
      return NextResponse.json({ error: message, flags: result.flags }, { status: 400 });
    }
    return NextResponse.json({ backgrounds: await listBackgrounds(id) });
  } catch (error) {
    return failure('Background save error', error, 'Could not save the background.');
  }
}

// PATCH: choose whether a saved background is used in the shoot.
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireBetterAuthAdmin(request);
  if (!isAdminUser(auth)) return auth;

  const { id } = await params;
  const { slot, inUse } = await request.json();
  if (!isBackgroundSlot(slot) || typeof inUse !== 'boolean') {
    return NextResponse.json({ error: 'Choose a background and whether to use it.' }, { status: 400 });
  }

  try {
    await setBackgroundInUse(id, slot, inUse);
    return NextResponse.json({ backgrounds: await listBackgrounds(id) });
  } catch (error) {
    return failure('Background update error', error, 'Could not update the background.');
  }
}

// DELETE: remove a background from its slot.
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireBetterAuthAdmin(request);
  if (!isAdminUser(auth)) return auth;

  const { id } = await params;
  const slot = Number(request.nextUrl.searchParams.get('slot'));
  if (!isBackgroundSlot(slot)) return NextResponse.json({ error: 'Choose background 1 or 2.' }, { status: 400 });

  try {
    await removeBackground(id, slot);
    return NextResponse.json({ backgrounds: await listBackgrounds(id) });
  } catch (error) {
    return failure('Background remove error', error, 'Could not remove the background.');
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { requireBetterAuthAdmin, isAdminUser } from '@/lib/admin-auth-helpers';
import { createReferenceUpload, referenceUploadError, screenReference } from '@/lib/character-references';

// Screening calls a classifier per image, so a full set can take a while.
export const maxDuration = 120;

const MAX_SCREEN_AT_ONCE = 20;

// POST: get a direct upload link, so large images don't pass through this server.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireBetterAuthAdmin(request);
  if (!isAdminUser(auth)) return auth;

  const { id } = await params;
  const { contentType, bytes } = await request.json();

  const problem = referenceUploadError(contentType, bytes);
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });

  try {
    return NextResponse.json(await createReferenceUpload(id, contentType));
  } catch (error) {
    console.error('Reference upload error:', error);
    return NextResponse.json({ error: 'Could not prepare the upload.' }, { status: 500 });
  }
}

// PUT: screen uploaded files. Only images that pass can ever reach a model.
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireBetterAuthAdmin(request);
  if (!isAdminUser(auth)) return auth;

  const { id } = await params;
  const { paths } = await request.json();

  if (!Array.isArray(paths) || paths.length === 0 || paths.length > MAX_SCREEN_AT_ONCE) {
    return NextResponse.json({ error: `Send 1 to ${MAX_SCREEN_AT_ONCE} uploaded files.` }, { status: 400 });
  }
  const valid = paths.every(
    (path) => typeof path === 'string' && path.startsWith(`${id}/`) && !path.includes('..')
  );
  if (!valid) return NextResponse.json({ error: 'Invalid file path.' }, { status: 400 });

  try {
    const results = await Promise.all(paths.map((path: string) => screenReference(id, path, auth.id)));
    return NextResponse.json({ results });
  } catch (error) {
    console.error('Reference screening error:', error);
    return NextResponse.json({ error: 'Could not screen the images.' }, { status: 500 });
  }
}

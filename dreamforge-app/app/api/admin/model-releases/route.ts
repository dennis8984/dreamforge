import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { requireBetterAuthAdmin, isAdminUser } from '@/lib/admin-auth-helpers';
import { getSupabaseAdmin } from '@/lib/supabase-server';

const DOCUMENT_TYPES: Record<string, string> = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/png': 'png',
};

// GET: releases on file, with the characters built from each.
export async function GET(request: NextRequest) {
  const auth = await requireBetterAuthAdmin(request);
  if (!isAdminUser(auth)) return auth;

  const { data, error } = await getSupabaseAdmin()
    .from('model_releases')
    .select('id, legal_name, stage_name, signed_at, revoked_at, created_at, character_sources(character_id)')
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: 'Could not load releases.' }, { status: 500 });
  return NextResponse.json({ releases: data || [] });
}

// POST: a direct upload link for a signed release document.
export async function POST(request: NextRequest) {
  const auth = await requireBetterAuthAdmin(request);
  if (!isAdminUser(auth)) return auth;

  const { contentType } = await request.json();
  const extension = DOCUMENT_TYPES[contentType];
  if (!extension) return NextResponse.json({ error: 'Upload the release as a PDF, JPEG or PNG.' }, { status: 400 });

  const path = `${randomUUID()}.${extension}`;
  const { data, error } = await getSupabaseAdmin()
    .storage.from('model-release-documents')
    .createSignedUploadUrl(path);
  if (error || !data) return NextResponse.json({ error: 'Could not prepare the upload.' }, { status: 500 });
  return NextResponse.json({ path, uploadUrl: data.signedUrl });
}

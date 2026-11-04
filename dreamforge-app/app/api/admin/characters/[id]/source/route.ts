import { NextRequest, NextResponse } from 'next/server';
import { requireBetterAuthAdmin, isAdminUser } from '@/lib/admin-auth-helpers';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { modelReleaseError, type ModelReleaseInput } from '@/lib/model-releases';

// POST: records where a character's likeness comes from. Required before activation.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireBetterAuthAdmin(request);
  if (!isAdminUser(auth)) return auth;

  const { id } = await params;
  const body = await request.json();
  const supabase = getSupabaseAdmin();

  if (body?.type === 'ai_generated') {
    if (body.attested !== true) {
      return NextResponse.json({ error: 'Confirm that the images are AI-generated and show a fictional adult.' }, { status: 400 });
    }
    const { error } = await supabase.from('character_sources').upsert({
      character_id: id,
      source_type: 'ai_generated',
      model_release_id: null,
      attested_by: auth.email,
      attested_at: new Date().toISOString(),
    });
    if (error) return NextResponse.json({ error: 'Could not save the source.' }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (body?.type === 'licensed_model') {
    const release = body.release as ModelReleaseInput | undefined;
    const problem = modelReleaseError(release);
    if (problem || !release) return NextResponse.json({ error: problem }, { status: 400 });

    const { data: saved, error: releaseError } = await supabase
      .from('model_releases')
      .insert({
        legal_name: release.legal_name.trim(),
        stage_name: release.stage_name?.trim() || null,
        age_verified_21_at: new Date().toISOString(),
        verification_provider: release.verification_provider.trim(),
        verification_ref: release.verification_ref.trim(),
        release_document_path: release.release_document_path,
        signed_at: release.signed_at,
        scope_ai_training: true,
        scope_adult_content: true,
        scope_video: true,
        created_by: auth.email,
      })
      .select('id')
      .single();
    if (releaseError) return NextResponse.json({ error: 'Could not save the release.' }, { status: 500 });

    const { error } = await supabase.from('character_sources').upsert({
      character_id: id,
      source_type: 'licensed_model',
      model_release_id: saved.id,
      attested_by: auth.email,
      attested_at: new Date().toISOString(),
    });
    if (error) return NextResponse.json({ error: 'Could not save the source.' }, { status: 500 });
    return NextResponse.json({ ok: true, releaseId: saved.id });
  }

  return NextResponse.json({ error: 'Choose where the images come from.' }, { status: 400 });
}

import { DATASET_BUCKET } from './character-references';
import { getSupabaseAdmin } from './supabase-server';

export interface ModelReleaseInput {
  legal_name: string;
  stage_name?: string;
  verification_provider: string;
  verification_ref: string;
  age_verified_21: boolean;
  signed_at: string;
  release_document_path: string;
  scope_ai_training: boolean;
  scope_adult_content: boolean;
  scope_video: boolean;
}

// A real person's character can only be built once every one of these is on file.
export function modelReleaseError(release: Partial<ModelReleaseInput> | undefined): string | null {
  if (!release) return 'Model release details are required.';
  if (!release.legal_name?.trim()) return "The model's legal name is required.";
  if (release.age_verified_21 !== true) return 'The model must be ID-verified as 21 or older.';
  if (!release.verification_provider?.trim() || !release.verification_ref?.trim()) {
    return 'Record who verified the ID, and their reference.';
  }
  if (!release.signed_at || Number.isNaN(Date.parse(release.signed_at))) return 'The release signing date is required.';
  if (!release.release_document_path?.trim()) return 'Upload the signed release.';
  if (!release.scope_ai_training || !release.scope_adult_content || !release.scope_video) {
    return 'The release must cover AI training, adult content and video.';
  }
  return null;
}

function publicMediaPath(url: string | null | undefined): string | null {
  const marker = '/generated-media/';
  const index = url?.indexOf(marker) ?? -1;
  return url && index >= 0 ? decodeURIComponent(url.slice(index + marker.length)) : null;
}

// Consent withdrawn: takes down everything built from this person. SpicyAPI deletes its
// own copies on its retention schedule (uploads in about a day, outputs within 14 days).
export async function revokeModelRelease(releaseId: string, reason: string, actorUserId: string) {
  const supabase = getSupabaseAdmin();

  const { error: revokeError } = await supabase
    .from('model_releases')
    .update({ revoked_at: new Date().toISOString(), revoked_reason: reason })
    .eq('id', releaseId);
  if (revokeError) throw new Error(`Could not revoke release: ${revokeError.message}`);

  const { data: sources, error: sourceError } = await supabase
    .from('character_sources')
    .select('character_id')
    .eq('model_release_id', releaseId);
  if (sourceError) throw new Error(`Could not read characters: ${sourceError.message}`);

  const characterIds = (sources || []).map((source) => source.character_id as string);

  for (const characterId of characterIds) {
    // Hide it first, so nothing new can be generated while files are being removed.
    const { error: hideError } = await supabase
      .from('characters')
      .update({ identity_status: 'revoked', training_status: 'draft', is_public: false, avatar_url: null })
      .eq('id', characterId);
    if (hideError) throw new Error(`Could not hide character: ${hideError.message}`);

    const { data: images } = await supabase.from('training_images').select('storage_path').eq('character_id', characterId);
    const imagePaths = (images || []).map((image) => image.storage_path as string);
    if (imagePaths.length) await supabase.storage.from(DATASET_BUCKET).remove(imagePaths);
    await supabase.from('training_images').delete().eq('character_id', characterId);

    const { data: tasks } = await supabase.from('generation_tasks').select('media_url').eq('character_id', characterId);
    const mediaPaths = (tasks || []).flatMap((task) => publicMediaPath(task.media_url as string | null) ?? []);
    if (mediaPaths.length) await supabase.storage.from('generated-media').remove(mediaPaths);
    await supabase.from('generation_tasks').update({ media_url: null }).eq('character_id', characterId);

    await supabase.from('character_media').delete().eq('character_id', characterId);

    const { data: loras } = await supabase.from('character_loras').select('lora_id').eq('character_id', characterId);
    const loraIds = (loras || []).map((lora) => lora.lora_id as string);
    if (loraIds.length) {
      await supabase.from('lora_models').update({ status: 'disabled' }).in('id', loraIds).eq('kind', 'character');
    }
    await supabase.from('character_loras').delete().eq('character_id', characterId);
  }

  await supabase.from('moderation_log').insert({
    content_type: 'model_release',
    content_id: releaseId,
    human_decision: `revoked: ${reason}`,
    actor_user_id: actorUserId,
  });

  return { charactersRemoved: characterIds.length };
}

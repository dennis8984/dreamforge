import { createHash, randomUUID } from 'node:crypto';
import { moderateImage } from './moderation';
import { getSupabaseAdmin } from './supabase-server';

// A character's reference images: private files that keep the same person across stills
// and clips. Only images that passed screening are ever sent to a model.

export const DATASET_BUCKET = 'character-datasets';
const MAX_REFERENCE_BYTES = 10 * 1024 * 1024;
const REFERENCE_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};
// Must outlast the queue and the run, because the model fetches these during the job.
const SIGNED_URL_SECONDS = 6 * 60 * 60;

// These block the whole character rather than just the one image.
export const BLOCKING_FLAGS = ['minor', 'csam'];

export function referenceUploadError(contentType: unknown, bytes: unknown): string | null {
  if (typeof contentType !== 'string' || !REFERENCE_EXTENSIONS[contentType]) {
    return 'Reference images must be JPEG, PNG or WebP.';
  }
  if (typeof bytes !== 'number' || bytes <= 0 || bytes > MAX_REFERENCE_BYTES) {
    return 'Reference images must be 10 MB or smaller.';
  }
  return null;
}

export async function createReferenceUpload(characterId: string, contentType: string) {
  const path = `${characterId}/${randomUUID()}.${REFERENCE_EXTENSIONS[contentType]}`;
  const { data, error } = await getSupabaseAdmin().storage.from(DATASET_BUCKET).createSignedUploadUrl(path);
  if (error || !data) throw new Error(`Could not prepare upload: ${error?.message}`);
  return { path, uploadUrl: data.signedUrl };
}

export interface ScreenedReference {
  path: string;
  status: 'passed' | 'rejected' | 'pending';
  flags: string[];
}

// Screens one uploaded file and records the decision. A classifier outage leaves the
// image 'pending', so it can't be used until it has really been checked.
export async function screenReference(
  characterId: string,
  path: string,
  actorUserId: string
): Promise<ScreenedReference> {
  const supabase = getSupabaseAdmin();
  const storage = supabase.storage.from(DATASET_BUCKET);

  const { data: file, error: downloadError } = await storage.download(path);
  if (downloadError || !file) throw new Error(`Could not read upload: ${downloadError?.message}`);
  const sha256 = createHash('sha256').update(Buffer.from(await file.arrayBuffer())).digest('hex');

  const { data: signed, error: signError } = await storage.createSignedUrl(path, 300);
  if (signError || !signed) throw new Error(`Could not sign upload: ${signError?.message}`);

  const result = await moderateImage(signed.signedUrl);
  const status: ScreenedReference['status'] = result.approved
    ? 'passed'
    : result.flags.includes('checker_unavailable') ? 'pending' : 'rejected';

  const { data: row, error: insertError } = await supabase
    .from('training_images')
    .upsert(
      {
        character_id: characterId,
        storage_path: path,
        sha256,
        screening_status: status,
        screening_result: result,
      },
      { onConflict: 'character_id,sha256' }
    )
    .select('id')
    .single();
  if (insertError) throw new Error(`Could not record screening: ${insertError.message}`);

  const { error: logError } = await supabase.from('moderation_log').insert({
    content_type: 'training_image',
    content_id: row.id,
    automated_result: result,
    actor_user_id: actorUserId,
  });
  if (logError) console.error('Could not write moderation log:', logError.message);

  return { path, status, flags: result.flags };
}

export async function countReferencesByStatus(characterId: string) {
  const { data, error } = await getSupabaseAdmin()
    .from('training_images')
    .select('screening_status, screening_result')
    .eq('character_id', characterId);
  if (error) throw new Error(`Could not read reference images: ${error.message}`);

  const rows = (data || []) as { screening_status: string; screening_result: { flags?: string[] } | null }[];
  return {
    passed: rows.filter((row) => row.screening_status === 'passed').length,
    pending: rows.filter((row) => row.screening_status === 'pending').length,
    blocked: rows.some((row) => (row.screening_result?.flags || []).some((flag) => BLOCKING_FLAGS.includes(flag))),
  };
}

// Returns short-lived links to a character's screened references, oldest first so the
// same images are used every time.
export async function getCharacterReferences(characterId: string, limit = 3): Promise<string[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('training_images')
    .select('storage_path')
    .eq('character_id', characterId)
    .eq('screening_status', 'passed')
    .order('created_at')
    .limit(limit);

  if (error) {
    console.error('Could not load reference images:', error.message);
    return [];
  }
  if (!data?.length) return [];

  const { data: signed, error: signError } = await supabase.storage
    .from(DATASET_BUCKET)
    .createSignedUrls(data.map((row) => row.storage_path as string), SIGNED_URL_SECONDS);
  if (signError || !signed) {
    console.error('Could not sign reference images:', signError?.message);
    return [];
  }
  return signed.flatMap((entry) => (entry.signedUrl ? [entry.signedUrl] : []));
}

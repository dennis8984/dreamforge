import { DATASET_BUCKET } from './character-references';
import { moderateImage } from './moderation';
import { getSupabaseAdmin } from './supabase-server';

// The locations a character is shot in. Each stays until an admin replaces or removes it, so
// every photo in a shoot lands in the same place. Files are private, like reference images.

// Must outlast the queue and the run, because the model fetches these during the job.
const SIGNED_URL_SECONDS = 6 * 60 * 60;
const SCREENING_URL_SECONDS = 300;

export const BACKGROUND_SLOTS = [1, 2] as const;
export type BackgroundSlot = (typeof BACKGROUND_SLOTS)[number];

export interface ShootBackground {
  slot: BackgroundSlot;
  in_use: boolean;
  url: string;
}

export function isBackgroundSlot(value: unknown): value is BackgroundSlot {
  return BACKGROUND_SLOTS.includes(value as BackgroundSlot);
}

// With two backgrounds in use, shots take turns between them.
export function backgroundForShot<T>(backgrounds: T[], shotIndex: number): T {
  return backgrounds[shotIndex % backgrounds.length];
}

export async function listBackgrounds(characterId: string): Promise<ShootBackground[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('shoot_backgrounds')
    .select('slot, in_use, storage_path')
    .eq('character_id', characterId)
    .order('slot');
  if (error) throw new Error(`Could not read backgrounds: ${error.message}`);
  if (!data?.length) return [];

  const { data: signed, error: signError } = await supabase.storage
    .from(DATASET_BUCKET)
    .createSignedUrls(data.map((row) => row.storage_path as string), SIGNED_URL_SECONDS);
  if (signError || !signed) throw new Error(`Could not sign backgrounds: ${signError?.message}`);

  return data.flatMap((row, index) => {
    const url = signed[index]?.signedUrl;
    return url ? [{ slot: row.slot as BackgroundSlot, in_use: row.in_use as boolean, url }] : [];
  });
}

// Screens an uploaded file and, if it passes, makes it the background in that slot. A file
// that doesn't pass is deleted, and whatever was in the slot stays in place.
export async function saveBackground(
  characterId: string,
  slot: BackgroundSlot,
  path: string,
  actorUserId: string
): Promise<{ saved: boolean; flags: string[] }> {
  const supabase = getSupabaseAdmin();
  const storage = supabase.storage.from(DATASET_BUCKET);

  const { data: signed, error: signError } = await storage.createSignedUrl(path, SCREENING_URL_SECONDS);
  if (signError || !signed) throw new Error(`Could not read upload: ${signError?.message}`);

  const check = await moderateImage(signed.signedUrl);
  if (!check.approved) {
    await storage.remove([path]);
    return { saved: false, flags: check.flags };
  }

  const { data: current } = await supabase
    .from('shoot_backgrounds')
    .select('storage_path')
    .eq('character_id', characterId)
    .eq('slot', slot)
    .maybeSingle();

  const { error } = await supabase.from('shoot_backgrounds').upsert(
    { character_id: characterId, slot, storage_path: path, in_use: true, uploaded_by: actorUserId },
    { onConflict: 'character_id,slot' }
  );
  if (error) throw new Error(`Could not save background: ${error.message}`);

  if (current?.storage_path && current.storage_path !== path) await storage.remove([current.storage_path]);
  return { saved: true, flags: [] };
}

export async function setBackgroundInUse(characterId: string, slot: BackgroundSlot, inUse: boolean) {
  const { error } = await getSupabaseAdmin()
    .from('shoot_backgrounds')
    .update({ in_use: inUse })
    .eq('character_id', characterId)
    .eq('slot', slot);
  if (error) throw new Error(`Could not update background: ${error.message}`);
}

export async function removeBackground(characterId: string, slot: BackgroundSlot) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('shoot_backgrounds')
    .delete()
    .eq('character_id', characterId)
    .eq('slot', slot)
    .select('storage_path')
    .maybeSingle();
  if (error) throw new Error(`Could not remove background: ${error.message}`);
  if (data?.storage_path) await supabase.storage.from(DATASET_BUCKET).remove([data.storage_path as string]);
}

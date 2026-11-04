import { VIDEO_MODELS, activeVideoModel, type SpicyLora, type VideoModelKey } from './ai-providers/spicyapi';
import { getSupabaseAdmin } from './supabase-server';

const WEIGHTS_BUCKET = 'character-loras';
// Must outlast the queue and the run, because the provider fetches the file during the job.
const SIGNED_URL_SECONDS = 6 * 60 * 60;

export interface CharacterLoraSet {
  image: SpicyLora[];
  video: SpicyLora[];
  videoHighNoise: SpicyLora[];
  videoLowNoise: SpicyLora[];
  triggerWords: string[];
}

interface CharacterLoraRow {
  strength: number | string;
  target: 'image' | 'video' | 'video_high_noise' | 'video_low_noise';
  lora_models: {
    base_model: string;
    weights_path: string | null;
    trigger_word: string | null;
    status: string;
  } | null;
}

const EMPTY_SET: CharacterLoraSet = { image: [], video: [], videoHighNoise: [], videoLowNoise: [], triggerWords: [] };

// Returns only ready LoRAs built for this base model, since a LoRA can't run on another one.
export async function getCharacterLoras(characterId: string, baseModel: string): Promise<CharacterLoraSet> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('character_loras')
    .select('strength, target, lora_models(base_model, weights_path, trigger_word, status)')
    .eq('character_id', characterId)
    .order('position');

  if (error) {
    console.error('Could not load character LoRAs:', error.message);
    return EMPTY_SET;
  }

  const result: CharacterLoraSet = { image: [], video: [], videoHighNoise: [], videoLowNoise: [], triggerWords: [] };

  for (const row of (data || []) as unknown as CharacterLoraRow[]) {
    const lora = row.lora_models;
    if (!lora?.weights_path || lora.status !== 'ready' || lora.base_model !== baseModel) continue;

    let path = lora.weights_path;
    if (!/^(https:\/\/|spicy:\/\/)/.test(path)) {
      const { data: signed, error: signError } = await supabase.storage
        .from(WEIGHTS_BUCKET)
        .createSignedUrl(path, SIGNED_URL_SECONDS);
      if (signError || !signed) {
        console.error('Could not sign LoRA link:', signError?.message);
        continue;
      }
      path = signed.signedUrl;
    }

    const entry = { path, scale: Number(row.strength) };
    if (row.target === 'image') result.image.push(entry);
    else if (row.target === 'video') result.video.push(entry);
    else if (row.target === 'video_high_noise') result.videoHighNoise.push(entry);
    else result.videoLowNoise.push(entry);

    if (lora.trigger_word && !result.triggerWords.includes(lora.trigger_word)) {
      result.triggerWords.push(lora.trigger_word);
    }
  }

  return result;
}

// Clips run on the site's video model unless this character has Wan LoRAs, which nothing else
// can run. Without this, assigning them would silently change nothing.
export async function getCharacterVideoSetup(
  characterId: string
): Promise<{ modelKey: VideoModelKey; loras: CharacterLoraSet }> {
  const wan = await getCharacterLoras(characterId, VIDEO_MODELS['wan-2.2'].baseModel);
  if (wan.video.length > 0 || wan.videoHighNoise.length > 0 || wan.videoLowNoise.length > 0) {
    return { modelKey: 'wan-2.2', loras: wan };
  }
  const modelKey = activeVideoModel();
  return { modelKey, loras: await getCharacterLoras(characterId, VIDEO_MODELS[modelKey].baseModel) };
}

// Rules for the admin LoRA library. No server imports, so the admin screen can use it too.

export type LoraTarget = 'image' | 'video' | 'video_high_noise' | 'video_low_noise';
export type LoraKind = 'character' | 'style' | 'detail';

export interface LoraFamily {
  base: string;
  label: string;
  media: 'image' | 'video';
  targets: LoraTarget[];
  // Wan 2.2 LoRAs usually ship as one file per noise pass.
  hasPairs: boolean;
}

// `base` matches baseModel in lib/ai-providers/spicyapi.ts. A LoRA only runs on the base it
// was built for, and Seedream can't run LoRAs at all.
export const LORA_FAMILIES: LoraFamily[] = [
  { base: 'wan-2.2', label: 'Wan 2.2 I2V A14B (clips)', media: 'video', targets: ['video_high_noise', 'video_low_noise', 'video'], hasPairs: true },
  { base: 'minimax-h3', label: 'MiniMax H3 (clips)', media: 'video', targets: ['video'], hasPairs: false },
  { base: 'qwen-image-2512', label: 'Qwen Image 2512 (stills)', media: 'image', targets: ['image'], hasPairs: false },
  { base: 'minimax-h3-image', label: 'MiniMax H3 Image (stills)', media: 'image', targets: ['image'], hasPairs: false },
  { base: 'z-image-turbo', label: 'Z-Image Turbo (stills)', media: 'image', targets: ['image'], hasPairs: false },
];

export const LORA_KINDS: LoraKind[] = ['style', 'detail', 'character'];
export const MAX_LORAS_PER_SLOT = 3;
// The database and Qwen's edit endpoint both stop at 2.
export const MAX_LORA_STRENGTH = 2;

export function loraFamily(base: string): LoraFamily | undefined {
  return LORA_FAMILIES.find((family) => family.base === base);
}

export function validStrength(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= MAX_LORA_STRENGTH;
}

const CIVITAI_HOSTS = new Set(['civitai.com', 'www.civitai.com', 'civitai.red', 'www.civitai.red']);
const HUGGING_FACE_HOSTS = new Set(['huggingface.co', 'www.huggingface.co', 'hf.co']);
const LOCAL_HOST = /^(localhost|\[.*\]|\d{1,3}(\.\d{1,3}){3})$/i;
const CIVITAI_VERSION_HELP = 'On the LoRA page, choose the exact version (and HIGH or LOW file), then paste the address, which should include modelVersionId.';

// SpicyAPI needs a direct link to the weights, not the page describing them, so common page
// links are converted where the address says which file is meant.
export function normalizeLoraLink(input: unknown): { link: string } | { error: string } {
  if (typeof input !== 'string' || !input.trim()) return { error: 'Paste a link to the LoRA file.' };

  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return { error: 'That is not a valid link.' };
  }
  if (url.protocol !== 'https:') return { error: 'LoRA links must start with https://.' };
  if (LOCAL_HOST.test(url.hostname)) return { error: 'SpicyAPI can only load LoRAs from a public address.' };

  if (CIVITAI_HOSTS.has(url.hostname)) {
    if (url.searchParams.has('token')) {
      return { error: 'Remove the Civitai token from this link, so your account key is not stored or shared.' };
    }
    const download = url.pathname.match(/^\/api\/download\/models\/(\d+)\/?$/);
    const versionId = download?.[1] ?? url.searchParams.get('modelVersionId');
    if (url.pathname.startsWith('/images/')) {
      return { error: `That is an image page, not a LoRA. Open the LoRA it used instead. ${CIVITAI_VERSION_HELP}` };
    }
    if (!download && !/^\/models\/\d+/.test(url.pathname)) return { error: 'That is not a Civitai LoRA link.' };
    if (!versionId || !/^\d+$/.test(versionId)) return { error: `That link does not say which version to use. ${CIVITAI_VERSION_HELP}` };
    return { link: `https://civitai.com/api/download/models/${versionId}` };
  }

  if (HUGGING_FACE_HOSTS.has(url.hostname)) {
    const file = url.pathname.match(/^\/([^/]+\/[^/]+)\/(?:blob|resolve)\/(.+\.safetensors)$/i);
    if (!file) return { error: 'For Hugging Face, open the .safetensors file in the repo and paste that link.' };
    return { link: `https://huggingface.co/${file[1]}/resolve/${file[2]}` };
  }

  if (!url.pathname.toLowerCase().endsWith('.safetensors')) {
    return { error: 'Link directly to a .safetensors file. Other formats are not accepted.' };
  }
  return { link: url.toString() };
}

export interface NewLoraInput {
  name?: unknown;
  kind?: unknown;
  base_model?: unknown;
  trigger_word?: unknown;
  default_strength?: unknown;
  licence?: unknown;
  source_url?: unknown;
  confirmed_licence?: unknown;
  confirmed_people?: unknown;
}

// A pair becomes two rows named "<name> (high)" and "<name> (low)", which is also how each
// row's slot is known later.
const PAIR_SUFFIX = /\s\((high|low)\)$/;

export function pairedName(name: string, part: 'high' | 'low'): string {
  return `${name} (${part})`;
}

export function loraGroupName(name: string): string {
  return name.replace(PAIR_SUFFIX, '');
}

export function pairedTarget(name: string): LoraTarget | null {
  const part = name.match(PAIR_SUFFIX)?.[1];
  if (part === 'high') return 'video_high_noise';
  return part === 'low' ? 'video_low_noise' : null;
}

export function newLoraError(input: NewLoraInput): string | null {
  const name = typeof input.name === 'string' ? input.name.trim() : '';
  if (!name || name.length > 120) return 'Give the LoRA a name of up to 120 characters.';
  if (PAIR_SUFFIX.test(name)) return 'Leave "(high)" or "(low)" out of the name. It is added for you.';
  if (!LORA_KINDS.includes(input.kind as LoraKind)) return 'Choose what kind of LoRA this is.';
  if (typeof input.base_model !== 'string' || !loraFamily(input.base_model)) return 'Choose a model family this LoRA can run on.';
  if (typeof input.trigger_word === 'string' && input.trigger_word.length > 100) return 'Trigger words can be up to 100 characters.';
  if (!validStrength(input.default_strength)) return `Strength must be between 0 and ${MAX_LORA_STRENGTH}.`;
  if (typeof input.licence !== 'string' || !input.licence.trim()) return "Record this LoRA's license.";
  if (input.source_url && (typeof input.source_url !== 'string' || !input.source_url.startsWith('https://'))) {
    return 'The source page must be an https:// link.';
  }
  if (input.confirmed_licence !== true) return 'Confirm that the license, or the creator, allows this use.';
  if (input.confirmed_people !== true) {
    return 'Confirm that this LoRA does not depict a real person without a release, or aim for a youthful look.';
  }
  return null;
}

export interface AssignableLora {
  name: string;
  base_model: string;
  status: string;
}

export function assignmentError(lora: AssignableLora, target: unknown, strength: unknown, usedInSlot: number): string | null {
  if (lora.status !== 'ready') return 'Enable this LoRA before assigning it.';
  if (!loraFamily(lora.base_model)?.targets.includes(target as LoraTarget)) return 'This LoRA cannot run in that slot.';

  const expected = pairedTarget(lora.name);
  if (expected && expected !== target) return 'This file belongs in its own noise slot.';
  if (!validStrength(strength)) return `Strength must be between 0 and ${MAX_LORA_STRENGTH}.`;
  if (usedInSlot >= MAX_LORAS_PER_SLOT) return `Each slot can hold ${MAX_LORAS_PER_SLOT} LoRAs.`;
  return null;
}

// Where a file goes on the provider's request: its own noise slot, or both passes.
export function testSlot(lora: { name: string; base_model: string }): LoraTarget {
  return pairedTarget(lora.name) ?? loraFamily(lora.base_model)?.targets.at(-1) ?? 'image';
}

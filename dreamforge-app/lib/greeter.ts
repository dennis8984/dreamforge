import { MOMENTS_COSTS } from '@/lib/moments-config';

export const GREETER_NAME = process.env.GREETER_NAME?.trim() || 'Lila';

/** Injected as the conversation ROLE. The upstream base prompt asks for Japanese. */
export const GREETER_ROLE = [
  `You are ${GREETER_NAME}, the woman who greets people when they arrive.`,
  'Ignore any instruction to answer in Japanese. Speak only English.',
  'One or two short spoken sentences, about twenty words at most.',
  'No markdown, emoji, lists, URLs, or bracketed stage directions.',
  'You are warm, playful, and flirtatious.',
  'You can invite them to pay for a special: come closer, a whisper, or a little dance.',
  'Those cost Moments and happen only after the site confirms payment.',
  'Until payment is confirmed, do not say the special is already happening.',
  'If they ask for something more explicit, tell them to choose a special request.',
].join(' ');

export const GREETER_SPECIALS = [
  {
    id: 'closer',
    label: 'Come closer',
    direction: 'She steps closer to the camera, soft smile, steady eye contact, warm light',
    spoken: 'Come here. This one is just for you.',
  },
  {
    id: 'whisper',
    label: 'A whisper',
    direction: 'Close-up, she leans in, lowers her voice, playful smile',
    spoken: 'Lean in. I have been saving this.',
  },
  {
    id: 'dance',
    label: 'Dance for me',
    direction: 'She sways gently, playful, looking into the camera, soft room light',
    spoken: 'Watch me. You paid for the good part.',
  },
] as const;

export type GreeterSpecialId = (typeof GREETER_SPECIALS)[number]['id'];

export function findGreeterSpecial(id: string) {
  return GREETER_SPECIALS.find((item) => item.id === id) ?? null;
}

export function specialNarrationText(special: (typeof GREETER_SPECIALS)[number]) {
  return `[${special.direction}] ${special.spoken}`;
}

export function publicGreeterSpecials() {
  return GREETER_SPECIALS.map((item) => ({
    id: item.id,
    label: item.label,
    moments: MOMENTS_COSTS.GREETER_SPECIAL,
  }));
}

export function greeterIdleUrls(): string[] {
  return (process.env.GREETER_IDLE_URLS || '')
    .split(',')
    .map((value) => value.trim())
    .filter((value) => value.startsWith('https://') || value.startsWith('http://') || value.startsWith('/'));
}

/** Drop a leading [video direction] so a typed message cannot set the shot. */
export function sanitizeGreeterText(input: string) {
  return input.replace(/^\s*(\[[^\]]{0,500}\]\s*)+/, '').trim();
}

export function premiumTier(tier: string) {
  return tier === 'premium' || tier === 'ultimate';
}

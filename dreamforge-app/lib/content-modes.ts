import { ContentMode } from '@/types/chat';

export interface ContentModeConfig {
  id: ContentMode;
  label: string;
  description: string;
  systemPromptOverlay: string;
  requiredTier: string;
  color: string;
  bgColor: string;
}

export const CONTENT_MODES: Record<ContentMode, ContentModeConfig> = {
  S1E: {
    id: 'S1E',
    label: 'Safe',
    description: 'Wholesome, friendly conversation',
    systemPromptOverlay: 'Keep all responses appropriate and family-friendly. Avoid romantic, sexual, or violent content. Focus on being helpful, kind, and supportive.',
    requiredTier: 'free',
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
  },
  S2E: {
    id: 'S2E',
    label: 'Flirty',
    description: 'Romantic and suggestive conversation',
    systemPromptOverlay: 'You may engage in romantic, flirtatious, and mildly suggestive conversation. Keep things tasteful and teasing. Do not be explicitly sexual.',
    requiredTier: 'lite',
    color: 'text-pink-500',
    bgColor: 'bg-pink-500/10',
  },
  S3E: {
    id: 'S3E',
    label: 'Explicit',
    description: 'Unrestricted text content',
    systemPromptOverlay: 'You may engage in explicit, mature, and unrestricted text conversation. Be descriptive, creative, and responsive to the user\'s desires.',
    requiredTier: 'premium',
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
  },
  S3C: {
    id: 'S3C',
    label: 'Creative',
    description: 'Explicit + image generation triggers',
    systemPromptOverlay: 'You may engage in explicit and unrestricted conversation. When the scene warrants a visual, include [GENERATE_IMAGE: description] tags in your response to trigger image generation.',
    requiredTier: 'premium',
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
  },
};

export function getContentMode(mode: ContentMode): ContentModeConfig {
  return CONTENT_MODES[mode] || CONTENT_MODES.S1E;
}

export function canAccessMode(mode: ContentMode, tier: string): boolean {
  const tiers = ['free', 'lite', 'premium', 'ultimate'];
  const required = CONTENT_MODES[mode]?.requiredTier || 'free';
  return tiers.indexOf(tier) >= tiers.indexOf(required);
}

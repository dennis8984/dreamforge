export type TrainingStatus = 'draft' | 'queued' | 'training' | 'ready' | 'failed';

export interface Character {
  id: string;
  slug: string;
  name: string;
  description?: string;
  avatar_url?: string;
  cover_url?: string;
  tags: string[];
  owner_id?: string;
  training_status: TrainingStatus;
  training_job_id?: string;
  model_ref?: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export type MediaVisibility = 'public' | 'members';

export interface CharacterMedia {
  id: string;
  character_id: string;
  type: 'image' | 'video';
  url: string;
  width?: number | null;
  height?: number | null;
  duration_ms?: number | null;
  is_hd: boolean;
  visibility: MediaVisibility;
  prompt?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at: string;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface Character {
  id: string;
  slug: string;
  name: string;
  description?: string;
  avatar_url?: string;
  cover_url?: string;
  tags: string[];
  owner_id?: string;
  training_status: 'draft' | 'queued' | 'training' | 'ready' | 'failed';
  training_job_id?: string;
  model_ref?: {
    seed?: number;
    lora_path?: string;
    checkpoint?: string;
    style_prompt?: string;
    negative_prompt?: string;
    [key: string]: any;
  };
  created_at: string;
  updated_at: string;
}

export interface CharacterMedia {
  id: string;
  character_id: string;
  type: 'image' | 'video';
  url: string;
  width?: number;
  height?: number;
  duration_ms?: number;
  is_hd: boolean;
  visibility: 'public' | 'members';
  prompt?: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface CharacterWithMedia extends Character {
  media?: CharacterMedia[];
  media_count?: number;
}

export interface CreateCharacterInput {
  name: string;
  description?: string;
  slug?: string;
  tags?: string[];
  avatar_url?: string;
  cover_url?: string;
}

export interface CharacterGenerationParams {
  prompt: string;
  negative_prompt?: string;
  width?: number;
  height?: number;
  steps?: number;
  guidance_scale?: number;
  seed?: number;
  count?: number;
}
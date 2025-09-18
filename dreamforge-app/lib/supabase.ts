import { createClient } from '@supabase/supabase-js';

// Use empty strings as fallback to prevent build errors
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Only create client if credentials are available
export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null as ReturnType<typeof createClient> | null;

// Helper function to check if Supabase is configured
export const isSupabaseConfigured = () => {
  return !!(supabaseUrl && supabaseAnonKey);
};

// Database types
export interface User {
  id: string;
  email: string;
  full_name?: string;
  subscription_tier: 'free' | 'basic' | 'premium';
  subscription_active: boolean;
  stripe_customer_id?: string;
  created_at: string;
}

export interface AIModel {
  id: string;
  name: string;
  description: string;
  category: string;
  thumbnail_url: string;
  is_premium: boolean;
  is_featured: boolean;
  view_count: number;
  like_count: number;
  tags: string[];
  created_at: string;
}

export interface GeneratedImage {
  id: string;
  user_id: string;
  model_id?: string;
  prompt: string;
  image_url: string;
  thumbnail_url?: string;
  generation_time_ms?: number;
  is_public: boolean;
  created_at: string;
}

// Auth functions
export const signUp = async (email: string, password: string, fullName?: string) => {
  if (!supabase) {
    return { data: null, error: new Error('Supabase not configured') };
  }
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      }
    }
  });
  return { data, error };
};

export const signIn = async (email: string, password: string) => {
  if (!supabase) {
    return { data: null, error: new Error('Supabase not configured') };
  }
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { data, error };
};

export const signOut = async () => {
  if (!supabase) {
    return { error: new Error('Supabase not configured') };
  }
  const { error } = await supabase.auth.signOut();
  return { error };
};

// Database functions - these require Supabase to be configured
// Uncomment and use these functions when Supabase credentials are available
/*
export const getModels = async (category?: string) => {
  if (!supabase) return { data: null, error: new Error('Supabase not configured') };

  let query = supabase
    .from('ai_models')
    .select('*')
    .order('created_at', { ascending: false });

  if (category && category !== 'all') {
    query = query.eq('category', category);
  }

  const { data, error } = await query;
  return { data, error };
};

export const getModelProfile = async (modelId: string) => {
  if (!supabase) return { data: null, error: new Error('Supabase not configured') };

  const { data, error } = await supabase
    .from('ai_models')
    .select('*')
    .eq('id', modelId)
    .single();

  if (data) {
    // Increment view count
    await supabase
      .from('ai_models')
      .update({ view_count: data.view_count + 1 })
      .eq('id', modelId);
  }

  return { data, error };
};

export const getUserGallery = async (userId: string) => {
  if (!supabase) return { data: null, error: new Error('Supabase not configured') };

  const { data, error } = await supabase
    .from('generated_images')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  return { data, error };
};

// Storage functions
export const uploadImage = async (file: File, path: string) => {
  if (!supabase) return { url: null, error: new Error('Supabase not configured') };

  const { data, error } = await supabase.storage
    .from('generated-images')
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (data) {
    const { data: urlData } = supabase.storage
      .from('generated-images')
      .getPublicUrl(path);

    return { url: urlData.publicUrl, error: null };
  }

  return { url: null, error };
};

export const deleteImage = async (path: string) => {
  if (!supabase) return { error: new Error('Supabase not configured') };

  const { error } = await supabase.storage
    .from('generated-images')
    .remove([path]);

  return { error };
};
*/
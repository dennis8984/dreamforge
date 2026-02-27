/**
 * POST /api/admin/seed-characters
 * Seeds 15 Secrets.ai-style characters with AI-generated avatars.
 * Requires admin auth.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAuthUser } from '@/lib/auth-helpers';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { generateWithNanoBanana, checkRunpodJobStatus } from '@/lib/nano-banana';

const SEED_CHARACTERS = [
  { name: 'Zoey', location: 'Savannah', age: '23', description: 'Warm and adventurous with a love for cozy nights and deep conversations.', prompt: 'young woman, dark hair in high ponytail, white off-shoulder crop top, blue plaid mini skirt, bedroom with string lights, warm lighting, photorealistic, 8k' },
  { name: 'Molly', location: 'Irvine', age: '19', description: 'Confident and stylish, loves modern aesthetics and meaningful connections.', prompt: 'young woman, shoulder-length brown hair, black strapless corset top, black pants, modern living room with fireplace, photorealistic, 8k' },
  { name: 'Emma', location: 'Austin', age: '24', description: 'Creative soul who finds inspiration in music and late-night talks.', prompt: 'young woman, blonde wavy hair, casual sweater, coffee shop background, soft natural light, photorealistic, 8k' },
  { name: 'Sophia', location: 'Miami', age: '22', description: 'Sunny personality with a passion for beach days and spontaneous adventures.', prompt: 'young woman, long dark hair, summer dress, beach background, golden hour, photorealistic, 8k' },
  { name: 'Olivia', location: 'Seattle', age: '25', description: 'Thoughtful and introspective, loves rainy days and indie music.', prompt: 'young woman, auburn hair, cozy knit sweater, rainy window view, soft lighting, photorealistic, 8k' },
  { name: 'Ava', location: 'Denver', age: '21', description: 'Outdoor enthusiast with a free spirit and infectious energy.', prompt: 'young woman, braided hair, hiking attire, mountain backdrop, golden sunlight, photorealistic, 8k' },
  { name: 'Isabella', location: 'Boston', age: '26', description: 'Intellectual and curious, enjoys bookstores and deep discussions.', prompt: 'young woman, glasses, dark hair in bun, library background, warm lamp light, photorealistic, 8k' },
  { name: 'Mia', location: 'Nashville', age: '20', description: 'Music lover with a southern charm and a heart of gold.', prompt: 'young woman, curly hair, vintage dress, music venue background, neon accents, photorealistic, 8k' },
  { name: 'Charlotte', location: 'Portland', age: '24', description: 'Artistic and eclectic, finds beauty in the unconventional.', prompt: 'young woman, short pixie cut, artistic outfit, studio with plants, natural light, photorealistic, 8k' },
  { name: 'Amelia', location: 'Chicago', age: '23', description: 'Ambitious and witty, loves city life and rooftop views.', prompt: 'young woman, sleek black hair, professional chic outfit, city skyline at night, photorealistic, 8k' },
  { name: 'Harper', location: 'San Diego', age: '22', description: 'Laid-back surfer vibe with a love for ocean and sunsets.', prompt: 'young woman, sun-bleached hair, casual beach wear, ocean sunset, warm tones, photorealistic, 8k' },
  { name: 'Evelyn', location: 'New York', age: '27', description: 'Sophisticated and ambitious, thrives in the fast-paced city.', prompt: 'young woman, elegant updo, designer outfit, Manhattan apartment, city lights, photorealistic, 8k' },
  { name: 'Abigail', location: 'Phoenix', age: '21', description: 'Bubbly and optimistic, always ready for the next adventure.', prompt: 'young woman, long straight hair, bright smile, desert sunset background, warm colors, photorealistic, 8k' },
  { name: 'Emily', location: 'Atlanta', age: '25', description: 'Warm and welcoming, loves southern hospitality and good food.', prompt: 'young woman, warm smile, casual elegant outfit, cozy home interior, soft lighting, photorealistic, 8k' },
  { name: 'Elizabeth', location: 'San Francisco', age: '26', description: 'Tech-savvy and creative, bridges innovation with artistry.', prompt: 'young woman, modern style, minimalist outfit, modern apartment with bay view, natural light, photorealistic, 8k' },
];

async function generateAvatar(prompt: string): Promise<string | null> {
  const fullPrompt = `${prompt}, single person, portrait, full body or upper body, beautiful woman, realistic skin, high quality, photorealistic`;
  const result = await generateWithNanoBanana(fullPrompt, 'stable-diffusion-xl', {
    enhance: true,
    width: 768,
    height: 1024,
  });

  if (result.imageUrl) return result.imageUrl;
  if (result.jobId) {
    for (let i = 0; i < 40; i++) {
      await new Promise((r) => setTimeout(r, 3000));
      const status = await checkRunpodJobStatus(result.jobId!);
      if (status.imageUrl) return status.imageUrl;
      if (status.status === 'error' || status.status === 'failed') break;
    }
  }
  return null;
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!isAuthUser(auth)) return auth;

  const supabase = getSupabaseAdmin();

  const results: { name: string; status: string; avatar_url?: string }[] = [];

  for (let i = 0; i < SEED_CHARACTERS.length; i++) {
    const c = SEED_CHARACTERS[i];
    const slug = c.name.toLowerCase().replace(/\s+/g, '-');

    const { data: existing } = await supabase.from('characters').select('id, avatar_url').eq('slug', slug).maybeSingle();

    let avatarUrl: string | null = existing?.avatar_url || null;
    if (!avatarUrl) {
      try {
        avatarUrl = await generateAvatar(c.prompt);
      } catch (e) {
        console.error(`AI generation failed for ${c.name}:`, e);
      }
      if (!avatarUrl) {
        avatarUrl = `https://picsum.photos/seed/${slug}-${i}/768/1024`;
      }
    }

    const charData = {
      slug,
      name: c.name,
      description: c.description,
      avatar_url: avatarUrl,
      tags: ['female', 'realistic', 'new'],
      training_status: 'ready' as const,
      gender: 'female',
      style: 'realistic',
      category: 'romantic',
      personality_traits: ['Friendly', 'Warm', 'Engaging'],
      is_featured: i < 6,
      is_trending: i < 4,
      is_new: true,
      fan_count: Math.floor(1000 + Math.random() * 5000),
      interaction_count: Math.floor(10000 + Math.random() * 2000000),
      message_count: Math.floor(50000 + Math.random() * 2000000),
      like_count: Math.floor(2000 + Math.random() * 5000),
      location: c.location,
      age: c.age,
    };

    if (existing) {
      const { error } = await supabase.from('characters').update(charData).eq('id', existing.id);
      results.push({ name: c.name, status: error ? 'error' : 'updated', avatar_url: avatarUrl || undefined });
    } else {
      const { error } = await supabase.from('characters').insert([charData]);
      results.push({ name: c.name, status: error ? 'error' : 'created', avatar_url: avatarUrl || undefined });
    }
  }

  return NextResponse.json({ success: true, results });
}

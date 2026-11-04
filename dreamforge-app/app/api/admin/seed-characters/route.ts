/**
 * POST /api/admin/seed-characters
 * Seeds 15 Secrets.ai-style characters with AI-generated avatars.
 * Requires admin auth.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireBetterAuthAdmin, isAdminUser } from '@/lib/admin-auth-helpers';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { generateWithNanoBanana, checkRunpodJobStatus } from '@/lib/nano-banana';
import { moderateText } from '@/lib/moderation';
import { isSpicyConfigured } from '@/lib/ai-providers/spicyapi';
import { mirrorToStorage } from '@/lib/generation-tasks';

const SEED_CHARACTERS = [
  { name: 'Zoey', location: 'Savannah', age: '23', description: 'Warm and adventurous with a love for cozy nights and deep conversations.', prompt: 'adult woman, long dark hair, black off-shoulder top, dark fitted jeans, bedroom with string lights, warm lighting, photorealistic, 8k' },
  { name: 'Molly', location: 'Irvine', age: '24', description: 'Confident and stylish, loves modern aesthetics and meaningful connections.', prompt: 'adult woman, shoulder-length brown hair, black strapless corset top, black pants, modern living room with fireplace, photorealistic, 8k' },
  { name: 'Emma', location: 'Austin', age: '24', description: 'Creative soul who finds inspiration in music and late-night talks.', prompt: 'adult woman, blonde wavy hair, casual sweater, coffee shop background, soft natural light, photorealistic, 8k' },
  { name: 'Sophia', location: 'Miami', age: '22', description: 'Sunny personality with a passion for beach days and spontaneous adventures.', prompt: 'adult woman, long dark hair, summer dress, beach background, golden hour, photorealistic, 8k' },
  { name: 'Olivia', location: 'Seattle', age: '25', description: 'Thoughtful and introspective, loves rainy days and indie music.', prompt: 'adult woman, auburn hair, cozy knit sweater, rainy window view, soft lighting, photorealistic, 8k' },
  { name: 'Ava', location: 'Denver', age: '21', description: 'Outdoor enthusiast with a free spirit and infectious energy.', prompt: 'adult woman, braided hair, hiking attire, mountain backdrop, golden sunlight, photorealistic, 8k' },
  { name: 'Isabella', location: 'Boston', age: '26', description: 'Intellectual and curious, enjoys bookstores and deep discussions.', prompt: 'adult woman, glasses, dark hair in bun, library background, warm lamp light, photorealistic, 8k' },
  { name: 'Mia', location: 'Nashville', age: '23', description: 'Music lover with a southern charm and a heart of gold.', prompt: 'adult woman, curly hair, vintage dress, music venue background, neon accents, photorealistic, 8k' },
  { name: 'Charlotte', location: 'Portland', age: '24', description: 'Artistic and eclectic, finds beauty in the unconventional.', prompt: 'adult woman, short pixie cut, artistic outfit, studio with plants, natural light, photorealistic, 8k' },
  { name: 'Amelia', location: 'Chicago', age: '23', description: 'Ambitious and witty, loves city life and rooftop views.', prompt: 'adult woman, sleek black hair, professional chic outfit, city skyline at night, photorealistic, 8k' },
  { name: 'Harper', location: 'San Diego', age: '22', description: 'Laid-back surfer vibe with a love for ocean and sunsets.', prompt: 'adult woman, sun-bleached hair, casual beach wear, ocean sunset, warm tones, photorealistic, 8k' },
  { name: 'Evelyn', location: 'New York', age: '27', description: 'Sophisticated and ambitious, thrives in the fast-paced city.', prompt: 'adult woman, elegant updo, designer outfit, Manhattan apartment, city lights, photorealistic, 8k' },
  { name: 'Abigail', location: 'Phoenix', age: '21', description: 'Bubbly and optimistic, always ready for the next adventure.', prompt: 'adult woman, long straight hair, bright smile, desert sunset background, warm colors, photorealistic, 8k' },
  { name: 'Emily', location: 'Atlanta', age: '25', description: 'Warm and welcoming, loves southern hospitality and good food.', prompt: 'adult woman, warm smile, casual elegant outfit, cozy home interior, soft lighting, photorealistic, 8k' },
  { name: 'Elizabeth', location: 'San Francisco', age: '26', description: 'Tech-savvy and creative, bridges innovation with artistry.', prompt: 'adult woman, modern style, minimalist outfit, modern apartment with bay view, natural light, photorealistic, 8k' },
];

async function generateAvatar(prompt: string, age: string): Promise<string | null> {
  const fullPrompt = `${age} years old, ${prompt}, single person, portrait, full body or upper body, beautiful woman, realistic skin, high quality, photorealistic`;

  const textCheck = await moderateText(fullPrompt);
  if (!textCheck.approved) {
    console.error('Seed prompt did not pass the content check:', textCheck.flags);
    return null;
  }

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
      if (status.imageUrl) {
        // SpicyAPI result links expire after about 20 minutes, and avatars have to last.
        return isSpicyConfigured() ? mirrorToStorage(status.imageUrl, 'avatar') : status.imageUrl;
      }
      if (status.status === 'error' || status.status === 'failed') break;
    }
  }
  return null;
}

export async function POST(request: NextRequest) {
  const auth = await requireBetterAuthAdmin(request);
  if (!isAdminUser(auth)) return auth;

  const body = await request.json().catch(() => ({}));
  const quick = body?.quick === true;

  let supabase;
  try {
    supabase = getSupabaseAdmin();
  } catch (e) {
    return NextResponse.json(
      { error: 'Database not configured. Set SUPABASE_SERVICE_KEY and NEXT_PUBLIC_SUPABASE_URL.' },
      { status: 503 }
    );
  }

  const results: { name: string; status: string; avatar_url?: string }[] = [];

  for (let i = 0; i < SEED_CHARACTERS.length; i++) {
    const c = SEED_CHARACTERS[i];
    const slug = c.name.toLowerCase().replace(/\s+/g, '-');

    const { data: existing } = await supabase.from('characters').select('id, avatar_url').eq('slug', slug).maybeSingle();

    let avatarUrl: string | null = existing?.avatar_url || null;
    if (!avatarUrl) {
      if (!quick) {
        try {
          avatarUrl = await generateAvatar(c.prompt, c.age);
        } catch (e) {
          console.error(`AI generation failed for ${c.name}:`, e);
        }
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
      if (error?.message?.includes('column') && error?.message?.includes('does not exist')) {
        return NextResponse.json(
          { error: 'Run migrations first: supabase db push or apply 011 and 014 from supabase/migrations/' },
          { status: 500 }
        );
      }
      results.push({ name: c.name, status: error ? 'error' : 'updated', avatar_url: avatarUrl || undefined });
    } else {
      const { error } = await supabase.from('characters').insert([charData]);
      if (error?.message?.includes('column') && error?.message?.includes('does not exist')) {
        return NextResponse.json(
          { error: 'Run migrations first: supabase db push or apply 011 and 014 from supabase/migrations/' },
          { status: 500 }
        );
      }
      results.push({ name: c.name, status: error ? 'error' : 'created', avatar_url: avatarUrl || undefined });
    }
  }

  return NextResponse.json({ success: true, results });
}

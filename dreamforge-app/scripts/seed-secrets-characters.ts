/**
 * Seed 15 Secrets.ai-style companion characters.
 * Uses the AI generator (Nano Banana / Runpod) to create avatar images.
 * Run: npx tsx scripts/seed-secrets-characters.ts
 * Requires: RUNPOD_API_KEY, RUNPOD_API_URL, SUPABASE_SERVICE_KEY, NEXT_PUBLIC_SUPABASE_URL
 */

import { createClient } from '@supabase/supabase-js';

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

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const API_BASE = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

async function generateAvatar(prompt: string, age: string): Promise<string | null> {
  try {
    const res = await fetch(`${API_BASE}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: `${age} years old, ${prompt}, single person, portrait, full body or upper body, beautiful woman, realistic skin, high quality`,
        model_id: 'stable-diffusion-xl',
        parameters: { width: 768, height: 1024 },
      }),
    });
    const data = await res.json();
    if (data.image_url) return data.image_url;
    if (data.id && data.status === 'processing') {
      // Poll for completion
      for (let i = 0; i < 30; i++) {
        await new Promise((r) => setTimeout(r, 3000));
        const statusRes = await fetch(`${API_BASE}/api/generate?job_id=${data.id}`);
        const status = await statusRes.json();
        if (status.image_url) return status.image_url;
        if (status.status === 'COMPLETED' || status.status === 'completed') break;
      }
    }
    return null;
  } catch (e) {
    console.error('Generate error:', e);
    return null;
  }
}

async function main() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  for (let i = 0; i < SEED_CHARACTERS.length; i++) {
    const c = SEED_CHARACTERS[i];
    const slug = c.name.toLowerCase().replace(/\s+/g, '-');
    console.log(`[${i + 1}/${SEED_CHARACTERS.length}] Seeding ${c.name}...`);

    // Check if exists
    const { data: existing } = await supabase.from('characters').select('id, avatar_url').eq('slug', slug).maybeSingle();
    if (existing?.avatar_url) {
      console.log(`  Skipping ${c.name} (already has avatar)`);
      continue;
    }

    // Generate avatar via AI (or use placeholder if API not configured)
    let avatarUrl: string | null = null;
    try {
      avatarUrl = await generateAvatar(c.prompt, c.age);
    } catch (e) {
      console.warn(`  AI generation failed for ${c.name}, using placeholder`);
    }
    if (!avatarUrl) {
      avatarUrl = `https://picsum.photos/seed/${slug}-${i}/768/1024`;
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
      await supabase.from('characters').update(charData).eq('id', existing.id);
      console.log(`  Updated ${c.name}`);
    } else {
      const { error } = await supabase.from('characters').insert([charData]);
      if (error) {
        console.error(`  Error inserting ${c.name}:`, error.message);
      } else {
        console.log(`  Created ${c.name}`);
      }
    }
  }

  console.log('Done.');
}

main().catch(console.error);

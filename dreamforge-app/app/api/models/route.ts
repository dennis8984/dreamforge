import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import fs from 'fs';
import path from 'path';

// Path to models file
const MODELS_FILE = path.join(process.cwd(), 'models.json');

// Default models if file doesn't exist
const defaultModels = [
  {
    id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    name: 'DreamForge XL',
    description: 'High-quality general purpose model with excellent prompt adherence',
    category: 'realistic',
    thumbnail_url: 'https://picsum.photos/400/400?random=10',
    is_premium: false,
    is_featured: true,
    view_count: 15420,
    like_count: 3241,
    nano_banana_model: 'gemini-2.5-flash-image-preview',
    capabilities: {
      max_resolution: '1024x1024',
      styles: ['realistic', 'artistic', 'photography'],
      speed: 'fast'
    }
  },
  {
    id: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
    name: 'Anime Pro Max',
    description: 'Specialized in anime and manga art styles with vibrant colors',
    category: 'anime',
    thumbnail_url: 'https://picsum.photos/400/400?random=11',
    is_premium: true,
    is_featured: true,
    view_count: 12350,
    like_count: 2891,
    nano_banana_model: 'gemini-2.5-flash-image-preview',
    capabilities: {
      max_resolution: '1024x1024',
      styles: ['anime', 'manga', 'chibi'],
      speed: 'medium'
    }
  },
  {
    id: '6ba7b811-9dad-11d1-80b4-00c04fd430c8',
    name: 'Photorealistic Vision',
    description: 'Ultra-realistic human portraits and photography',
    category: 'realistic',
    thumbnail_url: 'https://picsum.photos/400/400?random=12',
    is_premium: true,
    is_featured: false,
    view_count: 9820,
    like_count: 1876,
    nano_banana_model: 'gemini-2.5-flash-image-preview',
    capabilities: {
      max_resolution: '2048x2048',
      styles: ['portrait', 'fashion', 'documentary'],
      speed: 'slow'
    }
  },
  {
    id: '6ba7b812-9dad-11d1-80b4-00c04fd430c8',
    name: 'Abstract Dreams',
    description: 'Surreal and abstract artistic compositions',
    category: 'abstract',
    thumbnail_url: 'https://picsum.photos/400/400?random=13',
    is_premium: false,
    is_featured: false,
    view_count: 7654,
    like_count: 1432,
    nano_banana_model: 'gemini-2.5-flash-image-preview',
    capabilities: {
      max_resolution: '1024x1024',
      styles: ['abstract', 'surreal', 'modern art'],
      speed: 'fast'
    }
  },
  {
    id: '6ba7b813-9dad-11d1-80b4-00c04fd430c8',
    name: '3D Render Pro',
    description: 'High-quality 3D renders with realistic lighting',
    category: '3d',
    thumbnail_url: 'https://picsum.photos/400/400?random=14',
    is_premium: true,
    is_featured: true,
    view_count: 11234,
    like_count: 2156,
    nano_banana_model: 'gemini-2.5-flash-image-preview',
    capabilities: {
      max_resolution: '2048x2048',
      styles: ['3d', 'render', 'cgi'],
      speed: 'slow'
    }
  },
  {
    id: '6ba7b814-9dad-11d1-80b4-00c04fd430c8',
    name: 'Fantasy Worlds',
    description: 'Epic fantasy landscapes and creature designs',
    category: 'artistic',
    thumbnail_url: 'https://picsum.photos/400/400?random=15',
    is_premium: false,
    is_featured: false,
    view_count: 8976,
    like_count: 1678,
    nano_banana_model: 'gemini-2.5-flash-image-preview',
    capabilities: {
      max_resolution: '1024x1024',
      styles: ['fantasy', 'magical', 'mythical'],
      speed: 'medium'
    }
  }
];

// Get models from file or use defaults
function getModels() {
  try {
    if (fs.existsSync(MODELS_FILE)) {
      const data = fs.readFileSync(MODELS_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error reading models file:', error);
  }
  return defaultModels;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category');
    const featured = searchParams.get('featured');

    // Try to get from Supabase first if configured
    if (supabase) {
      let query = supabase
        .from('ai_models')
        .select('*')
        .order('created_at', { ascending: false });

      if (category && category !== 'all') {
        query = query.eq('category', category);
      }

      if (featured === 'true') {
        query = query.eq('is_featured', true);
      }

      const { data, error } = await query;

      if (!error && data) {
        return NextResponse.json(data);
      }
      if (error) {
        console.error('Supabase error:', error);
      }
    }

    // Fall back to file system
    const models = getModels();
    let filteredModels = [...models];

    if (category && category !== 'all') {
      filteredModels = filteredModels.filter(m => m.category === category);
    }

    if (featured === 'true') {
      filteredModels = filteredModels.filter(m => m.is_featured);
    }

    return NextResponse.json(filteredModels);
  } catch (err) {
    console.error('Error fetching models:', err);
    // Fall back to file system
    const models = getModels();
    return NextResponse.json(models);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { modelId, action } = body;

    if (action === 'like') {
      // In a real app, this would update the database
      const models = getModels();
      const model = models.find((m: unknown) => (m as {id: string; like_count: number}).id === modelId) as {id: string; like_count: number} | undefined;
      if (model) {
        model.like_count += 1;
        return NextResponse.json({
          success: true,
          likes: model.like_count
        });
      }
    }

    if (action === 'view') {
      // Track model view
      const models = getModels();
      const model = models.find((m: unknown) => (m as {id: string; view_count: number}).id === modelId) as {id: string; view_count: number} | undefined;
      if (model) {
        model.view_count += 1;
        return NextResponse.json({
          success: true,
          views: model.view_count
        });
      }
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
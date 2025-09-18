import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';

// Path to store models (in production, use a database)
const MODELS_FILE = path.join(process.cwd(), 'models.json');

// Initialize with default models if file doesn't exist
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
  }
];

// Get models from file or memory
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

// Save models to file (only works in development)
function saveModels(models: unknown[]) {
  // Skip file writes in production (Vercel has read-only filesystem)
  if (process.env.NODE_ENV === 'production') {
    return false;
  }

  try {
    fs.writeFileSync(MODELS_FILE, JSON.stringify(models, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving models:', error);
    return false;
  }
}

// Simple admin authentication check
function isAdminAuthenticated(request: NextRequest): boolean {
  // In production, verify JWT token and admin role
  const adminKey = request.headers.get('x-admin-key');

  // For demo: check for admin key or query param
  // Also check referrer for admin page access
  const referrer = request.headers.get('referer');
  const isFromAdmin = referrer?.includes('admin=true');

  return adminKey === 'dreamforge_admin_2024' ||
         request.nextUrl.searchParams.get('admin') === 'true' ||
         isFromAdmin === true;
}

// GET /api/admin/models - Get all models
export async function GET(request: NextRequest) {
  if (!isAdminAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Try to get from Supabase first if configured
    if (supabase) {
      const { data, error } = await supabase
        .from('ai_models')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        return NextResponse.json(data);
      }
      if (error) {
        console.error('Supabase error:', error);
      }
    }

    // Fall back to file system
    const models = getModels();
    return NextResponse.json(models);
  } catch (err) {
    console.error('Error fetching models:', err);
    // Fall back to file system
    const models = getModels();
    return NextResponse.json(models);
  }
}

// POST /api/admin/models - Create new model
export async function POST(request: NextRequest) {
  if (!isAdminAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const models = getModels();

    // Validate required fields
    if (!body.name || !body.description) {
      return NextResponse.json(
        { error: 'Name and description are required' },
        { status: 400 }
      );
    }

    // Create new model with defaults (use UUID for Supabase compatibility)
    const modelId = body.id || uuidv4();
    const newModel = {
      id: modelId,
      name: body.name,
      description: body.description,
      category: body.category || 'realistic',
      thumbnail_url: body.thumbnail_url || `https://picsum.photos/400/400?random=${Date.now()}`,
      is_premium: body.is_premium || false,
      is_featured: body.is_featured || false,
      view_count: 0,
      like_count: 0,
      nano_banana_model: body.nano_banana_model || 'gemini-2.5-flash-image-preview',
      capabilities: body.capabilities || {
        max_resolution: '1024x1024',
        styles: [],
        speed: 'fast'
      },
      file_path: body.file_path || `models/${modelId}.safetensors`,
      created_at: new Date().toISOString()
    };

    // Try to save to Supabase if configured
    if (supabase) {
      try {
        const { data: supabaseModel, error } = await supabase
          .from('ai_models')
          .insert([
            {
              id: newModel.id,
              name: newModel.name,
              description: newModel.description,
              category: newModel.category,
              thumbnail_url: newModel.thumbnail_url,
              is_premium: newModel.is_premium,
              is_featured: newModel.is_featured,
              view_count: newModel.view_count,
              like_count: newModel.like_count,
              nano_banana_model: newModel.nano_banana_model,
              tags: newModel.capabilities.styles || [],
              file_path: `models/${newModel.id}.safetensors`
            }
          ])
          .select()
          .single();

        if (!error && supabaseModel) {
          return NextResponse.json(supabaseModel, { status: 201 });
        }
        if (error) {
          console.error('Supabase insert error:', error);
        }
      } catch (supabaseError) {
        console.error('Supabase insert error:', supabaseError);
      }
    }

    // Fall back to file system (only in development)
    if (process.env.NODE_ENV !== 'production') {
      models.push(newModel);
      saveModels(models);
      return NextResponse.json(newModel, { status: 201 });
    }

    // In production without Supabase, return error
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 503 }
    );
  } catch (error) {
    console.error('Error creating model:', error);
    return NextResponse.json(
      { error: 'Failed to create model' },
      { status: 500 }
    );
  }
}
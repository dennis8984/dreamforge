import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';

// Local fallback storage (development only)
const CHARACTERS_FILE = path.join(process.cwd(), 'characters.json');

function getLocalCharacters() {
  try {
    if (fs.existsSync(CHARACTERS_FILE)) {
      const data = fs.readFileSync(CHARACTERS_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error reading characters file:', error);
  }
  return [] as unknown[];
}

function saveLocalCharacters(characters: unknown[]) {
  if (process.env.NODE_ENV === 'production') return false;
  try {
    fs.writeFileSync(CHARACTERS_FILE, JSON.stringify(characters, null, 2));
    return true;
  } catch (error) {
    console.error('Error writing characters file:', error);
    return false;
  }
}

function isAdminAuthenticated(request: NextRequest): boolean {
  const adminKey = request.headers.get('x-admin-key');
  const referrer = request.headers.get('referer');
  const isFromAdmin = referrer?.includes('admin=true');
  return (
    adminKey === 'dreamforge_admin_2024' ||
    request.nextUrl.searchParams.get('admin') === 'true' ||
    isFromAdmin === true
  );
}

// GET /api/admin/characters
export async function GET(request: NextRequest) {
  if (!isAdminAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    if (supabase) {
      const { data, error } = await supabase
        .from('characters')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error && data) return NextResponse.json(data);
      if (error) console.error('Supabase error:', error);
    }
    const characters = getLocalCharacters();
    return NextResponse.json(characters);
  } catch (error) {
    console.error('Error fetching characters:', error);
    const characters = getLocalCharacters();
    return NextResponse.json(characters);
  }
}

// POST /api/admin/characters
export async function POST(request: NextRequest) {
  if (!isAdminAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const id = body.id || uuidv4();
    const name: string = body.name?.trim();
    let slug: string = (body.slug || name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    if (!name || !slug) {
      return NextResponse.json({ error: 'Name (or slug) is required' }, { status: 400 });
    }

    // Ensure slug uniqueness
    if (supabase) {
      const { data: existing } = await supabase
        .from('characters')
        .select('id')
        .eq('slug', slug)
        .maybeSingle();
      if (existing) {
        slug = `${slug}-${id.substring(0, 6)}`;
      }
    } else {
      const locals = getLocalCharacters();
      if (locals.some((c: { slug: string }) => c.slug === slug)) {
        slug = `${slug}-${id.substring(0, 6)}`;
      }
    }

    const now = new Date().toISOString();
    const newCharacter = {
      id,
      slug,
      name,
      description: body.description || '',
      avatar_url: body.avatar_url || '',
      cover_url: body.cover_url || '',
      tags: Array.isArray(body.tags) ? body.tags : [],
      owner_id: body.owner_id || null,
      training_status: 'draft',
      training_job_id: null,
      model_ref: null,
      created_at: now,
      updated_at: now
    };

    if (supabase) {
      const { data, error } = await supabase
        .from('characters')
        .insert([newCharacter])
        .select()
        .single();
      if (!error && data) return NextResponse.json(data, { status: 201 });
      if (error) console.error('Supabase insert error:', error);
    }

    // Dev fallback
    const characters = getLocalCharacters();
    characters.unshift(newCharacter);
    saveLocalCharacters(characters);
    return NextResponse.json(newCharacter, { status: 201 });
  } catch (error) {
    console.error('Error creating character:', error);
    return NextResponse.json({ error: 'Failed to create character' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import type { Character, CreateCharacterInput } from '@/types/characters';

// Admin authentication check (reusing pattern from models)
function isAdminAuthenticated(request: NextRequest): boolean {
  const adminKey = request.headers.get('x-admin-key');
  const referrer = request.headers.get('referer');
  const isFromAdmin = referrer?.includes('admin=true');

  return adminKey === 'dreamforge_admin_2024' ||
         request.nextUrl.searchParams.get('admin') === 'true' ||
         isFromAdmin === true;
}

// GET /api/admin/characters - List all characters
export async function GET(request: NextRequest) {
  if (!isAdminAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { data: characters, error } = await supabase
      .from('characters')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching characters:', error);
      return NextResponse.json({ error: 'Failed to fetch characters' }, { status: 500 });
    }

    return NextResponse.json(characters || []);
  } catch (error) {
    console.error('Error in GET /api/admin/characters:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/admin/characters - Create new character
export async function POST(request: NextRequest) {
  if (!isAdminAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body: CreateCharacterInput = await request.json();

    // Validate required fields
    if (!body.name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    // Generate slug if not provided
    let slug = body.slug || body.name.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    // Check for unique slug
    const { data: existing } = await supabase
      .from('characters')
      .select('id')
      .eq('slug', slug)
      .single();

    if (existing) {
      // Append timestamp to make unique
      slug = `${slug}-${Date.now()}`;
    }

    // Create character
    const characterData: Partial<Character> = {
      name: body.name,
      slug,
      description: body.description,
      tags: body.tags || [],
      avatar_url: body.avatar_url,
      cover_url: body.cover_url,
      training_status: 'draft',
      model_ref: {}
    };

    const { data: character, error } = await supabase
      .from('characters')
      .insert([characterData])
      .select()
      .single();

    if (error) {
      console.error('Error creating character:', error);
      return NextResponse.json({ error: 'Failed to create character' }, { status: 500 });
    }

    return NextResponse.json(character, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/admin/characters:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
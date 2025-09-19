import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import fs from 'fs';
import path from 'path';

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

// PATCH /api/admin/characters/[id]
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!isAdminAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();

    if (body.slug && supabase) {
      // enforce slug uniqueness
      const { data: existing } = await supabase
        .from('characters')
        .select('id')
        .eq('slug', body.slug)
        .neq('id', id)
        .maybeSingle();
      if (existing) {
        return NextResponse.json({ error: 'Slug already exists' }, { status: 409 });
      }
    }

    if (supabase) {
      const { data, error } = await supabase
        .from('characters')
        .update({ ...body, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (!error && data) return NextResponse.json(data);
      if (error) console.error('Supabase update error:', error);
    }

    // fallback to local JSON
    const characters = getLocalCharacters();
    const idx = characters.findIndex((c: { id: string }) => c.id === id);
    if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    characters[idx] = { ...characters[idx], ...body, updated_at: new Date().toISOString() };
    saveLocalCharacters(characters);
    return NextResponse.json(characters[idx]);
  } catch (error) {
    console.error('Error updating character:', error);
    return NextResponse.json({ error: 'Failed to update character' }, { status: 500 });
  }
}

// DELETE /api/admin/characters/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!isAdminAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    if (supabase) {
      const { error } = await supabase.from('characters').delete().eq('id', id);
      if (!error) return NextResponse.json({ success: true });
      if (error) console.error('Supabase delete error:', error);
    }

    const characters = getLocalCharacters();
    const filtered = characters.filter((c: { id: string }) => c.id !== id);
    saveLocalCharacters(filtered);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting character:', error);
    return NextResponse.json({ error: 'Failed to delete character' }, { status: 500 });
  }
}

import type { Character } from '@/types/characters';

// Admin authentication check
function isAdminAuthenticated(request: NextRequest): boolean {
  const adminKey = request.headers.get('x-admin-key');
  const referrer = request.headers.get('referer');
  const isFromAdmin = referrer?.includes('admin=true');

  return adminKey === 'dreamforge_admin_2024' ||
         request.nextUrl.searchParams.get('admin') === 'true' ||
         isFromAdmin === true;
}

// GET /api/admin/characters/[id] - Get single character
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!isAdminAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { data: character, error } = await supabase
      .from('characters')
      .select('*')
      .eq('id', params.id)
      .single();

    if (error || !character) {
      return NextResponse.json({ error: 'Character not found' }, { status: 404 });
    }

    // Optionally fetch media count
    const { count } = await supabase
      .from('character_media')
      .select('*', { count: 'exact', head: true })
      .eq('character_id', params.id);

    return NextResponse.json({ ...character, media_count: count || 0 });
  } catch (error) {
    console.error('Error in GET /api/admin/characters/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/admin/characters/[id] - Update character
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!isAdminAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();

    // If updating slug, check uniqueness
    if (body.slug) {
      const { data: existing } = await supabase
        .from('characters')
        .select('id')
        .eq('slug', body.slug)
        .neq('id', params.id)
        .single();

      if (existing) {
        return NextResponse.json({ error: 'Slug already exists' }, { status: 400 });
      }
    }

    // Update character
    const { data: character, error } = await supabase
      .from('characters')
      .update({
        ...body,
        updated_at: new Date().toISOString()
      })
      .eq('id', params.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating character:', error);
      return NextResponse.json({ error: 'Failed to update character' }, { status: 500 });
    }

    if (!character) {
      return NextResponse.json({ error: 'Character not found' }, { status: 404 });
    }

    return NextResponse.json(character);
  } catch (error) {
    console.error('Error in PATCH /api/admin/characters/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/admin/characters/[id] - Delete character
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!isAdminAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { error } = await supabase
      .from('characters')
      .delete()
      .eq('id', params.id);

    if (error) {
      console.error('Error deleting character:', error);
      return NextResponse.json({ error: 'Failed to delete character' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/admin/characters/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
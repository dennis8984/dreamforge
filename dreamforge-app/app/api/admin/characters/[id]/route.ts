import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAdmin, isAuthUser } from '@/lib/auth-helpers';

// GET /api/admin/characters/[id] - Get single character
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const auth = await requireAdmin(request);
  if (!isAuthUser(auth)) return auth;

  try {
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
    }
    const { data: character, error } = await supabase
      .from('characters')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !character) {
      return NextResponse.json({ error: 'Character not found' }, { status: 404 });
    }

    // Optionally fetch media count
    const { count } = await supabase
      .from('character_media')
      .select('*', { count: 'exact', head: true })
      .eq('character_id', id);

    return NextResponse.json({ ...character, media_count: count || 0 });
  } catch (error) {
    console.error('Error in GET /api/admin/characters/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/admin/characters/[id] - Update character
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const auth = await requireAdmin(request);
  if (!isAuthUser(auth)) return auth;

  try {
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
    }
    const body = await request.json();

    // If updating slug, check uniqueness
    if (body.slug) {
      const { data: existing } = await supabase
        .from('characters')
        .select('id')
        .eq('slug', body.slug)
        .neq('id', id)
        .maybeSingle();

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
      .eq('id', id)
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
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const auth = await requireAdmin(request);
  if (!isAuthUser(auth)) return auth;

  try {
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
    }
    const { error } = await supabase
      .from('characters')
      .delete()
      .eq('id', id);

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
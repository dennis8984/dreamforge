import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

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

// POST /api/admin/characters/[id]/media
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!isAdminAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const items = Array.isArray(body) ? body : [body];

    if (supabase) {
      const payload = items.map((m) => ({
        character_id: id,
        type: m.type || 'image',
        url: m.url,
        width: m.width ?? null,
        height: m.height ?? null,
        duration_ms: m.duration_ms ?? null,
        is_hd: m.is_hd ?? true,
        visibility: m.visibility || 'public',
        prompt: m.prompt || null,
        metadata: m.metadata || {},
      }));
      const { data, error } = await supabase
        .from('character_media')
        .insert(payload)
        .select('*');
      if (!error && data) return NextResponse.json(data, { status: 201 });
      if (error) console.error('Supabase insert error:', error);
    }

    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  } catch (error) {
    console.error('Error adding media:', error);
    return NextResponse.json({ error: 'Failed to add media' }, { status: 500 });
  }
}

// DELETE /api/admin/characters/[id]/media
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await params; // not used directly; media ids provided in body
  if (!isAdminAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const ids: string[] = body?.ids || [];
    if (!ids.length) return NextResponse.json({ error: 'No ids provided' }, { status: 400 });

    if (supabase) {
      const { error } = await supabase.from('character_media').delete().in('id', ids);
      if (!error) return NextResponse.json({ success: true });
      if (error) console.error('Supabase delete error:', error);
    }

    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  } catch (error) {
    console.error('Error deleting media:', error);
    return NextResponse.json({ error: 'Failed to delete media' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import type { CharacterMedia } from '@/types/characters';

// Admin authentication check
function isAdminAuthenticated(request: NextRequest): boolean {
  const adminKey = request.headers.get('x-admin-key');
  const referrer = request.headers.get('referer');
  const isFromAdmin = referrer?.includes('admin=true');

  return adminKey === 'dreamforge_admin_2024' ||
         request.nextUrl.searchParams.get('admin') === 'true' ||
         isFromAdmin === true;
}

// GET /api/admin/characters/[id]/media - List character media
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!isAdminAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { data: media, error } = await supabase
      .from('character_media')
      .select('*')
      .eq('character_id', params.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching character media:', error);
      return NextResponse.json({ error: 'Failed to fetch media' }, { status: 500 });
    }

    return NextResponse.json(media || []);
  } catch (error) {
    console.error('Error in GET /api/admin/characters/[id]/media:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/admin/characters/[id]/media - Add media to character
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!isAdminAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();

    // Validate required fields
    if (!body.url || !body.type) {
      return NextResponse.json(
        { error: 'URL and type are required' },
        { status: 400 }
      );
    }

    if (!['image', 'video'].includes(body.type)) {
      return NextResponse.json(
        { error: 'Type must be "image" or "video"' },
        { status: 400 }
      );
    }

    // Create media entry
    const mediaData: Partial<CharacterMedia> = {
      character_id: params.id,
      type: body.type,
      url: body.url,
      width: body.width,
      height: body.height,
      duration_ms: body.duration_ms,
      is_hd: body.is_hd !== false,
      visibility: body.visibility || 'public',
      prompt: body.prompt,
      metadata: body.metadata || {}
    };

    const { data: media, error } = await supabase
      .from('character_media')
      .insert([mediaData])
      .select()
      .single();

    if (error) {
      console.error('Error creating character media:', error);
      return NextResponse.json({ error: 'Failed to add media' }, { status: 500 });
    }

    // If this is the first image and no avatar/cover is set, update character
    if (body.type === 'image' && body.setAsDefault) {
      const updates: any = {};
      if (body.setAsAvatar) updates.avatar_url = body.url;
      if (body.setAsCover) updates.cover_url = body.url;

      if (Object.keys(updates).length > 0) {
        await supabase
          .from('characters')
          .update(updates)
          .eq('id', params.id);
      }
    }

    return NextResponse.json(media, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/admin/characters/[id]/media:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/admin/characters/[id]/media - Bulk delete media
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!isAdminAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const mediaIds = body.ids;

    if (!Array.isArray(mediaIds) || mediaIds.length === 0) {
      return NextResponse.json(
        { error: 'Media IDs array is required' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('character_media')
      .delete()
      .eq('character_id', params.id)
      .in('id', mediaIds);

    if (error) {
      console.error('Error deleting character media:', error);
      return NextResponse.json({ error: 'Failed to delete media' }, { status: 500 });
    }

    return NextResponse.json({ success: true, deleted: mediaIds.length });
  } catch (error) {
    console.error('Error in DELETE /api/admin/characters/[id]/media:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
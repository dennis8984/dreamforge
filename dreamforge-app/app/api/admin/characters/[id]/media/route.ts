import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAdmin, isAuthUser } from '@/lib/auth-helpers';

// POST /api/admin/characters/[id]/media
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await requireAdmin(request);
  if (!isAuthUser(auth)) return auth;

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
  const auth = await requireAdmin(request);
  if (!isAuthUser(auth)) return auth;

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
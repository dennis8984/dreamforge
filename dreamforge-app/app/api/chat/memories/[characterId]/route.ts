import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthUser } from '@/lib/auth-helpers';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import type { MemoryCategory } from '@/types/chat';

// GET /api/chat/memories/[characterId] - Get user memories for a character
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ characterId: string }> }
) {
  const { characterId } = await context.params;
  const auth = await requireAuth(request);
  if (!isAuthUser(auth)) return auth;

  try {
    const supabase = getSupabaseAdmin();
    const category = request.nextUrl.searchParams.get('category') as MemoryCategory | null;
    const activeOnly = request.nextUrl.searchParams.get('active') !== 'false';

    let query = supabase
      .from('user_memories')
      .select('*')
      .eq('user_id', auth.id)
      .eq('character_id', characterId)
      .order('updated_at', { ascending: false });

    if (activeOnly) {
      query = query.eq('is_active', true);
    }

    if (category) {
      const validCategories: MemoryCategory[] = ['fact', 'preference', 'relationship', 'emotional', 'context', 'boundary'];
      if (validCategories.includes(category)) {
        query = query.eq('category', category);
      }
    }

    const { data: memories, error } = await query;

    if (error) {
      console.error('Error fetching memories:', error);
      return NextResponse.json({ error: 'Failed to fetch memories' }, { status: 500 });
    }

    return NextResponse.json({
      memories: memories || [],
      count: (memories || []).length,
    });
  } catch (error) {
    console.error('Error in GET /api/chat/memories/[characterId]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/chat/memories/[characterId] - Update or deactivate a memory
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ characterId: string }> }
) {
  const { characterId } = await context.params;
  const auth = await requireAuth(request);
  if (!isAuthUser(auth)) return auth;

  try {
    const supabase = getSupabaseAdmin();
    const body = await request.json();
    const { memory_id, is_active, value } = body;

    if (!memory_id) {
      return NextResponse.json({ error: 'memory_id is required' }, { status: 400 });
    }

    // Verify memory belongs to this user and character
    const { data: existing } = await supabase
      .from('user_memories')
      .select('id')
      .eq('id', memory_id)
      .eq('user_id', auth.id)
      .eq('character_id', characterId)
      .single();

    if (!existing) {
      return NextResponse.json({ error: 'Memory not found' }, { status: 404 });
    }

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (is_active !== undefined) updates.is_active = is_active;
    if (value !== undefined) updates.value = value;

    const { data: memory, error: updateError } = await supabase
      .from('user_memories')
      .update(updates)
      .eq('id', memory_id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating memory:', updateError);
      return NextResponse.json({ error: 'Failed to update memory' }, { status: 500 });
    }

    return NextResponse.json(memory);
  } catch (error) {
    console.error('Error in PATCH /api/chat/memories/[characterId]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/chat/memories/[characterId] - Delete a memory
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ characterId: string }> }
) {
  const { characterId } = await context.params;
  const auth = await requireAuth(request);
  if (!isAuthUser(auth)) return auth;

  try {
    const supabase = getSupabaseAdmin();
    const memoryId = request.nextUrl.searchParams.get('memory_id');

    if (!memoryId) {
      return NextResponse.json({ error: 'memory_id query param is required' }, { status: 400 });
    }

    // Verify memory belongs to this user and character
    const { data: existing } = await supabase
      .from('user_memories')
      .select('id')
      .eq('id', memoryId)
      .eq('user_id', auth.id)
      .eq('character_id', characterId)
      .single();

    if (!existing) {
      return NextResponse.json({ error: 'Memory not found' }, { status: 404 });
    }

    const { error: deleteError } = await supabase
      .from('user_memories')
      .delete()
      .eq('id', memoryId);

    if (deleteError) {
      console.error('Error deleting memory:', deleteError);
      return NextResponse.json({ error: 'Failed to delete memory' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/chat/memories/[characterId]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

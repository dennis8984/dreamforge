import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthUser } from '@/lib/auth-helpers';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { canAccessMode } from '@/lib/content-modes';
import type { ContentMode, ConversationStatus } from '@/types/chat';

// GET /api/chat/conversations/[id] - Get conversation details
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const auth = await requireAuth(request);
  if (!isAuthUser(auth)) return auth;

  try {
    const supabase = getSupabaseAdmin();

    const { data: conversation, error } = await supabase
      .from('chat_conversations')
      .select('*, character:characters(name, avatar_url)')
      .eq('id', id)
      .eq('user_id', auth.id)
      .single();

    if (error || !conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    // Also fetch participants for group chats
    let participants = null;
    if (conversation.is_group) {
      const { data: parts } = await supabase
        .from('chat_participants')
        .select('*, character:characters(name, avatar_url)')
        .eq('conversation_id', id)
        .eq('is_active', true)
        .order('join_order', { ascending: true });
      participants = parts;
    }

    return NextResponse.json({
      ...conversation,
      participants,
    });
  } catch (error) {
    console.error('Error in GET /api/chat/conversations/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/chat/conversations/[id] - Update conversation
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const auth = await requireAuth(request);
  if (!isAuthUser(auth)) return auth;

  try {
    const supabase = getSupabaseAdmin();
    const body = await request.json();

    // Verify ownership
    const { data: existing } = await supabase
      .from('chat_conversations')
      .select('id, user_id')
      .eq('id', id)
      .eq('user_id', auth.id)
      .single();

    if (!existing) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    // Only allow updating specific fields
    const allowedFields: Record<string, unknown> = {};

    if (body.title !== undefined) {
      allowedFields.title = body.title;
    }
    if (body.content_mode !== undefined) {
      const mode = body.content_mode as ContentMode;
      if (!canAccessMode(mode, auth.tier)) {
        return NextResponse.json(
          { error: `Your subscription tier does not have access to ${mode} content mode` },
          { status: 403 }
        );
      }
      allowedFields.content_mode = mode;
    }
    if (body.status !== undefined) {
      const validStatuses: ConversationStatus[] = ['active', 'archived', 'deleted'];
      if (!validStatuses.includes(body.status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
      }
      allowedFields.status = body.status;
    }
    if (body.metadata !== undefined) {
      allowedFields.metadata = body.metadata;
    }

    if (Object.keys(allowedFields).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    allowedFields.updated_at = new Date().toISOString();

    const { data: conversation, error: updateError } = await supabase
      .from('chat_conversations')
      .update(allowedFields)
      .eq('id', id)
      .select('*, character:characters(name, avatar_url)')
      .single();

    if (updateError) {
      console.error('Error updating conversation:', updateError);
      return NextResponse.json({ error: 'Failed to update conversation' }, { status: 500 });
    }

    return NextResponse.json(conversation);
  } catch (error) {
    console.error('Error in PATCH /api/chat/conversations/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/chat/conversations/[id] - Soft delete conversation
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const auth = await requireAuth(request);
  if (!isAuthUser(auth)) return auth;

  try {
    const supabase = getSupabaseAdmin();

    // Verify ownership
    const { data: existing } = await supabase
      .from('chat_conversations')
      .select('id, user_id')
      .eq('id', id)
      .eq('user_id', auth.id)
      .single();

    if (!existing) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    // Soft delete by setting status to 'deleted'
    const { error: deleteError } = await supabase
      .from('chat_conversations')
      .update({
        status: 'deleted',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (deleteError) {
      console.error('Error deleting conversation:', deleteError);
      return NextResponse.json({ error: 'Failed to delete conversation' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/chat/conversations/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

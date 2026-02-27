import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthUser } from '@/lib/auth-helpers';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import type { BranchRequest } from '@/types/chat';

// POST /api/chat/conversations/[id]/branch - Fork conversation from a specific message
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const auth = await requireAuth(request);
  if (!isAuthUser(auth)) return auth;

  try {
    const supabase = getSupabaseAdmin();
    const body: BranchRequest = await request.json();

    if (!body.from_message_id) {
      return NextResponse.json({ error: 'from_message_id is required' }, { status: 400 });
    }

    // Verify user owns the original conversation
    const { data: originalConv } = await supabase
      .from('chat_conversations')
      .select('*')
      .eq('id', id)
      .eq('user_id', auth.id)
      .single();

    if (!originalConv) {
      return NextResponse.json({ error: 'Original conversation not found' }, { status: 404 });
    }

    // Verify the branch point message exists in the conversation
    const { data: branchMessage } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('id', body.from_message_id)
      .eq('conversation_id', id)
      .single();

    if (!branchMessage) {
      return NextResponse.json({ error: 'Branch point message not found' }, { status: 404 });
    }

    // Get the character name for the default title
    const { data: character } = await supabase
      .from('characters')
      .select('name')
      .eq('id', originalConv.character_id)
      .single();

    // Create the new branched conversation
    const { data: newConv, error: createError } = await supabase
      .from('chat_conversations')
      .insert({
        user_id: auth.id,
        character_id: originalConv.character_id,
        title: body.title || `Branch: ${character?.name || 'Chat'} (from msg #${branchMessage.sequence_number})`,
        content_mode: originalConv.content_mode,
        is_group: originalConv.is_group,
        branched_from_message_id: body.from_message_id,
        branched_from_conversation_id: id,
        status: 'active',
        last_message_at: new Date().toISOString(),
        message_count: 0,
        metadata: { branched_at: new Date().toISOString() },
      })
      .select('*, character:characters(name, avatar_url)')
      .single();

    if (createError) {
      console.error('Error creating branched conversation:', createError);
      return NextResponse.json({ error: 'Failed to create branch' }, { status: 500 });
    }

    // Copy all messages up to and including the branch point
    const { data: messagesToCopy } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('conversation_id', id)
      .lte('sequence_number', branchMessage.sequence_number)
      .order('sequence_number', { ascending: true });

    if (messagesToCopy && messagesToCopy.length > 0) {
      const copiedMessages = messagesToCopy.map(msg => ({
        conversation_id: newConv.id,
        role: msg.role,
        character_id: msg.character_id,
        content: msg.content,
        content_mode: msg.content_mode,
        parent_message_id: null, // Reset parent chain for simplicity
        sequence_number: msg.sequence_number,
        token_count: msg.token_count,
        metadata: { ...msg.metadata, copied_from: msg.id },
        is_hidden: msg.is_hidden,
      }));

      const { error: copyError } = await supabase
        .from('chat_messages')
        .insert(copiedMessages);

      if (copyError) {
        console.error('Error copying messages to branch:', copyError);
        // The conversation was created but messages failed to copy
        // Continue and return the conversation anyway
      }

      // Update the branched conversation message count
      await supabase
        .from('chat_conversations')
        .update({
          message_count: messagesToCopy.length,
          last_message_at: new Date().toISOString(),
        })
        .eq('id', newConv.id);
    }

    // Copy participants if group chat
    if (originalConv.is_group) {
      const { data: participants } = await supabase
        .from('chat_participants')
        .select('*')
        .eq('conversation_id', id)
        .eq('is_active', true);

      if (participants && participants.length > 0) {
        const copiedParticipants = participants.map(p => ({
          conversation_id: newConv.id,
          character_id: p.character_id,
          join_order: p.join_order,
          is_active: true,
        }));

        await supabase.from('chat_participants').insert(copiedParticipants);
      }
    }

    return NextResponse.json(newConv, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/chat/conversations/[id]/branch:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

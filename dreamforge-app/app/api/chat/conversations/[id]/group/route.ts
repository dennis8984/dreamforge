import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthUser } from '@/lib/auth-helpers';
import { getSupabaseAdmin } from '@/lib/supabase-server';

// POST /api/chat/conversations/[id]/group - Add character(s) to group conversation
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const auth = await requireAuth(request);
  if (!isAuthUser(auth)) return auth;

  try {
    const supabase = getSupabaseAdmin();
    const body = await request.json();
    const { character_ids } = body;

    if (!character_ids || !Array.isArray(character_ids) || character_ids.length === 0) {
      return NextResponse.json({ error: 'character_ids array is required' }, { status: 400 });
    }

    // Verify user owns this conversation
    const { data: conversation } = await supabase
      .from('chat_conversations')
      .select('*')
      .eq('id', id)
      .eq('user_id', auth.id)
      .eq('status', 'active')
      .single();

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    // Mark as group chat if not already
    if (!conversation.is_group) {
      await supabase
        .from('chat_conversations')
        .update({
          is_group: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);
    }

    // Get current max join order
    const { data: existingParticipants } = await supabase
      .from('chat_participants')
      .select('character_id, join_order')
      .eq('conversation_id', id)
      .order('join_order', { ascending: false })
      .limit(1);

    let nextOrder = (existingParticipants?.[0]?.join_order || 0) + 1;
    const existingCharIds = new Set(
      (existingParticipants || []).map(p => p.character_id)
    );

    // Re-fetch all existing participants to check for duplicates
    const { data: allParticipants } = await supabase
      .from('chat_participants')
      .select('character_id')
      .eq('conversation_id', id);

    const allExistingCharIds = new Set(
      (allParticipants || []).map(p => p.character_id)
    );

    // Validate all characters exist
    const { data: characters, error: charError } = await supabase
      .from('characters')
      .select('id, name')
      .in('id', character_ids);

    if (charError) {
      console.error('Error validating characters:', charError);
      return NextResponse.json({ error: 'Failed to validate characters' }, { status: 500 });
    }

    const validCharIds = new Set((characters || []).map(c => c.id));
    const invalidIds = character_ids.filter((cid: string) => !validCharIds.has(cid));
    if (invalidIds.length > 0) {
      return NextResponse.json(
        { error: `Characters not found: ${invalidIds.join(', ')}` },
        { status: 404 }
      );
    }

    // Filter out already-added characters
    const newCharacterIds = character_ids.filter(
      (cid: string) => !allExistingCharIds.has(cid)
    );

    if (newCharacterIds.length === 0) {
      return NextResponse.json({ message: 'All characters are already in this conversation' });
    }

    // Add new participants
    const newParticipants = newCharacterIds.map((cid: string) => ({
      conversation_id: id,
      character_id: cid,
      join_order: nextOrder++,
      is_active: true,
    }));

    const { data: insertedParticipants, error: insertError } = await supabase
      .from('chat_participants')
      .insert(newParticipants)
      .select('*, character:characters(name, avatar_url)');

    if (insertError) {
      console.error('Error adding participants:', insertError);
      return NextResponse.json({ error: 'Failed to add characters to group' }, { status: 500 });
    }

    // Insert narrator messages announcing new participants
    const addedNames = (characters || [])
      .filter(c => newCharacterIds.includes(c.id))
      .map(c => c.name);

    if (addedNames.length > 0) {
      const currentSeq = conversation.message_count || 0;
      await supabase
        .from('chat_messages')
        .insert({
          conversation_id: id,
          role: 'narrator',
          character_id: null,
          content: `${addedNames.join(', ')} joined the conversation.`,
          content_mode: conversation.content_mode,
          sequence_number: currentSeq + 1,
          token_count: 0,
          metadata: { type: 'participant_join', character_ids: newCharacterIds },
          is_hidden: false,
        });

      await supabase
        .from('chat_conversations')
        .update({
          message_count: currentSeq + 1,
          last_message_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);
    }

    return NextResponse.json({
      participants: insertedParticipants,
      added: newCharacterIds.length,
      skipped: character_ids.length - newCharacterIds.length,
    }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/chat/conversations/[id]/group:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

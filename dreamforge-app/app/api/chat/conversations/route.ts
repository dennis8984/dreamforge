import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthUser } from '@/lib/auth-helpers';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { canAccessMode } from '@/lib/content-modes';
import type { ContentMode, ConversationStatus } from '@/types/chat';

// GET /api/chat/conversations - List user's conversations
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!isAuthUser(auth)) return auth;

  try {
    const supabase = getSupabaseAdmin();
    const status = request.nextUrl.searchParams.get('status') || 'active';
    const characterId = request.nextUrl.searchParams.get('character_id');
    const page = parseInt(request.nextUrl.searchParams.get('page') || '1', 10);
    const pageSize = parseInt(request.nextUrl.searchParams.get('pageSize') || '20', 10);

    let query = supabase
      .from('chat_conversations')
      .select('*, character:characters(name, avatar_url)', { count: 'exact' })
      .eq('user_id', auth.id)
      .eq('status', status as ConversationStatus)
      .order('last_message_at', { ascending: false });

    if (characterId) {
      query = query.eq('character_id', characterId);
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      console.error('Error listing conversations:', error);
      return NextResponse.json({ error: 'Failed to list conversations' }, { status: 500 });
    }

    return NextResponse.json({
      items: data || [],
      total: count || 0,
      page,
      pageSize,
    });
  } catch (error) {
    console.error('Error in GET /api/chat/conversations:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/chat/conversations - Create a new conversation
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!isAuthUser(auth)) return auth;

  try {
    const supabase = getSupabaseAdmin();
    const body = await request.json();
    const { character_id, title, content_mode, is_group } = body;

    if (!character_id) {
      return NextResponse.json({ error: 'character_id is required' }, { status: 400 });
    }

    // Validate character exists
    const { data: character, error: charError } = await supabase
      .from('characters')
      .select('id, name')
      .eq('id', character_id)
      .single();

    if (charError || !character) {
      return NextResponse.json({ error: 'Character not found' }, { status: 404 });
    }

    // Validate content mode access
    const mode: ContentMode = content_mode || 'S1E';
    if (!canAccessMode(mode, auth.tier)) {
      return NextResponse.json(
        { error: `Your subscription tier does not have access to ${mode} content mode` },
        { status: 403 }
      );
    }

    // Create conversation
    const { data: conversation, error: createError } = await supabase
      .from('chat_conversations')
      .insert({
        user_id: auth.id,
        character_id,
        title: title || `Chat with ${character.name}`,
        content_mode: mode,
        is_group: is_group || false,
        status: 'active',
        last_message_at: new Date().toISOString(),
        message_count: 0,
        metadata: {},
      })
      .select('*, character:characters(name, avatar_url)')
      .single();

    if (createError) {
      console.error('Error creating conversation:', createError);
      return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 });
    }

    // Add the character as a participant
    await supabase
      .from('chat_participants')
      .insert({
        conversation_id: conversation.id,
        character_id,
        join_order: 1,
        is_active: true,
      });

    // If persona has a greeting message, insert it
    const { data: persona } = await supabase
      .from('character_personas')
      .select('greeting_message')
      .eq('character_id', character_id)
      .single();

    if (persona?.greeting_message) {
      await supabase
        .from('chat_messages')
        .insert({
          conversation_id: conversation.id,
          role: 'assistant',
          character_id,
          content: persona.greeting_message,
          content_mode: mode,
          sequence_number: 1,
          token_count: Math.ceil(persona.greeting_message.length / 4),
          metadata: { is_greeting: true },
          is_hidden: false,
        });

      // Update conversation message count
      await supabase
        .from('chat_conversations')
        .update({
          message_count: 1,
          last_message_at: new Date().toISOString(),
        })
        .eq('id', conversation.id);
    }

    return NextResponse.json(conversation, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/chat/conversations:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

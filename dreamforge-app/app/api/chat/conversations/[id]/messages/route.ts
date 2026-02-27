import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthUser } from '@/lib/auth-helpers';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { checkRateLimit, incrementRateLimit, isRateLimited } from '@/lib/rate-limiter';
import { canAccessMode } from '@/lib/content-modes';
import { buildSystemPrompt, buildMessageHistory } from '@/lib/prompt-builder';
import { generateChatResponse } from '@/lib/chat-ai';
import { extractMemories } from '@/lib/memory-extractor';
import type { ContentMode, SendMessageRequest, CharacterPersona, UserMemory, ChatMessage } from '@/types/chat';

// GET /api/chat/conversations/[id]/messages - Get message history
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const auth = await requireAuth(request);
  if (!isAuthUser(auth)) return auth;

  try {
    const supabase = getSupabaseAdmin();
    const before = request.nextUrl.searchParams.get('before');
    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '50', 10);

    // Verify user owns this conversation
    const { data: conversation } = await supabase
      .from('chat_conversations')
      .select('id, user_id')
      .eq('id', id)
      .eq('user_id', auth.id)
      .single();

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    let query = supabase
      .from('chat_messages')
      .select('*')
      .eq('conversation_id', id)
      .eq('is_hidden', false)
      .order('sequence_number', { ascending: false })
      .limit(Math.min(limit, 100));

    if (before) {
      query = query.lt('sequence_number', parseInt(before, 10));
    }

    const { data: messages, error } = await query;

    if (error) {
      console.error('Error fetching messages:', error);
      return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
    }

    // Return in ascending order for display
    const sorted = (messages || []).reverse();

    return NextResponse.json({
      messages: sorted,
      hasMore: (messages || []).length === Math.min(limit, 100),
    });
  } catch (error) {
    console.error('Error in GET /api/chat/conversations/[id]/messages:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/chat/conversations/[id]/messages - Send message and get AI response
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const auth = await requireAuth(request);
  if (!isAuthUser(auth)) return auth;

  try {
    const supabase = getSupabaseAdmin();
    const body: SendMessageRequest = await request.json();

    if (!body.content || body.content.trim().length === 0) {
      return NextResponse.json({ error: 'Message content is required' }, { status: 400 });
    }

    if (body.content.length > 10000) {
      return NextResponse.json({ error: 'Message too long (max 10000 characters)' }, { status: 400 });
    }

    // Step 1: Check rate limit
    const rateLimit = await checkRateLimit(auth.id, auth.tier);
    if (isRateLimited(rateLimit)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded', rateLimit },
        { status: 429 }
      );
    }

    // Step 2: Load conversation and verify ownership
    const { data: conversation, error: convError } = await supabase
      .from('chat_conversations')
      .select('*')
      .eq('id', id)
      .eq('user_id', auth.id)
      .eq('status', 'active')
      .single();

    if (convError || !conversation) {
      return NextResponse.json({ error: 'Conversation not found or inactive' }, { status: 404 });
    }

    // Determine content mode
    const contentMode: ContentMode = body.content_mode || conversation.content_mode || 'S1E';
    if (!canAccessMode(contentMode, auth.tier)) {
      return NextResponse.json(
        { error: `Your subscription tier does not have access to ${contentMode} content mode` },
        { status: 403 }
      );
    }

    // Step 3: Load persona
    const { data: persona } = await supabase
      .from('character_personas')
      .select('*')
      .eq('character_id', conversation.character_id)
      .single();

    if (!persona) {
      return NextResponse.json({ error: 'Character persona not found' }, { status: 404 });
    }

    // Step 4: Load recent messages for context
    const { data: recentMessages } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('conversation_id', id)
      .eq('is_hidden', false)
      .order('sequence_number', { ascending: true })
      .limit(100);

    // Step 5: Load user memories for this character
    const { data: memories } = await supabase
      .from('user_memories')
      .select('*')
      .eq('user_id', auth.id)
      .eq('character_id', conversation.character_id)
      .eq('is_active', true)
      .order('updated_at', { ascending: false })
      .limit(50);

    // Step 6: Load group participants if group chat
    let groupCharacterNames: string[] = [];
    if (conversation.is_group) {
      const { data: participants } = await supabase
        .from('chat_participants')
        .select('character:characters(name)')
        .eq('conversation_id', id)
        .eq('is_active', true);

      groupCharacterNames = (participants || [])
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((p: any) => {
          const char = Array.isArray(p.character) ? p.character[0] : p.character;
          return char?.name as string | undefined;
        })
        .filter(Boolean) as string[];
    }

    // Step 7: Build system prompt
    const systemPrompt = buildSystemPrompt({
      persona: persona as CharacterPersona,
      contentMode,
      memories: (memories || []) as UserMemory[],
      isGroup: conversation.is_group,
      groupCharacterNames,
    });

    // Step 8: Build message history
    const messageHistory = buildMessageHistory((recentMessages || []) as ChatMessage[]);

    // Add the new user message to the history
    messageHistory.push({ role: 'user', content: body.content });

    // Step 9: Call AI
    const aiResponse = await generateChatResponse({
      systemPrompt,
      messages: messageHistory,
    });

    // Step 10: Get next sequence number
    const nextSeq = (conversation.message_count || 0) + 1;

    // Step 11: Insert user message
    const { data: userMessage, error: userMsgError } = await supabase
      .from('chat_messages')
      .insert({
        conversation_id: id,
        role: 'user',
        character_id: null,
        content: body.content,
        content_mode: contentMode,
        parent_message_id: body.parent_message_id || null,
        sequence_number: nextSeq,
        token_count: Math.ceil(body.content.length / 4),
        metadata: {},
        is_hidden: false,
      })
      .select()
      .single();

    if (userMsgError) {
      console.error('Error inserting user message:', userMsgError);
      return NextResponse.json({ error: 'Failed to save message' }, { status: 500 });
    }

    // Step 12: Insert assistant message
    const { data: assistantMessage, error: assistantMsgError } = await supabase
      .from('chat_messages')
      .insert({
        conversation_id: id,
        role: 'assistant',
        character_id: conversation.character_id,
        content: aiResponse.content,
        content_mode: contentMode,
        parent_message_id: userMessage.id,
        sequence_number: nextSeq + 1,
        token_count: aiResponse.tokenCount,
        metadata: {
          model: aiResponse.model,
          latency_ms: aiResponse.latencyMs,
        },
        is_hidden: false,
      })
      .select()
      .single();

    if (assistantMsgError) {
      console.error('Error inserting assistant message:', assistantMsgError);
      return NextResponse.json({ error: 'Failed to save AI response' }, { status: 500 });
    }

    // Step 13: Update conversation counters
    await supabase
      .from('chat_conversations')
      .update({
        message_count: nextSeq + 1,
        last_message_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    // Step 14: Increment rate limit
    await incrementRateLimit(auth.id);

    // Step 15: Fire-and-forget memory extraction
    extractMemories(
      auth.id,
      conversation.character_id,
      body.content,
      aiResponse.content,
      userMessage.id
    ).catch(err => console.error('Background memory extraction error:', err));

    // Step 16: Get updated rate limit status
    const updatedRateLimit = await checkRateLimit(auth.id, auth.tier);

    return NextResponse.json({
      userMessage,
      assistantMessage,
      rateLimit: updatedRateLimit,
    });
  } catch (error) {
    console.error('Error in POST /api/chat/conversations/[id]/messages:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

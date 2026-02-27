import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthUser } from '@/lib/auth-helpers';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { generateChatResponse } from '@/lib/chat-ai';

// POST /api/voice/speak - Send user text, get AI text response + TTS audio
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!isAuthUser(auth)) return auth;

  try {
    const body = await request.json();
    const { sessionId, text, characterId } = body;

    if (!text || typeof text !== 'string' || !text.trim()) {
      return NextResponse.json(
        { error: 'Text message is required' },
        { status: 400 }
      );
    }

    if (!characterId) {
      return NextResponse.json(
        { error: 'characterId is required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // Load the character
    const { data: character, error: charError } = await supabase
      .from('characters')
      .select('id, name, bio, personality_traits, voice_id, voice_name')
      .eq('id', characterId)
      .single();

    if (charError || !character) {
      return NextResponse.json(
        { error: 'Character not found' },
        { status: 404 }
      );
    }

    // Load the character persona for system prompt
    const { data: persona } = await supabase
      .from('character_personas')
      .select('system_prompt, personality, speaking_style')
      .eq('character_id', characterId)
      .single();

    // Build system prompt for voice context
    const systemPrompt = persona?.system_prompt
      ? `${persona.system_prompt}\n\nIMPORTANT: You are in a voice call. Keep responses conversational, natural, and concise (1-3 sentences). Speak as if talking on the phone. Do not use markdown, emojis, or special formatting.`
      : `You are ${character.name}. ${character.bio || ''} Personality: ${(character.personality_traits || []).join(', ')}.\n\nIMPORTANT: You are in a voice call. Keep responses conversational, natural, and concise (1-3 sentences). Speak as if talking on the phone. Do not use markdown, emojis, or special formatting.`;

    // Load recent transcript from session for context
    let conversationHistory: { role: 'user' | 'assistant'; content: string }[] = [];
    if (sessionId) {
      const { data: session } = await supabase
        .from('voice_call_sessions')
        .select('transcript')
        .eq('id', sessionId)
        .eq('user_id', auth.id)
        .single();

      if (session?.transcript && Array.isArray(session.transcript)) {
        conversationHistory = session.transcript.slice(-10) as typeof conversationHistory;
      }
    }

    // Generate AI text response
    const aiResponse = await generateChatResponse({
      systemPrompt,
      messages: [
        ...conversationHistory,
        { role: 'user', content: text.trim() },
      ],
      temperature: 0.8,
      maxTokens: 256,
    });

    const responseText = aiResponse.content;

    // Generate TTS audio via ElevenLabs
    let audioBase64: string | null = null;
    const elevenLabsKey = process.env.ELEVENLABS_API_KEY;
    const voiceId = character.voice_id || process.env.ELEVENLABS_DEFAULT_VOICE_ID || 'EXAVITQu4vr4xnSDxMaL';

    if (elevenLabsKey) {
      try {
        const ttsResponse = await fetch(
          `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'xi-api-key': elevenLabsKey,
            },
            body: JSON.stringify({
              text: responseText,
              model_id: 'eleven_monolingual_v1',
              voice_settings: {
                stability: 0.5,
                similarity_boost: 0.75,
                style: 0.0,
                use_speaker_boost: true,
              },
            }),
          }
        );

        if (ttsResponse.ok) {
          const audioBuffer = await ttsResponse.arrayBuffer();
          audioBase64 = Buffer.from(audioBuffer).toString('base64');
        } else {
          console.error('ElevenLabs TTS error:', ttsResponse.status, await ttsResponse.text());
        }
      } catch (ttsError) {
        console.error('ElevenLabs TTS request failed:', ttsError);
      }
    }

    // Update session transcript
    if (sessionId) {
      const newEntries = [
        { role: 'user', content: text.trim() },
        { role: 'assistant', content: responseText },
      ];

      await supabase.rpc('jsonb_array_append', {
        target_table: 'voice_call_sessions',
        target_column: 'transcript',
        target_id: sessionId,
        new_items: newEntries,
      }).then(undefined, async () => {
        // Fallback: read-modify-write if the RPC doesn't exist
        const { data: session } = await supabase
          .from('voice_call_sessions')
          .select('transcript')
          .eq('id', sessionId)
          .single();

        const existingTranscript = Array.isArray(session?.transcript) ? session.transcript : [];
        await supabase
          .from('voice_call_sessions')
          .update({ transcript: [...existingTranscript, ...newEntries] })
          .eq('id', sessionId);
      });
    }

    return NextResponse.json({
      text: responseText,
      audioBase64: audioBase64 || null,
      voiceId,
      characterName: character.name,
    });
  } catch (error) {
    console.error('Voice speak error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate voice response' },
      { status: 500 }
    );
  }
}
